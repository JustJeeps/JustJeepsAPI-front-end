# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JustJeeps order management frontend - a Vite + React SPA for managing orders, suppliers, purchase orders, and product data for JustJeeps.com. Connects to a backend API (Express server on port 8080).

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
```

## Architecture

### Tech Stack
- **Build**: Vite with React plugin
- **UI Libraries**: Ant Design (primary), MUI (legacy pages), Bootstrap (navbar/layout)
- **Drag and drop**: @atlaskit/pragmatic-drag-and-drop (+auto-scroll) on the requests board
- **Routing**: React Router v6
- **HTTP**: Axios (global instance; wrappers in `src/utils/api.js`)
- **Styling**: SCSS + Bootstrap
- **Charts**: Recharts

### API Configuration
- Backend URL configured via `VITE_API_URL` environment variable
- In development, Vite proxy forwards `/api` requests to `localhost:8080`
- When `VITE_API_URL` is empty, relative URLs are used (proxy handles routing)

### Key Directories
```
src/
  context/       # React Context (AuthContext for auth state)
  features/      # Feature-based components (order, dashboard, po, supplier, etc.)
  components/    # Shared components (auth, etc.)
  hooks/         # Custom hooks (useDashboardData)
  pages/         # Page components
  utils/         # Utility functions
```

### Authentication Flow
- `AuthContext` manages auth state globally
- `useAuth()` hook provides: `user`, `token`, `login()`, `logout()`, `isAuthenticated`
- `ProtectedRoute` component wraps routes requiring auth
- Auth can be toggled server-side via `/api/auth/status`
- JWT tokens stored in localStorage

### Main Routes
All routes except `/login` are wrapped in `ProtectedRoute` (effective when the backend has `ENABLE_AUTH=true`).
- `/` and `/orders` - Order management table (OrderTable)
- `/items` - Items listing (search by SKU or brand)
- `/requests` - Internal tickets (list + kanban board with drag and drop)
- `/settings` - Admin settings: Trello integration (gear icon, triage users only)
- `/purchaser-report` - Purchaser report (username allowlist)
- `/quickbooks-customer-lookup` - QuickBooks customer lookup
- `/cron-jobs` - Cron dashboard (`allowedUsers={['tess']}`)
- `/suppliers` - Supplier table
- `/dashboard` - Dashboard
- `/dashboard/po` - Purchase order dashboard
- `/po` - Purchase order form
- `/login` - Login page

### Data Flow Pattern
Components typically:
1. Call API via axios using `${API_URL}/api/...` endpoints
2. Store data in local state
3. Use Ant Design Table for display with inline editing support

### Order Table (Main Component)
`src/features/order/OrderTable.jsx` is the primary component:
- Expandable rows showing order items
- Inline editing with Form validation
- Email generation for vendor communication
- Filtering by PO status
- Metrics display (today's orders, not-set orders, etc.)
