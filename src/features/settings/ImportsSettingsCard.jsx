import { useEffect, useState } from 'react';
import { Alert, Button, Card, Spin, Table, Tag, Typography } from 'antd';
import { CloudUploadOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { apiErrorMessage } from '../../utils/api';
import { fetchFeeds } from '../feeds/feedsApi';

const { Text, Paragraph } = Typography;

const formatAge = (ageHours) => {
	if (ageHours === null || ageHours === undefined) return 'never';
	if (ageHours < 1) return 'less than 1h ago';
	if (ageHours < 48) return `${Math.round(ageHours)}h ago`;
	return `${Math.round(ageHours / 24)}d ago`;
};

// Seção de configuração das importações (vendor feeds no DO Spaces): estado
// do storage, catálogo dos feeds com frescor e script de consumo, e atalho
// para o painel operacional (/feeds). A configuração em si é por env
// (bucket, crons, FEEDS_TRIAGE_USERS) — aqui ela fica visível num só lugar.
const ImportsSettingsCard = () => {
	const [data, setData] = useState(null);
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(true);

	const load = async () => {
		setLoading(true);
		setError(null);
		try {
			setData(await fetchFeeds());
		} catch (loadError) {
			setError(apiErrorMessage(loadError, 'Failed to load imports configuration'));
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		load();
	}, []);

	if (loading) {
		return (
			<Card title="Imports (vendor feeds)" className="settings-card">
				<div className="settings-card__spin"><Spin /></div>
			</Card>
		);
	}

	if (error) {
		return (
			<Card title="Imports (vendor feeds)" className="settings-card">
				<Alert
					type="error"
					showIcon
					message={error}
					action={<Button size="small" icon={<ReloadOutlined />} onClick={load}>Retry</Button>}
				/>
			</Card>
		);
	}

	const columns = [
		{
			title: 'Feed',
			key: 'feed',
			render: (_, feed) => (
				<span>
					{feed.label || feed.feed}
					{feed.stale && <Tag color="orange" className="settings-imports__tag">Stale</Tag>}
					{feed.running && <Tag color="blue" className="settings-imports__tag">Running</Tag>}
				</span>
			),
		},
		{
			title: 'Files',
			key: 'files',
			width: 80,
			render: (_, feed) => (feed.files ? feed.files.length : 0),
		},
		{
			title: 'Last batch',
			key: 'age',
			width: 150,
			render: (_, feed) => <Text type={feed.stale ? 'warning' : 'secondary'}>{formatAge(feed.ageHours)}</Text>,
		},
		{
			title: 'Consumer script',
			key: 'seed',
			render: (_, feed) => (feed.seedCommand
				? <Text code>{feed.seedCommand}</Text>
				: <Text type="secondary" italic>{feed.seedCommandNote || 'daily sync only'}</Text>),
		},
	];

	return (
		<Card
			title="Imports (vendor feeds)"
			className="settings-card"
			extra={(
				<Link to="/feeds">
					<Button type="primary" icon={<CloudUploadOutlined />}>Open Vendor Feeds panel</Button>
				</Link>
			)}
		>
			<Alert
				type={data.storeConfigured ? 'success' : 'warning'}
				showIcon
				className="settings-imports__storage"
				message={data.storeConfigured
					? 'Storage connected: feed files land in the DigitalOcean Spaces bucket.'
					: 'Storage not configured: set the DO_SPACES_* variables so feed files land in the bucket.'}
			/>

			<Table
				rowKey="feed"
				size="small"
				columns={columns}
				dataSource={data.feeds || []}
				pagination={false}
			/>

			<Paragraph type="secondary" className="settings-imports__note">
				Uploads and the Run now button are restricted to the feeds triage users
				(FEEDS_TRIAGE_USERS){data.canManage ? ' and your user is one of them.' : '; your user is read only.'}
				{' '}Fetch schedules and freshness thresholds are environment settings (see .env.example).
			</Paragraph>
		</Card>
	);
};

export default ImportsSettingsCard;
