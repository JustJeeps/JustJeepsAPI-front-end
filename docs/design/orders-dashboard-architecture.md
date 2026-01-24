# Design Document: Orders Dashboard State Management & Data Flow

## 1. Overview

### 1.1 Purpose
The Orders Dashboard (DashBoard) component provides a comprehensive analytics view of business metrics for the JustJeeps order management system. It serves as the primary interface for monitoring sales performance, revenue trends, and order status, displaying key performance indicators (KPIs), monthly revenue progress tracking, yearly revenue visualization, and a paginated order status grid.

### 1.2 Scope
- **Primary Responsibility**: Display aggregated order metrics and analytics for business decision-making
- **Key Features**:
  - Four KPI widgets (Total Orders, Total Revenue, Average Order Value, Total Quantity)
  - Circular progress indicator for monthly revenue target tracking
  - Area chart showing yearly revenue trends by month
  - DataGrid displaying order status with customer information and pagination

### 1.3 Parent PRD Reference
- **Parent Document**: orders-dashboard.md
- **Component Role**: Primary analytics and reporting interface for order data

---

## 2. Architecture

### 2.1 Component Hierarchy

```
DashBoard (Main Component)
├── Sidebar (Navigation)
│   ├── Link: /dashboard (Orders - active)
│   └── Link: /dashboard/po (Products)
├── Widget (totalorders)
│   └── ShoppingCartOutlinedIcon
├── Widget (totalrevenue)
│   └── MonetizationOnOutlinedIcon
├── Widget (aveordervalue)
│   └── MonetizationOnOutlinedIcon + NumericFormat
├── Widget (totalqtyorder)
│   └── ShoppingCartOutlinedIcon
├── Featured (Monthly Progress)
│   └── CircularProgressbar
├── Chart (Yearly Revenue)
│   └── ResponsiveContainer > AreaChart
│       ├── XAxis, YAxis
│       ├── CartesianGrid
│       ├── Tooltip
│       └── Area (gradient fill)
└── List (Order Status Grid)
    └── DataGrid
        └── Column renderers (status badges, currency format)
```

### 2.2 Layer Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  Widget  │  │  Widget  │  │  Widget  │  │  Widget  │               │
│  │ (Orders) │  │(Revenue) │  │  (AOV)   │  │  (Qty)   │               │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │
│  ┌───────────────────────┐  ┌────────────────────────────────────────┐ │
│  │       Featured        │  │               Chart                    │ │
│  │  (Progress Circle)    │  │         (Area Chart)                   │ │
│  └───────────────────────┘  └────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                         List (DataGrid)                           │ │
│  │                    Order Status Table                             │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       STATE MANAGEMENT LAYER                            │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  useDashboardData() Custom Hook                                     ││
│  │  └── useState Hook (Centralized Dashboard State)                    ││
│  │      • totalSum, totalCount, aveValue, totalQty                     ││
│  │      • totalByMonth (monthly aggregations)                          ││
│  │      • totalCurMonth, totalLastMonth                                ││
│  │      • orders (array of order objects)                              ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATA TRANSFORMATION LAYER                        │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  Helper Functions (src/helper/transfers.jsx)                        ││
│  │  • transferMonth(obj) - Converts YYYY-MM keys to chart format       ││
│  │  • transferOrder(array) - Normalizes order data for DataGrid        ││
│  │  • userColumns - Column configuration for DataGrid                  ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            DATA LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  Axios HTTP Client (Currently Commented Out)                        ││
│  │  • GET ${API_URL}/totalGrandTotalByMonth                            ││
│  │  • GET ${API_URL}/totalOrderInfo                                    ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND API (Express)                           │
│                     ${VITE_API_URL} or localhost:8080                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 File Structure

