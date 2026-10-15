// Recognizes a vendor file by its columns, not by its name.
//
// Vendors send files under whatever name their export gives them ("gold kit
// 10.13.26.xlsx"), and the person used to rename each one by hand to the
// canonical name the seeds expect. Now the browser reads the header row and
// matches it against the signatures the API publishes for each feed
// (GET /api/ingest/feeds -> feed.fileSpecs). The upload then goes out under the
// canonical name. The server runs the same check on the stored object, so this
// is a convenience and an early warning, not the authority.
//
// The match is exact and ORDERED: several seeds read columns by position, so a
// reordered sheet must be refused here, not imported.
//
// The normalization has to stay identical to lib/feeds/fileSignature.js on the
// back end: String(cell), trim, every whitespace run (newlines included) becomes
// one space, leading and trailing empty cells are dropped, empty cells in the
// middle are kept, case is kept.
import * as XLSX from 'xlsx';

// Rows scanned for the header. Some headers are not on row 1 (KeyParts on row 7,
// WARN on row 4).
export const HEADER_SCAN_ROWS = 20;

// Only the start of a CSV is read: the Keystone one is ~460MB.
export const CSV_HEAD_BYTES = 64 * 1024;

const cellText = (cell) => (cell === null || cell === undefined ? '' : String(cell))
	.trim()
	.replace(/\s+/g, ' ');

export const normalizeHeader = (cells) => {
	const texts = Array.from(cells || [], cellText);
	let start = 0;
	while (start < texts.length && texts[start] === '') start += 1;
	let end = texts.length;
	while (end > start && texts[end - 1] === '') end -= 1;
	return texts.slice(start, end);
};

const sameHeader = (found, expected) => found.length === expected.length
	&& found.every((cell, index) => cell === expected[index]);

// Index of the first row (within the first scanRows) whose columns are exactly
// the signature, or -1.
export const findHeaderRow = (rows, signature, scanRows = HEADER_SCAN_ROWS) => {
	const expected = normalizeHeader(signature);
	if (expected.length === 0) return -1;
	const limit = Math.min(rows?.length || 0, scanRows);
	for (let index = 0; index < limit; index += 1) {
		if (sameHeader(normalizeHeader(rows[index]), expected)) return index;
	}
	return -1;
};

// Tie-break for a header shared by more than one file of the same feed
// (Keystone's Inventory.csv and SpecialOrder.csv are identical): the original
// name decides when it equals one of the canonical names; otherwise the person
// has to pick.
export const resolveMatches = (matches, originalName) => {
	if (matches.length <= 1) return { matches, ambiguous: false };
	const wanted = String(originalName || '').trim().toLowerCase();
	const byName = matches.filter((spec) => String(spec.name).toLowerCase() === wanted);
	if (byName.length === 1) return { matches: byName, ambiguous: false };
	return { matches, ambiguous: true };
};

export const classifyRows = (rows, fileSpecs, originalName) => resolveMatches(
	(fileSpecs || []).filter((spec) => findHeaderRow(rows, spec.signature) >= 0),
	originalName,
);

// What differs between the scanned rows and an expected signature, using the
// scanned row that shares the most columns with it. Same column set but a
// different order comes back with both lists empty and reordered: true.
export const diffSignature = (rows, expected, scanRows = HEADER_SCAN_ROWS) => {
	const want = normalizeHeader(expected);
	let best = [];
	let bestOverlap = -1;
	const limit = Math.min(rows?.length || 0, scanRows);
	for (let index = 0; index < limit; index += 1) {
		const found = normalizeHeader(rows[index]);
		const overlap = found.filter((cell) => cell !== '' && want.includes(cell)).length;
		if (overlap > bestOverlap) {
			best = found;
			bestOverlap = overlap;
		}
	}
	const missing = want.filter((cell) => cell !== '' && !best.includes(cell));
	const extra = best.filter((cell) => cell !== '' && !want.includes(cell));
	return {
		missing,
		extra,
		found: best,
		reordered: missing.length === 0 && extra.length === 0 && !sameHeader(best, want),
	};
};

const isCsv = (file) => /\.csv$/i.test(file.name || '') || file.type === 'text/csv';

