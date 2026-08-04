import { Alert, Table, Tag, Typography } from 'antd';
import { STATUS_COLORS } from './requestsConstants';

const { Title, Paragraph, Text } = Typography;

// Conteúdo estático das abas Workflow e Guidelines (texto do design, em inglês
// — artefatos para o time são sempre em inglês).

const WORKFLOW_ROWS = [
	{ status: 'New Request', meaning: 'Created, not yet reviewed. Always Unassigned.', owner: 'System, on creation' },
	{ status: 'Estimation', meaning: 'Under review by Triage — scoping before assigning.', owner: 'Triage' },
	{ status: 'Assigned', meaning: 'Owner defined, work not started.', owner: 'Anyone' },
	{ status: 'Work in Progress', meaning: 'Actively being worked on.', owner: 'Assignee' },
	{ status: 'Awaiting Client Response', meaning: 'Blocked waiting on the requester or a third party.', owner: 'Assignee / Triage' },
	{ status: 'On Hold', meaning: 'Blocked internally — dependency, deploy window, deprioritized.', owner: 'Assignee / Triage' },
	{ status: 'Completed', meaning: 'Work finished, pending validation by the requester.', owner: 'Assignee' },
	{ status: 'Closed', meaning: 'Validated and archived. Collapsed at the bottom of the list.', owner: 'Triage' },
];

const TRANSITION_RULES = [
	'Moving to Assigned requires an assignee.',
	'On Hold and Awaiting Client Response require a comment explaining the blocker.',
	'Completed requires a comment describing what was done and where it was deployed.',
	'Reopening a Closed request returns it to Assigned and keeps full history.',
];

const GUIDELINES = [
	{ title: 'One item per request', body: 'If your email had five unrelated items, create five requests. Bundled items cannot be assigned, tracked or closed independently.' },
	{ title: 'Write a title someone else can scan', body: 'What is broken or wanted, and where. "Shipping fee showing $0.00 for Alberta orders" — not "website problem".' },
	{ title: 'Always pick a Project and a Type', body: 'Project routes the request to the right team; Type tells Triage whether this is a bug, a data issue, an idea or an investigation.' },
	{ title: 'Attach evidence', body: 'Screenshot, order ID, the URL where it happens, and the expected vs actual behaviour. This removes one round of back-and-forth.' },
	{ title: 'Assigning', body: 'Anyone can assign a request (including to themselves). New requests still enter as Unassigned so Triage can review and estimate first. Only Triage can close.' },
	{ title: 'Follow up in the request, not by email', body: 'Status, comments and history live on the request. Comment there and the assignee and requester both see it.' },
];

export const WorkflowTab = () => (
	<div className="requests-info">
		<Title level={5}>Status workflow</Title>
		<Paragraph type="secondary">
			One item per request. Every request enters as New Request and Unassigned; only Triage can close.
		</Paragraph>
		<Table
			size="small"
			rowKey="status"
			pagination={false}
			dataSource={WORKFLOW_ROWS}
			columns={[
				{
					title: 'Status',
					dataIndex: 'status',
					width: 220,
					render: (status) => <Tag color={STATUS_COLORS[status]} className="requests-list__group-tag">{status}</Tag>,
				},
				{ title: 'Meaning', dataIndex: 'meaning' },
				{ title: 'Who sets it', dataIndex: 'owner', width: 200 },
			]}
		/>
		<Alert
			type="warning"
			className="requests-info__rules"
			message="Transition rules"
			description={
				<ul className="requests-info__rules-list">
					{TRANSITION_RULES.map((rule) => <li key={rule}>{rule}</li>)}
				</ul>
			}
		/>
	</div>
);

export const GuidelinesTab = () => (
	<div className="requests-info">
		<Title level={5}>Request creation guidelines</Title>
		<div className="requests-info__guidelines">
			{GUIDELINES.map((guideline) => (
				<div key={guideline.title} className="requests-info__guideline">
					<Text strong>{guideline.title}</Text>
					<Paragraph type="secondary">{guideline.body}</Paragraph>
				</div>
			))}
		</div>
	</div>
);
