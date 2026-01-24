# Product Requirements Document: Shared Utilities Module

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
This document describes the Shared Utilities module of the JustJeeps order management frontend application. The module provides reusable utility functions, data transformation helpers, API configuration, custom React hooks, icon components, and proxy configuration for development environments.

### 1.2 Scope
The Shared Utilities module encompasses:
- Data transformation functions for orders and time-series data
- Table column definitions for data grids
- Custom SVG icon components
- Custom React hooks for dashboard data fetching
- Development proxy configuration for API requests

### 1.3 Module Overview
The utilities layer serves as a foundation for the application, providing:
- Consistent data formatting across components
- Reusable icon components with consistent styling
- Centralized data fetching logic via custom hooks
- Development server proxy configuration

---

## 2. Functional Requirements

### 2.1 Data Transformation Functions

#### 2.1.1 Month Data Transformation (`transferMonth`)
**Location**: `src/helper/transfers.jsx`

**Description**: Transforms an object with date-keyed values into an array of month objects suitable for chart visualization.

**Input Format**:
```javascript
{
  "2024-01": 1500,
  "2024-02": 2300,
  // ... month keys in YYYY-MM format
}
```

**Output Format**:
```javascript
[
  { name: "January", Total: 1500 },
  { name: "February", Total: 2300 },
  // ... sorted by month
]
```

**Behavior**:
- Reverses the order of input keys before processing
- Extracts the month number from the last two characters of each key
- Maps month numbers (01-12) to full month names
- Returns an array suitable for Recharts visualization

**Dependencies**:
- None (pure JavaScript function)

#### 2.1.2 Order Data Transformation (`transferOrder`)
**Location**: `src/helper/transfers.jsx`

**Description**: Transforms raw order data into a standardized format with uppercase customer names.

**Input Fields Extracted**:
- `id` - Order identifier
- `customer_firstname` - Customer first name (converted to uppercase)
- `customer_lastname` - Customer last name (converted to uppercase)
- `grand_total` - Order total amount
- `status` - Order status
- `order_currency_code` - Currency code
- `total_qty_ordered` - Total quantity ordered

**Output**: Array of transformed order objects with uppercase customer names.

**Null Safety**: Handles null/undefined names by defaulting to empty string before uppercase conversion.

### 2.2 Table Column Definitions

#### 2.2.1 User Columns Configuration (`userColumns`)
**Location**: `src/helper/transfers.jsx`

**Description**: Defines column configuration for MUI DataGrid displaying order data.

**Column Specifications**:

| Column Field | Header Name | Width | Special Rendering |
|--------------|-------------|-------|-------------------|
| `id` | ID | 70px | None |
| `customer_name` | Customer Name | 230px | Value getter combining first/last name |
| `order_currency_code` | Currency Code | 200px | None |
| `grand_total` | Grand Total | 260px | NumericFormat with $ prefix, comma separator, 2 decimal places |
| `total_qty_ordered` | Quantity Ordered | 200px | None |
| `status` | Status | 160px | CSS class based on status value |

**Dependencies**:
- `react-number-format` - NumericFormat component for currency display

### 2.3 Icon Components

**Location**: `src/icons.jsx`

**Description**: Collection of reusable SVG icon components with consistent styling.

#### 2.3.1 Available Icons

| Component | Purpose | Styling |
|-----------|---------|---------|
| `Login` | Login/authentication indicator | 24x24 viewBox, stroke-based, `login-icon` class |
| `View` | View/preview action | 24x24 viewBox, stroke-based, eye icon |
| `Option` | Options/more actions menu | 24x24 viewBox, three dots horizontal |
| `Search` | Search functionality | 24x24 viewBox, magnifying glass |
| `Edit` | Edit action | 24x24 viewBox, pencil icon |
| `Trash` | Delete action | 24x24 viewBox, trash can |
| `Logout` | Logout action | 20x20 viewBox, door with arrow |
| `Save` | Save/bookmark action | 24x24 viewBox, bookmark icon |
| `TableIcon` | Table/grid view | 24x24 viewBox, grid pattern |
| `Reload` | Refresh/reload action | 24x24 viewBox, circular arrows |

#### 2.3.2 Avatar Component (`ImageAvatars`)
**Description**: Pre-configured avatar group with specific color schemes.

