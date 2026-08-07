import { describe, it, expect } from 'vitest';
import { matchesView, VIEWS } from '../RequestsViewChips';
import { matchesFilters, EMPTY_FILTERS } from '../RequestsFilterBar';
import { BOARD_LANES, DONE_STATUSES, STATUSES, isAging } from '../requestsConstants';

// Estes testes existem por causa do incidente de 07/08: a view "All open"
// chamava uma constante sem import e derrubava a tela. Qualquer chamada real
// das funções puras estoura o ReferenceError — é o que garante que não volte.

const request = (overrides = {}) => ({
	id: 1,
	title: 'Tire filter wrong count',
	description: 'counts do not match',
	status: 'Assigned',
	project: 'Pricing Tool',
	type: 'Website Issue',
	priority: 'Normal',
	requester: { id: 10 },
	assignee: { id: 20 },
	assignees: [{ user_id: 20 }],
	updatedAt: new Date().toISOString(),
	...overrides,
});

describe('matchesView', () => {
	it('roda para todas as views declaradas sem estourar', () => {
		// O caso do incidente: bastava chamar com 'open' para quebrar.
		for (const view of VIEWS) {
			expect(() => matchesView(request(), view.key, 10)).not.toThrow();
		}
		expect(() => matchesView(request(), 'aging', 10)).not.toThrow();
	});

	it('"All open" esconde concluídos e mostra o resto', () => {
		expect(matchesView(request({ status: 'Work in Progress' }), 'open', 10)).toBe(true);
		for (const status of DONE_STATUSES) {
			expect(matchesView(request({ status }), 'open', 10)).toBe(false);
		}
	});

	it('"My requests" casa pelo autor, não pelo responsável', () => {
		expect(matchesView(request({ requester: { id: 10 } }), 'mine', 10)).toBe(true);
		expect(matchesView(request({ requester: { id: 99 } }), 'mine', 10)).toBe(false);
	});

	it('"Unassigned" casa só sem responsável', () => {
		expect(matchesView(request({ assignee: null }), 'unassigned', 10)).toBe(true);
		expect(matchesView(request(), 'unassigned', 10)).toBe(false);
	});

	it('"aging" usa a regra dos 7 dias', () => {
		const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
		expect(matchesView(request({ updatedAt: old }), 'aging', 10)).toBe(true);
		expect(matchesView(request(), 'aging', 10)).toBe(false);
	});

	it('sem view selecionada, nada é filtrado', () => {
		expect(matchesView(request(), null, 10)).toBe(true);
	});
});

describe('matchesFilters', () => {
	it('sem filtros, tudo passa', () => {
		expect(matchesFilters(request(), EMPTY_FILTERS)).toBe(true);
	});

	it('busca olha id, título e descrição', () => {
		expect(matchesFilters(request(), { ...EMPTY_FILTERS, search: 'REQ-1' })).toBe(true);
		expect(matchesFilters(request(), { ...EMPTY_FILTERS, search: 'tire' })).toBe(true);
		expect(matchesFilters(request(), { ...EMPTY_FILTERS, search: 'counts do not' })).toBe(true);
		expect(matchesFilters(request(), { ...EMPTY_FILTERS, search: 'inexistente' })).toBe(false);
	});

	it('filtra por project, type e priority', () => {
		expect(matchesFilters(request(), { ...EMPTY_FILTERS, project: 'Pricing Tool' })).toBe(true);
		expect(matchesFilters(request(), { ...EMPTY_FILTERS, project: 'Integrations' })).toBe(false);
		expect(matchesFilters(request(), { ...EMPTY_FILTERS, type: 'Website Issue' })).toBe(true);
		expect(matchesFilters(request(), { ...EMPTY_FILTERS, priority: 'Urgent' })).toBe(false);
	});

	it('assignee casa com qualquer pessoa da lista (multi-assignee)', () => {
		const multi = request({ assignees: [{ user_id: 20 }, { user_id: 30 }] });
		expect(matchesFilters(multi, { ...EMPTY_FILTERS, assignee: 30 })).toBe(true);
		expect(matchesFilters(multi, { ...EMPTY_FILTERS, assignee: 40 })).toBe(false);
	});

	it('assignee "unassigned" casa só sem responsável', () => {
		expect(matchesFilters(request({ assignee: null }), { ...EMPTY_FILTERS, assignee: 'unassigned' })).toBe(true);
		expect(matchesFilters(request(), { ...EMPTY_FILTERS, assignee: 'unassigned' })).toBe(false);
	});
});

describe('constantes de domínio', () => {
	it('as 4 lanes do board cobrem os 8 status, sem sobra nem repetição', () => {
		const naLane = BOARD_LANES.flatMap((lane) => lane.statuses);
		const nomes = STATUSES.map((status) => status.name);
		expect([...naLane].sort()).toEqual([...nomes].sort());
	});

	it('toda lane tem chave, nome e cor', () => {
		for (const lane of BOARD_LANES) {
			expect(lane.key && lane.name && lane.color).toBeTruthy();
		}
	});

	it('isAging ignora chamado fechado', () => {
		const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
		expect(isAging({ status: 'Closed', updatedAt: old })).toBe(false);
		expect(isAging({ status: 'On Hold', updatedAt: old })).toBe(true);
	});
});
