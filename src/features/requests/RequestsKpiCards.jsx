import { Card } from 'antd';

export const REQUESTS_TOTAL_FILTER = '__REQUESTS_TOTAL__';
const REQUESTS_TOTAL_STATUSES = ['New Request', 'Estimation', 'Assigned'];

// Badges simplificados: foco só no que o time usa no dia a dia.
const buildKpis = (requests) => {
	const countByStatus = (status) => requests.filter((request) => request.status === status).length;
	const isRequestsTotalStatus = (status) => REQUESTS_TOTAL_STATUSES.includes(status);
	return [
		{
			key: 'new-total',
			label: 'New requests total',
			color: '#a855f7',
			value: requests.filter((request) => isRequestsTotalStatus(request.status)).length,
			status: REQUESTS_TOTAL_FILTER,
		},
		{
			key: 'new-unassigned',
			label: 'New requests unassigned',
			color: '#7c3aed',
			value: requests.filter((request) => isRequestsTotalStatus(request.status) && !request.assignee).length,
			view: 'unassigned',
		},
		{ key: 'wip', label: 'In progress', color: '#10a35a', value: countByStatus('Work in Progress'), status: 'Work in Progress' },
		{ key: 'onhold', label: 'On hold', color: '#ef4444', value: countByStatus('On Hold'), status: 'On Hold' },
	];
};

const RequestsKpiCards = ({ requests, activeView, activeStatus, onToggleView, onToggleStatus }) => {
	const kpis = buildKpis(requests);

	const isActive = (kpi) =>
		(kpi.view && kpi.view === activeView) || (kpi.status && kpi.status === activeStatus);

	return (
		<div className="requests-kpis">
			{kpis.map((kpi) => (
				<Card
					key={kpi.key}
					size="small"
					hoverable
					className={`requests-kpis__card${isActive(kpi) ? ' requests-kpis__card--active' : ''}`}
					onClick={() => (kpi.view ? onToggleView(kpi.view) : onToggleStatus(kpi.status))}
				>
					<div className="requests-kpis__label">{kpi.label}</div>
					<div className="requests-kpis__value" style={{ color: kpi.color }}>{kpi.value}</div>
				</Card>
			))}
		</div>
	);
};

export default RequestsKpiCards;
