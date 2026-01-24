# Purchase Order Management Module - Product Requirements Document

**Document Version:** 1.0
**Module:** Purchase Order Management
**Status:** Reverse-Engineered from Codebase
**Last Updated:** 2026-01-22
**Architecture:** Layered (Presentation Layer)

---

## 1. Overview

### 1.1 Purpose
The Purchase Order (PO) Management module provides a vendor-centric interface for viewing and managing purchase orders within the JustJeeps order management system. It enables operations staff to browse purchase orders organized by supplier and view detailed line item information for each order.

### 1.2 Scope
This PRD documents the currently implemented functionality of the Purchase Order Management module in the JustJeeps frontend application. The module consists of three main components:
- **PoForm**: Main layout container with vendor navigation sidebar
- **PoTableTest (PurchaseOrderTable)**: Purchase order data table with expandable row details
- **PoPopUp**: Drawer-based form component (currently template/placeholder)

### 1.3 Target Users
- Operations staff managing supplier purchase orders
- Warehouse personnel tracking incoming inventory
- Finance team monitoring purchase costs

---

## 2. Problem Statement

### 2.1 Business Context
JustJeeps processes orders from multiple suppliers (Keystone, Meyer, Omix, Quadratec). Each order may contain items from different vendors, requiring separate purchase orders to be placed with each supplier. Operations staff need a centralized view to:
- Track purchase orders by vendor
- View line item details including quantities and costs
- Monitor purchase order costs and totals

### 2.2 Current Solution
The module provides a vendor-organized view of purchase orders with:
- Collapsible sidebar navigation for vendor selection
- Tabular display of purchase orders with expandable rows
- Line item details including SKU mapping, costs, and quantities
- Automatic cost calculations and totals

---

## 3. User Stories

### 3.1 Implemented User Stories

#### US-PO-001: View Purchase Orders by Vendor
**As an** operations staff member
**I want to** view purchase orders filtered by vendor
**So that** I can manage orders for each supplier separately

**Acceptance Criteria:**
- User can select a vendor from the sidebar navigation
- Table displays only purchase orders for the selected vendor
- Supported vendors: Keystone (ID: 1), Meyer (ID: 2), Omix (ID: 3)

#### US-PO-002: View Purchase Order Details
**As an** operations staff member
**I want to** expand a purchase order row to see line item details
**So that** I can review individual items, quantities, and costs

**Acceptance Criteria:**
- User can click to expand any purchase order row
- Expanded view shows: Product SKU, Vendor SKU, Vendor Cost, Quantity Purchased, Total Cost
- Each line item displays cost formatted with dollar sign and 2 decimal places
- Footer displays total cost for all line items

#### US-PO-003: Navigate Vendor Selection
**As an** operations staff member
**I want to** use a collapsible sidebar to select vendors
**So that** I can maximize screen space when viewing data

**Acceptance Criteria:**
- Sidebar can be collapsed/expanded using toggle button
- Collapsed state maintains vendor selection
- Visual indicator shows currently selected vendor

#### US-PO-004: Filter Orders by Related Entity
**As an** operations staff member
**I want to** see related purchase orders when expanding a row
**So that** I can view all POs associated with the same order

**Acceptance Criteria:**
- Expanding a row filters table to show only POs with matching order entity_id
- Collapsing row restores full purchase order list

### 3.2 Partial/Incomplete User Stories

#### US-PO-005: Create/Edit Purchase Order (Not Implemented)
**As an** operations staff member
**I want to** create or edit purchase orders
**So that** I can manage new supplier orders

**Current Status:** PoPopUp component exists as a template with generic form fields (Name, URL, Owner, Type, Approver, DateTime, Description). This appears to be placeholder code from an Ant Design example that has not been customized for PO creation.

#### US-PO-006: View Quadratec Purchase Orders (Not Implemented)
**As an** operations staff member
**I want to** view purchase orders from Quadratec
**So that** I can manage all vendor orders

**Current Status:** Quadratec is listed in the navigation menu but selecting it renders null content. The vendorId mapping for Quadratec (nav4) is not connected to the PoTableTest component.

---

