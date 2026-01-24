# Product Requirements Document: Orders Dashboard

## Document Information

| Field | Value |
|-------|-------|
| Module Name | Orders Dashboard |
| Version | 1.0.0 |
| Status | Reverse-Engineered |
| Last Updated | 2026-01-22 |
| Architecture | Layered (Presentation Layer) |

---

## 1. Overview

### 1.1 Purpose

The Orders Dashboard provides a comprehensive view of business metrics and analytics for order data within the JustJeeps order management system. It serves as the primary analytics interface for monitoring sales performance, revenue trends, and order status.

### 1.2 Scope

This document describes the implemented features of the Orders Dashboard module, including:
- Key performance indicator (KPI) widgets
- Revenue progress tracking
- Monthly revenue trend visualization
- Order status listing with pagination

### 1.3 Entry Point

- **Route**: `/dashboard`
- **Component**: `DashBoard`
- **Access**: Protected (requires authentication)

---

## 2. User Interface Structure

### 2.1 Layout Architecture

The dashboard follows a two-column layout structure:

```
+------------------+----------------------------------------+
|                  |              WIDGETS ROW               |
|    SIDEBAR       |  [Total Orders] [Revenue] [AOV] [Qty]  |
|                  +----------------------------------------+
|   - Orders       |              CHARTS ROW                |
|   - Products     |  [Featured Progress]  [Area Chart]     |
|                  +----------------------------------------+
|                  |           ORDER STATUS LIST            |
|                  |  [DataGrid with Order Records]         |
+------------------+----------------------------------------+
```

### 2.2 Component Hierarchy

```
DashBoard
├── Sidebar
│   ├── Link: /dashboard (Orders)
│   └── Link: /dashboard/po (Products)
├── Widget (totalorders)
├── Widget (totalrevenue)
├── Widget (aveordervalue)
├── Widget (totalqtyorder)
├── Featured (Monthly Progress)
├── Chart (Yearly Revenue)
└── List (Order Status DataGrid)
```

---

## 3. Feature Specifications

### 3.1 Sidebar Navigation

