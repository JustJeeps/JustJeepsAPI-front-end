import { useState } from 'react';
import { Avatar, Button, Empty, Input, Typography } from 'antd';
import { relativeTime, userInitials, userLabel } from './requestsConstants';

const { Text } = Typography;

// Thread de comentários. Todo mundo que abre o chamado lê tudo: não existe
// comentário escondido (o "Internal note" prometia isso e nunca escondeu nada,
// removido em 2026-08-07).
const RequestComments = ({ comments = [], onSubmit, submitting }) => {
	const [body, setBody] = useState('');

	const handleSubmit = async () => {
		if (!body.trim()) return;
		const ok = await onSubmit({ body: body.trim() });
		if (ok) setBody('');
	};

	return (
		<div className="requests-comments">
			{comments.length === 0 && (
				<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No comments yet" />
			)}
			{comments.map((comment) => (
				<div key={comment.id} className="requests-comments__item">
					<Avatar size={28} style={{ background: '#1e88e5', fontSize: 12 }}>
						{userInitials(comment.author)}
					</Avatar>
					<div className="requests-comments__content">
						<div className="requests-comments__meta">
							<Text strong>{userLabel(comment.author)}</Text>
							<Text type="secondary">{relativeTime(comment.createdAt)}</Text>
						</div>
						<Text className="requests-comments__body">{comment.body}</Text>
					</div>
				</div>
			))}

			<div className="requests-comments__composer">
				<Input.TextArea
					rows={3}
					placeholder="Write a comment…"
					value={body}
					onChange={(event) => setBody(event.target.value)}
				/>
				<div className="requests-comments__composer-actions">
					<Button type="primary" onClick={handleSubmit} loading={submitting} disabled={!body.trim()}>
						Comment
					</Button>
				</div>
			</div>
		</div>
	);
};

export default RequestComments;
