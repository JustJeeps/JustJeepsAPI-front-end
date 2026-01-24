# Product Requirements Document: Products Dashboard (PO Analytics)

## Document Information

| Field | Value |
|-------|-------|
| Module Name | Products Dashboard (PO Analytics) |
| Version | 1.0.0 |
| Status | Reverse-Engineered |
| Last Updated | 2026-01-22 |
| Architecture | Layered (Presentation Layer) |

---

## 1. Overview

### 1.1 Purpose

The Products Dashboard provides product and purchase order analytics within the JustJeeps order management system. It offers insights into product inventory, popularity metrics, vendor distribution, and detailed product performance data.

### 1.2 Scope

This document describes the implemented features of the Products Dashboard module, including:
- Product count and total ordered metrics
- Most popular product showcase
- Vendor distribution pie chart
- Top 10 popular products table

### 1.3 Entry Point

- **Route**: `/dashboard/po`
- **Component**: `DashBoardPO`
- **Access**: Protected (requires authentication)

---

## 2. User Interface Structure

### 2.1 Layout Architecture

The dashboard follows a multi-section layout:

```
+------------------+---------------------------+---------------------------+
|                  |         TOP LEFT          |        TOP RIGHT          |
|    SIDEBAR       | [# Products] [# Ordered]  |   Orders By Vendors       |
|                  +---------------------------+      [Pie Chart]          |
|   - Orders       |    Most Popular Product   |   [Keystone][Meyer]       |
|   - Products     |    [Image] [Details]      |   [Omix][Quadratec]       |
|                  +-----------------------------------------------------------+
|                  |                    BOTTOM                                  |
|                  |           Top 10 Popular Products Table                    |
|                  |   [SKU | Brand | Vendor | Name | Price | Qty | Weight]    |
+------------------+-----------------------------------------------------------+
```

### 2.2 Component Hierarchy

