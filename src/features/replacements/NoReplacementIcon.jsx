import { Tooltip } from 'antd';
import { StopOutlined } from '@ant-design/icons';
import { noReplacementTooltip } from './replacementsUtils';

// Sits where the swap icon would be when the SKU was registered as having no
// replacement. Opens nothing: the explanation is the tooltip (comment plus
// who registered it and when). Focusable so the tooltip also opens by keyboard.
const NoReplacementIcon = ({ marker }) => {
	const [comment, by] = noReplacementTooltip(marker);
	return (
		<Tooltip
			title={(
				<div>
					<div>{comment}</div>
					{by && <div style={{ fontSize: 12, opacity: 0.85 }}>{by}</div>}
				</div>
			)}
		>
			<StopOutlined
				className="replacement-icon replacement-icon--none"
				role="img"
				aria-label={`No replacement registered: ${comment}`}
				tabIndex={0}
			/>
		</Tooltip>
	);
};

export default NoReplacementIcon;
