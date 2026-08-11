import { Tag, Typography } from 'antd';
import { matchesSector } from './requestsConstants';

const { Text } = Typography;

// Boards por setor: chips "All" + um por setor ativo (de meta.sectors), no
// mesmo padrão visual das saved views. A seleção recorta TODA a aba Requests
// (KPIs, lista, board) e vive na URL (?sector=slug) para deep-link.
const RequestsSectorTabs = ({ meta, requests, value, onChange }) => {
	const sectors = (meta?.sectors || []).filter((sector) => !sector.archivedAt);
	if (sectors.length <= 1) return null; // só General = tabs não dizem nada

	const countFor = (sectorId) => requests.filter((request) => matchesSector(request, sectorId)).length;

	return (
		<div className="requests-views requests-sector-tabs">
			<Text type="secondary" className="requests-views__label">Sectors</Text>
			<Tag.CheckableTag
				checked={value === null}
				onChange={() => onChange(null)}
				className="requests-views__chip"
			>
				All ({requests.length})
			</Tag.CheckableTag>
			{sectors.map((sector) => (
				<Tag.CheckableTag
					key={sector.id}
					checked={value === sector.id}
					onChange={() => onChange(value === sector.id ? null : sector.id)}
					className="requests-views__chip"
				>
					<span
						style={{
							display: 'inline-block',
							width: 8,
							height: 8,
							borderRadius: '50%',
							background: sector.color || '#94a3b8',
							marginRight: 6,
						}}
					/>
					{sector.name} ({countFor(sector.id)})
				</Tag.CheckableTag>
			))}
		</div>
	);
};

export default RequestsSectorTabs;
