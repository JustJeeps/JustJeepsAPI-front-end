// Pure rules for the "N OPEN ORDERS" tag on the Orders table (kept apart from
// OpenOrdersFlag.jsx: on a case-insensitive disk the two names would collide).
//
// `open_orders_same_customer` comes from GET /api/orders: every open order
// (PO not set, Magento status not closed) of the same customer_email, the row
// itself included when it is open. Missing field (older API) = no flag.

const openOrdersOf = (order) =>
  Array.isArray(order?.open_orders_same_customer) ? order.open_orders_same_customer : [];

export const hasMultipleOpenOrders = (order) => openOrdersOf(order).length >= 2;

export const getOtherOpenOrders = (order) =>
  openOrdersOf(order).filter((open) => open.entity_id !== order?.entity_id);
