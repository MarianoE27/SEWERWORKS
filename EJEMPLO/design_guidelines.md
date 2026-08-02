# Universal Design Guidelines: Professional Monochrome & Dynamic Accent

This document outlines the core design language and implementation guidelines for future applications. The goal is to maintain a consistent, premium, and professional aesthetic across all tools while giving each application its own unique identity through a specific **Accent Color**.

---

## 1. Core Philosophy

- **Data-Dense yet Breathable**: UIs should prioritize displaying large amounts of information efficiently without feeling cluttered. Use dense typography sizes but generous padding around major layout sections.
- **Monochrome Foundation**: The primary UI must be deeply neutral (blacks, whites, grays). This prevents eye strain and makes the application feel like a professional tool rather than a toy.
- **Functional Accentuation**: The assigned accent color is strictly functional. It highlights active states, primary actions, callouts, and key data points. It is **not** used as a background for large panels.

---

## 2. Color System

Each new application will adopt this exact monochrome baseline, swapping only the `--accent` and `--accent-hover` tokens to fit its specific identity (e.g., Teal for HidroCity, Amber for a database tool, Indigo for an AI tool).

### Dark Theme (Base)
- **Background Primary**: `#111111` — Used for the main body/app background.
- **Background Surface**: `#1A1A1A` — Used for sidebars, panels, and modals.
- **Background Hover**: `#262626` — Used for list items and button hover states.
- **Glass/Floating**: `rgba(26, 26, 26, 0.88)` with `backdrop-blur-xl`.
- **Borders**: Subtle white transparency `rgba(255, 255, 255, 0.08)`.
- **Text Primary**: `#F0F0F0`.
- **Text Secondary**: `#818181`.

### Light Theme
- **Background Primary**: `#F4F4F4` — Main body background.
- **Background Surface**: `#FFFFFF` — Sidebars, panels, modals.
- **Background Hover**: `#EBEBEB` — List items, hover states.
- **Glass/Floating**: `rgba(255, 255, 255, 0.92)` with `backdrop-blur-xl`.
- **Borders**: Subtle black transparency `rgba(0, 0, 0, 0.09)`.
- **Text Primary**: `#141414`.
- **Text Secondary**: `#737373`.

### The Accent Color (Application Identity)

> [!TIP]
> **How to apply the Accent Color:** Choose two shades of a color from a modern palette (like Tailwind's default colors). A standard shade (e.g., 500 or 600) for the base accent, and a slightly darker shade for hover.

*Example (Teal identity):*
- **Dark Theme Accent**: `#5EC2B0` (Hover: `#4AAFA0`)
- **Light Theme Accent**: `#0D9488` (Hover: `#0B8075`)

When applying the accent in CSS/Tailwind:
- `text-accent`: For active icons, primary numeric values, and active tab text.
- `bg-accent/10 text-accent`: For active list items or subtle notification badges.
- `bg-accent text-bg-primary`: For solid badges, primary buttons, or numerical counters.

---

## 3. Typography

The system relies on modern, clean typography tailored for software tools.

- **Sans-Serif (UI & Reading)**: `Inter`, UI-Sans-Serif.
- **Monospace (Code & Metrics)**: `JetBrains Mono`, UI-Monospace.

**Sizing Scale (Dense):**
- **Extra Small (`text-xs`)**: `11px` (0.6875rem) — Used for secondary metadata, counters, small badges.
- **Small (`text-sm`)**: `12px` (0.75rem) — Used for list item text, labels.
- **Base (`text-base`)**: `13px` (0.8125rem) — Primary body text, main buttons.
- **Medium (`text-md`)**: `14px` (0.875rem) — Sub-headers.
- **Large (`text-lg`)**: `16px` (1rem) — Panel headers, modal titles.

---

## 4. Layout & Components

### 4.1 Panels & Sections
- Use thin borders (`border border-border-subtle`) to separate main sections.
- Sections should be collapsible with smooth transitions.
- Use a `glass-panel` class for floating elements (Context menus, command palettes, floating toolbars).

```css
.glass-panel {
  background-color: var(--bg-glass);
  border-color: var(--border-subtle);
  backdrop-filter: blur(24px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
```

### 4.2 Interactive Elements (Lists & Buttons)
- **Idle State**: Neutral text (`text-text-secondary`) with transparent backgrounds.
- **Hover State**: Neutral background highlight (`bg-bg-hover`), text shifts to primary (`text-text-primary`).
- **Active/Selected State**: Introduce the accent color! `bg-accent/10` background with `text-accent` text, and sometimes an inner shadow `shadow-[inset_0_0_0_1px_rgba(var(--accent),0.3)]`.

### 4.3 Iconography
- Use **Lucide-React** (or equivalent clean, 2px stroke vector icons).
- Icon sizes should strictly map to their container context: `11px` for inline sub-items, `13px` for section headers, `15px` for main sidebar tools.

### 4.4 Scrollbars
Always implement a custom, minimal scrollbar to prevent bulky native scrollbars from ruining the dense layout.

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background-color: var(--bg-hover);
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background-color: var(--text-secondary);
}
```

---

## 5. Micro-Interactions & Animation

Dynamic feedback makes the application feel premium and responsive.

- **Transitions**: Apply `transition-all duration-200` to buttons, list items, and inputs.
- **Mount Animations**: New panels or modals should fade in and slide up slightly (`translateY(10px)` to `0`).
- **Alerts/Pulses**: For critical issues or active processes, use subtle animations (e.g., a tiny `w-1.5 h-1.5 rounded-full animate-pulse` dot in an alert color like `red-400` or the accent color).

> [!IMPORTANT]
> **Implementation Strategy for New Projects:**
> 1. Copy `index.css` from this reference project.
> 2. Change the `--accent` and `--accent-hover` CSS variables to the new application's identity color.
> 3. Reuse the `glass-panel` and custom scrollbar utilities.
> 4. Keep using `Inter` and `JetBrains Mono`.
