import { useEffect, useRef, useState } from 'react';
import { AutoComplete, Input, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { fetchProductPreview, searchProducts } from './replacementsApi';
import { NO_IMAGE_PLACEHOLDER } from './ReplacementProductCard';
import { normalizeSkuInput, replacementErrorMessage, stockHint } from './replacementsUtils';

const { Text } = Typography;

const optionLabel = (product) => {
	const stock = stockHint(product);
	return (
		<div className="replacement-new__option">
			<img className="replacement-new__option-image" src={product.image || NO_IMAGE_PLACEHOLDER} alt="" />
			<div className="replacement-new__option-body">
				<Text strong>{product.sku}</Text>
				<Text type="secondary" className="replacement-new__option-name">{product.name}</Text>
			</div>
			<div className="replacement-new__option-side">
				{typeof product.price === 'number' && <Text strong>${product.price.toFixed(2)}</Text>}
				{stock && <Text style={{ color: stock.inStock ? '#389e0d' : '#cf1322', fontSize: 12 }}>{stock.text}</Text>}
			</div>
		</div>
	);
};

// Search by SKU or product name with suggestions (catalog search endpoint),
// or Enter with an exact SKU. `onSelect(product)` gets the chosen product.
// An API failure is reported as a failure, never as "no such product".
const ProductPicker = ({ id, placeholder = 'Search by SKU or product name', onSelect, disabled = false, autoFocus = false }) => {
	const [term, setTerm] = useState('');
	const [options, setOptions] = useState([]);
	const [searching, setSearching] = useState(false);
	const [searchError, setSearchError] = useState(null);
	const [lookupMessage, setLookupMessage] = useState(null); // { type: 'notFound' | 'error', text }
	const latest = useRef(0);
	// Set when a suggestion was just chosen: the Input's Enter handler fires
	// right after rc-select's onSelect and must not run a second lookup.
	const justSelected = useRef(false);

	useEffect(() => {
		const query = term.trim();
		if (query.length < 2) {
			setOptions([]);
			setSearchError(null);
			return undefined;
		}
		const requestId = ++latest.current;
		const timer = setTimeout(() => {
			setSearching(true);
			searchProducts(query)
				.then((products) => {
					if (requestId !== latest.current) return;
					setSearchError(null);
					setOptions(products.map((product) => ({ value: product.sku, label: optionLabel(product), product })));
				})
				.catch((error) => {
					if (requestId !== latest.current) return;
					setOptions([]);
					setSearchError(replacementErrorMessage(error, 'API unreachable'));
				})
				.finally(() => {
					if (requestId === latest.current) setSearching(false);
				});
		}, 300);
		return () => clearTimeout(timer);
	}, [term]);

	const choose = (product) => {
		setLookupMessage(null);
		setTerm('');
		setOptions([]);
		onSelect(product);
	};

	const handleSelect = (value) => {
		const option = options.find((entry) => entry.value === value);
		if (!option) return;
		justSelected.current = true;
		choose(option.product);
	};

	// Enter with an exact SKU (barcode style): exact lookup, no suggestion needed.
	const handleEnter = async () => {
		if (justSelected.current) {
			justSelected.current = false;
			return;
		}
		const sku = normalizeSkuInput(term);
		if (!sku) return;
		const exact = options.find((entry) => entry.value.toLowerCase() === sku.toLowerCase());
		if (exact) {
			choose(exact.product);
			return;
		}
		setSearching(true);
		try {
			const product = await fetchProductPreview(sku);
			if (product) {
				choose(product);
				return;
			}
			setLookupMessage({
				type: 'notFound',
				text: /\s/.test(sku)
					? `No product with SKU "${sku}". Pick one from the suggestions.`
					: `SKU ${sku} was not found in the catalog`,
			});
		} catch (error) {
			setLookupMessage({ type: 'error', text: `Could not check ${sku}: ${replacementErrorMessage(error, 'API unreachable')}` });
		} finally {
			setSearching(false);
		}
	};

	const notFoundContent = (() => {
		if (searchError) return <Text type="danger">Search failed: {searchError}</Text>;
		if (term.trim().length >= 2 && !searching) return 'No product matches';
		return null;
	})();

	return (
		<div>
			<AutoComplete
				id={id}
				value={term}
				options={options}
				onChange={(value) => { setTerm(value); setLookupMessage(null); }}
				onSelect={handleSelect}
				disabled={disabled}
				style={{ width: '100%' }}
				popupMatchSelectWidth={520}
				notFoundContent={notFoundContent}
			>
				<Input
					prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
					placeholder={placeholder}
					onPressEnter={handleEnter}
					autoFocus={autoFocus}
					allowClear
				/>
			</AutoComplete>
			{lookupMessage && (
				<Text type={lookupMessage.type === 'error' ? 'warning' : 'danger'} style={{ fontSize: 13 }}>{lookupMessage.text}</Text>
			)}
		</div>
	);
};

export default ProductPicker;
