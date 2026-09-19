import { useState } from "react";
import useSWR from "swr";
import {
	History as HistoryIcon,
	Search,
	FileText,
	HardDrive,
	Calendar,
	CheckCircle2,
	Clock,
	AlertCircle,
	ArrowUpDown,
	Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { PageHeading, SourceIcon, StatusBadge } from "@/components/PlatformUi";
import { apiRequest } from "@/services/api-client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { formatBytes, downloadCsv } from "@/utils/format";
import type { Source } from "@/types/platform";

export interface HistoryItem {
	id: string;
	name: string;
	type: string;
	size?: number | null;
	dataset_name?: string | null;
	status?: string | null;
	source_type?: string | null;
	children?: HistoryItem[] | null;
}

function flattenUploads(node: HistoryItem): HistoryItem[] {
	const result: HistoryItem[] = [];
	if (node.type === "file") {
		result.push(node);
	}
	if (node.children && Array.isArray(node.children)) {
		for (const child of node.children) {
			result.push(...flattenUploads(child));
		}
	}
	return result;
}

export function HistoryPage() {
	const { datasets } = useWorkspace();
	const [query, setQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [sourceFilter, setSourceFilter] = useState("all");
	const [ascending, setAscending] = useState(false);
	const [selectedFile, setSelectedFile] = useState<HistoryItem | null>(null);

	const { data, isLoading } = useSWR(
		"api:uploads-tree",
		async () => {
			try {
				const res = await apiRequest<HistoryItem>("/v1/uploads");
				return res;
			} catch {
				return null;
			}
		},
		{ refreshInterval: 5000 }
	);

	// Flatten root tree into list of files
	let allFiles: HistoryItem[] = data ? flattenUploads(data) : [];

	// Fallback to dataset tree files if /v1/uploads returns empty tree
	if (allFiles.length === 0 && datasets.length > 0) {
		datasets.forEach((ds) => {
			if (ds.tree && Array.isArray(ds.tree)) {
				ds.tree.forEach((node) => {
					if (node.type === "file") {
						allFiles.push({
							id: node.id,
							name: node.name,
							type: "file",
							size: node.size,
							dataset_name: ds.name,
							status: node.status || ds.status || "Completed",
							source_type: ds.source_type || "Local",
						});
					}
				});
			}
		});
	}

	const filtered = allFiles
		.filter((file) => {
			const text = `${file.name} ${file.dataset_name || ""} ${file.source_type || ""}`.toLowerCase();
			const matchesQuery = text.includes(query.toLowerCase());

			const matchesStatus =
				statusFilter === "all" ||
				(file.status || "").toLowerCase().includes(statusFilter.toLowerCase());

			const matchesSource =
				sourceFilter === "all" ||
				(file.source_type || "").toLowerCase() === sourceFilter.toLowerCase();

			return matchesQuery && matchesStatus && matchesSource;
		})
		.sort((a, b) =>
			ascending ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
		);

	return (
		<div className="flex flex-col gap-7">
			<PageHeading
				title="Upload & Ingestion History"
				description="Complete archive of all uploaded files, ingestion methods, target datasets, and statuses."
				action={
					<Button
						variant="outline"
						size="lg"
						onClick={() =>
							downloadCsv("upload-history.csv", [
								["File ID", "File Name", "Dataset", "Ingestion Mode", "Size (Bytes)", "Status"],
								...filtered.map((item) => [
									item.id,
									item.name,
									item.dataset_name || "N/A",
									item.source_type || "Local",
									String(item.size || 0),
									item.status || "Completed",
								]),
							])
						}
					>
						<Download data-icon="inline-start" />
						Export History
					</Button>
				}
			/>

			{/* Search & Filter Controls */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="relative w-72">
					<Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
					<Input
						className="h-9 pl-9"
						placeholder="Search by filename or dataset..."
						aria-label="Search upload history"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
				</div>
				<div className="flex items-center gap-3">
					<select
						className="native-select"
						aria-label="Filter by source"
						value={sourceFilter}
						onChange={(e) => setSourceFilter(e.target.value)}
					>
						<option value="all">All Sources</option>
						<option value="local">Local</option>
						<option value="gdrive">Google Drive</option>
						<option value="sharepoint">SharePoint</option>
						<option value="ftp">FTP</option>
					</select>
					<select
						className="native-select"
						aria-label="Filter by status"
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
					>
						<option value="all">All Statuses</option>
						<option value="completed">Completed</option>
						<option value="in progress">In Progress</option>
						<option value="created">Created</option>
					</select>
				</div>
			</div>

			{/* History Table */}
			<div className="panel overflow-x-auto">
				<table className="data-table">
					<thead>
						<tr>
							<th>
								<button
									onClick={() => setAscending(!ascending)}
									className="flex items-center gap-2 hover:text-foreground"
								>
									File Name <ArrowUpDown className="size-3.5" />
								</button>
							</th>
							<th>Target Dataset</th>
							<th>Ingestion Mode</th>
							<th>Size</th>
							<th>Status</th>
							<th>
								<span className="sr-only">Details</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{isLoading ? (
							<tr>
								<td colSpan={6} className="py-8 text-center text-muted-foreground">
									Loading upload history...
								</td>
							</tr>
						) : filtered.length === 0 ? (
							<tr>
								<td colSpan={6} className="py-8 text-center text-muted-foreground">
									No uploads found matching your search or filters.
								</td>
							</tr>
						) : (
							filtered.map((item) => (
								<tr key={item.id}>
									<td className="whitespace-nowrap">
										<div className="flex items-center gap-3">
											<FileText className="size-4 shrink-0 text-primary" />
											<span className="font-medium text-foreground">{item.name}</span>
										</div>
									</td>
									<td className="whitespace-nowrap">
										<span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
											{item.dataset_name || "Workspace"}
										</span>
									</td>
									<td className="whitespace-nowrap">
										<div className="flex items-center gap-2">
											<SourceIcon source={(item.source_type as Source) || "Local"} className="size-4" />
											<span className="text-sm">{item.source_type || "Local"}</span>
										</div>
									</td>
									<td className="whitespace-nowrap text-sm text-muted-foreground">
										{item.size ? formatBytes(item.size) : "N/A"}
									</td>
									<td className="whitespace-nowrap">
										<StatusBadge
											status={
												(item.status || "").toLowerCase().includes("fail") ||
												(item.status || "").toLowerCase().includes("error")
													? "Failed"
													: (item.status || "Completed").toLowerCase().includes("completed") ||
														  (item.status || "").toLowerCase().includes("attached") ||
														  (item.status || "").toLowerCase().includes("success") ||
														  (item.status || "").toLowerCase().includes("duplicate")
														? "Completed"
														: "In Progress"
											}
										/>
									</td>
									<td className="whitespace-nowrap">
										<Button variant="ghost" size="sm" onClick={() => setSelectedFile(item)}>
											View details
										</Button>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
				<div className="border-t p-4 text-sm text-muted-foreground">
					Showing {filtered.length} uploaded file{filtered.length === 1 ? "" : "s"}
				</div>
			</div>

			{/* File Details Dialog */}
			<Dialog
				open={!!selectedFile}
				onOpenChange={(open) => {
					if (!open) setSelectedFile(null);
				}}
			>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Upload File Details</DialogTitle>
						<DialogDescription>
							Metadata and record details for {selectedFile?.name}
						</DialogDescription>
					</DialogHeader>
					{selectedFile && (
						<dl className="grid grid-cols-[120px_1fr] gap-4 py-4 text-sm">
							{[
								["File ID", selectedFile.id],
								["File Name", selectedFile.name],
								["Target Dataset", selectedFile.dataset_name || "Default Workspace"],
								["Ingestion Mode", selectedFile.source_type || "Local Upload"],
								["File Size", selectedFile.size ? `${formatBytes(selectedFile.size)} (${selectedFile.size.toLocaleString()} bytes)` : "N/A"],
								["Status", selectedFile.status || "Completed"],
							].map(([label, value]) => (
								<div key={label} className="contents">
									<dt className="text-muted-foreground font-medium">{label}</dt>
									<dd className="break-all font-mono text-xs">{value}</dd>
								</div>
							))}
						</dl>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
