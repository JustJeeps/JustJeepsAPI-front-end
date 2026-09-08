import { useCallback, useEffect, useState } from 'react';
import {
	Alert,
	Button,
	Drawer,
	Input,
	Select,
	Space,
	Spin,
	Tabs,
	Tag,
	Typography,
	message,
} from 'antd';
import { EditOutlined, InboxOutlined } from '@ant-design/icons';
import { apiErrorMessage } from '../../utils/api';
import { addComment, fetchRequestDetail, updateRequest } from './requestsApi';
import {
	COMMENT_REQUIRED_STATUSES,
	assignableUsers,
	canManageRequest,
	canManageFollowers,
	isSectorAdmin,
	PRIORITIES,
	PRIORITY_COLORS,
	PROJECTS,
	STATUS_COLORS,
	STATUS_NAMES,
	TYPES,
	formatDate,
	relativeTime,
	requestRef,
	userLabel,
} from './requestsConstants';
import RequestComments from './RequestComments';
import RequestActivityLog from './RequestActivityLog';
import RequestAttachments from './RequestAttachments';
import RequestCommentGateModal from './RequestCommentGateModal';
import RequestActionsMenu from './RequestActionsMenu';
import RequestTrelloPanel from './RequestTrelloPanel';

const { Text, Title, Paragraph } = Typography;

