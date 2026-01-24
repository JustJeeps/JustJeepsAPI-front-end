# Design Document: Products Dashboard (PO Analytics) State Management & Data Flow

## 1. Overview

### 1.1 Purpose
The Products Dashboard (DashBoardPO) component provides product and purchase order analytics within the JustJeeps order management system. It offers insights into product inventory metrics, popularity rankings, vendor distribution visualization, and detailed product performance data through a featured product showcase and top products table.

### 1.2 Scope
- **Primary Responsibility**: Display product-centric analytics and vendor distribution metrics
- **Key Features**:
  - Two KPI widgets (Number of Products, Total Products Ordered)
  - Featured "Most Popular Product" showcase with image and details
  - Pie chart visualization of orders distributed by vendor
  - Top 10 popular products table with comprehensive product information

### 1.3 Parent PRD Reference
- **Parent Document**: products-dashboard.md
- **Component Role**: Product analytics and vendor distribution interface

---

## 2. Architecture

### 2.1 Component Hierarchy

```
DashBoardPO (Main Component)
├── Sidebar (Navigation)
│   ├── Link: /dashboard (Orders)
│   └── Link: /dashboard/po (Products - active)
├── Top Section (Flex Layout)
│   ├── Left Column
│   │   ├── Widget (numproduct)
│   │   │   └── ShoppingCartOutlinedIcon
│   │   ├── Widget (totalordered)
│   │   │   └── ShoppingCartOutlinedIcon
│   │   └── Most Popular Product Section
│   │       ├── Product Image (200x200)
│   │       └── Product Details
│   │           ├── Name (h1)
│   │           ├── SKU
│   │           ├── Weight
│   │           ├── Qty Ordered
│   │           └── Vendor
│   └── Right Column
│       └── Piechart (Vendor Distribution)
│           ├── ResponsiveContainer > PieChart
│           │   └── Pie with Cells
│           └── Legend (4 vendors)
└── Bottom Section
    └── Poptable (Top 10 Products)
        └── MUI Table
            ├── TableHead
            └── TableBody (mapped rows)
```

