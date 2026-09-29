// Every vendor website the tool links to, in one place. The screens decide
// WHICH code to search with (vendor SKU, product SKU, Keystone code...); this
// file only knows WHERE that search lives, so a domain change is one line here
// (Rough Country moved from .com to .ca on 2026-09-29, at the client's request).
//
// Every builder encodes the code and returns null when there is none, so a
// caller can fall back to `vendorLinks.home(key)` or hide the link.

export const VENDOR_SITES = Object.freeze({
	meyer: 'https://online.meyerdistributing.com',
	omix: 'https://omixdealer.com',
	quadratec: 'https://www.quadratecwholesale.com',
	tireDiscounter: 'https://www.tdgaccess.ca',
	keystone: 'https://wwwsc.ekeystone.com',
	wheelPros: 'https://dl.wheelpros.com',
	roughCountry: 'https://www.roughcountry.ca',
	luverne: 'https://www.luvernetruck.com',
	aries: 'https://www.ariesautomotive.com',
	curt: 'https://www.curtmfg.com',
	uws: 'https://www.uwsta.com',
	ctp: 'https://www.ctpdistributors.com',
	turn14: 'https://turn14.com',
	apg: 'https://apgwholesale.com',
	metalcloak: 'https://jobber.metalcloak.com',
	grandwest: 'https://www.grandwestauto.com',
	amazon: 'https://www.amazon.ca',
	crown: 'https://www.crownautomotive.net',
});

const code = (value) => String(value ?? '').trim();

// withCode(site, (encoded) => path) -> builder that yields null without a code.
const withCode = (site, path) => (value) => {
	const clean = code(value);
	return clean ? `${VENDOR_SITES[site]}${path(encodeURIComponent(clean))}` : null;
};

export const vendorLinks = Object.freeze({
	home: (site) => (VENDOR_SITES[site] ? `${VENDOR_SITES[site]}/` : null),
	meyerPart: withCode('meyer', (c) => `/parts/details/${c}`),
	omixProduct: withCode('omix', (c) => `/product-detail/${c}`),
	quadratecSearch: withCode('quadratec', (c) => `/catalogsearch/result/?q=${c}`),
	tireDiscounterSearch: withCode('tireDiscounter', (c) => `/Catalog/Search/1?search=${c}`),
	keystoneDetail: withCode('keystone', (c) => `/Search/Detail?pid=${c}`),
	wheelProsSearch: withCode('wheelPros', (c) => `/ca_en/ymm/search/?api-type=products&p=1&pageSize=24&q=${c}&inventorylocations=AL`),
	roughCountrySearch: withCode('roughCountry', (c) => `/search/${c}`),
	luvernePart: withCode('luverne', (c) => `/part/${c}`),
	ariesPart: withCode('aries', (c) => `/part/${c}`),
	curtPart: withCode('curt', (c) => `/part/${c}`),
	uwsPart: withCode('uws', (c) => `/part/${c}`),
	ctpSearch: withCode('ctp', (c) => `/search-parts?find=${c}`),
	turn14Search: withCode('turn14', (c) => `/search/index.php?vmmPart=${c}`),
	apgSearch: withCode('apg', (c) => `/pages/search-results-page?q=${c}`),
	metalcloakSearch: withCode('metalcloak', (c) => `/catalogsearch/result/?q=${c}`),
	grandwestSearch: withCode('grandwest', (c) => `/search?keywords=${c}`),
	amazonSearch: withCode('amazon', (c) => `/s?k=${c}`),
	crownSearch: () => `${VENDOR_SITES.crown}/search.html`,
});
