import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
	normalizeHeader,
	findHeaderRow,
	classifyRows,
	resolveMatches,
	diffSignature,
	readHeaderRows,
	detectFile,
	describeRejection,
	CSV_HEAD_BYTES,
} from '../detectFeedFile';

// Real Quadratec headers (Oct 2026 exports).
const GOLD_SHEET = ['Quadratec PN', 'MPN', 'Description', 'UPC Code', 'Brand', 'Retail Price', 'Wholesale Price', 'Shipping Surcharge'];
const GOLD_KIT = ['Name', 'Display Name', 'Retail Price', 'Wholesale Price', 'Brand'];
const WHOLESALE = ['Quadratec Part No', 'Part No', 'Description', 'Brand', 'Inventory PA1', 'Inventory PA2', 'Inventory NV1', 'Inventory Total', 'Cost', 'Surcharge', 'UPC', 'MAP'];
const KEYSTONE = ['VCPN', 'Description', 'Qty', 'Price'];

const QUADRATEC_SPECS = [
	{ name: 'quadratec_wholesale.csv', label: 'Quadratec wholesale CSV', signature: WHOLESALE, sheet: null },
	{ name: 'pricingSheet_quad.xlsx', label: 'Quadratec gold sheet', signature: GOLD_SHEET, sheet: null },
	{ name: 'pricingKit_quad.xlsx', label: 'Quadratec gold kit', signature: GOLD_KIT, sheet: null },
];

const KEYSTONE_SPECS = [
	{ name: 'Inventory.csv', label: 'Keystone inventory', signature: KEYSTONE, sheet: null },
	{ name: 'SpecialOrder.csv', label: 'Keystone special order', signature: KEYSTONE, sheet: null },
];

const quadratecFeed = { files: QUADRATEC_SPECS.map((spec) => spec.name), fileSpecs: QUADRATEC_SPECS };
const keystoneFeed = { files: KEYSTONE_SPECS.map((spec) => spec.name), fileSpecs: KEYSTONE_SPECS };

