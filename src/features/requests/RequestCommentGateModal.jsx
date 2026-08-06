import { Input, Modal, Typography } from 'antd';

const { Text } = Typography;

// Gate de comentário: os status de bloqueio/conclusão exigem comentário na
// mesma transição (regra do back). Usado pelo drawer e pelo board — sem isso
// cada tela reimplementava o modal e as duas divergiam.
const RequestCommentGateModal = ({ gate, saving, onChange, onOk, onCancel }) => (
	<Modal
		open={Boolean(gate)}
		title={gate ? `Move to ${gate.status}` : ''}
		okText="Update status"
		confirmLoading={saving}
		okButtonProps={{ disabled: !gate?.comment?.trim() }}
		onOk={onOk}
		onCancel={onCancel}
		destroyOnHidden
	>
		<Text>A comment is required for this status.</Text>
		<Input.TextArea
			rows={3}
			style={{ marginTop: 12 }}
			placeholder={
				gate?.status === 'Completed'
					? 'What was done and where it was deployed'
					: 'Why is this blocked / waiting'
			}
			value={gate?.comment || ''}
			onChange={(event) => onChange(event.target.value)}
		/>
	</Modal>
);

export default RequestCommentGateModal;
