# Tally Analytics — Frontend

React dashboard for Tally data: inventory, sales, area-wise sales map, ledger/P&L and stock forecasts. It talks to the [tally-analytics-backend](https://github.com/hdz-666/tally-analytics-backend) API and uses Supabase for login.

- **Stack:** React 18, TypeScript, Vite, Ant Design / Pro Components, TanStack Query, ECharts, Leaflet
- **Auth:** Supabase (email login) — the access token is attached to every API request
- **Tests:** Vitest + Testing Library + MSW

## Project layout

```
src/
  lib/          Supabase client
  context/      AuthContext (session state)
  services/     axios API clients (api.ts + one per domain)
  models/       TypeScript types for API responses
  viewmodels/   React Query hooks (useSales, useStock, ...)
  views/        pages/ (Dashboard, Inventory, Sales, AreaSales, Ledger, Forecast, ...) and components/
  utils/        helpers (Excel export)
  __tests__/    unit tests
```

## Getting started

### 1. Prerequisites

- Node.js **22** (same as CI)
- Yarn (`npm install -g yarn`, or `corepack enable`)
- The backend running locally or a deployed backend URL

### 2. Clone and install

```bash
git clone https://github.com/hdz-666/tally-analytics.git
cd tally-analytics
yarn install
```

### 3. Configure environment

Create `.env.local` in the project root:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here
VITE_BACKEND_URL=http://localhost:8000
```

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key — safe for the browser |
| `VITE_BACKEND_URL` | Backend base URL, e.g. `http://localhost:8000` (no trailing `/api`) |

Use the **publishable** key here, never the backend's secret key — everything prefixed `VITE_` is bundled into the browser build. `.env.local` is gitignored.

### 4. Run the dev server

```bash
yarn dev
```

Open http://localhost:5173 and sign in with a Supabase user. Make sure the backend's `ALLOWED_ORIGINS` includes `http://localhost:5173`.

### 5. Other scripts

| Command | What it does |
| --- | --- |
| `yarn build` | Type-check and build to `dist/` |
| `yarn preview` | Serve the production build locally |
| `yarn test` | Vitest in watch mode |
| `yarn test:run` | Run tests once (what CI runs) |
| `yarn coverage` | Tests with coverage report |

## Working on a branch

`main` is the deployed branch — don't commit to it directly.

```bash
git checkout main
git pull origin main
git checkout -b <short-feature-name>     # e.g. area-wise-sales, unit-tests

# ...make changes, run yarn test:run and yarn build...

git add <files>
git commit -m "feat: add area wise sales"
git push -u origin <short-feature-name>
```

Then open a pull request into `main`. CI (`.github/workflows/ci.yml`) runs `yarn install --frozen-lockfile` and `yarn test:run` and must pass before merging.

**Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `test:`, `chore:`, `refactor:`, `docs:`.

If the feature needs backend changes, use the same branch name in [tally-analytics-backend](https://github.com/hdz-666/tally-analytics-backend) and merge the backend first so the API exists when the frontend ships.

Dependabot opens dependency PRs — review and merge them once CI is green. Always commit `yarn.lock` changes alongside `package.json`.

## Deployment

The app is deployed on Vercel. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_BACKEND_URL` (the production backend URL) in the Vercel project's environment variables, and add the Vercel domain to the backend's `ALLOWED_ORIGINS`.
