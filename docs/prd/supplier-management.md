# PRD: Supplier Management Module

## Overview

The Supplier Management module is a frontend component of the JustJeeps order management system that provides a visual interface for viewing and managing supplier/vendor information. The module displays supplier data in a card-based layout with edit and add capabilities, primarily serving as a reference catalog for the four main suppliers used by JustJeeps: Keystone, Meyer, Omix, and Quadratec.

## Problem Statement

JustJeeps works with multiple parts suppliers to fulfill Jeep accessory orders. Staff members need a centralized location to:
- View and access supplier information quickly
- Access supplier websites with a single click for ordering or research
- Maintain a visual reference of available suppliers
- Potentially add new suppliers as business relationships expand

## User Stories

### US-1: View Supplier Catalog
As a JustJeeps staff member, I want to see all available suppliers in a visual card layout so that I can quickly identify and access supplier information.

### US-2: Access Supplier Website
As a JustJeeps staff member, I want to click on a supplier's website link so that I can navigate directly to their ordering portal.

### US-3: Add New Supplier
As a JustJeeps administrator, I want to add a new supplier with name, website, and logo so that new vendor partnerships are reflected in the system.

### US-4: Edit Supplier Information
As a JustJeeps administrator, I want to edit an existing supplier's information so that I can keep supplier details current.

## Functional Requirements

### FR-1: Supplier Card Display
**Description**: Display each supplier as a visual card with logo, name, and website link.

**Acceptance Criteria**:
- Each supplier card shows the supplier name as a heading
- Each supplier card displays the supplier logo image (300px x 100px, object-fit: contain)
- Each supplier card shows a clickable website URL
- Cards are arranged in a responsive flex layout with 30px gap
- Cards have a light gray background with box shadow styling

### FR-2: Website Navigation
**Description**: Allow users to navigate to supplier websites directly from the interface.

**Acceptance Criteria**:
- Website URLs are clickable links
- Links open in a new browser tab (target="_blank")
- Links have proper security attributes (rel="noreferrer")
- Website URLs are displayed in green color for visibility

### FR-3: Add Supplier Form
**Description**: Provide a form to add new suppliers to the catalog.

**Acceptance Criteria**:
- "Add Supplier" button is visible when no form is active
- Clicking "Add Supplier" reveals the add form
- Form includes fields for: Image (file upload), Name (text), Website (text)
- Default placeholder for name: "Name of new Supplier"
- Default placeholder for website: "http://new-website"
- Submit button saves the new supplier to the local list
- Cancel button hides the form without saving
- If no image is uploaded, a default "no image" placeholder is used
- New supplier receives a random 4-digit ID

### FR-4: Edit Supplier Form
**Description**: Allow editing of existing supplier information.

**Acceptance Criteria**:
- Each supplier card has an "Edit" button in the top-right corner
- Clicking "Edit" populates the form with the supplier's current data
- Edit button changes to "Editing" state (yellow text) when that supplier is being edited
- Form shows "Edit Supplier" as the title when in edit mode
- Submitting saves changes to the specific supplier
- Original image is preserved if no new image is uploaded

### FR-5: Hardcoded Default Suppliers
**Description**: System includes four pre-configured suppliers on initial load.

**Acceptance Criteria**:
- Keystone (ID: 1111) - https://wwwsc.ekeystone.com
- Meyer (ID: 2222) - https://online.meyerdistributing.com
- Omix (ID: 3333) - https://www.omixparts.com/
- Quadratec (ID: 4444) - https://www.quadratecwholesale.com
- Each supplier has a corresponding logo image loaded from assets
- Additional fields (address, phone_number, main_contact, username, password) are set to "NA"

## Non-Functional Requirements

### NFR-1: Performance
- Page should render supplier cards within 500ms on initial load
- Image files should be optimized PNG format for fast loading

### NFR-2: Responsiveness
- Cards should wrap to next row on smaller screens (flex-wrap: wrap)
- Main container is 80% width with auto margins for centering
- Form inputs should remain usable on various screen sizes

### NFR-3: Security
- Route is protected and requires authentication
- External links use rel="noreferrer" to prevent referrer leakage
- File uploads only accept image files

### NFR-4: Accessibility
- Form inputs have associated labels
- Edit button text indicates current state ("Edit" vs "Editing")
- Website links are clearly styled and identifiable

## Technical Implementation

### Architecture

The module follows a simple component-based architecture:

```
SupplierTable (Container Component)
    |
    +-- Card (Presentational Component)
        - Receives supplier data as props
        - Handles edit click events via callback
```

