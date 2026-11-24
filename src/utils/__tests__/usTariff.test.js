import { describe, it, expect } from 'vitest';
import { US_TARIFF_PART_LABEL, isPotentialUsTariffPart } from '../usTariff';

// The "Potential US Tariff" badge must appear exactly when the product's
// `part` label list contains "Suspension - Springs", and it is informational
// only — no pricing logic imports this module.

describe('isPotentialUsTariffPart', () => {
	it('matches the exact tariff-sensitive part label', () => {
		expect(isPotentialUsTariffPart('Suspension - Springs')).toBe(true);
		expect(isPotentialUsTariffPart(US_TARIFF_PART_LABEL)).toBe(true);
	});

	it('matches inside a comma-separated label list', () => {
		expect(isPotentialUsTariffPart('Suspension - Lift Kits, Suspension - Springs')).toBe(true);
		expect(isPotentialUsTariffPart('Suspension - Springs, Exterior - Bumpers')).toBe(true);
	});

	it('ignores case and surrounding whitespace', () => {
		expect(isPotentialUsTariffPart('  suspension - springs  ')).toBe(true);
		expect(isPotentialUsTariffPart('SUSPENSION - SPRINGS')).toBe(true);
	});

	it('does not match other parts, partial labels, or empty values', () => {
		expect(isPotentialUsTariffPart('Suspension - Lift Kits')).toBe(false);
		expect(isPotentialUsTariffPart('Springs')).toBe(false);
		expect(isPotentialUsTariffPart('Suspension')).toBe(false);
		expect(isPotentialUsTariffPart('')).toBe(false);
		expect(isPotentialUsTariffPart(null)).toBe(false);
		expect(isPotentialUsTariffPart(undefined)).toBe(false);
	});
});
