import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Modal, Progress, Result, Spin, Table, Tag, Tooltip, Typography, Upload, message } from 'antd';
import { CloudUploadOutlined, CopyOutlined, InboxOutlined, ReloadOutlined, SyncOutlined } from '@ant-design/icons';
import { apiErrorMessage } from '../../utils/api';
import {
	fetchReviewsMeta,
	fetchReviewFiles,
	uploadReviewFile,
	startFileSync,
	retryFailedRows,
	fetchFileErrors,
} from './reviewsApi';
import {
	ROW_STATUS_META,
	validateUploadFile,
	summarizeFileCounts,
	pollDelayFor,
	formatDateTime,
	formatBytes,
	formatErrorReport,
} from './reviewsConstants';
import './reviews.scss';

const { Text } = Typography;

// Modal de upload: 1 planilha por vez, validação client-side (o back revalida)
// e barra de progresso. beforeUpload={() => false} = envio manual no OK
// (mesmo padrão do FeedsPanel).
const UploadReviewsModal = ({ meta, onClose, onUploaded }) => {
	const [fileList, setFileList] = useState([]);
	const [progress, setProgress] = useState(null);
	const [submitting, setSubmitting] = useState(false);

	const selected = fileList[0]?.originFileObj || fileList[0];
	const validation = selected ? validateUploadFile(selected, meta) : { ok: false, error: null };

	const handleOk = async () => {
		setSubmitting(true);
		setProgress(0);
		try {
			const result = await uploadReviewFile(selected, setProgress);
			const { counts } = result;
			message.success(
				`${result.file.fileName}: ${counts.inserted} row(s) ready to sync`
				+ (counts.duplicates ? `, ${counts.duplicates} duplicate(s) skipped` : '')
				+ (counts.invalid ? `, ${counts.invalid} invalid` : '')
			);
			onUploaded();
			onClose();
		} catch (error) {
			message.error(apiErrorMessage(error, 'Upload failed'));
		} finally {
			setSubmitting(false);
			setProgress(null);
		}
	};

	return (
		<Modal
			open
			title="Upload reviews spreadsheet"
			onCancel={submitting ? undefined : onClose}
			okText="Upload"
			onOk={handleOk}
			okButtonProps={{ disabled: !selected || !validation.ok, loading: submitting }}
		>
			<Upload.Dragger
				accept={(meta?.allowedExtensions || ['.xlsx', '.csv']).join(',')}
				fileList={fileList}
				beforeUpload={() => false}
				onChange={({ fileList: nextList }) => setFileList(nextList.slice(-1))}
				disabled={submitting}
			>
				<p className="ant-upload-drag-icon"><InboxOutlined /></p>
				<p className="ant-upload-text">Drag & drop the spreadsheet or click to browse</p>
				<p className="ant-upload-hint">
					One .xlsx or .csv file with columns sku, nickname, rating, title, detail, date.
				</p>
			</Upload.Dragger>
			{selected && !validation.ok && validation.error && (
				<Alert type="error" showIcon message={validation.error} className="reviews-panel__upload-alert" />
			)}
			{progress !== null && <Progress percent={progress} size="small" status="active" />}
		</Modal>
	);
};

const CountTags = ({ counts }) => (
	<span className="reviews-panel__counts">
		{['synced', 'pending', 'sending', 'failed'].map((status) => (
			Boolean(counts[status]) && (
				<Tag key={status} color={ROW_STATUS_META[status].color}>
					{counts[status]} {ROW_STATUS_META[status].label.toLowerCase()}
				</Tag>
			)
		))}
	</span>
);

