import type { Source } from "@/types/platform";

export interface ApiFileNode {
	id: string;
	type: "folder" | "file";
	name: string;
	size: number;
	dataset_name: string | null;
	status: string | null;
	source_type: Source | null;
	children: ApiFileNode[] | null;
}
export interface ApiDataset {
	id: string;
	user_id: string;
	name: string;
	dataset_name: string;
	description: string | null;
	status: "Created" | "In Progress" | "Completed";
	language: string | null;
	source_type: Source | null;
	created_at: string;
	updated_at: string;
	file_count: number;
	tree: ApiFileNode | null;
}
export interface DatasetInput {
	name: string;
	description?: string;
	language: string;
}
