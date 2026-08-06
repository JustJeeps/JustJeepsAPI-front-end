import { useState } from 'react';
import { Button, Card, Typography, message } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import { apiErrorMessage } from '../../utils/api';
import { createTrelloCard } from './requestsApi';

const { Text } = Typography;

// Painel do Trello no drawer. Só aparece quando a integração está habilitada
// no back (meta.trello.enabled). One-way: criar card / abrir card.
const RequestTrelloPanel = ({ detail, meta, onUpdated }) => {
	const [creating, setCreating] = useState(false);

	if (!meta?.trello?.enabled) return null;

	const handleCreate = async () => {
		setCreating(true);
		try {
			const updated = await createTrelloCard(detail.id);
			message.success('Trello card created');
			onUpdated(updated);
		} catch (error) {
			message.error(apiErrorMessage(error, 'Failed to create Trello card'));
		} finally {
			setCreating(false);
		}
	};

	return (
		<Card size="small" className="requests-trello" title="Trello">
			{detail.trelloCardUrl ? (
				<>
					<Text type="secondary">Card linked to this request.</Text>
					<Button
						type="primary"
						block
						icon={<LinkOutlined />}
						href={detail.trelloCardUrl}
						target="_blank"
					rel="noreferrer"
						className="requests-trello__action"
					>
						Open Trello card
					</Button>
				</>
			) : (
				<>
					<Text type="secondary">
						No card yet. A card is created automatically when this request moves to Assigned.
					</Text>
					<Button block loading={creating} onClick={handleCreate} className="requests-trello__action">
						Create card now
					</Button>
				</>
			)}
		</Card>
	);
};

export default RequestTrelloPanel;
