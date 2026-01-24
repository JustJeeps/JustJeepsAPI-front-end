# PRD: Product/Items Management Module

## Overview

The Product/Items Management module provides a comprehensive product catalog interface for JustJeeps operations staff. It enables searching and viewing products by SKU or brand, displaying vendor costs and inventory levels, calculating profit margins, comparing competitor prices, and exporting product data to Excel. The module serves as a critical tool for pricing decisions, vendor selection, and inventory monitoring.

## Problem Statement

JustJeeps needs an efficient way for operations staff to:
- Quickly look up product information across a large catalog (300+ brands, thousands of SKUs)
- Compare vendor costs and inventory availability across multiple suppliers (Meyer, Keystone, Omix, Quadratec, Rough Country, WheelPros, etc.)
- Analyze profit margins to ensure pricing competitiveness while maintaining profitability
- Monitor competitor pricing (Northridge 4x4, Parts Engine, TDOT, Lowriders, etc.)
- Export product data for external analysis and reporting
- Support Black Friday and promotional pricing scenarios

## User Stories

### Product Search
- As an operations staff member, I want to search for products by SKU so that I can quickly find specific item information
- As an operations staff member, I want to search with case-insensitive and dash-insensitive matching so that I can find products regardless of how I type the SKU
- As an operations staff member, I want to search by brand so that I can view all products from a specific manufacturer
- As an operations staff member, I want to see real-time search results as I type so that I can find products faster

### Product Information Display
- As an operations staff member, I want to see product images, names, and prices so that I can verify product details
- As an operations staff member, I want to see vendor costs in both CAD and USD so that I can make informed purchasing decisions
- As an operations staff member, I want to see profit margin percentages for each vendor so that I can select the most profitable supplier
- As an operations staff member, I want to see vendor inventory levels so that I know which suppliers have stock available
- As an operations staff member, I want to see competitor prices so that I can ensure our pricing is competitive

### Vendor Selection
- As an operations staff member, I want to see a suggested vendor based on lowest cost with available inventory so that I can quickly identify the best option
- As an operations staff member, I want to click a checkbox to select a vendor as the supplier for an order so that I can streamline order processing
- As an operations staff member, I want vendor names to be hyperlinks to their portals so that I can quickly access vendor sites for ordering

### Data Export
- As an operations staff member, I want to export brand-filtered products to Excel so that I can perform offline analysis
- As an operations staff member, I want to export all products to Excel so that I can have a complete data backup

### Brand Statistics
- As an operations staff member, I want to see total product count for a selected brand so that I understand catalog coverage
- As an operations staff member, I want to see price range and average price for a brand so that I can understand pricing distribution
- As an operations staff member, I want to see which vendors supply a brand so that I know procurement options

## Functional Requirements

### FR-1: SKU Search with Case-Insensitive Matching
**Description**: Users can search for products by entering a SKU in a text field. The search matches against product SKU, searchable_sku, and vendor SKUs.

**Acceptance Criteria**:
- Search is case-insensitive (e.g., "bst-56820" matches "BST-56820")
- Search ignores dashes and special characters for flexible matching
- Search matches against: `sku`, `searchable_sku`, `vendorProducts[].vendor_sku`
- SKUs ending with a dash are filtered out from results
- Results are limited to first 150 matches for performance
- Search debounces with 400ms delay to prevent excessive API calls
- Loading spinner displays during search operations

### FR-2: Brand-Based Product Filtering
**Description**: Users can select a brand from an autocomplete dropdown to view all products from that manufacturer.

**Acceptance Criteria**:
- Autocomplete dropdown populated with 300+ brand names
- Selecting a brand fetches all products and filters by `brand_name`
- Only products with `status === 1` and `price !== 0` are displayed
- Brand statistics display after selection (total count, price range, average, vendors)

### FR-3: Product Table Display with Resizable Columns
**Description**: Products are displayed in a data table with comprehensive information columns.

**Table Columns**:
| Column | Description |
|--------|-------------|
| Manufacturer | Brand name |
| SKU | Product SKU |
| Image | Product image (50-80px thumbnail) |
| Name | Product name with hyperlink to product URL |
| Price | Selling price in CAD (with Black Friday discount applied if applicable) |
| Weight | Product weight in lbs (highlighted if >50 lbs) |
| BIS | Shipping freight value |
| Vendor Information | Combined vendor name, cost (CAD/USD), margin %, inventory |
| Competitor Prices | List of competitor prices with hyperlinks |

