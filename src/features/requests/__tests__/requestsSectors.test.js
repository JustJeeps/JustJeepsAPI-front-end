import { describe, it, expect } from 'vitest';
import {
	isSectorAdmin,
	matchesSector,
	canManageRequest,
	assignableUsers,
	creatableSectors,
	pruneAssigneeSelection,
} from '../requestsConstants';
import { sectorTabsFor } from '../RequestsSectorTabs';

// Boards por setor (2026-08-11): predicados puros espelhando o back
// (lib/sectors/permissions.js + requestsService.actorContext). O back decide
// de verdade; aqui só se esconde/mostra UI.

const meta = {
	sectors: [
		{ id: 1, name: 'General', slug: 'general', members: [{ userId: 10, username: 'ricardo', role: 'admin' }] },
		{ id: 3, name: 'TI', slug: 'ti', members: [{ userId: 20, username: 'rafael', role: 'member' }] },
	],
	myRoles: { adminSectorIds: [1], memberSectorIds: [1, 3] },
};

const request = (overrides = {}) => ({
	id: 1,
	requester: { id: 99 },
	sector: { id: 3, name: 'TI', slug: 'ti' },
	...overrides,
});

describe('isSectorAdmin', () => {
	it('usa meta.myRoles.adminSectorIds', () => {
		expect(isSectorAdmin(meta, 1)).toBe(true);
		expect(isSectorAdmin(meta, 3)).toBe(false);
	});

	it('meta ausente ou sem myRoles nao estoura', () => {
		expect(isSectorAdmin(null, 1)).toBe(false);
		expect(isSectorAdmin({}, 1)).toBe(false);
	});
});

describe('matchesSector', () => {
	it('sem setor selecionado, nada e filtrado', () => {
		expect(matchesSector(request(), null)).toBe(true);
		expect(matchesSector(request(), undefined)).toBe(true);
	});

	it('filtra pelo id do setor do chamado', () => {
		expect(matchesSector(request(), 3)).toBe(true);
		expect(matchesSector(request(), 1)).toBe(false);
	});

	it('chamado sem setor (dado antigo em transito) so aparece no All', () => {
		expect(matchesSector(request({ sector: null }), null)).toBe(true);
		expect(matchesSector(request({ sector: null }), 3)).toBe(false);
	});
});

describe('sectorTabsFor (visibilidade por membership, 2026-08-12)', () => {
	const wideMeta = {
		sectors: [
			{ id: 1, name: 'General', slug: 'general' },
			{ id: 3, name: 'TI', slug: 'ti' },
			{ id: 4, name: 'Vendas', slug: 'vendas', archivedAt: '2026-08-01' },
		],
		myRoles: { adminSectorIds: [], memberSectorIds: [3] },
	};

	it('triage ve todos os setores ativos (arquivado fica de fora)', () => {
		expect(sectorTabsFor(wideMeta, true).map((s) => s.id)).toEqual([1, 3]);
	});

	it('nao-triage ve so os setores dos quais e membro', () => {
		expect(sectorTabsFor(wideMeta, false).map((s) => s.id)).toEqual([3]);
	});

	it('sem membership nenhum, lista vazia (a tela mostra so os proprios chamados no All)', () => {
		const meta = { ...wideMeta, myRoles: { adminSectorIds: [], memberSectorIds: [] } };
		expect(sectorTabsFor(meta, false)).toEqual([]);
	});

	it('meta ausente nao estoura', () => {
		expect(sectorTabsFor(null, false)).toEqual([]);
	});
});

