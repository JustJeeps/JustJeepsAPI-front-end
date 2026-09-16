// Filters of the Requests page remembered per browser and per user, plus the
// "Assigned to me" rule. Storage is a parameter (window.localStorage in the
// page, a stub in tests) and every access is guarded: a blocked or full
// localStorage must never break the page.
import { EMPTY_FILTERS } from './RequestsFilterBar';

export const filterStorageKey = (userId) => `requests.filters.v1.user-${userId}`;

export const loadStoredFilters = (storage, userId) => {
	if (!storage || userId == null) return null;
	try {
		const raw = storage.getItem(filterStorageKey(userId));
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object') return null;
		// Only the keys the bar knows today: fills what is missing, drops the rest.
		const filters = { ...EMPTY_FILTERS };
		for (const key of Object.keys(EMPTY_FILTERS)) {
			if (key in parsed) filters[key] = parsed[key];
		}
		return filters;
	} catch {
		return null;
	}
};

export const saveStoredFilters = (storage, userId, filters) => {
	if (!storage || userId == null) return;
	try {
		storage.setItem(filterStorageKey(userId), JSON.stringify(filters));
	} catch {
		// Private mode, quota, or blocked storage: the page keeps working.
	}
};

export const clearStoredFilters = (storage, userId) => {
	if (!storage || userId == null) return;
	try {
		storage.removeItem(filterStorageKey(userId));
	} catch {
		// Same as above.
	}
};

// The assignee filter holds the user id as a string (Select option values).
export const isAssignedToMe = (filters, userId) =>
	userId != null && String(filters?.assignee ?? '') === String(userId);

export const toggleAssignedToMe = (filters, userId) => ({
	...filters,
	assignee: isAssignedToMe(filters, userId) ? null : String(userId),
});
