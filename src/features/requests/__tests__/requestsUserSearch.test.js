import { describe, it, expect } from 'vitest';
import { userSearchText, userOption, matchesUserOption, USER_SELECT_SEARCH } from '../requestsConstants';

const ricardo = { id: 3, username: 'ricardo', firstname: 'Ricardo', lastname: 'Tassio', email: 'ricardo@lumostechnologies.ca' };
const joao = { id: 4, username: 'jsilva', firstname: 'João', lastname: 'Silva', email: 'joao@x' };

describe('userSearchText', () => {
	it('lower-cases and strips accents from name, username and e-mail', () => {
		expect(userSearchText(joao)).toBe('joao silva jsilva joao@x');
	});

	it('tolerates missing fields', () => {
		expect(userSearchText({ username: 'tess' })).toBe('tess');
		expect(userSearchText(null)).toBe('');
	});
});

describe('userOption', () => {
	it('keeps value and label as before and adds the search text', () => {
		expect(userOption(ricardo)).toEqual({ value: 3, label: 'Ricardo Tassio', search: 'ricardo tassio ricardo ricardo@lumostechnologies.ca' });
	});
});

describe('matchesUserOption', () => {
	const option = userOption(ricardo);

	it('matches first name, last name, username and e-mail, ignoring case', () => {
		expect(matchesUserOption('RICARDO', option)).toBe(true);
		expect(matchesUserOption('tass', option)).toBe(true);
		expect(matchesUserOption('lumos', option)).toBe(true);
	});

	it('ignores accents on both sides', () => {
		expect(matchesUserOption('joao', userOption(joao))).toBe(true);
		expect(matchesUserOption('João', userOption(joao))).toBe(true);
	});

	it('requires every typed word to match', () => {
		expect(matchesUserOption('ricardo tas', option)).toBe(true);
		expect(matchesUserOption('ricardo x', option)).toBe(false);
	});

	it('matches everything on an empty input', () => {
		expect(matchesUserOption('', option)).toBe(true);
		expect(matchesUserOption('   ', option)).toBe(true);
	});

	it('falls back to the label for options without search text', () => {
		expect(matchesUserOption('unass', { value: 'unassigned', label: 'Unassigned' })).toBe(true);
		expect(matchesUserOption('ricardo', { value: 'unassigned', label: 'Unassigned' })).toBe(false);
	});
});

describe('USER_SELECT_SEARCH', () => {
	it('turns search on with the user filter', () => {
		expect(USER_SELECT_SEARCH).toEqual({ showSearch: true, filterOption: matchesUserOption });
	});
});
