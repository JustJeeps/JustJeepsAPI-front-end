// Upload direto do navegador para o bucket, em partes assinadas.
//
// Por que não passa pela API: o servidor tem 1 vCPU e 2GB, e um arquivo de
// dezenas de MB atravessando a API disputa recurso com quem está usando o
// sistema. Aqui a API só autoriza (assina cada parte) e cataloga no final; os
// bytes vão direto para o Spaces. Em partes, uma falha de rede reenvia só o
// pedaço perdido em vez do arquivo inteiro.
import { apiPost, apiDelete } from '../../utils/api';

const PART_RETRIES = 3;

// SHA-256 do arquivo inteiro, em blocos, para não carregar tudo na memória.
// O servidor confere o tamanho contra o bucket; o hash é a identidade do
// arquivo no catálogo (é o que o pipeline usa para saber se o feed mudou).
export const hashFile = async (file, onProgress) => {
	// crypto.subtle exige contexto seguro (https ou localhost) — em http puro
	// não existe, e aí o upload direto não é oferecido.
	if (!window.crypto?.subtle) throw new Error('Secure context required to hash the file');
	const buffer = await file.arrayBuffer();
	if (onProgress) onProgress(100);
	const digest = await window.crypto.subtle.digest('SHA-256', buffer);
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

const putPart = async (url, blob, attempt = 1) => {
	try {
		const response = await fetch(url, { method: 'PUT', body: blob });
		if (!response.ok) throw new Error(`part upload failed with status ${response.status}`);
		const etag = response.headers.get('etag');
		if (!etag) throw new Error('bucket did not return an ETag for the part');
		return etag;
	} catch (error) {
		if (attempt >= PART_RETRIES) throw error;
		// Espera crescente: rede instável costuma se resolver em segundos.
		await new Promise((resolve) => setTimeout(resolve, 500 * attempt * attempt));
		return putPart(url, blob, attempt + 1);
	}
};

// onStage({ phase, percent }) — phase: hashing | uploading | finishing
export const uploadFileDirect = async ({ feed, file, note, batchId, onStage }) => {
	const report = (phase, percent) => onStage?.({ phase, percent });

	report('hashing', 0);
	const sha256 = await hashFile(file);

	const { uploadId, partSizeBytes } = await apiPost(`/api/ingest/feeds/${feed}/uploads`, {
		fileName: file.name,
		sizeBytes: file.size,
	}).then((res) => res.data);

	try {
		const totalParts = Math.max(1, Math.ceil(file.size / partSizeBytes));
		const parts = [];

		for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
			const start = (partNumber - 1) * partSizeBytes;
			const blob = file.slice(start, Math.min(start + partSizeBytes, file.size));

			const { url } = await apiPost(`/api/ingest/feeds/${feed}/uploads/${uploadId}/part`, { partNumber })
				.then((res) => res.data);
			const etag = await putPart(url, blob);

			parts.push({ partNumber, etag });
			report('uploading', Math.round((partNumber / totalParts) * 100));
		}

		report('finishing', 100);
		return await apiPost(`/api/ingest/feeds/${feed}/uploads/${uploadId}/complete`, {
			parts,
			sha256,
			note,
			batchId,
		}).then((res) => res.data);
	} catch (error) {
		// Sem o abort, as partes já enviadas ficam ocupando espaço no bucket.
		await apiDelete(`/api/ingest/feeds/${feed}/uploads/${uploadId}`).catch(() => {});
		throw error;
	}
};
