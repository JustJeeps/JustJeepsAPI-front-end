import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { CloudDownloadOutlined, CloudUploadOutlined, EyeOutlined, InboxOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { apiErrorMessage } from '../../utils/api';
import { fetchFeeds, fetchFeedRuns, uploadFeedFiles, runFeedScript, fetchFeedFromVendor, fetchFeedRunStatus } from './feedsApi';
import { uploadFilesDirect } from './directUpload';
import './feeds.scss';

const { Text } = Typography;

const MANAGE_HINT = 'Only the pricing data team can upload files or run scripts';

// Batch age as short text (ageHours comes from the backend).
const formatAge = (ageHours) => {
	if (ageHours === null || ageHours === undefined) return null;
	if (ageHours < 1) return `${Math.round(ageHours * 60)}min ago`;
	if (ageHours < 48) return `${Math.round(ageHours)}h ago`;
	return `${Math.round(ageHours / 24)}d ago`;
};

// Absolute date next to the relative one: "3h ago" answers how fresh, but the
// team also needs to know which day the file is from when checking a vendor.
// The year is spelled out because these feeds go months between updates, and
// "Aug 5" alone does not say whether that is this year or the last one.
const formatDateTime = (value) => {
	if (!value) return '';
	return new Date(value).toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
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

// The status names come from the database and read like internal jargon on a
// screen the whole team uses.
const RUN_STATUS_TEXT = {
	success: 'ok',
	failed: 'failed',
	running: 'running',
	'skipped-unchanged': 'skipped',
	'skipped-locked': 'skipped',
};

// The row counters only mean something when the script actually reported them.
// A bookkeeping row (written by the runner, not by the seed) has no counts, and
// showing its zeros as "+0 ~0 -0" claimed the script had changed nothing when in
// fact it had updated hundreds of products.
const describeCounts = (run) => {
	if (!run) return null;
	if (run.status === 'skipped-unchanged') return 'no change (file identical)';
	if (run.status === 'failed') return null;
	if (run.sourceKind === 'script-run') return 'ran, counts not reported';
	if (run.status !== 'success') return null;
	return `+${run.rowsInserted} ~${run.rowsUpdated} -${run.rowsDeleted}`;
};

// Latest ingest runs for the feed (expanded table row).
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
					render: (value) => formatDateTime(value),
				},
				{
					title: 'Status',
					dataIndex: 'status',
					render: (status) => (
						<Tag color={RUN_STATUS_COLORS[status] || 'default'}>{RUN_STATUS_TEXT[status] || status}</Tag>
					),
				},
				{
					title: 'Rows',
					key: 'rows',
					render: (run) => (
						<Text type="secondary" className="feeds-panel__runs-rows">{describeCounts(run) || '-'}</Text>
					),
				},
				{
					title: 'Batch',
					dataIndex: 'artifactBatchId',
					render: (value) => (value ? <Text code>{value.slice(0, 8)}</Text> : '-'),
				},
				{
					title: 'Error',
					dataIndex: 'error',
					ellipsis: true,
					render: (value) => (value ? <Tooltip title={value}><Text type="danger">{value}</Text></Tooltip> : '-'),
				},
			]}
		/>
	);
};

