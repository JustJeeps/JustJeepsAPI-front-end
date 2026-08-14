import { Tag, Typography } from 'antd';
import { matchesSector } from './requestsConstants';

const { Text } = Typography;

// Setores que o usuário enxerga como tab (visibilidade por membership,
// 2026-08-12): triage vê todos os ativos; os demais só os setores dos quais
// são membros. Predicado puro exportado para o Vitest — o corte de VERDADE é
// server-side (listRequests já chega recortada); aqui é só o que mostrar.
export const sectorTabsFor = (meta, isTriage) => {
	const active = (meta?.sectors || []).filter((sector) => !sector.archivedAt);
	if (isTriage) return active;
	const memberIds = meta?.myRoles?.memberSectorIds || [];
	return active.filter((sector) => memberIds.includes(sector.id));
};

// Chips "All" + um por setor visível, no mesmo padrão visual das saved views.
// A seleção recorta toda a aba Requests (KPIs, lista, board) e vive na URL
// (?sector=slug) para deep-link. "All" inclui também os chamados do próprio
// usuário em setores alheios (autor/assignee sempre veem os seus).
const RequestsSectorTabs = ({ meta, isTriage, requests, value, onChange }) => {
	const sectors = sectorTabsFor(meta, isTriage);
	const totalActive = (meta?.sectors || []).filter((sector) => !sector.archivedAt).length;
	// Sem setor visível, ou empresa com um setor só: tabs não dizem nada.
	if (!sectors.length || totalActive <= 1) return null;

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
