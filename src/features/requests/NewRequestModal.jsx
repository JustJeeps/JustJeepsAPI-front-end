import { useState } from 'react';
import { Button, Form, Input, Modal, Select, Typography, Upload, message } from 'antd';
import { InboxOutlined, LinkOutlined } from '@ant-design/icons';
import { apiErrorMessage } from '../../utils/api';
import { createRequest, uploadAttachments } from './requestsApi';
import { PRIORITIES, PROJECTS, TYPES, findSimilarRequest, requestRef } from './requestsConstants';

const { Text } = Typography;

// Modal de criação (layout inspirado no Jira, mantendo o padrão do app):
// contexto (Project/Type/Priority) compacto no topo, título em destaque,
// descrição logo abaixo e extras (link, anexos) com peso visual menor.
// Um chamado por assunto (RF01) — a nota vive no rodapé, sem alerta gritando.
const NewRequestModal = ({ open, onClose, meta, existingRequests, onCreated }) => {
	const [form] = Form.useForm();
	const [submitting, setSubmitting] = useState(false);
	const [fileList, setFileList] = useState([]);

	const title = Form.useWatch('title', form);
	const similar = findSimilarRequest(title, existingRequests || []);
	const storageEnabled = Boolean(meta?.attachments?.enabled);

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
				links: values.link?.trim() ? [values.link.trim()] : [],
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
			<Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ priority: 'Normal' }} requiredMark={false}>
				<div className="requests-new__context">
					<Form.Item name="project" rules={[{ required: true, message: 'Project is required' }]} className="requests-new__col">
						<Select placeholder="Project *" options={PROJECTS.map((project) => ({ value: project, label: project }))} />
					</Form.Item>
					<Form.Item name="type" rules={[{ required: true, message: 'Type is required' }]} className="requests-new__col">
						<Select placeholder="Type *" options={TYPES.map((type) => ({ value: type, label: type }))} />
					</Form.Item>
					<Form.Item name="priority" className="requests-new__col">
						<Select options={PRIORITIES.map((priority) => ({ value: priority, label: `Priority: ${priority}` }))} />
					</Form.Item>
				</div>

				<Form.Item
					name="title"
					rules={[{ required: true, message: 'Title is required' }]}
					className="requests-new__title-item"
				>
					<Input
						variant="borderless"
						className="requests-new__title-input"
						placeholder="Summarize the issue in one line"
						maxLength={300}
					/>
				</Form.Item>
				{similar && (
					<Text type="secondary" className="requests-new__similar">
						Similar open request: {requestRef(similar.id)} · {similar.title}
					</Text>
				)}

				<Form.Item name="description" rules={[{ required: true, message: 'Description is required' }]}>
					<Input.TextArea
						autoSize={{ minRows: 5, maxRows: 12 }}
						placeholder="Steps to reproduce · expected vs actual · relevant order/SKU"
					/>
				</Form.Item>

				<Form.Item name="link" className="requests-new__link">
					<Input
						prefix={<LinkOutlined className="requests-new__link-icon" />}
						variant="borderless"
						placeholder="Related link (optional)"
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
