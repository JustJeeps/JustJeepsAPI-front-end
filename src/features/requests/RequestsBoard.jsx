import { useCallback, useEffect, useRef, useState } from 'react';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { BOARD_LANES, COMMENT_REQUIRED_STATUSES } from './requestsConstants';
import RequestsBoardColumn from './RequestsBoardColumn';
import RequestCommentGateModal from './RequestCommentGateModal';

// Modo Board (kanban): 4 lanes fixas (Requests / Doing / Blocked / Done)
// agregando os 8 status internos. O board é o dono da regra de transição:
// tanto soltar um card numa lane quanto escolher no Select do card passam por
// aqui, e os status que exigem comentário abrem o gate antes do PATCH.
const RequestsBoard = ({ requests, onOpen, onInlinePatch, onArchiveDone }) => {
	const boardRef = useRef(null);
	const [commentGate, setCommentGate] = useState(null); // { requestId, status, comment }
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		const element = boardRef.current;
		if (!element) return undefined;
		return autoScrollForElements({ element });
	}, []);

	// Ponto único de mudança de status no board (drop e Select do card).
	const changeStatus = useCallback(
		(requestId, targetStatus) => {
			if (COMMENT_REQUIRED_STATUSES.includes(targetStatus)) {
				setCommentGate({ requestId, status: targetStatus, comment: '' });
				return;
			}
			onInlinePatch(requestId, { status: targetStatus }, `Status set to ${targetStatus}`);
		},
		[onInlinePatch]
	);

	const handleDropCard = useCallback(
		(requestId, lane) => {
			const request = requests.find((entry) => entry.id === requestId);
			if (!request) return;
			// Lane Requests: volta para Assigned (se tem responsável) ou New Request.
			const targetStatus = lane.dropStatus
				|| (request.assignee_id || request.assignee ? 'Assigned' : 'New Request');
			if (request.status === targetStatus) return;
			changeStatus(requestId, targetStatus);
		},
		[requests, changeStatus]
	);

	const submitCommentGate = async () => {
		const { requestId, status, comment } = commentGate;
		setSaving(true);
		try {
			await onInlinePatch(requestId, { status, comment }, `Status set to ${status}`);
			setCommentGate(null);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div ref={boardRef} className="requests-board">
			{BOARD_LANES.map((lane) => (
				<RequestsBoardColumn
					key={lane.key}
					lane={lane}
					cards={requests.filter((request) => lane.statuses.includes(request.status))}
					onOpen={onOpen}
					onChangeStatus={changeStatus}
					onDropCard={handleDropCard}
					onArchiveDone={lane.key === 'done' ? onArchiveDone : undefined}
				/>
			))}

			<RequestCommentGateModal
				gate={commentGate}
				saving={saving}
				onChange={(comment) => setCommentGate((gate) => ({ ...gate, comment }))}
				onOk={submitCommentGate}
				onCancel={() => setCommentGate(null)}
			/>
		</div>
	);
};

export default RequestsBoard;
