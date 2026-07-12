# @skyroc/web-admin-styles

Shared global CSS assets for Skyroc admin web applications.

```ts
import '@skyroc/web-admin-styles/global.css';
```

## Exports

| Export | Purpose |
| --- | --- |
| `@skyroc/web-admin-styles/global.css` | Admin app global style entry. Includes reset and NProgress styles. |
| `@skyroc/web-admin-styles/reset.css` | Browser reset and base element normalization. |
| `@skyroc/web-admin-styles/nprogress.css` | NProgress bar and spinner styles. |

The package only owns CSS assets. Runtime setup such as `setupNProgress()` stays in `@skyroc/web-admin-runtime`, and the host app should import these styles explicitly from its asset entry.
