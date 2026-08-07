import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Popconfirm, Space, Typography, message } from 'antd';
import { ApiOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { apiErrorMessage } from '../../utils/api';
import { saveTrelloSettings, clearTrelloSettings, testTrelloConnection } from './settingsApi';

const { Paragraph, Link: TextLink } = Typography;

// Credencial global do Trello (conta do workspace). O token nunca volta
// completo do back — o placeholder mostra a máscara; só enviamos o token se
// o admin digitar um novo. "Test connection" valida antes (ou depois) de salvar.
const TrelloCredentialsCard = ({ settings, onSaved }) => {
	const [form] = Form.useForm();
	const [testing, setTesting] = useState(false);
	const [saving, setSaving] = useState(false);
	const [disabling, setDisabling] = useState(false);

	const authorizeUrl = () => {
		const key = String(form.getFieldValue('apiKey') || settings?.apiKey || '').trim();
		if (!key) return null;
		return `https://trello.com/1/authorize?expiration=never&name=PricingTool&scope=read,write&response_type=token&key=${key}`;
	};

	const credentialsFromForm = () => {
		const values = form.getFieldsValue();
		return {
			apiKey: String(values.apiKey || '').trim(),
			apiToken: String(values.apiToken || '').trim() || undefined,
		};
	};

	const handleTest = async () => {
		setTesting(true);
		try {
			const result = await testTrelloConnection(credentialsFromForm());
			message.success(`Connected to Trello as @${result.member.username}`);
		} catch (error) {
			message.error(apiErrorMessage(error, 'Connection test failed'));
		} finally {
			setTesting(false);
		}
	};

	const handleSave = async (values) => {
		setSaving(true);
		try {
			const updated = await saveTrelloSettings({
				apiKey: String(values.apiKey || '').trim(),
				apiToken: String(values.apiToken || '').trim() || undefined,
			});
			message.success('Trello credentials saved');
			form.setFieldsValue({ apiToken: '' });
			onSaved(updated);
		} catch (error) {
			message.error(apiErrorMessage(error, 'Failed to save credentials'));
		} finally {
			setSaving(false);
		}
	};

	const handleDisable = async () => {
		setDisabling(true);
		try {
			await clearTrelloSettings();
			message.success('Trello integration disabled');
			form.resetFields();
			onSaved({ configured: false, apiKey: null, apiTokenMasked: null, updatedAt: null });
		} catch (error) {
			message.error(apiErrorMessage(error, 'Failed to disable integration'));
		} finally {
			setDisabling(false);
		}
	};

	return (
		<Card title="Trello credentials" className="settings-card">
			<Paragraph type="secondary" className="settings-card__help">
				Use the Trello account of the company workspace — every board you want to link must be
				visible to that account. Get the API key from{' '}
				<TextLink href="https://trello.com/power-ups/admin" target="_blank" rel="noreferrer">
					trello.com/power-ups/admin
				</TextLink>{' '}
				(create a Power-Up if there is none), then generate the token with the link below.
			</Paragraph>

			<Form
				form={form}
				layout="vertical"
				initialValues={{ apiKey: settings?.apiKey || '', apiToken: '' }}
				onFinish={handleSave}
			>
				<Form.Item
					label="API key"
					name="apiKey"
					rules={[{ required: true, message: 'API key is required' }]}
				>
					<Input placeholder="Trello API key" autoComplete="off" />
				</Form.Item>

				<Form.Item
					label="API token"
					name="apiToken"
					extra={settings?.apiTokenMasked
						? `Current token: ${settings.apiTokenMasked} — leave blank to keep it.`
						: authorizeUrl()
							? <>Generate it at <TextLink href={authorizeUrl()} target="_blank" rel="noreferrer">this authorize link</TextLink> (uses the key above).</>
							: 'Fill the API key first, then a link to generate the token appears here.'}
				>
					<Input.Password
						placeholder={settings?.apiTokenMasked || 'Trello API token'}
						autoComplete="new-password"
					/>
				</Form.Item>

				<Space wrap className="settings-card__actions">
					<Button icon={<ApiOutlined />} onClick={handleTest} loading={testing}>
						Test connection
					</Button>
					<Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={saving}>
						Save
					</Button>
					{settings?.configured && (
						<Popconfirm
							title="Disable Trello integration?"
							description="Credentials are removed and no new cards will be created. Existing cards are kept."
							okText="Disable"
							okButtonProps={{ danger: true }}
							onConfirm={handleDisable}
						>
							<Button danger icon={<DeleteOutlined />} loading={disabling}>
								Disable integration
							</Button>
						</Popconfirm>
					)}
				</Space>
			</Form>

			{!settings?.configured && (
				<Alert
					type="info"
					showIcon
					className="settings-card__alert"
					message="Integration is off"
					description="Cards are only created after valid credentials are saved here. If the token is ever revoked in Trello, card creation fails and shows up in each request's activity log — re-test the connection here to diagnose."
				/>
			)}
		</Card>
	);
};

export default TrelloCredentialsCard;
