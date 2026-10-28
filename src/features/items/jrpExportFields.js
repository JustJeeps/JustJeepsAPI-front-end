// JRP vendor columns for the Items screen Excel exports. The vendor is
// matched by its exact name, like Meyer, Keystone and the others in Items.jsx.

const JRP_VENDOR_NAME = 'JRP';

export const JRP_EXPORT_COLUMNS = [
  { header: 'JRP Cost', key: 'jrp_cost' },
  { header: 'JRP Inventory', key: 'jrp_inventory' },
];

/**
 * @param {{ vendorProducts?: Array<{ vendor: { name: string }, vendor_cost?: number, vendor_inventory?: number }> }} product
 * @returns {{ jrp_cost: number | undefined, jrp_inventory: number | undefined }}
 */
export const jrpExportFields = (product) => {
  const jrpRow = product.vendorProducts?.find(
    (vp) => vp.vendor.name === JRP_VENDOR_NAME
  );
  return {
    jrp_cost: jrpRow?.vendor_cost,
    jrp_inventory: jrpRow?.vendor_inventory,
  };
};
