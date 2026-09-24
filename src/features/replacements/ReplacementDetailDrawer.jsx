import { useState } from 'react';
import { Button, Drawer, Popconfirm, Space, Tag, Typography, message } from 'antd';
import { ArrowRightOutlined, DeleteOutlined } from '@ant-design/icons';
import ReplacementProductCard from './ReplacementProductCard';
import ReplacementComments from './ReplacementComments';
import { addReplacementComment, removeReplacement, removeReplacementComment } from './replacementsApi';
import { canRemoveReplacement, displayName, formatDateTime, isNoneMarker, replacementErrorMessage } from './replacementsUtils';

const { Text } = Typography;

// Detail of one association: both products side by side, who registered it
// and when, the comments (add / remove) and the Remove action.
// `onChanged` reloads the directory; the drawer keeps showing the row it was
// given, refreshed by the parent through `replacement`.
const ReplacementDetailDrawer = ({ open, replacement, sourceProduct, user, managers = [], onClose, onChanged }) => {
	const [busy, setBusy] = useState(false);

	// Returns true when the action itself succeeded. The reload that follows
	// has its own error handling in the page, so a reload problem is never
	// reported as "the comment failed".
	const run = async (action, successText) => {
		setBusy(true);
		let done = false;
		try {
			await action();
			done = true;
			if (successText) message.success(successText);
		} catch (error) {
			message.error(replacementErrorMessage(error, 'Something went wrong'));
		} finally {
			setBusy(false);
		}
		if (done) await onChanged?.();
		return done;
	};

	if (!replacement) return null;

	return (
		<Drawer
			open={open}
			onClose={onClose}
			width={720}
			title={isNoneMarker(replacement) ? `${replacement.source_sku} marked as no replacement` : `Replacement ${replacement.source_sku} to ${replacement.replacement_sku}`}
			extra={canRemoveReplacement({ replacement, user, managers }) && (
				<Popconfirm
					title="Remove this replacement?"
					description="It disappears from the Orders screen. Nothing is erased."
					okText="Remove"
					okButtonProps={{ danger: true }}
					onConfirm={() => run(async () => { await removeReplacement(replacement.id); onClose(); }, 'Replacement removed')}
				>
					<Button danger icon={<DeleteOutlined />} loading={busy}>{isNoneMarker(replacement) ? 'Remove marker' : 'Remove replacement'}</Button>
				</Popconfirm>
			)}
		>
			<div className="replacement-detail__pair">
				<ReplacementProductCard sku={replacement.source_sku} product={sourceProduct} role="original" size="large" />
				<ArrowRightOutlined className="replacement-detail__arrow" />
				{isNoneMarker(replacement) ? (
					<div className="replacement-none">
						<Tag color="red" className="replacement-none__tag">NO REPLACEMENT</Tag>
						<Text className="replacement-none__text">{replacement.comments?.[0]?.body || 'No replacement registered'}</Text>
					</div>
				) : (
					<ReplacementProductCard sku={replacement.replacement_sku} product={replacement.product} role="replacement" size="large" />
				)}
			</div>
			<Space direction="vertical" size={0} className="replacement-detail__meta">
				<Text type="secondary" style={{ fontSize: 13 }}>Associated by</Text>
				<Text strong>{displayName(replacement.createdBy)}</Text>
				<Text type="secondary" style={{ fontSize: 13 }}>{formatDateTime(replacement.createdAt)}</Text>
			</Space>
			<Text strong style={{ display: 'block', marginBottom: 8 }}>Comments ({replacement.comments?.length || 0})</Text>
			<ReplacementComments
				comments={replacement.comments || []}
				user={user}
				managers={managers}
				busy={busy}
				onAdd={(body) => run(() => addReplacementComment(replacement.id, body), 'Comment added')}
				onRemove={(commentId) => run(() => removeReplacementComment(replacement.id, commentId), 'Comment removed')}
			/>
		</Drawer>
	);
};

export default ReplacementDetailDrawer;
