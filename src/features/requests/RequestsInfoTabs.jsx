import { Alert, Table, Tag, Typography } from 'antd';
import { BOARD_LANES, STATUS_COLORS } from './requestsConstants';

const { Title, Paragraph, Text } = Typography;

// Conteúdo estático das abas Workflow e Guidelines (texto do design, em inglês
// — artefatos para o time são sempre em inglês).

// The eight statuses, with who normally moves them. Only the rules listed under
// ENFORCED_RULES are actually blocked by the system: everything else here is
// convention, and the column used to read as if it were a permission.
const WORKFLOW_ROWS = [
	{ status: 'New Request', meaning: 'Created, not yet reviewed. Always starts unassigned.', owner: 'System, on creation' },
	{ status: 'Estimation', meaning: 'Under review — scoping before assigning.', owner: 'Usually Triage' },
	{ status: 'Assigned', meaning: 'Owner defined, work not started.', owner: 'Anyone' },
	{ status: 'Work in Progress', meaning: 'Actively being worked on.', owner: 'Usually the assignee' },
	{ status: 'Awaiting Client Response', meaning: 'Blocked waiting on the requester or a third party.', owner: 'Usually the assignee or Triage' },
	{ status: 'On Hold', meaning: 'Blocked internally — dependency, deploy window, deprioritized.', owner: 'Usually the assignee or Triage' },
	{ status: 'Completed', meaning: 'Work finished, pending validation by the requester.', owner: 'Usually the assignee' },
	{ status: 'Closed', meaning: 'Validated. Lives in the Done lane with Completed.', owner: 'Triage only' },
];

// What the server actually refuses (lib/requests/transitions.js and archive.js).
const ENFORCED_RULES = [
	'Moving to Assigned requires an assignee.',
	'Assigning someone to a brand new request moves it to Assigned on its own.',
	'On Hold, Awaiting Client Response and Completed require a comment.',
	'Only Triage can close a request.',
	'A closed request can only be reopened to Assigned, and keeps its full history.',
];

// Archiving and deleting are a separate axis from status: neither is a step in
// the workflow, and the table above says nothing about them.
const LIFECYCLE_RULES = [
	'Any status can be archived, by the person who opened the request or by Triage. It is for clearing a duplicate or something opened by mistake off the screen.',
	'Archiving is an explicit choice: changing the status of an archived request does not bring it back. Use Unarchive, or the Archived saved view.',
	'Deleting keeps everything (comments, attachments, the Trello card) and only hides it. Triage sees the Deleted view and can restore.',
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
		<Title level={5}>How the screen groups work</Title>
		<Paragraph type="secondary">
			Both the board and the list show four lanes. Each one gathers the statuses below, so a request
			moves through eight statuses but is read as four steps.
		</Paragraph>
		<Table
			size="small"
			rowKey="key"
			pagination={false}
			className="requests-info__lanes"
			dataSource={BOARD_LANES}
			columns={[
				{
					title: 'Lane',
					dataIndex: 'name',
					width: 220,
					render: (name, lane) => <Tag color={lane.color} className="requests-list__group-tag">{name}</Tag>,
				},
				{
					title: 'Statuses it gathers',
					dataIndex: 'statuses',
					render: (statuses) => statuses.map((status) => (
						<Tag key={status} color={STATUS_COLORS[status]} className="requests-list__group-tag">{status}</Tag>
					)),
				},
			]}
		/>

		<Title level={5}>Status workflow</Title>
		<Paragraph type="secondary">
			One item per request. Every request enters as New Request and unassigned.
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
			message="What the system enforces"
			description={
				<ul className="requests-info__rules-list">
					{ENFORCED_RULES.map((rule) => <li key={rule}>{rule}</li>)}
				</ul>
			}
		/>
		<Alert
			type="info"
			className="requests-info__rules"
			message="Archiving and deleting are not statuses"
			description={
				<ul className="requests-info__rules-list">
					{LIFECYCLE_RULES.map((rule) => <li key={rule}>{rule}</li>)}
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
