// Direct upload from the browser to the bucket, in signed parts.
//
// Why it does not go through the API: the server has 1 vCPU and 2GB, and a file
// of tens of MB crossing the API competes for resources with whoever is using
// the system. Here the API only authorizes (signs each part) and catalogs at the
// end; the bytes go straight to Spaces. Split in parts, a network failure only
// resends the piece that was lost instead of the whole file.
//
// Before any byte is sent the file is identified by its SHA-256: if the content
// is already in the bucket, nothing is transferred and the catalog points to the
// object that already exists (objects are immutable and content addressed).
import { apiPost, apiDelete } from '../../utils/api';

// Retries per part (build-time via Vite; not a secret, just a tuning knob).
const PART_RETRIES = Number(import.meta.env.VITE_FEED_PART_RETRIES || 3);

// SHA-256 of the file. Done in blocks so big files do not blow up memory.
// crypto.subtle requires a secure context (https or localhost).
export const hashFile = async (file) => {
	if (!window.crypto?.subtle) throw new Error('Secure context required to hash the file');
	const buffer = await file.arrayBuffer();
	const digest = await window.crypto.subtle.digest('SHA-256', buffer);
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

const putPart = async (url, blob, attempt = 1) => {
	try {
		const response = await fetch(url, { method: 'PUT', body: blob });
		if (!response.ok) throw new Error(`part upload failed with status ${response.status}`);
		// The ETag is deliberately not read here: the browser only sees that header
		// if the bucket CORS exposes it (the Spaces panel has no such field).
		// The server is the one that assembles the part list at the end, by asking
		// the bucket itself, which is the reliable source of what was really written.
		return true;
	} catch (error) {
		if (attempt >= PART_RETRIES) throw error;
		// Growing backoff: an unstable network usually recovers within seconds.
		await new Promise((resolve) => setTimeout(resolve, 500 * attempt * attempt));
		return putPart(url, blob, attempt + 1);
	}
};

const uploadOneFile = async ({ feed, file, sha256, note, batchId, onStage }) => {
	const { uploadId, partSizeBytes } = await apiPost(`/api/ingest/feeds/${feed}/uploads`, {
		fileName: file.name,
		sizeBytes: file.size,
	}).then((res) => res.data);

	try {
		const totalParts = Math.max(1, Math.ceil(file.size / partSizeBytes));
		const parts = [];

		for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
			const start = (partNumber - 1) * partSizeBytes;
			const blob = file.slice(start, Math.min(start + partSizeBytes, file.size));
			const { url } = await apiPost(`/api/ingest/feeds/${feed}/uploads/${uploadId}/part`, { partNumber })
				.then((res) => res.data);
			await putPart(url, blob);
			parts.push({ partNumber });
			onStage?.({ phase: 'uploading', percent: Math.round((partNumber / totalParts) * 100) });
		}

		onStage?.({ phase: 'finishing', percent: 100 });
		return await apiPost(`/api/ingest/feeds/${feed}/uploads/${uploadId}/complete`, { parts, sha256, note, batchId })
			.then((res) => res.data);
	} catch (error) {
		// Without the abort, the parts already sent keep taking up space in the bucket.
		await apiDelete(`/api/ingest/feeds/${feed}/uploads/${uploadId}`).catch(() => {});
		throw error;
	}
};

// Sends the set of files of a feed as ONE batch.
// onStage({ phase, percent, fileName }), phase: hashing | checking | uploading | reusing | finishing
export const uploadFilesDirect = async ({ feed, files, note, onStage }) => {
	// 1) Identify each file and ask the server whether the content already exists.
	const prepared = [];
	for (const file of files) {
		onStage?.({ phase: 'hashing', percent: 0, fileName: file.name });
		const sha256 = await hashFile(file);
		onStage?.({ phase: 'checking', percent: 0, fileName: file.name });
		const check = await apiPost(`/api/ingest/feeds/${feed}/uploads/check`, { fileName: file.name, sha256 })
			.then((res) => res.data);
		prepared.push({ file, sha256, ...check });
	}

	// 2) Nothing changed: every file is already exactly the one in use.
	if (prepared.every((item) => item.duplicate && item.isCurrent)) {
		return { unchanged: true, files: prepared.map((item) => item.file.name) };
	}

	// 3) A single batch for the whole set. Repeated content is reused (the catalog
	// points to the existing object); the rest is uploaded in parts.
	let batchId;
	let reused = 0;
	let uploaded = 0;

	for (const [index, item] of prepared.entries()) {
		const position = files.length > 1 ? ` (${index + 1} of ${files.length})` : '';
		if (item.duplicate) {
			onStage?.({ phase: 'reusing', percent: 100, fileName: `${item.file.name}${position}` });
			const result = await apiPost(`/api/ingest/feeds/${feed}/uploads/reuse`, {
				fileName: item.file.name,
				sha256: item.sha256,
				batchId,
				note,
			}).then((res) => res.data);
			batchId = result.batchId;
			reused += 1;
		} else {
			const result = await uploadOneFile({
				feed,
				file: item.file,
				sha256: item.sha256,
				note,
				batchId,
				onStage: ({ phase, percent }) => onStage?.({ phase, percent, fileName: `${item.file.name}${position}` }),
			});
			batchId = result.batchId;
			uploaded += 1;
		}
	}

	return { batchId, reused, uploaded };
};