### 2.2 Layer Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                             │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                        TOP SECTION                                   ││
│  │  ┌───────────────────────────┐  ┌─────────────────────────────────┐ ││
│  │  │       LEFT COLUMN         │  │        RIGHT COLUMN              │ ││
│  │  │  ┌───────┐  ┌───────┐     │  │  ┌─────────────────────────────┐ │ ││
│  │  │  │Widget │  │Widget │     │  │  │       Piechart              │ │ ││
│  │  │  │(#prod)│  │(#ord) │     │  │  │   (Vendor Distribution)     │ │ ││
│  │  │  └───────┘  └───────┘     │  │  │   [Keystone][Meyer]         │ │ ││
│  │  │  ┌─────────────────────┐  │  │  │   [Omix][Quadratec]         │ │ ││
│  │  │  │  Most Popular       │  │  │  └─────────────────────────────┘ │ ││
│  │  │  │  Product Section    │  │  │                                  │ ││
│  │  │  └─────────────────────┘  │  │                                  │ ││
│  │  └───────────────────────────┘  └─────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                      BOTTOM SECTION                                  ││
│  │  ┌─────────────────────────────────────────────────────────────────┐││
│  │  │              Poptable (Top 10 Products Table)                   │││
│  │  │  [SKU | Brand | Vendor | Name | Price | Qty Ordered | Weight]  │││
│  │  └─────────────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       STATE MANAGEMENT LAYER                            │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  useDashboardpoData() Custom Hook                                   ││
│  │  └── useState Hook (Centralized Product Dashboard State)            ││
│  │      • numProduct (unique product count)                            ││
│  │      • totalSold (total products ordered)                           ││
│  │      • topPopular (array of top product objects)                    ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            DATA LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  Axios HTTP Client (Currently Commented Out)                        ││
│  │  • GET http://localhost:8080/productinfo                            ││
│  │  • GET http://localhost:8080/toppopularproduct                      ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  Static Pie Chart Data (Hardcoded)                                  ││
│  │  • Group A (Keystone): 400                                          ││
│  │  • Group B (Meyer): 300                                             ││
│  │  • Group C (Omix): 300                                              ││
│  │  • Group D (Quadratec): 200                                         ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND API (Express)                           │
│                         http://localhost:8080                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 File Structure

```
src/
├── features/
│   ├── dashboard/
│   │   ├── DashBoardPO.jsx         # Main products dashboard component (78 lines)
│   │   └── dashboardpo.scss        # Products dashboard layout styles
│   ├── sidebar/
│   │   ├── Sidebar.jsx             # Navigation sidebar (shared)
│   │   └── sidebar.scss            # Sidebar styles
│   ├── widget/
│   │   ├── Widget.jsx              # Reusable KPI widget (shared, 120 lines)
│   │   └── widget.scss             # Widget styles
│   ├── pie/
│   │   ├── Piechart.jsx            # Pie chart component (75 lines)
│   │   └── piechart.scss           # Pie chart styles
│   └── table/
│       ├── Poptable.jsx            # Popular products table (60 lines)
│       └── poptable.scss           # Table styles
└── hooks/
    └── useDashboardData.js         # Contains useDashboardpoData hook (85 lines)
```

---

## 3. State Management

### 3.1 State Variables (useDashboardpoData Hook)

| Variable | Type | Initial Value | Purpose | Update Triggers |
|----------|------|---------------|---------|-----------------|
| `numProduct` | `number` | `0` | Total count of unique products in catalog | API response |
| `totalSold` | `number` | `0` | Total quantity of products sold/ordered | API response |
| `topPopular` | `Array<Product>` | `[]` | Array of top popular product objects ordered by popularity | API response |

### 3.2 State Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INITIAL LOAD                                 │
│  Component Mount → useDashboardpoData() → useEffect([])              │
│           │                                                         │
│           ▼                                                         │
│  fetchData() → Promise.all([                                        │
│      axios.get('http://localhost:8080/productinfo'),                │
│      axios.get('http://localhost:8080/toppopularproduct')           │
│  ])                                                                 │
│           │                                                         │
│           ▼                                                         │
│  setState({ numProduct, totalSold, topPopular })                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA DISTRIBUTION FLOW                            │
│                                                                     │
│  Widget Components:                                                 │
│  └── state.numProduct.toLocaleString() → "1,234"                    │
│  └── state.totalSold.toLocaleString() → "5,678"                     │
│                                                                     │
│  Most Popular Product Section:                                      │
│  └── state.topPopular[0] (first/most popular item)                  │
│      ├── image → Product Image (200x200)                            │
│      ├── name → Product Title                                       │
│      ├── sku → SKU Value                                            │
│      ├── weight → Weight Value                                      │
│      ├── qty_ordered → Total Ordered This Year                      │
│      └── vendors → Vendor Name                                      │
│                                                                     │
│  Piechart Component:                                                │
│  └── Static Data (NOT connected to state)                           │
│      └── [400, 300, 300, 200] for 4 vendors                        │
│                                                                     │
│  Poptable Component:                                                │
│  └── state.topPopular (full array)                                  │
│      └── Mapped to table rows with 7 columns                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Widget Type Configuration (Products Dashboard)

The Widget component handles two product-specific types:

```javascript
switch (type) {
  case "numproduct":
    data = {
      title: "NUMBER OF PRODUCTS",
      isMoney: false,
      icon: <ShoppingCartOutlinedIcon style={{ color: "purple" }} />
    };
    break;
  case "totalordered":
    data = {
      title: "TOTAL PRODUCTS ORDERED",
      isMoney: false,
      icon: <ShoppingCartOutlinedIcon style={{ color: "purple" }} />
    };
    break;
}
```

---

## 4. Data Flow

### 4.1 API Response Mapping

**Endpoint: /productinfo**
```javascript
// Expected Response
{
  numProduct: 1234,    // Total unique products
  totalSold: 5678      // Total quantity ordered
}
```

**Endpoint: /toppopularproduct**
```javascript
// Expected Response - Array of product objects
[
  {
    sku: "BST-56820-15",
    brand_name: "Bestop",
    vendors: "Keystone",
    name: "Bestop Supertop NX Soft Top",
    image: "https://example.com/product-image.jpg",
    price: 599.99,
    qty_ordered: 150,
    weight: "25.5"
  },
  // ... more products (up to top 10)
]
```

### 4.2 Most Popular Product Display Logic

```javascript
// Access pattern with null safety checks
{state.topPopular[0] && state.topPopular[0].image}     // Image URL
{state.topPopular[0] && state.topPopular[0].name}      // Product Name
{state.topPopular[0] && state.topPopular[0].sku}       // SKU
{state.topPopular[0] && state.topPopular[0].weight}    // Weight
{state.topPopular[0] && state.topPopular[0].qty_ordered}  // Quantity
{state.topPopular[0] && state.topPopular[0].vendors}   // Vendor
```

### 4.3 Pie Chart Static Data Structure

```javascript
// Hardcoded vendor distribution data
const data = [
  { name: "Group A", value: 400 },  // Keystone - Blue (#0088FE)
  { name: "Group B", value: 300 },  // Meyer - Teal (#00C49F)
  { name: "Group C", value: 300 },  // Omix - Yellow (#FFBB28)
  { name: "Group D", value: 200 },  // Quadratec - Orange (#FF8042)
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];
```

### 4.4 Pie Chart Label Calculation

```javascript
// Custom label renderer for pie segments
const renderCustomizedLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent, index
}) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? "start" : "end"}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};
```

---

## 5. Key Functions

### 5.1 useDashboardpoData Hook

| Function/Property | Description | Parameters | Return Value |
|-------------------|-------------|------------|--------------|
| `useDashboardpoData()` | Custom hook managing products dashboard state | None | `{ state }` object with numProduct, totalSold, topPopular |
| `fetchData()` | (Internal) Async function to load data from APIs | None | Updates state via setState |

### 5.2 Component Props

**Widget Component (Shared)**
| Prop | Type | Description |
|------|------|-------------|
| `type` | `string` | Widget type identifier (numproduct, totalordered) |
| `value` | `string` | Formatted value to display |

**Piechart Component**
| Prop | Type | Description |
|------|------|-------------|
| None | - | Currently uses internal static data |

**Poptable Component**
| Prop | Type | Description |
|------|------|-------------|
| `rows` | `Array<Product>` | Array of product objects to display in table |

### 5.3 Poptable Column Mapping

```javascript
// Table column structure
<TableHead>
  <TableCell width="10%">SKU</TableCell>
  <TableCell width="10%">Brand</TableCell>
  <TableCell width="5%">Vender</TableCell>        // Note: Typo in original
  <TableCell width="58%">Name</TableCell>
  <TableCell width="5%">Price</TableCell>
  <TableCell width="7%">Qty Ordered</TableCell>
  <TableCell width="5%">Weight</TableCell>
</TableHead>

// Row mapping
{rows.map((row) => (
  <TableRow key={row.sku}>
    <TableCell>{row.sku}</TableCell>
    <TableCell>{row.brand_name}</TableCell>
    <TableCell>{row.vendors}</TableCell>
    <TableCell>
      <img src={row.image} className="image" />
      {row.name}
    </TableCell>
    <TableCell>
      $<NumericFormat value={row.price} thousandSeparator=","
        displayType="text" decimalScale={2} fixedDecimalScale />
    </TableCell>
    <TableCell>{row.qty_ordered}</TableCell>
    <TableCell>{row.weight}</TableCell>
  </TableRow>
))}
```

---

## 6. Dependencies

### 6.1 External Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.x | Core React framework |
| `axios` | ^1.x | HTTP client for API requests |
| `recharts` | ^2.x | PieChart visualization |
| `react-number-format` | ^5.x | Currency/number formatting in table |
| `@mui/material` | ^5.x | Table, Paper, TableContainer components |
| `@mui/icons-material` | ^5.x | Icon components (ShoppingCartOutlinedIcon) |

### 6.2 Internal Dependencies

| Module | Location | Purpose |
|--------|----------|---------|
| `useDashboardpoData` | `src/hooks/useDashboardData.js` | State management hook |
| `Sidebar` | `src/features/sidebar/Sidebar.jsx` | Navigation component (shared) |
| `Widget` | `src/features/widget/Widget.jsx` | KPI display cards (shared) |

### 6.3 Shared Components

| Component | Shared With | Purpose |
|-----------|-------------|---------|
| `Sidebar` | DashBoard (Orders) | Navigation between dashboards |
| `Widget` | DashBoard (Orders) | KPI display cards |

---

## 7. Known Issues

### 7.1 Critical Issues

1. **API Calls Disabled**: The `useDashboardpoData` hook has all API calls commented out (lines 58-82), resulting in the dashboard displaying only default empty values.

2. **Hardcoded API URLs**: Unlike Orders Dashboard, this dashboard uses hardcoded `localhost:8080` URLs instead of the `VITE_API_URL` environment variable:
   ```javascript
   // Should use: ${API_URL}/productinfo
   axios.get('http://localhost:8080/productinfo')
   axios.get('http://localhost:8080/toppopularproduct')
   ```

3. **Static Pie Chart Data**: The Piechart component uses completely hardcoded static data instead of dynamic vendor distribution from API:
   ```javascript
   const data = [
     { name: "Group A", value: 400 },
     { name: "Group B", value: 300 },
     { name: "Group C", value: 300 },
     { name: "Group D", value: 200 },
   ];
   ```

### 7.2 Minor Issues

4. **Typo in UI - Weight**: "Weight" is misspelled as "Wight" in the Most Popular Product section:
   ```javascript
   <span className="itemKey">Wight:</span>  // Should be "Weight:"
   ```

5. **Typo in Table Header**: "Vendor" is misspelled as "Vender" in the table column header:
   ```javascript
   <TableCell>Vender</TableCell>  // Should be "Vendor"
   ```

6. **No Loading States**: No loading indicators or skeleton screens while data is being fetched.

7. **No Error Handling UI**: While the hook has try-catch for API calls, there's no user-facing error state display.

8. **Fixed Vendor List**: Pie chart legend is hardcoded to four specific vendors (Keystone, Meyer, Omix, Quadratec) with no dynamic generation.

9. **No Pagination**: The top 10 products table has no pagination or sorting capabilities.

10. **No Null Safety in Pie Chart**: If vendor data were to come from API, there's no handling for varying vendor counts.

### 7.3 Technical Debt

11. **Missing TypeScript**: No type definitions for state objects, props, or API responses.

12. **No Memoization**: Table rows are re-rendered on every parent state change without useMemo.

13. **No Data Refresh**: No mechanism for refreshing dashboard data or real-time updates.

14. **Inconsistent Styling Pattern**: Uses both CSS classes and inline sx prop for styling:
   ```javascript
   <Table sx={{ minWidth: 650, fontSize: 20 }} ... >
   ```

15. **Double Nested Try-Catch**: The hook has unnecessary nested try-catch blocks:
   ```javascript
   try {
     const fetchData = async () => {
       try { ... } catch (error) { ... }
     };
   } catch (error) { }  // Outer catch never triggered
   ```

---

## 8. API Contract

### 8.1 Endpoint: GET /productinfo

**Purpose**: Retrieve product catalog metrics

**Response Schema**:
```typescript
interface ProductInfoResponse {
  numProduct: number;   // Total unique products in catalog
  totalSold: number;    // Total quantity of products ordered
}
```

### 8.2 Endpoint: GET /toppopularproduct

**Purpose**: Retrieve top popular products by order quantity

**Response Schema**:
```typescript
interface Product {
  sku: string;           // Stock Keeping Unit
  brand_name: string;    // Brand/manufacturer name
  vendors: string;       // Vendor/supplier name
  name: string;          // Product title/description
  image: string;         // Product image URL
  price: number;         // Product price
  qty_ordered: number;   // Quantity ordered (popularity metric)
  weight: string | number;  // Product weight
}

type TopPopularResponse = Product[];  // Array of up to 10 products
```

### 8.3 Expected Vendor Distribution Endpoint (Not Implemented)

**Proposed Endpoint**: GET /vendorDistribution

```typescript
interface VendorDistribution {
  vendor: string;    // Vendor name
  value: number;     // Order count or revenue
  color?: string;    // Optional color hex code
}

type VendorDistributionResponse = VendorDistribution[];
```

---

## 9. Future Considerations

1. **Enable API Integration**: Uncomment and fix API calls in `useDashboardpoData`:
   - Update to use `API_URL` environment variable
   - Enable `productinfo` and `toppopularproduct` endpoints

2. **Dynamic Pie Chart**:
   - Create new API endpoint for vendor distribution
   - Connect Piechart component to actual vendor data
   - Generate legend dynamically based on vendor count

3. **Fix Typos**:
   - Correct "Wight" to "Weight" in Most Popular section
   - Correct "Vender" to "Vendor" in table header

4. **Add Loading States**: Implement skeleton loaders or spinners during data fetch

5. **Add Error Boundaries**: Graceful error handling with retry options

6. **Enhance Table Features**:
   - Add sorting by any column
   - Add search/filter functionality
   - Implement pagination for larger datasets
   - Add export to CSV functionality

7. **Add Product Detail Drill-down**: Click on product row to view full product details

8. **Configurable Time Periods**: Add date range selection for analytics

9. **Add TypeScript**: Type-safe interfaces for all data structures

10. **Add Interactive Pie Chart**:
    - Click on pie segment to filter table
    - Hover for detailed vendor statistics

11. **Standardize API URL Configuration**: Use environment variable consistently

12. **Remove Debug Code**: Clean up unnecessary nested try-catch blocks
