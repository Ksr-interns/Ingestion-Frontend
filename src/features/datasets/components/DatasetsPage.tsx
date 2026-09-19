import { useState } from "react";
import {
	Plus,
	Search,
	LayoutGrid,
	List,
	Database,
	ArrowUpRight,
	Download,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeading, StatusBadge, SourceLabel } from "@/components/PlatformUi";
import { DatasetTable } from "@/features/datasets/components/DatasetTable";
import { DatasetDialog } from "@/features/datasets/components/DatasetDialog";
import { useWorkspace } from "@/hooks/useWorkspace";
import { downloadCsv } from "@/utils/format";

export function DatasetsPage() {
	const { datasets, role } = useWorkspace();
	const [query, setQuery] = useState("");
	const [status, setStatus] = useState("all");
	const [source, setSource] = useState("all");
	const [view, setView] = useState<"list" | "grid">("list");
	const [createOpen, setCreateOpen] = useState(false);
	const [page, setPage] = useState(1);
	if (role === "super_admin")
		return (
			<p>
				Super admins cannot access customer datasets. Open Organizations to
				manage the platform.
			</p>
		);
	const filtered = datasets.filter(
		(dataset) =>
			`${dataset.name} ${dataset.description}`
				.toLowerCase()
				.includes(query.toLowerCase()) &&
			(status === "all" || dataset.status === status) &&
			(source === "all" || dataset.source_type === source),
	);
	const displayed = filtered.slice((page - 1) * 8, page * 8);
	const exportData = () =>
		downloadCsv("datasets.csv", [
			["Name", "Source", "Files", "Status", "Language"],
			...filtered.map((item) => [
				item.name,
				item.source_type,
				String(item.file_count),
				item.status,
				item.language,
			]),
		]);
	return (
		<div className="flex flex-col gap-7">
			<PageHeading
				title="Datasets"
				description="A home for every file. Organize, manage, and explore your data."
				action={
					<>
						<Button variant="outline" size="lg" onClick={exportData}>
							<Download data-icon="inline-start" />
							Export
						</Button>
						<Button size="lg" onClick={() => setCreateOpen(true)}>
							<Plus data-icon="inline-start" />
							Create dataset
						</Button>
					</>
				}
			/>
			<div className="flex items-center gap-6 border-b pb-4">
				<span className="font-medium">
					All datasets{" "}
					<span className="ml-2 rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
						{datasets.length}
					</span>
				</span>
				<span className="text-sm text-muted-foreground">
					{datasets.reduce((sum, item) => sum + item.file_count, 0)} files in
					your workspace
				</span>
			</div>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap items-center gap-3">
					<div className="relative w-64">
						<Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
						<Input
							className="h-9 pl-9"
							placeholder="Search datasets..."
							aria-label="Search datasets"
							value={query}
							onChange={(event) => {
								setQuery(event.target.value);
								setPage(1);
							}}
						/>
					</div>
					<select
						className="native-select"
						aria-label="Filter by status"
						value={status}
						onChange={(event) => {
							setStatus(event.target.value);
							setPage(1);
						}}
					>
						<option value="all">All statuses</option>
						<option>Completed</option>
						<option>In Progress</option>
						<option>Created</option>
					</select>
					<select
						className="native-select"
						aria-label="Filter by source"
						value={source}
						onChange={(event) => {
							setSource(event.target.value);
							setPage(1);
						}}
					>
						<option value="all">All sources</option>
						<option value="Local">Local upload</option>
						<option value="GDrive">Google Drive</option>
						<option value="Sharepoint">SharePoint</option>
						<option value="FTP">FTP server</option>
					</select>
				</div>
				<div className="flex items-center gap-1 rounded-lg border p-1">
					<Button
						variant={view === "list" ? "secondary" : "ghost"}
						size="icon-sm"
						aria-label="List view"
						aria-pressed={view === "list"}
						onClick={() => setView("list")}
					>
						<List />
					</Button>
					<Button
						variant={view === "grid" ? "secondary" : "ghost"}
						size="icon-sm"
						aria-label="Grid view"
						aria-pressed={view === "grid"}
						onClick={() => setView("grid")}
					>
						<LayoutGrid />
					</Button>
				</div>
			</div>
			{view === "list" || !displayed.length ? (
				<div className="panel overflow-hidden">
					<DatasetTable datasets={displayed} />
					<div className="flex items-center justify-between border-t p-4">
						<p className="text-sm text-muted-foreground">
							{filtered.length} dataset{filtered.length !== 1 ? "s" : ""} · Page{" "}
							{page} of {Math.max(1, Math.ceil(filtered.length / 8))}
						</p>
						<div className="flex gap-2">
							<Button
								variant="outline"
								disabled={page === 1}
								onClick={() => setPage(page - 1)}
							>
								Previous
							</Button>
							<Button
								variant="outline"
								disabled={page * 8 >= filtered.length}
								onClick={() => setPage(page + 1)}
							>
								Next
							</Button>
						</div>
					</div>
				</div>
			) : (
				<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
					{displayed.map((dataset) => (
						<Link
							key={dataset.id}
							to={`/datasets/${dataset.id}`}
							className="panel p-5 hover:border-primary/30"
						>
							<div className="flex items-center justify-between">
								<span className="icon-tile">
									<Database className="size-5" />
								</span>
								<ArrowUpRight className="size-4 text-muted-foreground" />
							</div>
							<h2 className="mt-5 font-semibold">{dataset.name}</h2>
							<p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">
								{dataset.description}
							</p>
							<div className="mt-5 flex items-center justify-between">
								<SourceLabel source={dataset.source_type} />
								<span className="text-sm text-muted-foreground">
									{dataset.file_count} files
								</span>
							</div>
							<div className="mt-4 border-t pt-4">
								<StatusBadge status={dataset.status} />
							</div>
						</Link>
					))}
				</div>
			)}
			<DatasetDialog open={createOpen} onOpenChange={setCreateOpen} />
		</div>
	);
}
