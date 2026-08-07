import { Tag, Typography } from 'antd';
import { DONE_STATUSES, isAging } from './requestsConstants';

const { Text } = Typography;

export const VIEWS = [
	{ key: 'mine', label: 'My requests' },
	{ key: 'unassigned', label: 'Unassigned' },
	{ key: 'open', label: 'All open' },
	{ key: 'archived', label: 'Archived' },
	// Lixeira: só triage vê (é quem pode restaurar).
	{ key: 'deleted', label: 'Deleted' },
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
			// Mesma regra do card de KPI que aciona esta view — uma fonte só.
			return isAging(request);
		case 'deleted':
			// A lista da lixeira já vem filtrada da API.
			return true;
		case 'archived':
			// O corte por archivedAt é feito na página (visibleRequests); aqui
			// a view só não aplica filtro extra.
			return true;
		default:
			return true;
	}
};

const RequestsViewChips = ({ activeView, onToggle, isTriage }) => (
	<div className="requests-views">
		<Text type="secondary" className="requests-views__label">Saved views</Text>
		{VIEWS.filter((view) => view.key !== 'deleted' || isTriage).map((view) => (
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
