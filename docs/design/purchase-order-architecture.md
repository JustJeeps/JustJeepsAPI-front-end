# Purchase Order Table & Vendor Filtering - Design Document

**Document Version:** 1.0
**Component:** Purchase Order Management UI
**Parent PRD:** [purchase-order-management.md](../prd/purchase-order-management.md)
**Status:** Approved
**Last Updated:** 2026-01-22

---

## 1. Overview

### 1.1 Purpose
This design document describes the technical architecture for the Purchase Order Table and Vendor Filtering component within the JustJeeps order management frontend. The component provides a vendor-centric interface for viewing purchase orders with collapsible sidebar navigation, expandable row details, and line item cost calculations.

### 1.2 Scope
- Main layout container (PoForm) with Ant Design Layout structure
- Collapsible sidebar navigation for vendor selection
- Purchase order data table (PoTableTest/PurchaseOrderTable) with vendor filtering
- Expandable row details showing line items with cost calculations
- Integration with backend API for purchase order data retrieval

### 1.3 Responsibility
| Aspect | Responsibility |
|--------|----------------|
| Vendor Navigation | Sidebar menu for switching between vendor-specific PO views |
| Data Display | Tabular presentation of purchase orders per vendor |
| Row Expansion | Detailed line item view with cost calculations |
| Vendor Filtering | API-based filtering by vendor ID |

---

## 2. Architecture

### 2.1 Component Architecture Diagram

```
                    +------------------+
                    |     App.jsx      |
                    | (Route: /po)     |
                    +--------+---------+
                             |
                             v
                    +------------------+
                    |  ProtectedRoute  |
                    | (Auth wrapper)   |
                    +--------+---------+
                             |
                             v
+------------------------------------------------------------+
|                       PoForm.jsx                            |
|  +----------------+  +----------------------------------+   |
|  |    Sider      |  |           Content                |   |
|  | (collapsible) |  |  +----------------------------+  |   |
|  |               |  |  |     PoTableTest.jsx        |  |   |
|  | [Keystone]    |  |  |   (PurchaseOrderTable)     |  |   |
|  | [Meyer]       |  |  |                            |  |   |
|  | [Omix]        |  |  |  +----------------------+  |  |   |
|  | [Quadratec]   |  |  |  | Main Table           |  |  |   |
|  |               |  |  |  | (PO rows)            |  |  |   |
|  +----------------+  |  |  +----------+-----------+  |  |   |
|                      |  |             |              |  |   |
|                      |  |             v (expand)     |  |   |
|                      |  |  +----------------------+  |  |   |
|                      |  |  | Expanded Row         |  |  |   |
|                      |  |  | (Line Items Table)   |  |  |   |
|                      |  |  +----------------------+  |  |   |
|                      |  +----------------------------+  |   |
|                      +----------------------------------+   |
+------------------------------------------------------------+
```

### 2.2 Component Hierarchy

```
PoForm (Main Container)
├── Layout (Ant Design)
│   ├── Sider (Collapsible Sidebar)
│   │   └── Menu (Vendor Navigation)
│   │       ├── MenuItem: Keystone (nav1)
│   │       ├── MenuItem: Meyer (nav2)
│   │       ├── MenuItem: Omix (nav3)
│   │       └── MenuItem: Quadratec (nav4) [incomplete]
│   └── Layout (Content Area)
│       ├── Header
│       │   ├── Toggle Button (collapse/expand)
│       │   └── Title: "PURCHASE ORDERS DETAILS"
│       ├── Content
│       │   └── PoTableTest (vendorId prop)
│       │       ├── Table (Main PO Table)
│       │       │   └── Expandable Row
│       │       │       └── Table (Line Items)
│       │       │           └── Footer (Total Cost)
│       └── Footer (Copyright)
```

### 2.3 File Structure

```
src/features/po/
├── PoForm.jsx          # Main layout container with sidebar
├── PoTableTest.jsx     # Purchase order table component
├── PoPopUp.jsx         # Drawer form (placeholder - not integrated)
└── poform.scss         # PoForm styling

src/features/dashboard/
├── DashBoardPO.jsx     # PO analytics dashboard (related)
└── dashboardpo.scss    # Dashboard styling

src/hooks/
└── useDashboardData.js # Dashboard data hooks (includes useDashboardpoData)

src/assets/
├── keystone.png        # Vendor logo (imported but unused)
├── meyer.png           # Vendor logo (imported but unused)
├── omix.png            # Vendor logo (imported but unused)
└── quadratec.png       # Vendor logo (imported but unused)
```

