import { describe, it, expect } from 'vitest';
import { storedProductUrl } from '../competitorLink';

// Scrapers that know the competitor's product page store it on the row
// (Lowriders, Niagara Jeeps); the tables link to it when it is a web address.

describe('storedProductUrl', () => {
  it('returns the stored product page of the competitor row', () => {
    expect(storedProductUrl({ product_url: 'https://niagarajeeps.ca/products/go-rhino-dominator-d1-side-steps' }))
      .toBe('https://niagarajeeps.ca/products/go-rhino-dominator-d1-side-steps');
  });

  it('trims spaces around the address', () => {
    expect(storedProductUrl({ product_url: '  https://www.lowriders.ca/i-1  ' })).toBe('https://www.lowriders.ca/i-1');
  });

  it('ignores anything that is not an http or https address', () => {
    expect(storedProductUrl({ product_url: 'javascript:alert(1)' })).toBeNull();
    expect(storedProductUrl({ product_url: '/products/x' })).toBeNull();
    expect(storedProductUrl({ product_url: '' })).toBeNull();
    expect(storedProductUrl({ product_url: null })).toBeNull();
    expect(storedProductUrl({})).toBeNull();
    expect(storedProductUrl(undefined)).toBeNull();
  });
});
