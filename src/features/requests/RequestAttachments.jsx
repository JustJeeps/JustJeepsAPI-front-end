import { Button, List, Popconfirm, Typography, Upload, message } from 'antd';
import { DeleteOutlined, DownloadOutlined, InboxOutlined, PaperClipOutlined } from '@ant-design/icons';
import { apiErrorMessage } from '../../utils/api';
import { deleteAttachment, downloadAttachment, uploadAttachments } from './requestsApi';
import { relativeTime, userLabel } from './requestsConstants';

const { Text } = Typography;

const formatSize = (bytes) => {
	if (!bytes && bytes !== 0) return '';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Anexos do chamado: upload direto para a API (que grava no bucket DO Spaces)
// e download autenticado via blob. Sem storage configurado, upload desabilita.
const RequestAttachments = ({ requestId, attachments = [], meta, currentUser, isTriage, onChanged }) => {
	const storageEnabled = Boolean(meta?.attachments?.enabled);
	const maxMb = Math.round((meta?.attachments?.maxFileSizeBytes || 0) / (1024 * 1024));
	const allowedExtensions = meta?.attachments?.allowedExtensions || [];

	const uploadProps = {
		multiple: true,
		showUploadList: false,
		accept: allowedExtensions.join(','),
		disabled: !storageEnabled,
		customRequest: async ({ file, onSuccess, onError }) => {
			try {
				await uploadAttachments(requestId, [file]);
				onSuccess();
				message.success(`${file.name} uploaded`);
				onChanged();
			} catch (error) {
				message.error(apiErrorMessage(error, `Failed to upload ${file.name}`));
				onError(error);
			}
		},
	};

	const canDelete = (attachment) =>
		isTriage || attachment.uploader?.id === currentUser?.id;

	const handleDownload = async (attachment) => {
		try {
			await downloadAttachment(requestId, attachment);
		} catch (error) {
			message.error(apiErrorMessage(error, 'Download failed'));
		}
	};

	const handleDelete = async (attachment) => {
		try {
			await deleteAttachment(requestId, attachment.id);
			message.success('Attachment removed');
			onChanged();
		} catch (error) {
			message.error(apiErrorMessage(error, 'Failed to remove attachment'));
		}
	};

	return (
		<div className="requests-attachments">
			<List
				size="small"
				locale={{ emptyText: 'No attachments' }}
				dataSource={attachments}
				renderItem={(attachment) => (
					<List.Item
						actions={[
							<Button
								key="download"
								type="link"
								size="small"
								icon={<DownloadOutlined />}
								onClick={() => handleDownload(attachment)}
							/>,
							canDelete(attachment) && (
								<Popconfirm
									key="delete"
									title="Remove this attachment?"
									onConfirm={() => handleDelete(attachment)}
								>
									<Button type="link" size="small" danger icon={<DeleteOutlined />} />
								</Popconfirm>
							),
						].filter(Boolean)}
					>
						<span className="requests-attachments__name">
							<PaperClipOutlined />
							<Text>{attachment.originalName}</Text>
						</span>
						<Text type="secondary" className="requests-attachments__meta">
							{formatSize(attachment.sizeBytes)} · {userLabel(attachment.uploader)} · {relativeTime(attachment.createdAt)}
						</Text>
					</List.Item>
				)}
			/>
			{/* Drag-and-drop de arquivos (mesmo padrão do NewRequestModal); o
			    upload segue indo para o bucket DO Spaces via API. */}
			<Upload.Dragger {...uploadProps} className="requests-attachments__dragger">
				<p className="ant-upload-drag-icon"><InboxOutlined /></p>
				<p className="ant-upload-text">Click or drag files here to attach</p>
				<p className="ant-upload-hint">
					{maxMb ? `Max ${maxMb} MB per file. ` : ''}
					{allowedExtensions.length ? `Allowed: ${allowedExtensions.join(', ')}` : ''}
				</p>
			</Upload.Dragger>
			{!storageEnabled && (
				<Text type="secondary" className="requests-attachments__disabled">
					Attachment storage is not configured yet.
				</Text>
			)}
		</div>
	);
};

export default RequestAttachments;
