# Design Document: Authentication Context & Session Management

## Document Information

| Field | Value |
|-------|-------|
| Component | Authentication Context & Session Management |
| Version | 1.0 |
| Created | 2026-01-22 |
| Status | Draft |
| Parent PRD | authentication.md |

---

## 1. Overview

### 1.1 Purpose

This document describes the technical architecture of the Authentication Context and Session Management system for the JustJeeps order management frontend. The system provides centralized JWT token management, user session persistence, automatic logout on unauthorized responses, server-side auth toggle support, and axios interceptor configuration.

### 1.2 Scope

The authentication system encompasses:
- `AuthContext.jsx` - Central authentication state provider
- `ProtectedRoute.jsx` - Route protection component
- `LoginForm.jsx` - User credential input component
- `LoginModal.jsx` - Modal wrapper for login form
- `LoginPage.jsx` - Dedicated login page

### 1.3 Key Responsibilities

| Responsibility | Description |
|----------------|-------------|
| JWT Token Management | Store, retrieve, and manage JWT tokens in localStorage |
| User Session Persistence | Maintain user state across page refreshes |
| Automatic Logout | Handle 401/403 responses by clearing session and redirecting |
| Server-side Auth Toggle | Support enabling/disabling authentication from backend |
| Axios Interceptor Setup | Configure global request/response interceptors |
| Route Protection | Guard sensitive routes from unauthenticated access |

---

## 2. Architecture

### 2.1 Component Hierarchy

```
App.jsx
└── AuthProvider (wraps entire app)
    ├── Navbar
    └── Routes
        ├── LoginPage (public)
        └── ProtectedRoute (wraps protected routes)
            ├── OrderTable
            ├── SupplierTable
            ├── DashBoard
            ├── DashBoardPO
            ├── PoForm
            └── Items
```

### 2.2 File Structure

```
src/
├── context/
│   └── AuthContext.jsx          # Main auth context provider & hook
├── components/
│   └── auth/
│       ├── ProtectedRoute.jsx   # Route guard component
│       ├── LoginForm.jsx        # Login form UI
│       └── LoginModal.jsx       # Modal wrapper for login
└── pages/
    └── LoginPage.jsx            # Dedicated login page
```

### 2.3 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Application                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    AuthProvider                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Context State:                                      │  │  │
│  │  │  - user: Object | null                               │  │  │
│  │  │  - token: string | null                              │  │  │
│  │  │  - authEnabled: boolean                              │  │  │
│  │  │  - loading: boolean                                  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                           │                                │  │
│  │  ┌────────────────────────┼────────────────────────────┐  │  │
│  │  │                        ▼                             │  │  │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │  │  │
│  │  │  │ Axios       │  │ localStorage│  │ Response   │  │  │  │
│  │  │  │ Interceptor │  │ Persistence │  │ Interceptor│  │  │  │
│  │  │  └──────┬──────┘  └──────┬──────┘  └──────┬─────┘  │  │  │
│  │  └─────────┼────────────────┼────────────────┼────────┘  │  │
│  │            │                │                │            │  │
│  └────────────┼────────────────┼────────────────┼────────────┘  │
│               │                │                │                │
│               ▼                ▼                ▼                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    ProtectedRoute                          │ │
│  │  - Checks isAuthenticated                                  │ │
│  │  - Redirects to /login or shows LoginModal                 │ │
│  │  - Displays loading spinner during auth check              │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API (Port 8080)                     │
├─────────────────────────────────────────────────────────────────┤
│  /api/auth/status  - Check if auth is enabled                   │
│  /api/auth/login   - Authenticate user, return JWT              │
│  /api/auth/logout  - Invalidate session                         │
│  /api/auth/me      - Get current user from token                │
│  /api/auth/register - Register new user                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. State Management

### 3.1 AuthContext State

| State Variable | Type | Default | Description |
|---------------|------|---------|-------------|
| `user` | `Object \| null` | `null` | Current authenticated user object |
| `token` | `string \| null` | `localStorage.getItem('authToken')` | JWT authentication token |
| `loading` | `boolean` | `true` | Auth status check in progress |
| `authEnabled` | `boolean` | `false` | Server-side auth toggle status |

### 3.2 Ref Variables

| Ref | Type | Purpose |
|-----|------|---------|
| `isLoggingOut` | `boolean` | Prevents multiple simultaneous logout operations |

### 3.3 Context Value (Exposed API)

