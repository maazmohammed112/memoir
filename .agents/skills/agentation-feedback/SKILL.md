---
name: agentation-feedback
description: Visual feedback interpreter and implementation engine for Agentation annotations. Triggers when the user provides Agentation markdown, CSS selectors, element bounding boxes, selected text, animation timestamps, or in-browser visual feedback notes.
---

# Agentation Visual Feedback Skill

Use Agentation's structured visual annotations as direct, pinpoint instructions for frontend styling, layout adjustments, typography, interactions, and bug fixes.

---

## 1. Overview & Tooling Architecture

[Agentation](https://github.com/benjitaylor/agentation) is an in-browser visual feedback tool. During development (`npm run dev`), Agentation provides a persistent floating toolbar in the bottom-right corner that allows the user to:
- **Click to Annotate**: Select any DOM element with automatic CSS selector and element path identification.
- **Text Selection**: Highlight specific text spans to leave copy, font, or styling notes.
- **Multi-Select & Area Selection**: Drag bounding boxes over UI sections, layouts, or empty space.
- **Animation Pause**: Freeze CSS/JS transitions and video states to annotate mid-animation frames.
- **Copy Structured Output**: Export formatted markdown containing exact selectors, coordinates, class lists, and feedback.

In Memoir, Agentation is dynamically imported in development mode via `src/agentation-dev.js` and mounted into the root DOM without impacting production bundles.

---

## 2. Parsing Agentation Structured Output

When the user pastes Agentation output, parse each entry into:
1. **Target Selector / Path**: e.g., `body > div#app > nav > button.nav-btn:nth-child(3)` or `.vault-card > .card-title`
2. **Target Classes**: e.g., `font-medium text-ink-secondary hover:text-ink`
3. **Target Text / Context**: e.g., `selectedText: "Capture"`, `nearbyText: "Recent entries..."`
4. **Bounding Box / Position**: Coordinates (`x`, `y`, `width`, `height`) for alignment, padding, margin, or overlap issues.
5. **User Comment / Intent**: The exact feedback (e.g. "Reduce padding to 8px", "Change icon color to match active theme", "Move button 12px right").

### Typical Agentation Markdown Structure
```markdown
### 1. Button (`button.filter-chip.active`)
- **Selector**: `#app > div.filter-bar > button:nth-child(2)`
- **Classes**: `filter-chip active flex items-center gap-1.5`
- **Text**: `Memories`
- **Position**: `{ x: 120, y: 84, width: 92, height: 32 }`
- **Feedback**: Active chip background should have higher contrast against the dark background.
```

---

## 3. Code Location & Grepping Strategy

Agentation provides browser runtime DOM selectors. Match these selectors to source files using `grep_search`:

1. **Locate Source File & Component**:
   - UI templates, render functions, and event bindings live in `src/main.js` and `src/karyalaya.js`.
   - Core layouts, theme tokens, and custom styles reside in `src/styles.css`, `src/karyalaya.css`, `src/brand.css`, and `index.html`.
2. **Search By Specific Anchors**:
   - Grep for distinctive CSS class sequences (e.g., `filter-chip active`).
   - Grep for unique element IDs or data attributes (`data-tab`, `data-action`, `data-id`).
   - Grep for visible label text strings (`"Memories"`, `"Add note"`, `"Capture"`).
3. **Verify DOM Context**:
   - Inspect surrounding DOM hierarchy to ensure the exact element matches the selector path described in the annotation.

---

## 4. Implementation Guidelines

- **Adhere to the Memoir Design System**:
  - Use established CSS custom properties: `--surface`, `--surface-secondary`, `--line`, `--ink`, `--ink-secondary`, `--accent`.
  - Maintain consistent corner radiuses (`rounded-xl`, `rounded-2xl`, `rounded-full`).
  - Use Lucide icons for all vector iconography.
- **Ensure Responsive & Touch Fit**:
  - Keep 44px+ touch targets for interactive controls on mobile viewports.
  - Avoid unintentional horizontal overflow (`overflow-x: hidden`).
  - Preserve hidden scrollbars (`scrollbar-none`, `no-scrollbar`).
- **Animation & Transitions**:
  - For hover and active states, use `cubic-bezier(0.16, 1, 0.3, 1)` or standard 150ms-200ms ease transitions.
  - Never leave animations in a paused or broken state.
- **Zero UI Lag**:
  - Keep state updates optimistic (0ms latency feel).

---

## 5. Verification Protocol

After implementing changes requested in Agentation annotations:
1. Run `npm run check` to verify JavaScript syntax across all source files.
2. Run `npm run build` to confirm Vite production build compiles without errors.
3. Test locally or verify via browser subagent when applicable.
4. Report clearly which annotations were resolved and provide a concise summary of changes made.
