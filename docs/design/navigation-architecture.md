# Navigation & Global Layout Architecture Design Document

## Document Information

| Field | Value |
|-------|-------|
| **Component Name** | Navigation & Global Layout |
| **Parent PRD** | navigation-layout.md |
| **Version** | 1.0.0 |
| **Last Updated** | 2026-01-22 |
| **Status** | Current |

---

## 1. Overview

### 1.1 Purpose

This document describes the architecture of the Navigation and Global Layout components for the JustJeeps order management frontend. These components provide the primary navigation interface, user authentication controls, and structural layout patterns used throughout the application.

### 1.2 Scope

This design document covers:
- Top-level Navbar component with logo, navigation links, and authentication controls
- Dashboard Sidebar component for secondary navigation within dashboard views
- Global layout patterns and styling conventions
- Integration with authentication context

### 1.3 Primary Files

| File Path | Responsibility |
|-----------|----------------|
| `/src/features/navbar/Navbar.jsx` | Main navigation bar component |
| `/src/features/sidebar/Sidebar.jsx` | Dashboard sidebar navigation |
| `/src/features/sidebar/sidebar.scss` | Sidebar styling |
| `/src/scss/styles.scss` | Global navbar and layout styles |
| `/src/icons.jsx` | Custom SVG icon components (Login, Logout, etc.) |

---

## 2. Component Architecture

### 2.1 Navbar Component

#### 2.1.1 Component Structure

```
Navbar
├── Logo Section (JustJeeps logo with home link)
├── Navigation Links
│   ├── Orders (/orders)
│   └── Search by SKU or Brand (/items)
└── Authentication Controls
    ├── Sign In Button (unauthenticated)
    └── User Dropdown Menu (authenticated)
        ├── Profile Info
        └── Sign Out
```

#### 2.1.2 Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| `react` | Library | useState hook for modal state |
| `react-router-dom` | Library | Link component for navigation |
| `antd` | Library | Avatar, Space, Button, Dropdown components |
| `@ant-design/icons` | Library | UserOutlined icon |
| `AuthContext` | Context | useAuth hook for authentication state |
| `LoginModal` | Component | Modal-based login form |
| `icons.jsx` | Module | Login, Logout SVG icons |

#### 2.1.3 State Management

```javascript
// Local State
const [showLoginModal, setShowLoginModal] = useState(false);

// Context State (from useAuth)
const { authEnabled, isAuthenticated, user, logout } = useAuth();
```

#### 2.1.4 Authentication Flow

1. **Auth Disabled**: No authentication controls shown
2. **Auth Enabled, Not Authenticated**: Shows "Sign In" button that opens LoginModal
3. **Auth Enabled, Authenticated**: Shows user avatar with dropdown menu containing:
   - User profile info (name, email)
   - Sign Out action

#### 2.1.5 Styling

The Navbar uses Bootstrap 5 navbar classes with custom SCSS overrides:

| Style Property | Value | Source |
|----------------|-------|--------|
| Background | `$yellow-500` (Bootstrap yellow) | `/src/scss/styles.scss` |
| Padding | 45px | `/src/scss/styles.scss` |
| Position | Fixed, z-index: 10, top: 0 | `/src/scss/styles.scss` |
| Font Family | 'Source Sans Pro', 'Space Mono' | `/src/scss/styles.scss` |
| Font Size | xx-large | `/src/scss/styles.scss` |

### 2.2 Sidebar Component

#### 2.2.1 Component Structure

```
Sidebar
└── Menu List
    ├── "MENU" Title
    ├── Orders Link (/dashboard)
    │   └── CreditCardIcon + "Orders"
    └── Products Link (/dashboard/po)
        └── StoreIcon + "Products"
```

#### 2.2.2 Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| `react-router-dom` | Library | Link component for navigation |
| `@mui/icons-material` | Library | StoreIcon, CreditCardIcon |
| `sidebar.scss` | Stylesheet | Component-specific styling |

#### 2.2.3 Usage Context

The Sidebar is used exclusively within Dashboard views:
- `/dashboard` - DashBoard component
- `/dashboard/po` - DashBoardPO component

#### 2.2.4 Layout Integration

The Sidebar implements a flex-based layout pattern:

```css
.dashboard {
  display: flex;
}

.sidebar {
  flex: 1;               /* Takes 1/9 of container width */
  min-height: 100vh;
  background-color: white;
  border-right: 0.5px solid rgb(230, 227, 227);
}

.dashboardContainer {
  flex: 8;               /* Takes 8/9 of container width */
}
```

#### 2.2.5 Styling Details

| Element | Property | Value |
|---------|----------|-------|
| Container | flex | 1 |
| Container | min-height | 100vh |
| Container | padding-left | 30px |
| Container | background-color | white |
| Menu Title | font-size | 20px |
| Menu Title | color | white |
| Menu Item | display | flex |
| Menu Item | cursor | pointer |
| Menu Item:hover | background-color | #1c058e |
| Icon | font-size | 28px |
| Icon | color | rgb(221, 219, 219) |
| Span | font-size | 25px |
| Span | color | white |

---

## 3. Data Flow

### 3.1 Authentication State Flow

```
AuthProvider (Context)
       │
       ▼
   useAuth() Hook
       │
       ├──────────────────┬───────────────────┐
       ▼                  ▼                   ▼
   Navbar.jsx       ProtectedRoute     LoginModal
       │                  │                   │
       ▼                  ▼                   ▼
 Auth Controls      Route Guarding     Login Form
```

### 3.2 Navigation Flow

