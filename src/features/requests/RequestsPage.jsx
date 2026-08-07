import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Result, Segmented, Space, Spin, Tabs, Typography, message } from 'antd';
import { AppstoreOutlined, BarsOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiErrorMessage } from '../../utils/api';
import {
	deleteRequest,
	fetchDeletedRequests,
	fetchRequests,
	fetchRequestsMeta,
	fetchUsers,
	restoreRequest,
	updateRequest,
} from './requestsApi';
import { canManageRequest, matchesLifecycle, requestRef } from './requestsConstants';
import RequestsFilterBar, { EMPTY_FILTERS, matchesFilters } from './RequestsFilterBar';
import RequestsList from './RequestsList';
import RequestsBoard from './RequestsBoard';
import RequestsKpiCards from './RequestsKpiCards';
import RequestsViewChips, { matchesView } from './RequestsViewChips';
import { WorkflowTab, GuidelinesTab } from './RequestsInfoTabs';
import RequestDetailDrawer from './RequestDetailDrawer';
import NewRequestModal from './NewRequestModal';
import './requests.scss';

const { Title, Text } = Typography;

// Página principal de Requests: orquestra dados (lista, usuários, meta) e
// estado de UI (abas, modo lista/board, filtros, view, drawer, modal).
// Filtros/busca/KPIs são client-side — a API devolve a lista completa.
const RequestsPage = () => {
	const { user } = useAuth();
	const [searchParams, setSearchParams] = useSearchParams();

	const [requests, setRequests] = useState([]);
	const [users, setUsers] = useState([]);
	const [meta, setMeta] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [tab, setTab] = useState('requests');
	const [mode, setMode] = useState('list');
	const [filters, setFilters] = useState(EMPTY_FILTERS);
	const [view, setView] = useState(null); // mine | unassigned | open | aging | archived
	const [statusFilter, setStatusFilter] = useState(null); // vindo dos KPIs
	const [selectedId, setSelectedId] = useState(null);
	const [newOpen, setNewOpen] = useState(false);
	// Lixeira: lista separada, carregada sob demanda (só triage enxerga).
	const [deletedRequests, setDeletedRequests] = useState([]);

	const normalizedUsername = (user?.username || '').toLowerCase();
	const isTriage = Boolean(meta?.triageUsers?.includes(normalizedUsername));

	const loadRequests = useCallback(async () => {
		try {
			setRequests(await fetchRequests());
			setError(null);
		} catch (loadError) {
			setError(apiErrorMessage(loadError, 'Failed to load requests'));
		}
	}, []);

	useEffect(() => {
		const loadAll = async () => {
			setLoading(true);
			try {
				// Meta primeiro: se o rollout gate não liberou o usuário, nem
				// tenta as rotas gated (409) — a página mostra o aviso amigável.
				const metaData = await fetchRequestsMeta();
				setMeta(metaData);
				if (metaData?.requestsEnabled) {
					const [requestsData, usersData] = await Promise.all([
						fetchRequests(),
						fetchUsers(),
					]);
					setRequests(requestsData);
					setUsers(usersData);
				}
				setError(null);
			} catch (loadError) {
				setError(apiErrorMessage(loadError, 'Failed to load requests'));
			} finally {
				setLoading(false);
			}
		};
		loadAll();
	}, []);

	// Deep-link (?open=<id>) usado pelo e-mail de atribuição.
	useEffect(() => {
		const openParam = Number(searchParams.get('open'));
		if (Number.isInteger(openParam) && openParam > 0) {
			setSelectedId(openParam);
			setSearchParams({}, { replace: true });
		}
	}, [searchParams, setSearchParams]);

	const visibleRequests = useMemo(
		() => (view === 'deleted' ? deletedRequests : requests).filter(
			(request) =>
				matchesLifecycle(request, view) &&
				matchesFilters(request, filters) &&
				matchesView(request, view, user?.id) &&
				(!statusFilter || request.status === statusFilter)
		),
		[requests, deletedRequests, filters, view, statusFilter, user]
	);

	const activeRequests = useMemo(
		() => requests.filter((request) => !request.archivedAt),
		[requests]
	);

	// PATCH inline (assignee/priority/status). O back é a fonte de verdade:
	// violação de regra volta como 409 e vira toast, nunca logout.
	const handleInlinePatch = useCallback(async (id, patch, successText) => {
		try {
			await updateRequest(id, patch);
			if (successText) message.success(successText);
			await loadRequests();
		} catch (patchError) {
			message.error(apiErrorMessage(patchError, 'Update failed'));
		}
	}, [loadRequests]);

	// Archive all da lane Done: PATCH archived em cada card (ficam salvos,
	// visíveis na view "Archived").
	const handleArchiveDone = useCallback(async (cards) => {
		try {
			await Promise.all(cards.map((card) => updateRequest(card.id, { archived: true })));
			message.success(`${cards.length} request${cards.length > 1 ? 's' : ''} archived`);
			await loadRequests();
		} catch (archiveError) {
			message.error(apiErrorMessage(archiveError, 'Failed to archive'));
			await loadRequests();
		}
	}, [loadRequests]);

	// Uma função só desce para lista/board/drawer decidirem o que mostrar —
	// evita espalhar isTriage + currentUser por três níveis de props.
	const canManage = useCallback(
		(request) => canManageRequest(request, user, isTriage),
		[user, isTriage]
	);

	// Um handler para as quatro ações de ciclo de vida do chamado.
	const handleRequestAction = useCallback(async (request, action) => {
		try {
			if (action === 'delete') {
				await deleteRequest(request.id);
				message.success(`${requestRef(request.id)} deleted`);
			} else if (action === 'restore') {
				await restoreRequest(request.id);
				message.success(`${requestRef(request.id)} restored`);
			} else {
				const archived = action === 'archive';
				await updateRequest(request.id, { archived });
				message.success(archived
					? `${requestRef(request.id)} archived — find it under the Archived view`
					: `${requestRef(request.id)} unarchived`);
			}
			setSelectedId(null);
			await loadRequests();
		} catch (actionError) {
			message.error(apiErrorMessage(actionError, 'Action failed'));
		}
	}, [loadRequests]);

	// A view "Deleted" vem de outra rota; as demais filtram a lista já carregada.
	useEffect(() => {
		if (view !== 'deleted') return;
		fetchDeletedRequests()
			.then(setDeletedRequests)
			.catch((loadError) => message.error(apiErrorMessage(loadError, 'Failed to load deleted requests')));
	}, [view, requests]);

	// Opening the trash keeps whatever filters were set for the active board, and
	// those filters were chosen for a different set of requests: the usual result
	// is an empty trash that looks broken. Say what is happening instead.
	const hiddenByFilters = view === 'deleted' && deletedRequests.length > 0 && visibleRequests.length === 0;
	const emptyListText = view === 'deleted'
		? (hiddenByFilters
			? `${deletedRequests.length} deleted request${deletedRequests.length === 1 ? '' : 's'} hidden by the filters above. Clear them to see the trash.`
			: 'Nothing deleted')
		: view === 'archived'
			? 'Nothing archived'
			: 'No requests match these filters';

	const toggleView = (nextView) => setView((current) => (current === nextView ? null : nextView));
	const toggleStatusFilter = (nextStatus) =>
		setStatusFilter((current) => (current === nextStatus ? null : nextStatus));

	if (loading) {
		return (
			<div className="requests-page requests-page--loading">
				<Spin size="large" />
			</div>
		);
	}

	// Rollout gate: acesso direto pela URL sem liberação cai aqui (defensivo —
	// o back bloqueia todas as rotas com 409 REQUESTS_RESTRICTED).
	if (meta && !meta.requestsEnabled) {
		return (
			<div className="requests-page">
				<Result
					status="warning"
					title="Not available yet"
					subTitle="The requests feature is being tested with a small group and will be released to everyone soon."
				/>
			</div>
		);
	}

	const requestsTabContent = (
		<>
			<RequestsKpiCards
				requests={activeRequests}
				activeView={view}
				activeStatus={statusFilter}
				onToggleView={toggleView}
				onToggleStatus={toggleStatusFilter}
			/>

			<RequestsFilterBar
				filters={filters}
				onChange={setFilters}
				users={users}
				resultLabel={view === 'deleted'
					? `${visibleRequests.length} deleted request${visibleRequests.length === 1 ? '' : 's'}`
					: `${visibleRequests.length} of ${activeRequests.length} requests`}
			/>

			<div className="requests-page__views-row">
				<RequestsViewChips activeView={view} onToggle={toggleView} isTriage={isTriage} />
				{statusFilter && (
					<Text type="secondary" className="requests-page__status-filter">
						Filtering by status: {statusFilter} (click the card again to clear)
					</Text>
				)}
			</div>

			{mode === 'list' ? (
				<RequestsList
					requests={visibleRequests}
					groupBy={filters.groupBy}
					users={users}
					emptyText={emptyListText}
					canManage={canManage}
					isTriage={isTriage}
					onOpen={setSelectedId}
					onInlinePatch={handleInlinePatch}
					onRequestAction={handleRequestAction}
				/>
			) : (
				<RequestsBoard
					requests={visibleRequests}
					readOnly={view === 'deleted'}
					emptyText={emptyListText}
					canManage={canManage}
					isTriage={isTriage}
					onOpen={setSelectedId}
					onInlinePatch={handleInlinePatch}
					onArchiveDone={handleArchiveDone}
					onRequestAction={handleRequestAction}
				/>
			)}
		</>
	);

	return (
		<div className="requests-page">
			<div className="requests-page__header">
				<div>
					<Text type="secondary" className="requests-page__eyebrow">Pricing Tool / Internal</Text>
					<Title level={3} className="requests-page__title">Requests</Title>
				</div>
				<Space>
					<Segmented
						value={mode}
						onChange={setMode}
						options={[
							{ value: 'list', label: 'List', icon: <BarsOutlined /> },
							{ value: 'board', label: 'Board', icon: <AppstoreOutlined /> },
						]}
					/>
					<Button icon={<ReloadOutlined />} onClick={loadRequests}>Refresh</Button>
					<Button type="primary" danger icon={<PlusOutlined />} onClick={() => setNewOpen(true)}>
						New Request
					</Button>
				</Space>
			</div>

			{error && <Alert type="error" showIcon message={error} className="requests-page__error" />}

			<Tabs
				activeKey={tab}
				onChange={setTab}
				items={[
					{ key: 'requests', label: 'Requests', children: requestsTabContent },
					{ key: 'workflow', label: 'Workflow', children: <WorkflowTab /> },
					{ key: 'guidelines', label: 'Guidelines', children: <GuidelinesTab /> },
				]}
			/>

			<RequestDetailDrawer
				requestId={selectedId}
				onClose={() => setSelectedId(null)}
				users={users}
				meta={meta}
				isTriage={isTriage}
				currentUser={user}
				onRequestAction={handleRequestAction}
				onChanged={loadRequests}
			/>

			<NewRequestModal
				open={newOpen}
				onClose={() => setNewOpen(false)}
				meta={meta}
				existingRequests={requests}
				onCreated={async (created) => {
					setNewOpen(false);
					message.success(`REQ-${created.id} created`);
					await loadRequests();
				}}
			/>
		</div>
	);
};

export default RequestsPage;
