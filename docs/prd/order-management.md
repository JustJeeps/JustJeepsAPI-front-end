# PRD: Order Management Module

## Overview

The Order Management module is the primary operational interface for JustJeeps order processing. It provides a comprehensive table-based view of customer orders from the JustJeeps.com e-commerce platform, enabling purchasing staff to view, filter, search, and process orders efficiently. The module integrates vendor cost comparison, email generation for vendor communication, and real-time metrics display to streamline the order fulfillment workflow.

## Problem Statement

JustJeeps needs an efficient way to manage incoming orders from their e-commerce platform. Staff must be able to:
- View all orders with key information at a glance
- Quickly identify orders requiring attention (missing PO numbers, high fraud scores)
- Compare vendor costs to select the best supplier for each product
- Generate standardized email communications to vendors for ETA and cost confirmations
- Track order metrics and status across different time periods
- Filter orders by PO status to prioritize work

Without this system, order processing would require manual data lookup across multiple systems, leading to inefficiencies, missed orders, and potential margin erosion from suboptimal vendor selection.

## User Stories

### Order Viewing and Navigation
- As a purchasing agent, I want to see all orders in a sortable table so that I can quickly find specific orders
- As a purchasing agent, I want to search orders by Order ID, customer name, status, or other fields so that I can locate orders quickly
- As a purchasing agent, I want to expand order rows to see individual line items so that I can view product details
- As a purchasing agent, I want to click on an Order ID to navigate directly to the Magento admin panel so that I can access full order details

### Order Filtering and Metrics
- As a purchasing manager, I want to see real-time metrics (today's orders, yesterday's orders, not-set orders) so that I can monitor workload
- As a purchasing agent, I want to filter orders by PO status ("Not Set" or "PM Not Set") so that I can prioritize orders requiring attention
- As a purchasing agent, I want to identify US orders (starting with "3") so that I can handle cross-border logistics

### Vendor Cost Comparison
- As a purchasing agent, I want to compare vendor costs for each product so that I can select the vendor with the best margin
- As a purchasing agent, I want to see suggested vendors based on lowest cost with inventory so that I can make quick decisions
- As a purchasing agent, I want to see margin percentages calculated automatically so that I can ensure profitability
- As a purchasing agent, I want to mark a vendor as selected so that the order item is updated with the supplier information

### Email Communication
- As a purchasing agent, I want to generate pre-formatted emails to vendors for individual items so that I can request ETA and cost confirmation efficiently
- As a purchasing agent, I want to generate emails for all items in an order at once so that I can batch my communications
- As a purchasing agent, I want separate email templates for drop-ship and ship-to-store scenarios so that vendors receive appropriate shipping instructions

### Fraud and Risk Detection
- As a purchasing manager, I want high fraud scores highlighted so that I can review risky orders
- As a purchasing agent, I want Quebec orders over $300 flagged so that I can verify payment before processing
- As a purchasing agent, I want remote/costly regions flagged so that I can account for additional shipping costs
- As a purchasing agent, I want heavy items (over 50 lbs) flagged so that I can plan for freight shipping

## Functional Requirements

### FR-1: Order Table Display
**Description**: Display orders in a paginated, sortable, searchable Ant Design table with expandable rows.

**Acceptance Criteria**:
- Table displays columns: Created Date, Order ID, Status, PO#, Fraud Score, Region, Payment Method, Shipping Description, Shipping Amount, Base Total Due, First Name, Total, Currency, Qty, Request ETA All
- Orders are sortable by any column via clicking column headers
- Search functionality available per column with highlight matching
- Pagination controls at top-right of table
- Row expansion shows nested table of order items
- Loading state displayed during data fetch

### FR-2: Order Data Refresh
**Description**: Allow users to manually refresh order data from the backend Magento sync.

**Acceptance Criteria**:
- "Update Orders" button triggers `/api/seed-orders` endpoint
- Loading indicator shown during refresh
- Table data updates automatically after refresh completes

### FR-3: Order Metrics Dashboard (TableTop)
**Description**: Display key order metrics in card format above the order table.

