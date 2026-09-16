// Text for the warning shown next to the order number when our ship status
// and Magento's order status disagree. The API decides the divergence
// (`status_divergence`, see lib/orders/openOrders.js in the back-end); the
// front only renders. Missing field (older API) = no warning.

export const describeStatusDivergence = (order) => {
  const divergence = order?.status_divergence;
  if (!divergence) return null;
  const magento = divergence.magento_status || '(none)';
  return `Status differs from Magento. Magento: ${magento}. Ship status: ${divergence.ship_status}.`;
};
