import { useEffect, useState } from 'react';
import { Alert, Button, Input, Modal, Space, Switch, Tag, Typography, message } from 'antd';
import { ArrowRightOutlined, CloseOutlined, PlusOutlined } from '@ant-design/icons';
import ProductPicker from './ProductPicker';
import ReplacementProductCard from './ReplacementProductCard';
import { createNoReplacement, createReplacements, fetchProductPreview, fetchReplacementsForSku } from './replacementsApi';
import { displayName, isNoneMarker, replacementErrorMessage, validatePair, withSelectedCandidate } from './replacementsUtils';

const { Text } = Typography;

// Suggested comments (from the PRP examples). They only fill the textarea;
// the text stays free.
const QUICK_COMMENTS = [
	'Can be replaced without contacting the customer.',
	'Customer approval is required.',
	'Same product, different manufacturer.',
	'Use this replacement only when the original item is unavailable.',
];

const StepLabel = ({ number, kind, title, hint }) => (
	<div className="replacement-new__step">
		<span className={`replacement-new__step-number replacement-new__step-number--${kind}`}>{number}</span>
		<Text strong>{title}</Text>
		{hint && <Text type="secondary" style={{ fontSize: 13 }}>{hint}</Text>}
	</div>
);

// Creation modal: pick the original once, then search a replacement, comment,
// Add, repeat as needed, and save the whole list in one call. Each pair keeps
// its own comment. Author and date/time are recorded by the API.
const NewReplacementModal = ({ open, onClose, onCreated, user, initialSourceSku = null }) => {
	const [source, setSource] = useState(null); // product
	const [existing, setExisting] = useState([]); // active replacements of the source
	const [existingMarker, setExistingMarker] = useState(null); // its "no replacement" marker, if any
	const [candidate, setCandidate] = useState(null); // product picked on the right
	const [comment, setComment] = useState('');
	const [pending, setPending] = useState([]); // [{ replacement_sku, product, comment }]
	const [pairError, setPairError] = useState(null);
	const [saving, setSaving] = useState(false);
	const [loadingSource, setLoadingSource] = useState(false);
	const [sourceLoadError, setSourceLoadError] = useState(null);
	const [existingError, setExistingError] = useState(null);
	// "This product has no replacement": hides the picker and the list, the
	// comment becomes the required explanation shown on the Orders screen.
	const [noReplacement, setNoReplacement] = useState(false);

	const reset = () => {
		setSource(null);
		setExisting([]);
		setExistingMarker(null);
		setCandidate(null);
		setComment('');
		setPending([]);
		setPairError(null);
		setSourceLoadError(null);
		setExistingError(null);
		setNoReplacement(false);
	};

	// "Add another replacement for X" opens the modal with the original set.
	useEffect(() => {
		if (!open) return;
		reset();
		if (initialSourceSku) {
			setLoadingSource(true);
			fetchProductPreview(initialSourceSku)
				.then((product) => setSource(product || { sku: initialSourceSku }))
				.catch((error) => {
					// Keep the SKU (the association can still be registered) but say
					// the card could not be loaded instead of "not in catalog".
					console.warn('Product preview unavailable for', initialSourceSku, error);
					setSource({ sku: initialSourceSku, previewFailed: true });
					setSourceLoadError(replacementErrorMessage(error, 'API unreachable'));
				})
				.finally(() => setLoadingSource(false));
		}
	}, [open, initialSourceSku]);

	// Once the original is known, show what is already registered for it so
	// the person does not try a duplicate.
	useEffect(() => {
		if (!source?.sku) {
			setExisting([]);
			setExistingMarker(null);
			setExistingError(null);
			return undefined;
		}
		let cancelled = false;
		fetchReplacementsForSku(source.sku)
			.then((data) => {
				if (cancelled) return;
				// The API keeps the marker apart from the replacement options.
				setExisting(data?.replacements || []);
				setExistingMarker(data?.noReplacement || null);
				setExistingError(null);
			})
			.catch((error) => {
				if (cancelled) return;
				console.warn('Could not load the existing replacements of', source.sku, error);
				setExisting([]);
				setExistingError(replacementErrorMessage(error, 'API unreachable'));
			});
		return () => {
			cancelled = true;
		};
	}, [source?.sku]);

	const existingPairs = existing.filter((entry) => !isNoneMarker(entry));

	const handleClose = () => {
		if (saving) return;
		reset();
		onClose();
	};

	// The search list carries catalog data; the card then refreshes with the
	// live Magento name, image and description (same SKU, richer card).
	const withLiveInfo = (product, apply) => {
		if (!product?.sku) return;
		fetchProductPreview(product.sku)
			.then((live) => { if (live) apply((current) => (current?.sku === live.sku ? { ...current, ...live } : current)); })
			.catch((error) => console.warn('Live product info unavailable for', product.sku, error));
	};

	const handleSource = (product) => {
		setSource(product);
		withLiveInfo(product, setSource);
	};

	const handleCandidate = (product) => {
		setCandidate(product);
		setPairError(product ? validatePair({ sourceSku: source?.sku, replacementSku: product.sku, existing, pending }) : null);
		withLiveInfo(product, setCandidate);
	};

	const addToList = () => {
		const problem = validatePair({ sourceSku: source?.sku, replacementSku: candidate?.sku, existing, pending });
		if (problem) {
			setPairError(problem);
			return;
		}
		setPending((list) => [...list, { replacement_sku: candidate.sku, product: candidate, comment: comment.trim() }]);
		setCandidate(null);
		setComment('');
		setPairError(null);
	};

	const removeFromList = (sku) => setPending((list) => list.filter((entry) => entry.replacement_sku !== sku));

	const handleSaveNoReplacement = async () => {
		if (!source?.sku || !comment.trim()) return;
		setSaving(true);
		try {
			await createNoReplacement({ source_sku: source.sku, comment: comment.trim() });
			message.success(`${source.sku} marked as having no replacement`);
			reset();
			onCreated?.([]);
			onClose();
		} catch (saveError) {
			message.error(replacementErrorMessage(saveError, 'Failed to save the marker'));
		} finally {
			setSaving(false);
		}
	};

	// The product still selected in step 2 is saved too (no "Add" needed).
	const toSave = withSelectedCandidate({ pending, candidate, comment, pairError });
	const selectedNotAdded = toSave.length > pending.length;

	const handleSave = async () => {
		if (noReplacement) return handleSaveNoReplacement();
		if (!source?.sku || toSave.length === 0) return;
		setSaving(true);
		try {
			const created = await createReplacements({
				source_sku: source.sku,
				replacements: toSave.map((entry) => ({ replacement_sku: entry.replacement_sku, comment: entry.comment || undefined })),
			});
			message.success(`${created.length} replacement${created.length === 1 ? '' : 's'} saved for ${source.sku}`);
			reset();
			onCreated?.(created);
			onClose();
		} catch (saveError) {
			message.error(replacementErrorMessage(saveError, 'Failed to save the replacements'));
		} finally {
			setSaving(false);
		}
	};

	const canAdd = Boolean(source?.sku && candidate?.sku && !pairError && !existingMarker);
	const canSaveMarker = Boolean(source?.sku && comment.trim() && existingPairs.length === 0 && !existingMarker);

	return (
		<Modal
			open={open}
			onCancel={handleClose}
			width={1060}
			title={(
				<div>
					<div>New Replacement</div>
					<Text type="secondary" style={{ fontSize: 14, fontWeight: 400 }}>
						Pick the original product, then add one or more substitutes. This only adds information. It never changes an order.
					</Text>
				</div>
			)}
			footer={(
				<Space style={{ width: '100%', justifyContent: 'flex-end' }}>
					<Text type="secondary" className="replacement-new__footer-note" style={{ fontSize: 13 }}>
						Saved as {displayName(user)}, with the current date and time.
					</Text>
					<Button onClick={handleClose} disabled={saving}>Cancel</Button>
					<Button
						type="primary"
						danger
						onClick={handleSave}
						loading={saving}
						disabled={noReplacement ? !canSaveMarker : (!source?.sku || toSave.length === 0)}
					>
						{noReplacement ? 'Save as no replacement' : (toSave.length > 1 ? `Save ${toSave.length} replacements` : 'Save replacement')}
					</Button>
				</Space>
			)}
			destroyOnHidden
		>
			<div className="replacement-new__columns">
				{/* Step 1: original */}
				<div className="replacement-new__column">
					<StepLabel number={1} kind="source" title="Original product" hint="the product being replaced" />
					{source?.sku ? (
						<>
							<div className="replacement-new__selected">
								<ReplacementProductCard
									sku={source.sku}
									product={source.name ? source : null}
									role="original"
									size="large"
									missingText={source.previewFailed ? 'Product card unavailable' : undefined}
								/>
							</div>
							{sourceLoadError && (
								<Alert
									type="warning"
									showIcon
									message={`Could not load product ${source.sku}: ${sourceLoadError}. You can still add replacements.`}
								/>
							)}
							{existingError && (
								<Alert type="warning" showIcon message={`Could not load the replacements already registered: ${existingError}`} />
							)}
							<Button type="link" size="small" style={{ alignSelf: 'flex-start', padding: 0 }} onClick={() => { setSource(null); setPending([]); setCandidate(null); setPairError(null); }} disabled={pending.length > 0 || saving}>
								Change original
							</Button>
							{existingMarker && (
								<Alert
									type="error"
									showIcon
									className="replacement-new__existing"
									message="Marked as no replacement"
									description={`${existingMarker.comment || ''} Remove the marker in the directory before registering a replacement.`.trim()}
								/>
							)}
							{existingPairs.length > 0 && (
								<Alert
									type={noReplacement ? 'error' : 'warning'}
									showIcon={noReplacement}
									className="replacement-new__existing"
									message={noReplacement
										? `Remove the ${existingPairs.length} registered replacement${existingPairs.length === 1 ? '' : 's'} first`
										: `Already registered for this product (${existingPairs.length})`}
									description={(
										<div>
											{existingPairs.map((entry) => (
												<div key={entry.id} className="replacement-new__existing-row">
													<Text strong>{entry.replacement_sku}</Text>
													<Text type="secondary">{entry.product?.name || 'SKU not in catalog'}</Text>
												</div>
											))}
										</div>
									)}
								/>
							)}
						</>
					) : (
						<>
							<Text type="secondary" style={{ fontSize: 13 }}>Search by SKU or product name</Text>
							<ProductPicker id="replacement-source" onSelect={handleSource} disabled={loadingSource} autoFocus />
						</>
					)}
				</div>

				<div className="replacement-new__arrow"><ArrowRightOutlined /></div>

				{/* Step 2: replacement */}
				<div className="replacement-new__column">
					<div className="replacement-new__step" style={{ justifyContent: 'space-between' }}>
						<StepLabel number={2} kind="replacement" title={noReplacement ? 'No replacement' : 'Replacement product'} hint={noReplacement ? 'explain why' : 'search, comment, then Add'} />
						<Space size={6}>
							<Switch
								size="small"
								checked={noReplacement}
								disabled={!source?.sku || pending.length > 0 || saving}
								onChange={(checked) => { setNoReplacement(checked); setCandidate(null); setPairError(null); }}
								aria-label="This product has no replacement"
							/>
							<Text style={{ fontSize: 13 }}>This product has no replacement</Text>
						</Space>
					</div>
					{noReplacement ? null : candidate ? (
						<div className="replacement-new__selected replacement-new__selected--replacement">
							<ReplacementProductCard sku={candidate.sku} product={candidate} role="replacement" size="large" />
							<Button type="link" size="small" style={{ padding: 0, marginTop: 6 }} onClick={() => handleCandidate(null)}>Change</Button>
						</div>
					) : (
						<>
							<Text type="secondary" style={{ fontSize: 13 }}>Search by SKU or product name</Text>
							<ProductPicker id="replacement-target" onSelect={handleCandidate} disabled={!source?.sku} />
						</>
					)}
					{pairError && <Alert type="error" showIcon message={pairError} />}

					<Text type="secondary" style={{ fontSize: 13 }}>
						{noReplacement ? 'Why there is no replacement (required, shown on the Orders screen)' : 'Comment for this replacement (optional)'}
					</Text>
					<Input.TextArea
						rows={2}
						value={comment}
						onChange={(event) => setComment(event.target.value)}
						placeholder={noReplacement ? 'Example: Discontinued by the manufacturer, no equivalent part.' : 'Example: Customer approval is required before replacing this item.'}
						maxLength={2000}
						disabled={!source?.sku}
					/>
					{noReplacement ? null : (
					<div className="replacement-new__chips">
						{QUICK_COMMENTS.map((text) => (
							<Tag.CheckableTag key={text} checked={comment === text} onChange={() => setComment(comment === text ? '' : text)}>
								{text}
							</Tag.CheckableTag>
						))}
					</div>
					)}
					{noReplacement ? null : (
					<div className="replacement-new__add">
						<Button type="primary" icon={<PlusOutlined />} onClick={addToList} disabled={!canAdd}>
							Add replacement
						</Button>
					</div>
					)}
				</div>
			</div>

			{/* Step 3: list to save (not for a marker) */}
			{noReplacement ? null : (
			<div className="replacement-new__list">
				<StepLabel
					number={3}
					kind="list"
					title={`Replacements to save (${pending.length})`}
					hint={source?.sku ? `for ${source.sku}. Each one keeps its own comment.` : null}
				/>
				{selectedNotAdded && (
					<Alert
						type="info"
						showIcon
						style={{ marginTop: 8 }}
						message={`${candidate.sku} selected above will be saved too. Use "Add replacement" only to pick another one.`}
					/>
				)}
				{pending.length === 0 && !selectedNotAdded ? (
					<Text type="secondary" style={{ display: 'block', marginTop: 8 }}>Nothing added yet.</Text>
				) : pending.length === 0 ? null : (
					<div className="replacement-new__list-box">
						{pending.map((entry) => (
							<div key={entry.replacement_sku} className="replacement-new__list-row">
								<ReplacementProductCard sku={entry.replacement_sku} product={entry.product} role="replacement" />
								<Text>{entry.comment || <Text type="secondary">No comment</Text>}</Text>
								<Button
									size="small"
									icon={<CloseOutlined />}
									aria-label="Remove from list"
									onClick={() => removeFromList(entry.replacement_sku)}
									danger
								/>
							</div>
						))}
					</div>
				)}
			</div>
			)}
		</Modal>
	);
};

export default NewReplacementModal;