**Acceptance Criteria**:
- Display count of "Not Set" orders (PO number exactly equals "not set")
- Display count of today's orders (Toronto timezone)
- Display count of yesterday's orders
- Display count of last 7 days' orders
- Display count of "PM Not Set" orders (PO contains "pm" and "not set")
- "Not Set" and "PM Not Set" cards are clickable to filter the table

### FR-4: Order Filtering by PO Status
**Description**: Filter orders based on PO number status.

**Acceptance Criteria**:
- Toggle "Not Set" filter shows only orders where `custom_po_number` exactly equals "not set"
- Toggle "PM Not Set" filter shows orders where PO contains both "pm" and "not set"
- Filters are mutually exclusive
- Clicking same filter again removes the filter

### FR-5: Order Status Visual Indicators
**Description**: Provide visual cues for order status and risk factors.

**Acceptance Criteria**:
- Order ID displays green checkmark if PO is assigned, red dot if "not set", yellow dot if partially set
- US orders (increment_id starting with "3") display US flag icon
- Order status displayed as colored tags: processing (orange), pending (blue), canceled (volcano), complete (green)
- Fraud score highlighted red with exclamation icon if > 10 (unless PayPal payment)
- Quebec orders > $300 highlighted with exclamation icon
- Remote regions flagged with exclamation icon (NB, NS, PEI, NL, Yukon, NWT, Nunavut)
- PO# column shows "NOT SET" in red bold if missing

### FR-6: Order Item Expansion
**Description**: Display order line items in an expandable nested table.

**Acceptance Criteria**:
- Nested table columns: Image, Product Name, Black Friday Sale, SKU, Quantity, Compare Vendor Costs, Price, BIS (Built-in Shipping), Weight, Request ETA
- Product name links to product URL if available
- Image displays product image or placeholder
- Weight displays with exclamation icon if >= 50 lbs
- Black Friday sale tag displays with color-coded discount percentage

### FR-7: Vendor Cost Comparison (Popup Drawer)
**Description**: Display vendor pricing information in a slide-out drawer for cost comparison.

**Acceptance Criteria**:
- Drawer opens when clicking "Compare Vendor Costs" icon
- ProductTable displays: Manufacturer, Image, Name, Price, Competitor Prices, Suggested Vendor, Vendors for Brand, Vendor Name, Vendor Cost, Margin %, Vendor Inventory
- Suggested Vendor shows lowest-cost vendor with inventory, with margin calculation
- Margin displayed with green/red color coding (> 18% green, <= 18% red)
- Currency conversion applied for USD orders (divided by 1.5)
- Vendor names link to their respective wholesale portals
- Competitor prices link to competitor search pages
- Checkbox allows selecting a vendor, updating order item with selected_supplier and selected_supplier_cost

### FR-8: Vendor Email Generation
**Description**: Generate pre-formatted mailto links for vendor communication.

**Acceptance Criteria**:
- "Email (DropShip)" button generates email with shipping address included
- "Email (Ship to Store)" button generates email without shipping address
- Email subject format: "Order {increment_id}"
- Email body includes: item line (qty x BRAND SKU), request for ETA/cost/shipping cost, ship-to address (for DS)
- "ETA, cost, and shipping cost" phrase is underlined using Unicode combining characters
- Brand name extracted from product data or inferred from product name
- SKU formatted without vendor prefix (e.g., "QTC-92806-9022" becomes "92806-9022")
- "Email ALL (DS)" and "Email ALL (Store)" buttons generate emails for all items in an order

### FR-9: Order Inline Editing
**Description**: Allow editing of order fields directly in the table.

**Acceptance Criteria**:
- Edit mode activated via edit button (currently commented out in implementation)
- Editable fields include: customer_email, customer_firstname, customer_lastname, grand_total, total_qty_ordered, custom_po_number
- Form validation required for all fields
- Save button updates order via `/api/orders/{entity_id}/edit` endpoint
- Cancel editing reverts to original values

### FR-10: Order and Order Item Deletion
**Description**: Allow deletion of orders and individual order items.

**Acceptance Criteria**:
- Delete confirmation modal displayed before deletion
- Order deletion via `/api/orders/{id}/delete` endpoint
- Order item deletion via `/{id}/delete` endpoint
- Table updates immediately after deletion

