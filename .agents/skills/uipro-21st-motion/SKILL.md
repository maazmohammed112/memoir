---
name: uipro-21st-motion
description: >-
  Comprehensive guide and design system rules for integrating 21st.dev UI components,
  Framer Motion animations, WebGL heroes, streaming text, Tailwind CSS tokens,
  and Shadcn UI component architecture into modern web apps.
---

# 21st.dev & Framer Motion UI Engineering Skill

This skill encodes all best practices, design standards, and implementation patterns for 21st.dev, UIPro, Framer Motion, Tailwind CSS, and Shadcn UI.

---

## 1. Project Architecture & Directory Structure

Modern React/Next.js/Vite frontend applications follow the **Shadcn UI component pattern**:
- `/components/ui/` — Atomic, reusable, unstyled or beautifully styled base components (`button.tsx`, `dialog.tsx`, `blackhole-hero-section.tsx`, `streaming-text.tsx`).
- `/components/` — Feature-level or domain-specific composite widgets.
- `/lib/` or `/src/lib/` — Utility helpers (such as `cn()` class merging with `clsx` and `tailwind-merge`).
- `/hooks/` — Custom React hooks.

### Why `/components/ui` Is Crucial:
1. **Separation of Concerns**: Isolates primitive, copy-pasteable UI components from application business logic.
2. **Shadcn CLI Compatibility**: Shadcn CLI tools (`npx shadcn@latest add ...` and `uipro`) default to placing components in `/components/ui`.
3. **TypeScript Path Aliases**: Configured via `@/components/ui/*` in `tsconfig.json` or `jsconfig.json`.

---

## 2. Core Dependencies & Setup

When creating a new project or integrating into an existing project:

```bash
# 1. Install Motion & Lucide Icons
npm install motion lucide-react clsx tailwind-merge

# 2. Setup Tailwind CSS (Tailwind 4 or 3) & Animation tokens
npm install -D tailwindcss postcss autoprefixer
```

---

## 3. Tailwind CSS & Modern Color Tokens

Extend your project's stylesheet (`index.css` or `globals.css`) with precision tokens:

```css
:root {
  --page: #fafafb;
  --canvas: #f1f2f3;
  --surface: #ffffff;
  --inset: #f7f8f9;
  --hover: #f4f5f6;
  --hover-2: #e7e9eb;
  --ink: #1f2124;
  --ink-2: #62656b;
  --ink-3: #9a9da3;
  --line: #ecedef;
  --line-strong: #e0e2e5;
  --radius-control: 8px;
  --ease-link: cubic-bezier(0.16, 1, 0.3, 1);
  --shadow-hairline: 0 0 0 1px var(--line);
}

@keyframes fade-in {
  0% { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pop-in {
  0% { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes fade-up {
  0% { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## 4. Key Component Archetypes

### A. WebGL Raymarching Heroes (`blackhole-hero-section.tsx`)
- Physics-based raymarching shaders (Schwarzschild / Kerr metrics, gravitational lensing, Doppler beaming).
- Responsive layout switching using `useNarrow()` hook to adjust ray count, field of view (`fov`), and focus center (`[x, y]`).
- Clean fallback for reduced-motion and context-lost recovery.

### B. Streaming AI Text & Citation Chips (`streaming-text.tsx`)
- Gradual word reveal with pop-in citation badges (`SourceChip`).
- Accordion source breakdowns with smooth `grid-template-rows` transitions.
- Interactive follow-up action pills with staggered spring entrances.

---

## 5. UI Engineering Guidelines for New Projects

1. **Always use Lucide React icons** for clean, consistent iconography.
2. **Prioritize 0ms optimistic UI** responsiveness.
3. **Use spring animations & ease curves** (`cubic-bezier(0.16, 1, 0.3, 1)`) for premium fluidity.
4. **Enforce accessible contrast and prefers-reduced-motion** support.
