import { describe, it, expect } from 'vitest';
import { describeStatusDivergence } from '../statusDivergence';

// Warning next to the order number when our ship status and Magento's status
// disagree (asked 2026-09-16). The API sends `status_divergence` as
// { magento_status, ship_status } or null; the front only writes the text.

describe('describeStatusDivergence', () => {
	it('returns null when the API sent nothing or null (older API, or sides agree)', () => {
		expect(describeStatusDivergence({})).toBeNull();
		expect(describeStatusDivergence({ status_divergence: null })).toBeNull();
	});

	it('explains the drop-ship case: Magento still processing, we already shipped', () => {
		const text = describeStatusDivergence({ status_divergence: { magento_status: 'processing', ship_status: 'Shipping - Drop Shipped' } });
		expect(text).toBe([
			'Status mismatch',
			'Magento: processing',
			'Pricing Tool: Shipping - Drop Shipped',
			'Finished in the Pricing Tool, but still open in Magento.',
		].join('\n'));
	});

	it('explains the opposite case: Magento closed, we still show it in progress', () => {
		const text = describeStatusDivergence({ status_divergence: { magento_status: 'Complete', ship_status: 'Shipping - Ready To Ship' } });
		expect(text).toBe([
			'Status mismatch',
			'Magento: Complete',
			'Pricing Tool: Shipping - Ready To Ship',
			'Closed in Magento, but still in progress in the Pricing Tool.',
		].join('\n'));
	});

	it('shows (none) when Magento sent no status', () => {
		const text = describeStatusDivergence({ status_divergence: { magento_status: null, ship_status: 'Shipping - Shipped' } });
		expect(text).toContain('Magento: (none)');
		expect(text).toContain('Finished in the Pricing Tool, but still open in Magento.');
	});
});
