# Application Bootstrap & Routing Architecture Design Document

## Document Information

| Field | Value |
|-------|-------|
| **Component Name** | Application Bootstrap & Routing |
| **Parent PRD** | application-bootstrap.md |
| **Version** | 1.0.0 |
| **Last Updated** | 2026-01-22 |
| **Status** | Current |

---

## 1. Overview

### 1.1 Purpose

This document describes the architecture of the application bootstrap process, routing configuration, and global providers for the JustJeeps order management frontend. This covers the initialization sequence from entry point through the React component tree setup.

### 1.2 Scope

This design document covers:
- Application entry point and React DOM rendering
- Root App component structure
- Route configuration and protected routes
- AuthProvider context wrapper
- Vite build configuration
- Global styling setup

### 1.3 Primary Files

| File Path | Responsibility |
|-----------|----------------|
| `/src/main.jsx` | Application entry point, React DOM render |
| `/src/App.jsx` | Root component, routing, AuthProvider |
| `/vite.config.js` | Build tool configuration, dev server proxy |
| `/src/index.css` | Global CSS reset and Ant Design import |
| `/src/scss/styles.scss` | Global SCSS with Bootstrap integration |

---

## 2. Bootstrap Sequence

### 2.1 Initialization Flow

```
1. Browser loads index.html
       │
       ▼
2. Vite injects /src/main.jsx
       │
       ▼
3. main.jsx executes
   ├── Imports global CSS (/src/index.css)
   ├── Imports SCSS (/src/scss/styles.scss)
   ├── Imports Bootstrap JS
   └── Creates React root
       │
       ▼
4. ReactDOM.createRoot() renders:
   └── React.StrictMode
       └── BrowserRouter
           └── App
               │
               ▼
5. App.jsx mounts:
   └── AuthProvider (initializes auth check)
       └── Navbar
       └── Routes (route definitions)
```

### 2.2 Entry Point (main.jsx)

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './scss/styles.scss';
import * as bootstrap from 'bootstrap';
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

#### 2.2.1 Import Order Significance

| Order | Import | Purpose |
|-------|--------|---------|
| 1 | React, ReactDOM | Core React libraries |
| 2 | App | Root component |
| 3 | index.css | Ant Design CSS, global resets |
| 4 | styles.scss | Bootstrap SCSS, custom styles |
| 5 | bootstrap | Bootstrap JavaScript (popovers, tooltips, etc.) |
| 6 | BrowserRouter | React Router history provider |

---

## 3. Component Architecture

### 3.1 App Component Structure

```
App (Root Component)
└── AuthProvider (Context Provider)
    ├── Navbar (Always rendered)
    └── Routes
        ├── /login ─────────────► LoginPage (Public)
        │
        ├── / ──────────────────► ProtectedRoute
        │                             └── OrderTable
        │
        ├── /orders ────────────► ProtectedRoute
        │                             └── OrderTable
        │
        ├── /suppliers ─────────► ProtectedRoute
        │                             └── SupplierTable
        │
        ├── /dashboard ─────────► ProtectedRoute
        │       │                     └── DashBoard
        │       │
        │       └── /dashboard/po ► ProtectedRoute
        │                               └── DashBoardPO
        │
        ├── /po ────────────────► ProtectedRoute
        │                             └── PoForm
        │
        └── /items ─────────────► ProtectedRoute
                                      └── Items
```

### 3.2 Route Configuration

| Route | Component | Protection | Description |
|-------|-----------|------------|-------------|
| `/login` | LoginPage | Public | Authentication page |
| `/` | OrderTable | Protected | Home/Orders list (default) |
| `/orders` | OrderTable | Protected | Orders list (explicit) |
| `/suppliers` | SupplierTable | Protected | Suppliers management |
| `/dashboard` | DashBoard | Protected | Analytics dashboard |
| `/dashboard/po` | DashBoardPO | Protected | Purchase order dashboard |
| `/po` | PoForm | Protected | Purchase order form |
| `/items` | Items | Protected | Item search by SKU/Brand |

### 3.3 Nested Routes

The `/dashboard` route uses nested routing:

```jsx
<Route path='/dashboard'>
  <Route index element={<ProtectedRoute><DashBoard /></ProtectedRoute>} />
  <Route path='po' element={<ProtectedRoute><DashBoardPO /></ProtectedRoute>} />
</Route>
```

---

## 4. AuthProvider Integration

### 4.1 Context Structure

```javascript
// AuthContext.jsx
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [loading, setLoading] = useState(true);
  const [authEnabled, setAuthEnabled] = useState(false);

  // ... authentication logic

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 4.2 Initialization Sequence

1. **AuthProvider mounts**
2. **checkAuthStatus()** called in useEffect
3. **API call** to `/api/auth/status` to check if auth is enabled
4. **If token exists and auth enabled**: Validate token via `/api/auth/me`
5. **Set loading to false**: Children can now render with auth state

### 4.3 Axios Configuration

```javascript
// API base URL configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Interceptor for automatic token attachment
useEffect(() => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('authToken', token);
  } else {
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('authToken');
  }
}, [token]);

