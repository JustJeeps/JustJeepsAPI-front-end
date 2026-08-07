import { useEffect, useRef, useState } from 'react';
import { Button, Popconfirm, Tag, Typography } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import RequestsBoardCard from './RequestsBoardCard';

const { Text } = Typography;

// Lane do board: alvo de drop para cards. Soltar aplica o status alvo da
// lane (mesma lane não aceita drop). A lane Done ganha o botão Archive all,
// que some com os concluídos da tela padrão sem apagar nada.
const RequestsBoardColumn = ({ lane, cards, readOnly = false, emptyText, canManage, isTriage, onOpen, onChangeStatus, onDropCard, onArchiveDone, onRequestAction }) => {
	const columnRef = useRef(null);
	const [dragOver, setDragOver] = useState(false);

	useEffect(() => {
		const element = columnRef.current;
		if (!element || readOnly) return undefined;
		return dropTargetForElements({
			element,
			canDrop: ({ source }) =>
				source.data.type === 'request-card' && source.data.lane !== lane.key,
			onDragEnter: () => setDragOver(true),
			onDragLeave: () => setDragOver(false),
			onDrop: ({ source }) => {
				setDragOver(false);
				onDropCard(source.data.requestId, lane);
			},
		});
	}, [lane, onDropCard, readOnly]);

	return (
		<div
			ref={columnRef}
			className={`requests-board__column${dragOver ? ' requests-board__column--drag-over' : ''}`}
		>
			<div className="requests-board__column-header">
				<Tag color={lane.color} className="requests-list__group-tag">{lane.name}</Tag>
				<Text type="secondary">{cards.length}</Text>
				{onArchiveDone && cards.length > 0 && (
					<Popconfirm
						title={`Archive the ${cards.length} done request${cards.length > 1 ? "s" : ""} shown?`}
						description="Only the cards currently visible in this lane. They stay saved and show up under the Archived view."
						okText="Archive"
						onConfirm={() => onArchiveDone(cards)}
					>
						<Button
							size="small"
							type="text"
							icon={<InboxOutlined />}
							className="requests-board__archive-all"
						>
							Archive all
						</Button>
					</Popconfirm>
				)}
			</div>
			<div className="requests-board__cards">
				{cards.map((request) => (
					<RequestsBoardCard
						key={request.id}
						request={request}
						lane={lane}
						onOpen={onOpen}
						canManage={canManage}
						isTriage={isTriage}
						readOnly={readOnly}
						onChangeStatus={onChangeStatus}
						onRequestAction={onRequestAction}
					/>
				))}
				{!cards.length && (
					<Text type="secondary" italic className="requests-board__empty">
						{readOnly ? (emptyText || 'Nothing here') : 'Drop cards here'}
					</Text>
				)}
			</div>
		</div>
	);
};

export default RequestsBoardColumn;
