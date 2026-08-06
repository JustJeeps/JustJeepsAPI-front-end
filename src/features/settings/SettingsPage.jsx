import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Result, Space, Spin, Tabs, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { apiErrorMessage } from '../../utils/api';
import { fetchRequestsMetaCached } from '../requests/requestsApi';
import { fetchTrelloSettings, fetchTrelloUserBoards, fetchUsersLite } from './settingsApi';
import TrelloCredentialsCard from './TrelloCredentialsCard';
import TrelloUserBoardsTable from './TrelloUserBoardsTable';
import ImportsSettingsCard from './ImportsSettingsCard';
import './settings.scss';

const { Title, Text } = Typography;

// Painel de configuração (engrenagem do navbar). Hoje só integração Trello:
// credencial global + board por usuário. Gate client-side por meta.triageUsers
// — cosmético; o back valida de verdade em todas as rotas (409 TRIAGE_ONLY).
const SettingsPage = () => {
	const { user } = useAuth();
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
			const metaData = await fetchRequestsMetaCached();
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
	}, [user]);

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

	if (!isTriage) {
		return (
			<div className="settings-page">
				<Result
					status="warning"
					title="Restricted"
					subTitle="Settings are available to triage users only."
				/>
			</div>
		);
	}

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
				defaultActiveKey="trello"
				items={[
					{
						key: 'trello',
						label: 'Trello',
						children: (
							<Space direction="vertical" size={16} className="settings-page__stack">
								<TrelloCredentialsCard settings={settings} onSaved={setSettings} />
								<TrelloUserBoardsTable
									configured={Boolean(settings?.configured)}
									users={users}
									userBoards={userBoards}
									onChanged={refreshUserBoards}
								/>
							</Space>
						),
					},
					{
						key: 'imports',
						label: 'Imports',
						children: <ImportsSettingsCard />,
					},
				]}
			/>
		</div>
	);
};

export default SettingsPage;
