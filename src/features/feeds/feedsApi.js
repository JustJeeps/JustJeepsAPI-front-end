// Chamadas HTTP da feature Feeds (catálogo de feeds de vendor no Spaces).
// Funções finas sobre o axios global (via src/utils/api.js) — token e
// interceptors do AuthContext. Upload exige usuário de triage (o back valida).
import { apiGet, apiPost } from '../../utils/api';

export const fetchFeeds = () => apiGet('/api/ingest/feeds').then((res) => res.data);

export const fetchFeedRuns = (feed, limit = 10) =>
	apiGet('/api/ingest/runs', { params: { feed, limit } }).then((res) => res.data);

// files: File[] do input — feeds multi-arquivo exigem TODOS os arquivos numa
// request só (o back responde 409 FEED_BATCH_INCOMPLETE se faltar algum).
// Dispara o script do feed no servidor (assíncrono) e acompanha o resultado.
export const runFeedScript = (feed) => apiPost(`/api/ingest/feeds/${feed}/run`).then((res) => res.data);

export const fetchFeedRunStatus = (feed) =>
	apiGet(`/api/ingest/feeds/${feed}/run-status`).then((res) => res.data);

// onProgress recebe 0..100 — planilhas de feed passam de 30MB e o envio leva
// tempo suficiente para a tela parecer travada sem indicação.
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
