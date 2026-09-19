import { apiRequest } from "@/services/api-client";
import type { IngestionJob } from "@/types/platform";
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

async function sha256Buffer(buffer: ArrayBuffer): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", buffer);
	return Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
}

async function computeFileHashes(file: File) {
	const startSlice = file.slice(0, CHUNK_SIZE);
	const endSlice = file.size > CHUNK_SIZE ? file.slice(file.size - CHUNK_SIZE) : new Blob();
	const fingerprintBuffer = await new Blob([startSlice, endSlice]).arrayBuffer();
	const fingerprintHash = await sha256Buffer(fingerprintBuffer);

	const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
	const chunkHashes: { index: number; hash: string; blob: Blob }[] = [];

	for (let i = 0; i < totalChunks; i++) {
		const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
		const hash = await sha256Buffer(await chunk.arrayBuffer());
		chunkHashes.push({ index: i, hash, blob: chunk });
	}

	const concatenated = chunkHashes.map((ch) => ch.hash).join("");
	const masterHash = await sha256Buffer(new TextEncoder().encode(concatenated).buffer);

	return { fingerprintHash, masterHash, chunkHashes };
}

export async function uploadFile(
	file: File,
	datasetId: string,
	onProgress: (progress: number, statusMessage?: string) => void,
	signal?: AbortSignal,
	options: { autoRename?: boolean; relativePath?: string } = {},
) {
	if (file.size <= 0 || file.size > 500 * 1024 * 1024)
		throw new Error("File must be between 1 byte and 500 MB.");
	signal?.throwIfAborted();

	onProgress(5, `Computing Merkle checksums & fingerprint for ${file.name}...`);
	const { fingerprintHash, masterHash, chunkHashes } = await computeFileHashes(file);
	const relativePath = options.relativePath || file.webkitRelativePath || file.name;

	onProgress(15, `Initializing chunked session for ${file.name}...`);
	const session = await apiRequest<{
		upload_id: string;
		chunk_size: number;
		total_chunks: number;
		status: string;
		filename?: string;
	}>("/v1/upload/init", {
		method: "POST",
		headers: {
			"x-file-fingerprint": fingerprintHash,
		},
		body: JSON.stringify({
			dataset_id: datasetId,
			filename: file.name,
			filesize: file.size,
			master_hash: masterHash,
			relative_path: relativePath,
			source_type: "Local",
			auto_rename: options.autoRename ?? false,
		}),
		signal,
	});

	if (session.status === "duplicate_short_circuit") {
		onProgress(100, `Instant deduplicated: ${file.name} already exists in dataset.`);
		return { duplicate: true, status: session.status };
	}

	if (session.status === "duplicate_suspected") {
		onProgress(100, `Duplicate suspected for ${file.name}.`);
		return { duplicate: true, status: session.status, upload_id: session.upload_id };
	}

	const totalChunks = chunkHashes.length;
	let completedChunks = 0;
	const CONCURRENCY = 3;
	let currentIndex = 0;

	await new Promise<void>((resolve, reject) => {
		let activeUploads = 0;
		let hasError = false;

		const processNext = async () => {
			if (hasError) return;
			if (currentIndex >= totalChunks && activeUploads === 0) {
				return resolve();
			}
			if (currentIndex >= totalChunks) return;

			const chunkData = chunkHashes[currentIndex++];
			activeUploads++;

			try {
				signal?.throwIfAborted();
				const form = new FormData();
				form.set("upload_id", session.upload_id);
				form.set("chunk_index", String(chunkData.index));
				form.set("chunk_hash", chunkData.hash);
				form.set("chunk_file", chunkData.blob, file.name);

				await apiRequest("/v1/upload/chunk", {
					method: "POST",
					body: form,
					signal,
				});

				completedChunks++;
				const progressPct = 15 + Math.round((completedChunks / totalChunks) * 75);
				onProgress(progressPct, `Uploaded chunk ${completedChunks}/${totalChunks}`);
			} catch (err) {
				hasError = true;
				return reject(err);
			} finally {
				activeUploads--;
				processNext();
			}
		};

		for (let i = 0; i < Math.min(CONCURRENCY, totalChunks); i++) {
			processNext();
		}
	});

	onProgress(92, `Finalizing & assembling chunks for ${file.name}...`);
	await apiRequest("/v1/upload/finalize", {
		method: "POST",
		body: JSON.stringify({
			upload_id: session.upload_id,
			master_hash: masterHash,
		}),
		signal,
	});

	onProgress(100, `Successfully ingested ${file.name}`);
	return { duplicate: false, status: "completed", upload_id: session.upload_id };
}
export const ingestionService = {
	status: () =>
		apiRequest<{ total_active_jobs: number; jobs: IngestionJob[] }>(
			"/v1/ingest/status?status=in_progress,pending,failed,completed",
			{},
			false,
		),
	googleUrl: (dataset_id: string, gdrive_url: string, filename?: string, mime_type?: string) =>
		apiRequest<{ job_id?: string }>("/v1/ingest/gdrive/url", {
			method: "POST",
			body: JSON.stringify({ dataset_id, gdrive_url, filename, mime_type }),
		}),
	gdriveInit: (dataset_id: string, file_id: string, filename?: string, mime_type?: string) =>
		apiRequest<{ job_id?: string }>("/v1/ingest/gdrive/init", {
			method: "POST",
			body: JSON.stringify({ dataset_id, file_id, filename, mime_type }),
		}),
	getGoogleToken: () =>
		apiRequest<{ access_token?: string }>("/v1/users/me/google-token"),
	sharepointUrl: (dataset_id: string, sharepoint_url: string, quick_xor_hash?: string, filename?: string) =>
		apiRequest<{ job_id?: string }>("/v1/ingest/sharepoint/url", {
			method: "POST",
			body: JSON.stringify({ dataset_id, sharepoint_url, quick_xor_hash, filename }),
		}),
	sharepointTree: (folder_id?: string) =>
		apiRequest<{ items: Array<{ id: string; name: string; is_folder: boolean; size_bytes?: number; quick_xor_hash?: string; web_url?: string }> }>(
			`/v1/ingest/sharepoint/tree${folder_id ? `?folder_id=${encodeURIComponent(folder_id)}` : ""}`
		),
	sharepointInit: (dataset_id: string, file_id: string, quick_xor_hash?: string, filename?: string) =>
		apiRequest<{ job_id?: string }>("/v1/ingest/sharepoint/init", {
			method: "POST",
			body: JSON.stringify({ dataset_id, file_id, quick_xor_hash, filename }),
		}),
	ftpConnect: (params: {
		host: string;
		port: number;
		username: string;
		password?: string;
		duration_seconds?: number;
		until_i_stop?: boolean;
		graceful_expiry?: boolean;
		allow_insecure?: boolean;
	}) =>
		apiRequest<{ session: any }>("/v1/ingest/ftp/connect", {
			method: "POST",
			body: JSON.stringify(params),
		}),
	ftpDisconnect: (force = false) =>
		apiRequest<{ message: string }>(`/v1/ingest/ftp/disconnect?force=${force}`, {
			method: "POST",
			body: JSON.stringify({ delete_completed_files: false }),
		}),
	ftpTree: (path = "/") =>
		apiRequest<{ current_path: string; items: Array<{ name: string; path: string; is_folder: boolean; size_bytes: number }> }>(
			`/v1/ingest/ftp/tree?path=${encodeURIComponent(path)}`
		),
	initFtp: (
		dataset_id: string,
		items: { path: string; is_folder: boolean; size_bytes: number }[],
		auto_rename = false,
	) =>
		apiRequest("/v1/ingest/ftp/init", {
			method: "POST",
			body: JSON.stringify({ dataset_id, items, auto_rename }),
		}),
	resumeFtp: (job_ids: string[]) =>
		apiRequest(
			"/v1/ingest/ftp/resume",
			{ method: "POST", body: JSON.stringify({ job_ids }) },
			false,
		),
	moveContent: (source_dataset_id: string, payload: { target_dataset_id: string; file_id?: string; folder_id?: string }) =>
		apiRequest(`/v1/datasets/${source_dataset_id}`, {
			method: "PATCH",
			body: JSON.stringify(payload),
		}),
	attachFile: (dataset_id: string, file_id: string) =>
		apiRequest(`/v1/datasets/${dataset_id}/files`, {
			method: "POST",
			body: JSON.stringify({ file_id }),
		}),
	deleteUpload: (upload_id: string) =>
		apiRequest("/v1/uploads/delete", {
			method: "POST",
			body: JSON.stringify({ upload_id }),
		}),
};
