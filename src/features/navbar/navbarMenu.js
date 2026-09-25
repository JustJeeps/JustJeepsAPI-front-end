// Pure builder of the navbar items. No React, no antd: the component only renders
// what comes out of here, so the gating rules stay testable.
//
// Shape: a top level item is either a link `{ key, label, to }` or a dropdown
// `{ key, label, children: [...] }` whose children are links, `{ type: 'group', label }`
// headers or `{ type: 'divider' }` rows (the antd Menu item shapes).

export const PURCHASER_REPORT_USERS = ['tess', 'paula', 'karoline'];
export const CRON_JOBS_USERS = ['tess'];

export const normalizeUsername = (user) => (user?.username || user?.name || '').toLowerCase();

const link = (key, label, to) => ({ key, label, to });
const group = (label) => ({ type: 'group', label });
const divider = () => ({ type: 'divider' });

// A dropdown with a single link is rendered as that link: a menu that opens on one
// item is noise (this is the logged out navbar, for example).
const dropdown = (key, label, children) => {
	const links = children.filter((child) => !child.type);
	if (links.length === 0) return null;
	if (links.length === 1) return links[0];
	return { key, label, children };
};

const compact = (items) => items.filter(Boolean);

export const buildNavItems = ({ user, requestsEnabled, replacementsEnabled }) => {
	const username = normalizeUsername(user);
	const loggedIn = Boolean(user);

	const products = dropdown('products', 'Products', compact([
		link('items', 'Search by SKU or Brand', '/items'),
		loggedIn && replacementsEnabled && link('replacements', 'Replacements', '/replacements'),
	]));

	const lookups = compact([
		loggedIn && link('quickbooks', 'QuickBooks Customer Lookup', '/quickbooks-customer-lookup'),
	]);
	const admin = compact([
		loggedIn && PURCHASER_REPORT_USERS.includes(username) && link('purchaser-report', 'Purchaser Report', '/purchaser-report'),
		loggedIn && CRON_JOBS_USERS.includes(username) && link('cron-jobs', 'Cron Jobs', '/cron-jobs'),
		loggedIn && link('settings', 'Imports and settings', '/settings'),
	]);
	const more = dropdown('more', 'More', compact([
		lookups.length > 0 && group('Lookups'),
		...lookups,
		lookups.length > 0 && admin.length > 0 && divider(),
		admin.length > 0 && group('Reports and admin'),
		...admin,
	]));

	return compact([
		link('orders', 'Orders', '/orders'),
		products,
		loggedIn && requestsEnabled && link('requests', 'Support Tickets', '/requests'),
		more,
	]);
};

const pathOf = (location) => String(location || '').split('?')[0];

// A dropdown is "active" (underlined like a link) when the current page is one of
// its children, including nested routes (/cron-jobs/history) and query strings.
export const isGroupActive = (item, location) => {
	const path = pathOf(location);
	return (item.children || []).some((child) => !child.type && child.to && (path === child.to || path.startsWith(`${child.to}/`)));
};