---

## 3. Data Flow

### 3.1 Vendor Selection Flow

```
User clicks vendor menu item
        │
        v
handleNavClick(e)
        │
        v
setCurrentNav(e.key)   // "nav1", "nav2", "nav3", or "nav4"
        │
        v
Conditional rendering in Content
        │
        ├── nav1 → <PoTableTest vendorId="1" />  (Keystone)
        ├── nav2 → <PoTableTest vendorId="2" />  (Meyer)
        ├── nav3 → <PoTableTest vendorId="3" />  (Omix)
        └── nav4 → null (Quadratec - not implemented)
```

### 3.2 Data Fetching Flow

```
PoTableTest mounts with vendorId prop
        │
        v
useEffect([vendorId]) triggers
        │
        v
GET /api/purchase_orders/vendor/{vendorId}
        │
        v
Response: PurchaseOrder[]
        │
        ├──> setOriginalPurchaseOrderData(responseData)
        └──> setPurchaseOrderData(responseData)
        │
        v
Table renders with purchaseOrderData
```

### 3.3 Row Expansion Flow

```
User clicks expand icon on PO row
        │
        v
handleExpand(expanded, record)
        │
        ├── If expanded === true
        │   └── Filter originalPurchaseOrderData by order.entity_id
        │       └── setPurchaseOrderData(filteredData)
        │
        └── If expanded === false
            └── setPurchaseOrderData(originalPurchaseOrderData)
        │
        v
expandedRowRender(record)
        │
        v
Extract purchaseOrderLineItems from record
        │
        v
Map line items with calculated total_cost
        │
        v
Render nested Table with line items
        │
        v
Display footer with sum of all line item costs
```

### 3.4 State Management Diagram

```
+---------------------------+
|        PoForm State       |
+---------------------------+
| collapsed: boolean        |  <- Sidebar collapse state
| currentNav: string        |  <- Selected vendor key
+---------------------------+
            │
            │ vendorId prop
            v
+---------------------------+
|    PoTableTest State      |
+---------------------------+
| originalPurchaseOrderData |  <- Full API response
| purchaseOrderData         |  <- Filtered/displayed data
| subtableTotalCost         |  <- Expanded row total (anti-pattern)
+---------------------------+
```

---

## 4. API Integration

### 4.1 Endpoint Specification

**Endpoint:** `GET /api/purchase_orders/vendor/{vendorId}`

**Purpose:** Retrieve all purchase orders for a specific vendor

**Request:**
| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| vendorId | string | path | Vendor identifier (1, 2, 3) |

**Response Schema:**
```typescript
interface PurchaseOrderResponse {
  id: number;
  created_at: string;              // ISO 8601 timestamp
  user_id: number;
  order_id: number;
  vendor_id: number;
  vendor: {
    id: number;
    name: string;
    website: string;
    address: string;
    phone_number: string;
    main_contact: string;
    username: string;
    password: string;
  };
  user: {
    id: number;
    firstname: string;
    lastname: string;
    username: string;
    email: string;
    password: string;
  };
  order: {
    entity_id: number;
    id: number;
    created_at: string;
    status: string;
    customer_email: string;
    coupon_code: string | null;
    customer_firstname: string;
    customer_lastname: string;
    grand_total: number;
    increment_id: string;
    order_currency_code: string;
    total_qty_ordered: number;
    items: OrderItem[];
  };
  purchaseOrderLineItems: PurchaseOrderLineItem[];
}

interface PurchaseOrderLineItem {
  id: number;
  purchase_order_id: number;
  vendor_product_id: number;
  product_sku: string;
  quantity_purchased: number;
  vendor_cost: number;
  vendorProduct: {
    id: number;
    product_sku: string;
    vendor_id: number;
    vendor_sku: string;
    vendor_cost: number;
    vendor_inventory: number;
  };
  purchaseOrder: PurchaseOrder;
}
```

### 4.2 API Configuration

```javascript
const API_URL = import.meta.env.VITE_API_URL;

// API call in useEffect
axios.get(`${API_URL}/api/purchase_orders/vendor/${vendorId}`)
```

### 4.3 Vendor ID Mapping

| Navigation Key | Vendor Name | Vendor ID | API Endpoint |
|----------------|-------------|-----------|--------------|
| nav1 | Keystone | 1 | /api/purchase_orders/vendor/1 |
| nav2 | Meyer | 2 | /api/purchase_orders/vendor/2 |
| nav3 | Omix | 3 | /api/purchase_orders/vendor/3 |
| nav4 | Quadratec | - | Not implemented |

