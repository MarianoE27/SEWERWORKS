import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 5;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate Limiting
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (ip && ip !== 'unknown') {
    const userHistory = rateLimitMap.get(ip) || [];
    const recentHistory = userHistory.filter(time => now - time < RATE_LIMIT_WINDOW);
    
    if (recentHistory.length >= MAX_REQUESTS) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    
    recentHistory.push(now);
    rateLimitMap.set(ip, recentHistory);
  }

  try {
    const {
      name,
      email,
      type,
      message,
      logs,
      projectInfo,
      userAgent,
      appVersion,
      calcErrors
    } = req.body;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #FF5A09; border-bottom: 2px solid #eee; padding-bottom: 10px;">Nuevo reporte de soporte: ${type}</h2>
        <p><strong>Nombre:</strong> ${name || 'Anónimo'}</p>
        <p><strong>Email:</strong> ${email || 'No especificado'}</p>
        <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #FF5A09; margin: 20px 0;">
          <strong>Mensaje:</strong>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
        
        <h3>Información del entorno</h3>
        <p><strong>User Agent:</strong> ${userAgent}</p>
        <p><strong>App Version:</strong> ${appVersion}</p>
        
        <h3>Información del Proyecto</h3>
        <pre style="background: #2a2a2a; color: #f3f3f3; padding: 10px; border-radius: 4px;">${JSON.stringify(projectInfo, null, 2)}</pre>
        
        <h3>Errores de cálculo recientes</h3>
        <pre style="background: #2a2a2a; color: #ff5555; padding: 10px; border-radius: 4px;">${calcErrors && calcErrors.length > 0 ? JSON.stringify(calcErrors, null, 2) : 'Ninguno'}</pre>
        
        <h3>Logs de la aplicación</h3>
        <pre style="background: #2a2a2a; color: #a8a8a8; padding: 10px; border-radius: 4px; overflow-x: auto; max-height: 400px; overflow-y: auto;">${logs && logs.length > 0 ? logs.join('\\n') : 'No incluidos'}</pre>
      </div>
    `;

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: process.env.SUPPORT_EMAIL || 'soporte@a-definir.com',
      subject: `[SewerWorks ${type}] ${message.substring(0, 50)}...`,
      html: htmlBody,
      replyTo: email || undefined
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error enviando email de soporte:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
