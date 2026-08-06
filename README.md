# JustJeeps Frontend

React SPA for the JustJeeps order management system.

## Tech Stack

- **Build**: Vite
- **Framework**: React 18
- **UI**: Ant Design (primary), MUI (legacy pages), Bootstrap (navbar/layout)
- **Drag and drop**: @atlaskit/pragmatic-drag-and-drop (requests board)
- **HTTP**: Axios
- **Routing**: React Router v6

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start development server
npm run dev
```

Visit `http://localhost:5173`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL. Empty string in dev: relative `/api` calls go through the Vite proxy, which targets `http://localhost:8080` (see `vite.config.js`) | `''` (empty) |
| `VITE_USD_TO_CAD_RATE` | USD to CAD conversion rate used by pricing views | - |

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot-reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## Project Structure

```
src/
├── components/     # Shared components (auth, etc.)
├── context/        # React Context (AuthContext)
├── features/       # Feature modules (one folder per feature + its .scss)
│   ├── order/      # Order management (main table)
│   ├── items/      # SKU/brand search
│   ├── requests/   # Internal tickets (list, board, drawer)
│   ├── settings/   # Admin settings (Trello + imports sections, gear icon)
│   ├── cron/       # Cron jobs dashboard
│   ├── quickbooks/ # QuickBooks customer lookup
│   ├── report/     # Purchaser report
│   ├── navbar/     # Top navigation
│   ├── dashboard/  # Dashboard views
│   ├── po/         # Purchase orders
│   └── supplier/   # Supplier management
├── hooks/          # Custom hooks
├── pages/          # Page components (LoginPage)
└── utils/          # Utility functions (api.js: HTTP wrappers + error helper)
```

## Main Routes

All routes except `/login` are wrapped in `ProtectedRoute` (when the backend has `ENABLE_AUTH=true`). Some are gated further by username allowlist (`/cron-jobs`) or triage users (`/settings`).

| Route | Description |
|-------|-------------|
| `/`, `/orders` | Order management table |
| `/items` | Search by SKU or brand |
| `/requests` | Internal tickets (list + kanban board) |
| `/settings` | Admin settings: Trello and imports sections (triage users only) |
| `/purchaser-report` | Purchaser report |
| `/quickbooks-customer-lookup` | QuickBooks customer lookup |
| `/cron-jobs` | Cron dashboard (allowlisted users) |
| `/suppliers` | Supplier management |
| `/dashboard`, `/dashboard/po` | Dashboards |
| `/po` | Purchase order form |
| `/login` | Authentication |

## Authentication

Authentication is controlled by the backend feature flag (`ENABLE_AUTH`).

- Uses JWT tokens stored in localStorage
- `AuthContext` manages auth state globally
- `ProtectedRoute` component guards sensitive routes

## API Configuration

In development, Vite proxy forwards `/api` requests to the backend.
In production, set `VITE_API_URL` to your backend URL.