---

## 5. Component Specifications

### 5.1 PoForm Component

**File:** `/Users/ricardotassio/DEV/TRABALHO/JUSTJEEPS/JustJeepsAPI-front-end/src/features/po/PoForm.jsx`

**Purpose:** Main layout container with collapsible sidebar navigation for vendor selection

**Props:** None (standalone page component)

**State:**
| State Variable | Type | Initial Value | Description |
|----------------|------|---------------|-------------|
| collapsed | boolean | false | Sidebar collapse state |
| currentNav | string | "nav1" | Selected vendor navigation key |

**Dependencies:**
- antd: Layout, Menu, Button, theme
- @ant-design/icons: MenuFoldOutlined, MenuUnfoldOutlined
- ./PoTableTest: Purchase order table component

**Styling:**
- Background color: #2938c3 (sidebar)
- Sidebar width: 200px (expanded)
- Content margin: 24px 16px
- Content padding: 24px
- Minimum height: 650px

### 5.2 PoTableTest (PurchaseOrderTable) Component

**File:** `/Users/ricardotassio/DEV/TRABALHO/JUSTJEEPS/JustJeepsAPI-front-end/src/features/po/PoTableTest.jsx`

**Purpose:** Display purchase orders for a vendor with expandable row details

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| vendorId | string | Yes | Vendor identifier for API filtering |

**State:**
| State Variable | Type | Initial Value | Description |
|----------------|------|---------------|-------------|
| originalPurchaseOrderData | array | [] | Full API response data |
| purchaseOrderData | array | [] | Filtered/displayed data |
| subtableTotalCost | number | 0 | Running total (anti-pattern) |

**Main Table Columns:**
| Column | DataIndex | Key | Width | Align |
|--------|-----------|-----|-------|-------|
| Order ID | ['order', 'entity_id'] | order_id | 25% | center |
| PO ID | id | id | 25% | center |
| Created At | created_at | created_at | 25% | center |
| User | ['user', 'firstname'] | user | 25% | center |

**Expanded Row Columns:**
| Column | DataIndex | Key | Render |
|--------|-----------|-----|--------|
| Product SKU | product_sku | product_sku | - |
| Vendor SKU | ['vendorProduct', 'vendor_sku'] | vendorProduct.vendor_sku | Extract after first hyphen |
| Vendor Cost | vendor_cost | vendor_cost | Format: $X.XX |
| Quantity Purchased | quantity_purchased | quantity_purchased | - |
| Total Cost | total_cost | total_cost | Format: $X.XX (calculated) |

**Cost Calculations:**
```javascript
// Per line item
total_cost = vendor_cost * quantity_purchased

// Footer total
totalCost = lineItemData.reduce((total, item) => total + item.total_cost, 0)
```

### 5.3 PoPopUp Component (Placeholder)

**File:** `/Users/ricardotassio/DEV/TRABALHO/JUSTJEEPS/JustJeepsAPI-front-end/src/features/po/PoPopUp.jsx`

**Status:** Not integrated - Contains Ant Design Drawer template with placeholder fields

**Issues:**
- References undefined variables: `onClose`, `open`, `Option`
- Form fields unrelated to purchase orders (Name, URL, Owner, Type, Approver, DateTime, Description)
- Props defined but not used: `position`, `onClosePo`, `currentInfo`

---

## 6. UI/UX Specifications

### 6.1 Layout Structure

```
+------------------------------------------------------------------+
|                           Navbar                                  |
+------------------------------------------------------------------+
|        |                                                         |
| SIDER  |  HEADER: [Toggle] PURCHASE ORDERS DETAILS               |
|        |                                                         |
|--------|  +--------------------------------------------------+   |
|        |  |                                                  |   |
| Menu:  |  |              CONTENT AREA                        |   |
|        |  |                                                  |   |
| [Key]  |  |  +--------------------------------------------+  |   |
| [Mey]  |  |  | Order ID | PO ID | Created At | User       |  |   |
| [Omi]  |  |  +--------------------------------------------+  |   |
| [Qua]  |  |  | 81806    | 3     | 2023-04... | Admin      |  |   |
|        |  |  |  [expand row]                              |  |   |
|        |  |  |  +--------------------------------------+  |  |   |
|        |  |  |  | SKU | VendorSKU | Cost | Qty | Total |  |  |   |
|        |  |  |  +--------------------------------------+  |  |   |
|        |  |  |  | ... | ...       | $12  | 2   | $24   |  |  |   |
|        |  |  |  +--------------------------------------+  |  |   |
|        |  |  |         Total Cost: $24.00              |  |  |   |
|        |  |  +--------------------------------------------+  |   |
|        |  +--------------------------------------------------+   |
|        |                                                         |
+------------------------------------------------------------------+
|                  Footer: Copyright                                |
+------------------------------------------------------------------+
```

