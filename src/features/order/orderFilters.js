// Filter state of the Orders table. One place for the defaults so the initial
// state, "Clear filters" and the customer search from the open-orders tag all
// agree on what a clean state is.

export const DEFAULT_ORDER_FILTERS = Object.freeze({
  filterMode: 'order', // 'order' or 'items'
  starStatus: '',
  search: '',
  poStatus: '',
  region: '',
  vendor: '', // vendor filter (only for items mode)
  dateFilter: '', // 'today', 'yesterday', 'last7days', or ''
  exclude: '', // Exclude keywords for global search
});

// Clicking the "N OPEN ORDERS" tag must show every order of that customer, so
// every other filter is reset. Search matches customer_email server-side.
export const customerSearchFilters = (email) => ({ ...DEFAULT_ORDER_FILTERS, search: email });