### FR-11: Purchase Order Creation
**Description**: Create purchase orders from order items (functionality present but not exposed in UI).

**Acceptance Criteria**:
- Maps supplier name to vendor_id (Keystone=1, Meyer=2, Omix=3, Quadratec=4)
- Creates purchase order via `/api/purchase_orders` endpoint
- Creates purchase order line item via `/purchaseOrderLineItem` endpoint
- Confirmation modal displayed on success

## Non-Functional Requirements

### NFR-1: Performance
- Order table must load within 3 seconds for up to 1000 orders
- Drawer must open within 500ms
- Table sorting and filtering must be instantaneous (client-side)

### NFR-2: Responsiveness
- Table must be horizontally scrollable on small screens
- Dashboard cards must stack vertically on screens < 768px
- Font sizes adjust for mobile (16px headers, 12px buttons)

### NFR-3: Browser Compatibility
- Support Chrome, Firefox, Safari, Edge (latest versions)
- Mobile Safari smooth scroll support for table wrapper

### NFR-4: Security
- All routes protected by authentication (ProtectedRoute component)
- API calls use environment-configured base URL
- No sensitive data exposed in client-side code

### NFR-5: Accessibility
- Tooltips provided for all icon buttons
- Color contrast meets WCAG AA standards
- Table headers properly associated with data cells

## Technical Implementation

### Architecture

The Order Management module follows a layered architecture within the React SPA:

```
src/features/order/
  OrderTable.jsx      # Main container component (2300+ lines)
  OrderProductList.jsx # Alternative order list view (unused in production)
  OrderProduct.jsx     # Order product display component (incomplete)
  OrdersList.jsx       # Legacy table view with Redux (unused)
  Popup.jsx           # Drawer container for vendor comparison
  order.scss          # SCSS styles for order components

src/features/tabletop/
  TableTop.jsx        # Metrics dashboard cards component

src/features/items/
  ProductTable.jsx    # Vendor comparison table displayed in Popup
```

**Component Hierarchy**:
```
OrderTable (main container)
  |-- TableTop (metrics cards)
  |-- Form (Ant Design form wrapper)
  |     |-- Table (main orders table)
  |           |-- expandedRowRender() (nested items table)
  |-- Popup (drawer for vendor comparison)
        |-- ProductTable (vendor pricing table)
```

### Data Flow

1. **Initial Load**:
   - `useEffect` triggers `loadData()` on component mount
   - `axios.get(/api/orders)` fetches all orders
   - Data stored in `orders` and `originalOrders` state

2. **Order Refresh**:
   - "Update Orders" button triggers `handleSeedOrders()`
   - `axios.get(/api/seed-orders)` syncs orders from Magento
   - `loadData()` called to refresh displayed data

3. **Filtering**:
   - `showNotSetOnly` and `showPmOnly` boolean states control filters
   - Filters applied client-side to `orders` array
   - `filteredOrders` computed before mapping to table data

4. **Vendor Comparison Flow**:
   - User clicks SearchOutlined icon on order item
   - `showDrawer()` sets current SKU, order product ID, price, currency
   - `Popup` component mounts with `open={true}`
   - `Popup` calls `axios.get(/api/products/{sku})` to fetch product data
   - `ProductTable` renders vendor comparison data

5. **Vendor Selection**:
   - User clicks checkbox on vendor row
   - `handleVendorCostClick()` calls POST to `/order_products/{id}/edit/selected_supplier`
   - Updates `selected_supplier` and `selected_supplier_cost` on order item

6. **Email Generation**:
   - All email templates built client-side using order data
   - `mailto:` URLs opened via button click
   - Brand names fetched asynchronously via `/api/products/{sku}/brand` with caching

### API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/orders` | GET | Fetch all orders |
| `/api/seed-orders` | GET | Sync orders from Magento |
| `/api/orders/{id}/edit` | POST | Update order fields |
| `/api/orders/{id}/delete` | POST | Delete an order |
| `/api/products/{sku}` | GET | Fetch product details for vendor comparison |
| `/api/products/{sku}/brand` | GET | Fetch brand name for SKU |
| `/order_products/{id}/edit` | POST | Update order item |
| `/order_products/{id}/edit/selected_supplier` | POST | Update selected vendor |
| `/{id}/delete` | DELETE | Delete order item |
| `/api/purchase_orders` | POST | Create purchase order |
| `/purchaseOrderLineItem` | POST | Create PO line item |

