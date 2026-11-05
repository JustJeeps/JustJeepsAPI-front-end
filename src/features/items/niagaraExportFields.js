// Niagara Jeeps competitor columns for the Items screen Excel exports. The
// competitor is matched by its exact name, like Lowriders and TDOT in Items.jsx.

const NIAGARA_COMPETITOR_NAME = 'Niagara Jeeps';

export const NIAGARA_EXPORT_COLUMNS = [
  { header: 'Niagara Jeeps Price', key: 'niagara_price' },
  { header: 'Niagara Jeeps URL', key: 'niagara_url' },
];

/**
 * @param {{ competitorProducts?: Array<{ competitor: { name: string }, competitor_price?: number, product_url?: string }> }} product
 * @returns {{ niagara_price: number | undefined, niagara_url: string | undefined }}
 */
export const niagaraExportFields = (product) => {
  const row = product.competitorProducts?.find(
    (cp) => cp.competitor?.name === NIAGARA_COMPETITOR_NAME
  );
  return {
    niagara_price: row?.competitor_price,
    niagara_url: row?.product_url,
  };
};
