import { Typography } from 'antd';
import FeedsPanel from './FeedsPanel';
import './feeds.scss';

const { Title, Text } = Typography;

// Vendor feeds page (price and inventory files in the bucket).
// Any logged in user can see the state of the files; only triage users upload a
// new file or run the script (the backend validates it and the panel uses
// canManage from the API to enable the buttons).
const FeedsPage = () => (
	<div className="feeds-page">
		<div className="feeds-page__header">
			<Text type="secondary" className="feeds-page__eyebrow">Pricing Tool / Admin</Text>
			<Title level={3} className="feeds-page__title">Vendor Feeds</Title>
		</div>
		<FeedsPanel />
	</div>
);

export default FeedsPage;
