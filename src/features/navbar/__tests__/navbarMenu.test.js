import { describe, it, expect } from 'vitest';
import { buildNavItems, isGroupActive } from '../navbarMenu';

const labels = (items) => items.map((item) => item.label);
const find = (items, key) => items.find((item) => item.key === key);
const childLabels = (group) => (group.children || []).filter((c) => c.type !== 'group' && c.type !== 'divider').map((c) => c.label);

describe('buildNavItems', () => {
	it('shows only Orders and the catalog search when nobody is logged in', () => {
		const items = buildNavItems({ user: null, requestsEnabled: false, replacementsEnabled: false });
		expect(labels(items)).toEqual(['Orders', 'Search by SKU or Brand']);
		expect(items.every((item) => !item.children)).toBe(true);
	});

	it('groups Products and More for a regular logged in user', () => {
		const items = buildNavItems({ user: { username: 'david' }, requestsEnabled: true, replacementsEnabled: true });
		expect(labels(items)).toEqual(['Orders', 'Products', 'Support Tickets', 'More']);
		expect(childLabels(find(items, 'products'))).toEqual(['Search by SKU or Brand', 'Replacements']);
		expect(childLabels(find(items, 'more'))).toEqual(['QuickBooks Customer Lookup', 'Imports and settings']);
	});

	it('adds Purchaser Report and Cron Jobs only for the allowed users', () => {
		const tess = buildNavItems({ user: { username: 'Tess' }, requestsEnabled: true, replacementsEnabled: true });
		expect(childLabels(find(tess, 'more'))).toEqual(['QuickBooks Customer Lookup', 'Purchaser Report', 'Cron Jobs', 'Imports and settings']);
		const paula = buildNavItems({ user: { username: 'paula' }, requestsEnabled: true, replacementsEnabled: true });
		expect(childLabels(find(paula, 'more'))).toEqual(['QuickBooks Customer Lookup', 'Purchaser Report', 'Imports and settings']);
	});

	it('hides Support Tickets and Replacements while their gates are closed', () => {
		const items = buildNavItems({ user: { username: 'david' }, requestsEnabled: false, replacementsEnabled: false });
		expect(labels(items)).toEqual(['Orders', 'Search by SKU or Brand', 'More']);
	});

	it('falls back to the name field when the user has no username', () => {
		const items = buildNavItems({ user: { name: 'TESS' }, requestsEnabled: false, replacementsEnabled: false });
		expect(childLabels(find(items, 'more'))).toContain('Cron Jobs');
	});

	it('gives More a group label per section', () => {
		const items = buildNavItems({ user: { username: 'tess' }, requestsEnabled: false, replacementsEnabled: false });
		const groups = find(items, 'more').children.filter((c) => c.type === 'group').map((c) => c.label);
		expect(groups).toEqual(['Lookups', 'Reports and admin']);
	});

	it('every leaf carries a route', () => {
		const items = buildNavItems({ user: { username: 'tess' }, requestsEnabled: true, replacementsEnabled: true });
		const leaves = items.flatMap((item) => (item.children ? item.children.filter((c) => !c.type) : [item]));
		expect(leaves.every((leaf) => typeof leaf.to === 'string' && leaf.to.startsWith('/'))).toBe(true);
	});
});

describe('isGroupActive', () => {
	const group = { key: 'more', children: [{ type: 'group', label: 'x' }, { key: 'cron', to: '/cron-jobs' }, { key: 'settings', to: '/settings' }] };

	it('is true when the current path is one of the children', () => {
		expect(isGroupActive(group, '/cron-jobs')).toBe(true);
	});

	it('matches nested paths and query strings of a child route', () => {
		expect(isGroupActive(group, '/settings?tab=imports')).toBe(true);
		expect(isGroupActive(group, '/cron-jobs/history')).toBe(true);
	});

	it('is false elsewhere', () => {
		expect(isGroupActive(group, '/orders')).toBe(false);
		expect(isGroupActive(group, '/')).toBe(false);
	});
});
