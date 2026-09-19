import { apiRequest } from "@/services/api-client";
import type { IngestionJob } from "@/types/platform";
async function sha256(blob: Blob) {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		await blob.arrayBuffer(),
	);
	return Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
}
export async function uploadFile(
	file: File,
	datasetId: string,
	onProgress: (progress: number, statusMessage?: string) => void,
	signal?: AbortSignal,
) {
	if (file.size <= 0 || file.size > 100 * 1024 * 1024)
		throw new Error("Choose a file between 1 byte and 100 MB.");
	signal?.throwIfAborted();

	onProgress(5, `Calculating SHA-256 checksum for ${file.name}...`);
	const masterHash = await sha256(file);

	onProgress(15, `Initializing upload session for ${file.name}...`);
	const session = await apiRequest<{
		upload_id: string;
		chunk_size: number;
		total_chunks: number;
		status: string;
	}>("/v1/upload/init", {
		method: "POST",
		body: JSON.stringify({
			dataset_id: datasetId,
			filename: file.name,
			filesize: file.size,
			master_hash: masterHash,
			source_type: "Local",
			auto_rename: false,
		}),
		signal,
	});

	if (session.status === "duplicate_short_circuit") {
		onProgress(100, `Instant deduplicated: ${file.name} already exists.`);
		return { duplicate: true };
	}

	if (session.chunk_size <= 0 || session.total_chunks <= 0)
		throw new Error("The backend returned an invalid upload session.");

	for (let index = 0; index < session.total_chunks; index++) {
		signal?.throwIfAborted();
		const startPct = 15 + Math.round((index / session.total_chunks) * 75);
		onProgress(startPct, `Hashing chunk ${index + 1} of ${session.total_chunks}...`);

		const chunk = file.slice(
			index * session.chunk_size,
			(index + 1) * session.chunk_size,
		);
		const form = new FormData();
		form.set("upload_id", session.upload_id);
		form.set("chunk_index", String(index));
		form.set("chunk_hash", await sha256(chunk));
		form.set("chunk_file", chunk, file.name);

		onProgress(startPct + 2, `Transferring chunk ${index + 1} of ${session.total_chunks}...`);
		await apiRequest("/v1/upload/chunk", {
			method: "POST",
			body: form,
			signal,
		});

		const donePct = 15 + Math.round(((index + 1) / session.total_chunks) * 75);
		onProgress(donePct, `Chunk ${index + 1} of ${session.total_chunks} uploaded`);
	}

	onProgress(92, `Finalizing and linking ${file.name} to dataset...`);
	await apiRequest("/v1/upload/finalize", {
		method: "POST",
		body: JSON.stringify({
			upload_id: session.upload_id,
			master_hash: masterHash,
		}),
		signal,
	});

	onProgress(100, `Successfully ingested ${file.name}`);
	return { duplicate: false };
}
export const ingestionService = {
	status: () =>
		apiRequest<{ total_active_jobs: number; jobs: IngestionJob[] }>(
			"/v1/ingest/status",
			{},
			false,
		),
	googleUrl: (dataset_id: string, gdrive_url: string) =>
		apiRequest("/v1/ingest/gdrive/url", {
			method: "POST",
			body: JSON.stringify({ dataset_id, gdrive_url }),
		}),
	sharepointUrl: (dataset_id: string, sharepoint_url: string) =>
		apiRequest("/v1/ingest/sharepoint/url", {
			method: "POST",
			body: JSON.stringify({ dataset_id, sharepoint_url }),
		}),
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
};
