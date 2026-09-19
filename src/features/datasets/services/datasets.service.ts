import { apiRequest } from "@/services/api-client";
import type { ApiDataset as Dataset } from "@/features/datasets/types/dataset";
export const datasetsService = {
	list: (page = 1, limit = 10) =>
		apiRequest<Dataset[]>(
			`/v1/datasets?page=${page}&limit=${limit}&include_completed=true`,
		),
	get: (id: string) =>
		apiRequest<Dataset>(`/v1/datasets/${encodeURIComponent(id)}`),
	create: (data: Pick<Dataset, "name" | "description" | "language">) =>
		apiRequest<Dataset>("/v1/datasets", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	update: (
		id: string,
		data: Partial<Pick<Dataset, "name" | "description" | "language">>,
	) =>
		apiRequest<Dataset>(`/v1/datasets/${encodeURIComponent(id)}`, {
			method: "PATCH",
			body: JSON.stringify(data),
		}),
	remove: (id: string) =>
		apiRequest(`/v1/datasets/${encodeURIComponent(id)}`, { method: "DELETE" }),
	attachFile: (id: string, fileId: string) =>
		apiRequest(`/v1/datasets/${encodeURIComponent(id)}/files`, {
			method: "POST",
			body: JSON.stringify({ file_id: fileId }),
		}),
};
