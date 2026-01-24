# Design Document: OrderTable State Management & Data Flow

## 1. Overview

### 1.1 Purpose
The OrderTable component is the central order management interface for the JustJeeps order processing system. It provides a comprehensive view of orders with expandable rows for order items, real-time vendor cost comparison, inline editing capabilities, and automated email generation for vendor communication.

### 1.2 Scope
- **Primary Responsibility**: Display and manage 1000+ orders with complex nested data structures
- **Key Features**:
  - Expandable master-detail table (orders -> order items)
  - Multi-vendor cost comparison via drawer popup
  - Inline form editing for order fields
  - Automated email generation (DropShip & Ship-to-Store templates)
  - Real-time metrics dashboard (today's orders, not-set orders, etc.)
  - Column-level search and filtering
  - Sortable columns with persistent sort state

### 1.3 Parent PRD Reference
- **Parent Document**: order-management.md
- **Component Role**: Primary user interface for order lifecycle management

---

## 2. Architecture

### 2.1 Component Hierarchy

```
OrderTable (Main Component)
├── TableTop (Metrics Dashboard)
│   └── Statistic Cards (Order counts, filters)
├── Form (Ant Design Form wrapper)
│   └── Table (Main orders table)
│       └── expandedRowRender (Nested items table)
│           └── nestedColumns (Item-level columns)
└── Popup (Drawer Component)
    └── ProductTable (Vendor comparison table)
        └── CopyText (Utility component)
```

### 2.2 Layer Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────────────┐ │
│  │  TableTop   │  │  OrderTable  │  │           Popup/Drawer          │ │
│  │  (Metrics)  │  │  (Main Grid) │  │  (Vendor Cost Comparison)       │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          STATE MANAGEMENT LAYER                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  useState Hooks (Local Component State)                             ││
│  │  • orders, originalOrders (data)                                    ││
│  │  • editingRow (edit mode)                                           ││
│  │  • currentSku, currentCurrency (drawer context)                     ││
│  │  • showNotSetOnly, showPmOnly (filters)                             ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  Ant Design Form (Form State)                                       ││
│  │  • form.setFieldsValue, form.validateFields                         ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  useRef Hooks (Mutable References)                                  ││
│  │  • searchInput (DOM ref)                                            ││
│  │  • brandCacheRef (API response cache)                               ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            DATA LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  Axios HTTP Client                                                  ││
│  │  • GET /api/orders (fetch orders)                                   ││
│  │  • GET /api/seed-orders (sync from Magento)                         ││
│  │  • POST /api/orders/:id/edit (update order)                         ││
│  │  • POST /order_products/:id/edit (update item)                      ││
│  │  • DELETE /:id/delete (delete item)                                 ││
│  │  • GET /api/products/:sku/brand (get brand)                         ││
│  │  • POST /api/purchase_orders (create PO)                            ││
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
src/features/order/
├── OrderTable.jsx       # Main component (2356 lines)
├── Popup.jsx            # Drawer for vendor comparison (97 lines)
└── order.scss           # Component styles

src/features/items/
└── ProductTable.jsx     # Vendor comparison table (796 lines)

src/features/tabletop/
└── TableTop.jsx         # Metrics dashboard (105 lines)
```

---

## 3. State Management

### 3.1 State Variables

| Variable | Type | Initial Value | Purpose | Update Triggers |
|----------|------|---------------|---------|-----------------|
| `orders` | `Array<Order>` | `[]` | Currently displayed orders (may be filtered) | `loadData()`, filter toggles, inline edits |
| `originalOrders` | `Array<Order>` | `[]` | Unfiltered order dataset for reference | `loadData()` only |
| `sortedInfo` | `Object` | `{}` | Current sort column and direction | `handleChange()` |
| `loading` | `boolean` | `false` | Loading spinner state | API calls start/end |
| `searchText` | `string` | `""` | Current column search text | `handleSearch()` |
| `searchedColumn` | `string` | `""` | Column being searched | `handleSearch()` |
| `editingRow` | `string\|null` | `null` | ID of row in edit mode | Edit/Save actions |
| `open` | `boolean` | `false` | Drawer visibility | `showDrawer()`/`onClose()` |
| `placement` | `string` | `"top"` | Drawer position | Static |
| `currentSku` | `string\|null` | `null` | SKU for vendor lookup | Row click/drawer open |
| `currentOrderProductID` | `string\|null` | `null` | Order item ID for edits | Row click/drawer open |
| `currentOrderProductPrice` | `number\|null` | `null` | Item price for margin calc | Row click/drawer open |
| `currentCurrency` | `string\|null` | `null` | Order currency (CAD/USD) | Row click/drawer open |
| `selectedOrder` | `Array<Order>\|null` | `null` | Expanded order (unused in current implementation) | `handleExpand()` |
| `showNotSetOnly` | `boolean` | `false` | Filter: show only "NOT SET" PO orders | TableTop click |
| `showPmOnly` | `boolean` | `false` | Filter: show only PM not-set orders | TableTop click |

### 3.2 Ref Variables

| Ref | Type | Purpose |
|-----|------|---------|
| `searchInput` | `RefObject<Input>` | DOM reference for column search input auto-focus |
| `brandCacheRef` | `RefObject<Object>` | Cache for brand API responses to avoid duplicate calls |

### 3.3 Form State (Ant Design)

```javascript
const [form] = Form.useForm();
// Form fields are dynamically set via:
// form.setFieldsValue({ field1: value1, field2: value2 })
// Form values are retrieved via:
// form.validateFields().then(values => { ... })
```

### 3.4 State Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INITIAL LOAD                                 │
│  useEffect([]) → loadData() → setOrders() + setOriginalOrders()     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FILTERING FLOW                               │
│  showNotSetOnly/showPmOnly toggle                                   │
│           │                                                         │
│           ▼                                                         │
│  filteredOrders = orders.filter(filterPredicate)                    │
│           │                                                         │
│           ▼                                                         │
│  data = filteredOrders.map(order => ({ key: order.entity_id }))     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         EDIT FLOW                                    │
│  Click Edit → setEditingRow(recordId)                               │
│       │                                                             │
│       ▼                                                             │
│  form.setFieldsValue(record)                                        │
│       │                                                             │
│       ▼                                                             │
│  User modifies form fields                                          │
│       │                                                             │
│       ▼                                                             │
│  Click Save → form.validateFields()                                 │
│       │                                                             │
│       ▼                                                             │
│  onFinish(values) → updateOrders state → setEditingRow(null)        │
│       │                                                             │
│       ▼                                                             │
│  updateOrder(values) → POST /api/orders/:id/edit                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DRAWER/VENDOR COMPARISON FLOW                     │
│  Click "Compare Vendor Costs" → showDrawer(sku, id, price, currency)│
│       │                                                             │
│       ▼                                                             │
│  setCurrentSku() + setCurrentOrderProductID() + setOpen(true)       │
│       │                                                             │
│       ▼                                                             │
│  <Popup /> renders with props                                       │
│       │                                                             │
│       ▼                                                             │
│  Popup.getProductBySku() → GET /api/products/:sku                   │
│       │                                                             │
│       ▼                                                             │
│  ProductTable renders vendor comparison data                        │
│       │                                                             │
│       ▼                                                             │
│  User selects vendor → POST /order_products/:id/edit/supplier       │
│       │                                                             │
│       ▼                                                             │
│  onClose() → setOpen(false) + loadData() (refresh orders)           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Flow

### 4.1 API Interactions

#### 4.1.1 Orders Endpoints

| Endpoint | Method | Purpose | Request Body | Response |
|----------|--------|---------|--------------|----------|
| `/api/orders` | GET | Fetch all orders with items | - | `Array<Order>` |
| `/api/seed-orders` | GET | Sync orders from Magento | - | Success message |
| `/api/orders/:id/edit` | POST | Update order fields | `Order` partial | Updated `Order` |
| `/api/orders/:id/delete` | POST | Mark order as canceled | - | Updated orders array |

#### 4.1.2 Order Items Endpoints

| Endpoint | Method | Purpose | Request Body | Response |
|----------|--------|---------|--------------|----------|
| `/order_products/:id/edit` | POST | Update order item | `OrderItem` partial | Updated `OrderItem` |
| `/order_products/:id/edit/selected_supplier` | POST | Set selected vendor | `{selected_supplier, selected_supplier_cost}` | Updated item |
| `/:id/delete` | DELETE | Remove order item | - | Updated orders array |

#### 4.1.3 Product/Vendor Endpoints

| Endpoint | Method | Purpose | Request Body | Response |
|----------|--------|---------|--------------|----------|
| `/api/products/:sku` | GET | Get product with vendors | - | `Product` with `vendorProducts[]` |
| `/api/products/:sku/brand` | GET | Get product brand | - | `{brand: string}` |

#### 4.1.4 Purchase Order Endpoints

| Endpoint | Method | Purpose | Request Body | Response |
|----------|--------|---------|--------------|----------|
| `/api/purchase_orders` | POST | Create new PO | `{vendor_id, user_id, order_id}` | Created PO |
| `/purchaseOrderLineItem` | POST | Add item to PO | `{purchaseOrderId, ...}` | Created line item |

### 4.2 Data Transformation

#### 4.2.1 Order Data Structure

```typescript
interface Order {
  entity_id: number;           // Primary key
  increment_id: string;        // Display order number (e.g., "2001234")
  created_at: string;          // ISO timestamp
  status: string;              // "processing" | "pending" | "complete" | "canceled"
  custom_po_number: string;    // PO number or "NOT SET"
  weltpixel_fraud_score: string;
  customer_firstname: string;
  customer_lastname: string;
  customer_email: string;
  grand_total: number;
  total_qty_ordered: number;
  order_currency_code: string; // "CAD" | "USD"
  shipping_description: string;
  shipping_amount: number;
  base_total_due: number;
  region: string;
  method_title: string;        // Payment method
  payment_method: string;

  // Shipping address fields
  shipping_firstname: string;
  shipping_lastname: string;
  shipping_company?: string;
  shipping_street1: string;
  shipping_street2?: string;
  shipping_street3?: string;
  shipping_city: string;
  shipping_region: string;
  shipping_postcode: string;
  shipping_country_id: string;
  shipping_telephone?: string;

  // Nested items
  items: OrderItem[];
}

interface OrderItem {
  id: number;
  order_id: number;
  sku: string;
  name: string;
  price: number;
  qty_ordered: number;
  selected_supplier?: string;
  selected_supplier_cost?: number;
  product?: Product;
}

interface Product {
  sku: string;
  name: string;
  brand_name?: string;
  image?: string;
  url_path?: string;
  weight?: number;
  shippingFreight?: number;
  black_friday_sale?: string;
  vendorProducts: VendorProduct[];
  competitorProducts: CompetitorProduct[];
}

interface VendorProduct {
  id: number;
  vendor_id: number;
  product_sku: string;
  vendor_sku?: string;
  vendor_cost: number;
  vendor_inventory: number;
  vendor_inventory_string?: string;
  vendor: {
    id: number;
    name: string;
  };
}
```

#### 4.2.2 Table Data Transformation

```javascript
// Orders array to Ant Design Table dataSource format
const data = Array.isArray(filteredOrders)
  ? filteredOrders.map((order) => ({
      key: order.entity_id,  // Required by Ant Design
      ...order,
    }))
  : [];
```

#### 4.2.3 Currency Conversion

```javascript
// USD to CAD conversion (hardcoded rate)
const adjustedCost = props.currency === 'USD'
  ? vendorProduct.vendor_cost / 1.5
  : vendorProduct.vendor_cost;
```

#### 4.2.4 Margin Calculation

```javascript
const margin = ((orderProductPrice - adjustedCost) / adjustedCost) * 100;
// Healthy margin threshold: > 18%
```

---

## 5. Key Functions

### 5.1 Data Loading Functions

#### `loadData()`
```javascript
const loadData = useCallback(async () => {
  setLoading(true);
  const response = await axios.get(`${API_URL}/api/orders`);
  setOriginalOrders(response.data);
  setOrders(response.data);
  setLoading(false);
}, []);
```
- **Purpose**: Fetches all orders from the backend
- **Trigger**: Component mount, drawer close, manual refresh
- **Side Effects**: Updates `orders`, `originalOrders`, `loading`

#### `handleSeedOrders()`
```javascript
const handleSeedOrders = async () => {
  setLoading(true);
  await axios.get(`${API_URL}/api/seed-orders`);
  loadData();
};
```
- **Purpose**: Triggers backend sync with Magento
- **Trigger**: "Update Orders" button click

### 5.2 Edit Functions

#### `handleSave()` / `handleSaveSub()`
```javascript
const handleSave = () => {
  form.validateFields()
    .then((values) => {
      onFinish(values);
      updateOrder(values);
    });
};
```
- **Purpose**: Validates and saves main row edits
- **Data Flow**: Form state -> Local state -> Backend API

#### `updateOrderItem()`
```javascript
const updateOrderItem = (subRowRecord) => {
  return axios
    .post(`${API_URL}/order_products/${id}/edit`, subRowRecord)
    .then((data) => {
      // Find and update the specific item in orders state
      // ...complex nested state update logic
    });
};
```
- **Purpose**: Persists order item changes to backend
- **Complexity**: Requires finding parent order and updating nested items array

### 5.3 Search & Filter Functions

#### `getColumnSearchProps()`
```javascript
const getColumnSearchProps = (dataIndex) => ({
  filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
    // Search UI with Input, Search/Reset/Close buttons
  ),
  filterIcon: (filtered) => <SearchOutlined style={{color: filtered ? '#1890ff' : undefined}} />,
  onFilter: (value, record) =>
    record[dataIndex]?.toString().toLowerCase().includes(value.toLowerCase()),
  render: (text) => searchedColumn === dataIndex
    ? <Highlighter searchWords={[searchText]} textToHighlight={text} />
    : text,
});
```
- **Purpose**: Generates column search configuration
- **Used By**: All searchable columns (created_at, increment_id, status, etc.)

### 5.4 Email Generation Functions

#### `buildEmailBody()` / `buildBody_DS()` / `buildBody_Store()`
```javascript
const buildBody_DS = (order, item, brand = "") => {
  const line = buildItemLine(item, brand);
  return `Could you please confirm the ${underline("ETA, cost, and shipping cost")}...
${line}
Ship to:
${buildShipToBlock(order)}
Thank you,`;
};
```
- **Purpose**: Generates vendor email templates
- **Variants**: DropShip (includes address), Ship-to-Store (no address)
- **Format**: Plain text with Unicode underline for emphasis

#### `buildShipToBlock()`
```javascript
const buildShipToBlock = (order) => {
  // Constructs multi-line shipping address from order fields
  const lines = [fullName, company, street1, street2, city/region/postal, country, phone];
  return lines.filter(Boolean).join("\n");
};
```

### 5.5 Utility Functions

#### `getBrandForSku()`
```javascript
const getBrandForSku = async (sku) => {
  if (brandCacheRef.current[sku]) return brandCacheRef.current[sku];
  const { data } = await axios.get(`${API_URL}/api/products/${sku}/brand`);
  brandCacheRef.current[sku] = data?.brand || "";
  return brandCacheRef.current[sku];
};
```
- **Purpose**: Fetches and caches brand information
- **Caching**: Uses ref to persist across renders without re-fetching

#### `formatSkuForEmail()`
```javascript
const formatSkuForEmail = (sku) => {
  // "QTC-92806-9022" -> "92806-9022"
  const i = s.indexOf("-");
  return i >= 0 ? s.slice(i + 1) : s;
};
```
- **Purpose**: Strips vendor prefix from SKU for emails

---

## 6. Dependencies

### 6.1 External Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 18.x | Core framework |
| `antd` | 5.x | UI component library (Table, Form, Modal, Drawer, etc.) |
| `axios` | 1.x | HTTP client |
| `react-highlight-words` | 0.x | Search result highlighting |
| `@ant-design/icons` | 5.x | Icon components |

### 6.2 Internal Dependencies

| Module | Path | Purpose |
|--------|------|---------|
| `Popup` | `./Popup.jsx` | Vendor comparison drawer |
| `TableTop` | `../tabletop/TableTop.jsx` | Metrics dashboard |
| `ProductTable` | `../items/ProductTable.jsx` | Vendor comparison table |
| `Edit, Trash, Save, Reload` | `../../icons` | Custom icon components (partially unused) |
| `useDashboardData` | `../../hooks/useDashboardData` | Dashboard metrics hook |

### 6.3 Environment Dependencies

```javascript
const API_URL = import.meta.env.VITE_API_URL;
```
- **Development**: Vite proxy to `localhost:8080`
- **Production**: Set via environment variable

---

## 7. Error Handling

### 7.1 Current Error Handling Patterns

| Pattern | Location | Implementation |
|---------|----------|----------------|
| Try-catch with console.error | `getBrandForSku()` | Returns empty string on failure |
| Form validation errors | `handleSave()`, `handleSaveSub()` | Catches and logs validation errors |
| Missing data fallbacks | Column renders | Null-safe chaining (`?.`) and `|| ""` defaults |

### 7.2 Missing Error Handling (Technical Debt)

- **No user-facing error notifications**: API failures are logged but not shown to users
- **No retry logic**: Failed requests are not automatically retried
- **No loading states for individual operations**: Only global `loading` state exists
- **Incomplete delete handler**: `handleDeleteOrder` references undefined `data` variable

```javascript
// BUG: data is undefined in this context
const handleDeleteOrder = (record) => {
  // ...
  return axios.post(`${API_URL}/api/orders/${id}/delete`, data); // data is undefined
};
```

---

## 8. Performance Considerations

### 8.1 Current Optimizations

| Optimization | Implementation | Benefit |
|--------------|----------------|---------|
| Brand caching | `brandCacheRef` | Prevents duplicate API calls for same SKU |
| `useCallback` for `loadData` | Memoized function | Prevents unnecessary re-renders |
| Filtered data computation | Inline during render | Only recalculates when filter state changes |

### 8.2 Performance Concerns

| Issue | Impact | Mitigation Suggestion |
|-------|--------|----------------------|
| Large dataset rendering | 1000+ orders without virtualization | Implement virtual scrolling or server-side pagination |
| Full data reload on close | `loadData()` called when drawer closes | Implement optimistic updates or partial refresh |
| Inline metrics calculation | Runs on every render | Memoize with `useMemo` |
| No debounce on search | Each keystroke triggers filter | Add debounce to `handleSearch` |
| Timezone calculations inline | `adjustToToronto()` runs per-order | Pre-calculate date boundaries once |

### 8.3 Recommendations

1. **Implement server-side pagination**: Current design loads all orders at once
2. **Add `useMemo` for computed values**:
   ```javascript
   const metrics = useMemo(() => ({
     notSetCount: orders.filter(...).length,
     todayCount: orders.filter(...).length,
     // ...
   }), [orders]);
   ```
3. **Virtualize large tables**: Use `react-window` or Ant Design's virtual table support
4. **Debounce search input**: Add 300ms delay before filtering

---

## 9. Known Issues & Technical Debt

### 9.1 Bugs

| Issue | Severity | Location | Description |
|-------|----------|----------|-------------|
| Undefined variable | High | `handleDeleteOrder()` | Uses undefined `data` in POST body |
| Delete endpoint path | Medium | `deleteOrderItem()` | Path `/${id}/delete` missing `/api/` prefix |
| Unused state | Low | `selectedOrder` | Set but never used in current implementation |
| Hardcoded exchange rate | Medium | `ProductTable.jsx` | USD/CAD rate hardcoded as 1.5 |

### 9.2 Technical Debt

| Item | Priority | Description |
|------|----------|-------------|
| Large component file | High | 2356 lines in single file; should be split into smaller components |
| Commented-out code | Medium | Significant amount of dead code throughout |
| Duplicate vendor email map | Low | Vendor email mapping duplicated in multiple places |
| Inline column definitions | Medium | 800+ lines of column config could be extracted |
| Missing TypeScript | High | No type safety; prone to runtime errors |
| No unit tests | High | No test coverage for business logic |
| Inconsistent naming | Low | Mix of camelCase and snake_case for state variables |
| Magic numbers | Medium | Date offset (-5 hours) hardcoded for timezone |

### 9.3 Refactoring Recommendations

1. **Split OrderTable into sub-components**:
   - `OrderTableColumns.js` - Column definitions
   - `OrderTableActions.js` - Action handlers
   - `EmailTemplates.js` - Email generation functions
   - `OrderMetrics.js` - Metrics calculation logic

2. **Extract hooks**:
   - `useOrderData()` - Order fetching and state
   - `useOrderEdit()` - Edit mode management
   - `useColumnSearch()` - Search functionality

3. **Add TypeScript**:
   - Define interfaces for Order, OrderItem, Product
   - Type all function parameters and return values

4. **Implement proper error handling**:
   - Add toast notifications for API errors
   - Add error boundaries
   - Implement retry logic

5. **Add configuration file**:
   - Move vendor emails to config
   - Move exchange rates to environment
   - Externalize timezone handling

---

## Appendix A: Column Definitions Summary

### Main Table Columns

| Column | Data Index | Sortable | Searchable | Editable |
|--------|------------|----------|------------|----------|
| Created Date | `created_at` | Yes | Yes | No (disabled) |
| Order ID | `increment_id` | Yes | Yes | No (disabled) |
| Status | `status` | Yes | Yes | No |
| PO# | `custom_po_number` | Yes | Yes | Yes |
| Fraud Score | `weltpixel_fraud_score` | Yes | Yes | Yes |
| Region | `region` | Yes | Yes | Yes |
| Payment Method | `method_title` | Yes | Yes | Yes |
| Shipping | `shipping_description` | Yes | Yes | Yes |
| Shipping Amount | `shipping_amount` | Yes | Yes | Yes |
| Base Total Due | `base_total_due` | Yes | Yes | Yes |
| First Name | `customer_firstname` | Yes | Yes | Yes |
| Total | `grand_total` | Yes | Yes | Yes |
| Currency | `order_currency_code` | Yes | No | No |
| Qty | `total_qty_ordered` | Yes | Yes | Yes |
| Request ETA All | - | No | No | No (actions) |

### Nested Items Table Columns

| Column | Data Index | Description |
|--------|------------|-------------|
| Image | `product.image` | Product thumbnail |
| Product | `name` | Product name with link |
| Black Friday Sale | `product.black_friday_sale` | Sale tag display |
| SKU | `sku` | Product SKU |
| Quantity | `qty_ordered` | Ordered quantity |
| Compare Vendor Costs | - | Opens drawer |
| Price | `price` | Item price |
| BIS | `product.shippingFreight` | Built-in shipping cost |
| Weight (lbs) | `product.weight` | Item weight with warning |
| Request ETA | - | Email buttons |

---

## Appendix B: Vendor Email Configuration

```javascript
const vendorEmailMap = {
  keystone: "purchasing@keystone.com",
  meyer: "orders@meyerdistributing.com",
  omix: "orders@omix-ada.com",
  quadratec: "purchasing@quadratec.com",
};

const DEFAULT_PURCHASING_EMAIL = "purchasing@justjeeps.com";
```

---

## Appendix C: Flagged Regions (Remote/Costly)

```javascript
const flaggedRegions = [
  "New Brunswick",
  "Nova Scotia",
  "Prince Edward Island",
  "Newfoundland & Labrador",
  "Newfoundland",
  "Labrador",
  "Yukon",
  "Northwest Territories",
  "Nunavut",
  "Newfoundland and Labrador",
  "Yukon Territory"
];
```

---

*Document Version: 1.0*
*Last Updated: 2026-01-22*
*Author: Claude Code Assistant*
