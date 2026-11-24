import { Tag, Tooltip } from 'antd';
import {
	US_TARIFF_BADGE_LABEL,
	US_TARIFF_TOOLTIP,
	isPotentialUsTariffPart,
} from '../utils/usTariff';

// Orange informational badge rendered next to a SKU when the product's `part`
// field matches the tariff-sensitive part label. Renders nothing otherwise.
const UsTariffBadge = ({ part, style }) => {
	if (!isPotentialUsTariffPart(part)) return null;

	return (
		<Tooltip title={US_TARIFF_TOOLTIP}>
			<Tag color="orange" style={{ margin: 0, ...style }}>
				{US_TARIFF_BADGE_LABEL}
			</Tag>
		</Tooltip>
	);
};

export default UsTariffBadge;
