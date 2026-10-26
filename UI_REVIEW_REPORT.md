# UI Review Report (Data Tab & Analytics)

## Visual / UI
- Color coding now consistent (red empty, amber auto-fixed, purple locked, green valid, gray excluded).
- Analytics glassy gradient improved; neon glow bars readable.
- Text encoding fixed (no mojibake).
- Data table inputs could use larger touch targets and clearer focus rings.

## Animation / Interaction
- Analytics panel expands/shrinks smoothly; Escape closes.
- Tab buttons have press feedback.
- Consider staggered entrance for chart bars and reduced-motion support.

## Missing Features
- Auto-fixed cells only appear when system fixes outliers; no automatic fixation pipeline yet.
- No export of analytics charts/images.
- No filtering by cell status.
- No per-variable missing-pattern heatmap.

## Accessibility
- SVG charts lack `<title>`/`<desc>` and keyboard navigation.
- Color-only status; add icons/text labels.
- Ensure contrast for muted text on glassy backgrounds.

## Prioritized Recommendations
1. Add reduced-motion media query and keyboard-accessible charts.
2. Implement outlier auto-fix pipeline marking cells amber.
3. Add status filters and heatmap visualization.
4. Export analytics as PNG/PDF.