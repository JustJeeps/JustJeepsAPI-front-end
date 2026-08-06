// Upload direto do navegador para o bucket, em partes assinadas.
//
// Por que não passa pela API: o servidor tem 1 vCPU e 2GB, e um arquivo de
// dezenas de MB atravessando a API disputa recurso com quem está usando o
// sistema. Aqui a API só autoriza (assina cada parte) e cataloga no final; os
// bytes vão direto para o Spaces. Em partes, uma falha de rede reenvia só o
// pedaço perdido em vez do arquivo inteiro.
//
// Antes de enviar qualquer byte o arquivo é identificado pelo SHA-256: se o
// conteúdo já está no bucket, nada é transferido — o catálogo aponta para o
// objeto que já existe (objetos são imutáveis e endereçados por conteúdo).
import { apiPost, apiDelete } from '../../utils/api';

const PART_RETRIES = 3;

// SHA-256 do arquivo. Em blocos para não estourar a memória com arquivos
// grandes. crypto.subtle exige contexto seguro (https ou localhost).
export const hashFile = async (file) => {
	if (!window.crypto?.subtle) throw new Error('Secure context required to hash the file');
	const buffer = await file.arrayBuffer();
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

const uploadOneFile = async ({ feed, file, sha256, note, batchId, onStage }) => {
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
			parts.push({ partNumber, etag: await putPart(url, blob) });
			onStage?.({ phase: 'uploading', percent: Math.round((partNumber / totalParts) * 100) });
		}

		onStage?.({ phase: 'finishing', percent: 100 });
		return await apiPost(`/api/ingest/feeds/${feed}/uploads/${uploadId}/complete`, { parts, sha256, note, batchId })
			.then((res) => res.data);
	} catch (error) {
		// Sem o abort, as partes já enviadas ficam ocupando espaço no bucket.
		await apiDelete(`/api/ingest/feeds/${feed}/uploads/${uploadId}`).catch(() => {});
		throw error;
	}
};

// Envia o conjunto de arquivos de um feed como UM lote.
// onStage({ phase, percent, fileName }) — phase: hashing | checking | uploading | reusing | finishing
export const uploadFilesDirect = async ({ feed, files, note, onStage }) => {
	// 1) Identifica cada arquivo e pergunta ao servidor se o conteúdo já existe.
	const prepared = [];
	for (const file of files) {
		onStage?.({ phase: 'hashing', percent: 0, fileName: file.name });
		const sha256 = await hashFile(file);
		onStage?.({ phase: 'checking', percent: 0, fileName: file.name });
		const check = await apiPost(`/api/ingest/feeds/${feed}/uploads/check`, { fileName: file.name, sha256 })
			.then((res) => res.data);
		prepared.push({ file, sha256, ...check });
	}

	// 2) Nada mudou: todos os arquivos já são exatamente os que estão em uso.
	if (prepared.every((item) => item.duplicate && item.isCurrent)) {
		return { unchanged: true, files: prepared.map((item) => item.file.name) };
	}

	// 3) Um lote só para o conjunto. Conteúdo repetido é reaproveitado (o
	// catálogo aponta para o objeto existente); o resto sobe em partes.
	let batchId;
	let reused = 0;
	let uploaded = 0;

	for (const [index, item] of prepared.entries()) {
		const position = files.length > 1 ? ` (${index + 1} of ${files.length})` : '';
		if (item.duplicate) {
			onStage?.({ phase: 'reusing', percent: 100, fileName: `${item.file.name}${position}` });
			const result = await apiPost(`/api/ingest/feeds/${feed}/uploads/reuse`, {
				fileName: item.file.name,
				sha256: item.sha256,
				batchId,
				note,
			}).then((res) => res.data);
			batchId = result.batchId;
			reused += 1;
		} else {
			const result = await uploadOneFile({
				feed,
				file: item.file,
				sha256: item.sha256,
				note,
				batchId,
				onStage: ({ phase, percent }) => onStage?.({ phase, percent, fileName: `${item.file.name}${position}` }),
			});
			batchId = result.batchId;
			uploaded += 1;
		}
	}

	return { batchId, reused, uploaded };
};
