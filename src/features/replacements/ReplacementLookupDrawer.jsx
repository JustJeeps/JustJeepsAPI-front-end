import { useEffect, useState } from 'react';
import { Alert, Button, Drawer, Segmented, Spin, Tag, Typography } from 'antd';
import { ArrowRightOutlined, SwapOutlined } from '@ant-design/icons';
import ProductTable from '../items/ProductTable';
import ReplacementProductCard from './ReplacementProductCard';
import ReplacementComments from './ReplacementComments';
import { fetchReplacementsForSku } from './replacementsApi';
import { displayName, formatDateTime, replacementErrorMessage } from './replacementsUtils';
import './replacements.scss';

const { Title, Text } = Typography;

// Replacement Lookup: the magnifier drawer, for the replacement SKU. Same
// placement, width and background as Popup.jsx so it feels like the same
// screen. Read only: nothing here writes to Unit Cost or to the order, and
// closing it does not reload the orders table.
const ReplacementLookupDrawer = ({ sourceSku, onClose }) => {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [lookup, setLookup] = useState(null);
	const [selectedSku, setSelectedSku] = useState(null);
	const [attempt, setAttempt] = useState(0);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);
		fetchReplacementsForSku(sourceSku)
			.then((data) => {
				if (cancelled) return;
				setLookup(data);
				setSelectedSku(data?.replacements?.[0]?.replacement_sku || null);
			})
			.catch((loadError) => {
				if (!cancelled) setError(replacementErrorMessage(loadError, 'Failed to load the replacement options'));
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [sourceSku, attempt]);

	const replacements = lookup?.replacements || [];
	const selected = replacements.find((row) => row.replacement_sku === selectedSku) || replacements[0] || null;
	const product = selected?.product || null;
	// ProductTable needs the catalog's vendor and competitor arrays; a card
	// without them (the SKU left the catalog) must not reach it.
	const hasLookupData = Array.isArray(product?.vendorProducts) && Array.isArray(product?.competitorProducts);

	return (
		<Drawer
			placement="top"
			width={1600}
			height={640}
			onClose={onClose}
			open
			closable
			styles={{ body: { overflow: 'auto', padding: '16px', backgroundColor: '#f5f5f5' } }}
		>
			<div className="replacement-lookup">
				<div className="replacement-lookup__header">
					<Title level={4} className="replacement-lookup__title">
						<SwapOutlined style={{ color: '#d46b08' }} />
						{replacements.length > 1 ? 'Replacement Options' : 'Replacement Product'}
					</Title>
					<span className="replacement-lookup__pill">
						<Tag className="replacement-product__tag" style={{ margin: 0 }}>ORIGINAL SKU</Tag>
						<span className="replacement-lookup__pill-sku">{sourceSku}</span>
						{lookup?.sourceProduct?.name && <Text type="secondary">{lookup.sourceProduct.name}</Text>}
					</span>
					<ArrowRightOutlined style={{ color: '#8c8c8c' }} />
					<span className="replacement-lookup__pill replacement-lookup__pill--replacement">
						<Tag color="blue" className="replacement-product__tag" style={{ margin: 0 }}>REPLACEMENT SKU</Tag>
						<span className="replacement-lookup__pill-sku" style={{ color: '#0958d9' }}>
							{selected?.replacement_sku || '...'}
						</span>
					</span>
					<Text type="secondary" className="replacement-lookup__note">Read only. Nothing here changes the order. Margin uses the replacement&apos;s CAD list price.</Text>
				</div>

				{loading && <Spin />}
				{error && (
					<Alert
						type="error"
						showIcon
						message={`Could not load the replacement options for ${sourceSku}: ${error}`}
						action={<Button size="small" onClick={() => setAttempt((value) => value + 1)}>Retry</Button>}
					/>
				)}
				{!loading && !error && lookup?.magento?.degraded && (
					<Alert
						type="info"
						showIcon
						message={lookup.magento.configured
							? 'Showing catalog data: the store did not answer, so name, image and description may be out of date.'
							: 'Showing catalog data: the live store connection is not configured on this server.'}
					/>
				)}

				{!loading && !error && replacements.length === 0 && (
					<Alert type="info" showIcon message={`No active replacement is registered for ${sourceSku}.`} />
				)}

				{!loading && !error && replacements.length > 1 && (
					<div className="replacement-lookup__options">
						<Text type="secondary">{replacements.length} options</Text>
						<Segmented
							value={selected?.replacement_sku}
							onChange={setSelectedSku}
							options={replacements.map((row) => ({ value: row.replacement_sku, label: row.replacement_sku }))}
						/>
					</div>
				)}

				{!loading && !error && selected && (
					<>
						<div className="replacement-lookup__context">
							<ReplacementProductCard
								sku={selected.replacement_sku}
								product={product}
								role="replacement"
								size="large"
							/>
							<div>
								<Text strong type="secondary" style={{ fontSize: 13 }}>Comments ({selected.comments?.length || 0})</Text>
								<ReplacementComments comments={selected.comments || []} />
							</div>
							<div className="replacement-lookup__context-by">
								<Text type="secondary" style={{ fontSize: 13 }}>Associated by</Text>
								<Text strong>{displayName(selected.createdBy)}</Text>
								<Text type="secondary" style={{ fontSize: 13 }}>{formatDateTime(selected.createdAt)}</Text>
							</div>
						</div>

						{hasLookupData ? (
							<div className="replacement-lookup__table">
								<ProductTable
									searchTermSku={selected.replacement_sku}
									data={[product]}
									orderProductPrice={product.price}
									readOnly
								/>
							</div>
						) : (
							<Alert
								type="warning"
								showIcon
								message={`${selected.replacement_sku} is not in the catalog anymore, so there is no vendor or price data to show.`}
							/>
						)}
					</>
				)}
			</div>
		</Drawer>
	);
};

export default ReplacementLookupDrawer;
