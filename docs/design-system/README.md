# ADX Design System

This directory is the shared source of truth for ADX admin pages.

## Files

- `tokens.css`: colors, typography, spacing, radii, shadows, motion, and shell dimensions for light and dark themes.
- `components.css`: reusable shell, navigation, button, form, panel, KPI, status, table, menu, and feedback classes.
- `snippets.html`: live, copyable HTML fragments built from the shared assets.

## Import order

```html
<link rel="stylesheet" href="design-system/tokens.css">
<link rel="stylesheet" href="design-system/components.css">
```

Apply the effective theme before paint to prevent flashing:

```html
<script>
  (() => {
    const preference = localStorage.getItem('adx-theme-preference') || 'system';
    const dark = preference === 'dark' || (preference === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.themePreference = preference;
  })();
</script>
```

## Naming contract

- All shared CSS custom properties use the `--adx-` prefix.
- All reusable component classes use the `adx-` prefix.
- State modifiers use BEM-like suffixes such as `adx-button--primary` and `adx-status--warning`.
- Boolean layout states use `is-` prefixes such as `is-sidebar-collapsed` and `is-open`.
- Business pages may compose these classes but should not redefine their colors or dimensions.

## Theme contract

The active theme is stored on `document.documentElement`:

- `data-theme="light" | "dark"`: effective theme.
- `data-theme-preference="light" | "dark" | "system"`: user preference.

The shell JavaScript must listen to `matchMedia('(prefers-color-scheme: dark)')` and reapply the system theme while the preference is `system`.

## Form controls

- Use a native `<select>` for single-select filters and forms with roughly 1–15 options.
- Keep the browser and operating-system popup, arrow, keyboard navigation, first-letter jump, and touch behavior.
- Wrap a native select with `adx-input-shell adx-select-shell` only to align it with adjacent inputs. Do not add a custom chevron.
- Use a custom listbox only when the feature requires multi-select, search, grouping, virtual scrolling, or rich option content.
- Pagination and other compact native selects should use `adx-select`; see `components.css` for the shared sizing.

## Accessibility contract

- Every icon-only control requires `aria-label` and a tooltip title where the icon is not universally understood.
- Focus rings use `--adx-focus-ring`; do not remove focus without an equivalent visible state.
- Status uses text plus color. Never encode meaning with color alone.
- The collapsed sidebar keeps accessible names and preserves the same keyboard reachability as the expanded state.
- Motion respects `prefers-reduced-motion`.

## Page adoption checklist

1. Import `tokens.css` and `components.css` in the order above.
2. Apply the effective theme before first paint.
3. Reuse the shell layout and navigation classes rather than rebuilding them.
4. Cover default, hover, focus, pressed, disabled, loading, empty, and error states where applicable.
5. Verify `1440x1024` and `1233x751` with no horizontal overflow.
6. Verify light, dark, and system themes.
