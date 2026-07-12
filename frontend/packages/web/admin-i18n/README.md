# @skyroc/web-admin-i18n

Admin web internationalization runtime and language UI.

## Features

- Language switching logic for the admin app
- Language state management with Jotai
- i18next runtime setup for admin web
- Type-safe language definitions
- Admin language switch and locale side effects
- Global `I18n.LocaleMessages` extension inferred from bundled locale resources

## Installation

```bash
pnpm add @skyroc/web-admin-i18n
```

## Usage

```tsx
import { useLang } from '@skyroc/web-admin-i18n';

function LanguageSelector() {
  const { locale, localeOptions, changeLocale } = useLang();

  return (
    <select value={locale} onChange={e => changeLocale(e.target.value)}>
      {localeOptions.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
```

## API

### useLang()

Hook for language management.

**Returns:**

```typescript
{
  // State
  locale: LangType;
  currentOption: LangOption | undefined;

  // Config
  localeOptions: LangOption[];
  fallbackLang: LangType;

  // Actions
  changeLocale: (lang: LangType) => void;
  setLocale: (lang: LangType) => void;

  // Utils
  isCurrentLang: (lang: LangType) => boolean;
}
```

### setupI18n(options)

Initialize i18next with configuration.

```typescript
import { setupI18n } from '@skyroc/web-admin-i18n';

setupI18n({
  defaultLocale: 'zh-CN',
  fallbackLocale: 'en-US'
});
```

## License

MIT
