import { describe, it, expect } from 'vitest';
import {
	formatDateTime,
	displayName,
	canRemoveReplacement,
	canRemoveComment,
	normalizeSkuInput,
	validatePair,
	extractItemSkus,
	replacementErrorMessage,
	latestComment,
	stockHint,
	isSafeHttpUrl,
	isNoneMarker,
	replacementBadgeFor,
	noReplacementTooltip,
	withSelectedCandidate,
} from '../replacementsUtils';

describe('formatDateTime', () => {
	it('renders date and time in en-US without an em dash', () => {
		const text = formatDateTime('2026-09-23T14:42:00.000Z');
		expect(text).toMatch(/^Sep 23, 2026 \d{1,2}:\d{2} (AM|PM)$/);
		expect(text).not.toContain('—');
	});

	it('returns an empty string for a missing value', () => {
		expect(formatDateTime(null)).toBe('');
		expect(formatDateTime(undefined)).toBe('');
	});
});

describe('displayName', () => {
	it('prefers first and last name, then username', () => {
		expect(displayName({ firstname: 'Paula', lastname: 'P', username: 'paula' })).toBe('Paula P');
		expect(displayName({ firstname: 'Paula', username: 'paula' })).toBe('Paula');
		expect(displayName({ username: 'paula' })).toBe('paula');
		expect(displayName(null)).toBe('Unknown');
	});
});

describe('removal permissions mirror the backend rules', () => {
	const managers = ['ricardo', 'tess'];
	it('canRemoveReplacement: creator or manager', () => {
		const replacement = { created_by_id: 7 };
		expect(canRemoveReplacement({ replacement, user: { id: 7, username: 'paula' }, managers })).toBe(true);
		expect(canRemoveReplacement({ replacement, user: { id: 8, username: 'paula' }, managers })).toBe(false);
		expect(canRemoveReplacement({ replacement, user: { id: 8, username: 'Tess' }, managers })).toBe(true);
		expect(canRemoveReplacement({ replacement, user: null, managers })).toBe(false);
	});
	it('canRemoveComment: author or manager', () => {
		const comment = { author_id: 3 };
		expect(canRemoveComment({ comment, user: { id: 3, username: 'paula' }, managers })).toBe(true);
		expect(canRemoveComment({ comment, user: { id: 4, username: 'paula' }, managers })).toBe(false);
		expect(canRemoveComment({ comment, user: { id: 4, username: 'ricardo' }, managers })).toBe(true);
	});
});

describe('normalizeSkuInput', () => {
	it('trims and keeps the case', () => {
		expect(normalizeSkuInput('  CRO-83503077 ')).toBe('CRO-83503077');
		expect(normalizeSkuInput('abc')).toBe('abc');
		expect(normalizeSkuInput(null)).toBe('');
	});
});

describe('validatePair', () => {
	const existing = [{ replacement_sku: 'OMX-18282.05' }];
	it('accepts a new different SKU', () => {
		expect(validatePair({ sourceSku: 'CRO-83503077', replacementSku: 'MOO-RK620185', existing, pending: [] })).toBeNull();
	});
	it('rejects a self replacement', () => {
		expect(validatePair({ sourceSku: 'CRO-83503077', replacementSku: ' cro-83503077', existing, pending: [] })).toBe('A SKU cannot replace itself');
	});
	it('rejects a SKU already registered for this original', () => {
		expect(validatePair({ sourceSku: 'CRO-83503077', replacementSku: 'OMX-18282.05', existing, pending: [] })).toBe('OMX-18282.05 is already registered as a replacement for CRO-83503077');
	});
	it('rejects a SKU already added to the list being saved', () => {
		const pending = [{ replacement_sku: 'MOO-RK620185' }];
		expect(validatePair({ sourceSku: 'CRO-83503077', replacementSku: 'MOO-RK620185', existing, pending })).toBe('MOO-RK620185 is already in the list below');
	});
	it('rejects an empty SKU', () => {
		expect(validatePair({ sourceSku: 'CRO-83503077', replacementSku: '  ', existing, pending: [] })).toBe('Pick a replacement product');
	});
});

describe('extractItemSkus', () => {
	it('returns the unique trimmed SKUs of an order', () => {
		const order = { items: [{ sku: ' A ' }, { sku: 'B' }, { sku: 'A' }, { sku: '' }, {}] };
		expect(extractItemSkus(order)).toEqual(['A', 'B']);
		expect(extractItemSkus(null)).toEqual([]);
		expect(extractItemSkus({})).toEqual([]);
	});
});

describe('replacementErrorMessage', () => {
	it('maps the backend codes to plain sentences and falls back to the API message', () => {
		const withCode = (code, error) => ({ response: { data: { code, error } } });
		expect(replacementErrorMessage(withCode('DUPLICATE_REPLACEMENT', 'x'), 'fallback')).toBe('x');
		expect(replacementErrorMessage(withCode('NOT_ALLOWED', 'Only the person who registered this replacement or a manager can remove it'), 'fallback'))
			.toBe('Only the person who registered this replacement or a manager can remove it');
		expect(replacementErrorMessage({}, 'fallback')).toBe('fallback');
	});
});

