import { useState } from 'react';
import { Avatar, Button, Input, Popconfirm, Space, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { canRemoveComment, displayName, formatDateTime, userInitials } from './replacementsUtils';

const { Text } = Typography;

// Comments of one association: who wrote each one and when. Comments are not
// edited; new guidance is a new comment and an outdated one can be removed by
// its author or a manager. `onAdd` / `onRemove` are optional (read-only in
// the lookup drawer).
const ReplacementComments = ({ comments = [], user, managers = [], onAdd, onRemove, busy = false }) => {
	const [draft, setDraft] = useState('');

	const submit = async () => {
		const body = draft.trim();
		if (!body || !onAdd) return;
		// onAdd resolves to true on success; a failed save keeps the text.
		const saved = await onAdd(body);
		if (saved !== false) setDraft('');
	};

	return (
		<div className="replacement-comments">
			{comments.length === 0 && <Text type="secondary">No comments yet.</Text>}
			{comments.map((comment) => (
				<div key={comment.id} className="replacement-comments__row">
					<Avatar size="small" style={{ background: '#145DA0', color: '#D4F1F4', flex: 'none' }}>
						{userInitials(comment.author)}
					</Avatar>
					<div className="replacement-comments__body">
						<div>
							<Text strong>{displayName(comment.author)}</Text>{' '}
							<Text type="secondary" className="replacement-comments__meta">{formatDateTime(comment.createdAt)}</Text>
						</div>
						<div>{comment.body}</div>
					</div>
					{onRemove && canRemoveComment({ comment, user, managers }) && (
						<Popconfirm
							title="Remove this comment?"
							okText="Remove"
							okButtonProps={{ danger: true }}
							onConfirm={() => onRemove(comment.id)}
						>
							<Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label="Remove comment" disabled={busy} />
						</Popconfirm>
					)}
				</div>
			))}
			{onAdd && (
				<Space.Compact block className="replacement-comments__form">
					<Input
						placeholder="Add a comment (example: Customer approval is required.)"
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						onPressEnter={submit}
						maxLength={2000}
						disabled={busy}
					/>
					<Button type="primary" onClick={submit} disabled={!draft.trim()} loading={busy}>Add</Button>
				</Space.Compact>
			)}
		</div>
	);
};

export default ReplacementComments;
