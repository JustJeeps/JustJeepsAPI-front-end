// Rules for the blue "Returning customer" check next to the customer name on
// the Orders screen. The API decides the match (`returning_customer`, see
// lib/orders/returningCustomer.js in the back-end): best QuickBooks customer
// found by e-mail or phone that has paid before, scored on four fields. The
// front only colors and describes it. Missing field (older API) = no icon.
//
// Kept apart from ReturningCustomerFlag.jsx on purpose: a helper .js and a
// component .jsx with the same basename break the build on this disk.

const FIELD_LABELS = { email: 'E-mail', phone: 'Phone', name: 'Name', address: 'Address' };
const FIELD_ORDER = ['email', 'phone', 'name', 'address'];

// Levels asked by the purchasing team (2026-09-29). Green = at least two of
// e-mail, phone and name equal (same green as the "PO assigned" check);
// yellow = one of e-mail or phone equal, or name plus address. Anything
// else is not a match and shows nothing. The API sends `level`; older
// payloads without it get the same rule computed from `fields`.
export const RETURNING_CUSTOMER_COLORS = {
	green: '#52c41a',
	yellow: '#faad14',
};

const isMatch = (fields, field) => fields?.[field] === 'match';

export const getReturningCustomerLevel = (flag) => {
	if (flag?.level === 'green' || flag?.level === 'yellow') return flag.level;
	const fields = flag?.fields;
	if (!fields) return null;
	const identityMatches = ['email', 'phone', 'name'].filter((field) => isMatch(fields, field)).length;
	if (identityMatches >= 2) return 'green';
	if (isMatch(fields, 'email') || isMatch(fields, 'phone')) return 'yellow';
	if (isMatch(fields, 'name') && isMatch(fields, 'address')) return 'yellow';
	return null;
};

export const getReturningCustomer = (order) => {
	const flag = order?.returning_customer;
	if (!flag || typeof flag !== 'object') return null;
	if (!flag.customer_code) return null;
	if (!getReturningCustomerLevel(flag)) return null;
	return flag;
};

export const getReturningCustomerColor = (flag) => RETURNING_CUSTOMER_COLORS[getReturningCustomerLevel(flag)] || RETURNING_CUSTOMER_COLORS.yellow;

const missingSide = (value) => {
	const orderHas = Boolean(value?.order);
	const quickbooksHas = Boolean(value?.quickbooks);
	if (!orderHas && !quickbooksHas) return 'on both sides';
	return orderHas ? 'in QuickBooks' : 'in the order';
};

const snapshotLine = (iso) => {
	const date = iso ? new Date(iso) : null;
	if (!date || Number.isNaN(date.getTime())) return 'QuickBooks export date unknown';
	return `QuickBooks data from ${date.toISOString().slice(0, 10)}`;
};

export const describeReturningCustomer = (flag) => {
	const lines = [`Returning customer (${flag.percent}% match)`];
	const fields = flag.fields || {};
	const values = flag.values || {};
	FIELD_ORDER.filter((field) => fields[field] === 'different').forEach((field) => {
		const value = values[field] || {};
		lines.push(`${FIELD_LABELS[field]} differs: order ${value.order || '(none)'}, QuickBooks ${value.quickbooks || '(none)'}`);
	});
	FIELD_ORDER.filter((field) => fields[field] === 'missing').forEach((field) => {
		lines.push(`${FIELD_LABELS[field]} missing ${missingSide(values[field])}`);
	});
	if (flag.last_purchase_date) {
		const count = Number(flag.payment_count);
		const payments = Number.isFinite(count) && count > 0 ? ` (${count} payment${count === 1 ? '' : 's'})` : '';
		lines.push(`Last purchase: ${flag.last_purchase_date}${payments}`);
	}
	lines.push(snapshotLine(flag.snapshot_exported_at));
	return lines.join('\n');
};

export const buildLookupUrl = (flag) =>
	`/quickbooks-customer-lookup?q=${encodeURIComponent(flag.customer_code)}&field=code`;