describe('assignableUsers (assignment por membros do setor, 2026-08-14)', () => {
	const allUsers = [{ id: 1 }, { id: 2 }, { id: 9 }];
	const metaWithMembers = {
		sectors: [
			{ id: 3, name: 'TI', slug: 'ti', memberIds: [1, 2] },
			{ id: 1, name: 'General', slug: 'general', memberIds: [1, 2, 9] },
		],
	};

	it('filtra pelas opcoes do setor do chamado', () => {
		const req = { sector: { id: 3 }, assignees: [] };
		expect(assignableUsers(allUsers, metaWithMembers, req).map((u) => u.id)).toEqual([1, 2]);
	});

	it('assignee atual fora do setor continua na lista (grandfathered)', () => {
		const req = { sector: { id: 3 }, assignees: [{ user_id: 9 }] };
		expect(assignableUsers(allUsers, metaWithMembers, req).map((u) => u.id)).toEqual([1, 2, 9]);
	});

	it('sem memberIds no meta (payload antigo em transito), nao filtra', () => {
		const req = { sector: { id: 3 }, assignees: [] };
		const oldMeta = { sectors: [{ id: 3, name: 'TI', slug: 'ti' }] };
		expect(assignableUsers(allUsers, oldMeta, req).length).toBe(3);
	});
});

describe('creatableSectors (onde o usuario pode abrir chamado, 2026-08-21)', () => {
	const wideMeta = {
		sectors: [
			{ id: 1, name: 'General', slug: 'general' },
			{ id: 3, name: 'TI', slug: 'ti' },
			{ id: 4, name: 'Vendas', slug: 'vendas' },
			{ id: 5, name: 'Antigo', slug: 'antigo', archivedAt: '2026-08-01' },
		],
		myRoles: { adminSectorIds: [], memberSectorIds: [3] },
	};

	it('triage abre em qualquer setor ativo (arquivado fica de fora)', () => {
		expect(creatableSectors(wideMeta, true).map((s) => s.id)).toEqual([1, 3, 4]);
	});

	it('nao-triage abre so no General ou em setor do qual e membro', () => {
		expect(creatableSectors(wideMeta, false).map((s) => s.id)).toEqual([1, 3]);
	});

	it('nao-triage sem membership nenhum fica so com o General', () => {
		const meta = { ...wideMeta, myRoles: { adminSectorIds: [], memberSectorIds: [] } };
		expect(creatableSectors(meta, false).map((s) => s.id)).toEqual([1]);
	});

	it('meta ausente nao estoura', () => {
		expect(creatableSectors(null, false)).toEqual([]);
	});
});

describe('pruneAssigneeSelection (troca de setor no modal de criacao)', () => {
	const metaWithMembers = {
		sectors: [
			{ id: 3, name: 'TI', slug: 'ti', memberIds: [1, 2] },
			{ id: 1, name: 'General', slug: 'general', memberIds: [1, 2, 9] },
		],
	};

	it('mantem quem e membro do novo setor', () => {
		expect(pruneAssigneeSelection([1, 2], metaWithMembers, 3)).toEqual([1, 2]);
	});

	it('remove quem nao e membro do novo setor', () => {
		expect(pruneAssigneeSelection([1, 9], metaWithMembers, 3)).toEqual([1]);
	});

	it('sem memberIds no meta (payload antigo em transito), nao poda', () => {
		const oldMeta = { sectors: [{ id: 3, name: 'TI', slug: 'ti' }] };
		expect(pruneAssigneeSelection([1, 9], oldMeta, 3)).toEqual([1, 9]);
	});

	it('selecao vazia ou ausente vira lista vazia', () => {
		expect(pruneAssigneeSelection([], metaWithMembers, 3)).toEqual([]);
		expect(pruneAssigneeSelection(undefined, metaWithMembers, 3)).toEqual([]);
	});
});

describe('canManageRequest com adminSectorIds', () => {
	it('admin do setor do chamado gerencia sem ser triage nem autor', () => {
		const user = { id: 50 };
		expect(canManageRequest(request(), user, false, [3])).toBe(true);
	});

	it('admin de OUTRO setor nao gerencia', () => {
		const user = { id: 50 };
		expect(canManageRequest(request(), user, false, [1])).toBe(false);
	});

	it('regras antigas continuam valendo (autor e triage)', () => {
		expect(canManageRequest(request({ requester: { id: 50 } }), { id: 50 }, false, [])).toBe(true);
		expect(canManageRequest(request(), { id: 50 }, true, [])).toBe(true);
		expect(canManageRequest(request(), { id: 50 }, false)).toBe(false);
	});
});
