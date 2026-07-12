# @skyroc/ui-tokens

Cross-platform design tokens for SoybeanAdmin: colors, spacing, radius, typography.

- **Zero runtime dependencies** — pure TypeScript constants
- **Single source of truth** consumed by `web/tailwind-plugin`, `native/theme`, and the future `miniapp/theme`

## Install

This is an internal workspace package. Add it via:

```jsonc
{
  "dependencies": {
    "@skyroc/ui-tokens": "workspace:*"
  }
}
```

## Usage

```ts
import {
  borderRadius,
  defaultBrandColors,
  defaultFeedbackColorsHsl,
  defaultSidebarColorsHsl,
  fontSize,
  fontWeight,
  spacing
} from '@skyroc/ui-tokens';

// Tailwind config
export default {
  theme: {
    extend: {
      spacing,
      borderRadius,
      fontSize,
      fontWeight
    }
  }
};
```

Sub-path imports are also supported:

```ts
import { spacing } from '@skyroc/ui-tokens/spacing';
import { defaultBrandColors } from '@skyroc/ui-tokens/colors';
```

## Color tokens

Three default color sets are exported, all with a symmetric `{ light, dark }` shape:

| Export | Format | Used by |
|---|---|---|
| `defaultBrandColors` | hex | Native / cross-platform brand palette |
| `defaultFeedbackColorsHsl` | HSL string | Web `tailwind-plugin` CSS-vars |
| `defaultSidebarColorsHsl` | HSL string | Web `tailwind-plugin` CSS-vars |

> `defaultLightColors` / `defaultDarkColors` are kept as deprecated aliases of `defaultBrandColors.light` / `defaultBrandColors.dark` and will be removed in the next major.

## What goes here / what doesn't

Goes here:

- Plain TS objects for design variables (numbers, strings)
- Default color palettes (brand / feedback / sidebar) in hex or HSL string form
- Type definitions for token names

Does NOT go here:

- Any React component or hook
- Any platform API (DOM / React Native / Taro)
- Any non-trivial runtime dependency
- Any color algorithm (palette generation, WCAG, etc. — those live in `@skyroc/color`)