## 4. Functional Requirements

### 4.1 Main Layout (PoForm)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-PO-001 | Display collapsible sidebar with vendor menu | Implemented |
| FR-PO-002 | Sidebar background color: #2938c3 (blue) | Implemented |
| FR-PO-003 | Sidebar default width: 200px | Implemented |
| FR-PO-004 | Toggle button to collapse/expand sidebar | Implemented |
| FR-PO-005 | Display "PURCHASE ORDERS DETAILS" header | Implemented |
| FR-PO-006 | Render vendor-specific PO table based on selection | Implemented |
| FR-PO-007 | Display footer with copyright notice | Implemented |
| FR-PO-008 | Default vendor selection: Keystone (nav1) | Implemented |

### 4.2 Vendor Navigation

| ID | Requirement | Status |
|----|-------------|--------|
| FR-PO-009 | Menu item: Keystone (nav1, vendorId: 1) | Implemented |
| FR-PO-010 | Menu item: Meyer (nav2, vendorId: 2) | Implemented |
| FR-PO-011 | Menu item: Omix (nav3, vendorId: 3) | Implemented |
| FR-PO-012 | Menu item: Quadratec (nav4) | Partial - Menu item exists but renders null |

### 4.3 Purchase Order Table (PoTableTest)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-PO-013 | Display table with columns: Order ID, PO ID, Created At, User | Implemented |
| FR-PO-014 | Center-align all column data | Implemented |
| FR-PO-015 | Equal column width distribution (25% each) | Implemented |
| FR-PO-016 | Fetch PO data from API: GET /api/purchase_orders/vendor/{vendorId} | Implemented |
| FR-PO-017 | Expandable rows for line item details | Implemented |
| FR-PO-018 | Re-fetch data when vendorId prop changes | Implemented |

### 4.4 Expanded Row Details

| ID | Requirement | Status |
|----|-------------|--------|
| FR-PO-019 | Display line item columns: Product SKU, Vendor SKU, Vendor Cost, Quantity Purchased, Total Cost | Implemented |
| FR-PO-020 | Calculate Vendor SKU from product_sku (extract after first hyphen) | Implemented |
| FR-PO-021 | Format Vendor Cost with $ and 2 decimals | Implemented |
| FR-PO-022 | Calculate Total Cost per line (vendor_cost * quantity_purchased) | Implemented |
| FR-PO-023 | Display footer with sum of all line item costs | Implemented |
| FR-PO-024 | Show "No Purchase Order Line Items found" if empty | Implemented |

### 4.5 PO Dashboard (DashBoardPO)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-PO-025 | Display widgets: Number of Products, Total Ordered | Implemented (structure only - data fetch disabled) |
| FR-PO-026 | Display Most Popular Product with details | Implemented (structure only - data fetch disabled) |
| FR-PO-027 | Display Orders By Vendors pie chart | Implemented (structure only - data fetch disabled) |
| FR-PO-028 | Display Top 10 Popular Products table | Implemented (structure only - data fetch disabled) |

---

## 5. Non-Functional Requirements

### 5.1 Performance
| ID | Requirement | Status |
|----|-------------|--------|
| NFR-PO-001 | Minimum content height: 650px | Implemented |
| NFR-PO-002 | API calls execute on component mount and vendorId change | Implemented |

### 5.2 Usability
| ID | Requirement | Status |
|----|-------------|--------|
| NFR-PO-003 | Consistent Ant Design theming | Implemented |
| NFR-PO-004 | Responsive layout with Ant Design Layout components | Implemented |
| NFR-PO-005 | Clear visual hierarchy with bold headers | Implemented |

### 5.3 Security
| ID | Requirement | Status |
|----|-------------|--------|
| NFR-PO-006 | Route protected by ProtectedRoute wrapper | Implemented |
| NFR-PO-007 | Authentication required to access /po route | Implemented |

---

## 6. Technical Implementation

### 6.1 Component Architecture

```
src/features/po/
├── PoForm.jsx          # Main layout container with sidebar navigation
├── PoTableTest.jsx     # Purchase order data table component
├── PoPopUp.jsx         # Drawer form component (placeholder)
├── poform.scss         # Styling for PoForm
└── [vendor logos]      # PNG assets for vendor branding
```

