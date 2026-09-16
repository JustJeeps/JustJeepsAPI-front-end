import { describe, it, expect } from 'vitest';
import { EMPTY_FILTERS } from '../RequestsFilterBar';
import {
	filterStorageKey,
	loadStoredFilters,
	saveStoredFilters,
	clearStoredFilters,
	isAssignedToMe,
	toggleAssignedToMe,
} from '../requestsFilterStorage';

// "Assigned to me" button + filters remembered per browser (asked 2026-09-16).
// The storage is injected (a Map-like stub here) so the rules run without a
// window and a broken localStorage can never break the page.

const memoryStorage = () => {
	const data = new Map();
	return {
		getItem: (k) => (data.has(k) ? data.get(k) : null),
		setItem: (k, v) => data.set(k, String(v)),
		removeItem: (k) => data.delete(k),
		size: () => data.size,
	};
};

const throwingStorage = () => ({
	getItem: () => { throw new Error('blocked'); },
	setItem: () => { throw new Error('blocked'); },
	removeItem: () => { throw new Error('blocked'); },
});

describe('filterStorageKey', () => {
	it('is scoped by user id so a shared machine does not leak filters between people', () => {
		expect(filterStorageKey(22)).not.toBe(filterStorageKey(7));
		expect(filterStorageKey(22)).toContain('22');
	});
});

describe('save / load / clear', () => {
	it('round-trips the filters for the same user', () => {
		const storage = memoryStorage();
		const filters = { ...EMPTY_FILTERS, assignee: '22', priority: 'High', search: 'grille' };
		saveStoredFilters(storage, 22, filters);
		expect(loadStoredFilters(storage, 22)).toEqual(filters);
	});

	it('returns null when nothing is stored, when the user is unknown, or when the JSON is broken', () => {
		const storage = memoryStorage();
		expect(loadStoredFilters(storage, 22)).toBeNull();
		expect(loadStoredFilters(storage, null)).toBeNull();
		storage.setItem(filterStorageKey(22), '{not json');
		expect(loadStoredFilters(storage, 22)).toBeNull();
	});

	it('fills missing keys and drops unknown ones so an older saved shape still works', () => {
		const storage = memoryStorage();
		storage.setItem(filterStorageKey(22), JSON.stringify({ assignee: '22', legacyKey: true }));
		expect(loadStoredFilters(storage, 22)).toEqual({ ...EMPTY_FILTERS, assignee: '22' });
	});

	it('clear removes the entry', () => {
		const storage = memoryStorage();
		saveStoredFilters(storage, 22, EMPTY_FILTERS);
		clearStoredFilters(storage, 22);
		expect(loadStoredFilters(storage, 22)).toBeNull();
	});

	it('never throws when the storage is unavailable', () => {
		const storage = throwingStorage();
		expect(() => saveStoredFilters(storage, 22, EMPTY_FILTERS)).not.toThrow();
		expect(() => clearStoredFilters(storage, 22)).not.toThrow();
		expect(loadStoredFilters(storage, 22)).toBeNull();
		expect(loadStoredFilters(null, 22)).toBeNull();
	});
});

describe('assigned to me', () => {
	it('detects the current user in the assignee filter (stored as a string, like the Select values)', () => {
		expect(isAssignedToMe({ ...EMPTY_FILTERS, assignee: '22' }, 22)).toBe(true);
		expect(isAssignedToMe({ ...EMPTY_FILTERS, assignee: '7' }, 22)).toBe(false);
		expect(isAssignedToMe(EMPTY_FILTERS, 22)).toBe(false);
		expect(isAssignedToMe({ ...EMPTY_FILTERS, assignee: '22' }, null)).toBe(false);
	});

	it('toggle sets the assignee to me and keeps every other filter', () => {
		const filters = { ...EMPTY_FILTERS, priority: 'High', assignee: '7' };
		expect(toggleAssignedToMe(filters, 22)).toEqual({ ...filters, assignee: '22' });
	});

	it('toggle clears the assignee when it is already me', () => {
		const filters = { ...EMPTY_FILTERS, priority: 'High', assignee: '22' };
		expect(toggleAssignedToMe(filters, 22)).toEqual({ ...filters, assignee: null });
	});
});