**File Structure**:
```
src/features/supplier/
    |-- SupplierTable.jsx    # Main container component
    |-- Card.jsx             # Individual supplier card component
    |-- suppliertable.scss   # Container styling
    |-- card.scss            # Card component styling

src/assets/
    |-- keystone.png         # Supplier logos
    |-- meyer.png
    |-- omix.png
    |-- quadratec.png
```

### Data Flow

1. **Initial Load**: Hardcoded `vendorsData` array is loaded into `vendors` state
2. **View Mode**: `vendors` state is mapped to `Card` components
3. **Add Flow**:
   - User clicks "Add Supplier"
   - `top` state updates to show form with default values
   - User fills form and submits
   - `onFinish` creates new vendor object with random ID
   - New vendor is appended to `vendors` array via spread operator
4. **Edit Flow**:
   - User clicks "Edit" on a card
   - `handleEdit` updates `top` state with supplier's current data
   - User modifies form and submits
   - `onFinish` maps over vendors, replacing matching ID

### State Management

**Local Component State** (using React useState):

| State Variable | Type | Purpose |
|----------------|------|---------|
| `vendors` | Array | List of all supplier objects |
| `top` | Object | Form visibility and data (show, title, name, website, type, id, image) |
| `file` | File/String | Currently selected file for upload |

**Refs** (using React useRef):
- `inputWeb` - Reference to website input field
- `inputName` - Reference to name input field
- `inputImg` - Reference to file input field

### API Endpoints Used

**None** - This module operates entirely with local state and hardcoded data. There is no backend API integration for supplier management.

### Component Props

**Card Component**:
| Prop | Type | Description |
|------|------|-------------|
| `supplier` | Object | Supplier data (id, name, website, image) |
| `handleEdit` | Function | Callback when edit button is clicked |
| `top` | Object | Current form state to determine edit button styling |

### Vendor Data Structure

```javascript
{
  id: number,           // Unique identifier (hardcoded or random 4-digit)
  name: string,         // Supplier display name
  website: string,      // Supplier portal URL
  address: string,      // Not displayed (set to "NA")
  phone_number: string, // Not displayed (set to "NA")
  main_contact: string, // Not displayed (set to "NA")
  username: string,     // Not displayed (set to "NA")
  password: string,     // Not displayed (set to "NA")
  image: string         // Image path or blob URL
}
```

## Dependencies

### Internal Dependencies
- React (useState, useRef)
- SCSS styling files
- Asset images (supplier logos)
- ProtectedRoute component (authentication wrapper)

### External Dependencies
| Package | Usage |
|---------|-------|
| antd | Imports Table, Space, Form, Input, Button (not actively used in render) |
| react-router-dom | Route definition in App.jsx |

### Asset Dependencies
- `/src/assets/keystone.png`
- `/src/assets/meyer.png`
- `/src/assets/omix.png`
- `/src/assets/quadratec.png`

## Current Limitations

### L-1: No Data Persistence
Changes made to suppliers (add/edit) are stored only in React component state. All modifications are lost on page refresh or navigation away from the page.

### L-2: Unused Ant Design Imports
The component imports Table, Space, Form, Input, and Button from Ant Design but does not use them. The component uses native HTML form elements instead.

### L-3: Unused Supplier Fields
The vendor data structure includes address, phone_number, main_contact, username, and password fields that are hardcoded to "NA" and never displayed or editable in the UI.

### L-4: No Delete Functionality
There is no way to remove a supplier once added. Users cannot delete suppliers from the list.

### L-5: No Validation
Form inputs have no validation. Users can submit empty names or invalid website URLs without error messages.

### L-6: Memory Leaks with Object URLs
When images are uploaded, `URL.createObjectURL()` is used but `URL.revokeObjectURL()` is never called, potentially causing memory leaks with repeated image uploads.

### L-7: Table Component Defined but Unused
A `columns` array is defined for an Ant Design Table but the Table component is never rendered. The module exclusively uses the Card-based layout.

### L-8: No Search or Filter
With only four suppliers, search is not critical, but there is no mechanism to filter or search suppliers if the list grows.

### L-9: Static Supplier List
Suppliers are hardcoded in the frontend. Adding, editing, or removing suppliers requires code changes and redeployment for permanent effect.

## Future Considerations

1. **Backend Integration**: Implement API endpoints to persist supplier data
2. **Complete Supplier Profile**: Display and edit additional fields (address, phone, contact)
3. **Delete Functionality**: Add ability to remove suppliers
4. **Form Validation**: Add proper validation for required fields and URL format
5. **Confirmation Dialogs**: Add confirmation before destructive actions
6. **Search/Filter**: Add search capability for larger supplier lists
7. **Credential Management**: Secure handling of supplier portal credentials if needed
