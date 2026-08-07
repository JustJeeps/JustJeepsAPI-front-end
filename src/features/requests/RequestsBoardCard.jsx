import { useEffect, useRef, useState } from 'react';
import { Avatar, Card, Select, Tag, Typography } from 'antd';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import RequestActionsMenu from './RequestActionsMenu';
import {
	PRIORITY_COLORS,
	STATUS_COLORS,
	STATUS_NAMES,
	requestRef,
	userInitials,
	userLabel,
} from './requestsConstants';

const { Text } = Typography;

// Card do board: arrastável entre lanes via pragmatic-drag-and-drop. Como as
// lanes agregam status, o card mostra a tag do status exato. O Select
// "Move to" é a alternativa por teclado (DnD nativo é só mouse); os dois
// caminhos passam pelo onChangeStatus do board, que aplica o gate de
// comentário antes do PATCH — o back valida de novo (409 vira toast).
const RequestsBoardCard = ({ request, lane, canManage, isTriage, onOpen, onChangeStatus, onRequestAction }) => {
	const cardRef = useRef(null);
	const [dragging, setDragging] = useState(false);

	useEffect(() => {
		const element = cardRef.current;
		if (!element) return undefined;
		return draggable({
			element,
			getInitialData: () => ({ type: 'request-card', requestId: request.id, lane: lane.key }),
			onDragStart: () => setDragging(true),
			onDrop: () => setDragging(false),
		});
	}, [request.id, lane.key]);

	return (
		<div ref={cardRef} className={dragging ? 'requests-board__card--dragging' : undefined}>
			<Card
				size="small"
				hoverable
				className="requests-board__card"
				onClick={() => onOpen(request.id)}
			>
				<div className="requests-board__card-top">
					<Text type="secondary" className="requests-board__card-id">{requestRef(request.id)}</Text>
					<Tag
						color={STATUS_COLORS[request.status]}
						className="requests-board__card-status"
					>
						{request.status}
					</Tag>
					<RequestActionsMenu
						request={request}
						canManage={canManage?.(request)}
						isTriage={isTriage}
						onAction={onRequestAction}
					/>
				</div>
				<div className="requests-board__card-title">{request.title}</div>
				<div className="requests-board__card-footer">
					<Tag className="requests-board__card-project">{request.project}</Tag>
					<span
						className="requests-list__priority-dot"
						style={{ background: PRIORITY_COLORS[request.priority] }}
						title={request.priority}
					/>
					<Avatar
						size={22}
						style={{ background: request.assignee ? '#1e88e5' : '#c8c8c8', fontSize: 11, marginLeft: 'auto' }}
						title={userLabel(request.assignee)}
					>
						{userInitials(request.assignee)}
					</Avatar>
				</div>
				<div onClick={(event) => event.stopPropagation()}>
					<Select
						size="small"
						variant="borderless"
						value={request.status}
						style={{ width: '100%', marginTop: 6 }}
						onChange={(value) => onChangeStatus(request.id, value)}
						options={STATUS_NAMES.map((name) => ({ value: name, label: `Move to: ${name}` }))}
					/>
				</div>
			</Card>
		</div>
	);
};

export default RequestsBoardCard;
