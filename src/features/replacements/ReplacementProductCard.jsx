import { Tag, Typography } from 'antd';
import { isSafeHttpUrl } from './replacementsUtils';

const { Text } = Typography;

// Neutral "No image" placeholder. The Orders screen falls back to a real
// product photo for its own rows; here a wrong photo next to a search result
// could drive a wrong pick, so the placeholder says nothing.
export const NO_IMAGE_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="#f0f0f0"/><path d="M30 82l20-24 14 17 10-12 16 19z" fill="#bfbfbf"/><circle cx="42" cy="42" r="8" fill="#bfbfbf"/><text x="60" y="108" font-family="sans-serif" font-size="11" fill="#8c8c8c" text-anchor="middle">No image</text></svg>'
)}`;

const ROLE_TAG = {
	original: { label: 'ORIGINAL', color: 'default' },
	replacement: { label: 'REPLACEMENT', color: 'blue' },
};

// Product card shared by the directory, the creation modal and the lookup
// drawer: image, role tag, SKU (linked to the store page when it exists) and
// name and the store description. Name, image, description and link come
// live from Magento through the API (catalog table as fallback). `product` is
// null when neither knows the SKU; the SKU still shows.
const ReplacementProductCard = ({ sku, product, role = 'replacement', size = 'default', showTag = true, extra = null, missingText = 'SKU not in catalog' }) => {
	const tag = ROLE_TAG[role] || ROLE_TAG.replacement;
	const displaySku = product?.sku || sku;
	const className = ['replacement-product', size === 'large' ? 'replacement-product--large' : ''].filter(Boolean).join(' ');

	return (
		<div className={className}>
			<img
				className="replacement-product__image"
				src={product?.image || NO_IMAGE_PLACEHOLDER}
				alt={displaySku}
			/>
			<div className="replacement-product__body">
				<div className="replacement-product__line">
					{showTag && <Tag color={tag.color} className="replacement-product__tag">{tag.label}</Tag>}
					{isSafeHttpUrl(product?.url_path) ? (
						<a
							href={product.url_path}
							target="_blank"
							rel="noopener noreferrer"
							className="replacement-product__sku"
						>
							{displaySku}
						</a>
					) : (
						<span className="replacement-product__sku">{displaySku}</span>
					)}
				</div>
				{product ? (
					<Text type="secondary" className="replacement-product__name">{product.name}</Text>
				) : (
					<Text type="secondary" className="replacement-product__name replacement-product__missing">
						{missingText}
					</Text>
				)}
				{product?.description && (
					<Text type="secondary" className="replacement-product__description" title={product.description}>
						{product.description}
					</Text>
				)}
				{product?.brand_name && size === 'large' && (
					<Text type="secondary" style={{ fontSize: 13 }}>{product.brand_name}</Text>
				)}
				{extra}
			</div>
		</div>
	);
};

export default ReplacementProductCard;