### State Management

**Local Component State (useState)**:
- `orders` - Array of order objects
- `originalOrders` - Backup of all orders for reset after filtering/expansion
- `sortedInfo` - Current sort column and direction
- `loading` - Loading indicator state
- `searchText`, `searchedColumn` - Column search states
- `editingRow` - Currently editing row key
- `open` - Drawer visibility
- `currentSku`, `currentOrderProductID`, `currentOrderProductPrice`, `currentCurrency` - Selected item for drawer
- `selectedOrder` - Currently expanded order
- `showNotSetOnly`, `showPmOnly` - Filter toggles

**Form State**:
- Ant Design Form instance (`form`) manages inline editing state

**Ref State**:
- `searchInput` - Reference to search input for focus
- `brandCacheRef` - Cache for brand name API responses

**Derived State**:
- `filteredOrders` - Computed from `orders` based on filter flags
- `data` - Mapped orders array with `key` property for table
- Metrics (notSetOrdersCount, ordersToday, etc.) - Computed from orders array

## Dependencies

### Internal Dependencies
- `AuthContext` / `ProtectedRoute` - Authentication wrapper
- `useDashboardData` hook - Dashboard state (currently mostly disabled)
- Custom icons (`Edit`, `Trash`, `Save`, `Reload`)
- `CopyText` component - Clipboard copy functionality

### External Dependencies
- **UI Framework**: Ant Design v4+ (Table, Input, Button, Modal, Form, Tooltip, Select, Badge, Tag, Drawer, Card, Statistic)
- **Additional UI**: @ant-design/icons, react-highlight-words
- **HTTP Client**: axios
- **Routing**: react-router-dom v6
- **Styling**: Bootstrap SCSS, custom SCSS

### Backend Dependencies
- Express.js API server (port 8080)
- Magento 2 integration for order data
- PostgreSQL database for order and product storage

## Current Limitations

### Technical Debt
1. **Large Component Size**: OrderTable.jsx is 2300+ lines and should be refactored into smaller components
2. **Commented Code**: Extensive commented-out code for unused features (vendor cost columns, margin display, status editing)
3. **Hardcoded Values**:
   - Vendor ID mapping hardcoded (Keystone=1, Meyer=2, etc.)
   - Email addresses hardcoded in vendorEmailMap
   - Timezone offset hardcoded (-5 hours for EST)
   - Currency conversion rate hardcoded (1.5)
4. **Incomplete Components**: OrderProduct.jsx and OrdersList.jsx are non-functional
5. **Mixed Data Sources**: Some components reference local JSON files (`orderProductsJoin.json`)

### Feature Limitations
1. **No Pagination Server-Side**: All orders loaded at once, limiting scalability
2. **Limited Offline Support**: No caching or offline mode
3. **No Real-Time Updates**: Manual refresh required for new orders
4. **Edit Actions Disabled**: Save/Edit/Delete buttons commented out in main table
5. **No Bulk Operations**: Cannot select multiple orders for batch processing
6. **No Export Functionality**: Cannot export orders to CSV/Excel
7. **Limited Error Handling**: API errors may not display user-friendly messages

### Known Issues
1. **Timezone Handling**: Hardcoded -5 hour offset doesn't account for Daylight Saving Time
2. **Delete Endpoint Inconsistency**: Order item delete uses path `/{id}/delete` without proper API_URL prefix
3. **Form Validation Gaps**: Some required field validations may not trigger properly
4. **Memory Usage**: Brand cache ref never cleared, could grow unbounded

## Future Considerations

1. **Server-Side Pagination**: Implement pagination on backend for better scalability
2. **WebSocket Integration**: Real-time order updates without manual refresh
3. **Component Refactoring**: Break OrderTable into smaller, testable components
4. **State Management**: Consider Redux or Zustand for complex state
5. **Automated Testing**: Add unit and integration tests
6. **Accessibility Audit**: Full WCAG compliance review
7. **Mobile App**: Consider React Native for mobile order management
