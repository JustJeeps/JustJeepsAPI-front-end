# PRD: Navigation & Layout Module

## Overview

The Navigation & Layout module provides the application-wide navigation structure for the JustJeeps order management frontend. It consists of two primary components: a top-level Navbar for global navigation and authentication controls, and a Sidebar for dashboard-specific navigation. Together, these components establish the visual hierarchy and navigation patterns used throughout the application.

## Problem Statement

The JustJeeps order management system requires a consistent navigation structure that:

1. Provides quick access to main application features (Orders, Items search)
2. Displays the company brand identity through logo placement
3. Integrates authentication controls seamlessly into the user interface
4. Offers secondary navigation within dashboard views
5. Supports responsive layout patterns for different screen sizes

## User Stories

### US-1: Global Navigation Access
- As a user, I want a persistent navigation bar at the top of every page so that I can quickly access any section of the application.

### US-2: Brand Identity
- As a user, I want to see the JustJeeps logo in the navigation so that I know I'm using the official order management system.

### US-3: Quick Order Access
- As a user, I want a direct link to the Orders section so that I can quickly view and manage orders.

### US-4: Product Search Access
- As a user, I want a link to search products by SKU or Brand so that I can find product information efficiently.

### US-5: Authentication Awareness
- As a user, I want to see my login status and profile in the navigation bar so that I know who I'm logged in as.

### US-6: Dashboard Sub-Navigation
- As a user, I want a sidebar menu when viewing dashboards so that I can switch between different dashboard views.

### US-7: Sign In/Out Capability
- As a user, I want login and logout controls in the navigation so that I can manage my session without leaving my current context.

## Functional Requirements

### FR-1: Top Navigation Bar (Navbar)
**Description**: A responsive navigation bar that appears at the top of all pages, providing global navigation links and authentication controls.

**Acceptance Criteria**:
- [x] Renders as a Bootstrap-styled navbar with expand-lg behavior
- [x] Displays JustJeeps logo on the left side as a clickable link to home
- [x] Logo links to the root path (`/`)
- [x] Navigation items styled with fs-5 font size and mx-4 horizontal margins
- [x] "Orders" link navigates to `/orders`
- [x] "Search by SKU or Brand" link navigates to `/items`
- [x] Navigation items display with active state styling
- [x] Uses container class for centered, max-width content

### FR-2: Authentication Controls in Navbar
**Description**: Conditional rendering of authentication-related UI elements based on auth status.

