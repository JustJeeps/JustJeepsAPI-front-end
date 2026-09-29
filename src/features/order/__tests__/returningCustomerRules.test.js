import { describe, it, expect } from 'vitest';
import {
	RETURNING_CUSTOMER_COLORS,
	getReturningCustomer,
	getReturningCustomerLevel,
	getReturningCustomerColor,
	describeReturningCustomer,
	summarizeReturningCustomer,
	buildLookupUrl,
} from '../returningCustomerRules';

const flag = (overrides = {}) => ({
	customer_code: 'LAVOIEM',
	customer_name: 'Marc Lavoie',
	percent: 75,
	level: 'green',
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

	it('is null for an older API, a null field or a missing code', () => {
		expect(getReturningCustomer({})).toBeNull();
		expect(getReturningCustomer({ returning_customer: null })).toBeNull();
		expect(getReturningCustomer({ returning_customer: flag({ customer_code: '' }) })).toBeNull();
		expect(getReturningCustomer(null)).toBeNull();
	});

	it('is null when the fields give no level, even if the API forgot to say so', () => {
		const nameOnly = flag({ level: undefined, percent: 25, fields: { email: 'different', phone: 'different', name: 'match', address: 'missing' } });
		expect(getReturningCustomer({ returning_customer: nameOnly })).toBeNull();
		expect(getReturningCustomer({ returning_customer: flag({ level: undefined, fields: undefined }) })).toBeNull();
	});
});

describe('getReturningCustomerLevel', () => {
	const withFields = (fields) => ({ fields });

	it('trusts the level sent by the API', () => {
		expect(getReturningCustomerLevel({ level: 'yellow', fields: { email: 'match', phone: 'match', name: 'match', address: 'match' } })).toBe('yellow');
	});

	it('is green with two of e-mail, phone and name', () => {
		expect(getReturningCustomerLevel(withFields({ email: 'match', phone: 'match', name: 'different', address: 'different' }))).toBe('green');
		expect(getReturningCustomerLevel(withFields({ email: 'match', phone: 'missing', name: 'match', address: 'missing' }))).toBe('green');
		expect(getReturningCustomerLevel(withFields({ email: 'different', phone: 'match', name: 'match', address: 'match' }))).toBe('green');
	});

	it('is yellow with one identifier or with name plus address', () => {
		expect(getReturningCustomerLevel(withFields({ email: 'match', phone: 'different', name: 'different', address: 'match' }))).toBe('yellow');
		expect(getReturningCustomerLevel(withFields({ email: 'missing', phone: 'match', name: 'different', address: 'missing' }))).toBe('yellow');
		expect(getReturningCustomerLevel(withFields({ email: 'different', phone: 'different', name: 'match', address: 'match' }))).toBe('yellow');
	});

	it('is null for name alone, address alone or nothing', () => {
		expect(getReturningCustomerLevel(withFields({ email: 'different', phone: 'different', name: 'match', address: 'different' }))).toBeNull();
		expect(getReturningCustomerLevel(withFields({ email: 'missing', phone: 'missing', name: 'missing', address: 'match' }))).toBeNull();
		expect(getReturningCustomerLevel(null)).toBeNull();
	});
});

describe('getReturningCustomerColor', () => {
	it('is green for a strong match and yellow for a partial one', () => {
		expect(getReturningCustomerColor(flag())).toBe(RETURNING_CUSTOMER_COLORS.green);
		expect(getReturningCustomerColor(flag({ level: 'yellow' }))).toBe(RETURNING_CUSTOMER_COLORS.yellow);
		expect(getReturningCustomerColor(flag({ level: undefined, fields: { email: 'match', phone: 'different', name: 'different', address: 'missing' } }))).toBe(RETURNING_CUSTOMER_COLORS.yellow);
	});

	it('uses the same green as the PO assigned check', () => {
		expect(RETURNING_CUSTOMER_COLORS.green).toBe('#52c41a');
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

describe('summarizeReturningCustomer', () => {
	it('builds the card data: level, percentage, one row per field, last purchase, snapshot and link', () => {
		const card = summarizeReturningCustomer(flag());
		expect(card.levelLabel).toBe('Strong match');
		expect(card.level).toBe('green');
		expect(card.percent).toBe(75);
		expect(card.customerName).toBe('Marc Lavoie');
		expect(card.customerCode).toBe('LAVOIEM');
		expect(card.rows).toEqual([
			{ key: 'email', label: 'E-mail', status: 'match', order: 'marc.l@example.com', quickbooks: 'marc.l@example.com', note: 'Same' },
			{ key: 'phone', label: 'Phone', status: 'different', order: '(416) 555-0199', quickbooks: '647-555-0000', note: 'Differs' },
			{ key: 'name', label: 'Name', status: 'match', order: 'Marc Lavoie', quickbooks: 'Marc Lavoie', note: 'Same' },
			{ key: 'address', label: 'Address', status: 'missing', order: '12 Main Street, Toronto M5V 3L9', quickbooks: '', note: 'Missing in QuickBooks' },
		]);
		expect(card.lastPurchase).toBe('2026-03-14 (3 payments)');
		expect(card.snapshot).toBe('QuickBooks data from 2026-07-16');
		expect(card.lookupUrl).toBe('/quickbooks-customer-lookup?q=LAVOIEM&field=code');
	});

	it('labels a yellow flag as partial and tolerates missing values and dates', () => {
		const card = summarizeReturningCustomer(flag({ level: 'yellow', values: undefined, last_purchase_date: null, snapshot_exported_at: null, customer_name: '' }));
		expect(card.levelLabel).toBe('Partial match');
		expect(card.customerName).toBe('LAVOIEM');
		expect(card.rows.map((row) => row.order)).toEqual(['', '', '', '']);
		expect(card.rows[3].note).toBe('Missing on both sides');
		expect(card.lastPurchase).toBeNull();
		expect(card.snapshot).toBe('QuickBooks export date unknown');
	});
});
