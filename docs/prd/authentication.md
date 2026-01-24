# PRD: Authentication & Authorization Module

## Overview

The Authentication & Authorization module provides a complete user authentication system for the JustJeeps order management frontend application. It manages user login/logout flows, session management through JWT tokens, protected route access control, and provides a flexible authentication context that can be toggled server-side.

## Problem Statement

The JustJeeps order management system requires secure access control to protect sensitive business data including orders, suppliers, purchase orders, and product information. The system needs to:

1. Prevent unauthorized access to business-critical data and operations
2. Provide a seamless login experience without disrupting user workflow
3. Support server-side configuration to enable/disable authentication
4. Handle session expiration and token invalidation gracefully
5. Maintain user state across page refreshes and browser sessions

## User Stories

### US-1: User Authentication
- As a user, I want to log in with my username/email and password so that I can access the order management system.

### US-2: Session Persistence
- As a user, I want my login session to persist across browser refreshes so that I don't have to log in repeatedly.

### US-3: Protected Access
- As a system administrator, I want certain routes to require authentication so that sensitive data is protected from unauthorized access.

### US-4: Session Expiration Handling
- As a user, I want to be automatically redirected to login when my session expires so that I understand why I can't access content.

### US-5: User Profile Display
- As a user, I want to see my identity (name/avatar) in the navigation bar so that I know I'm logged in with the correct account.

### US-6: Logout Capability
- As a user, I want to be able to sign out so that I can secure my session when I'm done working.

### US-7: Server-Side Auth Toggle
- As a system administrator, I want to be able to enable/disable authentication server-side so that I can run the system in different security modes.

## Functional Requirements

### FR-1: Authentication Context Provider
**Description**: A React Context that provides authentication state and methods to the entire application.

**Acceptance Criteria**:
- [x] Provides `user` object containing current user data (id, username, email, firstname, lastname)
- [x] Provides `token` for API authorization
- [x] Provides `authEnabled` boolean indicating if server has authentication enabled
- [x] Provides `loading` state for async operations
- [x] Provides `isAuthenticated` computed boolean
- [x] Provides `login(username, password)` method
- [x] Provides `logout()` method
- [x] Provides `register(userData)` method
- [x] Provides `getCurrentUser()` method
- [x] Throws error if `useAuth()` is used outside of `AuthProvider`

### FR-2: Login Flow
**Description**: Username/password-based authentication flow with form validation and error handling.

**Acceptance Criteria**:
- [x] Login form accepts username or email
- [x] Login form accepts password
- [x] Form validation requires both fields
- [x] Loading state displayed during authentication
- [x] Error messages displayed for failed login attempts
- [x] Successful login stores JWT token in localStorage
- [x] Successful login sets Authorization header on axios
- [x] Successful login redirects to original destination or home

### FR-3: Protected Route Component
**Description**: Higher-order component that restricts access to authenticated users only.

**Acceptance Criteria**:
- [x] Shows loading spinner while checking authentication status
- [x] Renders children if user is authenticated
- [x] Redirects to `/login` if user is not authenticated (default behavior)
- [x] Preserves original destination URL for post-login redirect
- [x] Supports `requireAuth` prop to force authentication even when `authEnabled=false`
- [x] Supports `redirectToLogin` prop (true by default)
- [x] Supports `fallback` prop for alternative unauthenticated content
- [x] Shows login modal option when `redirectToLogin=false`

### FR-4: Session Management
**Description**: Automatic session handling including token persistence and expiration detection.

**Acceptance Criteria**:
- [x] JWT token persisted in localStorage as `authToken`
- [x] Token automatically restored on app load
- [x] Authorization header set automatically on all axios requests
- [x] 401/403 responses trigger automatic logout
- [x] Automatic redirect to login on session expiration
- [x] Prevents multiple simultaneous logout operations (mutex via ref)

### FR-5: Server-Side Auth Status
**Description**: Check server configuration to determine if authentication is enabled.

**Acceptance Criteria**:
- [x] On app load, checks `/api/auth/status` endpoint
- [x] Sets `authEnabled` state based on server response
- [x] If auth is disabled, protected routes may render without authentication
- [x] Navigation bar conditionally shows login controls based on `authEnabled`

### FR-6: Login Modal
**Description**: Modal dialog for authentication that can be triggered from anywhere in the app.

