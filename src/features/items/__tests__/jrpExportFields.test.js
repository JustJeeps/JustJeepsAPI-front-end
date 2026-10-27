import { describe, it, expect } from 'vitest';
import { JRP_EXPORT_COLUMNS, jrpExportFields } from '../jrpExportFields';

// The Items screen Excel exports (by brand and all products) carry the JRP
// vendor cost (CAD) and inventory (0 to 4), matched by vendor name "JRP"
// the same way Meyer, Keystone and the others are matched.

const vendorProduct = (name, cost, inventory) => ({
  vendor: { name },
  vendor_cost: cost,
  vendor_inventory: inventory,
});

describe('JRP_EXPORT_COLUMNS', () => {
  it('declares the JRP Cost and JRP Inventory columns in that order', () => {
    expect(JRP_EXPORT_COLUMNS).toEqual([
      { header: 'JRP Cost', key: 'jrp_cost' },
      { header: 'JRP Inventory', key: 'jrp_inventory' },
    ]);
  });
});

describe('jrpExportFields', () => {
  it('takes cost and inventory from the vendor product named JRP', () => {
    const product = {
      vendorProducts: [
        vendorProduct('Meyer', 10, 3),
        vendorProduct('JRP', 42.5, 4),
      ],
    };

    expect(jrpExportFields(product)).toEqual({ jrp_cost: 42.5, jrp_inventory: 4 });
  });

  it('keeps a zero inventory instead of dropping it', () => {
    const product = { vendorProducts: [vendorProduct('JRP', 12, 0)] };

    expect(jrpExportFields(product)).toEqual({ jrp_cost: 12, jrp_inventory: 0 });
  });

  it('leaves both fields empty when the product has no JRP row', () => {
    const product = { vendorProducts: [vendorProduct('Keystone', 5, 1)] };

    expect(jrpExportFields(product)).toEqual({ jrp_cost: undefined, jrp_inventory: undefined });
  });

  it('matches the vendor name exactly, like the other vendors', () => {
    const product = { vendorProducts: [vendorProduct('jrp', 9, 2)] };

    expect(jrpExportFields(product).jrp_cost).toBeUndefined();
  });

  it('handles a product without vendorProducts', () => {
    expect(jrpExportFields({})).toEqual({ jrp_cost: undefined, jrp_inventory: undefined });
  });
});
