import { describe, it, expect } from 'vitest';
import { DEFAULT_ORDER_FILTERS, customerSearchFilters } from '../orderFilters';

// Review finding on the "N OPEN ORDERS" tag (2026-09-15): clicking the tag
// only changed `search`, so with the Today chip or Items mode on, the click
// showed fewer orders than the tag counted. The click must reset every other
// filter and search the customer email in order mode.

describe('customerSearchFilters', () => {
	it('starts from the defaults and only sets search to the email', () => {
		expect(customerSearchFilters('a@x.com')).toEqual({ ...DEFAULT_ORDER_FILTERS, search: 'a@x.com' });
	});

	it('forces order mode and clears date, PO, region, vendor and exclude filters', () => {
		const result = customerSearchFilters('a@x.com');
		expect(result.filterMode).toBe('order');
		for (const key of ['starStatus', 'poStatus', 'region', 'vendor', 'dateFilter', 'exclude']) {
			expect(result[key]).toBe('');
		}
	});

	it('does not share the defaults object with callers', () => {
		expect(customerSearchFilters('a@x.com')).not.toBe(DEFAULT_ORDER_FILTERS);
		expect(DEFAULT_ORDER_FILTERS.search).toBe('');
	});
});