**Acceptance Criteria**:
- Columns are resizable using react-resizable library
- Images hidden during active search for performance
- Table supports horizontal scrolling for overflow content
- Pagination available for brand view (positioned at top right)

### FR-4: Vendor Cost and Margin Calculation
**Description**: Display vendor costs with automatic margin calculation based on selling price.

**Acceptance Criteria**:
- Vendor cost displayed in CAD with USD equivalent (CAD / 1.5)
- Margin calculated as: `((sellingPrice - vendorCost) / vendorCost) * 100`
- Margin displayed with color coding: green (>19%), red (<=19%)
- Black Friday discounts applied to selling price before margin calculation
- Supported discount tiers: 15%, 20%, 25%, 30% off

### FR-5: Vendor Inventory Display
**Description**: Show real-time vendor inventory status with visual indicators.

**Acceptance Criteria**:
- Numeric inventory displayed as colored tags (green if >0, red if 0)
- String inventory (e.g., "CAD Stock: X / US Stock: Y") displayed as tags
- "Out of stock" strings display in red
- "NO INFO" tag displayed when no inventory data available

### FR-6: Vendor Portal Links
**Description**: Vendor names are clickable links that open the vendor's product page.

**Supported Vendors and Link Patterns**:
| Vendor | Link Pattern |
|--------|-------------|
| Meyer | `https://online.meyerdistributing.com/parts/details/{vendor_sku}` |
| Omix | `https://omixdealer.com/product-detail/{vendor_sku}` |
| Quadratec | `https://www.quadratecwholesale.com/catalogsearch/result/?q={searchable_sku}` |
| Keystone | `https://wwwsc.ekeystone.com/Search/Detail?pid={keystone_code}` |
| Tire Discounter | `https://www.tdgaccess.ca/Catalog/Search/1?search={vendor_sku}` |
| WheelPros | `https://dl.wheelpros.com/ca_en/ymm/search/?q={vendor_sku}` |
| Rough Country | `https://www.roughcountry.com/search/{vendor_sku}` |
| CTP | `https://www.ctpdistributors.com/search-parts?find={searchable_sku}` |
| CURT | Brand-specific URLs (Luverne, Aries, CURT, UWS) |
| Turn14 | `https://turn14.com/search/index.php?vmmPart={vendor_sku}` |
| MetalCloak | `https://jobber.metalcloak.com/catalogsearch/result/?q={sku_without_MTK}` |

### FR-7: Competitor Price Display with Links
**Description**: Display competitor prices with links to competitor product pages.

**Supported Competitors**:
| Competitor | Link Pattern |
|------------|-------------|
| Parts Engine | Uses `partsEngine_code` field or SKU fallback |
| Quadratec | Uses `quadratec_code` field |
| ExtremeTerrain | SKU-based search |
| Morris 4x4 | SKU-based search |
| 4 Wheel Parts | SKU-based search |
| Northridge 4x4 | SKU-based search |

### FR-8: Suggested Vendor Selection
**Description**: Automatically identify and highlight the best vendor option based on lowest cost with available inventory.

**Acceptance Criteria**:
- Filter vendors to those with `vendor_inventory > 0`
- Select vendor with lowest `vendor_cost`
- Display vendor name, cost, and margin percentage
- Visual border indicator: green (margin >18%), red (margin <=18%)
- Checkbox to select vendor for order

### FR-9: Vendor Selection for Orders
**Description**: Users can select a vendor as the supplier for an order product.

**Acceptance Criteria**:
- Clicking checkbox triggers API call to update order product
- API endpoint: `POST /order_products/{id}/edit/selected_supplier`
- Payload includes: `selected_supplier_cost`, `selected_supplier`
- Selection persisted to backend

### FR-10: Excel Export Functionality
**Description**: Export product data to Excel spreadsheet format.

**Brand Export Columns**:
- SKU, Name, URL, Status, Price, Searchable SKU, JJ Prefix, Image, Brand Name
- Vendors, Meyer Cost/Inventory, Keystone Cost/Inventory, Northridge Price, Rough Country Cost

