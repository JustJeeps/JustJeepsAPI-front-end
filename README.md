# JustJeeps Frontend

React SPA for the JustJeeps order management system.

## Tech Stack

- **Build**: Vite
- **Framework**: React 18
- **UI**: Ant Design, MUI
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
| `VITE_API_URL` | Backend API URL | http://localhost:8080 |

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
├── features/       # Feature modules
│   ├── order/      # Order management
│   ├── dashboard/  # Dashboard views
│   ├── po/         # Purchase orders
│   └── supplier/   # Supplier management
├── hooks/          # Custom hooks
├── pages/          # Page components
└── utils/          # Utility functions
```

## Main Routes

| Route | Description |
|-------|-------------|
| `/` | Order management |
| `/orders` | Order table |
| `/suppliers` | Supplier management |
| `/dashboard` | Dashboard (protected) |
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
