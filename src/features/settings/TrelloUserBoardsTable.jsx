import { useEffect, useState } from 'react';
import { Alert, Avatar, Button, Card, Select, Table, Typography, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { apiErrorMessage } from '../../utils/api';
import { userInitials, userLabel } from '../requests/requestsConstants';
import { fetchTrelloBoards, fetchTrelloBoardLists, saveTrelloUserBoard } from './settingsApi';

const { Text } = Typography;

// Mapeamento usuário → board/lista. Selects inline no padrão da lista de
// requests (borderless + PATCH imediato + toast). Trocar o board pré-seleciona
// a primeira lista e já persiste board+lista numa única chamada; limpar o
// board remove o mapeamento (usuário fica sem card automático).
const TrelloUserBoardsTable = ({ configured, users, userBoards, onChanged }) => {
	const [boards, setBoards] = useState(null);
	const [boardsError, setBoardsError] = useState(null);
	const [listsByBoard, setListsByBoard] = useState({});
	const [savingUserId, setSavingUserId] = useState(null);

	const loadBoards = async () => {
		setBoardsError(null);
		try {
			setBoards(await fetchTrelloBoards());
		} catch (error) {
			setBoards(null);
			setBoardsError(apiErrorMessage(error, 'Failed to load boards from Trello'));
		}
	};

	useEffect(() => {
		if (configured) loadBoards();
	}, [configured]);

	const loadLists = async (boardId) => {
		if (listsByBoard[boardId]) return listsByBoard[boardId];
		const lists = await fetchTrelloBoardLists(boardId);
		setListsByBoard((current) => ({ ...current, [boardId]: lists }));
		return lists;
	};

	const mappingOf = (userId) => userBoards.find((entry) => entry.userId === userId) || null;

	const persist = async (userId, payload, successText) => {
		setSavingUserId(userId);
		try {
			await saveTrelloUserBoard(userId, payload);
			message.success(successText);
			await onChanged();
		} catch (error) {
			message.error(apiErrorMessage(error, 'Failed to save mapping'));
		} finally {
			setSavingUserId(null);
		}
	};

	const handleBoardChange = async (user, boardId) => {
		if (!boardId) {
			await persist(user.id, { boardId: null }, `${userLabel(user)} unlinked from Trello`);
			return;
		}
		const board = boards.find((entry) => entry.id === boardId);
		let lists;
		try {
			lists = await loadLists(boardId);
		} catch (error) {
			message.error(apiErrorMessage(error, 'Failed to load lists for this board'));
			return;
		}
		if (!lists.length) {
			message.error('This board has no lists — create one in Trello first');
			return;
		}
		await persist(
			user.id,
			{ boardId, boardName: board.name, listId: lists[0].id, listName: lists[0].name },
			`${userLabel(user)} → ${board.name} / ${lists[0].name}`
		);
	};

	const handleListChange = async (user, listId) => {
		const mapping = mappingOf(user.id);
		const list = (listsByBoard[mapping.boardId] || []).find((entry) => entry.id === listId);
		if (!list) return;
		await persist(
			user.id,
			{ boardId: mapping.boardId, boardName: mapping.boardName, listId: list.id, listName: list.name },
			`${userLabel(user)} → ${mapping.boardName} / ${list.name}`
		);
	};

	if (!configured) {
		return (
			<Card title="User boards" className="settings-card">
				<Alert
					type="warning"
					showIcon
					message="Save and test the credentials first"
					description="The board list comes from the Trello account configured above."
				/>
			</Card>
		);
	}

	if (boardsError) {
		return (
			<Card title="User boards" className="settings-card">
				<Alert
					type="error"
					showIcon
					message={boardsError}
					action={<Button size="small" icon={<ReloadOutlined />} onClick={loadBoards}>Retry</Button>}
				/>
			</Card>
		);
	}

	const columns = [
		{
			title: 'User',
			key: 'user',
			render: (_, user) => (
				<span className="settings-user">
					<Avatar size={24} style={{ background: '#1e88e5', fontSize: 11 }}>
						{userInitials(user)}
					</Avatar>
					<span>
						{userLabel(user)}
						<Text type="secondary" className="settings-user__username"> @{user.username}</Text>
					</span>
				</span>
			),
		},
		{
			title: 'Trello board',
			key: 'board',
			width: 280,
			render: (_, user) => {
				const mapping = mappingOf(user.id);
				return (
					<Select
						size="small"
						variant="borderless"
						allowClear
						placeholder="No board"
						style={{ width: '100%' }}
						value={mapping?.boardId}
						loading={boards === null || savingUserId === user.id}
						options={(boards || []).map((board) => ({ value: board.id, label: board.name }))}
						onChange={(value) => handleBoardChange(user, value ?? null)}
						onDropdownVisibleChange={(open) => { if (open && boards === null) loadBoards(); }}
					/>
				);
			},
		},
		{
			title: 'List',
			key: 'list',
			width: 220,
			render: (_, user) => {
				const mapping = mappingOf(user.id);
				if (!mapping) return <Text type="secondary" italic>—</Text>;
				const lists = listsByBoard[mapping.boardId];
				return (
					<Select
						size="small"
						variant="borderless"
						style={{ width: '100%' }}
						value={mapping.listId}
						loading={savingUserId === user.id}
						options={(lists || [{ id: mapping.listId, name: mapping.listName }]).map((list) => ({
							value: list.id,
							label: list.name,
						}))}
						onDropdownVisibleChange={(open) => {
							if (open) loadLists(mapping.boardId).catch(() => {});
						}}
						onChange={(value) => handleListChange(user, value)}
					/>
				);
			},
		},
	];

	return (
		<Card
			title="User boards"
			className="settings-card"
			extra={<Text type="secondary">Cards are created on the assignee&apos;s board</Text>}
		>
			<Table
				rowKey="id"
				size="small"
				columns={columns}
				dataSource={users}
				pagination={false}
			/>
		</Card>
	);
};

export default TrelloUserBoardsTable;