// In-memory xlsx with the given rows (optionally several sheets).
const xlsxFile = (name, sheets) => {
	const workbook = XLSX.utils.book_new();
	Object.entries(sheets).forEach(([sheetName, rows]) => {
		XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
	});
	const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
	return new File([bytes], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', lastModified: 1760000000000 });
};

const csvFile = (name, text) => new File([text], name, { type: 'text/csv' });

const csvText = (header, rowCount, cells = 4) => {
	const lines = [header.map((cell) => `"${cell}"`).join(',')];
	for (let index = 0; index < rowCount; index += 1) {
		lines.push(header.map((_, column) => `${index}-${column}-${'x'.repeat(cells)}`).join(','));
	}
	return `${lines.join('\n')}\n`;
};

describe('normalizeHeader', () => {
	it('trims, collapses whitespace and newlines, keeps case', () => {
		expect(normalizeHeader(['  Quadratec\nPN ', 'MPN\t\tcode', 'Brand'])).toEqual(['Quadratec PN', 'MPN code', 'Brand']);
	});

	it('drops leading and trailing empty cells but keeps the ones in the middle', () => {
		expect(normalizeHeader(['', null, 'A', '', undefined, 'B', '', '  '])).toEqual(['A', '', '', 'B']);
	});

	it('turns non-string cells into text', () => {
		expect(normalizeHeader([2024, true, 'x'])).toEqual(['2024', 'true', 'x']);
	});

	it('handles an empty or missing row', () => {
		expect(normalizeHeader([])).toEqual([]);
		expect(normalizeHeader(undefined)).toEqual([]);
	});
});

describe('findHeaderRow', () => {
	const rows = [
		['KeyParts', '', ''],
		['Price list', '', ''],
		[],
		['', '', ''],
		['Effective', 'Oct 2026'],
		['', '', ''],
		['Part No', 'Description', 'Price'],
		['A1', 'Thing', 10],
	];

	it('finds a header on row 7', () => {
		expect(findHeaderRow(rows, ['Part No', 'Description', 'Price'])).toBe(6);
	});

	it('matches with whitespace differences only', () => {
		expect(findHeaderRow([['  Part No\n', 'Description ', 'Price']], ['Part No', 'Description', 'Price'])).toBe(0);
	});

	it('rejects a reorder and a missing column', () => {
		expect(findHeaderRow(rows, ['Description', 'Part No', 'Price'])).toBe(-1);
		expect(findHeaderRow(rows, ['Part No', 'Description'])).toBe(-1);
	});

	it('only scans the first N rows', () => {
		expect(findHeaderRow(rows, ['Part No', 'Description', 'Price'], 6)).toBe(-1);
		expect(findHeaderRow(rows, ['Part No', 'Description', 'Price'], 7)).toBe(6);
	});

	it('never matches an empty signature', () => {
		expect(findHeaderRow([[], ['']], [])).toBe(-1);
	});
});

describe('classifyRows', () => {
	it('returns the single spec whose columns match', () => {
		const { matches, ambiguous } = classifyRows([GOLD_KIT, ['k1', 'Kit 1', 1, 2, 'Brand']], QUADRATEC_SPECS, 'gold kit 10.13.26.xlsx');
		expect(ambiguous).toBe(false);
		expect(matches.map((spec) => spec.name)).toEqual(['pricingKit_quad.xlsx']);
	});

	it('matches nothing when the columns are reordered', () => {
		const reordered = [...GOLD_SHEET].reverse();
		expect(classifyRows([reordered], QUADRATEC_SPECS, 'pricingSheet_quad.xlsx').matches).toEqual([]);
	});

	it('breaks a Keystone tie by the original name, case-insensitive', () => {
		const { matches, ambiguous } = classifyRows([KEYSTONE], KEYSTONE_SPECS, 'specialorder.CSV');
		expect(ambiguous).toBe(false);
		expect(matches.map((spec) => spec.name)).toEqual(['SpecialOrder.csv']);
	});

	it('stays ambiguous when the name does not break the tie', () => {
		const { matches, ambiguous } = classifyRows([KEYSTONE], KEYSTONE_SPECS, 'keystone oct 14.csv');
		expect(ambiguous).toBe(true);
		expect(matches.map((spec) => spec.name)).toEqual(['Inventory.csv', 'SpecialOrder.csv']);
	});

	it('resolveMatches leaves a single match alone', () => {
		expect(resolveMatches([KEYSTONE_SPECS[0]], 'anything.csv')).toEqual({ matches: [KEYSTONE_SPECS[0]], ambiguous: false });
	});
});

describe('diffSignature', () => {
	it('lists missing and extra columns of the closest row', () => {
		const rows = [['Report', 'Oct'], ['Quadratec PN', 'MPN', 'Description', 'Brand', 'Retail Price', 'Wholesale Price', 'Shipping Surcharge', 'Notes']];
		const diff = diffSignature(rows, GOLD_SHEET);
		expect(diff.missing).toEqual(['UPC Code']);
		expect(diff.extra).toEqual(['Notes']);
		expect(diff.reordered).toBe(false);
	});

	it('flags a reorder with the same column set', () => {
		const diff = diffSignature([[...GOLD_KIT].reverse()], GOLD_KIT);
		expect(diff.missing).toEqual([]);
		expect(diff.extra).toEqual([]);
		expect(diff.reordered).toBe(true);
	});

	it('reports everything missing for an empty file', () => {
		const diff = diffSignature([], GOLD_KIT);
		expect(diff.missing).toEqual(GOLD_KIT);
		expect(diff.extra).toEqual([]);
	});
});

describe('readHeaderRows', () => {
	it('reads the rows of a named sheet', async () => {
		const file = xlsxFile('two-sheets.xlsx', { Cover: [['Hello']], 'Price List': [GOLD_KIT, ['k', 'K', 1, 2, 'B']] });
		expect((await readHeaderRows(file, { sheet: 'Price List' }))[0]).toEqual(GOLD_KIT);
		expect((await readHeaderRows(file))[0]).toEqual(['Hello']);
		expect(await readHeaderRows(file, { sheet: 'Nope' })).toEqual([]);
	});

	it('keeps an empty cell in the middle of a CSV header', async () => {
		const rows = await readHeaderRows(csvFile('x.csv', 'A,,C\n1,2,3\n'));
		expect(normalizeHeader(rows[0])).toEqual(['A', '', 'C']);
	});
});

describe('detectFile', () => {
	it('recognizes the gold sheet and the gold kit whatever their names', async () => {
		const sheet = await detectFile(xlsxFile('gold sheet 10.13.26-1.xlsx', { WholesaleItemPricingSheetGoldR: [GOLD_SHEET, ['p', 'm', 'd', '0', 'b', 1, 2, 'None']] }), quadratecFeed);
		expect(sheet).toMatchObject({ status: 'matched', spec: { name: 'pricingSheet_quad.xlsx', label: 'Quadratec gold sheet' } });

		const kit = await detectFile(xlsxFile('gold kit 10.13.26.xlsx', { WholesaleKitPricingSheetGoldRe: [GOLD_KIT, ['k', 'K', 1, 2, 'B']] }), quadratecFeed);
		expect(kit).toMatchObject({ status: 'matched', spec: { name: 'pricingKit_quad.xlsx' } });
	});

	it('recognizes a CSV bigger than the head slice by reading only its start', async () => {
		const text = csvText(WHOLESALE, 2000, 12);
		expect(text.length).toBeGreaterThan(CSV_HEAD_BYTES);
		const result = await detectFile(csvFile('Quadratec Wholesale Export (1).csv', text), quadratecFeed);
		expect(result).toMatchObject({ status: 'matched', spec: { name: 'quadratec_wholesale.csv' } });
	});

	it('finds a header that is not on the first row', async () => {
		const rows = [['KeyParts'], [], [], [], [], [], GOLD_KIT, ['k', 'K', 1, 2, 'B']];
		const result = await detectFile(xlsxFile('weird.xlsx', { Sheet1: rows }), quadratecFeed);
		expect(result.status).toBe('matched');
		expect(result.spec.name).toBe('pricingKit_quad.xlsx');
	});

	it('rejects a file with other columns and names the closest expected file', async () => {
		const header = ['Name', 'Display Name', 'Retail Price', 'Brand', 'Weight'];
		const result = await detectFile(xlsxFile('something else.xlsx', { Sheet1: [header, ['k', 'K', 1, 'B', 2]] }), quadratecFeed);
		expect(result.status).toBe('rejected');
		expect(result.diff.spec.name).toBe('pricingKit_quad.xlsx');
		expect(result.diff.missing).toEqual(['Wholesale Price']);
		expect(result.diff.extra).toEqual(['Weight']);
		expect(describeRejection(result)).toBe('Closest match is Quadratec gold kit (missing: Wholesale Price; not expected: Weight)');
	});

	it('rejects a reordered sheet even though the columns are all there', async () => {
		const result = await detectFile(xlsxFile('pricingSheet_quad.xlsx', { Sheet1: [[...GOLD_SHEET].reverse()] }), quadratecFeed);
		expect(result.status).toBe('rejected');
		expect(result.diff.reordered).toBe(true);
		expect(describeRejection(result)).toContain('different order');
	});

	it('asks the person to pick when Keystone files cannot be told apart', async () => {
		const result = await detectFile(csvFile('keystone today.csv', csvText(KEYSTONE, 3)), keystoneFeed);
		expect(result.status).toBe('ambiguous');
		expect(result.candidates.map((spec) => spec.name)).toEqual(['Inventory.csv', 'SpecialOrder.csv']);
	});

	it('uses the original name to break the Keystone tie', async () => {
		const result = await detectFile(csvFile('Inventory.csv', csvText(KEYSTONE, 3)), keystoneFeed);
		expect(result).toMatchObject({ status: 'matched', spec: { name: 'Inventory.csv' } });
	});

	it('looks at the named sheet when the spec has one', async () => {
		const feed = { files: ['x.xlsx'], fileSpecs: [{ name: 'x.xlsx', label: 'X', signature: GOLD_KIT, sheet: 'Price List' }] };
		const file = xlsxFile('x.xlsx', { Cover: [['Hello']], 'Price List': [GOLD_KIT] });
		expect((await detectFile(file, feed)).status).toBe('matched');
		const wrongSheet = xlsxFile('x.xlsx', { Cover: [GOLD_KIT], 'Price List': [['Hello']] });
		expect((await detectFile(wrongSheet, feed)).status).toBe('rejected');
	});

	it('rejects a file that is not a spreadsheet', async () => {
		const result = await detectFile(new File(['%PDF-1.4 not a sheet'], 'scan.pdf', { type: 'application/pdf' }), quadratecFeed);
		expect(result.status).toBe('rejected');
	});

	it('falls back to the exact name when the server sends no fileSpecs', async () => {
		const feed = { files: ['pricingKit_quad.xlsx'] };
		expect(await detectFile(new File(['x'], 'pricingKit_quad.xlsx'), feed)).toMatchObject({ status: 'matched', spec: { name: 'pricingKit_quad.xlsx' } });
		expect((await detectFile(new File(['x'], 'gold kit.xlsx'), feed)).status).toBe('rejected');
	});
});
