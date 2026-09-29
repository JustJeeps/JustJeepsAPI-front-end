import { describe, it, expect } from 'vitest';
import {
	RETURNING_CUSTOMER_COLORS,
	getReturningCustomer,
	getReturningCustomerColor,
	describeReturningCustomer,
	buildLookupUrl,
} from '../returningCustomerRules';

const flag = (overrides = {}) => ({
	customer_code: 'LAVOIEM',
	customer_name: 'Marc Lavoie',
	percent: 75,
	fields: { email: 'match', phone: 'different', name: 'match', address: 'missing' },
	values: {
		email: { order: 'marc.l@example.com', quickbooks: 'marc.l@example.com' },
		phone: { order: '(416) 555-0199', quickbooks: '647-555-0000' },
		name: { order: 'Marc Lavoie', quickbooks: 'Marc Lavoie' },
		address: { order: '12 Main Street, Toronto M5V 3L9', quickbooks: '' },
	},
	last_purchase_date: '2026-03-14',
	payment_count: 3,
	snapshot_exported_at: '2026-07-16T12:00:00.000Z',
	...overrides,
});

describe('getReturningCustomer', () => {
	it('returns the flag when the API sent one', () => {
		expect(getReturningCustomer({ returning_customer: flag() })).toEqual(flag());
	});

	it('is null for an older API, a null field, a missing code or a percent under 25', () => {
		expect(getReturningCustomer({})).toBeNull();
		expect(getReturningCustomer({ returning_customer: null })).toBeNull();
		expect(getReturningCustomer({ returning_customer: flag({ customer_code: '' }) })).toBeNull();
		expect(getReturningCustomer({ returning_customer: flag({ percent: 0 }) })).toBeNull();
		expect(getReturningCustomer(null)).toBeNull();
	});
});

describe('getReturningCustomerColor', () => {
	it('uses four blue shades, stronger as the match grows', () => {
		expect(getReturningCustomerColor(25)).toBe(RETURNING_CUSTOMER_COLORS[25]);
		expect(getReturningCustomerColor(50)).toBe(RETURNING_CUSTOMER_COLORS[50]);
		expect(getReturningCustomerColor(75)).toBe(RETURNING_CUSTOMER_COLORS[75]);
		expect(getReturningCustomerColor(100)).toBe(RETURNING_CUSTOMER_COLORS[100]);
	});

	it('rounds down to the nearest step', () => {
		expect(getReturningCustomerColor(60)).toBe(RETURNING_CUSTOMER_COLORS[50]);
		expect(getReturningCustomerColor(99)).toBe(RETURNING_CUSTOMER_COLORS[75]);
		expect(getReturningCustomerColor(10)).toBe(RETURNING_CUSTOMER_COLORS[25]);
	});
});

describe('describeReturningCustomer', () => {
	it('lists the percentage, what differs, what is missing, the last purchase and the snapshot date', () => {
		expect(describeReturningCustomer(flag())).toBe([
			'Returning customer (75% match)',
			'Phone differs: order (416) 555-0199, QuickBooks 647-555-0000',
			'Address missing in QuickBooks',
			'Last purchase: 2026-03-14 (3 payments)',
			'QuickBooks data from 2026-07-16',
		].join('\n'));
	});

	it('says which side is missing a field', () => {
		const text = describeReturningCustomer(flag({
			fields: { email: 'match', phone: 'match', name: 'missing', address: 'missing' },
			values: { ...flag().values, name: { order: '', quickbooks: 'Marc Lavoie' }, address: { order: '', quickbooks: '' } },
			percent: 50,
		}));
		expect(text).toContain('Name missing in the order');
		expect(text).toContain('Address missing on both sides');
	});

	it('handles a full match, one payment and no export date', () => {
		const text = describeReturningCustomer(flag({
			percent: 100,
			fields: { email: 'match', phone: 'match', name: 'match', address: 'match' },
			payment_count: 1,
			snapshot_exported_at: null,
		}));
		expect(text).toBe([
			'Returning customer (100% match)',
			'Last purchase: 2026-03-14 (1 payment)',
			'QuickBooks export date unknown',
		].join('\n'));
	});

	it('skips the last purchase line when the date is unknown', () => {
		expect(describeReturningCustomer(flag({ last_purchase_date: null }))).not.toContain('Last purchase');
	});
});

describe('buildLookupUrl', () => {
	it('opens the lookup searching by customer code', () => {
		expect(buildLookupUrl(flag())).toBe('/quickbooks-customer-lookup?q=LAVOIEM&field=code');
		expect(buildLookupUrl(flag({ customer_code: 'A&B CO' }))).toBe('/quickbooks-customer-lookup?q=A%26B%20CO&field=code');
	});
});