// Interceptor for 401/403 handling
useEffect(() => {
  const interceptorId = axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 || error.response?.status === 403) {
        handleUnauthorized();
      }
      return Promise.reject(error);
    }
  );
  return () => axios.interceptors.response.eject(interceptorId);
}, [handleUnauthorized]);
```

---

## 5. ProtectedRoute Component

### 5.1 Component Interface

```typescript
interface ProtectedRouteProps {
  children: ReactNode;           // Components to render when authenticated
  fallback?: ReactNode;          // Optional fallback component
  requireAuth?: boolean;         // Force auth requirement (default: true)
  redirectToLogin?: boolean;     // Redirect vs modal (default: true)
}
```

### 5.2 Protection Logic Flow

```
ProtectedRoute renders
       │
       ▼
  loading? ──────Yes────► Show Spinner
       │
       No
       │
       ▼
shouldRequireAuth? ──No───► Render children
       │
       Yes
       │
       ▼
isAuthenticated? ───Yes───► Render children
       │
       No
       │
       ▼
redirectToLogin? ───Yes───► Navigate to /login
       │                    (saves current path in state)
       No
       │
       ▼
  Show fallback/modal
```

### 5.3 Redirect State Management

```javascript
// Save origin for post-login redirect
navigate('/login', {
  state: { from: location.pathname },
  replace: true
});

// In LoginPage, retrieve and use:
const from = location.state?.from || '/';
// After successful login:
navigate(from, { replace: true });
```

---

## 6. Vite Configuration

### 6.1 Build Configuration

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

### 6.2 Proxy Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| `target` | `http://localhost:8080` | Backend Express server |
| `changeOrigin` | `true` | Modify Host header to match target |
| `secure` | `false` | Allow self-signed certificates |

### 6.3 Environment Variables

| Variable | Usage | Default |
|----------|-------|---------|
| `VITE_API_URL` | API base URL override | `''` (empty, uses proxy) |

### 6.4 Development vs Production

| Environment | API Configuration |
|-------------|-------------------|
| Development | Vite proxy forwards `/api/*` to localhost:8080 |
| Production | `VITE_API_URL` should point to deployed backend |

---

## 7. Global Styling Architecture

### 7.1 CSS Loading Order

```
1. /src/index.css
   └── antd/dist/antd.css (Ant Design base styles)

2. /src/scss/styles.scss
   └── bootstrap/scss/bootstrap (Bootstrap SCSS)
   └── Google Fonts (Source Sans Pro)
   └── Custom component styles
```

### 7.2 Style Scope Hierarchy

| Source | Scope | Priority |
|--------|-------|----------|
| Ant Design CSS | Global components | Base |
| Bootstrap SCSS | Layout, utilities | Override |
| styles.scss custom | Specific components | Highest |
| Inline styles | Instance-specific | Inline priority |

### 7.3 Key Global Styles

```scss
// Fixed navbar positioning
.navbar {
  position: fixed;
  z-index: 10;
  width: 100%;
  top: 0;
}

// Content container offset for fixed navbar
.container-xl {
  margin-top: 120px;
}

// Dashboard container background
.container-fluid {
  background-color: #212121;
  background-image: url('https://www.transparenttextures.com/patterns/binding-dark.png');
}
```

---

## 8. Dependencies

### 8.1 Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.2.0 | UI library |
| `react-dom` | ^18.2.0 | DOM rendering |
| `react-router-dom` | ^6.10.0 | Client-side routing |
| `axios` | ^1.3.5 | HTTP client |

### 8.2 UI Framework Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `antd` | ^5.4.2 | Primary UI components |
| `@ant-design/icons` | ^5.0.1 | Ant Design icons |
| `@mui/material` | ^5.12.0 | Secondary UI components |
| `@mui/icons-material` | ^5.11.16 | Material icons |
| `bootstrap` | ^5.2.3 | CSS framework |
| `react-bootstrap` | ^2.7.3 | Bootstrap React components |

### 8.3 Build Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `vite` | ^4.2.0 | Build tool |
| `@vitejs/plugin-react` | ^3.1.0 | React plugin for Vite |
| `sass` | ^1.62.0 | SCSS compilation |

---

## 9. Error Handling

### 9.1 Bootstrap Errors

| Scenario | Handling |
|----------|----------|
| AuthContext fails | Console error, authEnabled defaults to false |
| API unreachable | Loading state may hang; consider timeout |
| Invalid token | getCurrentUser fails, triggers logout |

### 9.2 Routing Errors

| Scenario | Handling |
|----------|----------|
| Unknown route | No catch-all route defined (404 not handled) |
| Protected route unauthorized | Redirect to /login |

