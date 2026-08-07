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
//
// The whole set is registered in a SINGLE call at the end. Registering file by
// file left a multi-file feed (Keystone, Quadratec) with no complete batch in
// between: the panel read "no data", and if the second file failed it stayed
// that way, taking the vendor scripts down with it that night.
import { apiPost, apiDelete } from '../../utils/api';
import { Sha256 } from './sha256';

// Retries per part (build-time via Vite; not a secret, just a tuning knob).
const PART_RETRIES = Number(import.meta.env.VITE_FEED_PART_RETRIES || 3);

// Read the file in slices to hash it. Reading the whole thing at once is what
// takes the tab down on the 100MB-class files this panel accepts.
const HASH_CHUNK_BYTES = 8 * 1024 * 1024;

// SHA-256 of the file, one slice at a time, so memory stays flat whatever the
// file size. Same digest the server computes over the stored object.
export const hashFile = async (file, onProgress) => {
	const digest = new Sha256();
	for (let offset = 0; offset < file.size; offset += HASH_CHUNK_BYTES) {
		const slice = await file.slice(offset, offset + HASH_CHUNK_BYTES).arrayBuffer();
		digest.update(new Uint8Array(slice));
		onProgress?.(Math.round((Math.min(offset + HASH_CHUNK_BYTES, file.size) / file.size) * 100));
	}
	return digest.hex();
};

const putPart = async (url, blob, signal, attempt = 1) => {
	try {
		const response = await fetch(url, { method: 'PUT', body: blob, signal });
		if (!response.ok) throw new Error(`part upload failed with status ${response.status}`);
		// The ETag is deliberately not read here: the browser only sees that header
		// if the bucket CORS exposes it (the Spaces panel has no such field).
		// The server is the one that assembles the part list at the end, by asking
		// the bucket itself, which is the reliable source of what was really written.
		return true;
	} catch (error) {
		if (signal?.aborted || attempt >= PART_RETRIES) throw error;
		// Growing backoff: an unstable network usually recovers within seconds.
		await new Promise((resolve) => setTimeout(resolve, 500 * attempt * attempt));
		return putPart(url, blob, signal, attempt + 1);
	}
};

// Sends one file and finishes its multipart. It does NOT catalog: the batch is
// registered once, by uploadFilesDirect, after every file is in the bucket.
const uploadOneFile = async ({ feed, file, sha256, signal, onStage }) => {
	const { uploadId, partSizeBytes } = await apiPost(`/api/ingest/feeds/${feed}/uploads`, {
		fileName: file.name,
		sizeBytes: file.size,
	}).then((res) => res.data);

	try {
		const totalParts = Math.max(1, Math.ceil(file.size / partSizeBytes));

		for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
			const start = (partNumber - 1) * partSizeBytes;
			const blob = file.slice(start, Math.min(start + partSizeBytes, file.size));
			const { url } = await apiPost(`/api/ingest/feeds/${feed}/uploads/${uploadId}/part`, { partNumber })
				.then((res) => res.data);
			await putPart(url, blob, signal);
			onStage?.({ phase: 'uploading', percent: Math.round((partNumber / totalParts) * 100) });
		}

		onStage?.({ phase: 'finishing', percent: 100 });
		await apiPost(`/api/ingest/feeds/${feed}/uploads/${uploadId}/complete`, { parts: totalParts, sha256 });
		return uploadId;
	} catch (error) {
		// Without the abort, the parts already sent keep taking up space in the bucket.
		await apiDelete(`/api/ingest/feeds/${feed}/uploads/${uploadId}`).catch(() => {});
		throw error;
	}
};

// Sends the set of files of a feed as ONE batch.
// onStage({ phase, percent, fileName }), phase: hashing | checking | uploading | reusing | finishing
export const uploadFilesDirect = async ({ feed, files, note, signal, onStage }) => {
	// 1) Identify each file and ask the server whether the content already exists.
	const prepared = [];
	for (const file of files) {
		onStage?.({ phase: 'hashing', percent: 0, fileName: file.name });
		const sha256 = await hashFile(file, (percent) =>
			onStage?.({ phase: 'hashing', percent, fileName: file.name }));
		onStage?.({ phase: 'checking', percent: 0, fileName: file.name });
		const check = await apiPost(`/api/ingest/feeds/${feed}/uploads/check`, { fileName: file.name, sha256 })
			.then((res) => res.data);
		prepared.push({ file, sha256, ...check });
	}

	// 2) Nothing changed: every file is already exactly the one in use.
	if (prepared.every((item) => item.duplicate && item.isCurrent)) {
		return { unchanged: true, files: prepared.map((item) => item.file.name) };
	}

	// 3) Send the bytes that are missing. Content already in the bucket moves
	// nothing and is only named in the commit below.
	const uploadIds = [];
	const reuse = [];

	try {
		for (const [index, item] of prepared.entries()) {
			const position = files.length > 1 ? ` (${index + 1} of ${files.length})` : '';
			if (item.duplicate) {
				onStage?.({ phase: 'reusing', percent: 100, fileName: `${item.file.name}${position}` });
				reuse.push({ fileName: item.file.name, sha256: item.sha256 });
				continue;
			}
			uploadIds.push(await uploadOneFile({
				feed,
				file: item.file,
				sha256: item.sha256,
				signal,
				onStage: ({ phase, percent }) => onStage?.({ phase, percent, fileName: `${item.file.name}${position}` }),
			}));
		}
	} catch (error) {
		// Anything already finished is dropped as well: a half batch in the catalog
		// is exactly what this rewrite exists to prevent.
		await Promise.all(uploadIds.map((uploadId) =>
			apiDelete(`/api/ingest/feeds/${feed}/uploads/${uploadId}`).catch(() => {})));
		throw error;
	}

	// 4) One call registers the whole set, or none of it. The file dates go with
	// it: once the file lives in the bucket, the copy on the server is a symlink
	// into the download cache and its date is when WE fetched it, so the date the
	// export actually carries has to travel from the browser.
	const sourceModifiedAt = Object.fromEntries(
		prepared.filter((item) => item.file.lastModified > 0).map((item) => [item.file.name, item.file.lastModified])
	);

	onStage?.({ phase: 'finishing', percent: 100, fileName: 'registering the batch' });
	const result = await apiPost(`/api/ingest/feeds/${feed}/uploads/commit`, { uploadIds, reuse, note, sourceModifiedAt })
		.then((res) => res.data);

	return { batchId: result.batchId, reused: result.reused, uploaded: result.uploaded, carriedForward: result.carriedForward || [] };
};
