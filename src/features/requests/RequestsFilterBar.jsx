import { Button, Card, Col, Input, Row, Select, Typography } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
import { PRIORITIES, PROJECTS, TYPES, requestRef, userLabel } from './requestsConstants';

const { Text } = Typography;

export const EMPTY_FILTERS = {
	search: '',
	project: null,
	type: null,
	priority: null,
	assignee: null,
	groupBy: 'status',
};

// Predicado usado pela página para filtrar a lista client-side.
export const matchesFilters = (request, filters) => {
	const query = filters.search.trim().toLowerCase();
	if (query) {
		const haystack = `${requestRef(request.id)} ${request.title} ${request.description || ''}`.toLowerCase();
		if (!haystack.includes(query)) return false;
	}
	if (filters.project && request.project !== filters.project) return false;
	if (filters.type && request.type !== filters.type) return false;
	if (filters.priority && request.priority !== filters.priority) return false;
	if (filters.assignee === 'unassigned' && request.assignee) return false;
	// Multi-assignee: casa se a pessoa estiver em qualquer posição da lista.
	if (filters.assignee && filters.assignee !== 'unassigned') {
		const ids = request.assignees?.length
			? request.assignees.map((entry) => entry.user_id ?? entry.user?.id)
			: [request.assignee?.id];
		if (!ids.some((id) => String(id ?? '') === String(filters.assignee))) return false;
	}
	return true;
};

// Barra de filtros no padrão do app (Card cinza + Row/Col + Selects allowClear).
const RequestsFilterBar = ({ filters, onChange, users, resultLabel }) => {
	const set = (key, value) => onChange({ ...filters, [key]: value });

	return (
		<Card size="small" className="requests-filter-bar">
			<Row gutter={[12, 12]} align="middle">
				<Col xs={24} md={5}>
					<Select
						value={filters.groupBy}
						onChange={(value) => set('groupBy', value)}
						style={{ width: '100%' }}
						options={[
							{ value: 'status', label: 'Group by: Status' },
							{ value: 'project', label: 'Group by: Project' },
							{ value: 'assignee', label: 'Group by: Assignee' },
						]}
					/>
				</Col>
				<Col xs={24} md={6}>
					<Input.Search
						allowClear
						placeholder="Search requests..."
						value={filters.search}
						onChange={(event) => set('search', event.target.value)}
					/>
				</Col>
				<Col xs={12} md={3}>
					<Select
						allowClear
						placeholder="Project"
						value={filters.project}
						onChange={(value) => set('project', value ?? null)}
						style={{ width: '100%' }}
						options={PROJECTS.map((project) => ({ value: project, label: project }))}
					/>
				</Col>
				<Col xs={12} md={3}>
					<Select
						allowClear
						placeholder="Type"
						value={filters.type}
						onChange={(value) => set('type', value ?? null)}
						style={{ width: '100%' }}
						options={TYPES.map((type) => ({ value: type, label: type }))}
					/>
				</Col>
				<Col xs={12} md={2}>
					<Select
						allowClear
						placeholder="Priority"
						value={filters.priority}
						onChange={(value) => set('priority', value ?? null)}
						style={{ width: '100%' }}
						options={PRIORITIES.map((priority) => ({ value: priority, label: priority }))}
					/>
				</Col>
				<Col xs={12} md={3}>
					<Select
						allowClear
						placeholder="Assignee"
						value={filters.assignee}
						onChange={(value) => set('assignee', value ?? null)}
						style={{ width: '100%' }}
						options={[
							{ value: 'unassigned', label: 'Unassigned' },
							...users.map((user) => ({ value: String(user.id), label: userLabel(user) })),
						]}
					/>
				</Col>
				<Col xs={12} md={2}>
					<Button
						icon={<ClearOutlined />}
						onClick={() => onChange({ ...EMPTY_FILTERS, groupBy: filters.groupBy })}
					>
						Clear
					</Button>
				</Col>
			</Row>
			<div className="requests-filter-bar__result">
				<Text type="secondary">{resultLabel}</Text>
			</div>
		</Card>
	);
};

export default RequestsFilterBar;