### 6.2 Sidebar Specifications

| Property | Value |
|----------|-------|
| Width (expanded) | 200px |
| Width (collapsed) | 80px (default Ant Design) |
| Background Color | #2938c3 |
| Text Color | white |
| Font Weight | 700 |
| Font Size | 22px |
| Top Margin | 80px |
| Menu Height | 15px (per item) |

### 6.3 Content Area Specifications

| Property | Value |
|----------|-------|
| Margin | 24px 16px |
| Padding | 24px |
| Minimum Height | 650px |
| Background | Ant Design theme colorBgContainer |

### 6.4 Table Styling

| Property | Value |
|----------|-------|
| Column Alignment | center |
| Column Width | 25% (equal distribution) |
| Footer Font Weight | bold |
| Footer Font Size | 1.2rem |
| Footer Text Align | right |

---

## 7. Routing Configuration

### 7.1 Route Definition

**File:** `/Users/ricardotassio/DEV/TRABALHO/JUSTJEEPS/JustJeepsAPI-front-end/src/App.jsx`

```jsx
<Route path='/po' element={
  <ProtectedRoute>
    <PoForm />
  </ProtectedRoute>
} />
```

### 7.2 Related Routes

| Route | Component | Protection | Description |
|-------|-----------|------------|-------------|
| /po | PoForm | ProtectedRoute | Main PO management interface |
| /dashboard/po | DashBoardPO | ProtectedRoute | PO analytics dashboard |

### 7.3 Authentication Flow

```
User navigates to /po
        │
        v
ProtectedRoute checks auth
        │
        ├── Authenticated → Render PoForm
        │
        └── Not Authenticated → Redirect to /login
```

---

## 8. Technical Decisions

### 8.1 Design Decisions

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Ant Design Layout | Consistent UI framework, built-in responsive behavior | Reduces custom styling, ensures consistency |
| Vendor ID as prop | Decouples table from navigation, enables reuse | Clean separation of concerns |
| Expandable rows | Show detail without navigation, maintain context | Better UX for viewing line items |
| Local state only | Simple data flow, no complex state management needed | Easier maintenance, isolated component state |
| API filtering by vendor | Reduces data transfer, server-side filtering | Better performance for large datasets |

### 8.2 Trade-offs

| Trade-off | Chosen Approach | Alternative | Reason |
|-----------|-----------------|-------------|--------|
| State management | React useState | Context/Redux | Component is self-contained, no shared state needed |
| Vendor navigation | Hardcoded menu | Dynamic from API | Vendors are static, simpler implementation |
| Row expansion behavior | Filter to related orders | Standard expand only | Shows related POs together (may confuse users) |
| Cost calculation | Client-side | Server-side | Real-time updates, small data volume |

### 8.3 Known Anti-Patterns

1. **State Update During Render**
   - Issue: `setSubtableTotalCost(totalCost)` called inside `expandedRowRender`
   - Impact: May cause re-render loops, performance degradation
   - Recommendation: Calculate total inline or use useMemo

2. **Console Logging in Production**
   - Issue: Multiple `console.log` statements in component
   - Impact: Performance, security concerns
   - Recommendation: Remove or use conditional logging

3. **Unused Imports**
   - Issue: Vendor logo imports in PoForm.jsx are not used
   - Impact: Bundle size
   - Recommendation: Remove unused imports

---

## 9. Dependencies

### 9.1 Internal Dependencies

| Dependency | Type | Description |
|------------|------|-------------|
| AuthContext | Context | Provides authentication state for ProtectedRoute |
| ProtectedRoute | Component | Wraps component for auth protection |
| Navbar | Component | Application navigation (rendered by App.jsx) |

### 9.2 External Dependencies

| Package | Version | Usage |
|---------|---------|-------|
| react | ^18.x | Core framework |
| antd | ^5.x | Layout, Menu, Table, Button, theme components |
| @ant-design/icons | ^5.x | MenuFoldOutlined, MenuUnfoldOutlined icons |
| axios | ^1.x | HTTP client for API calls |
| react-router-dom | ^6.x | Routing (via App.jsx) |

