import { describe, it, expect } from 'vitest';
import { getOtherOpenOrders, hasMultipleOpenOrders } from '../openOrdersRules';

// "N OPEN ORDERS" tag next to the customer name (asked by the purchasing team,
// 2026-09-15). The API attaches `open_orders_same_customer` to each order:
// every open order (PO not set, status not closed) of the same email,
// including the row itself when it is open. The rule lives in the back-end;
// the front only counts and lists.

const order = (overrides = {}) => ({
	entity_id: 1,
	increment_id: '200070846',
	customer_email: 'a@x.com',
	...overrides,
});

const open = (entity_id, increment_id) => ({ entity_id, increment_id, created_at: '2026-09-14 10:00:00' });

describe('hasMultipleOpenOrders', () => {
	it('is false when the API did not send the field (old API still deployed)', () => {
		expect(hasMultipleOpenOrders(order())).toBe(false);
		expect(hasMultipleOpenOrders(order({ open_orders_same_customer: null }))).toBe(false);
	});

	it('is false when the only open order is the row itself', () => {
		expect(hasMultipleOpenOrders(order({ open_orders_same_customer: [open(1, '200070846')] }))).toBe(false);
	});

	it('is true when the customer has two open orders', () => {
		const row = order({ open_orders_same_customer: [open(1, '200070846'), open(3, '200070900')] });
		expect(hasMultipleOpenOrders(row)).toBe(true);
	});

	it('is true on a closed row whose customer has two other open orders', () => {
		const row = order({ entity_id: 9, open_orders_same_customer: [open(1, '200070846'), open(3, '200070900')] });
		expect(hasMultipleOpenOrders(row)).toBe(true);
	});
});

describe('getOtherOpenOrders', () => {
	it('returns [] when the API did not send the field', () => {
		expect(getOtherOpenOrders(order())).toEqual([]);
	});

	it('excludes the row itself by entity_id', () => {
		const row = order({ open_orders_same_customer: [open(1, '200070846'), open(3, '200070900')] });
		expect(getOtherOpenOrders(row)).toEqual([open(3, '200070900')]);
	});

	it('keeps every open order on a closed row (none is the row itself)', () => {
		const row = order({ entity_id: 9, open_orders_same_customer: [open(1, '200070846'), open(3, '200070900')] });
		expect(getOtherOpenOrders(row)).toHaveLength(2);
	});
});
