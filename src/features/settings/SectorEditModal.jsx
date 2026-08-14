import { useEffect, useState } from 'react';
import { Button, Divider, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { apiErrorMessage } from '../../utils/api';
import { userLabel } from '../requests/requestsConstants';
import { createSector, updateSector, setSectorMember, removeSectorMember } from './sectorsApi';

const { Text } = Typography;

// Mesma paleta dos status (espelho de config/sectors.js no back).
const SECTOR_COLORS = ['#a855f7', '#0b8ce9', '#f97316', '#10a35a', '#fbbf24', '#ef4444', '#2563eb', '#1a8c5c'];

const ROLE_OPTIONS = [
	{ value: 'admin', label: 'Admin' },
	{ value: 'member', label: 'Member' },
];

// Criar/editar setor + gestão de participantes. Nome/cor salvam no OK;
// mudanças de membro persistem na hora (padrão inline + toast do settings).
// Regras reais no back: LAST_ADMIN vira toast, criação é triage-only.
const SectorEditModal = ({ open, sector, users, onClose, onChanged }) => {
	const isCreate = !sector;
	const [name, setName] = useState('');
	const [color, setColor] = useState(SECTOR_COLORS[0]);
	const [saving, setSaving] = useState(false);
	const [memberBusy, setMemberBusy] = useState(null);
	const [addUserId, setAddUserId] = useState(null);

	useEffect(() => {
		if (open) {
			setName(sector?.name || '');
			setColor(sector?.color || SECTOR_COLORS[0]);
			setAddUserId(null);
		}
	}, [open, sector]);

	const members = sector?.members || [];
	const memberIds = new Set(members.map((member) => member.user_id));
	const availableUsers = (users || []).filter((user) => !memberIds.has(user.id));

	const handleOk = async () => {
		setSaving(true);
		try {
			if (isCreate) {
				await createSector({ name, color });
				message.success(`Sector "${name.trim()}" created — now add its admin`);
			} else if (name.trim() !== sector.name || (color || null) !== (sector.color || null)) {
				await updateSector(sector.id, { name, color });
				message.success('Sector updated');
			}
			await onChanged();
			onClose();
		} catch (error) {
			message.error(apiErrorMessage(error, 'Failed to save sector'));
		} finally {
			setSaving(false);
		}
	};

	const withMember = async (userId, action, successText) => {
		setMemberBusy(userId);
		try {
			await action();
			message.success(successText);
			await onChanged();
		} catch (error) {
			message.error(apiErrorMessage(error, 'Failed to update members'));
		} finally {
			setMemberBusy(null);
		}
	};

	const memberColumns = [
		{
			title: 'Member',
			key: 'user',
			render: (_, member) => (
				<span>
					{userLabel(member.user)}
					<Text type="secondary"> @{member.user?.username}</Text>
				</span>
			),
		},
		{
			title: 'Role',
			key: 'role',
			width: 130,
			render: (_, member) => (
				<Select
					size="small"
					variant="borderless"
					value={member.role}
					loading={memberBusy === member.user_id}
					options={ROLE_OPTIONS}
					onChange={(role) => withMember(
						member.user_id,
						() => setSectorMember(sector.id, member.user_id, role),
						`${member.user?.username} is now ${role}`
					)}
				/>
			),
		},
		{
			title: '',
			key: 'remove',
			width: 40,
			render: (_, member) => (
				<Button
					type="text"
					size="small"
					danger
					icon={<DeleteOutlined />}
					loading={memberBusy === member.user_id}
					onClick={() => withMember(
						member.user_id,
						() => removeSectorMember(sector.id, member.user_id),
						`${member.user?.username} removed from ${sector.name}`
					)}
				/>
			),
		},
	];

	return (
		<Modal
			title={isCreate ? 'New sector' : `Edit sector — ${sector.name}`}
			open={open}
			onOk={handleOk}
			onCancel={onClose}
			okText={isCreate ? 'Create' : 'Save'}
			confirmLoading={saving}
			okButtonProps={{ disabled: !name.trim() }}
			destroyOnClose
		>
			<Space direction="vertical" size={12} style={{ width: '100%' }}>
				<div>
					<Text type="secondary">Name</Text>
					<Input
						value={name}
						maxLength={60}
						placeholder="e.g. Sales, IT, Purchasing"
						onChange={(event) => setName(event.target.value)}
					/>
				</div>
				<div>
					<Text type="secondary">Color</Text>
					<div>
						{SECTOR_COLORS.map((option) => (
							<Tag.CheckableTag
								key={option}
								checked={color === option}
								onChange={() => setColor(option)}
							>
								<span style={{
									display: 'inline-block',
									width: 14,
									height: 14,
									borderRadius: '50%',
									background: option,
									verticalAlign: 'middle',
								}}
								/>
							</Tag.CheckableTag>
						))}
					</div>
				</div>

				{!isCreate && (
					<>
						<Divider style={{ margin: '4px 0' }}>Members</Divider>
						<Table
							rowKey="id"
							size="small"
							columns={memberColumns}
							dataSource={members}
							pagination={false}
							locale={{ emptyText: 'No members yet — triage manages this sector until an admin is added' }}
						/>
						<Space.Compact style={{ width: '100%' }}>
							<Select
								style={{ flex: 1 }}
								placeholder="Add a member…"
								value={addUserId}
								showSearch
								optionFilterProp="label"
								options={availableUsers.map((user) => ({ value: user.id, label: `${userLabel(user)} (@${user.username})` }))}
								onChange={setAddUserId}
							/>
							<Button
								type="primary"
								disabled={!addUserId}
								loading={memberBusy === addUserId}
								onClick={() => {
									const user = availableUsers.find((entry) => entry.id === addUserId);
									withMember(
										addUserId,
										() => setSectorMember(sector.id, addUserId, members.length ? 'member' : 'admin'),
										`${user?.username} added to ${sector.name}`
									).then(() => setAddUserId(null));
								}}
							>
								Add
							</Button>
						</Space.Compact>
						<Text type="secondary" style={{ fontSize: 12 }}>
							The first member added becomes admin. Every sector needs at least one admin — demoting or
							removing the last one is blocked (triage can override).
						</Text>
					</>
				)}
			</Space>
		</Modal>
	);
};

export default SectorEditModal;
