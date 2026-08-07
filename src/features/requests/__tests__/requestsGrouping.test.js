import { describe, expect, it } from 'vitest';
import { buildGroups } from '../RequestsList';
import { BOARD_LANES, STATUSES } from '../requestsConstants';

const request = (id, status) => ({ id, status, project: 'Pricing Tool', assignee: null });

describe('grouping by status', () => {
	it('uses the same sections as the board, in the same order', () => {
		// The two views showed the same data in different shapes: four lanes on
		// the board, eight raw statuses in the list.
		const groups = buildGroups([], 'status', []);

		expect(groups.map((group) => group.label)).toEqual(BOARD_LANES.map((lane) => lane.name));
		expect(groups).toHaveLength(BOARD_LANES.length);
	});

	it('puts every status into exactly one section', () => {
		const requests = STATUSES.map((status, index) => request(index + 1, status.name));
		const groups = buildGroups(requests, 'status', []);

		const placed = groups.flatMap((group) => group.rows.map((row) => row.id));
		expect(placed.sort((a, b) => a - b)).toEqual(requests.map((entry) => entry.id));
		expect(new Set(placed).size).toBe(requests.length);
	});

	it('groups the three intake statuses under Requests, as the board does', () => {
		const groups = buildGroups([
			request(1, 'New Request'),
			request(2, 'Estimation'),
			request(3, 'Assigned'),
			request(4, 'Work in Progress'),
		], 'status', []);

		expect(groups[0].label).toBe('Requests');
		expect(groups[0].rows.map((row) => row.id)).toEqual([1, 2, 3]);
		expect(groups[1].label).toBe('Doing');
		expect(groups[1].rows.map((row) => row.id)).toEqual([4]);
	});

	it('keeps an empty section visible, so the flow reads the same as the board', () => {
		const groups = buildGroups([request(1, 'Completed')], 'status', []);

		expect(groups.find((group) => group.label === 'Blocked').rows).toEqual([]);
		expect(groups.find((group) => group.label === 'Done').rows).toHaveLength(1);
	});
});
