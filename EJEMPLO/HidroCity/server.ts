import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", engine: "HydroCity Pro Core v1.0" });
  });

  // Simulation Endpoint (Phase 2: Hydrology & Routing)
  app.post("/api/simulate", (req, res) => {
    try {
      const { nodes, conduits, subcatchments, rainfall, activeRainfall, simulationSettings } = req.body;
      console.log(`Starting simulation: ${nodes.length} nodes, ${conduits.length} conduits, ${subcatchments.length} subcatchments`);
      console.log(`Sample conduit slope: ${conduits[0]?.slope}`);
      
      const results = {
        nodes: {} as Record<string, any>,
        conduits: {} as Record<string, any>,
        subcatchments: {} as Record<string, any>
      };

      // 1. Setup Time Series based on simulation settings
      const routingStep = simulationSettings?.routingStep || 30; // seconds
      const reportingStep = simulationSettings?.reportingStep || 300; // seconds
      const durationHours = simulationSettings?.duration || 6;
      
      const dt_reporting_hr = reportingStep / 3600;
      const timeSteps = Math.floor(durationHours / dt_reporting_hr) + 1;

      // Initialize results
      for (const node of nodes) {
        results.nodes[node.id] = {
          depth: 0, head: 0, flooding: 0,
          depthSeries: [], inflowSeries: [], floodingSeries: []
        };
      }
      for (const conduit of conduits) {
        results.conduits[conduit.id] = {
          qFull: 0, vFull: 0, slope: 0, capacity: 0,
          flowSeries: [], velocitySeries: []
        };
      }
      for (const sub of subcatchments) {
        results.subcatchments[sub.id] = {
          runoffSeries: [], precipitationSeries: [], lossesSeries: [], peakRunoff: 0
        };
      }

      // 2. Hydrology: Calculate Runoff for each Subcatchment
      const routingDt = routingStep; // seconds
      const totalRoutingSteps = (durationHours * 3600) / routingDt;
      
      const runoffBySubcatchment: Record<string, Float32Array> = {};
      
      // SCS Dimensionless Unit Hydrograph points (t/tp, q/qp)
      const scsUH = [
        [0.0, 0.000], [0.1, 0.030], [0.2, 0.100], [0.3, 0.190], [0.4, 0.310],
        [0.5, 0.470], [0.6, 0.660], [0.7, 0.820], [0.8, 0.930], [0.9, 0.990],
        [1.0, 1.000], [1.1, 0.990], [1.2, 0.930], [1.3, 0.860], [1.4, 0.780],
        [1.5, 0.680], [1.6, 0.560], [1.7, 0.460], [1.8, 0.390], [1.9, 0.330],
        [2.0, 0.280], [2.2, 0.207], [2.4, 0.147], [2.6, 0.107], [2.8, 0.077],
        [3.0, 0.055], [3.2, 0.040], [3.4, 0.029], [3.6, 0.021], [3.8, 0.015],
        [4.0, 0.011], [4.5, 0.005], [5.0, 0.000]
      ];

      for (const sub of subcatchments) {
        runoffBySubcatchment[sub.id] = new Float32Array(totalRoutingSteps);
        const impervFraction = sub.imperv / 100;
        const pervFraction = 1 - impervFraction;
        const A_ha = sub.area;
        const A_m2 = A_ha * 10000;
        const A_imp = A_m2 * impervFraction;
        const A_perv = A_m2 * pervFraction;
        
        let subWidth = sub.width;
        if (!subWidth || subWidth <= 0) subWidth = Math.sqrt(A_m2); // Default width if missing
        
        // Characteristic width for each sub-area
        const W_imp = subWidth * impervFraction;
        const W_perv = subWidth * pervFraction;
        
        // Slope
        const S_0 = Math.max(sub.slope / 100, 0.0001); // m/m
        
        // Manning's n
        const n_imp = sub.nImperv || 0.015;
        const n_perv = sub.nPerv || 0.150;
        
        // Time of Concentration (Kirpich formula for overland flow)
        // L_m is the characteristic flow length
        const L_m = A_m2 / subWidth;
        let tc_min = 0.0195 * Math.pow(L_m, 0.77) * Math.pow(S_0, -0.385);
        if (isNaN(tc_min) || tc_min < 5) tc_min = 5; // Min 5 minutes
        const tc_hr = tc_min / 60;
        
        const transformMethod = sub.transformMethod || 'SCS_Unit_Hydrograph';
        const dt_hr = routingDt / 3600;
        const uhOrdinates: number[] = [];

        if (transformMethod === 'SCS_Unit_Hydrograph') {
           const tp_hr = dt_hr / 2 + 0.6 * tc_hr; // Time to peak (hr)
           const qp_m3s_per_mm = (0.00208 * A_ha) / tp_hr; // Peak flow (m3/s) for 1 mm of excess rainfall
           
           let t_uh = 0;
           let totalUhVol = 0;
           while (true) {
              const tRatio = t_uh / tp_hr;
              if (tRatio > 5.0) break;
              
              let qRatio = 0;
              for (let i = 0; i < scsUH.length - 1; i++) {
                 if (tRatio >= scsUH[i][0] && tRatio <= scsUH[i+1][0]) {
                    const f = (tRatio - scsUH[i][0]) / (scsUH[i+1][0] - scsUH[i][0]);
                    qRatio = scsUH[i][1] + f * (scsUH[i+1][1] - scsUH[i][1]);
                    break;
                 }
              }
              const qVal = qRatio * qp_m3s_per_mm;
              uhOrdinates.push(qVal);
              totalUhVol += qVal * routingDt; // Accumulate volume (m3)
              t_uh += dt_hr;
           }
           
           // Volume correction to ensure volume corresponds exactly to 1 mm over the entire area
           const targetVol = A_ha * 10;
           if (totalUhVol > 0) {
              const correction = targetVol / totalUhVol;
              for (let i = 0; i < uhOrdinates.length; i++) uhOrdinates[i] *= correction;
           }
        } 
        else if (transformMethod === 'Clark_Unit_Hydrograph') {
           const R_hr = 0.8 * tc_hr; // Storage coefficient
           const c_clark = dt_hr / (R_hr + 0.5 * dt_hr);
           let t_uh = 0;
           let Q_prev = 0;
           let totalUhVol = 0;
           while (true) {
              const I_t = (t_uh <= tc_hr) ? (1.0 / tc_hr) : 0; // Uniform time-area histogram for 1 mm
              const Q_t = c_clark * I_t + (1 - c_clark) * Q_prev;
              
              const qVal = Q_t * (A_ha * 10 / 3600); // convert mm/hr to m3/s per mm
              uhOrdinates.push(qVal);
              totalUhVol += qVal * routingDt;
              
              Q_prev = Q_t;
              t_uh += dt_hr;
              if (t_uh > 10 * tc_hr && Q_t < 0.001) break;
           }
           
           const targetVol = A_ha * 10;
           if (totalUhVol > 0) {
              const correction = targetVol / totalUhVol;
              for (let i = 0; i < uhOrdinates.length; i++) uhOrdinates[i] *= correction;
           }
        }
        
        // Depression storage (m) -> Convert to mm for calculation
        const dStoreImp_mm = sub.destoreImperv ?? 1.27;
        const dStorePerv_mm = sub.destorePerv ?? 2.54;
        let currentDStoreImp = 0;
        let currentDStorePerv = 0;
        
        // Evaporation
        const evapRate_mm_hr = (rainfall.evaporation || 0) / 24;
        
        // Infiltration parameters
        const infilMethod = sub.infilMethod || 'Horton';
        
        // Horton
        const f0 = sub.maxInfilRate || 75; // mm/hr
        const fc = sub.minInfilRate || 12.5; // mm/hr
        const k = (sub.decayConst || 4) / 3600; // 1/sec
        
        // Green-Ampt
        const suctionHead = sub.suctionHead || 89; // mm
        const conductivity = sub.conductivity || 12.7; // mm/hr
        const initialDeficit = sub.initialDeficit || 0.25; // fraction
        let F = 0; // Cumulative infiltration (mm)
        
        // SCS Curve Number
        const CN = sub.curveNumber || 80;
        const S_cn = (25400 / CN) - 254; // Potential maximum retention (mm)
        const Ia = 0.2 * S_cn; // Initial abstraction (mm)
        let cumulativeRainfall = 0;
        let cumulativeRunoffSCS = 0;

        const excessRainTotal_mm = new Float32Array(totalRoutingSteps);
        const excessRainPerv_mm = new Float32Array(totalRoutingSteps);
        const excessRainImp_mm = new Float32Array(totalRoutingSteps);
        const precip_mm_hr = new Float32Array(totalRoutingSteps);
        const losses_mm_hr = new Float32Array(totalRoutingSteps);

        // --- Phase 1: Calculate Excess Precipitation (Pe) ---
        for (let step = 0; step < totalRoutingSteps; step++) {
          const t_sec = step * routingDt;
          const t_hr = t_sec / 3600;
          
          let i_mm_hr = 0;
          if (activeRainfall && activeRainfall.data && activeRainfall.data.length > 0) {
             const data = activeRainfall.data;
             for (let i = 0; i < data.length - 1; i++) {
                if (t_hr >= data[i].time && t_hr < data[i+1].time) {
                   i_mm_hr = data[i].value;
                   break;
                }
             }
             if (t_hr >= data[data.length - 1].time) i_mm_hr = 0; 
          } else {
             i_mm_hr = t_hr <= (rainfall?.duration || 2) ? (rainfall?.intensity || 50) : 0;
          }
          const net_i_mm_hr = Math.max(i_mm_hr - evapRate_mm_hr, 0);
          
          let pe_perv = 0; // mm per timestep
          let pe_imp = 0;  // mm per timestep
          
          // IMPERVIOUS
          if (currentDStoreImp < dStoreImp_mm) {
            const avail = dStoreImp_mm - currentDStoreImp;
            const rainVol = net_i_mm_hr * dt_hr;
            if (rainVol <= avail) { 
               currentDStoreImp += rainVol; 
               pe_imp = 0; 
            } else { 
               currentDStoreImp = dStoreImp_mm; 
               pe_imp = rainVol - avail; 
            }
          } else { 
            pe_imp = net_i_mm_hr * dt_hr; 
          }
          if (net_i_mm_hr === 0) {
             currentDStoreImp = Math.max(currentDStoreImp - evapRate_mm_hr * dt_hr, 0);
          }
          
          // PERVIOUS
          if (infilMethod === 'Curve_Number') {
             cumulativeRainfall += net_i_mm_hr * dt_hr;
             let newCumRunoff = 0;
             if (cumulativeRainfall > Ia) {
                 newCumRunoff = Math.pow(cumulativeRainfall - Ia, 2) / (cumulativeRainfall - Ia + S_cn);
             }
             pe_perv = newCumRunoff - cumulativeRunoffSCS;
             cumulativeRunoffSCS = newCumRunoff;
          } else {
             let f_t_mmhr = 0; 
             if (infilMethod === 'Horton') {
               f_t_mmhr = fc + (f0 - fc) * Math.exp(-k * t_sec);
             } else if (infilMethod === 'Green_Ampt') {
               if (F === 0) f_t_mmhr = net_i_mm_hr > conductivity ? conductivity + (conductivity * suctionHead * initialDeficit) / 0.001 : net_i_mm_hr;
               else f_t_mmhr = conductivity * (1 + (suctionHead * initialDeficit) / F);
             }
             
             const actualInfil = Math.min(net_i_mm_hr, f_t_mmhr);
             if (infilMethod === 'Green_Ampt') F += actualInfil * dt_hr;
             
             const excR = Math.max(net_i_mm_hr - actualInfil, 0) * dt_hr;
             if (currentDStorePerv < dStorePerv_mm) {
                const avail = dStorePerv_mm - currentDStorePerv;
                if (excR <= avail) { 
                   currentDStorePerv += excR; 
                   pe_perv = 0; 
                } else { 
                   currentDStorePerv = dStorePerv_mm; 
                   pe_perv = excR - avail; 
                }
             } else { 
                pe_perv = excR; 
             }
             if (excR === 0) {
                currentDStorePerv = Math.max(currentDStorePerv - evapRate_mm_hr * dt_hr, 0);
             }
          }
          
          // Store total excess precipitation for the subcatchment in this timestep (mm)
          excessRainTotal_mm[step] = (pe_perv * pervFraction) + (pe_imp * impervFraction);
          excessRainPerv_mm[step] = pe_perv;
          excessRainImp_mm[step] = pe_imp;
          
          precip_mm_hr[step] = i_mm_hr;
          const pe_total_mm = (pe_perv * pervFraction) + (pe_imp * impervFraction);
          losses_mm_hr[step] = Math.max(i_mm_hr - (pe_total_mm / dt_hr), 0);
        }

        let peakRunoff = 0;
        
        if (transformMethod === 'SCS_Unit_Hydrograph' || transformMethod === 'Clark_Unit_Hydrograph') {
           // --- Phase 2: Discrete Convolution of Excess Rain with Unit Hydrograph ---
           for (let step = 0; step < totalRoutingSteps; step++) {
              let q = 0;
              // Convolution sum: Q_n = sum(Pe_m * U_(n-m))
              for (let m = 0; m <= step; m++) {
                 const u_idx = step - m;
                 if (u_idx < uhOrdinates.length) {
                    q += excessRainTotal_mm[m] * uhOrdinates[u_idx];
                 }
              }
              
              if (q > peakRunoff) peakRunoff = q;
              runoffBySubcatchment[sub.id][step] = q;
              
              // Sample for results based on reportingStep
              const t_sec = step * routingDt;
              if (t_sec % reportingStep === 0) {
                 const reportIdx = Math.floor(t_sec / reportingStep);
                 if (reportIdx < timeSteps) {
                    results.subcatchments[sub.id].runoffSeries.push({ time: reportIdx, value: q });
                 }
              }
           }
        } 
        else if (transformMethod === 'SWMM_NonLinear_Reservoir') {
           // --- Phase 2: SWMM Non-Linear Reservoir Routing ---
           let d_perv_excess = 0; // m
           let d_imp_excess = 0; // m
           
           const alpha_perv = (1.0 / n_perv) * Math.sqrt(S_0) * W_perv;
           const alpha_imp = (1.0 / n_imp) * Math.sqrt(S_0) * W_imp;
           
           for (let step = 0; step < totalRoutingSteps; step++) {
              // Add Pe (converted from mm to m) to standing surface water
              d_perv_excess += (excessRainPerv_mm[step] / 1000);
              d_imp_excess += (excessRainImp_mm[step] / 1000);
              
              let q_perv_out = 0;
              let q_imp_out = 0;
              
              if (d_perv_excess > 0) {
                 q_perv_out = alpha_perv * Math.pow(d_perv_excess, 5/3);
                 const maxDrain = A_perv * d_perv_excess / routingDt;
                 if (q_perv_out > maxDrain) q_perv_out = maxDrain;
                 if (A_perv > 0) d_perv_excess -= (q_perv_out / A_perv) * routingDt;
              }
              
              if (d_imp_excess > 0) {
                 q_imp_out = alpha_imp * Math.pow(d_imp_excess, 5/3);
                 const maxDrain = A_imp * d_imp_excess / routingDt;
                 if (q_imp_out > maxDrain) q_imp_out = maxDrain;
                 if (A_imp > 0) d_imp_excess -= (q_imp_out / A_imp) * routingDt;
              }
              
              const q = q_perv_out + q_imp_out;
              if (q > peakRunoff) peakRunoff = q;
              runoffBySubcatchment[sub.id][step] = q;
              
              // Sample for results based on reportingStep
              const t_sec = step * routingDt;
              if (t_sec % reportingStep === 0) {
                 const reportIdx = Math.floor(t_sec / reportingStep);
                 if (reportIdx < timeSteps) {
                    results.subcatchments[sub.id].runoffSeries.push({ time: reportIdx, value: q });
                 }
              }
           }
        }
        
        results.subcatchments[sub.id].peakRunoff = peakRunoff;
      }
      console.log("Hydrology phase completed");

      // 3. Hydraulics: Implicit Dynamic Wave Routing (Link-Node Formulation with Preissmann Slot)
      // Solves 1D Saint-Venant equations using Successive Approximations (Gauss-Seidel Picard Iterations)
      const g = 9.81;
      
      // Initialize node states
      const nodeStates: Record<string, any> = {};
      for (const node of nodes) {
        nodeStates[node.id] = {
          H: node.invertElevation, // Current Head (m)
          H_old: node.invertElevation, // Head at start of step
          depth: 0,
          inflowSeries: new Float32Array(timeSteps),
          depthSeries: new Float32Array(timeSteps),
          floodingSeries: new Float32Array(timeSteps)
        };
      }
      
      // Initialize link states
      const linkStates: Record<string, any> = {};
      for (const conduit of conduits) {
        linkStates[conduit.id] = {
          Q: 0, // Flow (m3/s)
          Q_old: 0, // Flow at start of step
          flowSeries: new Float32Array(timeSteps),
          velocitySeries: new Float32Array(timeSteps)
        };
      }
      
      // Map subcatchments to nodes
      const subcatchmentToNode: Record<string, string[]> = {};
      for (const sub of subcatchments) {
        if (sub.outlet) {
          if (!subcatchmentToNode[sub.outlet]) subcatchmentToNode[sub.outlet] = [];
          subcatchmentToNode[sub.outlet].push(sub.id);
        }
      }
      
      const dt = routingDt; // Implicit schemes are unconditionally stable, no need for micro-stepping

      // Routing loop
      for (let step = 0; step < totalRoutingSteps; step++) {
        const t_sec = step * routingDt;
        const reportIdx = t_sec % reportingStep === 0 ? Math.floor(t_sec / reportingStep) : -1;
        
        const QextByNode: Record<string, number> = {};
        for (const node of nodes) {
           let Qext = 0;
           if (subcatchmentToNode[node.id]) {
              for (const subId of subcatchmentToNode[node.id]) Qext += runoffBySubcatchment[subId][step];
           }
           QextByNode[node.id] = Qext;
           // Save states for time derivative
           nodeStates[node.id].H_old = nodeStates[node.id].H; 
        }
        
        for (const conduit of conduits) {
           linkStates[conduit.id].Q_old = linkStates[conduit.id].Q;
        }
        
        // --- Implicit Picard Iteration ---
        const maxIters = 20;
        const tolerance = 0.005; // 5mm
        const omega = 0.5; // Relaxation factor
        
        let linkProps: Record<string, any> = {};
        
        for (let iter = 0; iter < maxIters; iter++) {
           let maxHeadChange = 0;
           linkProps = {};
           
           // A. Link-by-Link Momentum Evaluation
           for (const conduit of conduits) {
              const n1 = nodes.find((n: any) => n.id === conduit.fromNode);
              const n2 = nodes.find((n: any) => n.id === conduit.toNode);
              if (!n1 || !n2) continue;

              const H1 = nodeStates[n1.id].H;
              const H2 = nodeStates[n2.id].H;
              const d = conduit.shape === 'Circular' ? conduit.diameter : conduit.height;
              const L = Math.max(conduit.length, 1.0);
              const n = conduit.roughness;

              // Evaluate depth at midpoint for hydraulic properties
              const y = Math.max((H1 + H2) / 2.0 - (n1.invertElevation + n2.invertElevation) / 2.0, 0.0);
              
              let A = 0; let R = 0; let B = 0;
              if (conduit.shape === 'Circular') {
                 const r = d / 2.0;
                 if (y >= d) {
                    A = Math.PI * r * r;
                    R = d / 4.0;
                    B = 0.01 * d; // Preissmann Slot width
                 } else if (y > 0.001) {
                    const theta = 2.0 * Math.acos(1.0 - y / r);
                    A = (r * r / 2.0) * (theta - Math.sin(theta));
                    R = A / (r * theta);
                    B = 2.0 * r * Math.sin(theta/2.0);
                 }
              } else {
                 // Rectangular/Trapezoidal simplified
                 const w = conduit.width;
                 if (y >= d) {
                    A = w * d;
                    R = A / (w + 2*d);
                    B = 0.01 * w; // Slot
                 } else if (y > 0.001) {
                    A = w * y;
                    R = A / (w + 2*y);
                    B = w;
                 }
              }
              
              // Ensure slot-based width when full
              if (y >= 0.98 * d) B = Math.max(B, 0.01 * (conduit.width || conduit.diameter));

              let C_link = 0;
              let Q_const = 0;
              const A_mid = Math.max(A, 0.0001);
              const R_mid = Math.max(R, 0.0001);

              // Friction term (Manning)
              const friction = (g * n * n * Math.abs(linkStates[conduit.id].Q_old) * dt) / (A_mid * Math.pow(R_mid, 4/3));
              
              // Linearized Momentum: Q = (Q_old + g*A*dt*dH/L) / (1 + friction)
              // N parallel pipes: combined conductance scales by N
              const N_parallel = (conduit.parallelCount && conduit.parallelCount > 1) ? conduit.parallelCount : 1;
              C_link = N_parallel * (g * A_mid * dt / L) / (1.0 + friction);
              Q_const = N_parallel * linkStates[conduit.id].Q_old / (1.0 + friction);
              
              linkProps[conduit.id] = { C_link, Q_const, As_link: L * B, H1, H2 };
           }
           
           // B. Node-by-Node Continuity (Gauss-Seidel)
           for (const node of nodes) {
              const state = nodeStates[node.id];
              
              if (node.type === 'Outfall') {
                 state.H = node.invertElevation;
                 continue;
              }
              
              let As_total = node.pondedArea || 1.25; // Base manhole area
              
              if (node.type === 'Storage') {
                 if (node.storageCurve && node.storageCurve.length > 0) {
                    const curve = node.storageCurve.sort((a, b) => a.depth - b.depth);
                    const depth = Math.max(0, state.depth);
                    
                    if (depth <= curve[0].depth) {
                       As_total = curve[0].area;
                    } else if (depth >= curve[curve.length - 1].depth) {
                       As_total = curve[curve.length - 1].area;
                    } else {
                       // Linear interpolation
                       for (let i = 0; i < curve.length - 1; i++) {
                          if (depth >= curve[i].depth && depth <= curve[i+1].depth) {
                             const f = (depth - curve[i].depth) / (curve[i+1].depth - curve[i].depth);
                             As_total = curve[i].area + f * (curve[i+1].area - curve[i].area);
                             break;
                          }
                       }
                    }
                 } else {
                    As_total = node.storageArea || 100.0;
                 }
              }
              
              let sum_C = 0;
              let sum_RHS = QextByNode[node.id];
              
              for (const conduit of conduits) {
                 const props = linkProps[conduit.id];
                 if (!props) continue;
                 
                 if (conduit.fromNode === node.id || conduit.toNode === node.id) {
                    As_total += props.As_link / 2.0; // Distribute half of link surface to each node
                    sum_C += props.C_link;
                    if (conduit.fromNode === node.id) {
                       sum_RHS -= props.Q_const;
                       sum_RHS += props.C_link * props.H2;
                    } else {
                       sum_RHS += props.Q_const;
                       sum_RHS += props.C_link * props.H1;
                    }
                 }
              }
              
              const As_dt = As_total / dt;
              const H_target = (As_dt * state.H_old + sum_RHS) / (As_dt + sum_C);
              
              // Constraints
              let H_new = Math.max(H_target, node.invertElevation);
              
              // Apply relaxation for stability
              H_new = state.H + omega * (H_new - state.H);
              
              const diff = Math.abs(H_new - state.H);
              if (diff > maxHeadChange) maxHeadChange = diff;
              state.H = H_new;
           }
           
           if (maxHeadChange < tolerance) break;
        }
        
        // D. Final Flow Update for this step
        for (const conduit of conduits) {
           const props = linkProps[conduit.id];
           if (!props) continue;
           const n1 = nodes.find((n: any) => n.id === conduit.fromNode);
           const n2 = nodes.find((n: any) => n.id === conduit.toNode);
           if (n1 && n2) {
              linkStates[conduit.id].Q = props.Q_const + props.C_link * (nodeStates[n1.id].H - nodeStates[n2.id].H);
           }
        }

        
        // 4. Advance states and record series at the precise reportingStep
        for (const node of nodes) {
           const state = nodeStates[node.id];
           state.depth = state.H - node.invertElevation;
           
           // Calculate surface flooding spillage lost to the streets
           let floodingRate = 0;
           if (state.depth >= node.maxDepth - 0.001) {
              let netQ = QextByNode[node.id];
              for (const conduit of conduits) {
                 if (conduit.fromNode === node.id) netQ -= linkStates[conduit.id].Q;
                 if (conduit.toNode === node.id) netQ += linkStates[conduit.id].Q;
              }
              if (netQ > 0) floodingRate = netQ;
           }
           
           if (reportIdx >= 0 && reportIdx < timeSteps) {
              state.inflowSeries[reportIdx] = QextByNode[node.id];
              state.depthSeries[reportIdx] = state.depth;
              state.floodingSeries[reportIdx] = floodingRate;
           }
        }
        
        if (reportIdx >= 0 && reportIdx < timeSteps) {
           for (const conduit of conduits) {
              const linkState = linkStates[conduit.id];
              const n1 = nodes.find((n: any) => n.id === conduit.fromNode);
              const n2 = nodes.find((n: any) => n.id === conduit.toNode);
              
              let A = 0;
              if (n1 && n2) {
                 const d = conduit.shape === 'Circular' ? conduit.diameter : conduit.height;
                 const H_mid = (nodeStates[n1.id].H + nodeStates[n2.id].H) / 2.0;
                 const z_mid = (n1.invertElevation + n2.invertElevation) / 2.0;
                 let y = Math.max(H_mid - z_mid, 0.0);
                 y = Math.min(y, d);
                 
                 if (conduit.shape === 'Circular') {
                    const r = d / 2.0;
                    if (y > 0.001) {
                       const theta = 2.0 * Math.acos(1.0 - Math.min(y, d) / r);
                       A = (r * r / 2.0) * (theta - Math.sin(theta));
                    }
                 } else {
                    if (y > 0.001) A = conduit.width * y;
                 }
              }
              
              linkState.flowSeries[reportIdx] = linkState.Q;
              linkState.velocitySeries[reportIdx] = A > 0.001 ? linkState.Q / A : 0;
           }
        }
      }

      // Populate final results object from the recorded series
      for (const node of nodes) {
        let maxDepth = 0;
        let maxFlooding = 0;
        for (let i = 0; i < timeSteps; i++) {
          const t = i;
          const depth = nodeStates[node.id].depthSeries[i];
          const flooding = nodeStates[node.id].floodingSeries[i];
          const inflow = nodeStates[node.id].inflowSeries[i];
          
          if (depth > maxDepth) maxDepth = depth;
          if (flooding > maxFlooding) maxFlooding = flooding;
          
          results.nodes[node.id].depthSeries.push({ time: t, value: depth });
          results.nodes[node.id].floodingSeries.push({ time: t, value: flooding });
          results.nodes[node.id].inflowSeries.push({ time: t, value: inflow });
        }
        results.nodes[node.id].depth = maxDepth;
        results.nodes[node.id].head = node.invertElevation + maxDepth;
      }

      for (const conduit of conduits) {
        let maxFlow = 0;
        let maxVelocity = 0;
        
        // Copy flowSeries from linkStates into results
        for (let i = 0; i < timeSteps; i++) {
          const flow = linkStates[conduit.id].flowSeries[i];
          const velocity = linkStates[conduit.id].velocitySeries[i];
          
          results.conduits[conduit.id].flowSeries.push({ time: i, value: flow });
          results.conduits[conduit.id].velocitySeries.push({ time: i, value: velocity });
          
          if (Math.abs(flow) > Math.abs(maxFlow)) maxFlow = flow;
          if (Math.abs(velocity) > Math.abs(maxVelocity)) maxVelocity = velocity;
        }
        
        // Calculate Full-Flow Capacity (Manning's Formula)
        const conduit_slope = isNaN(conduit.slope) ? 0 : conduit.slope;
        const S = Math.max(conduit_slope / 100, 0.0001); // slope as fraction, min 0.0001
        const n = conduit.roughness;
        let A_full = 0;
        let R_full = 0;

        if (conduit.shape === 'Circular') {
          const d = conduit.diameter;
          A_full = Math.PI * Math.pow(d / 2, 2);
          R_full = d / 4;
        } else if (conduit.shape === 'Rectangular') {
          A_full = conduit.width * conduit.height;
          R_full = A_full / (2 * (conduit.width + conduit.height));
        } else if (conduit.shape === 'Trapezoidal') {
          A_full = (conduit.width + conduit.height) * conduit.height;
          const P = conduit.width + 2 * conduit.height * Math.sqrt(2);
          R_full = A_full / P;
        }

        const N_cap = (conduit.parallelCount && conduit.parallelCount > 1) ? conduit.parallelCount : 1;
        const q_cap_single = (n === 0 || A_full === 0) ? 0 : (1/n) * A_full * Math.pow(R_full, 2/3) * Math.sqrt(S);
        const q_cap = q_cap_single * N_cap;

        results.conduits[conduit.id].qFull = maxFlow;
        results.conduits[conduit.id].capacity = isNaN(q_cap) ? 0 : q_cap;
        results.conduits[conduit.id].slope = conduit_slope / 100; // fraction

        console.log(`Conduit ${conduit.id} (×${N_cap}): slope=${conduit_slope}%, capacity=${q_cap.toFixed(3)} m³/s (${q_cap_single.toFixed(3)} each), qFull=${maxFlow.toFixed(3)} m³/s`);
      }
      
      const firstConduitId = conduits[0]?.id;
      if (firstConduitId) {
        console.log(`Final results for ${firstConduitId}:`, results.conduits[firstConduitId]);
      }

      // Simulate a small delay
      console.log("Simulation completed successfully");
      setTimeout(() => {
        res.json({ success: true, results });
      }, 500);

    } catch (error: any) {
      console.error("Simulation error:", error);
      if (error.stack) console.error(error.stack);
      res.status(500).json({ success: false, error: "Simulation failed", details: error.message });
    }
  });

  // AI Analysis Endpoint
  app.post("/api/ai/analyze", async (req, res) => {
    try {
      const { nodeCount, conduitCount, subcatchmentCount, rainfall, totalFlooding, maxFlow } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.json({ success: false, error: "Gemini API key not configured" });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `You are an expert hydraulic engineer and drainage system consultant. 
      Analyze the following drainage network simulation results and provide a professional, concise summary of issues and recommendations.
      
      PROJECT SUMMARY:
      - Nodes: ${nodeCount}
      - Conduits: ${conduitCount}
      - Subcatchments: ${subcatchmentCount}
      - Rainfall Intensity: ${rainfall.intensity} mm/hr for ${rainfall.duration} hours
      - Total Flooding recorded: ${totalFlooding.toFixed(3)} m³/s
      - Peak flow in system: ${maxFlow.toFixed(3)} m³/s
      
      FORMAT:
      Use professional engineering tone. 
      Use Markdown formatting.
      Highlight any flood risks or capacity issues.
      Suggest specific improvements (e.g., increasing pipe diameter, adding attenuation storage, or changing infiltration parameters).`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const analysis = response.text();

      res.json({ success: true, analysis });
    } catch (error: any) {
      console.error("AI Analysis error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
