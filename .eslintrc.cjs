// Lint mínimo, com um objetivo declarado: pegar a classe de bug que derrubou a
// tela de Requests em 07/08 — `DONE_STATUSES` usado sem import, que o
// `npm run build` não acusa (Rollup não resolve identificador livre) e só
// aparece quando o usuário clica. `no-undef` é ERRO e vale para todo o src/.
// O resto entra como aviso: o repo tem arquivos legados de milhares de linhas
// que nunca passaram por linter, e travar o CI neles não ajudaria ninguém.
module.exports = {
	root: true,
	env: { browser: true, es2022: true, node: true },
	extends: [
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:react/jsx-runtime',
		'plugin:react-hooks/recommended',
	],
	parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
	settings: { react: { version: 'detect' } },
	ignorePatterns: [
		'dist',
		'node_modules',
		'*.config.js',
		// Arquivos órfãos: nenhum outro módulo os importa (conferido), então não
		// são carregados em runtime. Todos têm identificadores indefinidos
		// pré-existentes — se um dia forem religados, quebram na hora. Ficam de
		// fora do lint até alguém decidir apagá-los ou consertá-los.
		'src/Test.jsx',
		'src/features/po/PoPopUp.jsx',
		'src/features/order/OrdersList.jsx',
		'src/features/order/OrderProduct.jsx',
		'src/features/order/OrderProductList.jsx',
		'src/features/items/vendorProductsTable.jsx',
	],
	rules: {
		// As duas regras que pegam a classe de bug de 07/08 (identificador ou
		// componente usado sem existir). NÃO rebaixar para warning.
		'no-undef': 'error',
		'react/jsx-no-undef': 'error',
		'no-dupe-keys': 'error',
		// Estilo e dívida legada: avisam, não travam o CI.
		'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
		'no-useless-escape': 'warn',
		'no-mixed-spaces-and-tabs': 'warn',
		'react/prop-types': 'off', // projeto não usa PropTypes
		'react/jsx-no-comment-textnodes': 'warn',
		'react/jsx-key': 'warn',
		'react/no-unknown-property': 'warn',
		'react/jsx-no-target-blank': 'warn',
		// Hooks condicionais existem no PurchaserReport desde antes; é bug real,
		// mas consertar exige reescrever a página. Fica visível como aviso.
		'react-hooks/rules-of-hooks': 'warn',
		'react-hooks/exhaustive-deps': 'warn',
		'no-empty': ['warn', { allowEmptyCatch: true }],
	},
};