```
DashBoardPO
├── Sidebar
│   ├── Link: /dashboard (Orders)
│   └── Link: /dashboard/po (Products)
├── Widget (numproduct)
├── Widget (totalordered)
├── Most Popular Product Section
│   ├── Product Image
│   └── Product Details (Name, SKU, Weight, Qty, Vendor)
├── Piechart (Vendor Distribution)
│   └── Legend (Keystone, Meyer, Omix, Quadratec)
└── Poptable (Top 10 Products)
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

The dashboard displays two key performance indicator widgets:

#### 3.2.1 Number of Products Widget

| Property | Value |
|----------|-------|
| Type | `numproduct` |
| Data Source | `state.numProduct` |
| Format | Localized number (comma separators) |
| Icon | ShoppingCartOutlinedIcon (purple) |
| Icon Background | rgba(128, 0, 128, 0.2) |
| Title | "NUMBER OF PRODUCTS" |

#### 3.2.2 Total Products Ordered Widget

| Property | Value |
|----------|-------|
| Type | `totalordered` |
| Data Source | `state.totalSold` |
| Format | Localized number (comma separators) |
| Icon | ShoppingCartOutlinedIcon (purple) |
| Icon Background | rgba(128, 0, 128, 0.2) |
| Title | "TOTAL PRODUCTS ORDERED" |

### 3.3 Most Popular Product Section

| Feature | Description |
|---------|-------------|
| Purpose | Showcases the #1 most popular product |
| Data Source | `state.topPopular[0]` (first item in array) |
| Container Style | Box shadow panel, 20px padding |

**Displayed Product Details**:

| Field | Data Key | Description |
|-------|----------|-------------|
| Product Image | `image` | 200x200px product thumbnail |
| Product Name | `name` | Product title/description |
| SKU | `sku` | Stock keeping unit |
| Weight | `weight` | Product weight (note: typo as "Wight" in UI) |
| Total Ordered This Year | `qty_ordered` | Quantity ordered in current year |
| Vendor | `vendors` | Supplier/vendor name |

### 3.4 Vendor Distribution Pie Chart

| Feature | Description |
|---------|-------------|
| Purpose | Visualizes order distribution across vendors |
| Library | Recharts (PieChart) |
| Aspect Ratio | 2.8:1 |
| Outer Radius | 120px |
| Label Type | Percentage inside segments |

**Static Data** (Currently Hardcoded):

| Segment | Value | Color |
|---------|-------|-------|
| Group A (Keystone) | 400 | #0088FE (Blue) |
| Group B (Meyer) | 300 | #00C49F (Teal) |
| Group C (Omix) | 300 | #FFBB28 (Yellow) |
| Group D (Quadratec) | 200 | #FF8042 (Orange) |

**Legend**:
- Keystone (Blue - #0088FE)
- Meyer (Teal - #00C49F)
- Omix (Yellow - #FFBB28)
- Quadratec (Orange - #FF8042)

### 3.5 Top 10 Popular Products Table

| Feature | Description |
|---------|-------------|
| Purpose | Displays detailed list of top 10 products by popularity |
| Component | MUI Table (not DataGrid) |
| Data Source | `state.topPopular` |
| Header Style | Yellow background (#FAEA48) |

**Column Definitions**:

| Column | Header | Width | Format |
|--------|--------|-------|--------|
| `sku` | SKU | 10% | Raw text |
| `brand_name` | Brand | 10% | Raw text |
| `vendors` | Vender | 5% | Raw text |
| `name` | Name | 58% | Image thumbnail (32x32) + text |
| `price` | Price | 5% | NumericFormat ($X,XXX.XX) |
| `qty_ordered` | Qty Ordered | 7% | Raw number |
| `weight` | Weight | 5% | Raw text |

---

## 4. Data Management

### 4.1 Custom Hook: useDashboardpoData

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `numProduct` | number | 0 | Total number of unique products |
| `totalSold` | number | 0 | Total quantity of products sold/ordered |
| `topPopular` | array | [] | Array of top popular product objects |

### 4.2 API Endpoints (Commented Out)

The following endpoints are configured but currently disabled:

| Endpoint | Purpose |
|----------|---------|
| `http://localhost:8080/productinfo` | Fetches product count and total sold |
| `http://localhost:8080/toppopularproduct` | Fetches top popular products array |

### 4.3 Expected Product Data Structure

```javascript
{
  sku: string,           // Product SKU
  brand_name: string,    // Brand name
  vendors: string,       // Vendor name
  name: string,          // Product name/description
  image: string,         // Image URL
  price: number,         // Product price
  qty_ordered: number,   // Quantity ordered
  weight: string/number  // Product weight
}
```

---

## 5. Styling Specifications

### 5.1 Dashboard Container

