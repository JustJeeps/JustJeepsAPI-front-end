// Competitor price and link columns for the Items screen Excel exports, for
// the competitors whose scrapers store a product link. Each competitor is
// matched by its exact name, like Lowriders and TDOT in Items.jsx. A new one
// is one more entry here.

const COMPETITOR_EXPORTS = [
  { name: 'Niagara Jeeps', key: 'niagara' },
  { name: 'MyTruckPoint', key: 'mytruckpoint' },
];

export const COMPETITOR_EXPORT_COLUMNS = COMPETITOR_EXPORTS.flatMap(({ name, key }) => [
  { header: `${name} Price`, key: `${key}_price` },
  { header: `${name} URL`, key: `${key}_url` },
]);

/**
 * @param {{ competitorProducts?: Array<{ competitor: { name: string }, competitor_price?: number, product_url?: string }> }} product
 * @returns {Record<string, number | string | undefined>} `<key>_price` and `<key>_url` per competitor
 */
export const competitorExportFields = (product) =>
  Object.fromEntries(
    COMPETITOR_EXPORTS.flatMap(({ name, key }) => {
      const row = product.competitorProducts?.find((cp) => cp.competitor?.name === name);
      return [
        [`${key}_price`, row?.competitor_price],
        [`${key}_url`, row?.product_url],
      ];
    })
  );
