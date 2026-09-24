// Pure helpers of the Product Replacement feature (no React, no HTTP), so
// they can be unit tested with vitest. Rules mirror the backend
// (lib/productReplacements/rules.js): the backend is the source of truth,
// these only decide what the UI shows before the API answers.

import { apiErrorMessage } from '../../utils/api';

// "Sep 23, 2026 10:42 AM" (no em dash: the team reads it as machine text).
export const formatDateTime = (value) => {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	return `${day} ${time}`;
};

export const displayName = (user) => {
	if (!user) return 'Unknown';
	const name = [user.firstname, user.lastname].filter(Boolean).join(' ').trim();
	return name || user.username || user.email || 'Unknown';
};

export const userInitials = (user) => {
	if (!user) return '?';
	const first = (user.firstname || user.username || '?')[0] || '?';
	const last = (user.lastname || '')[0] || '';
	return `${first}${last}`.toUpperCase();
};

const isManager = (user, managers) =>
	Boolean(user) && (managers || []).includes(String(user.username || '').toLowerCase());

export const canRemoveReplacement = ({ replacement, user, managers }) => {
	if (!replacement || !user) return false;
	return isManager(user, managers) || replacement.created_by_id === user.id;
};

export const canRemoveComment = ({ comment, user, managers }) => {
	if (!comment || !user) return false;
	return isManager(user, managers) || comment.author_id === user.id;
};

// Product.sku is case sensitive: trim only.
export const normalizeSkuInput = (value) => (value === null || value === undefined ? '' : String(value).trim());

// Returns a sentence to show under the picker, or null when the pair can be
// added to the list. `existing` = active replacements already registered for
// the original; `pending` = the ones added in the modal and not saved yet.
export const validatePair = ({ sourceSku, replacementSku, existing = [], pending = [] }) => {
	const source = normalizeSkuInput(sourceSku);
	const replacement = normalizeSkuInput(replacementSku);
	if (!replacement) return 'Pick a replacement product';
	if (source && source.toLowerCase() === replacement.toLowerCase()) return 'A SKU cannot replace itself';
	if (existing.some((entry) => entry.replacement_sku === replacement)) {
		return `${replacement} is already registered as a replacement for ${source}`;
	}
	if (pending.some((entry) => entry.replacement_sku === replacement)) {
		return `${replacement} is already in the list below`;
	}
	return null;
};

// SKUs of an order's items, for the counts call made when a row is expanded.
export const extractItemSkus = (order) => {
	const items = Array.isArray(order?.items) ? order.items : [];
	const skus = items.map((item) => normalizeSkuInput(item?.sku)).filter(Boolean);
	return [...new Set(skus)];
};

// The API already writes its errors as plain sentences with a code; show the
// sentence and keep the fallback for network failures.
export const replacementErrorMessage = (error, fallback) => apiErrorMessage(error, fallback);

// Newest comment by date (the API sends them oldest first, but do not rely on it).
export const latestComment = (replacement) => {
	const comments = Array.isArray(replacement?.comments) ? replacement.comments : [];
	if (!comments.length) return null;
	return comments.reduce((latest, comment) =>
		(new Date(comment.createdAt) > new Date(latest.createdAt) ? comment : latest));
};

// Stock hint for a search suggestion, from the vendor data the search already
// returns (same data the Orders screen uses). null when no vendor is known.
export const stockHint = (product) => {
	const vendors = Array.isArray(product?.vendorProducts) ? product.vendorProducts : [];
	const inStock = vendors.find((entry) => Number(entry?.vendor_inventory) > 0);
	if (inStock) return { text: `In stock at ${inStock.vendor?.name || 'vendor'}`, inStock: true };
	if (vendors.length) return { text: 'Out of stock', inStock: false };
	return null;
};

// Only http(s) links are rendered as anchors (a stored "javascript:" URL
// would otherwise become a click-to-run link).
export const isSafeHttpUrl = (url) => /^https?:\/\//i.test(String(url || ''));

// --- "No replacement" marker ------------------------------------------------

// A directory row is a pair or a marker (kind 'none'); old rows are pairs.
export const isNoneMarker = (row) => Boolean(row) && row.kind === 'none';

// What the Orders cell shows for a SKU, from the counts payload
// ({ replacements, noReplacement } or, for older payloads, a number).
export const replacementBadgeFor = (entry) => {
	if (typeof entry === 'number') return { kind: entry > 0 ? 'replacements' : null, count: entry };
	if (!entry) return { kind: null, count: 0 };
	if (entry.noReplacement) return { kind: 'none', count: 0 };
	const count = Number(entry.replacements) || 0;
	return { kind: count > 0 ? 'replacements' : null, count };
};

// Two lines for the tooltip of the "no replacement" icon.
export const noReplacementTooltip = ({ comment, by, at } = {}) => [
	String(comment || '').trim() || 'No replacement registered',
	by ? `by ${by}, ${formatDateTime(at)}` : '',
];

// What the modal saves: the list built with "Add" plus the product still
// selected in step 2, when it is valid and not listed yet. People pick a
// second product, skip "Add" and press Save; that product must not be lost.
export const withSelectedCandidate = ({ pending = [], candidate, comment = '', pairError = null }) => {
	if (!candidate?.sku || pairError) return pending;
	if (pending.some((entry) => entry.replacement_sku === candidate.sku)) return pending;
	return [...pending, { replacement_sku: candidate.sku, product: candidate, comment: String(comment || '').trim() }];
};