```
User Click
    │
    ├─── Logo ──────────► / (Home/Orders)
    │
    ├─── Orders ────────► /orders (OrderTable)
    │
    ├─── Search ────────► /items (Items)
    │
    ├─── Dashboard ─────► /dashboard (DashBoard with Sidebar)
    │         │
    │         └─────────► /dashboard/po (DashBoardPO with Sidebar)
    │
    └─── Sign In ───────► Opens LoginModal
```

---

## 4. Interface Contracts

### 4.1 Navbar Props

The Navbar component takes no props. All state is derived from the AuthContext.

### 4.2 Sidebar Props

The Sidebar component takes no props. Navigation targets are hardcoded.

### 4.3 LoginModal Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `visible` | boolean | Yes | Controls modal visibility |
| `onCancel` | function | Yes | Callback when modal is closed |
| `onLoginSuccess` | function | No | Callback after successful login |

### 4.4 AuthContext Interface

```typescript
interface AuthContextValue {
  user: User | null;
  token: string | null;
  authEnabled: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  register: (userData: object) => Promise<RegisterResult>;
  getCurrentUser: () => Promise<void>;
}

interface User {
  firstname: string;
  lastname: string;
  email: string;
}
```

---

## 5. Error Handling

### 5.1 Authentication Errors

| Scenario | Handling |
|----------|----------|
| Login failure | Error message displayed in LoginModal via Alert component |
| Token expiration | Axios interceptor catches 401/403 and triggers logout |
| Network error | Console logged, graceful degradation to non-auth mode |

### 5.2 Navigation Errors

| Scenario | Handling |
|----------|----------|
| Invalid route | React Router handles with no-match fallback |
| Protected route access | ProtectedRoute redirects to /login |

---

## 6. Security Considerations

### 6.1 Authentication Controls

1. **Conditional Rendering**: Auth controls only render when `authEnabled` is true
2. **Token Storage**: JWT stored in localStorage (handled by AuthContext)
3. **Axios Interceptor**: Automatic token attachment and 401/403 handling

### 6.2 Navigation Security

1. **Protected Routes**: All routes except `/login` are wrapped with ProtectedRoute
2. **Redirect After Login**: Stores original destination for post-login redirect

---

## 7. Performance Considerations

### 7.1 Bundle Size Impact

| Component | Libraries Used | Estimated Impact |
|-----------|----------------|------------------|
| Navbar | Ant Design (Avatar, Dropdown, Button) | Medium |
| Sidebar | MUI Icons (2 icons) | Low |

### 7.2 Optimization Opportunities

1. **Icon Tree-Shaking**: Currently using named imports from MUI and Ant Design, which should enable tree-shaking
2. **LoginModal Lazy Loading**: Could be lazy loaded since it's conditionally rendered
3. **Fixed Position Navbar**: Causes repaints on scroll; consider using `will-change: transform`

---

## 8. Testing Considerations

### 8.1 Unit Test Scenarios

| Component | Test Case |
|-----------|-----------|
| Navbar | Renders logo and navigation links |
| Navbar | Shows Sign In button when not authenticated |
| Navbar | Shows user avatar when authenticated |
| Navbar | Opens LoginModal on Sign In click |
| Navbar | Executes logout on Sign Out click |
| Sidebar | Renders menu items with correct links |
| Sidebar | Applies hover styles |

### 8.2 Integration Test Scenarios

| Test Case | Components Involved |
|-----------|---------------------|
| Login flow via Navbar | Navbar, LoginModal, AuthContext |
| Navigation to protected route | Navbar, ProtectedRoute, AuthContext |
| Dashboard layout with sidebar | DashBoard, Sidebar |

---

## 9. Known Limitations

### 9.1 Current Limitations

1. **Mobile Responsiveness**: Navbar collapse (`navbar-collapse`) exists but hamburger menu not implemented
2. **Hardcoded Routes**: Sidebar navigation links are hardcoded, not configurable
3. **Single Language**: Portuguese strings mixed with English (e.g., "Verificando autenticacao...")
4. **No Active State**: Navigation links do not indicate current active route

### 9.2 Technical Debt

1. **Mixed Styling Approaches**: Bootstrap classes + SCSS + inline styles
2. **Icon Module Path**: Import from `../../icons` could be aliased to `@/icons`
3. **Unused Import**: `axios` imported in Navbar but not used (remnant code)

---

## 10. Future Considerations

### 10.1 Recommended Improvements

1. **Mobile Navigation**: Implement responsive hamburger menu
2. **Active Route Indication**: Add visual feedback for current route
3. **Route Configuration**: Externalize navigation items to configuration
4. **Internationalization**: Move all strings to i18n system
5. **Theme Support**: Use CSS variables or theme context for colors

### 10.2 Scalability

1. **Menu Items**: Current structure supports adding new top-level and sidebar items
2. **Role-Based Navigation**: Could extend to show/hide items based on user roles
3. **Nested Navigation**: Sidebar could be extended to support collapsible sub-menus

---

## Appendix A: File Dependencies Graph

```
Navbar.jsx
    ├── context/AuthContext.jsx
    ├── components/auth/LoginModal.jsx
    │       └── components/auth/LoginForm.jsx
    │               └── context/AuthContext.jsx
    ├── icons.jsx (Login, Logout, ImageAvatars)
    └── assets/logo_jeeps.png

Sidebar.jsx
    └── sidebar.scss

styles.scss (Global)
    └── bootstrap/scss/bootstrap
```

## Appendix B: Color Scheme

| Element | Color | Usage |
|---------|-------|-------|
| Navbar Background | Bootstrap $yellow-500 | Main navigation bar |
| User Avatar Background | #145DA0 | Authenticated user avatar |
| User Avatar Text | #D4F1F4 | Avatar initials |
| Sidebar Hover | #1c058e | Menu item hover state |
| Sidebar Icon | rgb(221, 219, 219) | Menu icons |
| Sidebar Text | white | Menu item labels |