### 6.2 Technology Stack
- **UI Framework**: React 18
- **Component Library**: Ant Design (Layout, Menu, Table, Button, theme)
- **HTTP Client**: Axios
- **Styling**: SCSS
- **Build Tool**: Vite
- **Icons**: @ant-design/icons (MenuFoldOutlined, MenuUnfoldOutlined)

### 6.3 State Management
- **Local State**: React useState hooks
  - `collapsed`: Sidebar collapse state
  - `currentNav`: Selected vendor navigation key
  - `purchaseOrderData`: Current filtered/displayed PO data
  - `originalPurchaseOrderData`: Full PO data from API
  - `subtableTotalCost`: Running total for expanded row (note: computed but not persisted correctly)

### 6.4 API Integration

#### Endpoint: GET /api/purchase_orders/vendor/{vendorId}
**Purpose**: Fetch purchase orders for a specific vendor

**Request Parameters**:
- `vendorId` (path): Vendor identifier (1=Keystone, 2=Meyer, 3=Omix)

**Response Structure** (based on code analysis):
```json
[
  {
    "id": 3,
    "created_at": "2023-04-18T03:34:21.667Z",
    "user_id": 1,
    "order_id": 81806,
    "vendor_id": 2,
    "vendor": {
      "id": 2,
      "name": "Meyer",
      "website": "https://online.meyerdistributing.com"
    },
    "user": {
      "id": 1,
      "firstname": "Admin",
      "lastname": "User"
    },
    "order": {
      "entity_id": 81806,
      "created_at": "2023-03-20 23:14:54",
      "status": "processing",
      "customer_email": "customer@example.com",
      "grand_total": 75.83
    },
    "purchaseOrderLineItems": [
      {
        "id": 1,
        "product_sku": "ORL-5889-005-T",
        "quantity_purchased": 2,
        "vendor_cost": 12,
        "vendorProduct": {
          "vendor_sku": "ORL5889-005-T",
          "vendor_cost": 51.31
        }
      }
    ]
  }
]
```

### 6.5 Routing Configuration

| Route | Component | Protection | Description |
|-------|-----------|------------|-------------|
| /po | PoForm | ProtectedRoute | Main PO management interface |
| /dashboard/po | DashBoardPO | ProtectedRoute | PO analytics dashboard |

### 6.6 Vendor ID Mapping

| Navigation Key | Vendor Name | Vendor ID | Status |
|----------------|-------------|-----------|--------|
| nav1 | Keystone | 1 | Active |
| nav2 | Meyer | 2 | Active |
| nav3 | Omix | 3 | Active |
| nav4 | Quadratec | - | Inactive (renders null) |

---

## 7. Dependencies

### 7.1 Internal Dependencies
| Dependency | Type | Description |
|------------|------|-------------|
| Supplier Management | Data | Vendor IDs and metadata used for PO filtering |
| Order Management | Data | Order entity_id links POs to original orders |
| Authentication | Security | ProtectedRoute wrapper for access control |

### 7.2 External Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| antd | ^5.x | UI components (Layout, Menu, Table, Button) |
| @ant-design/icons | ^5.x | Navigation icons |
| axios | ^1.x | HTTP client for API calls |
| react-router-dom | ^6.x | Route definitions |

---

## 8. Current Limitations

### 8.1 Functional Limitations

1. **Quadratec Vendor Not Functional**: The Quadratec menu item (nav4) is present but selecting it renders no content. The conditional rendering in PoForm.jsx does not include a case for nav4.

2. **PoPopUp Not Integrated**: The PoPopUp component is a generic Ant Design Drawer template that has not been customized for PO creation/editing. It references undefined variables (`onClose`, `open`, `Option`) and uses placeholder fields unrelated to purchase orders.

3. **No PO Creation Capability**: Users cannot create new purchase orders through the UI. The module is currently read-only.

4. **No PO Editing Capability**: Existing purchase orders cannot be modified through the UI.

5. **No PO Deletion Capability**: Users cannot delete purchase orders.