| Feature | Description |
|---------|-------------|
| Purpose | Provides navigation between dashboard views |
| Menu Items | Orders (/dashboard), Products (/dashboard/po) |
| Icons | CreditCardIcon (Orders), StoreIcon (Products) |
| Styling | White background, purple hover effect (#1c058e) |

### 3.2 KPI Widgets

The dashboard displays four key performance indicator widgets:

#### 3.2.1 Total Number of Orders Widget

| Property | Value |
|----------|-------|
| Type | `totalorders` |
| Data Source | `state.totalCount` |
| Format | Localized number (comma separators) |
| Icon | ShoppingCartOutlinedIcon (crimson) |
| Icon Background | rgba(255, 0, 0, 0.2) |

#### 3.2.2 Total Revenue Widget

| Property | Value |
|----------|-------|
| Type | `totalrevenue` |
| Data Source | `state.totalSum` |
| Format | Dollar sign prefix, localized integer |
| Icon | MonetizationOnOutlinedIcon (goldenrod) |
| Icon Background | rgba(218, 165, 32, 0.2) |

#### 3.2.3 Average Order Value Widget

| Property | Value |
|----------|-------|
| Type | `aveordervalue` |
| Data Source | `state.aveValue` |
| Format | NumericFormat with 2 decimal places, comma separators |
| Icon | MonetizationOnOutlinedIcon (green) |
| Icon Background | rgba(0, 128, 0, 0.2) |

#### 3.2.4 Total Quantity Ordered Widget

| Property | Value |
|----------|-------|
| Type | `totalqtyorder` |
| Data Source | `state.totalQty` |
| Format | Raw number |
| Icon | ShoppingCartOutlinedIcon (purple) |
| Icon Background | rgba(128, 0, 128, 0.2) |

### 3.3 Featured Progress Component

| Feature | Description |
|---------|-------------|
| Purpose | Displays monthly revenue progress against target |
| Data Inputs | `state.totalCurMonth`, `state.totalLastMonth` |
| Visualization | Circular progress bar (react-circular-progressbar) |
| Target Calculation | Last month revenue * 1.1 (10% growth target) |
| Progress Calculation | (Current / Target) * 100, capped at 100% |
| Display Values | Current month (in $k), Target (in $k), Last month (in $k) |

**Business Logic**:
```javascript
current = parseInt(value[0]/1000)  // Current month in thousands
last = parseInt(value[1]/1000)      // Last month in thousands
target = parseInt(last * 1.1)       // 10% growth target
ratio = parseInt((current / target) * 100)  // Progress percentage
if (ratio > 100) ratio = 100        // Cap at 100%
```

### 3.4 Revenue Area Chart

| Feature | Description |
|---------|-------------|
| Purpose | Displays yearly revenue trend by month |
| Library | Recharts (AreaChart) |
| Data Source | `state.totalByMonth` transformed via `transferMonth()` |
| Aspect Ratio | 3:1 |
| Chart Type | Monotone area chart with gradient fill |
| Axes | X-axis (Month names), Y-axis (Revenue values) |
| Color | #8884d8 (purple gradient) |

**Static Data Prefix**:
The chart prepends three static months before dynamic data:
- January: $158,091
- February: $188,500
- March: $262,450

### 3.5 Order Status List

| Feature | Description |
|---------|-------------|
| Purpose | Displays recent orders with status information |
| Component | MUI DataGrid |
| Data Source | `state.orders` transformed via `transferOrder()` |
| Pagination | 5 or 10 items per page |
| Height | 600px |

**Column Definitions**:

| Column | Header | Width | Format |
|--------|--------|-------|--------|
| `id` | ID | 70px | Raw number |
| `customer_name` | Customer Name | 230px | Concatenated first + last name (uppercase) |
| `order_currency_code` | Currency Code | 200px | Raw text |
| `grand_total` | Grand Total | 260px | NumericFormat ($X,XXX.XX) |
| `total_qty_ordered` | Quantity Ordered | 200px | Raw number |
| `status` | Status | 160px | Color-coded badge |

**Status Color Coding**:

| Status | Text Color | Background |
|--------|------------|------------|
| processing | green | rgba(0, 128, 0, 0.05) |
| pending | goldenrod | rgba(255, 217, 0, 0.05) |
| canceled | rgb(220, 20, 213) | rgba(255, 0, 0, 0.05) |
| holded | rgb(37, 20, 220) | rgba(255, 0, 0, 0.05) |
| fraud | rgb(220, 20, 20) | rgba(255, 0, 0, 0.05) |
| complete | rgb(70, 220, 20) | rgba(255, 0, 0, 0.05) |

---

## 4. Data Management

### 4.1 Custom Hook: useDashboardData

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `totalSum` | number | 0 | Total revenue across all orders |
| `totalByMonth` | object | {} | Revenue grouped by month (YYYY-MM format) |
| `totalCount` | number | 0 | Total number of orders |
| `aveValue` | number | 0 | Average order value |
| `totalQty` | number | 0 | Total quantity of items ordered |
| `totalCurMonth` | number | 0 | Current month's total revenue |
| `totalLastMonth` | number | 0 | Last month's total revenue |
| `orders` | array | [] | Array of recent order objects |

### 4.2 API Endpoints (Commented Out)

The following endpoints are configured but currently disabled:

| Endpoint | Purpose |
|----------|---------|
| `${API_URL}/totalGrandTotalByMonth` | Fetches monthly totals, orders, current/last month data |
| `${API_URL}/totalOrderInfo` | Fetches aggregate order statistics |

### 4.3 Data Transformations

#### transferMonth Function
Transforms backend month data (YYYY-MM keys) to chart-compatible format:

**Input**: `{ "2024-01": 158091, "2024-02": 188500, ... }`

**Output**: `[{ name: "January", Total: 158091 }, { name: "February", Total: 188500 }, ...]`

#### transferOrder Function
Transforms raw order data for DataGrid display:

**Input Fields**: `id`, `customer_firstname`, `customer_lastname`, `grand_total`, `status`, `order_currency_code`, `total_qty_ordered`

**Output**: Same fields with names converted to uppercase

---

## 5. Styling Specifications

### 5.1 Dashboard Container

| Property | Value |
|----------|-------|
| Display | Flex |
| Font Family | 'Nunito', sans-serif |
| Top Margin | 140px (accounts for fixed navbar) |
| Container Flex | 8 (relative to sidebar's 1) |

### 5.2 Widget Styling

| Property | Value |
|----------|-------|
| Display | Flex (space-between) |
| Padding | 10px |
| Height | 100px |
| Border Radius | 10px |
| Box Shadow | 2px 4px 10px 1px rgba(201, 201, 201, 0.47) |
| Title Font Size | 18px |
| Counter Font Size | 28px |

### 5.3 List Container

| Property | Value |
|----------|-------|
| Padding | 20px |
| Margin | 20px |
| Box Shadow | 2px 4px 10px 1px rgba(201, 201, 201, 0.47) |
| Header Background | #FAEA48 (yellow) |

---

## 6. Dependencies

### 6.1 External Libraries

| Library | Purpose |
|---------|---------|
| react-router-dom | Navigation (Link) |
| @mui/icons-material | Material icons |
| @mui/x-data-grid | DataGrid for order list |
| recharts | AreaChart visualization |
| react-circular-progressbar | Progress indicator |
| react-number-format | Currency formatting |

### 6.2 Internal Dependencies

| Module | Purpose |
|--------|---------|
| `useDashboardData` hook | State management for dashboard data |
| `transferMonth` helper | Month data transformation |
| `transferOrder` helper | Order data transformation |
| `userColumns` definition | DataGrid column configuration |

---

## 7. File Structure

```
src/
├── features/
│   ├── dashboard/
│   │   ├── DashBoard.jsx        # Main dashboard component
│   │   └── dashboard.scss       # Dashboard styling
│   ├── sidebar/
│   │   ├── Sidebar.jsx          # Navigation sidebar
│   │   └── sidebar.scss         # Sidebar styling
│   ├── widget/
│   │   ├── Widget.jsx           # KPI widget component
│   │   └── widget.scss          # Widget styling
│   ├── featured/
│   │   ├── Featured.jsx         # Monthly progress component
│   │   └── featured.scss        # Featured styling
│   ├── chart/
│   │   ├── Chart.jsx            # Area chart component
│   │   └── chart.scss           # Chart styling
│   └── list/
│       ├── List.jsx             # Order status DataGrid
│       └── list.scss            # List styling
├── hooks/
│   └── useDashboardData.js      # Dashboard data hook
└── helper/
    └── transfers.jsx            # Data transformation utilities
```

---

## 8. Known Limitations

1. **Static Data Prepending**: The chart component prepends static January-March data, which may conflict with actual dynamic data.

2. **API Endpoints Disabled**: The `useDashboardData` hook has API calls commented out, meaning the dashboard currently displays default/empty values.

3. **No Error Handling UI**: While the hook has try-catch for API calls, there's no user-facing error state or loading indicators.

4. **No Date Range Selection**: Dashboard displays fixed time periods without user-configurable date ranges.

5. **Hardcoded Colors**: Status colors and chart colors are hardcoded rather than configurable via theme.

---

## 9. Future Considerations

1. Enable API integration by uncommenting fetch calls in `useDashboardData`
2. Add loading states and error boundaries
3. Implement date range filters
4. Add drill-down capabilities from widgets to detailed views
5. Implement real-time data refresh
6. Add export functionality for reports
