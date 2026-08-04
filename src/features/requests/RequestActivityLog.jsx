import { Empty, Typography } from 'antd';
import {
	CommentOutlined,
	DeleteOutlined,
	EditOutlined,
	FlagOutlined,
	InboxOutlined,
	LinkOutlined,
	PaperClipOutlined,
	PlusCircleOutlined,
	SwapOutlined,
	UndoOutlined,
	UserOutlined,
} from '@ant-design/icons';
import { relativeTime } from './requestsConstants';

const { Text } = Typography;

// Trilha de auditoria legível: ícone por tipo de ação, ator em destaque e
// hora relativa à direita. Ações do sistema (Trello) não têm ator.
const ACTION_ICONS = {
	created: <PlusCircleOutlined />,
	status_change: <SwapOutlined />,
	reopened: <UndoOutlined />,
	assignee_change: <UserOutlined />,
	priority_change: <FlagOutlined />,
	field_update: <EditOutlined />,
	comment_added: <CommentOutlined />,
	attachment_added: <PaperClipOutlined />,
	attachment_removed: <DeleteOutlined />,
	archived: <InboxOutlined />,
	unarchived: <UndoOutlined />,
	trello_card_created: <LinkOutlined />,
	trello_card_skipped: <LinkOutlined />,
	trello_card_failed: <LinkOutlined />,
};

const activityParts = (activity) => {
	const actor = activity.actor?.username || 'system';
	switch (activity.action) {
		case 'created':
			return { actor, text: 'created the request' };
		case 'status_change':
			return { actor, text: `moved status: ${activity.oldValue} to ${activity.newValue}` };
		case 'reopened':
			return { actor, text: `reopened the request (back to ${activity.newValue})` };
		case 'assignee_change':
			return { actor, text: `assigned to ${activity.newValue || 'Unassigned'}` };
		case 'priority_change':
			return { actor, text: `changed priority: ${activity.oldValue} to ${activity.newValue}` };
		case 'field_update':
			return { actor, text: `updated ${activity.field}` };
		case 'comment_added':
			return { actor, text: 'commented' };
		case 'attachment_added':
			return { actor, text: `attached ${activity.newValue}` };
		case 'attachment_removed':
			return { actor, text: `removed attachment ${activity.oldValue}` };
		case 'archived':
			return { actor, text: 'archived the request' };
		case 'unarchived':
			return { actor, text: 'unarchived the request' };
		case 'trello_card_created':
			return { actor, text: 'created the Trello card' };
		case 'trello_card_skipped':
			return { actor: null, text: `Trello card not created: ${activity.newValue}` };
		case 'trello_card_failed':
			return { actor: null, text: `Trello card creation failed: ${activity.newValue}` };
		default:
			return { actor, text: activity.action };
	}
};

const RequestActivityLog = ({ activities = [] }) => {
	if (!activities.length) {
		return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No activity yet" />;
	}
	return (
		<div className="requests-activity">
			{activities.map((activity) => {
				const { actor, text } = activityParts(activity);
				return (
					<div key={activity.id} className="requests-activity__row">
						<span className="requests-activity__icon">
							{ACTION_ICONS[activity.action] || <EditOutlined />}
						</span>
						<span className="requests-activity__text">
							{actor && <Text strong>{actor}</Text>}
							{actor && ' '}
							<Text>{text}</Text>
						</span>
						<Text type="secondary" className="requests-activity__date">
							{relativeTime(activity.createdAt)}
						</Text>
					</div>
				);
			})}
		</div>
	);
};

export default RequestActivityLog;