**Acceptance Criteria**:
- [x] Renders as Ant Design Modal
- [x] Contains LoginForm component
- [x] Only renders when `authEnabled` is true
- [x] Closes on successful login
- [x] Closes on cancel
- [x] Centered positioning with 450px width

### FR-7: Navigation Bar Integration
**Description**: User authentication controls integrated into the main navigation.

**Acceptance Criteria**:
- [x] Shows "Sign In" button when not authenticated and auth is enabled
- [x] Shows user avatar with initials when authenticated
- [x] Shows user first name next to avatar
- [x] Dropdown menu shows full name and email
- [x] Dropdown includes "Sign Out" option
- [x] Auth controls hidden when `authEnabled` is false

## Non-Functional Requirements

### NFR-1: Security
- JWT tokens stored in localStorage (client-side only)
- Authorization header automatically added to all API requests
- Automatic token cleanup on logout or session expiration
- No sensitive data exposed in error messages

### NFR-2: Performance
- Authentication status check happens once on app initialization
- Token validation only performed when `authEnabled` is true
- Minimal re-renders through React Context optimization

### NFR-3: User Experience
- Loading states shown during all async operations
- Smooth redirect flow preserving intended destination
- Visual feedback for authentication state in navbar
- Closable error alerts in login form

### NFR-4: Internationalization
- Some UI text in Portuguese (loading messages, protected route prompts)
- Form labels and buttons in English
- Mixed language support in current implementation

### NFR-5: Accessibility
- Form inputs have proper labels and placeholders
- Ant Design components provide built-in accessibility
- Avatar shows user initials as fallback

## Technical Implementation

### Architecture

