import { Button, Dropdown, Modal } from 'antd';
import {
	DeleteOutlined,
	InboxOutlined,
	MoreOutlined,
	UndoOutlined,
} from '@ant-design/icons';

// Menu de ações do chamado (arquivar/desarquivar, deletar, restaurar), usado
// na lista, no card do board e no drawer — um lugar só para a regra de quais
// itens aparecem. Quem pode: autor ou triage (o back valida de novo).
const RequestActionsMenu = ({ request, canManage, isTriage, onAction, size = 'small' }) => {
	const deleted = Boolean(request.deletedAt);
	const archived = Boolean(request.archivedAt);

	const items = [];
	if (deleted) {
		if (isTriage) {
			items.push({ key: 'restore', icon: <UndoOutlined />, label: 'Restore' });
		}
	} else if (canManage) {
		items.push(archived
			? { key: 'unarchive', icon: <UndoOutlined />, label: 'Unarchive' }
			: { key: 'archive', icon: <InboxOutlined />, label: 'Archive' });
		items.push({ type: 'divider' });
		items.push({ key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true });
	}

	if (!items.length) return null;

	const handleClick = ({ key, domEvent }) => {
		domEvent?.stopPropagation();
		if (key !== 'delete') {
			onAction(request, key);
			return;
		}
		// Deletar some da tela para todo mundo: confirma antes, e a mensagem
		// diz que dá para voltar atrás (é soft delete) para não assustar.
		Modal.confirm({
			title: `Delete ${request.title}?`,
			content: 'It disappears for everyone. Nothing is erased: triage can restore it.',
			okText: 'Delete',
			okButtonProps: { danger: true },
			onOk: () => onAction(request, 'delete'),
		});
	};

	return (
		<Dropdown
			menu={{ items, onClick: handleClick }}
			trigger={['click']}
			placement="bottomRight"
		>
			<Button
				type="text"
				size={size}
				icon={<MoreOutlined />}
				aria-label="Request actions"
				onClick={(event) => event.stopPropagation()}
			/>
		</Dropdown>
	);
};

export default RequestActionsMenu;