```javascript
{
  user,                    // Current user object
  token,                   // JWT token
  authEnabled,             // Server auth toggle
  loading,                 // Loading state
  login,                   // Login function
  logout,                  // Logout function
  register,                // Registration function
  getCurrentUser,          // Refresh user data
  isAuthenticated: !!user  // Computed auth status
}
```

### 3.4 ProtectedRoute State

| State Variable | Type | Default | Description |
|---------------|------|---------|-------------|
| `showLoginModal` | `boolean` | `false` | Controls login modal visibility |

---

## 4. Data Flow

### 4.1 Application Initialization Flow

```
┌──────────────────┐
│   App Mounts     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ AuthProvider     │
│ initialized      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│ Read token from  │     │ Setup axios      │
│ localStorage     │     │ interceptors     │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         └────────┬───────────────┘
                  ▼
         ┌──────────────────┐
         │ checkAuthStatus()│
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ GET /api/auth/   │
         │ status           │
         └────────┬─────────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
┌──────────────────┐ ┌──────────────────┐
│ authEnabled=true │ │ authEnabled=false│
│ + has token      │ │ (auth disabled)  │
└────────┬─────────┘ └────────┬─────────┘
         │                    │
         ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│ GET /api/auth/me │  │ loading=false    │
│ verify token     │  │ (skip auth)      │
└────────┬─────────┘  └──────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Success│ │Failure│
│setUser│ │logout │
└───────┘ └───────┘
```

### 4.2 Login Flow

```
┌──────────────────┐
│  User enters     │
│  credentials     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  LoginForm       │
│  calls login()   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  POST /api/auth/ │
│  login           │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────────┐
│Success│ │  Failure  │
└───┬───┘ └─────┬─────┘
    │           │
    ▼           ▼
┌───────────────┐ ┌───────────────┐
│ setToken()    │ │ Return error  │
│ setUser()     │ │ message       │
│ localStorage  │ └───────────────┘
│ axios headers │
└───────┬───────┘
        │
        ▼
┌───────────────────┐
│ Navigate to       │
│ original route    │
└───────────────────┘
```

### 4.3 Automatic Logout Flow (401/403)

```
┌──────────────────┐
│  API Request     │
│  returns 401/403 │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Response        │
│  Interceptor     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Check           │
│  isLoggingOut    │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────────┐
│ false │ │   true    │
└───┬───┘ │  (skip)   │
    │     └───────────┘
    ▼
┌──────────────────┐
│handleUnauthorized│
│ - setToken(null) │
│ - setUser(null)  │
│ - clear storage  │
│ - clear headers  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Redirect to     │
│  /login          │
└──────────────────┘
```

### 4.4 Route Protection Flow

```
┌──────────────────┐
│  User navigates  │
│  to protected    │
│  route           │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  ProtectedRoute  │
│  component       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Check loading   │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────────┐
│ true  │ │  false    │
│ Show  │ └─────┬─────┘
│Spinner│       │
└───────┘       ▼
         ┌──────────────────┐
         │shouldRequireAuth?│
         └────────┬─────────┘
                  │
             ┌────┴────┐
             │         │
             ▼         ▼
        ┌───────┐ ┌───────────┐
        │ true  │ │  false    │
        └───┬───┘ │  Render   │
            │     │ children  │
            ▼     └───────────┘
     ┌──────────────────┐
     │ isAuthenticated? │
     └────────┬─────────┘
              │
         ┌────┴────┐
         │         │
         ▼         ▼
    ┌───────┐ ┌───────────────┐
    │ true  │ │    false      │
    │Render │ │ Redirect to   │
    │content│ │ /login with   │
    └───────┘ │ return path   │
              └───────────────┘
```

---

## 5. Key Functions

### 5.1 AuthContext Functions

#### `checkAuthStatus()`
Checks server authentication configuration on app load.

```javascript
// Behavior:
// 1. GET /api/auth/status to check if auth is enabled
// 2. If authEnabled && token exists, verify token via getCurrentUser()
// 3. Sets authEnabled state based on server response
// 4. Always sets loading=false when complete
```

#### `login(username, password)`
Authenticates user with credentials.

| Parameter | Type | Description |
|-----------|------|-------------|
| `username` | `string` | User's username or email |
| `password` | `string` | User's password |

| Return | Type | Description |
|--------|------|-------------|
| `success` | `boolean` | Whether login succeeded |
| `user` | `Object` | User object (on success) |
| `message` | `string` | Error message (on failure) |

#### `logout()`
Clears user session and notifies backend.

```javascript
// Behavior:
// 1. POST /api/auth/logout (fire and forget)
// 2. setToken(null)
// 3. setUser(null)
// 4. localStorage.removeItem('authToken')
```

