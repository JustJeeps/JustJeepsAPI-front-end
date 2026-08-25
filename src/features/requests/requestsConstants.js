// Espelho das constantes de domínio do back-end (config/requests.js).
// A fonte de verdade em runtime é GET /api/requests/meta (triageUsers,
// limites de anexos); aqui ficam ordem e cores para render imediato.

export const STATUSES = [
	{ name: 'New Request', color: '#a855f7' },
	{ name: 'Estimation', color: '#0b8ce9' },
	{ name: 'Assigned', color: '#f97316' },
	{ name: 'Work in Progress', color: '#10a35a' },
	{ name: 'Awaiting Client Response', color: '#fbbf24' },
	{ name: 'On Hold', color: '#ef4444' },
	{ name: 'Completed', color: '#2563eb' },
	{ name: 'Closed', color: '#1a8c5c' },
];

export const STATUS_NAMES = STATUSES.map((status) => status.name);

// Status "concluídos": alimentam a lane Done do board e o recorte "All open".
// Não controlam mais quem arquiva — qualquer status é arquivável pelo autor
// ou triage (regra no back, lib/requests/archive.js).
export const DONE_STATUSES = ['Completed', 'Closed'];

// Quem pode arquivar/deletar um chamado: o autor, triage, ou admin do SETOR
// do chamado (espelho de lib/requests/permissions.js + actorContext no back,
// que é quem decide de verdade). adminSectorIds vem de meta.myRoles.
export const canManageRequest = (request, currentUser, isTriage, adminSectorIds = []) => {
	if (!request || !currentUser) return false;
	if (Boolean(isTriage) || request.requester?.id === currentUser.id) return true;
	return Boolean(request.sector?.id) && adminSectorIds.includes(request.sector.id);
};

// Boards por setor (2026-08-11): o back manda (meta.myRoles vem de
// GET /api/requests/meta); estes predicados só escondem/mostram UI.
export const isSectorAdmin = (meta, sectorId) =>
	Boolean(meta?.myRoles?.adminSectorIds?.includes(sectorId));

// Recorte da tela por setor: null/undefined = "All". Chamado sem setor
// (dado antigo em trânsito de deploy) só aparece no All.
export const matchesSector = (request, sectorId) => {
	if (sectorId === null || sectorId === undefined) return true;
	return request.sector?.id === sectorId;
};

// Assignment por setor (2026-08-14): o select de assignee só oferece MEMBROS
// do setor do chamado (meta.sectors[].memberIds) + os assignees atuais
// (grandfathered — chamado movido mantém o responsável). Espelho cosmético:
// o back valida de verdade (409 ASSIGNEE_NOT_IN_SECTOR). Sem memberIds no
// meta (payload antigo em trânsito de deploy), não filtra.
export const assignableUsers = (users, meta, request) => {
	const sector = (meta?.sectors || []).find((entry) => entry.id === request?.sector?.id);
	if (!sector?.memberIds) return users;
	const current = new Set((request.assignees || []).map((entry) => entry.user_id ?? entry.user?.id));
	return users.filter((user) => sector.memberIds.includes(user.id) || current.has(user.id));
};

// Onde o usuário pode ABRIR chamado (2026-08-21): triage em qualquer setor
// ativo; não-triage só no General (catch-all) ou em setor do qual é membro.
// Espelho cosmético — o back decide de verdade (409 SECTOR_NOT_MEMBER).
export const creatableSectors = (meta, isTriage) => {
	const active = (meta?.sectors || []).filter((sector) => !sector.archivedAt);
	if (isTriage) return active;
	const memberIds = meta?.myRoles?.memberSectorIds || [];
	return active.filter((sector) => sector.slug === 'general' || memberIds.includes(sector.id));
};

// Troca de setor no modal de criação: mantém na seleção só quem é membro do
// novo setor (as opções do select já mudaram; id invisível garantiria um 409
// no POST). Sem memberIds no meta, não poda — espelho de assignableUsers.
export const pruneAssigneeSelection = (selectedIds, meta, sectorId) => {
	const ids = selectedIds || [];
	const sector = (meta?.sectors || []).find((entry) => entry.id === sectorId);
	if (!sector?.memberIds) return ids;
	return ids.filter((id) => sector.memberIds.includes(id));
};

