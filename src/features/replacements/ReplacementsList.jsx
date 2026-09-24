import { Button, Popconfirm, Typography } from 'antd';
import { ArrowRightOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import ReplacementProductCard from './ReplacementProductCard';
import { canRemoveReplacement, displayName, formatDateTime, latestComment } from './replacementsUtils';

const { Text } = Typography;


// Directory: one card per original product (left), its replacements on the
// right with the latest comment, who registered it and when.
const ReplacementsList = ({ groups = [], user, managers = [], onView, onRemove, onAddFor, removingId = null }) => (
	<div>
		{groups.map((group) => (
			<div key={group.source_sku} className="replacement-group">
				<div className="replacement-group__source">
					<ReplacementProductCard sku={group.source_sku} product={group.sourceProduct} role="original" size="large" />
					<Text type="secondary" className="replacement-group__count">
						{group.replacements.length} replacement{group.replacements.length === 1 ? '' : 's'} registered
					</Text>
				</div>
				<div className="replacement-group__rows">
					<div className="replacement-group__row-header">
						<span />
						<span>Replacement product</span>
						<span>Latest comment</span>
						<span>Associated by</span>
						<span style={{ textAlign: 'right' }}>Actions</span>
					</div>
					{group.replacements.map((replacement) => {
						const comment = latestComment(replacement);
						const count = replacement.comments?.length || 0;
						return (
							<div key={replacement.id} className="replacement-group__row">
								<ArrowRightOutlined className="replacement-group__arrow" />
								<ReplacementProductCard sku={replacement.replacement_sku} product={replacement.product} role="replacement" />
								<div className="replacement-group__comment">
									{comment ? (
										<>
											<span className="replacement-group__comment-text">{comment.body}</span>
											<Button type="link" size="small" style={{ padding: 0, height: 'auto', alignSelf: 'flex-start' }} onClick={() => onView(replacement, group)}>
												{count} comment{count === 1 ? '' : 's'}
											</Button>
										</>
									) : (
										<Text type="secondary">No comments</Text>
									)}
								</div>
								<div className="replacement-group__by">
									<Text strong>{displayName(replacement.createdBy)}</Text>
									<Text type="secondary" style={{ fontSize: 13 }}>{formatDateTime(replacement.createdAt)}</Text>
								</div>
								<div className="replacement-group__actions">
									<Button size="small" onClick={() => onView(replacement, group)}>Details</Button>
									{canRemoveReplacement({ replacement, user, managers }) && (
										<Popconfirm
											title="Remove this replacement?"
											description={`${group.source_sku} will no longer offer ${replacement.replacement_sku} on the Orders screen.`}
											okText="Remove"
											okButtonProps={{ danger: true }}
											onConfirm={() => onRemove(replacement)}
										>
											<Button size="small" danger icon={<DeleteOutlined />} aria-label="Remove replacement" loading={removingId === replacement.id} />
										</Popconfirm>
									)}
								</div>
							</div>
						);
					})}
					<div className="replacement-group__add">
						<Button type="link" size="small" icon={<PlusOutlined />} style={{ padding: 0 }} onClick={() => onAddFor(group.source_sku)}>
							Add another replacement for {group.source_sku}
						</Button>
					</div>
				</div>
			</div>
		))}
	</div>
);

export default ReplacementsList;
