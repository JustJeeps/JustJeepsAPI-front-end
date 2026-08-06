import { useCallback, useEffect, useRef, useState } from 'react';
import { Input, Modal, Typography } from 'antd';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { BOARD_LANES, COMMENT_REQUIRED_STATUSES } from './requestsConstants';
import RequestsBoardColumn from './RequestsBoardColumn';

const { Text } = Typography;

// Modo Board (kanban): 4 lanes fixas (Requests / Doing / Blocked / Done)
// agregando os 8 status internos. Soltar um card na lane aplica o status
// alvo dela; Blocked/Done exigem comentário na transição, então o drop abre
// o mesmo gate de comentário do drawer antes de disparar o PATCH.
const RequestsBoard = ({ requests, onOpen, onInlinePatch, onArchiveDone }) => {
	const boardRef = useRef(null);
	const [commentGate, setCommentGate] = useState(null); // { requestId, status, comment }

	useEffect(() => {
		const element = boardRef.current;
		if (!element) return undefined;
		return autoScrollForElements({ element });
	}, []);

	const handleDropCard = useCallback(
		(requestId, lane) => {
			const request = requests.find((entry) => entry.id === requestId);
			if (!request) return;
			// Lane Requests: volta para Assigned (se tem responsável) ou New Request.
			const targetStatus = lane.dropStatus
				|| (request.assignee_id || request.assignee ? 'Assigned' : 'New Request');
			if (request.status === targetStatus) return;
			if (COMMENT_REQUIRED_STATUSES.includes(targetStatus)) {
				setCommentGate({ requestId, status: targetStatus, comment: '' });
				return;
			}
			onInlinePatch(requestId, { status: targetStatus }, `Status set to ${targetStatus}`);
		},
		[requests, onInlinePatch]
	);

	const submitCommentGate = async () => {
		const { requestId, status, comment } = commentGate;
		await onInlinePatch(requestId, { status, comment }, `Status set to ${status}`);
		setCommentGate(null);
	};

	return (
		<div ref={boardRef} className="requests-board">
			{BOARD_LANES.map((lane) => (
				<RequestsBoardColumn
					key={lane.key}
					lane={lane}
					cards={requests.filter((request) => lane.statuses.includes(request.status))}
					onOpen={onOpen}
					onInlinePatch={onInlinePatch}
					onDropCard={handleDropCard}
					onArchiveDone={lane.key === 'done' ? onArchiveDone : undefined}
				/>
			))}

			<Modal
				open={Boolean(commentGate)}
				title={`Move to ${commentGate?.status}`}
				okText="Move"
				onOk={submitCommentGate}
				okButtonProps={{ disabled: !commentGate?.comment.trim() }}
				onCancel={() => setCommentGate(null)}
				destroyOnHidden
			>
				<Text type="secondary">A comment is required for this status.</Text>
				<Input.TextArea
					autoSize={{ minRows: 3 }}
					style={{ marginTop: 10 }}
					value={commentGate?.comment}
					onChange={(event) =>
						setCommentGate((gate) => ({ ...gate, comment: event.target.value }))
					}
					placeholder="Why is this request moving?"
				/>
			</Modal>
		</div>
	);
};

export default RequestsBoard;
