# Design Document: Product/Items Search & Vendor Management Component

**Version**: 1.0
**Status**: Current Implementation
**Last Updated**: 2026-01-22
**Parent PRD**: [product-management.md](../prd/product-management.md)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Component Design](#3-component-design)
4. [Data Models](#4-data-models)
5. [Search Algorithms](#5-search-algorithms)
6. [Data Flows](#6-data-flows)
7. [API Integration](#7-api-integration)
8. [Vendor Link Generation](#8-vendor-link-generation)
9. [Margin Calculation Engine](#9-margin-calculation-engine)
10. [Excel Export System](#10-excel-export-system)
11. [UI/UX Design](#11-uiux-design)
12. [Performance Optimizations](#12-performance-optimizations)
13. [Dependencies](#13-dependencies)
14. [Future Considerations](#14-future-considerations)

---

## 1. Overview

### 1.1 Purpose

This design document details the technical architecture of the Product/Items Search & Vendor Management component, which serves as the primary product catalog interface for JustJeeps operations staff. The component enables SKU and brand-based product search across 300+ brands, provides vendor cost comparison with margin calculation, displays real-time inventory status, tracks competitor pricing, and supports Excel data export.

### 1.2 Scope

**Primary Files**:
- `/src/features/items/Items.jsx` - Main container component (2,338 lines)
- `/src/features/items/ProductTable.jsx` - Order popup product table (796 lines)
- `/src/features/items/items.scss` - Component styling (139 lines)

**Capabilities**:
- SKU-based product search with case-insensitive and dash-insensitive matching
- Brand-based product filtering across 300+ manufacturers
- Multi-vendor cost comparison (Meyer, Keystone, Omix, Quadratec, WheelPros, Rough Country, etc.)
- Real-time margin calculation with currency conversion (CAD/USD)
- Vendor inventory status display (numeric and string formats)
- Competitor price tracking (Northridge 4x4, Parts Engine, TDOT, etc.)
- Resizable table columns using react-resizable
- Excel export functionality via ExcelJS
- Black Friday/promotional pricing support

### 1.3 Design Principles

1. **Client-Side Search Performance**: Products cached locally after first load to enable instant filtering
2. **Visual Decision Support**: Color-coded margins and inventory for quick scanning
3. **Vendor Portal Integration**: Direct hyperlinks to vendor systems for streamlined ordering
4. **Flexible Data Export**: Comprehensive Excel export for offline analysis

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Application Layer                           │
├─────────────────────────────────────────────────────────────────────┤
│  App.jsx                                                             │
│    └── React Router v6                                               │
│         ├── /items → Items.jsx (Main Product Search)                 │
│         └── /orders → OrderTable.jsx                                 │
│                         └── Popup → ProductTable.jsx                 │
├─────────────────────────────────────────────────────────────────────┤
│                         Component Layer                              │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌─────────────────────┐                 │
│  │     Items.jsx       │    │   ProductTable.jsx   │                │
│  │  (Main Container)   │    │  (Order Integration) │                │
│  ├─────────────────────┤    ├─────────────────────┤                │
│  │ - Search Controls   │    │ - Vendor Selection   │                │
│  │ - Brand Autocomplete│    │ - Margin Display     │                │
│  │ - Product Table     │    │ - Inventory Status   │                │
│  │ - Statistics        │    │ - Currency Support   │                │
│  │ - Excel Export      │    │                      │                │
│  └─────────────────────┘    └─────────────────────┘                │
├─────────────────────────────────────────────────────────────────────┤
│                          Service Layer                               │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌─────────────────────┐                 │
│  │   Axios HTTP        │    │   ExcelJS Export    │                │
│  │   - GET /api/...    │    │   - Workbook Gen    │                │
│  │   - POST /api/...   │    │   - file-saver      │                │
│  └─────────────────────┘    └─────────────────────┘                │
├─────────────────────────────────────────────────────────────────────┤
│                          Backend API                                 │
├─────────────────────────────────────────────────────────────────────┤
│  Express Server (Port 8080)                                          │
│  - /api/products_sku                                                 │
│  - /api/products                                                     │
│  - /api/products/:sku                                                │
│  - /api/order_products/:id/edit/selected_supplier                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Directory Structure

```
src/features/items/
├── Items.jsx                # Main container component
│   ├── ResizableTitle      # Inline component for column resizing
│   ├── productMatches()    # Search matching algorithm
│   ├── transformData()     # Data transformation for export
│   ├── exportToExcel()     # Brand export function
│   └── exportToExcelAllProducts()  # Full export function
│
├── ProductTable.jsx         # Reusable table for order popups
│   ├── columns_by_sku      # Column definitions
│   └── handleVendorCostClick()  # Vendor selection handler
│
└── items.scss              # Component-specific styles
    ├── .items              # Main layout container
    ├── .sidebar            # Search controls sidebar
    ├── .explore-content    # Table display area
    ├── .brand-statistic    # Statistics widgets
    └── .widget             # Individual stat cards
```

---

## 3. Component Design

### 3.1 Items.jsx - Main Container Component

**Purpose**: Primary product search interface with two search modes (SKU and Brand)

**Component Structure**:
```jsx
Items
├── Sidebar (flex: 1.4)
│   ├── FormControl (Search Mode Selector)
│   │   └── Select: ["sku", "brand"]
│   │
│   └── Conditional Search Input
│       ├── TextField (SKU Search)
│       └── Autocomplete (Brand Search)
│           └── Export Buttons
│
└── Main Content (flex: 8)
    ├── Conditional: SKU Search View
    │   └── Table (columns_by_sku)
    │
    └── Conditional: Brand Search View
        ├── Statistics Widgets (4 cards)
        └── Table (columns_by_sku with pagination)
```

**State Management**:
```javascript
// Search State
const [searchBy, setSearchBy] = useState("sku");      // Mode: "sku" | "brand"
const [typedSku, setTypedSku] = useState("");         // Current SKU query
const [searchTermSku, setSearchTermSku] = useState(""); // Selected search term

// Data State
const [data, setData] = useState([]);                 // Displayed products (SKU search)
const [brandData, setBrandData] = useState([]);       // Brand-filtered products
const [allProducts, setAllProducts] = useState([]);   // Cached all products
const [sku, setSku] = useState([]);                   // All SKUs for autocomplete
const [allLoaded, setAllLoaded] = useState(false);    // Cache status flag

// UI State
const [loading, setLoading] = useState(false);        // Loading indicator
const [discount, setDiscount] = useState("1");        // Promotion discount %
```

### 3.2 ProductTable.jsx - Order Integration Component

**Purpose**: Embedded product table for order popup windows with vendor selection capability

**Props Interface**:
```typescript
interface ProductTableProps {
  data: Product[];           // Products to display
  orderProductId: string;    // Order product ID for vendor selection
  orderProductPrice: number; // Selling price for margin calculation
  currency: 'CAD' | 'USD';   // Currency for cost conversion
}
```

**State Management**:
```javascript
const [selectedVendorCost, setSelectedVendorCost] = useState(null);
```

**Key Difference from Items.jsx**:
- Receives data via props instead of fetching
- Supports currency-aware margin calculation
- Includes vendor selection checkbox that triggers API call
- No search functionality (pre-filtered data)

### 3.3 ResizableTitle - Inline Component

**Purpose**: Enable column width adjustment via drag handle

**Implementation**:
```jsx
const ResizableTitle = (props) => {
  const { onResize, width, ...restProps } = props;
  if (!width) return <th {...restProps} />;
  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          className="react-resizable-handle"
          onClick={e => e.stopPropagation()}
        />
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
};
```

---

## 4. Data Models

### 4.1 Product Object

```typescript
interface Product {
  // Core Identification
  sku: string;                    // e.g., "BST-56820-15"
  searchable_sku: string;         // Manufacturer SKU without prefix
  jj_prefix: string;              // Brand prefix (e.g., "BST")

  // Product Information
  name: string;                   // Full product name
  brand_name: string;             // Manufacturer name
  image: string | null;           // Product image URL
  url_path: string;               // Product page URL

  // Pricing
  price: number;                  // Selling price in CAD
  MAP: string | null;             // Minimum Advertised Price
  black_friday_sale: string | null; // Discount tier (e.g., "15%off")

  // Status
  status: number;                 // 1 = enabled, 2 = disabled

  // Physical Attributes
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  shippingFreight: number | null; // BIS (Built-In Shipping)

  // Meyer-Specific Dimensions
  meyer_weight: number | null;
  meyer_length: number | null;
  meyer_width: number | null;
  meyer_height: number | null;

  // Vendor Integration Codes
  keystone_code: string | null;
  keystone_code_site: string | null;
  partsEngine_code: string | null;
  tdot_url: string | null;
  partStatus_meyer: string | null;

  // Metadata
  vendors: string;                // Comma-separated vendor names
  part: string | null;
  thumbnail: string | null;

  // Related Data
  vendorProducts: VendorProduct[];
  competitorProducts: CompetitorProduct[];
}
```

### 4.2 VendorProduct Object

```typescript
interface VendorProduct {
  id: number;
  product_sku: string;           // JJ SKU reference
  vendor_sku: string;            // Vendor's SKU for this product
  vendor_cost: number;           // Cost in CAD
  vendor_inventory: number | null;       // Numeric inventory count
  vendor_inventory_string: string | null; // Text inventory (e.g., "CAD: 5 / US: 10")
  quadratec_sku: string | null;  // Quadratec-specific SKU

  vendor: {
    name: string;                // Vendor name (e.g., "Meyer", "Keystone")
  };
}
```

### 4.3 CompetitorProduct Object

```typescript
interface CompetitorProduct {
  id: number;
  competitor_price: number;      // Competitor's selling price
  product_url: string;           // URL to competitor's product page

  competitor: {
    name: string;                // Competitor name (e.g., "Northridge 4x4")
  };
}
```

### 4.4 Brand Object (Static List)

```typescript
interface Brand {
  brand_name: string;            // e.g., "BESTOP", "Rough Country"
}

// Static list of 300+ brands defined in Items.jsx (lines 1934-2337)
const brands: Brand[] = [
  { brand_name: "4WP" },
  { brand_name: "Attica 4x4" },
  // ... 300+ entries
  { brand_name: "Zone Offroad" }
];
```

---

## 5. Search Algorithms

### 5.1 SKU Search Algorithm (productMatches)

**Location**: `Items.jsx` lines 44-69

**Algorithm Design**:
```javascript
// Text normalizers for flexible matching
const toUpper = (s) => (s ?? "").toString().toUpperCase();
const flat = (s) => toUpper(s).replace(/[^A-Z0-9]/g, "");

const productMatches = (product, query) => {
  // Skip SKUs ending with dash (incomplete/invalid)
  if (product.sku && product.sku.trim().endsWith("-")) return false;

  // Fields to search against
  const fields = [
    product.sku,
    product.searchable_sku,
    ...(Array.isArray(product.vendorProducts)
      ? product.vendorProducts.map((vp) => vp.vendor_sku)
      : []),
  ];

  const Q = toUpper(query);      // Uppercase query
  const QF = flat(query);        // Alphanumeric-only query

  return fields.some((field) => {
    if (!field) return false;
    const F = toUpper(field);    // Uppercase field
    const FF = flat(field);      // Alphanumeric-only field

    // Match if either:
    // 1. Uppercase field contains uppercase query
    // 2. Flattened field contains flattened query
    return F.includes(Q) || FF.includes(QF);
  });
};
```

**Search Characteristics**:
| Feature | Implementation |
|---------|----------------|
| Case-insensitive | `toUpper()` normalizes to uppercase |
| Dash-insensitive | `flat()` removes non-alphanumeric characters |
| Multi-field search | Searches SKU, searchable_sku, and all vendor SKUs |
| Invalid SKU filter | Skips SKUs ending with "-" |
| Partial matching | Uses `includes()` for substring matching |

### 5.2 Brand Search Algorithm

**Location**: `Items.jsx` lines 96-103

```javascript
function getProductsByBrand(products, brandName) {
  return products.filter(
    (product) =>
      product.brand_name === brandName &&  // Exact brand match
      product.status === 1 &&               // Only enabled products
      product.price !== 0                   // Exclude zero-priced items
  );
}
```

**Filter Criteria**:
1. Exact brand name match (case-sensitive)
2. Product status = 1 (enabled)
3. Price > 0 (excludes placeholder products)

### 5.3 Debounced Search Execution

**Location**: `Items.jsx` lines 564-591

```javascript
useEffect(() => {
  const q = (typedSku || "").trim();
  if (!q) {
    setData([]);
    setLoading(false);
    return;
  }

  setLoading(true);  // Show spinner immediately

  const timeout = setTimeout(async () => {
    try {
      // Load all products if not cached
      if (!allLoaded || !Array.isArray(allProducts) || allProducts.length === 0) {
        const res = await axios.get(`${API_URL}/api/products`);
        setAllProducts(res.data || []);
        setAllLoaded(true);
        const filtered = (res.data || []).filter(p => productMatches(p, q));
        setData(filtered.slice(0, 150));  // Limit to 150 results
      } else {
        // Use cached products
        const filtered = allProducts.filter(p => productMatches(p, q));
        setData(filtered.slice(0, 150));
      }
    } catch (err) {
      console.error("Partial search failed:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, 400);  // 400ms debounce delay

  return () => clearTimeout(timeout);  // Cleanup on re-render
}, [typedSku, allLoaded, allProducts, API_URL]);
```

**Debounce Strategy**:
- 400ms delay before search execution
- Immediate loading state feedback
- Cleanup function cancels pending timeouts
- Results capped at 150 for performance

---

## 6. Data Flows

### 6.1 Initial Load Flow

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Component  │     │   useEffect     │     │     API         │
│   Mount     │────>│  (empty deps)   │────>│ /api/products_  │
│             │     │                 │     │      sku        │
└─────────────┘     └─────────────────┘     └─────────────────┘
                                                    │
                                                    v
                    ┌─────────────────┐     ┌─────────────────┐
                    │   State Update  │<────│  Response Data  │
                    │   setSku([...]) │     │  (all SKUs)     │
                    └─────────────────┘     └─────────────────┘
```

### 6.2 SKU Search Flow

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   User      │     │   onChange      │     │    State        │
│   Types     │────>│   Handler       │────>│ setTypedSku()   │
│   SKU       │     │                 │     │ setLoading(true)│
└─────────────┘     └─────────────────┘     └─────────────────┘
                                                    │
                                                    v
┌─────────────────────────────────────────────────────────────────┐
│                      useEffect (400ms debounce)                  │
├─────────────────────────────────────────────────────────────────┤
│  1. Check if allProducts cached                                  │
│     ├── NO: Fetch GET /api/products                             │
│     │       setAllProducts(response)                            │
│     │       setAllLoaded(true)                                  │
│     └── YES: Use cached allProducts                             │
│                                                                  │
│  2. Filter products: allProducts.filter(productMatches)          │
│                                                                  │
│  3. Limit results: filtered.slice(0, 150)                        │
│                                                                  │
│  4. Update state: setData(limitedResults)                        │
│                   setLoading(false)                              │
└─────────────────────────────────────────────────────────────────┘
                                                    │
                                                    v
                    ┌─────────────────┐     ┌─────────────────┐
                    │   Table         │     │   Filtered      │
                    │   Re-render     │<────│   Product Data  │
                    └─────────────────┘     └─────────────────┘
```

### 6.3 Brand Search Flow

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   User      │     │   Autocomplete  │     │    State        │
│   Selects   │────>│   onChange      │────>│ setSearchTermSku│
│   Brand     │     │                 │     │ setLoading(true)│
└─────────────┘     └─────────────────┘     └─────────────────┘
                                                    │
                                                    v
┌─────────────────────────────────────────────────────────────────┐
│                      useEffect (searchTermSku dep)               │
├─────────────────────────────────────────────────────────────────┤
│  1. Check searchTermSku.brand_name exists                        │
│                                                                  │
│  2. Fetch GET /api/products (all products)                       │
│                                                                  │
│  3. Store in setAllProducts(response)                            │
│                                                                  │
│  4. Filter: getProductsByBrand(response, brand_name)             │
│     - brand_name match                                           │
│     - status === 1                                               │
│     - price !== 0                                                │
│                                                                  │
│  5. Update: setBrandData(filtered)                               │
│             setLoading(false)                                    │
└─────────────────────────────────────────────────────────────────┘
                                                    │
                                                    v
┌─────────────────────────────────────────────────────────────────┐
│                      Statistics Calculation                      │
├─────────────────────────────────────────────────────────────────┤
│  const prices = brandData.map(p => p.price);                     │
│  const minPrice = Math.min(...prices);                           │
│  const maxPrice = Math.max(...prices);                           │
│  const totalPrice = brandData.reduce((acc, p) => acc + p.price); │
│  const averagePrice = totalPrice / brandData.length;             │
└─────────────────────────────────────────────────────────────────┘
                                                    │
                                                    v
                    ┌─────────────────┐     ┌─────────────────┐
                    │  Statistics     │     │   Table with    │
                    │  Widgets        │     │   Brand Data    │
                    └─────────────────┘     └─────────────────┘
```

### 6.4 Vendor Selection Flow (ProductTable)

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   User      │     │   Checkbox      │     │   Handler       │
│   Clicks    │────>│   onChange      │────>│ handleVendor    │
│   Checkbox  │     │                 │     │ CostClick()     │
└─────────────┘     └─────────────────┘     └─────────────────┘
                                                    │
                                                    v
┌─────────────────────────────────────────────────────────────────┐
│                    handleVendorCostClick(vendorProduct)          │
├─────────────────────────────────────────────────────────────────┤
│  1. Log vendor product details                                   │
│                                                                  │
│  2. Update local state: setSelectedVendorCost(vendor_cost)       │
│                                                                  │
│  3. POST /order_products/{orderProductId}/edit/selected_supplier │
│     Body: {                                                      │
│       selected_supplier_cost: vendor_cost.toString(),            │
│       selected_supplier: vendor.name                             │
│     }                                                            │
│                                                                  │
│  4. Log response or error                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. API Integration

### 7.1 API Configuration

```javascript
const API_URL = import.meta.env.VITE_API_URL;  // Environment variable
// Development: Vite proxy forwards /api to localhost:8080
// Production: Full backend URL
```

### 7.2 Endpoint Specifications

| Method | Endpoint | Purpose | Response |
|--------|----------|---------|----------|
| GET | `/api/products_sku` | Fetch all SKUs for autocomplete | `[{ sku: string }]` |
| GET | `/api/products` | Fetch all products with relations | `Product[]` |
| GET | `/api/products/{sku}` | Fetch single product by SKU | `Product` |
| POST | `/api/order_products/{id}/edit/selected_supplier` | Update vendor selection | `OrderProduct` |

### 7.3 Request/Response Patterns

**GET /api/products Response Structure**:
```json
[
  {
    "sku": "BST-56820-35",
    "name": "BESTOP Trektop NX...",
    "brand_name": "BESTOP",
    "price": 1417.95,
    "status": 1,
    "image": "https://...",
    "url_path": "https://...",
    "vendorProducts": [
      {
        "id": 12345,
        "product_sku": "BST-56820-35",
        "vendor_sku": "BES56820-35",
        "vendor_cost": 1003.57,
        "vendor_inventory": 97,
        "vendor": { "name": "Meyer" }
      }
    ],
    "competitorProducts": [
      {
        "id": 67890,
        "competitor_price": 1205.99,
        "competitor": { "name": "Northridge 4x4" }
      }
    ]
  }
]
```

**POST /order_products/{id}/edit/selected_supplier Request**:
```json
{
  "selected_supplier_cost": "1003.57",
  "selected_supplier": "Meyer"
}
```

---

## 8. Vendor Link Generation

### 8.1 Vendor Link Mapping

The system generates direct links to vendor portals based on vendor name and available identifiers.

**Location**: `Items.jsx` lines 770-844, `ProductTable.jsx` lines 357-447

```javascript
// Vendor link generation logic
const generateVendorLink = (vendorName, record, vendorProduct) => {
  const vendorNameLower = vendorName.toLowerCase();
  const vendorSKU = vendorProduct.vendor_sku?.trim();
  const productSKU = vendorProduct.product_sku?.trim();

  switch (vendorNameLower) {
    case 'meyer':
      return `https://online.meyerdistributing.com/parts/details/${vendorSKU}`;

    case 'omix':
      return `https://omixdealer.com/product-detail/${vendorSKU}`;

    case 'quadratec':
      const quadCode = productSKU?.includes('-')
        ? productSKU.split('-').slice(1).join('-')
        : productSKU;
      return `https://www.quadratecwholesale.com/catalogsearch/result/?q=${quadCode}`;

    case 'tire discounter':
      return `https://www.tdgaccess.ca/Catalog/Search/1?search=${vendorSKU}`;

    case 'keystone':
      // Complex logic for Keystone code formatting
      const rawKCode = record.keystone_code?.trim();
      let pid;
      if (rawKCode?.startsWith('Y11') || rawKCode?.startsWith('RGA') || rawKCode?.startsWith('AVS')) {
        pid = rawKCode;
      } else {
        let ks = record.keystone_code_site?.trim();
        if (ks?.startsWith('BES')) {
          ks = ks.replace(/(\d{2})$/, '-$1');  // Insert dash before last 2 digits
        }
        pid = ks;
      }
      return pid ? `https://wwwsc.ekeystone.com/Search/Detail?pid=${pid}` : null;

    case 'wheelpros':
    case 'wheel pros':
      return `https://dl.wheelpros.com/ca_en/ymm/search/?api-type=products&p=1&pageSize=24&q=${vendorSKU}&inventorylocations=AL`;

    case 'rough country':
    case 'roughcountry':
      return vendorSKU
        ? `https://www.roughcountry.com/search/${encodeURIComponent(vendorSKU)}`
        : null;

    case 'ctp':
    case 'ctp distributors':
      const searchableSku = record.searchable_sku?.trim();
      return searchableSku
        ? `https://www.ctpdistributors.com/search-parts?find=${encodeURIComponent(searchableSku)}`
        : null;

    case 'curt':
      // Brand-specific subdomain routing
      const brandNameLower = record.brand_name?.toLowerCase();
      const searchSku = record.searchable_sku?.trim();
      if (!searchSku) return null;

      if (brandNameLower?.includes('luverne'))
        return `https://www.luvernetruck.com/part/${encodeURIComponent(searchSku)}`;
      if (brandNameLower === 'aries automotive')
        return `https://www.ariesautomotive.com/part/${encodeURIComponent(searchSku)}`;
      if (brandNameLower === 'curt manufacturing')
        return `https://www.curtmfg.com/part/${encodeURIComponent(searchSku)}`;
      if (brandNameLower?.includes('uws'))
        return `https://www.uwsta.com/part/${encodeURIComponent(searchSku)}`;
      return null;

    case 't14':
    case 'turn14':
      return vendorSKU
        ? `https://turn14.com/search/index.php?vmmPart=${encodeURIComponent(vendorSKU)}`
        : null;

    case 'metalcloak':
      const metalCloakCode = vendorSKU?.replace(/^MTK-/, '');  // Remove MTK- prefix
      return metalCloakCode
        ? `https://jobber.metalcloak.com/catalogsearch/result/?q=${encodeURIComponent(metalCloakCode)}`
        : null;

    default:
      return null;
  }
};
```

### 8.2 Competitor Link Mapping

**Location**: `Items.jsx` lines 1289-1355, `ProductTable.jsx` lines 123-186

```javascript
const generateCompetitorLink = (competitorName, record) => {
  const name = competitorName.toLowerCase();

  if (name.includes('parts') && name.includes('engine')) {
    const code = record.partsEngine_code || record.partsengine_code;
    if (code?.startsWith('http')) return code;  // Already a URL
    const sku = record.sku?.includes('-')
      ? record.sku.split('-').slice(1).join('-')
      : record.sku;
    return code
      ? `https://www.partsengine.ca/Search/?q=${encodeURIComponent(code)}`
      : `https://www.partsengine.ca/Search/?q=${encodeURIComponent(sku)}`;
  }

  if (name.includes('quadratec') && record.quadratec_code) {
    return `https://www.quadratec.com/search?keywords=${encodeURIComponent(record.quadratec_code)}`;
  }

  if (name.includes('extremeterrain')) {
    const sku = record.sku?.includes('-')
      ? record.sku.split('-').slice(1).join('-')
      : record.sku;
    return `https://www.extremeterrain.com/searchresults.html?q=${encodeURIComponent(sku)}`;
  }

  if (name.includes('morris')) {
    const sku = record.sku?.includes('-')
      ? record.sku.split('-').slice(1).join('-')
      : record.sku;
    return `https://www.morris4x4center.com/search.php?search_query=${encodeURIComponent(sku)}`;
  }

  if (name.includes('4wp') || name.includes('4 wheel parts')) {
    const sku = record.sku?.includes('-')
      ? record.sku.split('-').slice(1).join('-')
      : record.sku;
    return `https://www.4wheelparts.com/search/?Ntt=${encodeURIComponent(sku)}`;
  }

  if (name.includes('northridge')) {
    const sku = record.sku?.includes('-')
      ? record.sku.split('-').slice(1).join('-')
      : record.sku;
    return `https://www.northridge4x4.ca/search?q=${encodeURIComponent(sku)}`;
  }

  return null;
};
```

---

## 9. Margin Calculation Engine

### 9.1 Margin Formula

```
Margin % = ((Selling Price - Vendor Cost) / Vendor Cost) * 100
```

### 9.2 Currency Conversion

```javascript
// Fixed exchange rate: CAD to USD
const EXCHANGE_RATE = 1.5;

// Convert CAD cost to USD
const usdCost = cadCost / EXCHANGE_RATE;

// When currency is USD, adjust cost for margin calculation
const adjustedCost = props.currency === 'USD'
  ? vendorCost / EXCHANGE_RATE
  : vendorCost;
```

### 9.3 Black Friday Discount Application

**Location**: `Items.jsx` lines 686-709, 1092-1114

```javascript
const applyBlackFridayDiscount = (price, record) => {
  let discountPercent = 0;

  if (record.black_friday_sale) {
    const saleValue = record.black_friday_sale.toLowerCase();
    if (saleValue.includes('15%off')) discountPercent = 15;
    else if (saleValue.includes('20%off')) discountPercent = 20;
    else if (saleValue.includes('25%off')) discountPercent = 25;
    else if (saleValue.includes('30%off')) discountPercent = 30;
  }

  return discountPercent > 0
    ? parseFloat(price) * (1 - discountPercent / 100)
    : parseFloat(price);
};
```

### 9.4 Margin Color Coding

```javascript
// Visual margin thresholds
const GOOD_MARGIN_THRESHOLD = 18;  // Used in suggested vendor
const EXCELLENT_MARGIN_THRESHOLD = 19;  // Used in vendor info display

// Color application
const marginColor = margin > threshold ? '#52c41a' : '#ff4d4f';  // green : red
// Alternate: '#1f8e24' (darker green) : '#f63535' (bright red)
```

### 9.5 Suggested Vendor Algorithm

**Location**: `ProductTable.jsx` lines 189-238

```javascript
const findSuggestedVendor = (vendorProducts, orderProductPrice, currency) => {
  // Step 1: Filter to vendors with inventory
  const vendorsWithInventory = vendorProducts.filter(
    (vp) => vp.vendor_inventory > 0
  );

  if (vendorsWithInventory.length === 0) return null;

  // Step 2: Find lowest cost vendor
  const minVendorProduct = vendorsWithInventory.reduce((min, curr) => {
    return curr.vendor_cost < min.vendor_cost ? curr : min;
  }, vendorsWithInventory[0]);

  // Step 3: Adjust cost for currency
  const adjustedCost = currency === 'USD'
    ? minVendorProduct.vendor_cost / 1.5
    : minVendorProduct.vendor_cost;

  // Step 4: Calculate margin
  const margin = ((orderProductPrice - adjustedCost) / adjustedCost) * 100;

  return {
    vendor: minVendorProduct,
    margin,
    borderColor: margin > 18 ? "green" : "red"
  };
};
```

---

## 10. Excel Export System

### 10.1 Export Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Export Button  │────>│   ExcelJS       │────>│   file-saver    │
│  Click Handler  │     │   Workbook      │     │   saveAs()      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               v
                        ┌─────────────────┐
                        │  ProductData    │
                        │    .xlsx        │
                        └─────────────────┘
```

### 10.2 Brand Export (exportToExcel)

**Location**: `Items.jsx` lines 176-244

**Column Definitions**:
```javascript
const brandExportColumns = [
  { header: "SKU", key: "sku" },
  { header: "Name", key: "name" },
  { header: "URL", key: "url_path" },
  { header: "Status", key: "status" },
  { header: "Price", key: "price" },
  { header: "Searchable SKU", key: "searchable_sku" },
  { header: "JJ Prefix", key: "jj_prefix" },
  { header: "Image URL", key: "image" },
  { header: "Brand Name", key: "brand_name" },
  { header: "Vendors", key: "vendors" },
  { header: "Meyer Cost", key: "meyer_cost" },
  { header: "Meyer Inventory", key: "meyer_inventory" },
  { header: "Keystone Cost", key: "keystone_cost" },
  { header: "Keystone Inventory", key: "keystone_inventory" },
  { header: "Northridge Price", key: "northridge_price" },
  { header: "Rough Country Cost", key: "rough_country_cost" }
];
```

### 10.3 All Products Export (exportToExcelAllProducts)

**Location**: `Items.jsx` lines 246-452

**Extended Column Definitions** (47 columns):
```javascript
const allProductsExportColumns = [
  // Identification
  { header: "JJ Prefix", key: "jj_prefix" },
  { header: "JJ SKU", key: "sku" },
  { header: "MANUF. SKU", key: "searchable_sku" },

  // Pricing
  { header: "Price", key: "price" },
  { header: "Shipping Freight", key: "shipping_freight" },
  { header: "MAP", key: "MAP" },

  // Product Info
  { header: "Brand Name", key: "brand_name" },
  { header: "Vendors", key: "vendors" },
  { header: "Status", key: "status" },
  { header: "Name", key: "name" },

  // Vendor Costs (12 vendors)
  { header: "Meyer Cost", key: "meyer_cost" },
  { header: "Meyer Inventory", key: "meyer_inventory" },
  { header: "Keystone Cost", key: "keystone_cost" },
  { header: "Keystone Inventory", key: "keystone_inventory" },
  { header: "Omix Cost", key: "omix_cost" },
  { header: "Omix Inventory", key: "omix_inventory" },
  { header: "Quadratec Cost", key: "quadratec_cost" },
  { header: "Quadratec Inventory", key: "quadratec_inventory" },
  { header: "WheelPros Cost", key: "wheelPros_cost" },
  { header: "WP Inventory", key: "WP_inventory" },
  { header: "Tire Discounter Cost", key: "tireDiscounter_cost" },
  { header: "Dirty Dog Cost", key: "dirtyDog_cost" },
  { header: "Rough Country Cost", key: "rough_country_cost" },
  { header: "Rough Country Inventory", key: "RC_inventory" },
  { header: "AEV Cost", key: "aev_cost" },
  { header: "Keyparts Cost", key: "keyparts_cost" },
  { header: "MetalCloak Cost", key: "metalcloak_cost" },

  // Competitor Prices
  { header: "TDOT Price", key: "tdot_price" },
  { header: "PartsEngine Price", key: "partsEngine_price" },
  { header: "Lowriders Price", key: "lowriders_price" },

  // Dimensions
  { header: "Weight", key: "weight" },
  { header: "Length", key: "length" },
  { header: "Width", key: "width" },
  { header: "Height", key: "height" },
  { header: "Meyer Weight", key: "meyer_weight" },
  { header: "Meyer Length", key: "meyer_length" },
  { header: "Meyer Width", key: "meyer_width" },
  { header: "Meyer Height", key: "meyer_height" },

  // Codes & URLs
  { header: "Part Status Meyer", key: "partStatus_meyer" },
  { header: "Keystone Code", key: "keystone_code" },
  { header: "Quadratec SKU", key: "quadratec_sku" },
  { header: "Part", key: "part" },
  { header: "Image", key: "thumbnail" },
  { header: "PartsEngine URL", key: "partsEngine_code" },
  { header: "TDOT URL", key: "tdot_url" }
];
```

### 10.4 Export Implementation

```javascript
function exportToExcel() {
  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Product Data");

  // Define columns
  sheet.columns = columns;

  // Add data rows
  sourceData.forEach((product) => {
    const row = {
      sku: product.sku,
      // ... map all fields

      // Vendor cost extraction pattern
      meyer_cost: product.vendorProducts.find(
        (vp) => vp.vendor.name === "Meyer"
      )?.vendor_cost,

      // Competitor price extraction pattern
      northridge_price: product.competitorProducts.find(
        (cp) => cp.competitor.name === "Northridge 4x4"
      )?.competitor_price,
    };
    sheet.addRow(row);
  });

  // Generate and download
  workbook.xlsx.writeBuffer().then((buffer) => {
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "ProductData.xlsx");
  });
}
```

---

## 11. UI/UX Design

### 11.1 Layout Structure

```
┌───────────────────────────────────────────────────────────────────┐
│                        App Header                                  │
├───────────────┬───────────────────────────────────────────────────┤
│               │                                                    │
│   Sidebar     │                 Main Content                       │
│   (flex: 1.4) │                 (flex: 8)                         │
│               │                                                    │
│ ┌───────────┐ │  ┌──────────────────────────────────────────────┐ │
│ │ SEARCH BY │ │  │  SKU Search View:                            │ │
│ │ [Dropdown]│ │  │  ┌────────────────────────────────────────┐  │ │
│ └───────────┘ │  │  │         Product Table                  │  │ │
│               │  │  │  (no pagination, max 150 results)      │  │ │
│ ┌───────────┐ │  │  └────────────────────────────────────────┘  │ │
│ │ SKU Input │ │  │                                              │ │
│ │    OR     │ │  │  Brand Search View:                          │ │
│ │ Brand     │ │  │  ┌──────┬──────┬──────┬──────┐               │ │
│ │ Autocmpl  │ │  │  │Widget│Widget│Widget│Widget│ Stats         │ │
│ └───────────┘ │  │  └──────┴──────┴──────┴──────┘               │ │
│               │  │  ┌────────────────────────────────────────┐  │ │
│ ┌───────────┐ │  │  │         Product Table                  │  │ │
│ │ Export    │ │  │  │  (pagination, scroll: y: 1000)         │  │ │
│ │ Buttons   │ │  │  └────────────────────────────────────────┘  │ │
│ └───────────┘ │  └──────────────────────────────────────────────┘ │
└───────────────┴───────────────────────────────────────────────────┘
```

### 11.2 Table Column Configuration

**Items.jsx - SKU Search Columns** (`columns_by_sku`):

| Column | Width | Key Features |
|--------|-------|--------------|
| Manufacturer | 10% | Brand name display |
| SKU | auto | Product identifier |
| Image | auto | 80px thumbnail (hidden during search) |
| Name | 15% | Hyperlink to product URL |
| Price | auto | CAD with Black Friday discount applied |
| Weight | 5% | Highlights items >50 lbs |
| BIS | 5% | Shipping freight value |
| Vendor Information | 25% | Combined view: name, cost, margin, inventory |
| Competitor Prices | 10% | List with hyperlinks |

**ProductTable.jsx - Order Popup Columns** (`columns_by_sku`):

| Column | Width | Key Features |
|--------|-------|--------------|
| Manufacturer | auto | Brand name |
| Image | auto | 50px thumbnail |
| Name | 25% | Product name |
| Price | auto | Order product price or catalog price |
| Competitor Prices | 10% | With hyperlinks |
| Suggested Vendor | 10% | Lowest cost with inventory, checkbox |
| Vendors for Brand | 10% | Yellow highlighted |
| Vendor Name | 10% | Portal hyperlinks |
| Vendor Cost | 15% | CAD/USD with copy button, checkbox |
| Margin % | auto | Color-coded tags |
| Vendor Inventory | 20% | Numeric or string tags |

### 11.3 Color Coding System

**Margin Indicators**:
| Condition | Color | Hex |
|-----------|-------|-----|
| Margin > 18-19% | Green | `#52c41a` or `#1f8e24` |
| Margin <= 18-19% | Red | `#ff4d4f` or `#f63535` |

**Inventory Indicators**:
| Condition | Color | Hex |
|-----------|-------|-----|
| Inventory > 0 | Green | `#52c41a` or `#1f8e24` |
| Inventory = 0 | Red | `#ff4d4f` or `#f63535` |
| "Out of stock" | Red | `#ff4d4f` |
| No data | Gray | `#d9d9d9` |

**Weight Indicator**:
| Condition | Display |
|-----------|---------|
| Weight > 50 lbs | Red "!" indicator appended |

### 11.4 Statistics Widgets

**Location**: `Items.jsx` lines 1510-1628

```
┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ TOTAL PRODUCTS│  │   VENDORS     │  │  PRICE RANGE  │  │ PRICE AVERAGE │
│               │  │               │  │               │  │               │
│     257       │  │ Meyer,        │  │ $45 - $2,450  │  │   $485.32     │
│               │  │ Keystone...   │  │               │  │               │
│         [📦]  │  │         [💰]  │  │         [💰]  │  │         [💰]  │
└───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘
```

**Widget Structure**:
```jsx
<div className="widget">
  <div className="left">
    <span className="title">
      <strong>{brandName} </strong>TOTAL PRODUCTS:
    </span>
    <span className="counter">{count}</span>
  </div>
  <div className="right">
    <Icon className="icon" style={iconStyle} />
  </div>
</div>
```

---

## 12. Performance Optimizations

### 12.1 Debounced Search

```javascript
// 400ms delay before search execution
const timeout = setTimeout(async () => {
  // Search logic
}, 400);

return () => clearTimeout(timeout);  // Cancel on re-render
```

**Benefits**:
- Prevents excessive API calls during typing
- Reduces server load
- Improves perceived responsiveness

### 12.2 Product Caching

```javascript
const [allProducts, setAllProducts] = useState([]);
const [allLoaded, setAllLoaded] = useState(false);

// First search loads all products
if (!allLoaded) {
  const res = await axios.get(`${API_URL}/api/products`);
  setAllProducts(res.data);
  setAllLoaded(true);
}

// Subsequent searches use cached data
const filtered = allProducts.filter(p => productMatches(p, query));
```

**Benefits**:
- Single API call for all products
- Instant client-side filtering after initial load
- Reduced network traffic

### 12.3 Result Limiting

```javascript
setData(filtered.slice(0, 150));  // Cap at 150 results
```

**Benefits**:
- Prevents rendering thousands of rows
- Maintains responsive UI
- Encourages more specific searches

### 12.4 Image Hiding During Search

```javascript
// During active SKU search, hide image column
columns={typedSku?.trim() ? columns_no_img : columns_by_sku}
```

**Benefits**:
- Reduces DOM elements during search
- Faster table rendering
- Lower memory consumption

### 12.5 Virtualized Scrolling (Ant Design Table)

```javascript
<Table
  scroll={{ y: 1000 }}  // Enable vertical virtualization
  // ...
/>
```

---

## 13. Dependencies

### 13.1 NPM Package Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.x | Core framework |
| antd | ^5.x | Table, Button, Tag, Checkbox, InputNumber |
| @mui/material | ^5.x | Select, TextField, Autocomplete, FormControl |
| @mui/icons-material | ^5.x | PrecisionManufacturingOutlined, MonetizationOnOutlined |
| axios | ^1.x | HTTP client |
| exceljs | ^4.x | Excel workbook generation |
| file-saver | ^2.x | Browser file download |
| react-resizable | ^3.x | Resizable table columns |

### 13.2 Internal Dependencies

| Dependency | Purpose |
|------------|---------|
| CopyText | Clipboard copy utility (ProductTable.jsx) |
| items.scss | Component-specific styling |
| AuthContext | Authentication state (optional wrapper) |

### 13.3 Backend API Dependencies

| Endpoint | Data Required |
|----------|---------------|
| /api/products | Products with vendorProducts and competitorProducts relations |
| /api/products_sku | All SKUs for autocomplete |
| /api/order_products/:id/edit/selected_supplier | Order product update |

---

## 14. Future Considerations

### 14.1 Performance Improvements

1. **Server-Side Search**: Implement backend search endpoint with pagination
2. **Infinite Scroll**: Replace 150-result cap with progressive loading
3. **Web Workers**: Offload search filtering to background thread
4. **Search Index**: Implement client-side search index (e.g., Fuse.js)

### 14.2 Feature Enhancements

1. **Dynamic Vendor Links**: Move URL patterns to database/config
2. **Real-Time Exchange Rates**: Integrate currency API
3. **Search History**: Persist recent searches to localStorage
4. **Configurable Margin Thresholds**: Admin-settable business rules
5. **Dynamic Brand List**: Fetch brands from backend API
6. **Column Persistence**: Save column widths to localStorage
7. **Advanced Filters**: Add price range, inventory status, margin filters
8. **Bulk Vendor Selection**: Select vendor for multiple products at once

### 14.3 Code Quality

1. **TypeScript Migration**: Add type safety to props and state
2. **Component Decomposition**: Break down large column render functions
3. **Error Boundaries**: Add user-facing error handling
4. **Unit Tests**: Test search algorithm and margin calculation
5. **Code Cleanup**: Remove commented code and debug statements
6. **Constants Extraction**: Move magic numbers to configuration

### 14.4 Accessibility

1. **Keyboard Navigation**: Enable table row selection via keyboard
2. **Screen Reader Support**: Add ARIA labels to interactive elements
3. **Color Contrast**: Ensure color indicators meet WCAG standards
4. **Focus Management**: Manage focus during search interactions

---

## Appendix A: Sample Data Structures

### A.1 Sample Product (brandData)

```javascript
{
  sku: "BST-56820-35",
  name: "BESTOP Trektop NX With Tinted Windows In Black Diamond For 1997-06 Jeep Wrangler TJ Models 56820-35",
  price: 1417.95,
  image: "https://www.justjeeps.com/pub/media/catalog/product//5/6/56820-35.jpg",
  brand_name: "BESTOP",
  status: 1,
  vendorProducts: [
    {
      product_sku: "BST-56820-35",
      vendor_sku: "BES56820-35",
      vendor_cost: 1003.57,
      vendor_inventory: 97,
      vendor: { name: "Meyer" }
    },
    {
      product_sku: "BST-56820-35",
      vendor_sku: "D345682035",
      vendor_cost: 956.27,
      vendor_inventory: 58,
      vendor: { name: "Keystone" }
    }
  ],
  competitorProducts: [
    {
      competitor_price: 1205.99,
      product_url: "https://www.northridge4x4.ca/part/soft-tops/56820-35-bestop-black-diamond-trektop-soft-top",
      competitor: { name: "Northridge 4x4" }
    }
  ]
}
```

### A.2 Sample Brand List Entry

```javascript
{ brand_name: "Rough Country" }
{ brand_name: "BESTOP" }
{ brand_name: "TeraFlex" }
// ... 300+ entries
```

---

## Appendix B: SCSS Styling Reference

### B.1 Main Layout Structure

```scss
.items {
  display: flex;
  font-family: 'Nunito', sans-serif;
  margin: 140px 0 0 0;
}

.sidebar {
  display: flex;
  flex-direction: column;
  flex: 1.4;
  background-color: #212121;
  color: 'white';
}

.explore-content {
  flex: 8;
  margin: 20px 20px;
}
```

### B.2 Statistics Widget Styling

```scss
.brand-statistic {
  display: flex;
  margin: 20px 50px;
  gap: 50px;
}

.widget {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  box-shadow: 2px 4px 10px 1px rgba(201, 201, 201, 0.47);
  border-radius: 10px;
  height: 109px;

  .title {
    font-size: 18px;
    font-weight: bold;
    color: rgb(160, 160, 160);
  }

  .counter {
    font-size: 24px;
    font-weight: 300;
  }
}
```

---

*Document generated from codebase analysis of JustJeepsAPI-front-end*
