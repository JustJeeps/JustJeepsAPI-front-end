# Product Requirements Document: Application Bootstrap Module

## Document Information

| Field | Value |
|-------|-------|
| Document Version | 1.0 |
| Status | Reverse-Engineered |
| Created Date | 2026-01-22 |
| Last Updated | 2026-01-22 |
| Architecture Pattern | Layered |

---

## 1. Executive Summary

### 1.1 Purpose
This document describes the Application Bootstrap module of the JustJeeps order management frontend application. The module handles application initialization, routing configuration, authentication context setup, and global styling.

### 1.2 Scope
The Application Bootstrap module encompasses:
- React application entry point and DOM mounting
- Root component structure with authentication provider
- Client-side routing configuration
- Global CSS and SCSS styling
- Vite build tool configuration
- API proxy configuration for development

### 1.3 Module Overview
The bootstrap layer serves as the foundation of the application, providing:
- Single Page Application (SPA) initialization
- Route protection and authentication flow
- Consistent layout structure with navigation
- Development and production build configuration

---

## 2. Functional Requirements

### 2.1 Application Entry Point

**Location**: `src/main.jsx`

**Description**: Initializes the React application and mounts it to the DOM.

**Responsibilities**:
1. Import and initialize global styles
2. Set up React Router's BrowserRouter
3. Enable React Strict Mode for development warnings
4. Mount the App component to the root DOM element

**Code Structure**:
```javascript
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

**Dependencies**:
| Package | Purpose |
|---------|---------|
| `react` | Core React library |
| `react-dom` | DOM rendering |
| `react-router-dom` | Client-side routing |
| `bootstrap` | CSS framework (JS initialized but not directly used) |

**Style Imports**:
- `./index.css` - Ant Design CSS and base styles
- `./scss/styles.scss` - Custom SCSS with Bootstrap integration

### 2.2 Root Application Component

**Location**: `src/App.jsx`

**Description**: Defines the main application structure, authentication provider, navigation, and route configuration.

#### 2.2.1 Component Hierarchy

```
App
  AuthProvider (Context)
    Navbar (Always visible)
    Routes
      Route: /login (Public)
      Route: / (Protected - OrderTable)
      Route: /orders (Protected - OrderTable)
      Route: /suppliers (Protected - SupplierTable)
      Route: /dashboard (Protected - DashBoard)
      Route: /dashboard/po (Protected - DashBoardPO)
      Route: /po (Protected - PoForm)
      Route: /items (Protected - Items)
```

#### 2.2.2 Feature Component Imports

| Component | Source Path | Purpose |
|-----------|-------------|---------|
| `Navbar` | `./features/navbar/Navbar.jsx` | Global navigation header |
| `OrderTable` | `./features/order/OrderTable.jsx` | Order management grid |
| `SupplierTable` | `./features/supplier/SupplierTable.jsx` | Supplier management |
| `DashBoard` | `./features/dashboard/DashBoard.jsx` | Order analytics dashboard |
| `DashBoardPO` | `./features/dashboard/DashBoardPO.jsx` | Purchase order dashboard |
| `PoForm` | `./features/po/PoForm.jsx` | Purchase order form |
| `Items` | `./features/items/Items.jsx` | Product/item listing |
| `LoginPage` | `./pages/LoginPage.jsx` | User authentication page |

#### 2.2.3 Authentication Components

| Component | Source Path | Purpose |
|-----------|-------------|---------|
| `AuthProvider` | `./context/AuthContext` | Global authentication state |
| `ProtectedRoute` | `./components/auth/ProtectedRoute` | Route guard component |

### 2.3 Route Configuration

**Location**: `src/App.jsx`

#### 2.3.1 Route Definitions

| Path | Component | Protection | Description |
|------|-----------|------------|-------------|
| `/login` | `LoginPage` | Public | User authentication page |
| `/` | `OrderTable` | Protected | Home - Order management |
| `/orders` | `OrderTable` | Protected | Order management (alias) |
| `/suppliers` | `SupplierTable` | Protected | Supplier management |
| `/dashboard` | `DashBoard` | Protected | Order analytics |
| `/dashboard/po` | `DashBoardPO` | Protected | Purchase order analytics |
| `/po` | `PoForm` | Protected | Purchase order creation |
| `/items` | `Items` | Protected | Product catalog |

#### 2.3.2 Nested Routes

The `/dashboard` path uses nested routing:
```javascript
<Route path='/dashboard'>
  <Route index element={<DashBoard />} />
  <Route path='po' element={<DashBoardPO />} />