**Acceptance Criteria**:
- [x] Authentication controls only display when `authEnabled` is true
- [x] When not authenticated: Shows "Sign In" button with Login icon
- [x] Sign In button opens LoginModal component
- [x] When authenticated: Shows user avatar with initials
- [x] Avatar displays with blue background (#145DA0) and light text (#D4F1F4)
- [x] User's first name displayed next to avatar
- [x] Clicking avatar/name area opens dropdown menu
- [x] Dropdown positioned at bottom-right of trigger element

### FR-3: User Dropdown Menu
**Description**: A dropdown menu that appears when clicking on the authenticated user's avatar area.

**Acceptance Criteria**:
- [x] First menu item displays user's full name (bold)
- [x] First menu item displays user's email (small text below name)
- [x] Divider separates profile info from actions
- [x] "Sign Out" menu item with Logout icon
- [x] Clicking "Sign Out" triggers logout function
- [x] Dropdown uses Ant Design Dropdown component

### FR-4: Login Modal Integration
**Description**: Modal dialog for authentication triggered from the navbar.

**Acceptance Criteria**:
- [x] LoginModal component rendered within Navbar
- [x] Modal visibility controlled by local state (`showLoginModal`)
- [x] Modal closes on cancel action
- [x] Modal closes on successful login
- [x] Modal only functional when authEnabled is true

### FR-5: Dashboard Sidebar Navigation
**Description**: A vertical sidebar that appears on dashboard pages, providing navigation between dashboard views.

**Acceptance Criteria**:
- [x] Displays on left side of dashboard layouts
- [x] Contains "MENU" title header
- [x] "Orders" link with CreditCardIcon navigates to `/dashboard`
- [x] "Products" link with StoreIcon navigates to `/dashboard/po`
- [x] Uses React Router Link components for navigation
- [x] Full viewport height (min-height: 100vh)
- [x] White background with right border

### FR-6: Sidebar Visual Design
**Description**: Styling specifications for the sidebar component.

**Acceptance Criteria**:
- [x] Flex: 1 for flexible width
- [x] 0.5px right border in light gray (#e6e3e3)
- [x] 30px left padding
- [x] Title styled with 20px font, bold weight, white color
- [x] List items display as flex row with centered alignment
- [x] Icons sized at 28px with light gray color (#dddbd9)
- [x] Item text 25px, bold (600), white color
- [x] 10px left margin on text
- [x] Hover state: dark purple background (#1c058e)

## Non-Functional Requirements

### NFR-1: Responsive Design
- Navbar uses Bootstrap's navbar-expand-lg for responsive collapsing
- Sidebar uses flex layout for consistent sizing
- Container classes provide responsive width constraints

### NFR-2: Visual Consistency
- Navigation uses consistent spacing (mx-4 margins)
- Font sizes standardized (fs-5 for nav items)
- Color scheme follows brand guidelines (blue #145DA0, accent colors)

### NFR-3: Accessibility
- Navigation links have proper aria attributes
- Logo image has alt text
- Ant Design components provide built-in accessibility features
- Interactive elements are keyboard accessible

### NFR-4: Performance
- Navigation components render on every page without re-fetching
- Authentication state accessed via context (no redundant API calls)
- Icons loaded as component imports (SVG inline)

### NFR-5: User Experience
- Dropdown trigger includes visual cursor indicator
- Active navigation states clearly visible
- Smooth modal transitions via Ant Design
- Hover states provide visual feedback

## Technical Implementation

### Architecture

The Navigation & Layout module follows a component-based architecture integrated with React Router:

```
+---------------------------------------------------------------+
|                        App.jsx                                 |
|  +----------------------------------------------------------+ |
|  |                    AuthProvider                           | |
|  |  +-----------------------------------------------------+  | |
|  |  |                    Navbar                           |  | |
|  |  |  [Logo] [Orders] [Search by SKU or Brand]   [Auth]  |  | |
|  |  +-----------------------------------------------------+  | |
|  |                           |                               | |
|  |                      <Routes>                             | |
|  |                           |                               | |
|  |    +------------------+   |   +------------------------+  | |
|  |    | Dashboard Views  |   |   | Non-Dashboard Views    |  | |
|  |    | +-------------+  |   |   | (OrderTable, Items,    |  | |
|  |    | | Sidebar     |  |   |   |  Suppliers, etc.)      |  | |
|  |    | +-------------+  |   |   +------------------------+  | |
|  |    | | Content     |  |   |                               | |
|  |    | +-------------+  |   |                               | |
|  |    +------------------+   |                               | |
|  +----------------------------------------------------------+ |
+---------------------------------------------------------------+
```

### Component Hierarchy

```
App.jsx
└── AuthProvider
    ├── Navbar (global, always rendered)
    │   ├── Logo (Link to /)
    │   ├── Navigation Links
    │   │   ├── Orders (Link to /orders)
    │   │   └── Search by SKU or Brand (Link to /items)
    │   ├── Auth Controls (conditional on authEnabled)
    │   │   ├── Sign In Button (when !isAuthenticated)
    │   │   └── User Dropdown (when isAuthenticated)
    │   │       ├── Profile Info
    │   │       └── Sign Out Action
    │   └── LoginModal
    │       └── LoginForm
    └── Routes
        ├── Dashboard (/dashboard)
        │   └── DashBoard
        │       ├── Sidebar
        │       │   ├── Orders Link (/dashboard)
        │       │   └── Products Link (/dashboard/po)
        │       └── DashboardContainer (content)
        └── DashBoardPO (/dashboard/po)
            ├── Sidebar
            └── DashboardContainer (content)
```

### Data Flow

#### Navigation State Flow
```
1. User clicks navigation link
2. React Router updates URL
3. Routes component matches new path
4. Target component renders
5. (Navbar persists, no re-render needed)
```

#### Authentication Display Flow
```
1. AuthContext provides: authEnabled, isAuthenticated, user
2. Navbar consumes context via useAuth() hook
3. Conditional rendering based on auth state:
   - authEnabled=false: No auth UI shown
   - authEnabled=true, !isAuthenticated: Show Sign In button
   - authEnabled=true, isAuthenticated: Show user avatar/dropdown
4. User interactions (login/logout) update context
5. Navbar automatically re-renders with new state
```

#### Login Modal Flow
```
1. User clicks "Sign In" button
2. setShowLoginModal(true) updates local state
3. LoginModal renders with visible={true}
4. User completes login in LoginForm
5. onLoginSuccess callback invoked
6. setShowLoginModal(false) closes modal
7. AuthContext state updated with user data
8. Navbar re-renders showing user avatar
```

### State Management

**Navbar Local State**:
| State Variable | Type | Purpose |
|----------------|------|---------|
| `showLoginModal` | Boolean | Controls LoginModal visibility |

**Context Dependencies (from AuthContext)**:
| Value | Type | Purpose |
|-------|------|---------|
| `authEnabled` | Boolean | Determines if auth UI should render |
| `isAuthenticated` | Boolean | Current authentication status |
| `user` | Object | User data (firstname, lastname, email) |
| `logout` | Function | Triggers logout flow |

### File Structure

```
src/
├── features/
│   ├── navbar/
│   │   ├── Navbar.jsx          # Top navigation component
│   │   └── logo_jeeps.png      # JustJeeps logo image
│   └── sidebar/
│       ├── Sidebar.jsx         # Dashboard sidebar navigation
│       └── sidebar.scss        # Sidebar styling
├── components/
│   └── auth/
│       └── LoginModal.jsx      # Modal wrapper for login form
├── context/
│   └── AuthContext.jsx         # Provides auth state to Navbar
├── icons.jsx                   # Custom SVG icons (Login, Logout)
└── assets/
    └── helper_black_transparent.png  # Additional asset (imported but unused)
```

### Styling

**Navbar Styling**:
- Uses Bootstrap classes: `navbar`, `navbar-expand-lg`, `bg-body-tertiary`
- Container: Bootstrap `container` for max-width centering
- Navigation items: `nav-link`, `active`, `fs-5`, `mx-4`
- Custom inline styles for auth controls

**Sidebar Styling** (sidebar.scss):
```scss
.sidebar {
  flex: 1;
  background-color: white;
  border-right: 0.5px solid #e6e3e3;
  min-height: 100vh;
  padding-left: 30px;

  .title { font-size: 20px; font-weight: bold; color: white; }

  li {
    display: flex; align-items: center;
    &:hover { background-color: #1c058e; }
    .icon { font-size: 28px; color: #dddbd9; }
    span { font-size: 25px; font-weight: 600; color: white; }
  }
}
```

## Dependencies

### Internal Dependencies
- **AuthContext**: Provides `authEnabled`, `isAuthenticated`, `user`, `logout`
- **LoginModal**: Modal component for authentication
- **Custom Icons**: `Login`, `Logout` from `src/icons.jsx`

### External Dependencies
- **React Router v6**: `Link` for navigation
- **React**: `useState` for modal state management
- **Ant Design**: `Avatar`, `Space`, `Button`, `Dropdown` for UI components
- **Ant Design Icons**: `UserOutlined` for avatar fallback
- **MUI Icons**: `StoreIcon`, `CreditCardIcon` for sidebar icons
- **Bootstrap**: Navbar responsive classes

### Asset Dependencies
- `logo_jeeps.png`: JustJeeps brand logo
- `helper_black_transparent.png`: Imported but not used in current implementation

## Current Limitations

### L-1: Sidebar Not Globally Available
**Issue**: Sidebar only renders inside Dashboard components, not as part of global layout.
**Impact**: Low - Dashboard pages manually include Sidebar component.
**Recommendation**: Consider creating a DashboardLayout wrapper component.

### L-2: Hardcoded Navigation Links
**Issue**: Navigation links are hardcoded in Navbar component.
**Impact**: Low - Changes require code modification.
**Recommendation**: Consider configuration-driven navigation for flexibility.

### L-3: No Mobile Hamburger Menu Implementation
**Issue**: While Bootstrap's navbar-expand-lg is used, no mobile toggle button is implemented.
**Impact**: Medium - Navigation may not be accessible on mobile devices.
**Recommendation**: Implement Bootstrap's navbar-toggler for mobile support.

### L-4: Sidebar Title Visibility Issue
**Issue**: Sidebar title has `color: white` on white background, making it invisible.
**Impact**: Medium - "MENU" title is not visible to users.
**Recommendation**: Update title color in sidebar.scss to be visible.

### L-5: Unused Asset Import
**Issue**: `helper_black_transparent.png` is imported in Navbar but not used.
**Impact**: Minimal - Dead import increases bundle size marginally.
**Recommendation**: Remove unused import.

### L-6: No Active State for Sidebar Links
**Issue**: Sidebar links don't highlight the current active route.
**Impact**: Low - Users may not know which dashboard view they're on.
**Recommendation**: Implement active link highlighting using React Router's NavLink.

### L-7: Inconsistent Navigation Terminology
**Issue**: Sidebar shows "Products" but links to `/dashboard/po` (Purchase Orders).
**Impact**: Low - May cause confusion about destination.
**Recommendation**: Align label with actual content or update route naming.

### L-8: No Breadcrumb Navigation
**Issue**: No breadcrumb trail to show navigation hierarchy.
**Impact**: Low - Users must rely on URL or sidebar for context.
**Recommendation**: Consider adding breadcrumbs for deeper navigation.

### L-9: Missing Suppliers Link
**Issue**: SupplierTable route exists (`/suppliers`) but no navigation link in Navbar.
**Impact**: Medium - Users cannot navigate to suppliers from main nav.
**Recommendation**: Add Suppliers link to Navbar or document access method.

### L-10: ImageAvatars Import Unused
**Issue**: `ImageAvatars` is imported from icons.jsx but not used in Navbar.
**Impact**: Minimal - Unnecessary import.
**Recommendation**: Remove unused import.

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | Current | Initial implementation with Navbar and Sidebar components |

---

*This PRD was reverse-engineered from the existing codebase to document the current implementation state.*
