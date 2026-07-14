import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Alert, Button, Progress, Spin, Table, Tag } from 'antd';
import './cronJobs.scss';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const STATUS_COLORS = {
	running: 'processing',
	success: 'success',
	failed: 'error',
	interrupted: 'warning',
	skipped: 'default',
	scheduled: 'blue',
	disabled: 'default',
};

function formatSchedule(schedule) {
	if (!schedule) return '—';

	const presets = {
		'0 19 * * *': 'Daily at 7:00 PM',
		'0 2 * * *': 'Daily at 2:00 AM',
		'0 15 * * *': 'Daily at 3:00 PM',
		'0 */2 * * *': 'Every 2 hours',
		'0 */4 * * *': 'Every 4 hours',
		'*/5 * * * *': 'Every 5 minutes',
	};

	const presetLabel = presets[schedule];
	if (presetLabel) {
		return presetLabel;
	}

	const parts = String(schedule).trim().split(/\s+/);
	if (parts.length !== 5) {
		return schedule;
	}

	const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
	if (minute === '*' || dayOfMonth !== '*' || month !== '*' || dayOfWeek !== '*') {
		return schedule;
	}

	const minuteNumber = Number(minute);
	if (Number.isNaN(minuteNumber)) {
		return schedule;
	}

	const hourParts = hour.split(',').map((value) => value.trim()).filter(Boolean);
	if (hourParts.length === 0) {
		return schedule;
	}

	const parsedHours = hourParts.map((value) => Number(value));
	if (parsedHours.some((value) => Number.isNaN(value))) {
		return schedule;
	}

	const timeLabels = parsedHours
		.map((hourNumber) => {
			const date = new Date();
			date.setHours(hourNumber, minuteNumber, 0, 0);
			return date.toLocaleTimeString('en-CA', {
				hour: 'numeric',
				minute: '2-digit',
			});
		})
		.join(', ');

	return `Daily at ${timeLabels}`;
}

function formatDateTime(value) {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleString('en-CA', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		second: '2-digit',
	});
}

function formatDuration(durationLabel, durationMs) {
	if (durationLabel) return durationLabel;
	if (!durationMs && durationMs !== 0) return '—';
	return `${(durationMs / 1000).toFixed(1)}s`;
}

function formatHistoryDayLabel(value) {
	if (!value) return 'Unknown run';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString('en-CA', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
	});
}

function formatFailedStep(step) {
	if (!step) return 'Unknown failed step';
	const codeText = step.code ?? 'unknown';
	const errorText = step.error ? ` - ${step.error}` : '';
	return `${step.cmd || 'unknown-step'} (code ${codeText})${errorText}`;
}