**All Products Export Columns**:
- All brand columns plus:
- Shipping Freight, MAP, Weight/Length/Width/Height
- Meyer dimensions, Keystone code, Quadratec SKU/Inventory
- Omix Cost/Inventory, WheelPros Cost/Inventory
- Tire Discounter Cost, Dirty Dog Cost, AEV Cost, KeyParts Cost, MetalCloak Cost
- TDOT Price, Parts Engine Price, Lowriders Price
- Part Status Meyer, Part, Thumbnail
- PartsEngine URL, TDOT URL

**Acceptance Criteria**:
- Uses ExcelJS library for workbook generation
- Uses file-saver for browser download
- Output file named "ProductData.xlsx"

### FR-11: Brand Statistics Display
**Description**: When viewing products by brand, display summary statistics.

**Statistics Shown**:
- Total products count for selected brand
- Associated vendors for the brand
- Price range (min - max)
- Average price

**Acceptance Criteria**:
- Statistics displayed in widget cards above the table
- Only shown when brand data is loaded (brandData.length > 0)
- Icons for visual enhancement (MUI icons)

## Non-Functional Requirements

### NFR-1: Performance
- Search debouncing: 400ms delay before executing search
- Result limiting: Maximum 150 products returned per search
- Image hiding: Product images hidden during active SKU search for faster rendering
- Lazy loading: Products loaded on-demand, cached after first load

### NFR-2: Usability
- Resizable columns for customizable table layout
- Color-coded indicators for quick visual scanning (margins, inventory)
- Hyperlinks open in new tabs (`target="_blank"`)
- Loading spinners during async operations

### NFR-3: Browser Compatibility
- Supports modern browsers with ES6+ support
- Uses react-resizable for cross-browser column resizing
- Excel export compatible with Excel and Google Sheets

### NFR-4: Data Freshness
- Products cached in component state after first load
- Real-time vendor selection updates via API
- No automatic refresh (manual page reload required for data updates)

## Technical Implementation

### Architecture

```
src/features/items/
├── Items.jsx           # Main container component (1658 lines)
├── ProductTable.jsx    # Reusable product table for order popups (796 lines)
├── vendorProductsTable.jsx  # Legacy/test SKU table (1458 lines)
└── items.scss          # Component-specific styling
```

**Component Hierarchy**:
```
App.jsx
└── Items (route: /items)
    └── Ant Design Table
        └── ResizableTitle (header cells)

OrderTable.jsx
└── Popup
    └── ProductTable (props: data, orderProductId, orderProductPrice, currency)
```

### Data Flow

1. **Initial Load**:
   - Component mounts, fetches all SKUs from `/api/products_sku`
   - SKUs stored in state for autocomplete functionality

2. **SKU Search Flow**:
   ```
   User types in search field
   → setTypedSku(value) updates state
   → useEffect with 400ms debounce triggered
   → If products not loaded: GET /api/products (all products)
   → Filter products client-side using productMatches()
   → Limit to 150 results
   → setData(filteredProducts)
   → Table re-renders
   ```

3. **Brand Search Flow**:
   ```
   User selects brand from autocomplete
   → setSearchTermSku(brand) updates state
   → useEffect triggered for brand search
   → GET /api/products (all products)
   → Filter by brand_name, status=1, price!=0
   → setBrandData(filteredProducts)
   → Statistics calculated (min, max, average)
   → Table renders with brand data
   ```

4. **Vendor Selection Flow**:
   ```
   User clicks vendor checkbox
   → handleVendorCostClick(vendorProduct)
   → POST /order_products/{id}/edit/selected_supplier
   → Backend updates order product
   → Success/error logged to console
   ```

5. **Excel Export Flow**:
   ```
   User clicks export button
   → exportToExcel() or exportToExcelAllProducts()
   → Create ExcelJS workbook
   → Map product data to columns
   → Generate buffer
   → Create Blob
   → saveAs(blob, "ProductData.xlsx")
   ```

### API Endpoints Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products_sku` | Fetch all SKUs for autocomplete |
| GET | `/api/products` | Fetch all products with vendor/competitor data |
| GET | `/api/products/{sku}` | Fetch single product by SKU |
| POST | `/order_products/{id}/edit/selected_supplier` | Update order product supplier |

### State Management

