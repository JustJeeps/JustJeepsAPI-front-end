import { apiGet, apiPost } from '../../utils/api';

// API do import de reviews (docs/REVIEWS-IMPORT.md no back). Regra de negocio
// chega como 409 (REVIEWS_RESTRICTED, DUPLICATE_FILE, SYNC_ALREADY_RUNNING...),
// nunca 403 — o interceptor do AuthContext desloga em 403 de auth.

export const fetchReviewsMeta = async () => (await apiGet('/api/reviews/meta')).data;

export const fetchReviewFiles = async () => (await apiGet('/api/reviews/files')).data;

export const uploadReviewFile = async (file, onProgress) => {
	const formData = new FormData();
	formData.append('file', file);
	const response = await apiPost('/api/reviews/files', formData, {
		onUploadProgress: (event) => {
			if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
		},
	});
	return response.data;
};

export const startFileSync = async (fileId) => (await apiPost(`/api/reviews/files/${fileId}/sync`)).data;

export const retryFailedRows = async (fileId) => (await apiPost(`/api/reviews/files/${fileId}/retry-failed`)).data;

// Historico de runs do sync (feed fora do registry de feeds; o back esconde
// para quem nao esta na allowlist).
export const fetchReviewRuns = async (limit = 10) =>
	(await apiGet(`/api/ingest/runs?feed=magento-reviews&limit=${limit}`)).data;