6. **Dashboard Data Disabled**: The useDashboardpoData hook has its API fetch logic commented out, resulting in empty dashboard data (numProduct: 0, totalSold: 0, topPopular: []).

7. **State Management Issue**: The `setSubtableTotalCost` is called during render in `expandedRowRender`, which is an anti-pattern and may cause performance issues.

8. **Hardcoded Vendor IDs**: Vendor selection uses hardcoded IDs (1, 2, 3) rather than fetching from the Supplier Management module.

9. **No Pagination Configuration**: The main table uses default Ant Design pagination without customization.

10. **No Search/Filter**: Users cannot search or filter purchase orders within the selected vendor.

11. **No Date Filtering**: No ability to filter POs by date range.

12. **No Export Functionality**: Cannot export PO data to CSV/Excel.

### 8.2 Technical Limitations

1. **Console Logging in Production**: Multiple `console.log` statements remain in the code for debugging.

2. **Missing Error Handling UI**: API errors are only logged to console; no user-facing error messages.

3. **No Loading States**: No loading indicators while fetching data.

4. **Commented-Out Code**: Significant portions of dashboard hook code are commented out, indicating incomplete feature development.

5. **Unused Imports**: PoForm.jsx imports vendor logo images that are not used in the current implementation.

6. **Table Row Key Warning**: The data structure may cause React key warnings as `id` values can be duplicated (visible in sample data).

### 8.3 UX Limitations

1. **No Empty State**: When a vendor has no purchase orders, only an empty table is shown.

2. **No Breadcrumb Navigation**: Users cannot easily understand their location within the app hierarchy.

3. **Inconsistent Row Expansion Behavior**: Expanding a row filters the entire table to related orders, which may confuse users expecting only the row to expand.

---

## 9. Data Model Reference

### 9.1 Purchase Order Entity
```typescript
interface PurchaseOrder {
  id: number;
  created_at: string;          // ISO 8601 timestamp
  user_id: number;
  order_id: number;
  vendor_id: number;
  vendor: Vendor;
  user: User;
  order: Order;
  purchaseOrderLineItems: PurchaseOrderLineItem[];
}
```

### 9.2 Purchase Order Line Item Entity
```typescript
interface PurchaseOrderLineItem {
  id: number;
  purchase_order_id: number;
  vendor_product_id: number;
  product_sku: string;
  quantity_purchased: number;
  vendor_cost: number;
  vendorProduct: VendorProduct;
}
```

### 9.3 Vendor Product Entity
```typescript
interface VendorProduct {
  id: number;
  product_sku: string;
  vendor_id: number;
  vendor_sku: string;
  vendor_cost: number;
  vendor_inventory: number;
}
```

---

## 10. File Reference

| File Path | Purpose |
|-----------|---------|
| `src/features/po/PoForm.jsx` | Main layout with sidebar navigation |
| `src/features/po/PoTableTest.jsx` | Purchase order table with expandable rows |
| `src/features/po/PoPopUp.jsx` | Drawer form placeholder (unused) |
| `src/features/po/poform.scss` | Styling for PoForm component |
| `src/features/dashboard/DashBoardPO.jsx` | PO analytics dashboard |
| `src/features/dashboard/dashboardpo.scss` | Dashboard styling |
| `src/features/table/Poptable.jsx` | Popular products table for dashboard |
| `src/hooks/useDashboardData.js` | Dashboard data hooks (fetch disabled) |
| `src/App.jsx` | Route definitions for /po and /dashboard/po |

---

## 11. Appendix

### 11.1 Vendor Logo Assets
The following logo assets exist in `src/features/po/` but are not currently used in the implementation:
- `keystone-Logo-White.png`
- `meyerlogo_small.png`
- `omix-logo.png`
- `quadratec_logo.png`

Note: PoForm.jsx imports logos from `src/assets/` instead, but these imports are unused.

### 11.2 Sample Data Structure
The file `PoTableTest.jsx` contains a `purchaseOrders` constant (lines 176-371) with sample data that illustrates the expected API response structure. This data is defined but not used in the component rendering.
