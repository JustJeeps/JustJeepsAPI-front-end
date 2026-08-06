import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Result, Space, Spin, Tabs, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiErrorMessage } from '../../utils/api';
import { fetchRequestsMetaCached } from '../requests/requestsApi';
import { fetchTrelloSettings, fetchTrelloUserBoards, fetchUsersLite } from './settingsApi';
import TrelloCredentialsCard from './TrelloCredentialsCard';
import TrelloUserBoardsTable from './TrelloUserBoardsTable';
import FeedsPanel from '../feeds/FeedsPanel';
import '../feeds/feeds.scss';
import './settings.scss';

const { Title, Text } = Typography;

// Hub único de configurações (engrenagem do navbar), em seções:
//   Trello  — credencial global + board por usuário (só triage de requests;
//             o back valida de verdade, aqui o gate é cosmético)
//   Imports — painel completo dos vendor feeds (leitura para todos; upload e
//             Run now dependem de FEEDS_TRIAGE_USERS, validado no back)
// Deep link por aba: /settings?tab=imports
const SettingsPage = () => {
	const { user } = useAuth();
	const [searchParams] = useSearchParams();
	const [meta, setMeta] = useState(null);
	const [settings, setSettings] = useState(null);
	const [users, setUsers] = useState([]);
	const [userBoards, setUserBoards] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const normalizedUsername = (user?.username || '').toLowerCase();
	const isTriage = Boolean(meta?.triageUsers?.includes(normalizedUsername));

	const loadAll = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const metaData = await fetchRequestsMetaCached(normalizedUsername);
			setMeta(metaData);
			const allowed = metaData?.triageUsers?.includes((user?.username || '').toLowerCase());
			if (allowed) {
				const [settingsData, usersData, userBoardsData] = await Promise.all([
					fetchTrelloSettings(),
					fetchUsersLite(),
					fetchTrelloUserBoards(),
				]);
				setSettings(settingsData);
				setUsers(usersData);
				setUserBoards(userBoardsData);
			}
		} catch (loadError) {
			setError(apiErrorMessage(loadError, 'Failed to load settings'));
		} finally {
			setLoading(false);
		}
	}, [user, normalizedUsername]);

	useEffect(() => {
		loadAll();
	}, [loadAll]);

	const refreshUserBoards = useCallback(async () => {
		setUserBoards(await fetchTrelloUserBoards());
	}, []);

	if (loading) {
		return (
			<div className="settings-page settings-page--loading">
				<Spin size="large" />
			</div>
		);
	}

	const trelloTab = isTriage ? (
		<Space direction="vertical" size={16} className="settings-page__stack">
			<TrelloCredentialsCard settings={settings} onSaved={setSettings} />
			<TrelloUserBoardsTable
				configured={Boolean(settings?.configured)}
				users={users}
				userBoards={userBoards}
				onChanged={refreshUserBoards}
			/>
		</Space>
	) : (
		<Result
			status="warning"
			title="Restricted"
			subTitle="Trello configuration is available to triage users only."
		/>
	);

	return (
		<div className="settings-page">
			<div className="settings-page__header">
				<div>
					<Text type="secondary" className="settings-page__eyebrow">Pricing Tool / Admin</Text>
					<Title level={3} className="settings-page__title">Settings</Title>
				</div>
				<Button icon={<ReloadOutlined />} onClick={loadAll}>Refresh</Button>
			</div>

			{error && <Alert type="error" showIcon message={error} className="settings-page__error" />}

			<Tabs
				defaultActiveKey={searchParams.get('tab') === 'imports' ? 'imports' : 'trello'}
				items={[
					{ key: 'trello', label: 'Trello', children: trelloTab },
					{ key: 'imports', label: 'Imports', children: <FeedsPanel /> },
				]}
			/>
		</div>
	);
};

export default SettingsPage;
