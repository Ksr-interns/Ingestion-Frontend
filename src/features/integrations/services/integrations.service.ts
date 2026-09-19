import { apiRequest } from "@/services/api-client";
export interface RemoteFile {
	id?: string;
	name: string;
	path?: string;
	is_folder: boolean;
	size_bytes: number;
}
export const integrationsService = {
	status: () =>
		apiRequest<{ google_connected: boolean; microsoft_connected: boolean }>(
			"/v1/users/me/integrations",
			{},
			false,
		),
	disconnect: (provider: "google" | "microsoft") =>
		apiRequest(`/v1/auth/${provider}/logout`, { method: "DELETE" }, false),
	sharepointTree: (folderId?: string) =>
		apiRequest<{ items: RemoteFile[] }>(
			`/v1/ingest/sharepoint/tree${folderId ? `?folder_id=${encodeURIComponent(folderId)}` : ""}`,
		),
	ftpTree: (path = "/") =>
		apiRequest<{
			current_path: string;
			parent_path: string;
			items: RemoteFile[];
		}>(`/v1/ingest/ftp/tree?path=${encodeURIComponent(path)}`, {}, false),
	connectFtp: (data: {
		host: string;
		port: number;
		username: string;
		password: string;
		duration_seconds: number;
	}) =>
		apiRequest(
			"/v1/ingest/ftp/connect",
			{
				method: "POST",
				body: JSON.stringify({
					...data,
					allow_insecure: false,
					graceful_expiry: true,
					until_i_stop: false,
				}),
			},
			false,
		),
	disconnectFtp: () =>
		apiRequest(
			"/v1/ingest/ftp/disconnect?force=false",
			{
				method: "POST",
				body: JSON.stringify({ delete_completed_files: false }),
			},
			false,
		),
};
