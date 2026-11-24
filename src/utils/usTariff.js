// "Potential US Tariff" flag shown next to SKUs on the Orders and Items pages.
// Informational only: it must never change pricing or cost calculations.
export const US_TARIFF_PART_LABEL = 'Suspension - Springs';

export const US_TARIFF_BADGE_LABEL = 'Potential US Tariff';

export const US_TARIFF_TOOLTIP =
	'A 50% tariff may apply if this product is imported from the US.';

// The product `part` field arrives as a comma-separated list of Magento part
// labels (e.g. "Suspension - Springs, Suspension - Lift Kits").
export const isPotentialUsTariffPart = (part) => {
	if (!part) return false;
	return String(part)
		.split(',')
		.some((token) => token.trim().toLowerCase() === US_TARIFF_PART_LABEL.toLowerCase());
};
