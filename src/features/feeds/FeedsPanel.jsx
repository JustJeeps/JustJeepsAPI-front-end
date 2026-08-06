import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Alert,
	Button,
	Card,
	Input,
	Modal,
	Progress,
	Space,
	Spin,
	Table,
	Tag,
	Tooltip,
	Typography,
	Upload,
	message,
} from 'antd';
import { CloudUploadOutlined, InboxOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { apiErrorMessage } from '../../utils/api';
import { fetchFeeds, fetchFeedRuns, uploadFeedFiles, runFeedScript, fetchFeedRunStatus } from './feedsApi';
import { uploadFileDirect } from './directUpload';
import './feeds.scss';

const { Text } = Typography;

const MANAGE_HINT = 'Only the pricing data team can upload files or run scripts';

// Idade do lote em texto curto (ageHours vem do back).
const formatAge = (ageHours) => {
	if (ageHours === null || ageHours === undefined) return null;
	if (ageHours < 1) return `${Math.round(ageHours * 60)}min ago`;
	if (ageHours < 48) return `${Math.round(ageHours)}h ago`;
	return `${Math.round(ageHours / 24)}d ago`;
};

const formatBytes = (bytes) => {
	if (!Number.isFinite(bytes)) return '';
	if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
	return `${Math.max(1, Math.round(bytes / 1024))}KB`;
};

const RUN_STATUS_COLORS = {
	success: 'green',
	failed: 'red',
	running: 'blue',
	'skipped-unchanged': 'default',
	'skipped-locked': 'default',
};

// Últimas rodadas de ingest do feed (linha expandida da tabela).
const FeedRuns = ({ feed }) => {
	const [runs, setRuns] = useState(null);
	const [error, setError] = useState(null);

	useEffect(() => {
		fetchFeedRuns(feed)
			.then((data) => setRuns(data.runs))
			.catch((loadError) => setError(apiErrorMessage(loadError, 'Failed to load runs')));
	}, [feed]);

	if (error) return <Alert type="error" showIcon message={error} />;

	return (
		<Table
			size="small"
			rowKey="id"
			loading={runs === null}
			dataSource={runs || []}
			pagination={false}
			locale={{ emptyText: 'No ingest runs for this feed yet' }}
			columns={[
				{
					title: 'Started',
					dataIndex: 'startedAt',
					render: (value) => new Date(value).toLocaleString(),
				},
				{
					title: 'Status',
					dataIndex: 'status',
					render: (status) => <Tag color={RUN_STATUS_COLORS[status] || 'default'}>{status}</Tag>,
				},
				{
					title: 'Rows',
					key: 'rows',
					render: (run) => (
						<Text type="secondary" className="feeds-panel__runs-rows">
							+{run.rowsInserted} ~{run.rowsUpdated} -{run.rowsDeleted}
						</Text>
					),
				},
				{
					title: 'Batch',
					dataIndex: 'artifactBatchId',
					render: (value) => (value ? <Text code>{value.slice(0, 8)}</Text> : '—'),
				},
				{
					title: 'Error',
					dataIndex: 'error',
					ellipsis: true,
					render: (value) => (value ? <Tooltip title={value}><Text type="danger">{value}</Text></Tooltip> : '—'),
				},
			]}
		/>
	);
};

// Modal de upload: feeds multi-arquivo exigem todos os arquivos numa request.
const UploadFeedModal = ({ feed, directEnabled, onClose, onUploaded }) => {
	const [fileList, setFileList] = useState([]);
	const [note, setNote] = useState('');
	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [stage, setStage] = useState('');

	const missing = useMemo(() => {
		const names = fileList.map((file) => file.name);
		return feed.files.filter((name) => !names.includes(name));
	}, [feed, fileList]);

	const handleUpload = async () => {
		setUploading(true);
		setProgress(0);
		setStage('');
		const files = fileList.map((file) => file.originFileObj || file);

		// Enquanto o CORS do bucket não estiver configurado, o navegador não
		// consegue falar direto com o Spaces (nem ler o ETag da parte). Em vez de
		// falhar, cai para o envio via API — o upload sempre funciona.
		const uploadThroughApi = async () => {
			setStage('Sending through the server');
			setProgress(0);
			const result = await uploadFeedFiles(feed.feed, files, note.trim(), setProgress);
			message.success(`Batch ${result.batchId.slice(0, 8)} uploaded for ${feed.label}`);
		};

		try {
			if (directEnabled) {
				try {
				// Caminho direto: bytes vão do navegador para o bucket, em partes.
				// Feeds de vários arquivos compartilham o mesmo lote (batchId), senão
				// cada arquivo viraria um lote incompleto e nenhum valeria.
				let batchId;
				for (const [index, file] of files.entries()) {
					const result = await uploadFileDirect({
						feed: feed.feed,
						file,
						note: note.trim(),
						batchId,
						onStage: ({ phase, percent }) => {
							setStage(phase === 'hashing'
								? `Reading ${file.name}`
								: phase === 'finishing'
									? `Saving ${file.name}`
									: `Sending ${file.name}${files.length > 1 ? ` (${index + 1} of ${files.length})` : ''}`);
							setProgress(percent);
						},
					});
					batchId = result.batchId;
				}
				message.success(`Batch ${String(batchId).slice(0, 8)} uploaded for ${feed.label}`);
				} catch (directError) {
					console.warn('Direct upload unavailable, falling back to the API:', directError?.message);
					await uploadThroughApi();
				}
			} else {
				await uploadThroughApi();
			}
			onUploaded();
			onClose();
		} catch (error) {
			message.error(apiErrorMessage(error, 'Upload failed'));
		} finally {
			setUploading(false);
		}
	};

	return (
		<Modal
			open
			title={`Upload — ${feed.label}`}
			onCancel={onClose}
			onOk={handleUpload}
			okText="Upload"
			okButtonProps={{ disabled: fileList.length === 0 || missing.length > 0, loading: uploading }}
		>
			<Text type="secondary">
				Expected file{feed.files.length > 1 ? 's (all in one upload)' : ''}: {feed.files.join(', ')}.
				Max {formatBytes(feed.maxUploadBytes)} per file — bigger files go through the CLI.
			</Text>
			<Upload.Dragger
				multiple={feed.files.length > 1}
				beforeUpload={() => false}
				fileList={fileList}
				onChange={({ fileList: nextList }) => setFileList(nextList.slice(-feed.files.length))}
				className="feeds-panel__dragger"
			>
				<p className="ant-upload-drag-icon"><InboxOutlined /></p>
				<p className="ant-upload-text">Click or drag the vendor file{feed.files.length > 1 ? 's' : ''} here</p>
			</Upload.Dragger>
			{missing.length > 0 && fileList.length > 0 && (
				<Alert
					type="warning"
					showIcon
					className="feeds-panel__modal-alert"
					message={`Missing file(s): ${missing.join(', ')} — file names must match exactly.`}
				/>
			)}
			<Input.TextArea
				rows={2}
				placeholder="Note (optional) — e.g. 'sheet received from vendor on Aug 5'"
				value={note}
				onChange={(event) => setNote(event.target.value)}
				maxLength={2000}
				className="feeds-panel__note"
			/>

			{uploading && (
				<div className="feeds-panel__run-live">
					<Space align="center" size={10}>
						<Spin size="small" />
						<Text strong>{stage || 'Sending the file'}</Text>
					</Space>
					<Progress percent={progress} size="small" status="active" />
					<Text type="secondary" className="feeds-panel__run-hint">
						{directEnabled
							? 'The file goes straight to storage in pieces, so a network hiccup only resends the piece that failed. Keep this window open until it finishes.'
							: 'Keep this window open until it finishes. Large sheets can take a while.'}
					</Text>
				</div>
			)}
		</Modal>
	);
};

// Traduz a última linha útil do log numa frase e num percentual.
// Feeds grandes (o da Keystone tem 460MB) levam minutos baixando do bucket: o
// servidor emite "⬇️ arquivo 40% (…)" a cada 10MB e é isso que vira barra aqui.
const readPhase = (logTail) => {
	const lines = String(logTail || '').trim().split('\n').filter(Boolean);
	for (let i = lines.length - 1; i >= 0; i -= 1) {
		const line = lines[i];
		const download = line.match(/⬇️.*?([\w.-]+\.(?:csv|xlsx|xls)).*?(\d{1,3})%/i);
		if (download) return { text: `Downloading ${download[1]}`, percent: Number(download[2]) };
		if (/⬇️/.test(line)) return { text: line.replace(/^[^A-Za-z]*/, '').slice(0, 90), percent: null };
		if (/verificando hash|checking hash/i.test(line)) return { text: 'Checking the file signature', percent: null };
		if (/🔗|feed-sync/.test(line)) return { text: 'Linking the file for the vendor script', percent: null };
		if (/Seeding|Starting|Running/i.test(line)) return { text: 'Running the vendor script', percent: null };
	}
	return { text: 'Starting', percent: null };
};

// Acompanha a execução do script de um feed no servidor: mostra o log ao vivo
// e o resultado final (o back roda um script por vez e bloqueia durante o
// seed-all diário).
const RunScriptModal = ({ feed, onClose, onFinished }) => {
	const [status, setStatus] = useState(null);
	const [error, setError] = useState(null);

	useEffect(() => {
		let cancelled = false;
		let timer = null;

		const poll = async () => {
			try {
				const next = await fetchFeedRunStatus(feed.feed);
				if (cancelled) return;
				setStatus(next);
				if (next.status === 'running') {
					timer = setTimeout(poll, 2000);
				} else {
					onFinished();
				}
			} catch (pollError) {
				if (!cancelled) setError(apiErrorMessage(pollError, 'Failed to read the run status'));
			}
		};
		poll();

		return () => {
			cancelled = true;
			if (timer) clearTimeout(timer);
		};
	}, [feed, onFinished]);

	const running = status?.status === 'running';
	const phase = readPhase(status?.logTail);

	return (
		<Modal
			open
			title={`Run script — ${feed.label}`}
			onCancel={onClose}
			footer={<Button onClick={onClose}>{running ? 'Close (keeps running)' : 'Close'}</Button>}
			width={760}
		>
			{error && <Alert type="error" showIcon message={error} className="feeds-panel__modal-alert" />}
			{status && (
				<>
					<Text type="secondary">
						<code>npm run {status.command}</code> started by {status.startedBy || 'unknown'}
						{status.durationMs ? ` · ${Math.round(status.durationMs / 1000)}s` : ''}
					</Text>

					{running && (
						<div className="feeds-panel__run-live">
							<Space align="center" size={10}>
								<Spin size="small" />
								<Text strong>{phase.text}</Text>
							</Space>
							{phase.percent !== null && (
								<Progress percent={phase.percent} size="small" status="active" />
							)}
							<Text type="secondary" className="feeds-panel__run-hint">
								Large vendor files take a few minutes. You can close this window and come
								back — the script keeps running on the server.
							</Text>
						</div>
					)}

					<div className="feeds-panel__run-status">
						{status.status === 'success' && <Tag color="green">finished with no errors</Tag>}
						{status.status === 'failed' && <Tag color="red">failed (exit {status.exitCode})</Tag>}
						{status.error && <Text type="danger"> {status.error}</Text>}
					</div>
					<pre className="feeds-panel__run-log">{status.logTail || 'waiting for output...'}</pre>
				</>
			)}
		</Modal>
	);
};

// Catálogo dos feeds de vendor: o que está no bucket, idade, quem subiu e as
// últimas rodadas de ingest. Upload manual por feed (triage; o back valida).
const FeedsPanel = () => {
	const [data, setData] = useState(null);
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(true);
	const [uploadFeed, setUploadFeed] = useState(null);
	const [runFeed, setRunFeed] = useState(null);
	const [starting, setStarting] = useState(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			setData(await fetchFeeds());
		} catch (loadError) {
			setError(apiErrorMessage(loadError, 'Failed to load feeds'));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const handleRun = async (feed) => {
		setStarting(feed.feed);
		try {
			await runFeedScript(feed.feed);
			setRunFeed(feed);
		} catch (runError) {
			message.error(apiErrorMessage(runError, 'Could not start the script'));
		} finally {
			setStarting(null);
		}
	};

	const columns = [
		{
			title: 'Feed',
			key: 'feed',
			render: (feed) => (
				<div>
					<Text strong>{feed.label}</Text>
					<div><Text type="secondary" className="feeds-panel__feed-name">{feed.feed}</Text></div>
				</div>
			),
		},
		{
			title: 'Files',
			dataIndex: 'files',
			render: (files) => files.map((name) => <Tag key={name}>{name}</Tag>),
		},
		{
			title: 'Current data',
			key: 'current',
			render: (feed) => {
				if (!feed.currentBatch) return <Tag color="red">no data</Tag>;
				const source = feed.currentBatch.artifacts[0];
				return (
					<div>
						<Tag color={feed.stale ? 'orange' : 'green'}>
							{feed.stale ? 'stale' : 'fresh'} · {formatAge(feed.ageHours)}
						</Tag>
						<div>
							<Text type="secondary" className="feeds-panel__feed-name">
								{source.source}{source.uploadedBy ? ` by ${source.uploadedBy}` : ''}
								{' · '}{feed.currentBatch.artifacts.map((a) => formatBytes(a.sizeBytes)).join(' + ')}
							</Text>
						</div>
					</div>
				);
			},
		},
		{
			title: 'Last ingest',
			key: 'lastRun',
			render: (feed) => {
				if (!feed.lastRun) return <Text type="secondary">never</Text>;
				return (
					<div>
						<Tag color={RUN_STATUS_COLORS[feed.lastRun.status] || 'default'}>{feed.lastRun.status}</Tag>
						<Text type="secondary" className="feeds-panel__feed-name">
							{feed.lastRun.finishedAt ? formatAge((Date.now() - new Date(feed.lastRun.finishedAt)) / 36e5) : ''}
						</Text>
					</div>
				);
			},
		},
		{
			title: '',
			key: 'actions',
			render: (feed) => (
				<div className="feeds-panel__actions">
					<Tooltip title={data?.canManage ? '' : MANAGE_HINT}>
						<Button
							icon={<CloudUploadOutlined />}
							size="small"
							disabled={!data?.storeConfigured || !data?.canManage}
							onClick={() => setUploadFeed(feed)}
						>
							Upload
						</Button>
					</Tooltip>
					<Tooltip title={!data?.canManage
						? MANAGE_HINT
						: feed.seedCommand
							? `Runs "npm run ${feed.seedCommand}" on the server and shows the result`
							: feed.seedCommandNote}>
						<Button
							icon={<PlayCircleOutlined />}
							size="small"
							disabled={!feed.seedCommand || !data?.canManage}
							loading={starting === feed.feed}
							onClick={() => handleRun(feed)}
						>
							Run now
						</Button>
					</Tooltip>
				</div>
			),
		},
	];

	return (
		<Card
			extra={<Button icon={<ReloadOutlined />} size="small" onClick={load}>Refresh</Button>}
			className="feeds-panel"
		>
			<Text type="secondary" className="feeds-panel__help">
				Vendor price/inventory files live in the DigitalOcean Spaces bucket. Every upload becomes a new
				immutable version; the daily sync always reads the latest complete batch. Stale or missing feeds
				show up here and in the daily cron digest.
			</Text>

			{error && <Alert type="error" showIcon message={error} className="feeds-panel__alert" />}
			{data && data.canManage === false && (
				<Alert
					type="info"
					showIcon
					className="feeds-panel__alert"
					message="You can see the state of every vendor file here. Uploading a file or running a script is limited to the team that maintains the pricing data."
				/>
			)}
			{data && !data.storeConfigured && (
				<Alert
					type="info"
					showIcon
					className="feeds-panel__alert"
					message="Feed storage is not configured yet (DO_SPACES_*). Uploads are disabled; the sync still uses the files shipped with the app."
				/>
			)}

			<Table
				rowKey="feed"
				size="middle"
				loading={loading}
				dataSource={data?.feeds || []}
				columns={columns}
				pagination={false}
				expandable={{ expandedRowRender: (feed) => <FeedRuns feed={feed.feed} /> }}
			/>

			{uploadFeed && (
				<UploadFeedModal
					feed={uploadFeed}
					directEnabled={Boolean(data?.directUpload?.enabled) && Boolean(window.crypto?.subtle)}
					onClose={() => setUploadFeed(null)}
					onUploaded={load}
				/>
			)}

			{runFeed && (
				<RunScriptModal feed={runFeed} onClose={() => setRunFeed(null)} onFinished={load} />
			)}
		</Card>
	);
};

export default FeedsPanel;
