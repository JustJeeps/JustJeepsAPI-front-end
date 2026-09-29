import { describe, it, expect } from 'vitest';
import { VENDOR_SITES, vendorLinks } from '../vendorLinks';

// Every vendor page the tool links to, in one place. The URL of each vendor
// is recorded here so a change is deliberate, never a side effect of a
// refactor. Rough Country moved to the Canadian site on 2026-09-29.

describe('VENDOR_SITES', () => {
	it('lists the home page of every vendor the tool links to', () => {
		expect(VENDOR_SITES).toEqual({
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
	});
});

describe('vendorLinks', () => {
	it('sends Rough Country to the Canadian site search', () => {
		expect(vendorLinks.roughCountrySearch('1360')).toBe('https://www.roughcountry.ca/search/1360');
		expect(vendorLinks.roughCountrySearch('')).toBeNull();
		expect(vendorLinks.roughCountrySearch(undefined)).toBeNull();
	});

	it('builds the same page each screen used before the centralization', () => {
		expect(vendorLinks.meyerPart('ABC-1')).toBe('https://online.meyerdistributing.com/parts/details/ABC-1');
		expect(vendorLinks.omixProduct('12345.01')).toBe('https://omixdealer.com/product-detail/12345.01');
		expect(vendorLinks.quadratecSearch('12345')).toBe('https://www.quadratecwholesale.com/catalogsearch/result/?q=12345');
		expect(vendorLinks.tireDiscounterSearch('TD1')).toBe('https://www.tdgaccess.ca/Catalog/Search/1?search=TD1');
		expect(vendorLinks.keystoneDetail('BES12345-67')).toBe('https://wwwsc.ekeystone.com/Search/Detail?pid=BES12345-67');
		expect(vendorLinks.wheelProsSearch('WP1')).toBe('https://dl.wheelpros.com/ca_en/ymm/search/?api-type=products&p=1&pageSize=24&q=WP1&inventorylocations=AL');
		expect(vendorLinks.luvernePart('L1')).toBe('https://www.luvernetruck.com/part/L1');
		expect(vendorLinks.ariesPart('A1')).toBe('https://www.ariesautomotive.com/part/A1');
		expect(vendorLinks.curtPart('C1')).toBe('https://www.curtmfg.com/part/C1');
		expect(vendorLinks.uwsPart('U1')).toBe('https://www.uwsta.com/part/U1');
		expect(vendorLinks.ctpSearch('CTP1')).toBe('https://www.ctpdistributors.com/search-parts?find=CTP1');
		expect(vendorLinks.turn14Search('T1')).toBe('https://turn14.com/search/index.php?vmmPart=T1');
		expect(vendorLinks.apgSearch('P1')).toBe('https://apgwholesale.com/pages/search-results-page?q=P1');
		expect(vendorLinks.metalcloakSearch('7001')).toBe('https://jobber.metalcloak.com/catalogsearch/result/?q=7001');
		expect(vendorLinks.grandwestSearch('G1')).toBe('https://www.grandwestauto.com/search?keywords=G1');
		expect(vendorLinks.amazonSearch('Jeep bumper')).toBe('https://www.amazon.ca/s?k=Jeep%20bumper');
		expect(vendorLinks.crownSearch()).toBe('https://www.crownautomotive.net/search.html');
	});

	it('encodes the code and returns null when there is none', () => {
		expect(vendorLinks.meyerPart('A/B #1')).toBe('https://online.meyerdistributing.com/parts/details/A%2FB%20%231');
		expect(vendorLinks.keystoneDetail('')).toBeNull();
		expect(vendorLinks.turn14Search(null)).toBeNull();
		expect(vendorLinks.amazonSearch('  ')).toBeNull();
	});

	it('exposes the home page as the fallback of each search', () => {
		expect(vendorLinks.home('keystone')).toBe('https://wwwsc.ekeystone.com/');
		expect(vendorLinks.home('apg')).toBe('https://apgwholesale.com/');
		expect(vendorLinks.home('nope')).toBeNull();
	});
});