### 9.3 Backend Dependencies

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/purchase_orders/vendor/{vendorId} | GET | Fetch POs by vendor |

---

## 10. Error Handling

### 10.1 Current Implementation

```javascript
try {
  await axios.get(`${API_URL}/api/purchase_orders/vendor/${vendorId}`)
    .then(res => {
      setOriginalPurchaseOrderData(res.data);
      setPurchaseOrderData(res.data);
    });
} catch (error) {
  console.error('Failed to fetch data from backend:', error);
}
```

### 10.2 Error Scenarios

| Scenario | Current Handling | Impact |
|----------|------------------|--------|
| API failure | Console log only | Empty table, no user feedback |
| Network timeout | Console log only | Empty table, no user feedback |
| Invalid vendor ID | API returns empty array | Empty table |
| Empty line items | Displays "No Purchase Order Line Items found" | User informed |

### 10.3 Recommended Improvements

1. Add loading state with spinner
2. Display error message to user on API failure
3. Add retry mechanism for transient failures
4. Implement empty state component for no data

---

## 11. Testing Considerations

### 11.1 Unit Test Scenarios

| Scenario | Component | Expected Behavior |
|----------|-----------|-------------------|
| Render with vendor ID | PoTableTest | Fetches data, displays table |
| Sidebar collapse | PoForm | Toggle collapses sidebar |
| Vendor navigation | PoForm | Switches vendor ID prop |
| Row expansion | PoTableTest | Shows line items table |
| Cost calculation | PoTableTest | Correct total_cost per line |
| Footer total | PoTableTest | Sum of all line item costs |

### 11.2 Integration Test Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Navigate to /po | PoForm renders with default vendor (Keystone) |
| Click Meyer menu item | Table reloads with Meyer POs |
| Expand PO row | Line items table appears with costs |
| Collapse sidebar | Menu collapses, selection maintained |

### 11.3 Mock Data

Sample data is available in PoTableTest.jsx (lines 176-371) for testing purposes.

---

## 12. Performance Considerations

### 12.1 Current Implementation

| Aspect | Implementation | Notes |
|--------|----------------|-------|
| Data fetching | On mount and vendorId change | Re-fetches on each vendor switch |
| Rendering | Default Ant Design pagination | No virtualization |
| State updates | Synchronous | May cause multiple re-renders |

### 12.2 Optimization Opportunities

1. **Caching**: Cache vendor data to avoid re-fetching
2. **Memoization**: Use useMemo for cost calculations
3. **Virtualization**: For large datasets, implement virtual scrolling
4. **Lazy loading**: Load line items only on expand

---

## 13. Security Considerations

### 13.1 Current Implementation

| Aspect | Status | Notes |
|--------|--------|-------|
| Route protection | Implemented | ProtectedRoute wrapper |
| API authentication | Assumed | Backend should validate JWT |
| Sensitive data display | Concern | User passwords in response |

### 13.2 Security Recommendations

1. **API Response**: Remove sensitive fields (passwords) from response
2. **Input Validation**: Validate vendorId before API call
3. **Token Handling**: Ensure JWT is sent with API requests (axios interceptor)

---

## 14. Future Enhancements

### 14.1 Planned Features (from PRD)

| Feature | Priority | Status |
|---------|----------|--------|
| Quadratec vendor support | Medium | Navigation exists, needs rendering |
| PO creation form | High | PoPopUp needs customization |
| PO editing capability | High | Not implemented |
| Date range filtering | Medium | Not implemented |
| Search functionality | Medium | Not implemented |
| Export to CSV/Excel | Low | Not implemented |

### 14.2 Technical Improvements

| Improvement | Rationale |
|-------------|-----------|
| Loading states | Better UX during data fetch |
| Error boundaries | Graceful error handling |
| Unit test coverage | Code reliability |
| Remove console.log | Production readiness |
| Fix state anti-pattern | Performance improvement |
| Dynamic vendor loading | Scalability |

---

## 15. Appendix

### 15.1 Sample API Response

```json
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
    "firstname": "Admin"
  },
  "order": {
    "entity_id": 81806,
    "created_at": "2023-03-20 23:14:54",
    "status": "processing",
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
```

### 15.2 Component Props Reference

**PoTableTest Props:**
```typescript
interface PoTableTestProps {
  vendorId: string;  // Vendor identifier ("1", "2", "3")
}
```

### 15.3 Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| VITE_API_URL | Backend API base URL | Empty (uses relative URLs with proxy) |

---

## 16. Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-22 | Claude Code | Initial design document from codebase analysis |