// Eixo de ciclo de vida do chamado (ativo / arquivado / deletado). Explícito
// para os eixos não se cruzarem: na lixeira a lista já vem só de deletados,
// então não se filtra por arquivado de novo — senão um chamado arquivado E
// depois deletado não apareceria em lugar nenhum, sem como restaurar.
export const matchesLifecycle = (request, view) => {
	if (view === 'deleted') return true;
	if (view === 'archived') return Boolean(request.archivedAt);
	return !request.archivedAt;
};

// Chamado "parado": sem atualização há mais de 7 dias e ainda não fechado.
// Regra de domínio usada pelo KPI e pelo recorte de views — uma fonte só.
const AGING_DAYS = 7;
export const isAging = (request) =>
	request.status !== 'Closed'
	&& Date.now() - new Date(request.updatedAt).getTime() > AGING_DAYS * 24 * 60 * 60 * 1000;

// Lanes do board (pedido de 2026-08-03): 4 colunas agregando os 8 status.
// dropStatus = status aplicado ao soltar um card na lane; para 'requests' o
// alvo depende de ter assignee (Assigned) ou não (New Request).
export const BOARD_LANES = [
	{ key: 'requests', name: 'Requests', color: '#a855f7', statuses: ['New Request', 'Estimation', 'Assigned'] },
	{ key: 'doing', name: 'Doing', color: '#10a35a', statuses: ['Work in Progress'], dropStatus: 'Work in Progress' },
	{ key: 'blocked', name: 'Blocked', color: '#ef4444', statuses: ['Awaiting Client Response', 'On Hold'], dropStatus: 'On Hold' },
	{ key: 'done', name: 'Done', color: '#2563eb', statuses: DONE_STATUSES, dropStatus: 'Completed' },
];


export const STATUS_COLORS = Object.fromEntries(STATUSES.map((status) => [status.name, status.color]));

// Status que exigem comentário na transição (validado também no back).
export const COMMENT_REQUIRED_STATUSES = ['Awaiting Client Response', 'On Hold', 'Completed'];


export const PRIORITIES = ['Urgent', 'High', 'Normal', 'Low'];

export const PRIORITY_COLORS = {
	Urgent: '#dc2626',
	High: '#f97316',
	Normal: '#64748b',
	Low: '#a3a3a3',
};

// Listas revisadas em 2026-08-21 (espelho de config/requests.js no back).
// Na UI o campo `project` aparece como "System / Area" e `type` como
// "Request Type"; chamados antigos mantem os valores anteriores.
export const PROJECTS = [
	'Just Jeeps — Canadian Website',
	'Just Jeeps — U.S. Website',
	'Just Jeeps — Both Websites',
	'Magento Backend',
	'Pricing Tool',
	'PO Tool',
	'Helpdesk Ticket System',
	'Integrations',
	'Other',
];

export const TYPES = [
	'Fix an Issue / Something Not Working',
	'Product Information / Image / Fitment Correction',
	'Pricing Update',
	'Change / Improvement Request',
	'Investigation / Testing',
	'Access / Settings Change',
	'Other',
];

export const requestRef = (id) => `REQ-${id}`;

export const userLabel = (user) => {
	if (!user) return 'Unassigned';
	const name = [user.firstname, user.lastname].filter(Boolean).join(' ').trim();
	return name || user.username || user.email;
};

export const userInitials = (user) => {
	if (!user) return '—';
	const first = (user.firstname || user.username || '?')[0] || '?';
	const last = (user.lastname || '')[0] || '';
	return `${first}${last}`.toUpperCase();
};

export const formatDate = (value) => {
	if (!value) return '';
	return new Date(value).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
};

export const relativeTime = (value) => {
	if (!value) return '';
	const diffMs = Date.now() - new Date(value).getTime();
	const minutes = Math.floor(diffMs / 60000);
	if (minutes < 1) return 'just now';
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	const months = Math.floor(days / 30);
	return `${months}mo ago`;
};

// Similaridade simples por sobreposição de tokens, para o hint de duplicado
// no modal de criação (client-side, sobre a lista já carregada).
export const findSimilarRequest = (title, requests) => {
	const tokens = String(title || '')
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter((token) => token.length > 3);
	if (tokens.length < 2) return null;
	let best = null;
	let bestScore = 0;
	for (const request of requests) {
		const other = String(request.title || '').toLowerCase();
		const score = tokens.filter((token) => other.includes(token)).length / tokens.length;
		if (score > bestScore) {
			best = request;
			bestScore = score;
		}
	}
	return bestScore >= 0.5 ? best : null;
};
