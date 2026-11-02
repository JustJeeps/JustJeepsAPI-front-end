import { describe, it, expect } from 'vitest';
import { NIAGARA_EXPORT_COLUMNS, niagaraExportFields } from '../niagaraExportFields';

// The Items screen Excel exports carry the Niagara Jeeps competitor price and
// product link, matched by the exact competitor name "Niagara Jeeps".

const competitorProduct = (name, price, url) => ({ competitor: { name }, competitor_price: price, product_url: url });

describe('NIAGARA_EXPORT_COLUMNS', () => {
  it('declares the price and URL columns in that order', () => {
    expect(NIAGARA_EXPORT_COLUMNS).toEqual([
      { header: 'Niagara Jeeps Price', key: 'niagara_price' },
      { header: 'Niagara Jeeps URL', key: 'niagara_url' },
    ]);
  });
});

describe('niagaraExportFields', () => {
  it('takes price and link from the competitor row named Niagara Jeeps', () => {
    const product = {
      competitorProducts: [
        competitorProduct('TDOT', 99, 'https://www.tdotperformance.ca/x'),
        competitorProduct('Niagara Jeeps', 881.49, 'https://niagarajeeps.ca/products/go-rhino-dominator-d1-side-steps'),
      ],
    };
    expect(niagaraExportFields(product)).toEqual({
      niagara_price: 881.49,
      niagara_url: 'https://niagarajeeps.ca/products/go-rhino-dominator-d1-side-steps',
    });
  });

  it('leaves both cells empty when Niagara Jeeps has no row for the product', () => {
    expect(niagaraExportFields({ competitorProducts: [competitorProduct('TDOT', 99, null)] })).toEqual({ niagara_price: undefined, niagara_url: undefined });
    expect(niagaraExportFields({})).toEqual({ niagara_price: undefined, niagara_url: undefined });
  });
});
