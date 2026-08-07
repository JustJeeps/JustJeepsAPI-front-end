import { useCallback, useEffect, useState } from 'react';
import {
	Alert,
	Button,
	Descriptions,
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
	canManageRequest,
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
const RequestDetailDrawer = ({ requestId, onClose, users, meta, isTriage, currentUser, onChanged, onRequestAction }) => {
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
	// Autor ou triage: mesma regra do back (lib/requests/permissions.js).
	const canManage = detail ? canManageRequest(detail, currentUser, isTriage) : false;

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

	const handleCommentSubmit = async ({ body, internal }) => {
		try {
			await addComment(requestId, { body, internal });
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
					<Space wrap className="requests-drawer__controls">
						<Select
							value={detail.status}
							onChange={handleStatusChange}
							disabled={saving}
							style={{ minWidth: 210 }}
							options={STATUS_NAMES.map((name) => ({
								value: name,
								label: <Tag color={STATUS_COLORS[name]}>{name}</Tag>,
							}))}
						/>
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
							disabled={saving}
							style={{ minWidth: 220 }}
							options={users.map((user) => ({ value: user.id, label: userLabel(user) }))}
						/>
						<Select
							value={detail.priority}
							onChange={(value) => applyPatch({ priority: value }, `Priority set to ${value}`)}
							disabled={saving}
							style={{ minWidth: 130 }}
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
						{canManage && (
							<Button
								icon={<InboxOutlined />}
								disabled={saving}
								onClick={() =>
									applyPatch(
										{ archived: !detail.archivedAt },
										detail.archivedAt ? 'Request unarchived' : 'Request archived'
									)
								}
							>
								{detail.archivedAt ? 'Unarchive' : 'Archive'}
							</Button>
						)}
						<RequestActionsMenu
							request={detail}
							canManage={canManage}
							isTriage={isTriage}
							onAction={onRequestAction}
							size="middle"
						/>
					</Space>

					{!isTriage && (
						<Alert
							type="info"
							showIcon
							className="requests-drawer__triage-note"
							message="Only triage can close requests."
						/>
					)}

					<Descriptions size="small" column={2} className="requests-drawer__meta">
						<Descriptions.Item label="Requester">{userLabel(detail.requester)}</Descriptions.Item>
						<Descriptions.Item label="Assignee">{userLabel(detail.assignee)}</Descriptions.Item>
						<Descriptions.Item label="Project">
							<Select
								size="small"
								variant="borderless"
								value={detail.project}
								disabled={saving}
								className="requests-drawer__meta-select"
								onChange={(value) => applyPatch({ project: value }, 'Project updated')}
								options={PROJECTS.map((project) => ({ value: project, label: project }))}
							/>
						</Descriptions.Item>
						<Descriptions.Item label="Type">
							<Select
								size="small"
								variant="borderless"
								value={detail.type}
								disabled={saving}
								className="requests-drawer__meta-select"
								onChange={(value) => applyPatch({ type: value }, 'Type updated')}
								options={TYPES.map((type) => ({ value: type, label: type }))}
							/>
						</Descriptions.Item>
						<Descriptions.Item label="Created">{formatDate(detail.createdAt)}</Descriptions.Item>
						<Descriptions.Item label="Updated">{relativeTime(detail.updatedAt)}</Descriptions.Item>
					</Descriptions>

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
