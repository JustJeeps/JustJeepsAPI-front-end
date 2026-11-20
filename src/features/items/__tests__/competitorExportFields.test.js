import { describe, it, expect } from 'vitest';
import { COMPETITOR_EXPORT_COLUMNS, competitorExportFields } from '../competitorExportFields';

// The Items screen Excel exports carry the price and product link of the
// competitors whose scrapers store a link (Niagara Jeeps, MyTruckPoint),
// each matched by its exact competitor name.

const competitorProduct = (name, price, url) => ({ competitor: { name }, competitor_price: price, product_url: url });

describe('COMPETITOR_EXPORT_COLUMNS', () => {
  it('declares price and URL for Niagara Jeeps, then for MyTruckPoint, in that order', () => {
    expect(COMPETITOR_EXPORT_COLUMNS).toEqual([
      { header: 'Niagara Jeeps Price', key: 'niagara_price' },
      { header: 'Niagara Jeeps URL', key: 'niagara_url' },
      { header: 'MyTruckPoint Price', key: 'mytruckpoint_price' },
      { header: 'MyTruckPoint URL', key: 'mytruckpoint_url' },
    ]);
  });
});

describe('competitorExportFields', () => {
  it('takes price and link from the competitor row named Niagara Jeeps', () => {
    const product = {
      competitorProducts: [
        competitorProduct('TDOT', 99, 'https://www.tdotperformance.ca/x'),
        competitorProduct('Niagara Jeeps', 881.49, 'https://niagarajeeps.ca/products/go-rhino-dominator-d1-side-steps'),
      ],
    };
    expect(competitorExportFields(product)).toMatchObject({
      niagara_price: 881.49,
      niagara_url: 'https://niagarajeeps.ca/products/go-rhino-dominator-d1-side-steps',
    });
  });

  it('takes price and link from the competitor row named MyTruckPoint, never from another competitor', () => {
    const product = {
      competitorProducts: [
        competitorProduct('Niagara Jeeps', 881.49, 'https://niagarajeeps.ca/products/a'),
        competitorProduct('MyTruckPoint', 899.99, 'https://www.mytruckpoint.ca/products/warn-1'),
      ],
    };
    expect(competitorExportFields(product)).toEqual({
      niagara_price: 881.49,
      niagara_url: 'https://niagarajeeps.ca/products/a',
      mytruckpoint_price: 899.99,
      mytruckpoint_url: 'https://www.mytruckpoint.ca/products/warn-1',
    });
  });

  it('leaves the cells empty when a competitor has no row for the product', () => {
    const empty = { niagara_price: undefined, niagara_url: undefined, mytruckpoint_price: undefined, mytruckpoint_url: undefined };
    expect(competitorExportFields({ competitorProducts: [competitorProduct('TDOT', 99, null)] })).toEqual(empty);
    expect(competitorExportFields({})).toEqual(empty);
  });
});
