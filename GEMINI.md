# Project Rules & Frontend Design System

## 1. UI & Component Standards (21st.dev, Framer Motion, Shadcn)
- **Component Directory**: All primitive/reusable components must reside in `/components/ui/`.
- **Styling**: Use standard Tailwind CSS classes with CSS custom properties (`--surface`, `--line`, `--ink`, etc.) and smooth ease transitions.
- **Animation**: Use Framer Motion (`motion`) or CSS keyframe tokens (`fade-in`, `pop-in`, `fade-up`) with `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Iconography**: Use Lucide icons (`lucide` or `lucide-react`) for consistent, crisp SVG vector icons.
- **Zero UI Lag**: Prioritize 0ms optimistic UI updates with non-blocking background synchronization.