</Route>
```

### 2.4 Authentication Context

**Location**: `src/context/AuthContext.jsx`

**Description**: Provides global authentication state and methods via React Context.

#### 2.4.1 Context Value Structure

```javascript
{
  user: Object | null,           // Current user data
  token: string | null,          // JWT authentication token
  authEnabled: boolean,          // Server-side auth toggle
  loading: boolean,              // Auth check in progress
  login: Function,               // Login method
  logout: Function,              // Logout method
  register: Function,            // Registration method
  getCurrentUser: Function,      // Fetch current user
  isAuthenticated: boolean       // Derived auth status
}
```

#### 2.4.2 Authentication Features

**Token Management**:
- Stores JWT token in localStorage (`authToken` key)
- Sets Authorization header on axios globally
- Removes token on logout or unauthorized response

**Axios Interceptors**:
- Response interceptor handles 401/403 errors
- Automatic logout and redirect on unauthorized
- Prevents multiple simultaneous logout calls via ref guard

**API Endpoints Used**:
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/status` | GET | Check if auth is enabled server-side |
| `/api/auth/me` | GET | Get current authenticated user |
| `/api/auth/login` | POST | Authenticate with credentials |
| `/api/auth/logout` | POST | Invalidate session |
| `/api/auth/register` | POST | Create new user account |

#### 2.4.3 Custom Hook

```javascript
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 2.5 Protected Route Component

**Location**: `src/components/auth/ProtectedRoute.jsx`

**Description**: Higher-order component that guards routes requiring authentication.

#### 2.5.1 Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | ReactNode | Required | Content to render if authenticated |
| `fallback` | ReactNode | null | Alternative content when not authenticated |
| `requireAuth` | boolean | true | Force authentication even if authEnabled=false |
| `redirectToLogin` | boolean | true | Redirect to /login vs show modal |

#### 2.5.2 Behavior States

| State | Rendering |
|-------|-----------|
| Loading | Ant Design Spin with "Verificando autenticacao..." |
| Not required | Children (bypass protection) |
| Authenticated | Children |
| Redirecting | Spin with "Redirecionando para login..." |
| Modal fallback | Auth prompt with login button |

#### 2.5.3 Redirect Flow

When unauthenticated:
1. Saves current path to navigation state (`from`)
2. Redirects to `/login` with `replace: true`
3. After login, user returns to original path

### 2.6 Login Page

**Location**: `src/pages/LoginPage.jsx`

**Description**: Standalone login page with authentication form.

**Features**:
- Redirects to original destination after successful login
- Shows loading state while checking auth status
- Redirects away if already authenticated
- Stores return path from navigation state

### 2.7 Build Configuration

**Location**: `vite.config.js`

**Description**: Vite build tool configuration for development and production.

#### 2.7.1 Configuration

```javascript
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

#### 2.7.2 Features

| Feature | Configuration |
|---------|---------------|
| React Plugin | `@vitejs/plugin-react` for JSX/React support |
| API Proxy | Forwards `/api/*` to backend on port 8080 |
| Change Origin | Modifies host header for CORS compatibility |
| Secure | Disabled SSL verification for local dev |

### 2.8 Global Styling

#### 2.8.1 Main CSS Entry (`src/index.css`)

**Purpose**: Imports Ant Design CSS framework styles.

**Content**:
```css
import 'antd/dist/antd.css';
/* Additional root styles commented out */
```

**Note**: Contains commented-out Vite default styles for reference.

#### 2.8.2 App Container Styles (`src/App.css`)

**Purpose**: Defines root container layout.

```css
#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}
```

#### 2.8.3 SCSS Styles (`src/scss/styles.scss`)

**Purpose**: Custom application styles with Bootstrap integration.

**Features**:

**Bootstrap Integration**:
```scss
@import 'bootstrap/scss/bootstrap';
```

**Font Imports**:
```scss
@import url('https://fonts.googleapis.com/css2?family=Source+Sans+Pro&display=swap');
```

