## Plan: Centralize Styling & Aesthetic Control

TL;DR: Consolidate the app’s design decisions into a shared theme layer in `src/app/globals.css`, replace repeated Tailwind utility combinations with semantic classes, and document the unavoidable boundaries where styling is external or library-managed.

**Steps**
1. Audit the current style surface.
   - Review `src/app/globals.css`, `src/components/ReportForm.tsx`, `src/components/LocationMapPicker.tsx`, `src/app/layout.tsx`, and `src/app/page.tsx`.
   - Capture repeated palette values, typography settings, spacing/radius, button states, glass effects, and animations.

2. Define centralized theme tokens in the global stylesheet.
   - Add `:root` CSS variables for core colors and semantic color roles:
     - background, surface, surface-muted, surface-border, foreground, muted, primary, primary-strong, accent, success, warning, danger.
   - Add typography variables for font families, base text color, heading color, code font.
   - Add layout tokens for radius, surface elevation, selection highlight, input/background opacity, and transitions.
   - Keep `@import "tailwindcss"` and layer custom utilities under `@layer base` / `@layer utilities`.

3. Add reusable semantic utility classes.
   - Create classes like `.app-shell`, `.surface`, `.surface-glass`, `.surface-glass-blue`, `.card`, `.button`, `.button-primary`, `.button-secondary`, `.input-field`, `.section-title`, `.status-pill`, `.text-muted`, `.text-emphasis`.
   - Define shared hover/focus states using theme variables.
   - Define animation helper classes in one place (gradient, shimmer, pulse, fade-in) if they are not already globally accessible.

4. Replace repeated ad-hoc Tailwind patterns with the new shared classes.
   - In `src/components/ReportForm.tsx`:
     - Move the top-level form wrapper styling into `.app-shell` / `.surface` classes.
     - Convert repeated button patterns into `.button-primary`, `.button-secondary`, and semantic toggle classes.
     - Convert repeated input/textarea styling into `.input-field`.
     - Convert glass and status card styles into `.surface-glass` / `.surface-glass-blue`.
     - Convert repeated text styles to semantic `.section-title`, `.text-muted`, `.text-inline-emphasis`.
   - In `src/components/LocationMapPicker.tsx`:
     - Replace the map container wrapper classes with semantic container classes and surface utilities.
   - In `src/app/layout.tsx` and `src/app/page.tsx`:
     - Ensure page layout uses the shared `app-shell` or theme body defaults.

5. Optional shared component layer (if desired).
   - If centralization should be deeper than CSS, create small shared presentational components in `src/components/ui/` for Button, Card, Input, TextField.
   - This is not required to centralize theme variables, but it will reduce repeated class combinations and make future aesthetic experiments safer.

6. Document scope and unavoidable boundaries.
   - Note that `src/lib/email-templates.ts` is separate HTML email styling and should not be merged into app CSS.
   - Note that Leaflet’s external stylesheet (`leaflet/dist/leaflet.css`) and its built-in marker assets remain outside the theme layer.
   - Note that inline Tailwind combinations in JSX can be centralised gradually; full convention-based refactor may require creating shared classes/components.

7. Verify the theme is centralized and easy to tweak.
   - Change one or two root variables in `src/app/globals.css` and confirm the color/spacing updates propagate across the UI.
   - Confirm the app still builds and the form flows work.
   - Confirm email generation and map rendering are unaffected by the UI theme refactor.

**Decisions**
- Use CSS custom properties in `src/app/globals.css` as the central theme authority.
- Keep third-party and email-template styling outside the centralized app UI theme.
- Keep the refactor incremental: define the theme first, then replace repeated ad-hoc styles.

**Boundaries**
- Full centralization is limited by Leaflet library CSS and external marker assets.
- Email HTML styles in `src/lib/email-templates.ts` are intentionally separate and not part of the app theme.
- Some ad-hoc utility combinations in JSX may remain until shared components are introduced.
