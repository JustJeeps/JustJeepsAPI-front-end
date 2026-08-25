import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Segmented, Select, Tag, Typography, Upload, message } from 'antd';
import { InboxOutlined, LinkOutlined } from '@ant-design/icons';
import { apiErrorMessage } from '../../utils/api';
import { createRequest, uploadAttachments } from './requestsApi';
import {
	PRIORITIES,
	PRIORITY_COLORS,
	PROJECTS,
	TYPES,
	assignableUsers,
	creatableSectors,
	findSimilarRequest,
	pruneAssigneeSelection,
	requestRef,
	userLabel,
} from './requestsConstants';

const { Text } = Typography;

// Chips de setor (value/onChange injetados pelo Form.Item): mesmo vocabulário
// visual dos tabs de setor da página — dot colorido + nome. Com muitos
// setores o campo degrada para Select (chips não escalam horizontalmente).
const SectorChipsField = ({ value, onChange, sectors }) => {
	if (sectors.length > 6) {
		return (
			<Select
				value={value}
				onChange={onChange}
				placeholder="Sector"
				options={sectors.map((sector) => ({ value: sector.id, label: sector.name }))}
			/>
		);
	}
	return (
		<div className="requests-new__chips">
			{sectors.map((sector) => (
				<Tag.CheckableTag
					key={sector.id}
					checked={value === sector.id}
					onChange={() => onChange(sector.id)}
					className="requests-new__chip"
				>
					<span
						className="requests-new__chip-dot"
						style={{ background: sector.color || '#94a3b8' }}
					/>
					{sector.name}
				</Tag.CheckableTag>
			))}
		</div>
	);
};

