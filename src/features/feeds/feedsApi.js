// HTTP calls for the Feeds feature (vendor feed catalog in Spaces).
// Thin functions over the global axios instance (via src/utils/api.js), so they
// keep the token and the interceptors from AuthContext. Uploading requires a
// triage user (the backend validates it).
import { apiGet, apiPost } from '../../utils/api';

export const fetchFeeds = () => apiGet('/api/ingest/feeds').then((res) => res.data);

export const fetchFeedRuns = (feed, limit = 10) =>
	apiGet('/api/ingest/runs', { params: { feed, limit } }).then((res) => res.data);

// files: File[] from the input, and multi-file feeds require ALL the files in a
// single request (the backend answers 409 FEED_BATCH_INCOMPLETE if one is missing).
// Triggers the feed script on the server (async) and follows the result.
export const runFeedScript = (feed) => apiPost(`/api/ingest/feeds/${feed}/run`).then((res) => res.data);

// Goes and gets the file at the vendor now. The schedule (4:47/16:47) sometimes
// runs before the vendor has published, and the result is a successful run that
// downloaded the previous day's file.
export const fetchFeedFromVendor = (feed) => apiPost(`/api/ingest/feeds/${feed}/fetch`).then((res) => res.data);

export const fetchFeedRunStatus = (feed) =>
	apiGet(`/api/ingest/feeds/${feed}/run-status`).then((res) => res.data);

// onProgress receives 0..100: feed spreadsheets go over 30MB and the upload takes
// long enough that the screen looks frozen without any indication.
export const uploadFeedFiles = (feed, files, note, onProgress) => {
	const formData = new FormData();
	files.forEach((file) => formData.append('files', file));
	if (note) formData.append('note', note);
	return apiPost(`/api/ingest/feeds/${feed}/upload`, formData, {
		onUploadProgress: (event) => {
			if (!onProgress || !event.total) return;
			onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
		},
	}).then((res) => res.data);
};
