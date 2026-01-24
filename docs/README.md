# JustJeeps Frontend Documentation

> Auto-generated documentation from reverse engineering the existing codebase.
> Generated on: 2026-01-22

## Overview

This documentation set provides comprehensive Product Requirements Documents (PRDs) and Design Documents for the JustJeeps order management frontend application.

**Tech Stack**: Vite + React, Ant Design, MUI, Bootstrap, Recharts, Axios

## Document Index

### Product Requirements Documents (PRDs)

| Document | Module | Status |
|----------|--------|--------|
| [Authentication](./prd/authentication.md) | Auth context, JWT, protected routes | ✅ Complete |
| [Order Management](./prd/order-management.md) | Order table, editing, email generation | ✅ Complete |
| [Product Management](./prd/product-management.md) | SKU search, vendor costs, Excel export | ✅ Complete |
| [Supplier Management](./prd/supplier-management.md) | Supplier cards, basic CRUD | ✅ Complete |
| [Purchase Order Management](./prd/purchase-order-management.md) | PO forms, vendor filtering | ✅ Complete |
| [Orders Dashboard](./prd/orders-dashboard.md) | KPI widgets, revenue charts | ✅ Complete |
| [Products Dashboard](./prd/products-dashboard.md) | Product analytics, pie charts | ✅ Complete |
| [Navigation & Layout](./prd/navigation-layout.md) | Navbar, sidebar | ✅ Complete |
| [Shared Utilities](./prd/shared-utilities.md) | Helpers, icons, hooks | ✅ Complete |
| [Application Bootstrap](./prd/application-bootstrap.md) | App entry, routing, config | ✅ Complete |

### Design Documents

| Document | Component | Complexity |
|----------|-----------|------------|
| [Order Table Architecture](./design/order-table-architecture.md) | OrderTable state & data flow | High |
| [Authentication Architecture](./design/authentication-architecture.md) | AuthContext & session management | High |
| [Product Search Architecture](./design/product-search-architecture.md) | Items/ProductTable search & vendor | High |
| [Purchase Order Architecture](./design/purchase-order-architecture.md) | PO table & vendor filtering | Medium |
| [Orders Dashboard Architecture](./design/orders-dashboard-architecture.md) | Dashboard KPIs & charts | Medium |
| [Products Dashboard Architecture](./design/products-dashboard-architecture.md) | Product analytics | Medium |
| [Navigation Architecture](./design/navigation-architecture.md) | Navbar & sidebar | Medium |
| [Application Bootstrap Architecture](./design/application-bootstrap-architecture.md) | App initialization & routing | Medium |

## Key Findings Summary

### Critical Issues Identified

1. **Dashboard APIs Disabled**: Both dashboard hooks have API calls commented out
2. **Large Components**: OrderTable.jsx (2,356 lines), Items.jsx (1,658 lines) need refactoring
3. **No TypeScript**: Entire codebase lacks type safety
4. **Hardcoded Values**: Vendor IDs, exchange rates, URLs scattered throughout code
5. **No Tests**: No unit or integration tests present
6. **Security**: JWT tokens stored in localStorage (should use httpOnly cookies)

### Technical Debt Summary

| Category | Count | Priority |
|----------|-------|----------|
| Bugs | 4 | High |
| Missing Error Handling | 8 | High |
| Code Refactoring Needed | 6 | Medium |
| Missing Features | 12 | Medium |
| UI/UX Issues | 7 | Low |

### Architecture Patterns

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  (React Components: OrderTable, Items, Dashboards)      │
├─────────────────────────────────────────────────────────┤
│                  State Management Layer                  │
│  (AuthContext, Local State, Custom Hooks)               │
├─────────────────────────────────────────────────────────┤
│                     Data Layer                          │
│  (Axios API calls, localStorage)                        │
├─────────────────────────────────────────────────────────┤
│                   Backend API                           │
│  (Express server on port 8080/8081)                     │
└─────────────────────────────────────────────────────────┘
```

## Recommendations

### Immediate Actions
1. Enable dashboard API calls (currently commented out)
2. Fix identified bugs in OrderTable delete handler
3. Add error boundaries and user-facing error messages

### Short-term Improvements
1. Add TypeScript for type safety
2. Split large components (OrderTable, Items) into smaller modules
3. Implement proper loading and error states
4. Add unit tests for critical functions

### Long-term Enhancements
1. Migrate from localStorage to httpOnly cookies for JWT
2. Implement token refresh mechanism
3. Add server-side pagination for large datasets
4. Create comprehensive test suite

## File Structure

```
docs/
├── README.md (this file)
├── prd/
│   ├── authentication.md
│   ├── order-management.md
│   ├── product-management.md
│   ├── supplier-management.md
│   ├── purchase-order-management.md
│   ├── orders-dashboard.md
│   ├── products-dashboard.md
│   ├── navigation-layout.md
│   ├── shared-utilities.md
│   └── application-bootstrap.md
└── design/
    ├── order-table-architecture.md
    ├── authentication-architecture.md
    ├── product-search-architecture.md
    ├── purchase-order-architecture.md
    ├── orders-dashboard-architecture.md
    ├── products-dashboard-architecture.md
    ├── navigation-architecture.md
    └── application-bootstrap-architecture.md
```

## Related Resources

- **Backend API**: JustJeeps Express server
- **Main Routes**: `/orders`, `/items`, `/suppliers`, `/po`, `/dashboard`
- **Environment**: `VITE_API_URL` for API configuration

---

*Documentation generated using reverse engineering workflow*
