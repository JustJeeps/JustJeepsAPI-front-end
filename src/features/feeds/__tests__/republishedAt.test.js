import { describe, it, expect } from 'vitest';
import { republishedAt } from '../republishedAt';

const batch = { dataAsOf: '2026-10-31T08:42:00.000Z' };

describe('republishedAt', () => {
	it('returns the confirmation when the vendor re-published the same file later', () => {
		expect(republishedAt({ currentBatch: batch, confirmedAt: '2026-11-02T09:41:00.000Z' }))
			.toBe('2026-11-02T09:41:00.000Z');
	});

	it('returns null when the confirmation carries the same date as the data', () => {
		// The vendor left the old file on the server: nothing was re-published.
		expect(republishedAt({ currentBatch: batch, confirmedAt: batch.dataAsOf })).toBeNull();
	});

	it('returns null without a confirmation or a batch', () => {
		expect(republishedAt({ currentBatch: batch, confirmedAt: null })).toBeNull();
		expect(republishedAt({ currentBatch: batch })).toBeNull();
		expect(republishedAt({ currentBatch: null, confirmedAt: '2026-11-02T09:41:00.000Z' })).toBeNull();
	});
});