| Property | Value |
|----------|-------|
| Display | Flex |
| Font Family | 'Nunito', sans-serif |
| Top Margin | 140px (accounts for fixed navbar) |
| Container Flex | 8 (relative to sidebar's 1) |

### 5.2 Top Section Layout

| Property | Value |
|----------|-------|
| Display | Flex |
| Padding | 20px |
| Gap | 20px |
| Left/Right Flex | 1:1 |

### 5.3 Most Popular Product Section

| Property | Value |
|----------|-------|
| Box Shadow | 2px 4px 10px 1px rgba(201, 201, 201, 0.47) |
| Padding | 20px |
| Title Font Size | 36px |
| Title Color | rgb(158, 158, 158) |
| Image Size | 200x200px |
| Detail Font Size | 18px |

### 5.4 Right Container (Pie Chart)

| Property | Value |
|----------|-------|
| Box Shadow | 2px 4px 10px 1px rgba(201, 201, 201, 0.47) |
| Padding | 20px |
| Height | 423px |
| Title Font Size | 36px |
| Title Color | rgb(158, 158, 158) |

### 5.5 Bottom Section (Table)

| Property | Value |
|----------|-------|
| Box Shadow | 2px 4px 10px 1px rgba(201, 201, 201, 0.47) |
| Padding | 20px |
| Margin | 20px |
| Title Font Size | 30px |
| Title Color | gray |
| Header Background | #FAEA48 (yellow) |

### 5.6 Table Image Styling

| Property | Value |
|----------|-------|
| Width | 32px |
| Height | 32px |
| Border Radius | 50% (circular) |
| Margin Right | 10px |
| Object Fit | cover |

---

## 6. Dependencies

### 6.1 External Libraries

| Library | Purpose |
|---------|---------|
| react-router-dom | Navigation |
| @mui/icons-material | Material icons (StoreIcon, CreditCardIcon) |
| @mui/material | Table components |
| recharts | PieChart visualization |
| react-number-format | Currency formatting in table |

### 6.2 Internal Dependencies

| Module | Purpose |
|--------|---------|
| `useDashboardpoData` hook | State management for product dashboard data |
| Sidebar component | Navigation sidebar (shared with Orders Dashboard) |
| Widget component | KPI display (shared component) |

---

## 7. File Structure

```
src/
├── features/
│   ├── dashboard/
│   │   ├── DashBoardPO.jsx      # Main products dashboard component
│   │   └── dashboardpo.scss     # Products dashboard styling
│   ├── sidebar/
│   │   ├── Sidebar.jsx          # Navigation sidebar (shared)
│   │   └── sidebar.scss         # Sidebar styling
│   ├── widget/
│   │   ├── Widget.jsx           # KPI widget component (shared)
│   │   └── widget.scss          # Widget styling
│   ├── pie/
│   │   ├── Piechart.jsx         # Pie chart component
│   │   └── piechart.scss        # Pie chart styling
│   └── table/
│       ├── Poptable.jsx         # Popular products table
│       └── poptable.scss        # Table styling
└── hooks/
    └── useDashboardData.js      # Contains useDashboardpoData hook
```

---

## 8. Known Limitations

1. **Static Pie Chart Data**: The Piechart component uses hardcoded static data instead of dynamic vendor distribution data from the API.

2. **API Endpoints Disabled**: The `useDashboardpoData` hook has API calls commented out, meaning the dashboard currently displays default/empty values.

3. **Hardcoded Localhost URL**: Unlike Orders Dashboard, the Products Dashboard API URLs are hardcoded to `localhost:8080` instead of using the environment variable.

4. **Typo in UI**: "Weight" is misspelled as "Wight" in the Most Popular Product section.

5. **Typo in Table Header**: "Vendor" is misspelled as "Vender" in the table column header.

6. **No Loading States**: No loading indicators or skeleton screens while data is being fetched.

7. **No Error Handling UI**: No user-facing error states for failed API calls.

8. **Fixed Vendor List**: Pie chart legend is hardcoded to four specific vendors (Keystone, Meyer, Omix, Quadratec).

9. **No Pagination on Table**: The top 10 products table has no pagination or sorting capabilities.

---

## 9. Shared Components

The following components are shared with the Orders Dashboard:

| Component | Location | Usage |
|-----------|----------|-------|
| Sidebar | `src/features/sidebar/` | Navigation menu |
| Widget | `src/features/widget/` | KPI display cards |

---

## 10. Future Considerations

1. **Enable API Integration**: Uncomment and fix API calls in `useDashboardpoData`:
   - Update to use `API_URL` environment variable
   - Enable `productinfo` and `toppopularproduct` endpoints

2. **Dynamic Pie Chart**: Connect pie chart to actual vendor distribution API data

3. **Fix Typos**: Correct "Wight" to "Weight" and "Vender" to "Vendor"

4. **Add Loading States**: Implement skeleton loaders or spinners during data fetch

5. **Add Error Boundaries**: Graceful error handling with retry options

6. **Enhance Table Features**:
   - Add sorting by any column
   - Add search/filter functionality
   - Implement pagination for larger datasets

7. **Add Product Detail Drill-down**: Click on product row to view full product details

8. **Configurable Time Periods**: Add date range selection for analytics

9. **Export Functionality**: Allow exporting product data to CSV/Excel

10. **Dynamic Vendor Colors**: Generate legend dynamically based on actual vendor data
