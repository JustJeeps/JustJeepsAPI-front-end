import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd';
import { EditOutlined, InboxOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { apiErrorMessage } from '../../utils/api';
import {
	fetchSectors,
	updateSector,
	saveSectorTrelloBoard,
	fetchSectorTrelloBoards,
	fetchSectorTrelloBoardLists,
} from './sectorsApi';
import { fetchUsersLite } from './settingsApi';
import SectorEditModal from './SectorEditModal';

const { Text } = Typography;

// Aba Sectors: um board por setor com N participantes (modelo Trello/ClickUp).
// Substitui a antiga tabela usuário→board: o card do Trello segue o SETOR do
// chamado. Criar setor é triage-only; cada linha é gerenciável por triage ou
// pelos admins daquele setor (o back valida de verdade — aqui só se esconde).
const SectorsPanel = ({ isTriage, adminSectorIds }) => {
	const [sectors, setSectors] = useState(null);
	const [users, setUsers] = useState([]);
	const [error, setError] = useState(null);
	const [boards, setBoards] = useState(null);
	const [listsByBoard, setListsByBoard] = useState({});
	const [savingSectorId, setSavingSectorId] = useState(null);
	const [modal, setModal] = useState({ open: false, sectorId: null });

	const canManage = (sector) => isTriage || (adminSectorIds || []).includes(sector.id);

	const load = useCallback(async () => {
		setError(null);
		try {
			const [sectorsData, usersData] = await Promise.all([fetchSectors(), fetchUsersLite()]);
			setSectors(sectorsData);
			setUsers(usersData);
		} catch (loadError) {
			setError(apiErrorMessage(loadError, 'Failed to load sectors'));
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const loadBoards = async () => {
		try {
			setBoards(await fetchSectorTrelloBoards());
		} catch (boardsError) {
			message.error(apiErrorMessage(boardsError, 'Failed to load boards from Trello'));
		}
	};

	const loadLists = async (boardId) => {
		if (listsByBoard[boardId]) return listsByBoard[boardId];
		const lists = await fetchSectorTrelloBoardLists(boardId);
		setListsByBoard((current) => ({ ...current, [boardId]: lists }));
		return lists;
	};

	const persistBoard = async (sector, payload, successText) => {
		setSavingSectorId(sector.id);
		try {
			await saveSectorTrelloBoard(sector.id, payload);
			message.success(successText);
			await load();
		} catch (saveError) {
			message.error(apiErrorMessage(saveError, 'Failed to save the Trello mapping'));
		} finally {
			setSavingSectorId(null);
		}
	};

	const handleBoardChange = async (sector, boardId) => {
		if (!boardId) {
			await persistBoard(sector, { boardId: null }, `${sector.name} unlinked from Trello`);
			return;
		}
		const board = (boards || []).find((entry) => entry.id === boardId);
		let lists;
		try {
			lists = await loadLists(boardId);
		} catch (listsError) {
			message.error(apiErrorMessage(listsError, 'Failed to load lists for this board'));
			return;
		}
		if (!lists.length) {
			message.error('This board has no lists — create one in Trello first');
			return;
		}
		await persistBoard(
			sector,
			{ boardId, boardName: board.name, listId: lists[0].id, listName: lists[0].name },
			`${sector.name} → ${board.name} / ${lists[0].name}`
		);
	};

	const handleListChange = async (sector, listId) => {
		const mapping = sector.trelloBoard;
		const list = (listsByBoard[mapping.boardId] || []).find((entry) => entry.id === listId);
		if (!list) return;
		await persistBoard(
			sector,
			{ boardId: mapping.boardId, boardName: mapping.boardName, listId: list.id, listName: list.name },
			`${sector.name} → ${mapping.boardName} / ${list.name}`
		);
	};

	const toggleArchive = async (sector) => {
		try {
			await updateSector(sector.id, { archived: !sector.archivedAt });
			message.success(sector.archivedAt ? `${sector.name} unarchived` : `${sector.name} archived`);
			await load();
		} catch (archiveError) {
			message.error(apiErrorMessage(archiveError, 'Failed to archive sector'));
		}
	};

	const columns = [
		{
			title: 'Sector',
			key: 'sector',
			render: (_, sector) => (
				<span>
					<span style={{
						display: 'inline-block',
						width: 10,
						height: 10,
						borderRadius: '50%',
						background: sector.color || '#94a3b8',
						marginRight: 8,
					}}
					/>
					{sector.name}
					{sector.slug === 'general' && <Tag style={{ marginLeft: 8 }}>default</Tag>}
					{sector.archivedAt && <Tag color="orange" style={{ marginLeft: 8 }}>archived</Tag>}
				</span>
			),
		},
		{
			title: 'Members',
			key: 'members',
			render: (_, sector) => (
				sector.members.length
					? sector.members.map((member) => (
						<Tag key={member.id} color={member.role === 'admin' ? 'blue' : undefined}>
							{member.user?.username}{member.role === 'admin' ? ' (admin)' : ''}
						</Tag>
					))
					: <Text type="secondary" italic>triage-managed</Text>
			),
		},
		{
			title: 'Requests',
			key: 'requests',
			width: 90,
			align: 'center',
			render: (_, sector) => sector.requestCount ?? 0,
		},
		{
			title: 'Trello board',
			key: 'board',
			width: 240,
			render: (_, sector) => (
				<Select
					size="small"
					variant="borderless"
					allowClear
					placeholder="No board"
					style={{ width: '100%' }}
					disabled={!canManage(sector)}
					value={sector.trelloBoard?.boardId}
					loading={savingSectorId === sector.id}
					options={(boards || (sector.trelloBoard
						? [{ id: sector.trelloBoard.boardId, name: sector.trelloBoard.boardName }]
						: []
					)).map((board) => ({ value: board.id, label: board.name }))}
					onChange={(value) => handleBoardChange(sector, value ?? null)}
					onDropdownVisibleChange={(open) => { if (open && boards === null) loadBoards(); }}
				/>
			),
		},
		{
			title: 'List',
			key: 'list',
			width: 190,
			render: (_, sector) => {
				const mapping = sector.trelloBoard;
				if (!mapping) return <Text type="secondary" italic>—</Text>;
				const lists = listsByBoard[mapping.boardId];
				return (
					<Select
						size="small"
						variant="borderless"
						style={{ width: '100%' }}
						disabled={!canManage(sector)}
						value={mapping.listId}
						loading={savingSectorId === sector.id}
						options={(lists || [{ id: mapping.listId, name: mapping.listName }]).map((list) => ({
							value: list.id,
							label: list.name,
						}))}
						onDropdownVisibleChange={(open) => {
							if (open) loadLists(mapping.boardId).catch(() => {});
						}}
						onChange={(value) => handleListChange(sector, value)}
					/>
				);
			},
		},
		{
			title: '',
			key: 'actions',
			width: 90,
			render: (_, sector) => canManage(sector) && (
				<Space size={4}>
					<Button
						type="text"
						size="small"
						icon={<EditOutlined />}
						onClick={() => setModal({ open: true, sectorId: sector.id })}
					/>
					{isTriage && sector.slug !== 'general' && (
						<Popconfirm
							title={sector.archivedAt ? 'Unarchive this sector?' : 'Archive this sector?'}
							description={sector.archivedAt ? undefined : 'Only possible when it has no active requests.'}
							onConfirm={() => toggleArchive(sector)}
						>
							<Button type="text" size="small" icon={<InboxOutlined />} />
						</Popconfirm>
					)}
				</Space>
			),
		},
	];

	const editingSector = modal.sectorId
		? (sectors || []).find((sector) => sector.id === modal.sectorId) || null
		: null;

	return (
		<Card
			title="Sectors"
			className="settings-card"
			extra={(
				<Space>
					<Text type="secondary">Cards are created on the sector&apos;s board</Text>
					<Button icon={<ReloadOutlined />} size="small" onClick={load} />
					{isTriage && (
						<Button
							type="primary"
							size="small"
							icon={<PlusOutlined />}
							onClick={() => setModal({ open: true, sectorId: null })}
						>
							New sector
						</Button>
					)}
				</Space>
			)}
		>
			{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
			<Table
				rowKey="id"
				size="small"
				columns={columns}
				dataSource={sectors || []}
				loading={sectors === null && !error}
				pagination={false}
			/>
			<SectorEditModal
				open={modal.open}
				sector={editingSector}
				users={users}
				onClose={() => setModal({ open: false, sectorId: null })}
				onChanged={load}
			/>
		</Card>
	);
};

export default SectorsPanel;
