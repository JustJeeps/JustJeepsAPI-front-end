import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Empty, Input, Pagination, Result, Space, Spin, Typography, message } from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { fetchReplacements, fetchReplacementsMetaCached, removeReplacement } from './replacementsApi';
import { LIST_PAGE_SIZE, listPageSummary, replacementErrorMessage } from './replacementsUtils';
import ReplacementsList from './ReplacementsList';
import NewReplacementModal from './NewReplacementModal';
import ReplacementDetailDrawer from './ReplacementDetailDrawer';
import './replacements.scss';

const { Title, Text } = Typography;

// Replacement Management (/replacements): the only screen that writes
// replacement data. Lists known substitutions grouped by original product,
// creates new ones and maintains comments. The Orders screen only reads.
const ReplacementsPage = () => {
	const { user } = useAuth();
	const [groups, setGroups] = useState([]);
	const [total, setTotal] = useState(0); // original products matching the search
	const [totalRows, setTotalRows] = useState(0);
	const [page, setPage] = useState(1);
	const [magentoStatus, setMagentoStatus] = useState(null); // { configured, degraded }
	const [managers, setManagers] = useState([]);
	const [managersError, setManagersError] = useState(null);
	const [enabled, setEnabled] = useState(null); // null = meta not loaded yet
	const [initialLoading, setInitialLoading] = useState(true);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [search, setSearch] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [newOpen, setNewOpen] = useState(false);
	const [newSourceSku, setNewSourceSku] = useState(null);
	const [selectedId, setSelectedId] = useState(null);
	const [removingId, setRemovingId] = useState(null);

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
		return () => clearTimeout(timer);
	}, [search]);

	const load = useCallback(async (term = debouncedSearch, { silent = false, pageNumber = page } = {}) => {
		if (!silent) setLoading(true);
		try {
			const data = await fetchReplacements(term, pageNumber, LIST_PAGE_SIZE);
			setGroups(data.groups || []);
			setTotal(data.total || 0);
			setTotalRows(data.totalRows ?? data.total ?? 0);
			setMagentoStatus(data.magento || null);
			setError(null);
		} catch (loadError) {
			setError(replacementErrorMessage(loadError, 'Failed to load the replacements'));
		} finally {
			if (!silent) setLoading(false);
			setInitialLoading(false);
		}
	}, [debouncedSearch, page]);

	// A new search starts from the first page.
	useEffect(() => {
		setPage(1);
	}, [debouncedSearch]);

	// Who may remove other people's associations. A failure hides those
	// buttons, so it is said out loud and retried by the Refresh button.
	const normalizedUsername = (user?.username || user?.name || '').toLowerCase();
	const loadManagers = useCallback(async () => {
		try {
			const meta = await fetchReplacementsMetaCached(normalizedUsername);
			setManagers(meta?.managers || []);
			setEnabled(Boolean(meta?.enabled));
			setManagersError(null);
		} catch (metaError) {
			console.error('Could not load the replacement permissions', metaError);
			setManagers([]);
			setEnabled(false);
			setManagersError(replacementErrorMessage(metaError, 'API unreachable'));
		}
	}, [normalizedUsername]);

	useEffect(() => {
		loadManagers();
	}, [loadManagers]);

	// The list is only requested once the gate said yes (a 409 otherwise).
	useEffect(() => {
		if (enabled) load(debouncedSearch);
		else if (enabled === false) setInitialLoading(false);
	}, [enabled, debouncedSearch, load]);

	// The drawer shows the live row from the list, so a new comment shows up
	// after the reload without keeping a second copy of the data.
	const selected = useMemo(() => {
		if (selectedId == null) return null;
		for (const group of groups) {
			const row = group.replacements.find((entry) => entry.id === selectedId);
			if (row) return { row, group };
		}
		return null;
	}, [groups, selectedId]);

	const handleRemove = async (replacement) => {
		setRemovingId(replacement.id);
		try {
			await removeReplacement(replacement.id);
			message.success('Replacement removed');
			await load(debouncedSearch, { silent: true });
		} catch (removeError) {
			message.error(replacementErrorMessage(removeError, 'Failed to remove the replacement'));
		} finally {
			setRemovingId(null);
		}
	};

	const openNew = (sourceSku = null) => {
		setNewSourceSku(sourceSku);
		setNewOpen(true);
	};

	// Only the first fetch replaces the page: later loads keep the search box
	// mounted (and focused) and show the spinner in the list area.
	if (initialLoading || enabled === null) {
		return (
			<div className="replacements-page replacements-page--loading">
				<Spin size="large" />
			</div>
		);
	}

	// Rollout gate (REPLACEMENTS_ALLOWED_USERS): same wording as the Requests page.
	if (enabled === false) {
		return (
			<div className="replacements-page">
				<Result
					status="warning"
					title="Not available yet"
					subTitle={managersError
						? `The product replacements feature could not be checked for your user (${managersError}). Try again later.`
						: 'The product replacements feature is being tested with a small group and will be released to everyone soon.'}
				/>
			</div>
		);
	}


	return (
		<div className="replacements-page">
			<div className="replacements-page__header">
				<div>
					<Text type="secondary" className="replacements-page__eyebrow">Pricing Tool / Internal</Text>
					<Title level={3} className="replacements-page__title">Replacements</Title>
					<Text type="secondary" className="replacements-page__subtitle">
						Known substitutes for products. Used by the Orders screen. Registering one never changes an order.
					</Text>
				</div>
				<Space>
					<Button icon={<ReloadOutlined />} onClick={() => { loadManagers(); load(debouncedSearch); }} loading={loading}>Refresh</Button>
					<Button type="primary" danger icon={<PlusOutlined />} onClick={() => openNew()}>New Replacement</Button>
				</Space>
			</div>

			{error && <Alert type="error" showIcon message={error} className="replacements-page__error" />}
			{managersError && (
				<Alert
					type="warning"
					showIcon
					className="replacements-page__error"
					message={`Could not load permissions (${managersError}). Manager actions stay hidden until Refresh works.`}
				/>
			)}
			{magentoStatus?.degraded && (
				<Alert
					type="info"
					showIcon
					className="replacements-page__error"
					message={magentoStatus.configured
						? 'Showing catalog data: the store did not answer, so names, images and descriptions may be out of date.'
						: 'Showing catalog data: the live store connection is not configured on this server.'}
				/>
			)}
			<Card size="small" className="replacements-page__search">
				<Input
					className="replacements-page__search-input"
					prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
					placeholder="Search by original SKU, replacement SKU or product name"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					allowClear
				/>
				<div className="replacements-page__paging">
					<Text type="secondary" className="replacements-page__count">
						{listPageSummary({ page, pageSize: LIST_PAGE_SIZE, total, totalRows })}
					</Text>
					{total > LIST_PAGE_SIZE && (
						<Pagination
							size="small"
							current={page}
							pageSize={LIST_PAGE_SIZE}
							total={total}
							showSizeChanger={false}
							onChange={(nextPage) => setPage(nextPage)}
							disabled={loading}
						/>
					)}
				</div>
			</Card>

			{loading && groups.length === 0 ? (
				<div className="replacements-page__empty"><Spin /></div>
			) : groups.length === 0 ? (
				<div className="replacements-page__empty">
					<Empty description={debouncedSearch ? `No replacement matches "${debouncedSearch}"` : 'No replacement registered yet'}>
						{!debouncedSearch && (
							<Button type="primary" danger icon={<PlusOutlined />} onClick={() => openNew()}>Register the first one</Button>
						)}
					</Empty>
				</div>
			) : (
				<ReplacementsList
					groups={groups}
					user={user}
					managers={managers}
					onView={(replacement) => setSelectedId(replacement.id)}
					onRemove={handleRemove}
					onAddFor={openNew}
					removingId={removingId}
				/>
			)}

			<NewReplacementModal
				open={newOpen}
				onClose={() => { setNewOpen(false); setNewSourceSku(null); }}
				onCreated={() => load(debouncedSearch, { silent: true })}
				user={user}
				initialSourceSku={newSourceSku}
			/>

			<ReplacementDetailDrawer
				open={selected != null}
				replacement={selected?.row || null}
				sourceProduct={selected?.group?.sourceProduct || null}
				user={user}
				managers={managers}
				onClose={() => setSelectedId(null)}
				onChanged={() => load(debouncedSearch, { silent: true })}
			/>
		</div>
	);
};

export default ReplacementsPage;