const ReviewsPanel = () => {
	const [meta, setMeta] = useState(null);
	const [metaError, setMetaError] = useState(null);
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [uploadOpen, setUploadOpen] = useState(false);
	const pollRef = useRef(null);

	const load = useCallback(async () => {
		try {
			const listing = await fetchReviewFiles();
			setData(listing);
		} catch (error) {
			message.error(apiErrorMessage(error, 'Failed to load review files'));
		}
	}, []);

	useEffect(() => {
		(async () => {
			try {
				const loadedMeta = await fetchReviewsMeta();
				setMeta(loadedMeta);
				if (loadedMeta.enabled) await load();
			} catch (error) {
				setMetaError(apiErrorMessage(error, 'Failed to load the reviews panel'));
			} finally {
				setLoading(false);
			}
		})();
	}, [load]);

	// Poll enquanto um sync roda (cleanup do timer no unmount/na parada).
	useEffect(() => {
		const delay = pollDelayFor(Boolean(data?.running));
		if (!delay) return undefined;
		pollRef.current = setInterval(load, delay);
		return () => clearInterval(pollRef.current);
	}, [data?.running, load]);

	if (loading) return <Spin />;
	if (metaError) return <Alert type="error" showIcon message={metaError} />;
	if (!meta?.enabled) {
		return <Result status="warning" title="Restricted" subTitle="The reviews import is available to a small allowlist only." />;
	}

	const confirmSync = (file) => {
		const { total } = summarizeFileCounts(file);
		const batches = Math.ceil((file.counts.pending + file.counts.sending) / (meta.batchSize || 50));
		Modal.confirm({
			title: `Sync ${file.fileName} to Magento?`,
			content: `${file.counts.pending} pending row(s) of ${total} will be sent in batches of ${meta.batchSize} (about ${batches} API call(s)). This writes to the live store.`,
			okText: 'Sync now',
			onOk: async () => {
				try {
					const { runId } = await startFileSync(file.id);
					message.success(`Sync started (run #${runId})`);
					await load();
				} catch (error) {
					message.error(apiErrorMessage(error, 'Failed to start the sync'));
				}
			},
		});
	};

	const handleRetryFailed = async (file) => {
		try {
			const { requeued } = await retryFailedRows(file.id);
			message.success(`${requeued} failed row(s) requeued`);
			await load();
		} catch (error) {
			message.error(apiErrorMessage(error, 'Failed to requeue rows'));
		}
	};

	// Busca TODOS os erros do arquivo (não a amostra) e copia como texto
	// simples, colável em Trello/e-mail para o time corrigir os SKUs.
	const handleCopyErrors = async (file) => {
		try {
			const errors = await fetchFileErrors(file.id);
			await navigator.clipboard.writeText(formatErrorReport(errors));
			message.success('Error log copied to the clipboard');
		} catch (error) {
			message.error(apiErrorMessage(error, 'Could not copy the error log'));
		}
	};

	const columns = [
		{
			title: 'File',
			dataIndex: 'fileName',
			render: (fileName, file) => (
				<div>
					<Text strong>{fileName}</Text>
					<div className="reviews-panel__meta-line">
						{formatBytes(file.sizeBytes)} · {file.rowCount} row(s) · uploaded {formatDateTime(file.uploadedAt)} by {file.uploadedBy}
					</div>
					{Boolean(file.duplicateRowCount) && (
						<div className="reviews-panel__meta-line">{file.duplicateRowCount} duplicate row(s) skipped (already imported before)</div>
					)}
					{Boolean(file.invalidRowCount) && (
						<Tooltip title={(file.invalidSample || []).slice(0, 5).map((entry) => `row ${entry.rowNumber}: ${entry.error}`).join(' · ')}>
							<div className="reviews-panel__meta-line reviews-panel__meta-line--warn">{file.invalidRowCount} invalid row(s) skipped at parse</div>
						</Tooltip>
					)}
				</div>
			),
		},
		{
			title: 'Sync progress',
			key: 'counts',
			render: (unused, file) => {
				const summary = summarizeFileCounts(file);
				return (
					<div>
						{file.status === 'importing' && <Tag color="orange">importing</Tag>}
						<CountTags counts={file.counts} />
						{summary.done && <Tag color="green">all synced</Tag>}
						{summary.hasStuckSending && !data.running && (
							<div className="reviews-panel__meta-line reviews-panel__meta-line--warn">
								verification pending: the next sync checks Magento before resending
							</div>
						)}
						{Boolean(file.errorSamples?.length) && (
							<Tooltip title={file.errorSamples.map((entry) => `row ${entry.rowNumber} (${entry.sku}): ${entry.error}`).join(' · ')}>
								<div className="reviews-panel__meta-line reviews-panel__meta-line--warn">last errors</div>
							</Tooltip>
						)}
					</div>
				);
			},
		},
		{
			title: '',
			key: 'actions',
			align: 'right',
			render: (unused, file) => {
				const summary = summarizeFileCounts(file);
				return (
					<span className="reviews-panel__actions">
						{(summary.hasFailures || file.invalidRowCount > 0) && (
							<Tooltip title="Copy every failed and invalid row as plain text">
								<Button size="small" icon={<CopyOutlined />} onClick={() => handleCopyErrors(file)}>
									Copy errors
								</Button>
							</Tooltip>
						)}
						{summary.hasFailures && (
							<Button size="small" onClick={() => handleRetryFailed(file)} disabled={data.running}>
								Retry failed
							</Button>
						)}
						<Tooltip title={data.running ? 'A sync is already running' : undefined}>
							<Button
								size="small"
								type="primary"
								icon={<SyncOutlined />}
								disabled={!summary.canSync || data.running}
								onClick={() => confirmSync(file)}
							>
								Sync
							</Button>
						</Tooltip>
					</span>
				);
			},
		},
	];

	return (
		<div className="reviews-panel">
			<div className="reviews-panel__header">
				<Text type="secondary">
					Upload a reviews spreadsheet and sync it to the store in batches of {meta.batchSize}.
					Files and rows are never sent twice.
				</Text>
				<span className="reviews-panel__header-actions">
					<Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
					<Button type="primary" icon={<CloudUploadOutlined />} onClick={() => setUploadOpen(true)}>
						Upload
					</Button>
				</span>
			</div>
			{data?.running && (
				<Alert
					type="info"
					showIcon
					message={`Sync running (started by ${data.lastRun?.startedBy || 'cli'} at ${formatDateTime(data.lastRun?.startedAt)}) — this list refreshes every 5s.`}
					className="reviews-panel__running"
				/>
			)}
			{data?.lastRun && !data.running && (
				<div className="reviews-panel__meta-line">
					Last sync: {data.lastRun.status} at {formatDateTime(data.lastRun.finishedAt || data.lastRun.startedAt)} by {data.lastRun.startedBy || 'cli'}
					{data.lastRun.error ? ` (${data.lastRun.error})` : ''}
				</div>
			)}
			<Table
				rowKey="id"
				columns={columns}
				dataSource={data?.files || []}
				pagination={false}
				locale={{ emptyText: 'No spreadsheets uploaded yet' }}
			/>
			{uploadOpen && (
				<UploadReviewsModal meta={meta} onClose={() => setUploadOpen(false)} onUploaded={load} />
			)}
		</div>
	);
};

export default ReviewsPanel;
