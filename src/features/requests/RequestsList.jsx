import { useMemo } from 'react';
import { Collapse, Empty, Select, Table, Tag, Tooltip, Typography } from 'antd';
import RequestActionsMenu from './RequestActionsMenu';
import { MessageOutlined, PaperClipOutlined } from '@ant-design/icons';
import {
	BOARD_LANES,
	PRIORITIES,
	PRIORITY_COLORS,
	PROJECTS,
	STATUS_COLORS,
	formatDate,
	relativeTime,
	requestRef,
	userLabel,
} from './requestsConstants';

const { Text } = Typography;

// Constrói os grupos (status | project | assignee) da lista já filtrada.
export const buildGroups = (requests, groupBy, users) => {
	if (groupBy === 'status') {
		// The same four lanes as the board, with the same names and the same
		// order. Grouping by the eight raw statuses gave the two views different
		// shapes for the same data, and the person switching between them had to
		// translate "Estimation" and "Assigned" into "Requests" every time.
		return BOARD_LANES.map((lane) => ({
			key: lane.key,
			label: lane.name,
			color: lane.color,
			rows: requests.filter((request) => lane.statuses.includes(request.status)),
		}));
	}
	if (groupBy === 'project') {
		return PROJECTS
			.map((project) => ({
				key: project,
				label: project,
				color: null,
				rows: requests.filter((request) => request.project === project),
			}))
			.filter((group) => group.rows.length);
	}
	const unassigned = {
		key: 'unassigned',
		label: 'Unassigned',
		color: '#9aa0a6',
		rows: requests.filter((request) => !request.assignee),
	};
	const byUser = users
		.map((user) => ({
			key: `user-${user.id}`,
			label: userLabel(user),
			color: null,
			rows: requests.filter((request) => request.assignee?.id === user.id),
		}))
		.filter((group) => group.rows.length);
	return [unassigned, ...byUser].filter((group) => group.rows.length || group.key === 'unassigned');
};

// Lista agrupada e colapsável. Edição inline de priority e assignees para
// qualquer usuário — o back valida de novo (fechar segue restrito a triage).
const RequestsList = ({ requests, groupBy, users, canManage, isTriage, emptyText, onOpen, onInlinePatch, onRequestAction }) => {
	const groups = useMemo(() => buildGroups(requests, groupBy, users), [requests, groupBy, users]);

	const columns = [
		{
			title: 'ID',
			dataIndex: 'id',
			width: 90,
			render: (id) => <Text type="secondary">{requestRef(id)}</Text>,
		},
		{
			title: 'Name',
			dataIndex: 'title',
			ellipsis: true,
			render: (title, record) => (
				<span className="requests-list__title" onClick={() => onOpen(record.id)}>
					{/* The group is the lane, so the exact status still has to be
					    readable: three statuses share the Requests lane. */}
					<Tooltip title={record.status}>
						<span
							className="requests-list__status-dot"
							style={{ background: STATUS_COLORS[record.status] || '#ccc' }}
						/>
					</Tooltip>
					{title}
					{record.archivedAt && <Tag className="requests-list__state-tag">Archived</Tag>}
				</span>
			),
		},
		{ title: 'Project', dataIndex: 'project', width: 180, ellipsis: true },
		{ title: 'Type', dataIndex: 'type', width: 160, ellipsis: true, responsive: ['lg'] },
		{
			title: 'Assignee',
			key: 'assignee',
			width: 170,
			// Qualquer usuário pode atribuir (decisão de 2026-08-03); fechar
			// chamado continua só com triage. Multi-assignee: o primeiro da
			// lista é o primário (board do Trello, auto-status).
			render: (_, record) => {
				return (
					<Select
						mode="multiple"
						size="small"
						variant="borderless"
						placeholder="Unassigned"
						maxTagCount="responsive"
						disabled={Boolean(record.deletedAt)}
						value={(record.assignees || []).map((entry) => entry.user_id ?? entry.user?.id)}
						style={{ width: '100%' }}
						onClick={(event) => event.stopPropagation()}
						onChange={(values) =>
							onInlinePatch(
								record.id,
								{ assigneeIds: values },
								values.length ? 'Assignees updated' : 'Request unassigned'
							)
						}
						options={users.map((user) => ({ value: user.id, label: userLabel(user) }))}
					/>
				);
			},
		},
		{
			title: 'Priority',
			dataIndex: 'priority',
			width: 120,
			render: (priority, record) => (
				<Select
					size="small"
					variant="borderless"
					disabled={Boolean(record.deletedAt)}
					value={priority}
					style={{ width: '100%' }}
					onClick={(event) => event.stopPropagation()}
					onChange={(value) => onInlinePatch(record.id, { priority: value }, `Priority set to ${value}`)}
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
			),
		},
		{
			title: 'Created',
			dataIndex: 'createdAt',
			width: 100,
			render: (value) => (
				<Tooltip title={relativeTime(value)}>
					<Text type="secondary">{formatDate(value)}</Text>
				</Tooltip>
			),
		},
		{
			title: 'Activity',
			key: 'activity',
			width: 90,
			align: 'right',
			render: (_, record) => (
				<span className="requests-list__activity">
					{record._count?.comments > 0 && (
						<span><MessageOutlined /> {record._count.comments}</span>
					)}
					{record._count?.attachments > 0 && (
						<span><PaperClipOutlined /> {record._count.attachments}</span>
					)}
					{record.trelloCardUrl && (
						<a
							href={record.trelloCardUrl}
							target="_blank"
							rel="noreferrer"
							onClick={(event) => event.stopPropagation()}
						>
							Trello
						</a>
					)}
				</span>
			),
		},
		{
			title: '',
			key: 'actions',
			width: 48,
			align: 'right',
			render: (_, record) => (
				<RequestActionsMenu
					request={record}
					canManage={canManage?.(record)}
					isTriage={isTriage}
					onAction={onRequestAction}
				/>
			),
		},
	];

	if (!requests.length) {
		return (
			<div className="requests-list requests-list--empty">
				<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText || 'No requests match these filters'} />
			</div>
		);
	}

	const items = groups.map((group) => ({
		key: group.key,
		label: (
			<span className="requests-list__group-header">
				{group.color
					? <Tag color={group.color} className="requests-list__group-tag">{group.label}</Tag>
					: <Text strong>{group.label}</Text>}
				<Text type="secondary">{group.rows.length}</Text>
			</span>
		),
		children: group.rows.length ? (
			<Table
				size="small"
				rowKey="id"
				columns={columns}
				dataSource={group.rows}
				pagination={false}
				onRow={(record) => ({
					// Deletado é só leitura: abrir o drawer daria caminho sem saída.
					onClick: () => !record.deletedAt && onOpen(record.id),
				})}
				rowClassName={() => 'requests-list__row'}
			/>
		) : (
			<Text type="secondary" italic className="requests-list__empty">No requests in this group</Text>
		),
	}));

	// Grupo Closed começa colapsado (padrão do design).
	const defaultActiveKeys = groups.map((group) => group.key).filter((key) => key !== 'Closed');

	return (
		<Collapse
			key={groupBy}
			className="requests-list"
			items={items}
			defaultActiveKey={defaultActiveKeys}
			ghost
		/>
	);
};

export default RequestsList;