---

## 10. Security Considerations

### 10.1 Authentication Security

1. **Token Storage**: JWT stored in localStorage
   - Vulnerability: XSS attacks can access localStorage
   - Mitigation: Consider httpOnly cookies for production

2. **Automatic Logout**: 401/403 responses trigger logout
   - Prevents stale sessions

3. **Logout Ref**: Prevents multiple simultaneous logout attempts

### 10.2 Route Protection

1. **Default Protected**: All routes except `/login` require authentication
2. **Server-Side Toggle**: Auth can be disabled server-side via `/api/auth/status`
3. **requireAuth Default**: ProtectedRoute defaults to `requireAuth: true`

---

## 11. Performance Considerations

### 11.1 Bundle Analysis

| Area | Impact | Notes |
|------|--------|-------|
| Multiple UI libraries | High | Ant Design + MUI + Bootstrap increases bundle |
| Global CSS | Medium | Full Bootstrap SCSS imported |
| StrictMode | Dev only | Double-renders in development |

### 11.2 Optimization Opportunities

1. **Code Splitting**: Feature components could be lazy loaded
2. **CSS Tree-Shaking**: Only import used Bootstrap components
3. **Single UI Library**: Consider consolidating to one UI framework

### 11.3 Initial Load Sequence

```
1. HTML + Vite runtime
2. main.jsx + imports
3. CSS files (blocking)
4. React initialization
5. AuthProvider auth check (async)
6. First meaningful paint
```

---

## 12. Testing Considerations

### 12.1 Unit Test Scenarios

| Component | Test Case |
|-----------|-----------|
| App | Renders without crashing |
| App | AuthProvider wraps children |
| App | All routes are defined |
| ProtectedRoute | Redirects unauthenticated users |
| ProtectedRoute | Renders children when authenticated |
| ProtectedRoute | Shows loading spinner during auth check |

### 12.2 Integration Test Scenarios

| Test Case | Components |
|-----------|------------|
| Full login flow | LoginPage, AuthContext, ProtectedRoute |
| Deep link with auth | BrowserRouter, ProtectedRoute, redirect |
| Logout clears state | Navbar, AuthContext, localStorage |

### 12.3 E2E Test Scenarios

| Test Case | Flow |
|-----------|------|
| Fresh user login | Navigate to /, redirect to /login, login, redirect back |
| Session persistence | Login, refresh page, still authenticated |
| Session expiry | Wait for token expiry, attempt API call, redirect to login |

---

## 13. Known Limitations

### 13.1 Current Limitations

1. **No 404 Page**: Unknown routes show blank content
2. **No Error Boundary**: React errors crash entire app
3. **No Loading Skeleton**: Auth check shows plain spinner
4. **Mixed Languages**: Some UI text in Portuguese, some in English
5. **Duplicate Routes**: `/` and `/orders` render same component

### 13.2 Technical Debt

1. **Unused axios import**: App.jsx imports axios but doesn't use it
2. **Console comments in Portuguese**: Code comments should be in English
3. **No route constants**: Route paths are hardcoded strings
4. **No test file**: No `App.test.jsx` exists

---

## 14. Configuration Reference

### 14.1 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | No (uses proxy in dev) |

### 14.2 package.json Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Start development server |
| `start` | `vite` | Alias for dev |
| `build` | `vite build` | Production build |
| `preview` | `vite preview` | Preview production build |

---

## 15. Future Considerations

### 15.1 Recommended Improvements

1. **Add Error Boundary**: Catch React errors gracefully
2. **Add 404 Route**: Handle unknown routes
3. **Route Constants**: Create route configuration file
4. **Lazy Loading**: Code-split feature components
5. **Remove Unused Code**: Clean up commented code and unused imports

### 15.2 Scalability Considerations

1. **Feature-Based Routing**: Each feature could define its own routes
2. **Dynamic Route Configuration**: Routes could be generated from config
3. **Role-Based Routing**: Different routes for different user roles
4. **Micro-Frontend Ready**: Current structure could support module federation

---

## Appendix A: Component Tree Diagram

```
index.html
    └── #root
        └── React.StrictMode
            └── BrowserRouter
                └── App
                    └── AuthProvider
                        ├── Navbar
                        │   └── [LoginModal] (conditional)
                        └── Routes
                            ├── LoginPage
                            └── ProtectedRoute (x7)
                                └── [Feature Component]
```

## Appendix B: API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/status` | GET | Check if auth is enabled |
| `/api/auth/me` | GET | Get current user info |
| `/api/auth/login` | POST | Authenticate user |
| `/api/auth/logout` | POST | End user session |
| `/api/auth/register` | POST | Create new user |

## Appendix C: Browser Support

Vite default browser targets:
- Chrome >=87
- Firefox >=78
- Safari >=14
- Edge >=88

Note: Bootstrap 5 and Ant Design 5 have similar modern browser requirements.