```
src/
├── features/
│   ├── dashboard/
│   │   ├── DashBoard.jsx           # Main dashboard component (56 lines)
│   │   └── dashboard.scss          # Dashboard layout styles
│   ├── sidebar/
│   │   ├── Sidebar.jsx             # Navigation sidebar
│   │   └── sidebar.scss            # Sidebar styles
│   ├── widget/
│   │   ├── Widget.jsx              # Reusable KPI widget (120 lines)
│   │   └── widget.scss             # Widget styles
│   ├── featured/
│   │   ├── Featured.jsx            # Monthly progress component (61 lines)
│   │   └── featured.scss           # Featured section styles
│   ├── chart/
│   │   ├── Chart.jsx               # Area chart component (61 lines)
│   │   └── chart.scss              # Chart styles
│   └── list/
│       ├── List.jsx                # Order status DataGrid (30 lines)
│       └── list.scss               # List/table styles
├── hooks/
│   └── useDashboardData.js         # Custom hook for dashboard state (85 lines)
└── helper/
    └── transfers.jsx               # Data transformation utilities (124 lines)
```

---

## 3. State Management

### 3.1 State Variables (useDashboardData Hook)

| Variable | Type | Initial Value | Purpose | Update Triggers |
|----------|------|---------------|---------|-----------------|
| `totalSum` | `number` | `0` | Total revenue across all orders | API response |
| `totalByMonth` | `object` | `{}` | Revenue keyed by YYYY-MM format | API response |
| `totalCount` | `number` | `0` | Total number of orders | API response |
| `aveValue` | `number` | `0` | Average order value | API response |
| `totalQty` | `number` | `0` | Total quantity of items ordered | API response |
| `totalCurMonth` | `number` | `0` | Current month's total revenue | API response |
| `totalLastMonth` | `number` | `0` | Previous month's total revenue | API response |
| `orders` | `Array<Order>` | `[]` | Array of recent order objects | API response |

### 3.2 State Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INITIAL LOAD                                 │
│  Component Mount → useDashboardData() → useEffect([])                │
│           │                                                         │
│           ▼                                                         │
│  fetchData() → Promise.all([                                        │
│      axios.get('/totalGrandTotalByMonth'),                          │
│      axios.get('/totalOrderInfo')                                   │
│  ])                                                                 │
│           │                                                         │
│           ▼                                                         │
│  setState({ totalSum, totalByMonth, totalCount, aveValue,           │
│             totalQty, totalCurMonth, totalLastMonth, orders })      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA TRANSFORMATION FLOW                          │
│                                                                     │
│  Widget Components:                                                 │
│  └── state.totalCount.toLocaleString() → "1,234"                    │
│  └── parseInt(state.totalSum).toLocaleString() → "12,345"           │
│  └── <NumericFormat value={state.aveValue} /> → "$123.45"           │
│                                                                     │
│  Featured Component:                                                │
│  └── [state.totalCurMonth, state.totalLastMonth]                    │
│      └── Calculate: current/1000, last/1000, target = last*1.1     │
│      └── ratio = Math.min((current/target)*100, 100)               │
│                                                                     │
│  Chart Component:                                                   │
│  └── transferMonth(state.totalByMonth)                              │
│      └── Input: { "2024-04": 15000, "2024-05": 18000 }             │
│      └── Output: [{ name: "April", Total: 15000 }, ...]            │
│      └── Prepend static data for Jan-Mar                           │
│                                                                     │
│  List Component:                                                    │
│  └── transferOrder(state.orders)                                    │
│      └── Uppercase customer names                                   │
│      └── Extract: id, customer names, grand_total, status, etc.    │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Widget Type Configuration

The Widget component uses a switch statement to determine display configuration:

```javascript
switch (type) {
  case "totalorders":
    data = { title: "TOTAL NUMBER OF ORDERS", isMoney: false, icon: ShoppingCart };
  case "totalrevenue":
    data = { title: "TOTAL REVENUE", isMoney: true, icon: MonetizationOn };
  case "aveordervalue":
    data = { title: "AVERAGE ORDER VALUE", isMoney: true, icon: MonetizationOn };
  case "totalqtyorder":
    data = { title: "TOTAL QUANTITY ORDERED", isMoney: false, icon: ShoppingCart };
}
```

---

## 4. Data Flow

### 4.1 API Response Mapping

**Endpoint: /totalGrandTotalByMonth**
```javascript
// Expected Response
{
  orders: [...],           // Array of recent orders
  total_by_month: {        // Monthly revenue totals
    "2024-04": 150000,
    "2024-05": 180000
  },
  total_this_month: 50000, // Current month revenue
  total_last_month: 45000  // Previous month revenue (fallback: 262450)
}
```