describe('latestComment', () => {
	it('returns the newest comment by date regardless of the API order', () => {
		const older = { id: 1, body: 'old', createdAt: '2026-09-20T13:10:00Z' };
		const newer = { id: 2, body: 'new', createdAt: '2026-09-23T14:42:00Z' };
		expect(latestComment({ comments: [newer, older] })).toBe(newer);
		expect(latestComment({ comments: [older, newer] })).toBe(newer);
		expect(latestComment({ comments: [] })).toBeNull();
		expect(latestComment({})).toBeNull();
	});
});

describe('stockHint', () => {
	it('names the first vendor with stock, says out of stock when vendors exist without it, nothing without vendors', () => {
		expect(stockHint({ vendorProducts: [{ vendor_inventory: 0, vendor: { name: 'Omix' } }, { vendor_inventory: 3, vendor: { name: 'Meyer' } }] }))
			.toEqual({ text: 'In stock at Meyer', inStock: true });
		expect(stockHint({ vendorProducts: [{ vendor_inventory: 0, vendor: { name: 'Omix' } }] })).toEqual({ text: 'Out of stock', inStock: false });
		expect(stockHint({ vendorProducts: [] })).toBeNull();
		expect(stockHint(null)).toBeNull();
	});
});

describe('isSafeHttpUrl', () => {
	it('accepts only http(s) links', () => {
		expect(isSafeHttpUrl('https://www.justjeeps.com/x.html')).toBe(true);
		expect(isSafeHttpUrl('http://example.com')).toBe(true);
		expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
		expect(isSafeHttpUrl('')).toBe(false);
		expect(isSafeHttpUrl(null)).toBe(false);
	});
});

describe('no replacement marker helpers', () => {
	it('isNoneMarker recognises the marker rows and defaults old rows to pairs', () => {
		expect(isNoneMarker({ kind: 'none', replacement_sku: null })).toBe(true);
		expect(isNoneMarker({ kind: 'replacement', replacement_sku: 'B' })).toBe(false);
		expect(isNoneMarker({ replacement_sku: 'B' })).toBe(false);
		expect(isNoneMarker(null)).toBe(false);
	});

	it('replacementBadgeFor picks the marker over the count and nothing when empty', () => {
		expect(replacementBadgeFor({ replacements: 0, noReplacement: { comment: 'x' } })).toEqual({ kind: 'none', count: 0 });
		expect(replacementBadgeFor({ replacements: 2, noReplacement: null })).toEqual({ kind: 'replacements', count: 2 });
		expect(replacementBadgeFor({ replacements: 0, noReplacement: null })).toEqual({ kind: null, count: 0 });
		expect(replacementBadgeFor(undefined)).toEqual({ kind: null, count: 0 });
		expect(replacementBadgeFor(3)).toEqual({ kind: 'replacements', count: 3 });
	});

	it('noReplacementTooltip gives the comment and who registered it', () => {
		const lines = noReplacementTooltip({ comment: 'Discontinued.', by: 'Paula Pereira', at: '2026-09-24T14:00:00Z' });
		expect(lines[0]).toBe('Discontinued.');
		expect(lines[1]).toMatch(/^by Paula Pereira, Sep 24, 2026 /);
		expect(noReplacementTooltip({ comment: '', by: '', at: null })).toEqual(['No replacement registered', '']);
	});
});

describe('withSelectedCandidate', () => {
	const pending = [{ replacement_sku: 'A', product: { sku: 'A' }, comment: 'first' }];
	it('adds the product selected in step 2 to what will be saved, even without Add', () => {
		const result = withSelectedCandidate({ pending, candidate: { sku: 'B' }, comment: ' second ', pairError: null });
		expect(result.map((entry) => entry.replacement_sku)).toEqual(['A', 'B']);
		expect(result[1]).toEqual({ replacement_sku: 'B', product: { sku: 'B' }, comment: 'second' });
	});
	it('leaves the list alone when there is no valid candidate or it is already listed', () => {
		expect(withSelectedCandidate({ pending, candidate: null, comment: '', pairError: null })).toEqual(pending);
		expect(withSelectedCandidate({ pending, candidate: { sku: 'B' }, comment: '', pairError: 'A SKU cannot replace itself' })).toEqual(pending);
		expect(withSelectedCandidate({ pending, candidate: { sku: 'A' }, comment: 'dup', pairError: null })).toEqual(pending);
		expect(withSelectedCandidate({ pending: [], candidate: { sku: 'B' }, comment: '', pairError: null })).toEqual([{ replacement_sku: 'B', product: { sku: 'B' }, comment: '' }]);
	});
});
