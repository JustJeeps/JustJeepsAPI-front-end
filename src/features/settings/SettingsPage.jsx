import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Result, Space, Spin, Tabs, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiErrorMessage } from '../../utils/api';
import { fetchRequestsMetaCached } from '../requests/requestsApi';
import { fetchTrelloSettings } from './settingsApi';
import TrelloCredentialsCard from './TrelloCredentialsCard';
import SectorsPanel from './SectorsPanel';
import FeedsPanel from '../feeds/FeedsPanel';
import '../feeds/feeds.scss';
import './settings.scss';

const { Title, Text } = Typography;

// Hub único de configurações (engrenagem do navbar), em seções:
//   Trello  — credencial global (só triage de requests; o back valida de
//             verdade, aqui o gate é cosmético)
//   Sectors — boards por setor: membros + board/lista do Trello por setor
//             (triage ou admins de setor; o mapeamento usuário→board antigo
//             foi aposentado — o card segue o SETOR do chamado)
//   Imports — painel completo dos vendor feeds (leitura para todos; upload e
//             Run now dependem de FEEDS_TRIAGE_USERS, validado no back)
// Deep link por aba: /settings?tab=imports | ?tab=sectors
const SettingsPage = () => {
	const { user } = useAuth();
	const [searchParams] = useSearchParams();
	const [meta, setMeta] = useState(null);
	const [settings, setSettings] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const normalizedUsername = (user?.username || '').toLowerCase();
	const isTriage = Boolean(meta?.triageUsers?.includes(normalizedUsername));
	const adminSectorIds = meta?.myRoles?.adminSectorIds || [];
	const isSectorAdminAnywhere = adminSectorIds.length > 0;

	const loadAll = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const metaData = await fetchRequestsMetaCached(normalizedUsername);
			setMeta(metaData);
			const allowed = metaData?.triageUsers?.includes((user?.username || '').toLowerCase());
			if (allowed) {
				setSettings(await fetchTrelloSettings());
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
		</Space>
	) : (
		<Result
			status="warning"
			title="Restricted"
			subTitle="Trello configuration is available to triage users only."
		/>
	);

	const sectorsTab = (isTriage || isSectorAdminAnywhere) ? (
		<SectorsPanel isTriage={isTriage} adminSectorIds={adminSectorIds} />
	) : (
		<Result
			status="warning"
			title="Restricted"
			subTitle="Sector management is available to sector admins and triage users."
		/>
	);

	const requestedTab = searchParams.get('tab');
	const defaultTab = ['imports', 'sectors', 'trello'].includes(requestedTab) ? requestedTab : 'trello';

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
				defaultActiveKey={defaultTab}
				items={[
					{ key: 'trello', label: 'Trello', children: trelloTab },
					{ key: 'sectors', label: 'Sectors', children: sectorsTab },
					{ key: 'imports', label: 'Imports', children: <FeedsPanel /> },
				]}
			/>
		</div>
	);
};

export default SettingsPage;