**Endpoint: /totalOrderInfo**
```javascript
// Expected Response
{
  totalSum: 1500000,       // Total revenue
  count: 1234,             // Total order count
  avg: 1215.89,            // Average order value
  totalQty: 5678           // Total items ordered
}
```

### 4.2 Data Transformation: transferMonth

```javascript
// Input: API response with YYYY-MM keys
{ "2024-01": 158091, "2024-02": 188500, "2024-03": 262450 }

// Process: Map month suffix to month name
switch (item.slice(-2)) {
  case "01": result.push({ name: "January", Total: value });
  case "02": result.push({ name: "February", Total: value });
  // ... etc
}

// Output: Recharts-compatible data array
[
  { name: "January", Total: 158091 },
  { name: "February", Total: 188500 },
  { name: "March", Total: 262450 }
]
```

### 4.3 Data Transformation: transferOrder

```javascript
// Input: Raw order array from API
[{
  id: 1001,
  customer_firstname: "John",
  customer_lastname: "Doe",
  grand_total: 599.99,
  status: "processing",
  order_currency_code: "CAD",
  total_qty_ordered: 3
}]

// Output: DataGrid-compatible rows with uppercase names
[{
  id: 1001,
  customer_firstname: "JOHN",
  customer_lastname: "DOE",
  grand_total: 599.99,
  status: "processing",
  order_currency_code: "CAD",
  total_qty_ordered: 3
}]
```

### 4.4 Featured Component Calculations

```javascript
// Input: [totalCurMonth, totalLastMonth] e.g., [50000, 45000]

// Calculations
const current = parseInt(value[0] / 1000);  // 50 (thousands)
const last = parseInt(value[1] / 1000);     // 45 (thousands)
const target = parseInt(last * 1.1);        // 49 (10% growth target)
const ratio = parseInt((current / target) * 100);  // 102 → capped to 100

// Display: 100% progress, $50k current, $49k target, $45k last month
```

---

## 5. Key Functions

### 5.1 useDashboardData Hook

| Function/Property | Description | Parameters | Return Value |
|-------------------|-------------|------------|--------------|
| `useDashboardData()` | Custom hook managing dashboard state | None | `{ state }` object with all dashboard data |
| `fetchData()` | (Internal) Async function to load data from APIs | None | Updates state via setState |

### 5.2 Helper Functions

| Function | Description | Parameters | Return Value |
|----------|-------------|------------|--------------|
| `transferMonth(obj)` | Converts YYYY-MM keyed object to chart data array | `obj: { [YYYY-MM]: number }` | `Array<{ name: string, Total: number }>` |
| `transferOrder(array)` | Normalizes order data for DataGrid display | `array: Order[]` | Transformed Order[] with uppercase names |

### 5.3 Component Props

**Widget Component**
| Prop | Type | Description |
|------|------|-------------|
| `type` | `string` | Widget type identifier (totalorders, totalrevenue, aveordervalue, totalqtyorder) |
| `value` | `string | ReactNode` | Formatted value to display |

**Featured Component**
| Prop | Type | Description |
|------|------|-------------|
| `value` | `[number, number]` | Tuple of [currentMonth, lastMonth] revenue |

**Chart Component**
| Prop | Type | Description |
|------|------|-------------|
| `aspect` | `number` | Chart aspect ratio (e.g., 3/1) |
| `title` | `string` | Chart title text |
| `data` | `Array<{name: string, Total: number}>` | Recharts-compatible data array |

**List Component**
| Prop | Type | Description |
|------|------|-------------|
| `value` | `Array<Order>` | Array of order objects to display in grid |

---

## 6. Dependencies

### 6.1 External Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.x | Core React framework |
| `axios` | ^1.x | HTTP client for API requests |
| `recharts` | ^2.x | AreaChart visualization |
| `react-circular-progressbar` | ^2.x | Circular progress indicator |
| `react-number-format` | ^5.x | Currency/number formatting |
| `@mui/x-data-grid` | ^6.x | Order status data table |
| `@mui/icons-material` | ^5.x | Icon components |

### 6.2 Internal Dependencies

