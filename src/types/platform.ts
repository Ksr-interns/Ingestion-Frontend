export type Source = "Local" | "GDrive" | "Sharepoint" | "FTP";
export type DatasetStatus = "Completed" | "In Progress" | "Created";
export type JobStatus = "in_progress" | "pending" | "completed" | "failed";
export type PreviewRole = "org_admin" | "member" | "super_admin";
export interface FileNode {
	id: string;
	name: string;
	type: "file" | "folder";
	size: number;
	status: string;
	children?: FileNode[];
}
export interface Dataset {
	id: string;
	name: string;
	description: string;
	language: string;
	source_type: Source;
	status: DatasetStatus;
	file_count: number;
	created_at?: string;
	updated_at: string;
	tree: FileNode[];
	user_id?: string;
}
export interface IngestionJob {
	job_id: string;
	filename: string;
	dataset_name: string;
	provider: Source;
	status: JobStatus;
	progress_percentage: number;
	filesize: string;
	error_message?: string;
}
export interface Member {
	membership_id: string;
	full_name: string;
	email: string;
	role: "org_admin" | "member";
	is_active: boolean;
	created_at: string;
}
export interface Organization {
	id: string;
	name: string;
	display_name: string;
	is_active: boolean;
	google_sso_enabled: boolean;
	created_at: string;
	members: number;
}
export interface AuditEntry {
	id: string;
	username?: string | null;
	action: string;
	method: string;
	status: number;
	timestamp: string;
	description?: string;
	request_id?: string;
}
export interface PublicUser {
	id: string;
	email: string;
	username?: string | null;
	full_name: string | null;
	role: string;
	is_verified?: boolean;
	auth_provider?: string;
	organization_id?: string | null;
	memberships: {
		organization_id: string;
		organization_name?: string;
		role: "org_admin" | "member";
		is_active: boolean;
	}[];
}
