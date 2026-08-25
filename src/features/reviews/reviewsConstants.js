// Helpers puros da aba Reviews (Settings). Espelho cosmético: quem decide de
// verdade é o back (allowlist 409 REVIEWS_RESTRICTED, dedup por constraint,
// máquina de estados do sync). Formatadores locais de propósito — importar de
// features/requests acoplaria o ciclo de vida de outra feature (mesma escolha
// do FeedsPanel).

export const ROW_STATUS_META = {
	pending: { color: 'default', label: 'Pending' },
	sending: { color: 'orange', label: 'Verifying' },
	synced: { color: 'green', label: 'Synced' },
	failed: { color: 'red', label: 'Failed' },
};

// Validação client-side do upload (o back revalida): extensão + tamanho.
export const validateUploadFile = (file, meta) => {
	const name = String(file?.name || '').toLowerCase();
	const allowed = meta?.allowedExtensions || ['.xlsx', '.csv'];
	if (!allowed.some((extension) => name.endsWith(extension))) {
		return { ok: false, error: `Only ${allowed.join(' / ')} files are accepted` };
	}
	const maxBytes = Number(meta?.maxUploadBytes) || 10 * 1024 * 1024;
	if (Number(file?.size) > maxBytes) {
		return { ok: false, error: `File exceeds the ${Math.round(maxBytes / 1024 / 1024)}MB limit` };
	}
	return { ok: true, error: null };
};

// Resumo dos contadores de um arquivo para a célula de progresso.
export const summarizeFileCounts = (file) => {
	const counts = file?.counts || {};
	const total = (counts.pending || 0) + (counts.sending || 0) + (counts.synced || 0) + (counts.failed || 0);
	return {
		total,
		done: total > 0 && counts.synced === total,
		hasFailures: (counts.failed || 0) > 0,
		hasStuckSending: (counts.sending || 0) > 0,
		canSync: file?.status === 'ready' && ((counts.pending || 0) > 0 || (counts.sending || 0) > 0),
	};
};

// Poll só enquanto um sync roda (padrão do FeedsPanel; null = sem timer).
export const pollDelayFor = (running) => (running ? 5000 : null);

export const formatDateTime = (value) => {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return date.toLocaleString('en-US', {
		month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
	});
};

export const formatBytes = (bytes) => {
	const size = Number(bytes) || 0;
	if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)}MB`;
	if (size >= 1024) return `${Math.round(size / 1024)}KB`;
	return `${size}B`;
};