The authentication module follows a layered architecture pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  LoginForm  │  │  LoginModal  │  │  Navbar (Auth UI)   │ │
│  └─────────────┘  └──────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Route Protection Layer                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   ProtectedRoute                      │   │
│  │  - Authentication check                               │   │
│  │  - Redirect logic                                     │   │
│  │  - Fallback rendering                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     State Management Layer                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    AuthContext                        │   │
│  │  - User state                                         │   │
│  │  - Token management                                   │   │
│  │  - Auth methods (login, logout, register)             │   │
│  │  - Axios interceptors                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Persistence Layer                   │
│  ┌─────────────────────┐  ┌────────────────────────────┐   │
│  │     localStorage    │  │       Backend API          │   │
│  │  (authToken)        │  │  (/api/auth/*)             │   │
│  └─────────────────────┘  └────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
App.jsx
└── AuthProvider (Context Provider)
    ├── Navbar
    │   ├── LoginModal
    │   │   └── LoginForm
    │   └── User Dropdown (when authenticated)
    └── Routes
        ├── LoginPage (public)
        │   └── LoginForm
        └── ProtectedRoute (wrapper for protected pages)
            └── [Protected Content]
```

### Data Flow

#### Login Flow
```
1. User enters credentials in LoginForm
2. onFinish handler calls login(username, password)
3. AuthContext.login() sends POST to /api/auth/login
4. On success:
   - Token stored in state and localStorage
   - User object stored in state
   - Axios default header set
   - Success callback triggers navigation
5. On failure:
   - Error message displayed in form
```

#### Session Restoration Flow
```
1. App loads, AuthProvider mounts
2. Token read from localStorage (initial state)
3. checkAuthStatus() called on mount
4. GET /api/auth/status to check if auth is enabled
5. If auth enabled and token exists:
   - getCurrentUser() validates token via GET /api/auth/me
   - User data stored in state
6. If token invalid:
   - logout() called to clean up
```

#### Automatic Logout Flow
```
1. Any API request returns 401 or 403
2. Axios response interceptor catches error
3. handleUnauthorized() called (with mutex check)
4. Token and user cleared from state
5. localStorage cleared
6. Axios header removed
7. Redirect to /login
```

### API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/status` | GET | Check if authentication is enabled server-side |
| `/api/auth/login` | POST | Authenticate user with username/password |
| `/api/auth/logout` | POST | Invalidate current session |
| `/api/auth/me` | GET | Get current authenticated user details |
| `/api/auth/register` | POST | Register new user (method exists, usage unclear) |

### Request/Response Formats

#### Login Request
```json
POST /api/auth/login
{
  "username": "string",
  "password": "string"
}
```

#### Login Response (Success)
```json
{
  "token": "jwt-token-string",
  "user": {
    "id": "number",
    "username": "string",
    "email": "string",
    "firstname": "string",
    "lastname": "string"
  }
}
```

#### Auth Status Response
```json
GET /api/auth/status
{
  "authEnabled": true
}
```

#### Current User Response
```json
GET /api/auth/me
{
  "user": {
    "id": "number",
    "username": "string",
    "email": "string",
    "firstname": "string",
    "lastname": "string"
  }
}
```

### State Management

**Context State**:
| State Variable | Type | Description |
|----------------|------|-------------|
| `user` | Object \| null | Current authenticated user data |
| `token` | String \| null | JWT token for API authorization |
| `loading` | Boolean | True during initial auth check |
| `authEnabled` | Boolean | Whether server has auth enabled |

**Computed Values**:
| Value | Derivation |
|-------|------------|
| `isAuthenticated` | `!!user` |

**Local Storage**:
| Key | Value |
|-----|-------|
| `authToken` | JWT token string |

### File Structure

```
src/
├── context/
│   └── AuthContext.jsx          # Main auth provider and useAuth hook
├── components/
│   └── auth/
│       ├── LoginForm.jsx        # Reusable login form component
│       ├── LoginModal.jsx       # Modal wrapper for LoginForm
│       ├── ProtectedRoute.jsx   # HOC for route protection
│       └── Login.jsx            # Empty file (unused)
├── pages/
│   └── LoginPage.jsx            # Dedicated login page
└── features/
    └── navbar/
        └── Navbar.jsx           # Contains auth UI integration
```

## Dependencies

### Internal Dependencies
- React Router v6 (`useNavigate`, `useLocation`, `Navigate`)
- Ant Design (`Form`, `Input`, `Button`, `Alert`, `Card`, `Modal`, `Avatar`, `Dropdown`, `Space`, `Spin`)
- Ant Design Icons (`UserOutlined`, `LockOutlined`)
- Custom Icons (`Login`, `Logout` from `src/icons.jsx`)

### External Dependencies
- React 18+ (hooks: `useState`, `useEffect`, `useContext`, `useCallback`, `useRef`, `createContext`)
- Axios (HTTP client with interceptor support)

### Backend Dependencies
- Express server with authentication endpoints
- JWT token generation and validation
- `ENABLE_AUTH` environment variable for server-side toggle

## Current Limitations

### L-1: Token Storage Security
**Issue**: JWT tokens are stored in localStorage, which is vulnerable to XSS attacks.
**Impact**: Medium - A successful XSS attack could steal the authentication token.
**Recommendation**: Consider using httpOnly cookies for token storage.

### L-2: No Token Refresh Mechanism
**Issue**: There is no automatic token refresh before expiration.
**Impact**: Low - Users will be logged out when token expires and must re-authenticate.
**Recommendation**: Implement refresh token flow for seamless session extension.

### L-3: Empty Login.jsx Component
**Issue**: The `src/components/auth/Login.jsx` file is empty/unused.
**Impact**: Minimal - Dead code that should be removed.
**Recommendation**: Remove unused file to reduce codebase clutter.

### L-4: Mixed Language UI
**Issue**: Some UI elements are in Portuguese, others in English.
**Impact**: Low - Inconsistent user experience.
**Recommendation**: Implement proper i18n solution.

### L-5: AuthTestPage Still in Codebase
**Issue**: `AuthTestPage.jsx` exists but is not routed (commented out in App.jsx).
**Impact**: Minimal - Dead code with potential security concerns if accidentally exposed.
**Recommendation**: Remove or properly secure the test page.

### L-6: No Remember Me Feature
**Issue**: No option for users to stay logged in for extended periods.
**Impact**: Low - Users must log in each session based on token expiration.
**Recommendation**: Add "Remember Me" checkbox with extended token lifetime.

### L-7: No Password Recovery
**Issue**: No "Forgot Password" flow implemented.
**Impact**: Medium - Users have no self-service password reset.
**Recommendation**: Implement password reset via email.

### L-8: Registration Method Unused
**Issue**: `register()` method exists in AuthContext but has no UI component.
**Impact**: Low - Feature exists but is not accessible to users.
**Recommendation**: Either implement registration UI or remove unused method.

### L-9: No Role-Based Access Control
**Issue**: All authenticated users have same access level.
**Impact**: Medium - Cannot restrict features to admin users.
**Recommendation**: Implement RBAC with user roles and permission checks.

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | Current | Initial implementation with basic authentication flow |

---

*This PRD was reverse-engineered from the existing codebase to document the current implementation state.*
