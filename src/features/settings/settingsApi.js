// Chamadas HTTP da feature Settings (configuração Trello). Funções finas
// sobre o axios global (via src/utils/api.js) — token/interceptors do
// AuthContext. Todas as rotas exigem usuário de triage (o back valida).
import { apiGet, apiPost, apiPut, apiDelete } from '../../utils/api';

export const fetchTrelloSettings = () => apiGet('/api/trello-settings').then((res) => res.data);

// apiToken omitido ou mascarado (••••) mantém o token atual no back.
export const saveTrelloSettings = ({ apiKey, apiToken }) =>
	apiPut('/api/trello-settings', { apiKey, apiToken }).then((res) => res.data);

export const clearTrelloSettings = () => apiDelete('/api/trello-settings');

export const testTrelloConnection = (credentials = {}) =>
	apiPost('/api/trello-settings/test', credentials).then((res) => res.data);

export const fetchTrelloBoards = () => apiGet('/api/trello-settings/boards').then((res) => res.data);

export const fetchTrelloBoardLists = (boardId) =>
	apiGet(`/api/trello-settings/boards/${boardId}/lists`).then((res) => res.data);

export const fetchTrelloUserBoards = () =>
	apiGet('/api/trello-settings/user-boards').then((res) => res.data);

// payload: { boardId, boardName, listId, listName } ou { boardId: null } (remove)
export const saveTrelloUserBoard = (userId, payload) =>
	apiPut(`/api/trello-settings/user-boards/${userId}`, payload).then((res) => res.data);

export const fetchUsersLite = () => apiGet('/api/users').then((res) => res.data);