// Upload modal. A multi-file feed accepts one file at a time: whatever is not
// picked is carried forward from the current batch by the server, so the feed
// always ends up with a complete set without forcing the person to have both
// files in hand.
const UploadFeedModal = ({ feed, directEnabled, onClose, onUploaded }) => {
	const [fileList, setFileList] = useState([]);
	const [note, setNote] = useState('');
	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [stage, setStage] = useState('');
	const abortRef = useRef(null);

	// Files of this feed the person did not pick. They are NOT a blocker: the
	// server carries each one forward from the current batch, so one file can be
	// refreshed on its own (the vendor rarely sends both at the same time). The
	// only case that still needs everything is the very first upload, when there
	// is nothing to carry forward.
	const missing = useMemo(() => {
		const names = fileList.map((file) => file.name);
		return feed.files.filter((name) => !names.includes(name));
	}, [feed, fileList]);

	const keptFromCurrentBatch = useMemo(() => missing
		.map((name) => feed.currentBatch?.artifacts.find((artifact) => artifact.fileName === name))
		.filter(Boolean), [missing, feed]);

	const missingWithNothingToKeep = missing.length > keptFromCurrentBatch.length;

	// Names the feed does not expect, and files past the size limit. Both used to
	// travel all the way to the server before being rejected.
	const rejected = useMemo(() => fileList.filter((file) => {
		const size = (file.originFileObj || file).size;
		return !feed.files.includes(file.name) || (Number.isFinite(size) && size > feed.maxUploadBytes);
	}), [feed, fileList]);

	const handleSelection = ({ fileList: nextList }) => {
		// Keeping only the last N silently threw away files the person had just
		// dropped. Everything selected is kept and what does not belong is named.
		setFileList(nextList);
	};

	const handleClose = () => {
		if (!uploading) return onClose();
		Modal.confirm({
			title: 'Cancel the upload?',
			content: 'The file is still being sent. Closing now stops it and nothing is saved.',
			okText: 'Cancel the upload',
			okButtonProps: { danger: true },
			cancelText: 'Keep uploading',
			onOk: () => {
				abortRef.current?.abort();
				onClose();
			},
		});
		return undefined;
	};

	const handleUpload = async () => {
		setUploading(true);
		setProgress(0);
		setStage('');
		const controller = new AbortController();
		abortRef.current = controller;
		const files = fileList.map((file) => file.originFileObj || file);

		// While the bucket CORS is not configured, the browser cannot talk directly
		// to Spaces. Instead of failing, it falls back to sending through the API.
		const uploadThroughApi = async () => {
			setStage('Sending through the server');
			setProgress(0);
			const result = await uploadFeedFiles(feed.feed, files, note.trim(), setProgress);
			message.success(`Batch ${result.batchId.slice(0, 8)} uploaded for ${feed.label}`);
		};

		try {
			if (directEnabled) {
				try {
					const result = await uploadFilesDirect({
						feed: feed.feed,
						files,
						note: note.trim(),
						signal: controller.signal,
						onStage: ({ phase, percent, fileName }) => {
							const label = {
								hashing: `Reading ${fileName}`,
								checking: `Checking if ${fileName} changed`,
								reusing: `${fileName} is already in storage, reusing it`,
								finishing: `Saving ${fileName}`,
							}[phase] || `Sending ${fileName}`;
							setStage(label);
							setProgress(percent);
						},
					});

					if (result.unchanged) {
						// Same content as the file in use: no bytes were transferred.
						message.info(`${feed.label} is already up to date: the file has not changed`);
					} else {
						const reusedNote = result.reused > 0 ? `, ${result.reused} unchanged file(s) reused` : '';
						// Naming what was kept matters: on Quadratec the prices come
						// from the spreadsheet and the inventory from the CSV, so
						// replacing one and keeping the other is a real decision.
						const keptNote = result.carriedForward?.length
							? `. Kept: ${result.carriedForward.map((file) => file.fileName).join(', ')}`
							: '';
						message.success(`Batch ${String(result.batchId).slice(0, 8)} ready for ${feed.label}${reusedNote}${keptNote}`);
					}
				} catch (directError) {
					// Only a transport failure justifies retrying through the API. A
					// reply from the API itself (a file too large, a name the feed does
					// not accept) is a decision, and sending the same bytes again just
					// to be refused a second time wastes minutes on a big file.
					if (directError.response || controller.signal.aborted) throw directError;
					console.warn('Direct upload unavailable, falling back to the API:', directError?.message);
					await uploadThroughApi();
				}
			} else {
				await uploadThroughApi();
			}
			onUploaded();
			onClose();
		} catch (error) {
			if (!controller.signal.aborted) message.error(apiErrorMessage(error, 'Upload failed'));
		} finally {
			abortRef.current = null;
			setUploading(false);
		}
	};

	return (
		<Modal
			open
			title={`Upload: ${feed.label}`}
			onCancel={handleClose}
			maskClosable={!uploading}
			closable={!uploading}
			onOk={handleUpload}
			okText="Upload"
			okButtonProps={{
				disabled: fileList.length === 0 || missingWithNothingToKeep || rejected.length > 0,
				loading: uploading,
			}}
		>
			<Text type="secondary">
				Expected file{feed.files.length > 1 ? 's' : ''}: {feed.files.join(', ')}.
				{feed.files.length > 1 && feed.currentBatch
					? ' You can send just one of them; the other stays as it is.'
					: ''}
				{' '}Max {formatBytes(feed.maxUploadBytes)} per file. Bigger files go through the CLI.
			</Text>
			<Upload.Dragger
				multiple={feed.files.length > 1}
				beforeUpload={() => false}
				fileList={fileList}
				onChange={handleSelection}
				disabled={uploading}
				className="feeds-panel__dragger"
			>
				<p className="ant-upload-drag-icon"><InboxOutlined /></p>
				<p className="ant-upload-text">Click or drag the vendor file{feed.files.length > 1 ? 's' : ''} here</p>
			</Upload.Dragger>
			{rejected.length > 0 && (
				<Alert
					type="error"
					showIcon
					className="feeds-panel__modal-alert"
					message={rejected.map((file) => {
						const size = (file.originFileObj || file).size;
						return feed.files.includes(file.name)
							? `${file.name} is ${formatBytes(size)}, over the ${formatBytes(feed.maxUploadBytes)} limit for this feed`
							: `${file.name} is not a file this feed expects`;
					}).join('. ')}
				/>
			)}
			{missingWithNothingToKeep && fileList.length > 0 && (
				<Alert
					type="warning"
					showIcon
					className="feeds-panel__modal-alert"
					message={`This feed has no file yet, so the first upload needs all of them. Missing: ${missing
						.filter((name) => !keptFromCurrentBatch.some((artifact) => artifact.fileName === name))
						.join(', ')}. File names must match exactly.`}
				/>
			)}
			{!missingWithNothingToKeep && keptFromCurrentBatch.length > 0 && fileList.length > 0 && (
				<Alert
					type="info"
					showIcon
					className="feeds-panel__modal-alert"
					message={`Only what you picked is replaced. ${keptFromCurrentBatch
						.map((artifact) => `${artifact.fileName} stays as the one from ${formatDateTime(artifact.uploadedAt)}`)
						.join('; ')}.`}
				/>
			)}
			<Input.TextArea
				rows={2}
				placeholder="Note (optional), e.g. 'sheet received from vendor on Aug 5'"
				value={note}
				onChange={(event) => setNote(event.target.value)}
				maxLength={2000}
				disabled={uploading}
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

// Turns the last useful log line into a sentence and a percentage.
// Big feeds (the Keystone one is 460MB) take minutes to download from the bucket:
// the server emits "⬇️ <file> 40% (...)" every 10MB and that is what becomes the
// progress bar here.
const readPhase = (logTail) => {
	const lines = String(logTail || '').trim().split('\n').filter(Boolean);
	for (let i = lines.length - 1; i >= 0; i -= 1) {
		const line = lines[i];
		const download = line.match(/⬇️.*?([\w.-]+\.(?:csv|xlsx|xls)).*?(\d{1,3})%/i);
		if (download) return { text: `Downloading ${download[1]}`, percent: Number(download[2]) };
		if (/⬇️/.test(line)) return { text: line.replace(/^[^A-Za-z]*/, '').slice(0, 90), percent: null };
		if (/checking hash/i.test(line)) return { text: 'Checking the file signature', percent: null };
		if (/🔗|feed-sync/.test(line)) return { text: 'Linking the file for the vendor script', percent: null };
		if (/Seeding|Starting|Running/i.test(line)) return { text: 'Running the vendor script', percent: null };
	}
	return { text: 'Starting', percent: null };
};

// A run only exists in the memory of the server process that started it, so a
// deploy or a restart makes run-status answer 404 forever. Waiting a bounded
// time and then saying so beats polling an answer that is never coming.
const RUN_NOT_FOUND_GRACE_MS = 30000;

// Follows a feed script running on the server: shows the live log and the final
// result (the backend runs one script at a time and blocks during the daily
// seed-all).
const RunScriptModal = ({ feed, onClose, onFinished }) => {
	const [status, setStatus] = useState(null);
	const [error, setError] = useState(null);
	const [gone, setGone] = useState(false);

	useEffect(() => {
		let cancelled = false;
		let timer = null;
		let consecutiveErrors = 0;
		const startedAt = Date.now();

		const schedule = (delay) => {
			timer = setTimeout(poll, delay);
		};

		// Backoff on failure: a server under load answering slowly should not be
		// polled harder, and the window should not freeze on a red box either.
		const retryDelay = () => Math.min(2000 * 2 ** (consecutiveErrors - 1), 30000);

		const poll = async () => {
			try {
				const next = await fetchFeedRunStatus(feed.feed);
				if (cancelled) return;
				consecutiveErrors = 0;
				setStatus(next);
				// A run started a moment ago answers 404 on the first polls. Once
				// the status arrives, drop the earlier complaint instead of leaving
				// a red box on top of a run that is clearly working.
				setError(null);
				setGone(false);
				if (next.status === 'running') schedule(2000);
				else onFinished();
			} catch (pollError) {
				if (cancelled) return;
				if (pollError.response?.status === 404) {
					// While the run is still registering, keep waiting quietly, but
					// not forever.
					if (Date.now() - startedAt > RUN_NOT_FOUND_GRACE_MS) {
						setGone(true);
						return;
					}
					schedule(2000);
					return;
				}
				consecutiveErrors += 1;
				setError(apiErrorMessage(pollError, 'Failed to read the run status'));
				schedule(retryDelay());
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
			title={`Run script: ${feed.label}`}
			onCancel={onClose}
			footer={<Button onClick={onClose}>{running ? 'Close (keeps running)' : 'Close'}</Button>}
			width={760}
		>
			{gone && (
				<Alert
					type="warning"
					showIcon
					className="feeds-panel__modal-alert"
					message="This server no longer knows about that run. It was most likely interrupted by a deploy or a restart. Check the run history below the feed."
				/>
			)}
			{error && !gone && (
				<Alert
					type="error"
					showIcon
					className="feeds-panel__modal-alert"
					message={`${error}. Trying again...`}
				/>
			)}
			{status && (
				<>
					<Text type="secondary">
						<code>{status.command ? `npm run ${status.command}` : 'vendor script'}</code>
						{' '}started by {status.startedBy || 'unknown'}
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
								back, the script keeps running on the server.
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

// Vendor feed catalog: what is in the bucket, how old it is, who uploaded it and
// the latest ingest runs. Manual upload per feed (triage; the backend validates).
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

	// Work started here (Run now) or by the schedule (the vendor FTP fetch) ends
	// on the server, with nothing to tell the page. While anything is running the
	// table refreshes on its own, so the result shows up without asking the
	// person to press Refresh.
	const somethingRunning = Boolean(
		data?.feeds?.some((feed) => feed.running || feed.lastFetch?.status === 'running')
		|| data?.busy?.dailySync
	);

	useEffect(() => {
		if (!somethingRunning) return undefined;
		const timer = setInterval(load, 15000);
		return () => clearInterval(timer);
	}, [somethingRunning, load]);

	const startRun = async (feed) => {
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

	// Asks the vendor for the file now instead of waiting for the next scheduled
	// window. Keystone is fetched at 4:47 and 16:47, and when the file is not
	// published yet the run succeeds with the previous day's data.
	const startFetch = async (feed) => {
		setStarting(feed.feed);
		try {
			await fetchFeedFromVendor(feed.feed);
			setRunFeed(feed);
		} catch (fetchError) {
			message.error(apiErrorMessage(fetchError, 'Could not start the vendor fetch'));
		} finally {
			setStarting(null);
		}
	};

	// Worth confirming: the Keystone fetch moves about 460MB, takes roughly
	// twenty minutes and holds the single run slot for that whole time.
	const handleFetch = (feed) => {
		Modal.confirm({
			title: `Fetch ${feed.label} from the vendor now?`,
			content: 'This downloads the vendor file straight away instead of waiting for the next scheduled fetch. It can take around twenty minutes, and no other feed can run while it does.',
			okText: 'Fetch now',
			cancelText: 'Cancel',
			onOk: () => startFetch(feed),
		});
	};

	const handleRun = (feed) => {
		// Running against a batch nobody has refreshed in months usually means the
		// file is not the one the person thinks they are publishing.
		if (!feed.stale) return startRun(feed);
		Modal.confirm({
			title: `The file for ${feed.label} is old`,
			content: `The current file was uploaded ${formatAge(feed.ageHours)} (${formatDateTime(feed.currentBatch?.uploadedAt)}). Running now uses that file, not a newer one. Continue?`,
			okText: 'Run with this file',
			cancelText: 'Cancel',
			onOk: () => startRun(feed),
		});
		return undefined;
	};

	// Same slot as Run now: the server runs one job at a time.
	const fetchBlockedReason = (feed) => {
		if (!data?.canManage) return MANAGE_HINT;
		if (feed.running) return 'This feed is already running';
		if (data?.busy?.dailySync) return 'The daily sync is running. Wait for it to finish.';
		if (data?.busy?.feed) return `Another feed is running right now (${data.busy.feed})`;
		return null;
	};

	// Why the button cannot be pressed right now. The API knows all of this and
	// used to keep it to itself, so the button looked available and answered 409.
	const runBlockedReason = (feed) => {
		if (!data?.canManage) return MANAGE_HINT;
		if (!feed.seedCommand) return feed.seedCommandNote;
		if (feed.running) return 'This feed is already running';
		if (data?.busy?.dailySync) return 'The daily sync is running. Wait for it to finish.';
		if (data?.busy?.feed) return `Another feed is running right now (${data.busy.feed})`;
		if (!feed.currentBatch) return 'There is no file for this feed yet. Upload one first.';
		return null;
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
						<Tooltip title={`Uploaded ${formatDateTime(feed.currentBatch.uploadedAt)}`}>
							<Tag color={feed.stale ? 'orange' : 'green'}>
								{feed.stale ? 'stale' : 'fresh'} · {formatAge(feed.ageHours)}
							</Tag>
						</Tooltip>
						<div>
							<Text type="secondary" className="feeds-panel__feed-name">
								{formatDateTime(feed.currentBatch.uploadedAt)}
								{' · '}{source.source}{source.uploadedBy ? ` by ${source.uploadedBy}` : ''}
							</Text>
						</div>
						{/* One line per file: a bare "12.1MB + 460.5MB" left the reader
						    guessing which size belonged to which file. */}
						{feed.currentBatch.artifacts.map((artifact) => (
							<div key={artifact.id}>
								<Text type="secondary" className="feeds-panel__feed-name">
									{artifact.fileName}: {formatBytes(artifact.sizeBytes)}
								</Text>
							</div>
						))}
					</div>
				);
			},
		},
		{
			title: 'Last ingest',
			key: 'lastRun',
			render: (feed) => {
				const counts = describeCounts(feed.lastRun);
				return (
					<div>
						{feed.lastRun ? (
							<>
								<Tag color={RUN_STATUS_COLORS[feed.lastRun.status] || 'default'}>
									{RUN_STATUS_TEXT[feed.lastRun.status] || feed.lastRun.status}
								</Tag>
								<div>
									<Text type="secondary" className="feeds-panel__feed-name">
										{feed.lastRun.finishedAt
											? `${formatDateTime(feed.lastRun.finishedAt)} · ${formatAge((Date.now() - new Date(feed.lastRun.finishedAt)) / 36e5)}`
											: 'running'}
									</Text>
								</div>
								{counts && (
									<Text type="secondary" className="feeds-panel__feed-name">{counts}</Text>
								)}
							</>
						) : (
							<Text type="secondary">never</Text>
						)}
						{/* Keystone arrives by scheduled FTP fetch, and when that fetch
						    fails the ingest line above stays green and says nothing. */}
						{feed.lastFetch && (
							<div>
								<Text type="secondary" className="feeds-panel__feed-name">
									vendor fetch: {RUN_STATUS_TEXT[feed.lastFetch.status] || feed.lastFetch.status}
									{feed.lastFetch.finishedAt ? ` · ${formatDateTime(feed.lastFetch.finishedAt)}` : ''}
								</Text>
							</div>
						)}
					</div>
				);
			},
		},
		{
			title: '',
			key: 'actions',
			render: (feed) => {
				const blocked = runBlockedReason(feed);
				return (
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
						{feed.fetchCommand && !feed.running && (
							<Tooltip title={fetchBlockedReason(feed)
								|| 'Downloads the file from the vendor now, instead of waiting for the next scheduled fetch'}>
								<Button
									icon={<CloudDownloadOutlined />}
									size="small"
									disabled={Boolean(fetchBlockedReason(feed))}
									loading={starting === feed.feed}
									onClick={() => handleFetch(feed)}
								>
									Fetch now
								</Button>
							</Tooltip>
						)}
						{feed.running ? (
							<Button icon={<EyeOutlined />} size="small" onClick={() => setRunFeed(feed)}>
								View run
							</Button>
						) : (
							<Tooltip title={blocked || (
								// A feed can list more than one script (Quadratec applies
								// prices and then inventory); show them as they will run.
								`Runs ${[].concat(feed.seedCommand).map((c) => `"npm run ${c}"`).join(' then ')} on the server and shows the result`
							)}>
								<Button
									icon={<PlayCircleOutlined />}
									size="small"
									disabled={Boolean(blocked)}
									loading={starting === feed.feed}
									onClick={() => handleRun(feed)}
								>
									Run now
								</Button>
							</Tooltip>
						)}
					</div>
				);
			},
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

			{somethingRunning && (
				<Alert
					type="info"
					showIcon
					icon={<Spin size="small" />}
					className="feeds-panel__alert"
					message={data?.busy?.dailySync
						? 'The daily sync is running on the server. Scripts cannot be started by hand until it finishes.'
						: 'Something is running on the server right now. This table updates by itself when it finishes.'}
				/>
			)}
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
					directEnabled={Boolean(data?.directUpload?.enabled)}
					onClose={() => setUploadFeed(null)}
					onUploaded={load}
				/>
			)}

			{runFeed && (
				<RunScriptModal
					feed={runFeed}
					onClose={() => { setRunFeed(null); load(); }}
					onFinished={load}
				/>
			)}
		</Card>
	);
};

export default FeedsPanel;
