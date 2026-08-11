// Chamadas HTTP dos Setores (boards por setor). Funções finas sobre o axios
// global (via src/utils/api.js). Permissões valem no back: criar é triage;
// gerenciar (membros, board do Trello, rename) é triage ou admin DO setor.
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../../utils/api';

export const fetchSectors = () => apiGet('/api/sectors').then((res) => res.data);

export const createSector = ({ name, color }) =>
	apiPost('/api/sectors', { name, color }).then((res) => res.data);

// patch: { name?, color?, archived? }
export const updateSector = (sectorId, patch) =>
	apiPatch(`/api/sectors/${sectorId}`, patch).then((res) => res.data);

export const setSectorMember = (sectorId, userId, role) =>
	apiPut(`/api/sectors/${sectorId}/members/${userId}`, { role }).then((res) => res.data);

export const removeSectorMember = (sectorId, userId) =>
	apiDelete(`/api/sectors/${sectorId}/members/${userId}`).then((res) => res.data);

// payload: { boardId, boardName, listId, listName } ou { boardId: null } (remove)
export const saveSectorTrelloBoard = (sectorId, payload) =>
	apiPut(`/api/sectors/${sectorId}/trello-board`, payload).then((res) => res.data);

// Dropdowns do mapping (triage ou admin de algum setor; credenciais seguem
// exclusivas de /api/trello-settings).
export const fetchSectorTrelloBoards = () =>
	apiGet('/api/sectors/trello/boards').then((res) => res.data);

export const fetchSectorTrelloBoardLists = (boardId) =>
	apiGet(`/api/sectors/trello/boards/${boardId}/lists`).then((res) => res.data);

export const fetchSectorActivity = (sectorId) =>
	apiGet(`/api/sectors/${sectorId}/activity`).then((res) => res.data);
