// Chamadas HTTP da feature de Requests. Funções finas sobre o axios global
// (via src/utils/api.js) — o token/interceptors vêm do AuthContext.
import { apiGet, apiPost, apiPatch, apiDelete } from '../../utils/api';

export const fetchRequests = () => apiGet('/api/requests').then((res) => res.data);

export const fetchRequestDetail = (id) => apiGet(`/api/requests/${id}`).then((res) => res.data);

export const fetchRequestsMeta = () => apiGet('/api/requests/meta').then((res) => res.data);

// Cache de módulo do meta, compartilhado por Navbar (item Requests + engrenagem)
// e SettingsPage. Chaveado pelo usuário: logout/login não recarregam a página
// (é SPA), então sem a chave o próximo usuário herdaria as permissões do
// anterior na UI. Falha limpa o cache para permitir retry.
let metaCache = { key: null, promise: null };
export const fetchRequestsMetaCached = (cacheKey) => {
	if (metaCache.key !== cacheKey || !metaCache.promise) {
		metaCache = {
			key: cacheKey,
			promise: fetchRequestsMeta().catch((error) => {
				metaCache = { key: null, promise: null };
				throw error;
			}),
		};
	}
	return metaCache.promise;
};

export const fetchUsers = () => apiGet('/api/users').then((res) => res.data);

export const createRequest = (payload) => apiPost('/api/requests', payload).then((res) => res.data);

// patch: { title?, description?, project?, type?, priority?, links?, status?,
//          assigneeIds? (lista completa; primeiro = primário), assigneeId? (legado), comment? }
export const updateRequest = (id, patch) => apiPatch(`/api/requests/${id}`, patch).then((res) => res.data);

export const addComment = (id, { body, internal }) =>
	apiPost(`/api/requests/${id}/comments`, { body, internal }).then((res) => res.data);

export const uploadAttachments = (id, files) => {
	const formData = new FormData();
	files.forEach((file) => formData.append('files', file));
	return apiPost(`/api/requests/${id}/attachments`, formData).then((res) => res.data);
};

export const deleteAttachment = (id, attachmentId) =>
	apiDelete(`/api/requests/${id}/attachments/${attachmentId}`);

export const deleteRequest = (id) => apiDelete(`/api/requests/${id}`);

export const restoreRequest = (id) => apiPost(`/api/requests/${id}/restore`).then((res) => res.data);

export const fetchDeletedRequests = () =>
	apiGet('/api/requests?deleted=true').then((res) => res.data);

export const createTrelloCard = (id) =>
	apiPost(`/api/requests/${id}/trello-card`).then((res) => res.data);

// Download autenticado: blob via axios (o interceptor injeta o Bearer) e
// clique num object URL — mesmo padrão do CronJobsDashboard.
export const downloadAttachment = async (id, attachment) => {
	const response = await apiGet(`/api/requests/${id}/attachments/${attachment.id}/download`, {
		responseType: 'blob',
	});
	const objectUrl = URL.createObjectURL(response.data);
	const anchor = document.createElement('a');
	anchor.href = objectUrl;
	anchor.download = attachment.originalName;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(objectUrl);
};
