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

The real design-token source for all `(creator)`/`(business)`/`(auth)` screens is `src/utilities/constants.ts` (85+ consumers) — colors come from `useAppColors()` (`@/context/ThemeContext`), never read a raw color constant directly. It also exports:
- `COLORS` — palette (`brinjal1`/`brinjal2` primary, `accent`, `border`, `text`, status colors, etc.)
- `F` — Poppins font family names (`regular`, `medium`, `semibold`, `bold`, ...)
- `RADIUS` — corner-radius scale: `sm=10`, `md=14`, `lg=18`, `xl=24`, `full=999`
- `SHADOW` — elevation presets: `card`, `raised`, `floating`
- `SPACING` — `xs=4`, `sm=8`, `md=12`, `lg=16`, `xl=24`, `xxl=32`, `xxxl=48`
- `FONT_SIZE` — `xs=11` … `xxxl=32` (11 is a deliberate floor — below it stops being reliably legible)
- `MAX_CONTENT_WIDTH = 800` — pair with `<MaxWidthContainer>` (`@/components/MaxWidthContainer`) to cap content width on tablets/large-screen Android; no-op on phones
- `MIN_TOUCH_TARGET = 44` — iOS HIG / Material minimum; pair a smaller visual control with `hitSlop` to reach it

`src/constants/theme.ts` (`Colors`/`Fonts`/`Spacing`/`useTheme()` from `src/hooks/use-theme.ts`) is legacy Expo-template scaffolding, only consumed by `themed-text.tsx`/`themed-view.tsx`/`ui/collapsible.tsx`/`explore.tsx` — do not add new screens to it, use `utilities/constants.ts` + `useAppColors()` instead.

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