// Modal de criação, na ordem em que a pessoa pensa: O QUE aconteceu (summary
// + descrição) → PARA ONDE vai (setor em chips coloridos, responsáveis,
// projeto, tipo, prioridade) → extras (link, anexos). Campos outlined com
// label sobre o fundo branco do modal — contraste vem da borda padrão do
// AntD, sem headline borderless. Um chamado por assunto (RF01).
const NewRequestModal = ({ open, onClose, meta, users = [], isTriage = false, defaultSectorId, existingRequests, onCreated }) => {
	const [form] = Form.useForm();
	const [submitting, setSubmitting] = useState(false);
	const [fileList, setFileList] = useState([]);

	const title = Form.useWatch('title', form);
	const similar = findSimilarRequest(title, existingRequests || []);
	const storageEnabled = Boolean(meta?.attachments?.enabled);

	// Setor: obrigatório. Não-triage só vê General + setores dos quais é membro
	// (o back valida de verdade). Default = tab ativo na página, senão General.
	const sectors = creatableSectors(meta, isTriage);
	const fallbackSectorId = sectors.find((sector) => sector.slug === 'general')?.id ?? sectors[0]?.id;
	useEffect(() => {
		if (open) form.setFieldsValue({ sectorId: defaultSectorId ?? fallbackSectorId });
	}, [open, defaultSectorId, fallbackSectorId, form]);

	// Assignees (opcional, primeiro = primário): só membros do setor escolhido —
	// mesma regra do drawer, com request sintético (chamado ainda não existe).
	// Trocar de setor poda a seleção inválida em silêncio: as opções do select
	// já mudaram, e id invisível garantiria um 409 no POST (o back decide).
	const sectorIdValue = Form.useWatch('sectorId', form);
	const assigneeOptions = assignableUsers(users, meta, { sector: { id: sectorIdValue }, assignees: [] });
	useEffect(() => {
		const selected = form.getFieldValue('assigneeIds') || [];
		const pruned = pruneAssigneeSelection(selected, meta, sectorIdValue);
		if (pruned.length !== selected.length) form.setFieldsValue({ assigneeIds: pruned });
	}, [sectorIdValue, meta, form]);

	const handleClose = () => {
		form.resetFields();
		setFileList([]);
		onClose();
	};

	const handleSubmit = async (values) => {
		setSubmitting(true);
		try {
			const created = await createRequest({
				title: values.title.trim(),
				description: values.description.trim(),
				project: values.project,
				type: values.type,
				priority: values.priority,
				sectorId: values.sectorId,
				links: values.link?.trim() ? [values.link.trim()] : [],
				...(values.assigneeIds?.length ? { assigneeIds: values.assigneeIds } : {}),
			});

			if (fileList.length && storageEnabled) {
				try {
					await uploadAttachments(created.id, fileList.map((file) => file.originFileObj || file));
				} catch (uploadError) {
					message.warning(
						`${requestRef(created.id)} created, but attachments failed: ${apiErrorMessage(uploadError)}`
					);
				}
			}

			form.resetFields();
			setFileList([]);
			await onCreated(created);
		} catch (error) {
			message.error(apiErrorMessage(error, 'Failed to create request'));
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Modal
			open={open}
			title="New Request"
			onCancel={handleClose}
			width={700}
			destroyOnHidden
			footer={(
				<div className="requests-new__footer">
					<Text type="secondary" className="requests-new__footer-note">
						One request per issue, please.
					</Text>
					<Button onClick={handleClose}>Cancel</Button>
					<Button type="primary" danger loading={submitting} onClick={() => form.submit()}>
						Create Request
					</Button>
				</div>
			)}
		>
			<Form
				form={form}
				layout="vertical"
				onFinish={handleSubmit}
				initialValues={{ priority: 'Normal' }}
				requiredMark={false}
				className="requests-new__form"
			>
				<Text type="secondary" className="requests-new__intro">
					Use this form to report an issue or request a change related to website, tools or internal systems.
				</Text>
				<Form.Item
					name="title"
					label="Summary"
					rules={[{ required: true, message: 'Summary is required' }]}
					className="requests-new__title-item"
				>
					<Input
						autoFocus
						placeholder="Summarize the issue in one line"
						maxLength={300}
					/>
				</Form.Item>
				{similar && (
					<Text type="secondary" className="requests-new__similar">
						Similar open request: {requestRef(similar.id)} · {similar.title}
					</Text>
				)}

				<Form.Item name="description" label="Description" rules={[{ required: true, message: 'Description is required' }]}>
					<Input.TextArea
						autoSize={{ minRows: 4, maxRows: 12 }}
						placeholder="Steps to reproduce · expected vs actual · relevant order/SKU"
					/>
				</Form.Item>

				<div className="requests-new__section-label">Send to</div>
				<Form.Item name="sectorId" rules={[{ required: true, message: 'Sector is required' }]} className="requests-new__sector-item">
					<SectorChipsField sectors={sectors} />
				</Form.Item>

				<Form.Item name="assigneeIds" label="Assignees (optional) — first is primary">
					<Select
						mode="multiple"
						placeholder="Unassigned"
						maxTagCount="responsive"
						options={assigneeOptions.map((user) => ({ value: user.id, label: userLabel(user) }))}
					/>
				</Form.Item>

				<div className="requests-new__context">
					<Form.Item name="project" label="System / Area" rules={[{ required: true, message: 'System / Area is required' }]}>
						<Select placeholder="Select…" options={PROJECTS.map((project) => ({ value: project, label: project }))} />
					</Form.Item>
					<Form.Item name="type" label="Request Type" rules={[{ required: true, message: 'Request type is required' }]}>
						<Select placeholder="Select…" options={TYPES.map((type) => ({ value: type, label: type }))} />
					</Form.Item>
				</div>

				<Form.Item name="priority" label="Priority" className="requests-new__priority-item">
					<Segmented
						options={PRIORITIES.map((priority) => ({
							value: priority,
							label: (
								<span>
									<span className="requests-new__chip-dot" style={{ background: PRIORITY_COLORS[priority] }} />
									{priority}
								</span>
							),
						}))}
					/>
				</Form.Item>

				<Form.Item name="link" label="Related link (optional)" className="requests-new__link">
					<Input
						prefix={<LinkOutlined className="requests-new__link-icon" />}
						placeholder="https://…"
					/>
				</Form.Item>

				<Upload.Dragger
					multiple
					fileList={fileList}
					beforeUpload={() => false}
					onChange={({ fileList: nextList }) => setFileList(nextList)}
					disabled={!storageEnabled}
					accept={(meta?.attachments?.allowedExtensions || []).join(',')}
					className="requests-new__dragger"
				>
					<p className="ant-upload-drag-icon"><InboxOutlined /></p>
					<p className="ant-upload-text">
						{storageEnabled ? 'Drag & drop files or click to browse' : 'Attachment storage not configured'}
					</p>
				</Upload.Dragger>
			</Form>
		</Modal>
	);
};

export default NewRequestModal;