// Reads only the head of the file into a workbook limited to the scan rows.
// A CSV is sliced before being parsed, and the possibly cut last line is
// dropped; a spreadsheet has to be read whole (zip), but the feeds' xlsx files
// are a few MB and sheetRows keeps the parse short.
const readHeadWorkbook = async (file) => {
	if (isCsv(file)) {
		let text = await file.slice(0, CSV_HEAD_BYTES).text();
		if (file.size > CSV_HEAD_BYTES) {
			const lastBreak = text.lastIndexOf('\n');
			if (lastBreak >= 0) text = text.slice(0, lastBreak);
		}
		return XLSX.read(text, { type: 'string', sheetRows: HEADER_SCAN_ROWS, raw: true });
	}
	const buffer = await file.arrayBuffer();
	return XLSX.read(buffer, { type: 'array', sheetRows: HEADER_SCAN_ROWS });
};

const headerRowsOf = (workbook, sheet) => {
	const name = sheet || workbook.SheetNames[0];
	const worksheet = name ? workbook.Sheets[name] : null;
	if (!worksheet) return [];
	return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', blankrows: true })
		.slice(0, HEADER_SCAN_ROWS);
};

// First rows of the file (of the given sheet, or the first one) as arrays of
// cells, for the classifiers above.
export const readHeaderRows = async (file, { sheet } = {}) => headerRowsOf(await readHeadWorkbook(file), sheet);

const closestSpec = (rowsFor, fileSpecs) => {
	let closest = null;
	for (const spec of fileSpecs) {
		const diff = diffSignature(rowsFor(spec.sheet), spec.signature);
		const distance = diff.missing.length + diff.extra.length;
		if (!closest || distance < closest.distance) closest = { spec, diff, distance };
	}
	return closest;
};

// detectFile(file, feed) -> { status: 'matched' | 'ambiguous' | 'rejected', ... }
//   matched:   { spec }
//   ambiguous: { candidates }   several specs of the feed match, the person picks
//   rejected:  { reason, diff? } diff = { spec, missing, extra, reordered } of the closest spec
// A feed without fileSpecs (older server) keeps the exact-name rule.
export const detectFile = async (file, feed) => {
	const fileSpecs = feed?.fileSpecs;
	if (!Array.isArray(fileSpecs) || fileSpecs.length === 0) {
		const names = feed?.files || [];
		if (names.includes(file.name)) return { status: 'matched', spec: { name: file.name, label: file.name } };
		return { status: 'rejected', reason: `${file.name} is not a file this feed expects` };
	}

	let workbook;
	try {
		workbook = await readHeadWorkbook(file);
	} catch (error) {
		return { status: 'rejected', reason: `${file.name} could not be read as a spreadsheet or CSV (${error?.message || 'unknown error'})` };
	}

	const rowsBySheet = new Map();
	const rowsFor = (sheet) => {
		const key = sheet || '';
		if (!rowsBySheet.has(key)) rowsBySheet.set(key, headerRowsOf(workbook, sheet));
		return rowsBySheet.get(key);
	};

	const matching = fileSpecs.filter((spec) => findHeaderRow(rowsFor(spec.sheet), spec.signature) >= 0);
	const { matches, ambiguous } = resolveMatches(matching, file.name);
	if (matches.length === 1) return { status: 'matched', spec: matches[0] };
	if (ambiguous) return { status: 'ambiguous', candidates: matches };

	const closest = closestSpec(rowsFor, fileSpecs);
	const diff = closest ? { spec: closest.spec, ...closest.diff } : null;
	return {
		status: 'rejected',
		reason: `${file.name} does not have the columns of any file of this feed`,
		diff,
	};
};

// Text for a rejected file: the closest expected file and what is off.
export const describeRejection = (detection) => {
	if (!detection || detection.status !== 'rejected') return '';
	const { diff } = detection;
	if (!diff) return detection.reason;
	const parts = [];
	if (diff.reordered) parts.push('same columns but in a different order');
	if (diff.missing.length > 0) parts.push(`missing: ${diff.missing.join(', ')}`);
	if (diff.extra.length > 0) parts.push(`not expected: ${diff.extra.join(', ')}`);
	const detail = parts.length > 0 ? ` (${parts.join('; ')})` : '';
	return `Closest match is ${diff.spec.label}${detail}`;
};