#### `handleUnauthorized()`
Handles 401/403 responses from any API call.

```javascript
// Behavior:
// 1. Check isLoggingOut ref to prevent multiple calls
// 2. Clear all auth state
// 3. Remove localStorage token
// 4. Delete axios Authorization header
// 5. Redirect to /login if not already there
```

#### `getCurrentUser()`
Fetches current user data using stored token.

```javascript
// Behavior:
// 1. GET /api/auth/me
// 2. On success: setUser(response.data.user)
// 3. On failure: logout() to clear invalid token
```

#### `register(userData)`
Registers a new user account.

| Parameter | Type | Description |
|-----------|------|-------------|
| `userData` | `Object` | Registration data |

| Return | Type | Description |
|--------|------|-------------|
| `success` | `boolean` | Whether registration succeeded |
| `user` | `Object` | User object (on success) |
| `message` | `string` | Error message (on failure) |

### 5.2 useAuth Hook

Custom hook providing access to auth context.

```javascript
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

---

## 6. Dependencies

### 6.1 External Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.x | Core React library |
| `react-router-dom` | ^6.x | Routing and navigation |
| `axios` | ^1.x | HTTP client |
| `antd` | ^5.x | UI components (Spin, Modal, Form, etc.) |

### 6.2 Internal Dependencies

| Component | Depends On |
|-----------|------------|
| `ProtectedRoute` | `AuthContext`, `LoginModal` |
| `LoginForm` | `AuthContext` |
| `LoginModal` | `AuthContext`, `LoginForm` |
| `LoginPage` | `AuthContext`, `LoginForm` |
| `App` | `AuthProvider`, `ProtectedRoute` |

### 6.3 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/status` | GET | Check if auth is enabled server-side |
| `/api/auth/login` | POST | Authenticate user |
| `/api/auth/logout` | POST | End user session |
| `/api/auth/me` | GET | Get current user from token |
| `/api/auth/register` | POST | Register new user |

---

## 7. Error Handling

### 7.1 Error Scenarios

| Scenario | Handler | User Impact |
|----------|---------|-------------|
| Auth status check fails | `catch` in `checkAuthStatus` | `authEnabled` set to false, continues without auth |
| Invalid token on startup | `getCurrentUser` catches error | Calls `logout()`, user must re-authenticate |
| Login credentials invalid | Returns `{success: false, message}` | Error message displayed in form |
| Network error on login | Returns generic error message | "An unexpected error occurred" displayed |
| 401/403 on any request | Response interceptor | Automatic logout and redirect to login |
| Multiple simultaneous logouts | `isLoggingOut` ref guard | Only first logout executes |

### 7.2 Error Response Format

```javascript
// Login/Register error response
{
  success: false,
  message: "Invalid credentials" | "Registration failed" | custom message
}
```

### 7.3 Console Logging

| Event | Log Level | Message |
|-------|-----------|---------|
| Auth status check failure | `error` | "Auth status check failed:" |
| Get current user failure | `error` | "Get current user failed:" |
| Logout request failure | `error` | "Logout request failed:" |
| Session expired | `warn` | "Sessao expirada ou nao autorizada..." |

---

## 8. Security Considerations

### 8.1 Token Storage

| Aspect | Implementation | Risk Level |
|--------|---------------|------------|
| Storage Location | `localStorage` | Medium - vulnerable to XSS |
| Token Format | JWT Bearer token | Standard |
| Token Persistence | Survives page refresh | Intended behavior |

**Recommendation**: Consider `httpOnly` cookies for production environments to mitigate XSS risks.

### 8.2 Token Transmission

| Aspect | Implementation |
|--------|---------------|
| Header Format | `Authorization: Bearer {token}` |
| Automatic Inclusion | Via axios defaults |
| HTTPS | Required in production (Vite proxy for dev) |

### 8.3 Session Invalidation

| Trigger | Action |
|---------|--------|
| Manual logout | Clear local state + notify backend |
| 401 response | Clear local state + redirect |
| 403 response | Clear local state + redirect |
| Token expiry | Server returns 401, triggers auto-logout |

### 8.4 Race Condition Protection

The `isLoggingOut` ref prevents multiple simultaneous logout operations that could occur when:
- Multiple API calls fail with 401 simultaneously
- User clicks logout while another request is in flight

### 8.5 Security Best Practices Implemented

