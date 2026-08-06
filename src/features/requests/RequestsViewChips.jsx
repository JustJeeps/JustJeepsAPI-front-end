import { Tag, Typography } from 'antd';

const { Text } = Typography;

export const VIEWS = [
	{ key: 'mine', label: 'My requests' },
	{ key: 'unassigned', label: 'Unassigned' },
	{ key: 'open', label: 'All open' },
	{ key: 'archived', label: 'Archived' },
];

// Predicado dos recortes rápidos (saved views client-side, sem persistência).
export const matchesView = (request, view, currentUserId) => {
	switch (view) {
		case 'mine':
			return request.requester?.id === currentUserId;
		case 'unassigned':
			return !request.assignee;
		case 'open':
			return !DONE_STATUSES.includes(request.status);
		case 'aging':
			return (
				request.status !== 'Closed' &&
				Date.now() - new Date(request.updatedAt).getTime() > 7 * 24 * 60 * 60 * 1000
			);
		case 'archived':
			// O corte por archivedAt é feito na página (visibleRequests); aqui
			// a view só não aplica filtro extra.
			return true;
		default:
			return true;
	}
};

const RequestsViewChips = ({ activeView, onToggle }) => (
	<div className="requests-views">
		<Text type="secondary" className="requests-views__label">Saved views</Text>
		{VIEWS.map((view) => (
			<Tag.CheckableTag
				key={view.key}
				checked={activeView === view.key}
				onChange={() => onToggle(view.key)}
				className="requests-views__chip"
			>
				{view.label}
			</Tag.CheckableTag>
		))}
	</div>
);

export default RequestsViewChips;
