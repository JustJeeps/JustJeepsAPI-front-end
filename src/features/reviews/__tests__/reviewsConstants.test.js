import { describe, it, expect } from 'vitest';
import {
	ROW_STATUS_META,
	validateUploadFile,
	summarizeFileCounts,
	pollDelayFor,
	formatBytes,
	formatErrorReport,
} from '../reviewsConstants';

const META = { allowedExtensions: ['.xlsx', '.csv'], maxUploadBytes: 10 * 1024 * 1024 };

describe('validateUploadFile', () => {
	it('aceita .xlsx e .csv dentro do limite', () => {
		expect(validateUploadFile({ name: 'reviews.XLSX', size: 1000 }, META).ok).toBe(true);
		expect(validateUploadFile({ name: 'a.csv', size: 1000 }, META).ok).toBe(true);
	});

	it('rejeita extensao errada e arquivo grande com mensagem legivel', () => {
		expect(validateUploadFile({ name: 'a.pdf', size: 10 }, META).ok).toBe(false);
		const big = validateUploadFile({ name: 'a.xlsx', size: 11 * 1024 * 1024 }, META);
		expect(big.ok).toBe(false);
		expect(big.error).toMatch(/10MB/);
	});

	it('meta ausente usa defaults sem estourar', () => {
		expect(validateUploadFile({ name: 'a.csv', size: 10 }, null).ok).toBe(true);
	});
});

describe('summarizeFileCounts', () => {
	it('canSync quando ready com pendencias (pending ou sending presas)', () => {
		expect(summarizeFileCounts({ status: 'ready', counts: { pending: 5, sending: 0, synced: 0, failed: 0 } }).canSync).toBe(true);
		expect(summarizeFileCounts({ status: 'ready', counts: { pending: 0, sending: 2, synced: 1, failed: 0 } }).canSync).toBe(true);
		expect(summarizeFileCounts({ status: 'importing', counts: { pending: 5 } }).canSync).toBe(false);
		expect(summarizeFileCounts({ status: 'ready', counts: { pending: 0, sending: 0, synced: 3, failed: 0 } }).canSync).toBe(false);
	});

	it('done/hasFailures/hasStuckSending refletem os contadores', () => {
		const done = summarizeFileCounts({ status: 'ready', counts: { pending: 0, sending: 0, synced: 3, failed: 0 } });
		expect(done.done).toBe(true);
		const failed = summarizeFileCounts({ status: 'ready', counts: { pending: 0, sending: 1, synced: 1, failed: 2 } });
		expect(failed.hasFailures).toBe(true);
		expect(failed.hasStuckSending).toBe(true);
		expect(failed.done).toBe(false);
	});
});

describe('pollDelayFor / status meta / formatBytes', () => {
	it('poll de 5s so enquanto roda', () => {
		expect(pollDelayFor(true)).toBe(5000);
		expect(pollDelayFor(false)).toBe(null);
	});

	it('todos os status de linha tem cor e label', () => {
		for (const status of ['pending', 'sending', 'synced', 'failed']) {
			expect(ROW_STATUS_META[status].label).toBeTruthy();
		}
	});

	it('formatBytes legivel', () => {
		expect(formatBytes(1394986)).toBe('1.3MB');
		expect(formatBytes(2048)).toBe('2KB');
	});
});

describe('formatErrorReport', () => {
	it('monta o relatorio com failed e invalidas, uma linha por erro', () => {
		const report = formatErrorReport({
			fileName: 'reviews.xlsx',
			failed: [{ rowNumber: 9071, sku: 'BAR-J103215', nickname: 'TylerH', error: 'PRODUCT_NOT_FOUND (sku does not exist in Magento)' }],
			invalidSample: [{ rowNumber: 7932, error: 'invalid text (detail)' }],
			invalidRowCount: 1,
		});
		expect(report).toContain('Review import errors - reviews.xlsx');
		expect(report).toContain('Failed rows (1):');
		expect(report).toContain('row 9071 | BAR-J103215 | TylerH | PRODUCT_NOT_FOUND');
		expect(report).toContain('Invalid rows skipped at parse (1):');
		expect(report).toContain('row 7932 | invalid text (detail)');
	});

	it('indica quando a amostra de invalidas esta truncada', () => {
		const report = formatErrorReport({
			fileName: 'a.csv',
			failed: [],
			invalidSample: [{ rowNumber: 1, error: 'x' }],
			invalidRowCount: 250,
		});
		expect(report).toContain('(showing first 1 of 250)');
	});

	it('sem erros nao estoura', () => {
		expect(formatErrorReport({ fileName: 'a.csv', failed: [], invalidSample: [] })).toContain('No errors.');
		expect(formatErrorReport(null)).toContain('unknown file');
	});
});