**Avatar Configurations**:
- "YZ" - Blue background (#145DA0), light cyan text (#D4F1F4)
- "TS" - Pink background (#DF265E), light cyan text (#D4F1F4)
- "RL" - Dark background (#0F1114), light cyan text (#D4F1F4)

**Dependencies**:
- `@ant-design/icons` - UserOutlined icon
- `antd` - Avatar, Space components

### 2.4 Custom React Hooks

**Location**: `src/hooks/useDashboardData.js`

#### 2.4.1 `useDashboardData` Hook

**Description**: Custom hook for fetching and managing dashboard order statistics.

**State Structure**:
```javascript
{
  totalSum: 0,        // Sum of all order values
  totalByMonth: {},   // Orders grouped by month
  totalCount: 0,      // Total number of orders
  aveValue: 0,        // Average order value
  totalQty: 0,        // Total quantity across orders
  totalCurMonth: 0,   // Current month total
  totalLastMonth: 0,  // Previous month total
  orders: []          // Order data array
}
```

**API Configuration**: Uses `VITE_API_URL` environment variable for backend URL.

**Note**: Data fetching logic is currently commented out (disabled).

**API Endpoints (Planned)**:
- `/totalGrandTotalByMonth` - Monthly totals and current/last month comparisons
- `/totalOrderInfo` - Aggregate order statistics

#### 2.4.2 `useDashboardpoData` Hook

**Description**: Custom hook for fetching product/purchase order dashboard data.

**State Structure**:
```javascript
{
  numProduct: 0,    // Total number of products
  totalSold: 0,     // Total products sold
  topPopular: []    // Array of popular products
}
```

**API Endpoints (Planned)**:
- `/productinfo` - Product count and sales data
- `/toppopularproduct` - Popular product rankings

**Note**: Data fetching logic is currently commented out (disabled).

### 2.5 Proxy Configuration

**Location**: `src/setupProxy.js`

**Description**: Development proxy configuration for Create React App compatibility.

**Configuration**:
```javascript
{
  target: 'http://localhost:8080',
  changeOrigin: true,
  path: '/api'
}
```

**Purpose**: Forwards all `/api` requests to the local Express backend server during development.

**Note**: This file is for CRA-style setup. The active Vite configuration handles proxying via `vite.config.js`.

**Dependencies**:
- `http-proxy-middleware` - Proxy middleware package

---

## 3. Non-Functional Requirements

### 3.1 Performance
- Icon components use inline SVG for optimal rendering performance
- Data transformation functions are pure functions enabling memoization
- Custom hooks utilize React's useState/useEffect for efficient re-rendering

### 3.2 Maintainability
- Icons are componentized for easy updates and consistency
- Data transformations are centralized in the helper module
- Column definitions are declarative and easily extendable

### 3.3 Compatibility
- Icons use standard SVG attributes compatible with all modern browsers
- NumericFormat provides consistent number formatting across locales
- Proxy configuration supports both CRA and Vite development servers

---

## 4. Technical Specifications

### 4.1 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react-number-format` | ^5.1.4 | Currency and number formatting |
| `antd` | ^5.4.2 | Avatar and Space components |
| `@ant-design/icons` | ^5.0.1 | Icon library |
| `http-proxy-middleware` | ^2.0.6 | Development proxy |
| `axios` | ^1.3.5 | HTTP client for hooks |

### 4.2 File Structure

```
src/
  helper/
    transfers.jsx          # Data transformation functions
  hooks/
    useDashboardData.js    # Custom dashboard hooks
  utils/
    api.js                 # API configuration (empty)
    auth.js                # Auth utilities (empty)
  icons.jsx                # SVG icon components
  setupProxy.js            # CRA proxy configuration
```

### 4.3 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | Empty (uses relative URLs) |

---

## 5. Integration Points

### 5.1 Consumers

| Module | Functions Used |
|--------|----------------|
| OrderTable | `transferOrder`, `userColumns` |
| Dashboard | `useDashboardData`, `transferMonth` |
| DashBoardPO | `useDashboardpoData` |
| Navbar | Icon components |
| Various Tables | Icon components for actions |

### 5.2 External Services

| Service | Integration |
|---------|-------------|
| Backend API | HTTP requests via axios (port 8080) |

---

## 6. Current State Notes

### 6.1 Active Features
- Data transformation functions (`transferMonth`, `transferOrder`)
- Table column definitions (`userColumns`)
- Icon components (all 10 icons + avatar group)
- Development proxy configuration

### 6.2 Disabled/Incomplete Features
- Dashboard data hooks have API calls commented out
- `src/utils/api.js` - File exists but is empty
- `src/utils/auth.js` - File exists but is empty (auth handled by AuthContext)

### 6.3 Known Limitations
- Month transformation assumes YYYY-MM key format
- Avatar component has hardcoded initials (YZ, TS, RL)
- No error handling in transformation functions for malformed data
- Dashboard hooks return static initial state (API calls disabled)

---

## 7. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-22 | Reverse-engineered | Initial documentation from codebase analysis |