export default function CronJobsDashboard() {
	const [jobs, setJobs] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [selectedJobId, setSelectedJobId] = useState(null);
	const [generatedAt, setGeneratedAt] = useState(null);
	const [historyLookbackDays, setHistoryLookbackDays] = useState(5);

	useEffect(() => {
		let mounted = true;

		const fetchJobs = async ({ quiet = false } = {}) => {
			if (!quiet && mounted) {
				setLoading(true);
			}

			try {
				const response = await axios.get(`${API_BASE_URL}/api/cron-jobs`);
				if (!mounted) return;

				const nextJobs = response.data?.jobs || [];
				setJobs(nextJobs);
				setGeneratedAt(response.data?.generatedAt || new Date().toISOString());
				setHistoryLookbackDays(response.data?.historyLookbackDays || 5);
				setSelectedJobId((current) => current || nextJobs[0]?.id || null);
				setError('');
			} catch (requestError) {
				if (!mounted) return;
				setError(requestError.response?.data?.error || 'Failed to load cron job status');
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		};

		fetchJobs();
		const intervalId = window.setInterval(() => {
			fetchJobs({ quiet: true });
		}, 15000);

		return () => {
			mounted = false;
			window.clearInterval(intervalId);
		};
	}, []);

	const selectedJob = useMemo(
		() => jobs.find((job) => job.id === selectedJobId) || jobs[0] || null,
		[jobs, selectedJobId]
	);

	const summary = useMemo(() => {
		return jobs.reduce(
			(accumulator, job) => {
				accumulator.total += 1;
				if (job.status === 'running') accumulator.running += 1;
				if (job.status === 'success') accumulator.success += 1;
				if (job.status === 'failed' || job.status === 'interrupted') accumulator.attention += 1;
				return accumulator;
			},
			{ total: 0, running: 0, success: 0, attention: 0 }
		);
	}, [jobs]);

	const columns = [
		{
			title: 'Job',
			dataIndex: 'jobName',
			key: 'jobName',
			render: (_, record) => (
				<div>
					<div className='cron-jobs__job-name'>{record.jobName}</div>
					<div className='cron-jobs__job-command'>{record.command}</div>
				</div>
			),
		},
		{
			title: 'Schedule',
			dataIndex: 'schedule',
			key: 'schedule',
			render: (_, record) => (
				<div>
					<div>{formatSchedule(record.schedule)}</div>
					<div className='cron-jobs__muted'>{record.timezone}</div>
				</div>
			),
		},
		{
			title: 'Status',
			dataIndex: 'status',
			key: 'status',
			render: (status, record) => (
				<Tag color={STATUS_COLORS[status] || 'default'}>
					{record.isRunning ? 'RUNNING' : String(status || 'unknown').toUpperCase()}
				</Tag>
			),
		},
		{
			title: 'Progress',
			dataIndex: 'progress',
			key: 'progress',
			render: (progress) => {
				if (!progress) return '—';
				return (
					<div className='cron-jobs__progress-cell'>
						<Progress percent={progress.percent || 0} size='small' />
						<div className='cron-jobs__muted'>
							{progress.processed}/{progress.total}
						</div>
					</div>
				);
			},
		},
		{
			title: 'Last Finished',
			dataIndex: 'lastFinishedAt',
			key: 'lastFinishedAt',
			render: (value) => formatDateTime(value),
		},
		{
			title: 'Duration',
			dataIndex: 'lastDurationLabel',
			key: 'lastDurationLabel',
			render: (_, record) => formatDuration(record.lastDurationLabel, record.lastDurationMs),
		},
	];

	return (
		<div className='cron-jobs'>
			<div className='cron-jobs__hero'>
				<div>
					<p className='cron-jobs__eyebrow'>Operations</p>
					<h1>Cron Job Monitor</h1>
					<p className='cron-jobs__subtitle'>
						Track schedule health, current progress, recent logs, notification delivery, and the last {historyLookbackDays} days of runs in one place.
					</p>
				</div>
				<div className='cron-jobs__hero-actions'>
					<Button onClick={() => window.location.reload()}>Refresh</Button>
					<div className='cron-jobs__generated-at'>Updated {formatDateTime(generatedAt)}</div>
				</div>
			</div>

			<div className='cron-jobs__summary-grid'>
				<div className='cron-jobs__summary-card'>
					<span>Total Jobs</span>
					<strong>{summary.total}</strong>
				</div>
				<div className='cron-jobs__summary-card'>
					<span>Running</span>
					<strong>{summary.running}</strong>
				</div>
				<div className='cron-jobs__summary-card'>
					<span>Healthy</span>
					<strong>{summary.success}</strong>
				</div>
				<div className='cron-jobs__summary-card cron-jobs__summary-card--attention'>
					<span>Needs Attention</span>
					<strong>{summary.attention}</strong>
				</div>
			</div>

			{error ? <Alert type='error' showIcon message={error} /> : null}

			<div className='cron-jobs__content'>
				<div className='cron-jobs__table-panel'>
					{loading ? (
						<div className='cron-jobs__loading'><Spin size='large' /></div>
					) : (
						<Table
							rowKey='id'
							columns={columns}
							dataSource={jobs}
							pagination={false}
							onRow={(record) => ({
								onClick: () => setSelectedJobId(record.id),
							})}
							rowClassName={(record) => (record.id === selectedJob?.id ? 'cron-jobs__row--selected' : '')}
						/>
					)}
				</div>

				<div className='cron-jobs__detail-panel'>
					{selectedJob ? (
						<>
							<div className='cron-jobs__detail-header'>
								<div>
									<h2>{selectedJob.jobName}</h2>
									<p>{selectedJob.command}</p>
								</div>
								<Tag color={STATUS_COLORS[selectedJob.status] || 'default'}>
									{selectedJob.isRunning ? 'RUNNING' : String(selectedJob.status || 'unknown').toUpperCase()}
								</Tag>
							</div>

							<div className='cron-jobs__detail-grid'>
								<div>
									<span>Schedule</span>
									<strong>{formatSchedule(selectedJob.schedule)}</strong>
									<div className='cron-jobs__muted'>{selectedJob.timezone}</div>
								</div>
								<div>
									<span>Last Started</span>
									<strong>{formatDateTime(selectedJob.lastStartedAt)}</strong>
								</div>
								<div>
									<span>Last Finished</span>
									<strong>{formatDateTime(selectedJob.lastFinishedAt)}</strong>
								</div>
								<div>
									<span>Last Notification</span>
									<strong>
										{selectedJob.lastNotification
											? `${selectedJob.lastNotification.success ? 'Sent' : 'Failed'}${selectedJob.lastNotification.fallbackUsed ? ' (fallback)' : ''}`
											: '—'}
									</strong>
								</div>
							</div>

							{selectedJob.progress ? (
								<div className='cron-jobs__detail-section'>
									<h3>Progress</h3>
									<Progress percent={selectedJob.progress.percent || 0} />
									<p className='cron-jobs__muted'>
										{selectedJob.progress.processed}/{selectedJob.progress.total} items processed
									</p>
								</div>
							) : null}

							{selectedJob.summary ? (
								<div className='cron-jobs__detail-section'>
									<h3>Result Summary</h3>
									<p>
										{selectedJob.summary.succeeded} succeeded, {selectedJob.summary.failed} failed out of {selectedJob.summary.total}
									</p>
								</div>
							) : null}

							{selectedJob.failedResults?.length ? (
								<div className='cron-jobs__detail-section'>
									<h3>Failed Steps</h3>
									<div className='cron-jobs__history-list'>
										{selectedJob.failedResults.map((step, index) => (
											<div className='cron-jobs__history-item' key={`${step.cmd || 'step'}-${index}`}>
												<div className='cron-jobs__history-error'>{formatFailedStep(step)}</div>
												{step.logFile ? <div className='cron-jobs__muted'>Log: {step.logFile}</div> : null}
											</div>
										))}
									</div>
								</div>
							) : null}

							<div className='cron-jobs__detail-section'>
								<h3>Recent Log Lines</h3>
								<pre className='cron-jobs__log-box'>
									{selectedJob.recentLogLines?.length
										? selectedJob.recentLogLines.join('\n')
										: 'No log output available yet.'}
								</pre>
							</div>

							{selectedJob.lastError ? (
								<div className='cron-jobs__detail-section'>
									<h3>Last Error</h3>
									<pre className='cron-jobs__error-box'>{selectedJob.lastError}</pre>
								</div>
							) : null}

							<div className='cron-jobs__detail-section'>
								<h3>Run History ({historyLookbackDays} days)</h3>
								{selectedJob.history?.length ? (
									<div className='cron-jobs__history-list'>
										{selectedJob.history.map((entry) => (
											<div className='cron-jobs__history-item' key={entry.id}>
												<div className='cron-jobs__history-top'>
													<strong>{formatHistoryDayLabel(entry.finishedAt || entry.startedAt)}</strong>
													<Tag color={STATUS_COLORS[entry.status] || 'default'}>
														{String(entry.status || 'unknown').toUpperCase()}
													</Tag>
												</div>
												<div className='cron-jobs__history-meta'>
													<span>{formatDateTime(entry.startedAt)}</span>
													<span>{formatDuration(entry.durationLabel, entry.durationMs)}</span>
													<span>
														{entry.notification
															? `${entry.notification.success ? 'email sent' : 'email failed'}${entry.notification.fallbackUsed ? ' (fallback)' : ''}`
															: 'no email info'}
													</span>
												</div>
												{entry.summary ? (
													<div className='cron-jobs__history-summary'>
														{entry.summary.succeeded} succeeded, {entry.summary.failed} failed out of {entry.summary.total}
													</div>
												) : null}
												{entry.failedResults?.length ? (
													<div className='cron-jobs__history-summary'>
														{entry.failedResults.map((step, index) => (
															<div key={`${entry.id}-failed-${index}`}>{formatFailedStep(step)}</div>
														))}
													</div>
												) : null}
												{entry.error ? <div className='cron-jobs__history-error'>{entry.error}</div> : null}
											</div>
										))}
									</div>
								) : (
									<p className='cron-jobs__muted'>History will populate as new runs are recorded after this deployment.</p>
								)}
							</div>
						</>
					) : (
						<div className='cron-jobs__empty'>No cron jobs found.</div>
					)}
				</div>
			</div>
		</div>
	);
}