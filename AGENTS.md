# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

FitGenius AI is a client-side-only React + TypeScript SPA (Vite) with no backend. It uses the Google Gemini API directly from the browser for AI-powered workout plan generation.

### Running the dev server

```
npm run dev
```

Starts Vite on **port 3000** (bound to `0.0.0.0`). See `vite.config.ts` for config.

### Build and type-check

```
npm run build      # Vite production build
npx tsc --noEmit   # TypeScript type-check (no lint script configured)
```

No ESLint or dedicated lint script is configured in this project. Use `npx tsc --noEmit` as the primary static analysis check.

### Testing

No test framework is configured. There are no test scripts, test files, or test dependencies.

### Environment variables

The app requires `GEMINI_API_KEY` set in `.env.local` at the project root. Vite injects it at build time via `loadEnv`. Without a valid key, the app loads and the UI is fully functional, but AI features (plan generation, exercise swap, image generation) will fail with a handled error.

### Gotchas

- **Vite `define` only works in production build**: The `process.env.API_KEY` replacement via `vite.config.ts` `define` is applied during `npm run build` (Rollup) but **not** during `npm run dev` (esbuild). To test AI features with the real API key, use `npm run build && npx vite preview --port 3000 --host 0.0.0.0` instead of `npm run dev`.
- **Service worker caching**: The app registers a PWA service worker (`sw.js`) that aggressively caches assets. When switching between dev and preview modes, the browser may serve stale cached content. Always use an **Incognito window** or clear site data (DevTools → Application → Storage → Clear site data) to avoid stale cache issues.
- Tailwind CSS is loaded from CDN (`cdn.tailwindcss.com`), not installed locally. Internet access is required for styling to work.
- All user data is stored in browser `localStorage`; there is no database.
- The `.env.local` file is gitignored (via `*.local` pattern). Each environment must create its own.
