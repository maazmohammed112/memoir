# Project Rules & Frontend Design System

## 1. UI & Component Standards (21st.dev, Framer Motion, Shadcn)
- **Component Directory**: All primitive/reusable components must reside in `/components/ui/`.
- **Styling**: Use standard Tailwind CSS classes with CSS custom properties (`--surface`, `--line`, `--ink`, etc.) and smooth ease transitions.
- **Animation**: Use Framer Motion (`motion`) or CSS keyframe tokens (`fade-in`, `pop-in`, `fade-up`) with `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Iconography**: Use Lucide icons (`lucide` or `lucide-react`) for consistent, crisp SVG vector icons.
- **Zero UI Lag**: Prioritize 0ms optimistic UI updates with non-blocking background synchronization.

## 2. Agentation Visual Feedback Protocol
- **Visual Feedback Ingestion**: Whenever the user provides Agentation markdown, CSS selectors (e.g., `#app > nav > button`), element bounding boxes, or annotated UI screenshots/text, prioritize resolving them directly.
- **Development Overlay**: Agentation mounts automatically in Vite dev mode (`npm run dev`) via `src/agentation-dev.js` at the bottom-right corner.
- **Selector Resolution**: Grep for unique element classes, IDs, or text anchors within `src/main.js`, `src/karyalaya.js`, `src/styles.css`, or `src/karyalaya.css` to locate and apply precise UI changes.
- **Verification**: Always run `npm run check` and `npm run build` after implementing visual feedback changes.
