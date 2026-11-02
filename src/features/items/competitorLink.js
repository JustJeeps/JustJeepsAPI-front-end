// Competitor rows can carry the competitor's own product page when the scraper
// knows it (Lowriders, Niagara Jeeps). The Items and order tables link to it.
// Only http(s) addresses are used, so a stray value never becomes a link that
// runs script.

/**
 * @param {{ product_url?: string | null } | undefined} competitorProduct
 * @returns {string | null}
 */
export const storedProductUrl = (competitorProduct) => {
  const url = String(competitorProduct?.product_url ?? '').trim();
  return /^https?:\/\//i.test(url) ? url : null;
};