**Items.jsx State**:
```javascript
const [data, setData] = useState([]);           // Filtered products for display
const [searchBy, setSearchBy] = useState("sku"); // Search mode: "sku" or "brand"
const [searchTermSku, setSearchTermSku] = useState(""); // Selected search term
const [sku, setSku] = useState([]);             // All SKUs for autocomplete
const [brandData, setBrandData] = useState([]); // Brand-filtered products
const [allProducts, setAllProducts] = useState([]); // Cached all products
const [loading, setLoading] = useState(false);  // Loading state
const [discount, setDiscount] = useState("1");  // Discount percentage
const [typedSku, setTypedSku] = useState("");   // Current typed search query
const [allLoaded, setAllLoaded] = useState(false); // Cache loaded flag
```

**ProductTable.jsx State**:
```javascript
const [selectedVendorCost, setSelectedVendorCost] = useState(null);
```

**Props Interface (ProductTable)**:
```typescript
interface ProductTableProps {
  data: Product[];           // Products to display
  orderProductId: string;    // Order product ID for vendor selection
  orderProductPrice: number; // Selling price for margin calculation
  currency: 'CAD' | 'USD';   // Currency for cost conversion
}
```

### Key Data Structures

**Product Object**:
```javascript
{
  sku: string,
  name: string,
  url_path: string,
  status: number,
  price: number,
  searchable_sku: string,
  jj_prefix: string,
  image: string,
  brand_name: string,
  vendors: string,
  weight: number,
  shippingFreight: number,
  black_friday_sale: string,
  keystone_code: string,
  keystone_code_site: string,
  partsEngine_code: string,
  tdot_url: string,
  vendorProducts: VendorProduct[],
  competitorProducts: CompetitorProduct[]
}
```

**VendorProduct Object**:
```javascript
{
  id: number,
  product_sku: string,
  vendor_sku: string,
  vendor_cost: number,
  vendor_inventory: number,
  vendor_inventory_string: string,
  vendor: {
    name: string
  }
}
```

**CompetitorProduct Object**:
```javascript
{
  id: number,
  competitor_price: number,
  product_url: string,
  competitor: {
    name: string
  }
}
```

## Dependencies

### Internal Dependencies
- **Supplier Management**: Vendor data (names, costs, inventory) sourced from supplier system
- **Order Management**: ProductTable used within order popups for vendor selection
- **Authentication**: Protected route (though Items route currently uses AuthOptionalWrapper)

### External Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.x | Core framework |
| antd | ^5.x | UI components (Table, Button, Tag, Checkbox, InputNumber) |
| @mui/material | ^5.x | UI components (Select, TextField, Autocomplete, Icons) |
| axios | ^1.x | HTTP client for API calls |
| exceljs | ^4.x | Excel file generation |
| file-saver | ^2.x | Browser file download |
| react-resizable | ^3.x | Resizable table columns |

## Current Limitations

### L-1: Client-Side Filtering
All products are fetched and filtered client-side, which may cause performance issues as the product catalog grows. The 150-result limit mitigates this but may hide relevant results.

### L-2: No Real-Time Data Updates
Product data is cached in component state. Users must reload the page to see updated vendor costs, inventory, or pricing.

### L-3: Hard-Coded Vendor Link Patterns
Vendor portal URLs are hard-coded in the component. Adding new vendors requires code changes.

### L-4: Limited Error Handling
API errors are logged to console but not displayed to users. Failed vendor selections are not retried or queued.

### L-5: No Search History
Previous searches are not saved. Users must re-enter search terms after navigation.

### L-6: Currency Conversion Hard-Coded
USD/CAD conversion uses fixed rate of 1.5. No dynamic exchange rate support.

### L-7: Legacy Code Present
`vendorProductsTable.jsx` appears to be legacy/test code with hard-coded sample data. It's not actively used but remains in the codebase.

### L-8: Margin Threshold Hard-Coded
The 18-19% margin threshold for visual indicators is hard-coded. Business rule changes require code updates.

### L-9: Brand List Static
The 300+ brand list is hard-coded in the component rather than fetched from the backend.

### L-10: Commented Debug Code
Multiple `console.log` statements and commented-out code blocks remain in production code, indicating incomplete cleanup.

### L-11: Duplicate Export Logic
`exportToExcel()` and `exportToExcelAllProducts()` have significant code duplication with different column configurations.

### L-12: No Pagination for SKU Search
SKU search results are limited to 150 but provide no pagination for viewing additional results.