| Module | Location | Purpose |
|--------|----------|---------|
| `useDashboardData` | `src/hooks/useDashboardData.js` | State management hook |
| `transferMonth` | `src/helper/transfers.jsx` | Month data transformation |
| `transferOrder` | `src/helper/transfers.jsx` | Order data transformation |
| `userColumns` | `src/helper/transfers.jsx` | DataGrid column configuration |
| `Sidebar` | `src/features/sidebar/Sidebar.jsx` | Navigation component |

### 6.3 Shared Components

| Component | Shared With | Purpose |
|-----------|-------------|---------|
| `Sidebar` | DashBoardPO | Navigation between dashboards |
| `Widget` | DashBoardPO | KPI display cards |

---

## 7. Known Issues

### 7.1 Critical Issues

1. **API Calls Disabled**: The `useDashboardData` hook has all API calls commented out (lines 23-46), resulting in the dashboard displaying only default zero values.

2. **Static Data Prepending**: The Chart component hardcodes January-March data before dynamic data:
   ```javascript
   data = [
     { name: "January", Total: 158091 },
     { name: "February", Total: 188500 },
     { name: "March", Total: 262450 },
   ].concat(data);
   ```
   This will cause data overlap issues when real API data is enabled.

### 7.2 Minor Issues

3. **isMoney Bug in Widget**: The `totalrevenue` widget incorrectly assigns `toggleButtonGroupClasses` (a MUI function) instead of `true` for `isMoney`:
   ```javascript
   case "totalrevenue":
     data = {
       isMoney: toggleButtonGroupClasses,  // Should be: isMoney: true
     };
   ```

4. **No Loading States**: No loading indicators or skeleton screens while data is being fetched.

5. **No Error Handling UI**: While the hook has try-catch for API calls, there's no user-facing error state display.

6. **No Date Range Selection**: Dashboard displays fixed time periods without user-configurable date ranges.

7. **Hardcoded Colors**: Status colors and chart colors are hardcoded rather than configurable via theme.

8. **Console.log in Production**: `transferOrder` function has a `console.log(array[1])` debug statement.

### 7.3 Technical Debt

9. **Missing TypeScript**: No type definitions for state objects, props, or API responses.

10. **No Memoization**: Widget values are recalculated on every render without useMemo.

11. **No Data Refresh**: No mechanism for refreshing dashboard data or real-time updates.

---

## 8. API Contract

### 8.1 Endpoint: GET /totalGrandTotalByMonth

**Purpose**: Retrieve monthly revenue aggregations and recent orders

**Response Schema**:
```typescript
interface TotalByMonthResponse {
  orders: Order[];                    // Recent orders array
  total_by_month: Record<string, number>;  // YYYY-MM keyed revenue totals
  total_this_month: number;           // Current month revenue
  total_last_month?: number;          // Previous month (optional, defaults to 262450)
}
```

### 8.2 Endpoint: GET /totalOrderInfo

**Purpose**: Retrieve aggregate order statistics

**Response Schema**:
```typescript
interface OrderInfoResponse {
  totalSum: number;     // Total revenue
  count: number;        // Total order count
  avg: number;          // Average order value
  totalQty: number;     // Total quantity ordered
}
```

### 8.3 Order Object Structure

```typescript
interface Order {
  id: number;
  entity_id: number;
  customer_firstname: string;
  customer_lastname: string;
  grand_total: number;
  status: 'processing' | 'pending' | 'canceled' | 'holded' | 'fraud' | 'complete';
  order_currency_code: 'CAD' | 'USD';
  total_qty_ordered: number;
}
```

---

## 9. Future Considerations

1. **Enable API Integration**: Uncomment fetch calls in `useDashboardData` hook
2. **Remove Static Data Prepending**: Let Chart component use only dynamic API data
3. **Fix isMoney Bug**: Correct the `toggleButtonGroupClasses` assignment
4. **Add Loading States**: Implement skeleton loaders or spinners during data fetch
5. **Add Error Boundaries**: Graceful error handling with retry options
6. **Implement Date Filters**: Add date range selection for analytics
7. **Add Drill-down Capabilities**: Click widgets to view detailed breakdowns
8. **Implement Real-time Refresh**: Auto-refresh dashboard data periodically
9. **Add Export Functionality**: Allow exporting reports to CSV/PDF
10. **Add TypeScript**: Type-safe interfaces for all data structures
