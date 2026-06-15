# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Expo Version

**Always read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.** APIs change significantly between Expo versions.

## Commands

```bash
npm start              # start dev server (press i=iOS, a=Android, w=web)
npm run ios            # run on iOS simulator (requires Xcode)
npm run android        # run on Android emulator (requires Android Studio)
npm run web            # run web version
npm run lint           # ESLint via expo lint
```

No test runner is configured.

## Architecture

This is an **Expo 56** app using **Expo Router** (file-based routing). The router root is `src/app/` — `tsconfig.json` maps `@/*` → `src/*`, which makes `src/app/` the resolved entry for `expo-router/entry`.

Path aliases:
- `@/*` → `src/*`
- `@/assets/*` → `assets/*`

### Auth & Role-Based Routing

Authentication and navigation are controlled by `RootNavigator` in [src/app/_layout.tsx](src/app/_layout.tsx). On every render, it redirects based on `useAuth()` state:

- Unauthenticated users → `/login`
- First-login users → `/onboarding` (CREATOR) or `/business-onboarding` (BUSINESS)
- Authenticated users → `/(creator)/` or `/(business)/` depending on `user.role`

Route groups:
- `(auth)/` — login, signup, verify (unauthenticated)
- `(creator)/` — creator home, proposals, messages, notifications, profile, settings
- `(business)/` — business home, campaigns, create, proposals, messages, notifications, profile, settings
- Shared modal/stack screens: `campaign-detail`, `submit-proposal`, `create-campaign`

### Context Providers

Provider hierarchy (outer → inner): `AppThemeProvider` → `LanguageProvider` → `AuthProvider` → `ThemeProvider` (expo-router)

| Context | Hook | Purpose |
|---|---|---|
| `AuthContext` | `useAuth()` | `user`, `isLoading`, `login()`, `logout()`, `updateUser()` |
| `LanguageContext` | `useLanguage()` | `language`, `setLanguage()`, `t()` for i18n |
| `ThemeContext` | `useIsDark()` | Dark mode state |
| `DrawerContext` | `useDrawer()` | `openDrawer()` for side drawer navigation |

### i18n

Translations live in `src/i18n/` for English (`en.ts`) and Nepali (`ne.ts`). Use `const { t } = useLanguage()` in components. Interpolate variables with `{{varName}}` syntax: `t('key', { count: 5 })`.

### Services (Mock)

`src/services/` contains mock implementations — no real backend:

- `auth.ts` — `authService.login/logout/getStoredUser`. Mock credentials: `creator@example.com` and `business@example.com` (any password ≥ 4 chars).
- `chat.ts` — mock messaging
- `notifications.ts` — mock notifications

### Storage

`src/utilities/storage.ts` is an **in-memory Map** — data does not persist across app restarts. Replace with `expo-secure-store` for production.

### Theme System

`src/constants/theme.ts` exports:
- `Colors` — light/dark palettes: `text`, `background`, `backgroundElement`, `backgroundSelected`, `textSecondary`
- `Fonts` — platform-selected font families: `sans`, `serif`, `rounded`, `mono`
- `Spacing` — `half=2`, `one=4`, `two=8`, `three=16`, `four=24`, `five=32`, `six=64`
- `BottomTabInset` — iOS: 50, Android: 80
- `MaxContentWidth = 800`

Use `useTheme()` from `src/hooks/use-theme.ts`. Never read `Colors[scheme]` directly in components.

### Component Directories

- `src/components/` — shared UI primitives (`ThemedText`, `ThemedView`, `Button`, etc.)
- `src/commonComponents/` — additional shared components (`Button/`, `TextInputWithLabel/`)
- `src/features/<role>/components/` — role-specific feature components (e.g. `features/creator/components/`, `features/business/components/`)

`ThemedText` `type` prop: `default | title | small | smallBold | subtitle | link | linkPrimary | code`
`ThemedView` `type` prop: `background | backgroundElement`

### Platform-Specific Files

Files with `.web.ts(x)` suffix replace the base file on web:
- `src/hooks/use-color-scheme.ts` / `.web.ts`
- `src/components/animated-icon.tsx` / `.web.tsx`
- `src/components/app-tabs.tsx` / `.web.tsx`

### Key Constraints

- **React Compiler is on** (`experiments.reactCompiler: true` in `app.json`) — do not add manual `useMemo` or `useCallback` unless the compiler cannot handle it.
- **TypedRoutes is on** (`experiments.typedRoutes: true`) — use typed `href` values with `<Link>` or `router.push()`.
- **Reanimated worklets**: when triggering React state from a reanimated `withCallback`, use `react-native-worklets` (`scheduleOnRN`) — this is required to call `setState` from a worklet.
