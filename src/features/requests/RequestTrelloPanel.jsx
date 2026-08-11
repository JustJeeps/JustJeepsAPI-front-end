import { useState } from 'react';
import { Button, Card, Typography, message } from 'antd';
import { LinkOutlined, SwapOutlined } from '@ant-design/icons';
import { apiErrorMessage } from '../../utils/api';
import { createTrelloCard, moveTrelloCard } from './requestsApi';

const { Text } = Typography;

// Painel do Trello no drawer. Só aparece quando a integração está habilitada
// no back (meta.trello.enabled). O card vive no board do SETOR do chamado:
// criar card / abrir card / sincronizar o card com o board do setor atual
// (retry do auto-move quando o chamado trocou de setor, ou mapping novo).
const RequestTrelloPanel = ({ detail, meta, onUpdated }) => {
	const [creating, setCreating] = useState(false);
	const [syncing, setSyncing] = useState(false);

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

	const handleSync = async () => {
		setSyncing(true);
		try {
			const updated = await moveTrelloCard(detail.id);
			message.success(`Card moved to the ${detail.sector?.name || 'sector'} board`);
			onUpdated(updated);
		} catch (error) {
			message.error(apiErrorMessage(error, 'Failed to move the Trello card'));
		} finally {
			setSyncing(false);
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
					<Button
						block
						icon={<SwapOutlined />}
						loading={syncing}
						onClick={handleSync}
						className="requests-trello__action"
					>
						Sync card to sector board
					</Button>
				</>
			) : (
				<>
					<Text type="secondary">
						No card yet. A card is created automatically on the sector&apos;s board when this
						request moves to Assigned.
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
