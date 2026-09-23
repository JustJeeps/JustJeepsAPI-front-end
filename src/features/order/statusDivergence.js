// Text for the warning shown next to the order number when our ship status
// and Magento's order status disagree. The API decides the divergence
// (`status_divergence`, see lib/orders/openOrders.js in the back-end); the
// front only renders. Missing field (older API) = no warning.
//
// One line per fact, rendered with `white-space: pre-line` in the tooltip.

// Same list as CLOSED_ORDER_STATUSES in the back-end: only used here to say
// which side is behind.
const MAGENTO_CLOSED_STATUSES = ['complete', 'closed', 'canceled'];

export const describeStatusDivergence = (order) => {
  const divergence = order?.status_divergence;
  if (!divergence) return null;
  const magento = divergence.magento_status || '(none)';
  const magentoClosed = MAGENTO_CLOSED_STATUSES.includes(String(divergence.magento_status || '').trim().toLowerCase());
  const explanation = magentoClosed
    ? 'Closed in Magento, but still in progress in the Pricing Tool.'
    : 'Finished in the Pricing Tool, but still open in Magento.';
  return [
    'Status mismatch',
    `Magento: ${magento}`,
    `Pricing Tool: ${divergence.ship_status}`,
    explanation,
  ].join('\n');
};
