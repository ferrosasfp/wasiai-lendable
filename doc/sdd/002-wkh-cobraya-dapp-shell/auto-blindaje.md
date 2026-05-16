# WKH-COBRAYA-DAPP-SHELL — Auto-Blindaje (F3 runtime errors)

### [2026-05-16 04:41] W3 — `useActionState` is React 19 API, project is React 18.3.1
- **Error**: `TypeError: useActionState is not a function or its return value is not iterable` when rendering `<LoginForm />` / `<SignupForm />` in jsdom tests.
- **Causa raíz**: Story File §5 W3 snippet uses `import { useActionState } from 'react'`. That hook ships in React 19 only. The project (per the quick reference table §1) is **React 18.3.1**.
- **First fix attempt**: replaced `useActionState` (`react`) with `useFormState` (`react-dom`). Tests still failed: `react-dom` 18.3.1 stable does NOT export `useFormState` / `useFormStatus` (those are React 19 / Next experimental channel). Verified via `node -e "console.log(Object.keys(require('react-dom')))"` — only `createRoot, render, version, ...`.
- **Second fix (chosen)**: hand-rolled `useState` + `useTransition` pattern. The form `onSubmit` handler calls the Server Action with a `FormData` constructed from the form, captures the returned `ActionResult` into local state, and renders `state.error` accordingly. Server Actions still own the redirect (success path throws `NEXT_REDIRECT`); only the error path runs in the client. Same UX as `useFormState` but compatible with React 18.3.1 stable.
- **Aplicar en**: every Client Component the Story File maps to `useActionState` / `useFormState` / `useFormStatus` — including the 5 onboarding step forms (W6) and `edit-form` (W10). Search `grep -rn 'useActionState\|useFormState\|useFormStatus' src/` after each wave to ensure no stragglers; replace with the React 18 pattern.

### [2026-05-16 04:46] W4 — middleware tests fail under jsdom: `request.headers must be an instance of Headers`
- **Error**: middleware tests all threw `Error: request.headers must be an instance of Headers` from `NextResponse.next({ request: { headers: request.headers } })`.
- **Causa raíz**: vitest config sets `environment: "jsdom"` globally. jsdom installs its own `Headers` global, but Next's `handleMiddlewareField` (inside `next/dist/server/web/spec-extension/response.js`) does `init.request.headers instanceof Headers` against the runtime's Headers class — which in Node test mode is `undici`/global Web Headers. The two protos don't match → check fails.
- **Fix**: add `// @vitest-environment node` directive at the top of `tests/unit/middleware/middleware.test.ts`. Use the node environment for any test that exercises NextResponse middleware machinery; component tests stay on jsdom.
- **Aplicar en**: any future test that imports `next/server`'s NextResponse and constructs middleware responses — typically middleware, route handlers, or anything that touches `request.headers` mutation.