1. **Context Boundary Validation**: `useAuth` throws if used outside `AuthProvider`
2. **Automatic Session Cleanup**: 401/403 triggers complete state reset
3. **Protected Route Guards**: Routes are protected by default
4. **No Credentials in URL**: POST body for authentication
5. **Token Cleanup on Logout**: Both local and axios header cleanup

### 8.6 Security Recommendations for Improvement

| Recommendation | Priority | Description |
|----------------|----------|-------------|
| Migrate to httpOnly cookies | High | Prevent XSS token theft |
| Add CSRF protection | High | If moving to cookies |
| Implement token refresh | Medium | Extend sessions without re-login |
| Add rate limiting | Medium | Server-side login attempt limiting |
| Session timeout warning | Low | Notify users before auto-logout |

---

## 9. Configuration

### 9.1 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `''` (empty) | Backend API base URL |

### 9.2 Vite Proxy Configuration

```javascript
// vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
      secure: false,
    },
  },
}
```

When `VITE_API_URL` is empty, relative URLs (`/api/...`) are used, allowing the Vite dev server proxy to forward requests to the backend on `localhost:8080`.

---

## 10. Component API Reference

### 10.1 ProtectedRoute Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Content to render when authenticated |
| `fallback` | `ReactNode` | `null` | Alternative content when not authenticated |
| `requireAuth` | `boolean` | `true` | Force auth even when `authEnabled=false` |
| `redirectToLogin` | `boolean` | `true` | Redirect vs show modal on unauthorized |

### 10.2 LoginForm Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onLoginSuccess` | `(user) => void` | No | Callback after successful login |
| `onCancel` | `() => void` | No | Cancel button handler |

### 10.3 LoginModal Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `visible` | `boolean` | Yes | Modal visibility state |
| `onCancel` | `() => void` | Yes | Close modal handler |
| `onLoginSuccess` | `(user) => void` | No | Success callback |

---

## 11. Known Issues

### 11.1 Current Limitations

| Issue | Impact | Workaround |
|-------|--------|------------|
| localStorage token storage | XSS vulnerability | Deploy with strict CSP headers |
| No token refresh mechanism | Users must re-login on token expiry | Extend token lifetime server-side |
| Hard redirect on 401 | Loses current form state | Users must re-enter data |
| No offline support | App unusable without network | N/A for admin tool |

### 11.2 Technical Debt

| Item | Description | Priority |
|------|-------------|----------|
| Mixed language comments | Portuguese and English comments | Low |
| No TypeScript | Missing type definitions | Medium |
| No unit tests | Auth logic untested | High |
| Inline styles in ProtectedRoute | Should use CSS modules | Low |

### 11.3 Browser Compatibility Notes

- Uses `localStorage` - requires modern browser
- Uses React 18 features
- Tested in Chrome, Firefox, Safari, Edge

---

## 12. Testing Considerations

### 12.1 Unit Test Scenarios

| Component | Test Case |
|-----------|-----------|
| AuthContext | Initial state loads token from localStorage |
| AuthContext | Login success sets user and token |
| AuthContext | Login failure returns error message |
| AuthContext | Logout clears all state |
| AuthContext | 401 response triggers handleUnauthorized |
| ProtectedRoute | Renders children when authenticated |
| ProtectedRoute | Redirects to login when not authenticated |
| ProtectedRoute | Shows loading spinner during auth check |

### 12.2 Integration Test Scenarios

| Scenario | Steps |
|----------|-------|
| Full login flow | Enter credentials -> Submit -> Redirect to protected route |
| Session persistence | Login -> Refresh page -> Remain logged in |
| Session expiry | Login -> Wait for token expiry -> Auto-redirect to login |
| Protected route guard | Navigate to /dashboard without auth -> Redirect to /login |

---

## 13. Appendix

### 13.1 Related Files

| File | Path |
|------|------|
| AuthContext | `/src/context/AuthContext.jsx` |
| ProtectedRoute | `/src/components/auth/ProtectedRoute.jsx` |
| LoginForm | `/src/components/auth/LoginForm.jsx` |
| LoginModal | `/src/components/auth/LoginModal.jsx` |
| LoginPage | `/src/pages/LoginPage.jsx` |
| App | `/src/App.jsx` |
| Vite Config | `/vite.config.js` |

### 13.2 Glossary

| Term | Definition |
|------|------------|
| JWT | JSON Web Token - compact, URL-safe token format |
| Bearer Token | Authentication scheme using "Bearer" prefix |
| Interceptor | Axios middleware for request/response handling |
| Context | React pattern for sharing state across components |
| Protected Route | Route requiring authentication to access |

### 13.3 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-22 | Claude | Initial document |