**Container Styling**:
| Class | Properties |
|-------|------------|
| `.container-fluid` | Dark background (#212121), texture pattern, full width, 50px padding |
| `.container-xl` | 120px top margin for navbar clearance |

**Navbar Styling**:
| Property | Value |
|----------|-------|
| Background | Bootstrap `$yellow-500` |
| Padding | 45px |
| Font | 'Source Sans Pro', 'Space Mono' |
| Font Size | xx-large |
| Position | Fixed, z-index 10, top: 0 |

**Icon Sizing**:
- Nav icons: 40px width
- Table icons: 20px width

**Ant Design Overrides**:
| Element | Customization |
|---------|---------------|
| `.ant-statistic-title` | Centered, 20px, color #050833 |
| `.ant-statistic-content` | Centered, 18px |
| `.ant-table-column-title` | Centered |
| `.ant-table-thead .ant-table-cell` | Centered |

---

## 3. Non-Functional Requirements

### 3.1 Performance

- React Strict Mode enabled for detecting issues early
- Lazy loading potential via React Router (not currently implemented)
- Axios interceptors for centralized error handling
- Token persistence in localStorage avoids repeated auth checks

### 3.2 Security

- JWT tokens stored in localStorage (Note: httpOnly cookies more secure)
- Authorization header automatically attached to all requests
- Automatic logout on 401/403 responses
- Protected routes enforce authentication by default

### 3.3 User Experience

- Loading indicators during auth verification
- Preserves intended destination through login flow
- Fixed navbar always accessible
- Consistent styling via Bootstrap + Ant Design

### 3.4 Development Experience

- Hot Module Replacement via Vite
- Proxy configuration eliminates CORS issues in development
- SCSS support with Bootstrap variables
- React DevTools compatible (StrictMode)

---

## 4. Technical Specifications

### 4.1 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.2.0 | UI framework |
| `react-dom` | ^18.2.0 | DOM rendering |
| `react-router-dom` | ^6.10.0 | Client-side routing |
| `axios` | ^1.3.5 | HTTP client |
| `antd` | ^5.4.2 | UI component library |
| `bootstrap` | ^5.2.3 | CSS framework |
| `vite` | ^4.2.0 | Build tool |
| `@vitejs/plugin-react` | ^3.1.0 | Vite React plugin |
| `sass` | ^1.62.0 | SCSS compilation |

### 4.2 File Structure

```
src/
  main.jsx              # Application entry point
  App.jsx               # Root component with routes
  App.css               # Root container styles
  index.css             # Ant Design CSS import
  scss/
    styles.scss         # Custom SCSS with Bootstrap
  context/
    AuthContext.jsx     # Authentication context provider
  components/
    auth/
      ProtectedRoute.jsx  # Route protection component
      LoginForm.jsx       # Login form component
      LoginModal.jsx      # Modal login component
  pages/
    LoginPage.jsx       # Login page component
vite.config.js          # Vite configuration
package.json            # Dependencies and scripts
```

### 4.3 Environment Variables

| Variable | Description | Default | Usage |
|----------|-------------|---------|-------|
| `VITE_API_URL` | Backend API base URL | '' (empty) | Prepended to all API calls |

**Behavior**:
- When empty: Uses relative URLs, Vite proxy forwards to localhost:8080
- When set: Uses absolute URL (e.g., ngrok domain for remote access)

### 4.4 NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Start development server |
| `start` | `vite` | Alias for dev |
| `build` | `vite build` | Production build |
| `preview` | `vite preview` | Preview production build |
| `test` | (placeholder) | Testing (not configured) |

---

## 5. Integration Points

### 5.1 Backend API

| Aspect | Configuration |
|--------|---------------|
| Base URL | `VITE_API_URL` environment variable |
| Dev Proxy | `/api` -> `http://localhost:8080` |
| Auth Header | `Authorization: Bearer <token>` |

### 5.2 Feature Modules

| Module | Entry Point | Route(s) |
|--------|-------------|----------|
| Order | `OrderTable.jsx` | `/`, `/orders` |
| Supplier | `SupplierTable.jsx` | `/suppliers` |
| Dashboard | `DashBoard.jsx` | `/dashboard` |
| Dashboard PO | `DashBoardPO.jsx` | `/dashboard/po` |
| Purchase Order | `PoForm.jsx` | `/po` |
| Items | `Items.jsx` | `/items` |
| Navbar | `Navbar.jsx` | (always rendered) |

---

## 6. Current State Notes

### 6.1 Active Features

- Full authentication flow with JWT
- Route protection for all business routes
- API proxy for development
- Global styling with Bootstrap + Ant Design
- Fixed navigation bar
- Redirect preservation through login

### 6.2 Security Considerations

- AuthTestPage removed from routes (security comment in code)
- Tokens stored in localStorage (consider httpOnly cookies for production)
- Automatic session cleanup on unauthorized responses

### 6.3 Known Limitations

- No 404/catch-all route defined
- No lazy loading/code splitting implemented
- Test script not configured
- No error boundary component
- No service worker/PWA support

### 6.4 Bilingual Code Notes

The codebase contains comments in both English and Portuguese:
- "Verificando autenticacao..." (Checking authentication)
- "Redirecionando para login..." (Redirecting to login)
- "Autenticacao Necessaria" (Authentication Required)
- "Sessao expirada ou nao autorizada" (Session expired or unauthorized)

---

## 7. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-22 | Reverse-engineered | Initial documentation from codebase analysis |