// Drawer de detalhe: meta + transições inline + comentários + activity +
// anexos. Toda mutação vai pro PATCH/POST e o estado local é o retorno da API.
const RequestDetailDrawer = ({ requestId, onClose, users, meta, canAssignAssignees = false, isTriage, currentUser, onChanged, onRequestAction }) => {
	const [detail, setDetail] = useState(null);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [commentGate, setCommentGate] = useState(null); // { status, comment } p/ status que exigem comentário
	// Edição estilo Jira, na mesma tela: duplo clique edita título/descrição
	// no lugar; o botão Edit liga o modo de edição do drawer inteiro
	// (título/descrição/links viram campos; Save envia só o que mudou).
	const [editingTitle, setEditingTitle] = useState(false);
	const [editingDescription, setEditingDescription] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [draft, setDraft] = useState({ title: '', description: '', links: '' });

	const open = Boolean(requestId);
	// Autor, triage ou admin do setor: mesma regra do back
	// (lib/requests/permissions.js + actorContext).
	const adminSectorIds = meta?.myRoles?.adminSectorIds || [];
	const canManage = detail ? canManageRequest(detail, currentUser, isTriage, adminSectorIds) : false;
	const canEditFollowers = detail ? canManageFollowers(detail, currentUser) : false;
	// Mover de setor: triage ou admin do setor de ORIGEM (o atual do chamado).
	const canMoveSector = detail ? (isTriage || isSectorAdmin(meta, detail.sector?.id)) : false;
	const sectors = (meta?.sectors || []).filter((sector) => !sector.archivedAt);

	const saveTitle = (value) => {
		setEditingTitle(false);
		const text = String(value || '').trim();
		if (text && text !== detail.title) applyPatch({ title: text }, 'Title updated');
	};

	const saveDescription = (value) => {
		setEditingDescription(false);
		const text = String(value || '').trim();
		if (text && text !== detail.description) applyPatch({ description: text }, 'Description updated');
	};

	const startEdit = () => {
		setEditingTitle(false);
		setEditingDescription(false);
		setDraft({
			title: detail.title,
			description: detail.description,
			links: (detail.links || []).join('\n'),
		});
		setEditMode(true);
	};

	const saveEdit = async () => {
		const links = draft.links.split('\n').map((link) => link.trim()).filter(Boolean);
		const title = draft.title.trim();
		const description = draft.description.trim();
		const patch = {};
		if (title && title !== detail.title) patch.title = title;
		if (description && description !== detail.description) patch.description = description;
		if (JSON.stringify(links) !== JSON.stringify(detail.links || [])) patch.links = links;
		if (!Object.keys(patch).length) {
			setEditMode(false);
			return;
		}
		const ok = await applyPatch(patch, 'Request updated');
		if (ok) setEditMode(false);
	};

	const loadDetail = useCallback(async () => {
		if (!requestId) return;
		setLoading(true);
		try {
			setDetail(await fetchRequestDetail(requestId));
		} catch (error) {
			message.error(apiErrorMessage(error, 'Failed to load request'));
			onClose();
		} finally {
			setLoading(false);
		}
	}, [requestId, onClose]);

	useEffect(() => {
		setDetail(null);
		setEditingTitle(false);
		setEditingDescription(false);
		setEditMode(false);
		loadDetail();
	}, [loadDetail]);

	const applyPatch = async (patch, successText) => {
		setSaving(true);
		try {
			const updated = await updateRequest(requestId, patch);
			setDetail(updated);
			if (successText) message.success(successText);
			onChanged();
			return true;
		} catch (error) {
			message.error(apiErrorMessage(error, 'Update failed'));
			return false;
		} finally {
			setSaving(false);
		}
	};

	const handleStatusChange = (nextStatus) => {
		// On Hold / Awaiting Client Response / Completed exigem comentário na
		// mesma transição — o modal coleta e manda { status, comment } juntos.
		if (COMMENT_REQUIRED_STATUSES.includes(nextStatus)) {
			setCommentGate({ status: nextStatus, comment: '' });
			return;
		}
		applyPatch({ status: nextStatus }, `Status set to ${nextStatus}`);
	};

	const handleCommentSubmit = async ({ body }) => {
		try {
			await addComment(requestId, { body });
			await loadDetail();
			onChanged();
			return true;
		} catch (error) {
			message.error(apiErrorMessage(error, 'Failed to post comment'));
			return false;
		}
	};

	return (
		<Drawer
			open={open}
			onClose={onClose}
			width={720}
			destroyOnHidden
			title={detail ? (
				<Space direction="vertical" size={0}>
					<Text type="secondary">
						{requestRef(detail.id)}
						{detail.sector && (
							<Tag color={detail.sector.color || undefined} style={{ marginLeft: 8 }}>
								{detail.sector.name}
							</Tag>
						)}
						{detail.archivedAt && <Tag className="requests-drawer__archived-tag">Archived</Tag>}
					</Text>
					{editMode ? (
						<Input
							value={draft.title}
							maxLength={300}
							onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
						/>
					) : editingTitle ? (
						<Input
							autoFocus
							defaultValue={detail.title}
							maxLength={300}
							onPressEnter={(event) => saveTitle(event.target.value)}
							onBlur={(event) => saveTitle(event.target.value)}
							onKeyDown={(event) => { if (event.key === 'Escape') setEditingTitle(false); }}
						/>
					) : (
						<Title
							level={5}
							style={{ margin: 0, cursor: 'text' }}
							title="Double-click to edit"
							onDoubleClick={() => setEditingTitle(true)}
						>
							{detail.title}
						</Title>
					)}
				</Space>
			) : 'Request'}
		>
			{loading && <div className="requests-drawer__loading"><Spin size="large" /></div>}

			{!loading && detail && (
				<div className="requests-drawer">
					<div className="requests-drawer__controls">
						<div className="requests-drawer__controls-grid">
						{/* Top controls in a simpler grid to avoid a crowded toolbar feel. */}
						<div className="requests-drawer__control">
							<Text type="secondary" className="requests-drawer__control-label">Status</Text>
							<Select
								value={detail.status}
								onChange={handleStatusChange}
								disabled={saving}
								style={{ width: '100%' }}
								options={STATUS_NAMES.map((name) => ({
									value: name,
									label: <Tag color={STATUS_COLORS[name]}>{name}</Tag>,
								}))}
							/>
						</div>
						<div className="requests-drawer__control">
							<Text type="secondary" className="requests-drawer__control-label">
								Assignees
							</Text>
							<Select
								mode="multiple"
								placeholder="Unassigned"
								maxTagCount="responsive"
								value={(detail.assignees || []).map((entry) => entry.user_id ?? entry.user?.id)}
								onChange={(values) =>
									applyPatch(
										{ assigneeIds: values },
										values.length ? 'Assignees updated' : 'Request unassigned'
									)
								}
								disabled={saving || !canAssignAssignees}
									style={{ width: '100%' }}
								options={assignableUsers(users, meta, detail).map((user) => ({ value: user.id, label: userLabel(user) }))}
							/>
						</div>
						<div className="requests-drawer__control">
							<Text type="secondary" className="requests-drawer__control-label">
								Followers
							</Text>
							<Select
								mode="multiple"
								placeholder="No followers"
								maxTagCount="responsive"
								value={(detail.followers || []).map((entry) => entry.user_id ?? entry.user?.id)}
								onChange={(values) =>
									applyPatch(
										{ followerIds: values },
										values.length ? 'Followers updated' : 'Followers cleared'
									)
								}
								disabled={saving || !canEditFollowers}
									style={{ width: '100%' }}
								options={users.map((user) => ({ value: user.id, label: userLabel(user) }))}
							/>
						</div>
						<div className="requests-drawer__control">
							<Text type="secondary" className="requests-drawer__control-label">Priority</Text>
							<Select
								value={detail.priority}
								onChange={(value) => applyPatch({ priority: value }, `Priority set to ${value}`)}
								disabled={saving}
								style={{ width: '100%' }}
								options={PRIORITIES.map((name) => ({
									value: name,
									label: (
										<span>
											<span className="requests-list__priority-dot" style={{ background: PRIORITY_COLORS[name] }} />
											{name}
										</span>
									),
								}))}
							/>
						</div>
						</div>
						<div className="requests-drawer__controls-actions">
						{editMode ? (
							<>
								<Button type="primary" loading={saving} onClick={saveEdit}>Save</Button>
								<Button disabled={saving} onClick={() => setEditMode(false)}>Cancel</Button>
							</>
						) : (
							<Button icon={<EditOutlined />} disabled={saving} onClick={startEdit}>
								Edit
							</Button>
						)}
						{/* Arquivar/deletar vivem só no menu, iguais à lista e ao board:
						    ter também um botão dava dois caminhos com efeitos diferentes. */}
						<RequestActionsMenu
							request={detail}
							canManage={canManage}
							isTriage={isTriage}
							onAction={onRequestAction}
							size="middle"
						/>
						</div>
					</div>

					{!isTriage && (
						<Alert
							type="info"
							showIcon
							className="requests-drawer__triage-note"
							message="Only triage can close requests."
						/>
					)}

					<div className="requests-drawer__meta-grid">
						<div className="requests-drawer__meta-item">
							<Text type="secondary" className="requests-drawer__meta-label">Requester</Text>
							<Text className="requests-drawer__meta-value">{userLabel(detail.requester)}</Text>
						</div>
						<div className="requests-drawer__meta-item">
							<Text type="secondary" className="requests-drawer__meta-label">Assignee</Text>
							<Text className="requests-drawer__meta-value">{userLabel(detail.assignee)}</Text>
						</div>
						<div className="requests-drawer__meta-item">
							<Text type="secondary" className="requests-drawer__meta-label">Sector</Text>
							{/* Mover de setor: só triage ou admin do setor ATUAL (regra no
							    back — canMoveRequest). O card do Trello vai junto. */}
							<Select
								size="small"
								value={detail.sector?.id}
								disabled={saving || !canMoveSector}
								className="requests-drawer__meta-input"
								onChange={(value) => {
									const target = sectors.find((sector) => sector.id === value);
									applyPatch({ sectorId: value }, `Moved to ${target?.name || 'sector'}`);
								}}
								options={sectors.map((sector) => ({ value: sector.id, label: sector.name }))}
							/>
						</div>
						<div className="requests-drawer__meta-item">
							<Text type="secondary" className="requests-drawer__meta-label">System / Area</Text>
							<Select
								size="small"
								value={detail.project}
								disabled={saving}
								className="requests-drawer__meta-input"
								onChange={(value) => applyPatch({ project: value }, 'System / Area updated')}
								options={PROJECTS.map((project) => ({ value: project, label: project }))}
							/>
						</div>
						<div className="requests-drawer__meta-item">
							<Text type="secondary" className="requests-drawer__meta-label">Request Type</Text>
							<Select
								size="small"
								value={detail.type}
								disabled={saving}
								className="requests-drawer__meta-input"
								onChange={(value) => applyPatch({ type: value }, 'Request type updated')}
								options={TYPES.map((type) => ({ value: type, label: type }))}
							/>
						</div>
						<div className="requests-drawer__meta-item">
							<Text type="secondary" className="requests-drawer__meta-label">Created</Text>
							<Text className="requests-drawer__meta-value">{formatDate(detail.createdAt)}</Text>
						</div>
						<div className="requests-drawer__meta-item">
							<Text type="secondary" className="requests-drawer__meta-label">Updated</Text>
							<Text className="requests-drawer__meta-value">{relativeTime(detail.updatedAt)}</Text>
						</div>
					</div>

					<div className="requests-drawer__section">
						<Text type="secondary" className="requests-drawer__section-title">Description</Text>
						{editMode ? (
							<Input.TextArea
								value={draft.description}
								autoSize={{ minRows: 3, maxRows: 14 }}
								onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
							/>
						) : editingDescription ? (
							<Input.TextArea
								autoFocus
								defaultValue={detail.description}
								autoSize={{ minRows: 3, maxRows: 14 }}
								onBlur={(event) => saveDescription(event.target.value)}
								onKeyDown={(event) => { if (event.key === 'Escape') setEditingDescription(false); }}
							/>
						) : (
							<Paragraph
								className="requests-drawer__description"
								style={{ cursor: 'text' }}
								title="Double-click to edit"
								onDoubleClick={() => setEditingDescription(true)}
							>
								{detail.description}
							</Paragraph>
						)}
					</div>

					{editMode ? (
						<div className="requests-drawer__section">
							<Text type="secondary" className="requests-drawer__section-title">Links</Text>
							<Input.TextArea
								value={draft.links}
								autoSize={{ minRows: 1, maxRows: 4 }}
								placeholder="https://… (one per line)"
								onChange={(event) => setDraft((current) => ({ ...current, links: event.target.value }))}
							/>
						</div>
					) : (Array.isArray(detail.links) && detail.links.length > 0 && (
						<div className="requests-drawer__section">
							<Text type="secondary" className="requests-drawer__section-title">Links</Text>
							{detail.links.map((link) => (
								<div key={link}>
									<a href={link} target="_blank" rel="noreferrer">{link}</a>
								</div>
							))}
						</div>
					))}

					<RequestTrelloPanel
						detail={detail}
						meta={meta}
						onUpdated={(updated) => {
							setDetail(updated);
							onChanged();
						}}
					/>

					<div className="requests-drawer__section">
						<Text type="secondary" className="requests-drawer__section-title">Attachments</Text>
						<RequestAttachments
							requestId={detail.id}
							attachments={detail.attachments}
							meta={meta}
							currentUser={currentUser}
							isTriage={isTriage}
							onChanged={async () => {
								await loadDetail();
								onChanged();
							}}
						/>
					</div>

					<Tabs
						className="requests-drawer__tabs"
						items={[
							{
								key: 'comments',
								label: `Comments (${detail.comments.length})`,
								children: (
									<RequestComments
										comments={detail.comments}
										onSubmit={handleCommentSubmit}
										submitting={saving}
									/>
								),
							},
							{
								key: 'activity',
								label: 'Activity',
								children: <RequestActivityLog activities={detail.activities} />,
							},
						]}
					/>
				</div>
			)}

			<RequestCommentGateModal
				gate={commentGate}
				saving={saving}
				onChange={(comment) => setCommentGate((gate) => ({ ...gate, comment }))}
				onOk={async () => {
					const ok = await applyPatch(
						{ status: commentGate.status, comment: commentGate.comment.trim() },
						`Status set to ${commentGate.status}`
					);
					if (ok) setCommentGate(null);
				}}
				onCancel={() => setCommentGate(null)}
			/>

		</Drawer>
	);
};

export default RequestDetailDrawer;
