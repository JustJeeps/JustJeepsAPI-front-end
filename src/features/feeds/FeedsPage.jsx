import { Typography } from 'antd';
import FeedsPanel from './FeedsPanel';
import './feeds.scss';

const { Title, Text } = Typography;

// Página dos feeds de vendor (arquivos de preço e estoque no bucket).
// Qualquer usuário logado enxerga o estado dos arquivos; só usuários de triage
// sobem arquivo novo ou rodam o script (o backend valida e o painel usa o
// canManage da API para habilitar os botões).
const FeedsPage = () => (
	<div className="feeds-page">
		<div className="feeds-page__header">
			<Text type="secondary" className="feeds-page__eyebrow">Pricing Tool / Admin</Text>
			<Title level={3} className="feeds-page__title">Vendor Feeds</Title>
		</div>
		<FeedsPanel />
	</div>
);

export default FeedsPage;
