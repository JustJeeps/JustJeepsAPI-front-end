import { Badge, Tooltip } from 'antd';
import { SwapOutlined } from '@ant-design/icons';

// Sits next to the magnifier on the expanded order row. Rendered only when
// the SKU has at least one active replacement (no icon = nothing registered),
// with the count as a badge. Smaller than the 50px magnifier on purpose.
const ReplacementIcon = ({ count, onClick }) => {
	if (!count) return null;
	const label = `Replacement options (${count})`;
	return (
		<Tooltip title={label}>
			<Badge count={count} size="small" offset={[2, 2]}>
				<SwapOutlined
					className="replacement-icon"
					role="button"
					aria-label={label}
					tabIndex={0}
					onClick={onClick}
					onKeyDown={(event) => {
						if (event.key === 'Enter' || event.key === ' ') {
							event.preventDefault();
							onClick?.();
						}
					}}
				/>
			</Badge>
		</Tooltip>
	);
};

export default ReplacementIcon;
