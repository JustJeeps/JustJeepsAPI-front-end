import { Card } from 'antd';
import { isAging } from './requestsConstants';

// 7 KPIs do design. Cada card é clicável e liga/desliga um recorte da lista.
const buildKpis = (requests) => {
	const countByStatus = (status) => requests.filter((request) => request.status === status).length;
	return [
		{ key: 'unassigned', label: 'Unassigned', color: '#a855f7', value: requests.filter((r) => !r.assignee).length, view: 'unassigned' },
		{ key: 'new', label: 'New request', color: '#a855f7', value: countByStatus('New Request'), status: 'New Request' },
		{ key: 'estimation', label: 'Estimation', color: '#0b8ce9', value: countByStatus('Estimation'), status: 'Estimation' },
		{ key: 'wip', label: 'In progress', color: '#10a35a', value: countByStatus('Work in Progress'), status: 'Work in Progress' },
		{ key: 'awaiting', label: 'Awaiting client', color: '#b58100', value: countByStatus('Awaiting Client Response'), status: 'Awaiting Client Response' },
		{ key: 'onhold', label: 'On hold', color: '#ef4444', value: countByStatus('On Hold'), status: 'On Hold' },
		{ key: 'aging', label: 'Aging > 7 days', color: '#ef4444', value: requests.filter(isAging).length, view: 'aging' },
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
