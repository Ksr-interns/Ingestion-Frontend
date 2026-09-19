import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
	Upload,
	Pencil,
	ArrowLeft,
	Search,
	Folder,
	FileText,
	ChevronDown,
	ChevronRight,
	MoveRight,
	Paperclip,
	Trash2,
	Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
	PageHeading,
	StatusBadge,
	SourceLabel,
	EmptyState,
} from "@/components/PlatformUi";
import { DatasetDialog } from "@/features/datasets/components/DatasetDialog";
import { UploadDialog } from "@/features/ingestion/components/UploadDialog";
import { JobCard } from "@/features/ingestion/components/JobCard";
import { useWorkspace } from "@/hooks/useWorkspace";
import { formatBytes, formatDate } from "@/utils/format";
import type { FileNode, Dataset, Source } from "@/types/platform";
import useSWR, { mutate } from "swr";
import { datasetsService } from "@/features/datasets/services/datasets.service";
import { ingestionService } from "@/features/ingestion/services/ingestion.service";

function normalizeTree(treeNode: any): FileNode[] {
	if (!treeNode) return [];
	if (Array.isArray(treeNode)) return treeNode;
	return [
		{
			id: treeNode.id || "root",
			name: treeNode.name || "Root",
			type: treeNode.type || "folder",
			size: treeNode.size || 0,
			status: treeNode.status || "ready",
			children: treeNode.children ? treeNode.children.map(normalizeTree).flat() : undefined,
		},
	];
}

function FileRow({
	node,
	depth = 0,
	query,
	onMove,
	onDelete,
}: {
	node: FileNode;
	depth?: number;
	query: string;
	onMove: (node: FileNode) => void;
	onDelete: (node: FileNode) => void;
}) {
	const [expanded, setExpanded] = useState(true);
	const matches = query
		? node.name.toLowerCase().includes(query.toLowerCase())
		: true;
	if (query && !matches && (!node.children || node.children.length === 0)) {
		return null;
	}
	return (
		<>
			<tr className="hover:bg-muted/40">
				<td className="font-medium text-foreground">
					<div
						className="flex items-center gap-2"
						style={{ paddingLeft: `${depth * 20}px` }}
					>
						{node.type === "folder" ? (
							<button
								type="button"
								className="flex items-center gap-1.5 text-left text-sm font-medium hover:text-primary"
								onClick={() => setExpanded(!expanded)}
							>
								{expanded ? (
									<ChevronDown className="size-4 text-muted-foreground" />
								) : (
									<ChevronRight className="size-4 text-muted-foreground" />
								)}
								<Folder className="size-4 text-primary" />
								{node.name}
							</button>
						) : (
							<span className="flex items-center gap-2 text-sm text-foreground">
								<FileText className="size-4 text-muted-foreground" />
								{node.name}
							</span>
						)}
					</div>
				</td>
				<td className="text-muted-foreground">
					{node.size ? formatBytes(node.size) : "—"}
				</td>
				<td>
					<span className="text-xs text-muted-foreground capitalize">
						{node.status || "ready"}
					</span>
				</td>
				<td className="text-right">
					<div className="flex items-center justify-end gap-1">
						<Button
							variant="ghost"
							size="icon-sm"
							title="Move Content to another Dataset"
							onClick={() => onMove(node)}
						>
							<MoveRight className="size-4 text-muted-foreground hover:text-primary" />
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							title="Delete File"
							onClick={() => onDelete(node)}
						>
							<Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
						</Button>
					</div>
				</td>
			</tr>
			{node.children &&
				expanded &&
				node.children.map((child) => (
					<FileRow
						key={child.id}
						node={child}
						depth={depth + 1}
						query={matches ? "" : query}
						onMove={onMove}
						onDelete={onDelete}
					/>
				))}
		</>
	);
}

export function DatasetDetailPage({ id: propId }: { id?: string } = {}) {
	const { id: paramId } = useParams<{ id: string }>();
	const id = propId ?? paramId ?? "";
	const { datasets, jobs, role, setDatasets } = useWorkspace();
	const localDataset = datasets.find((item) => item.id === id);

	const { data: remoteDataset, isLoading } = useSWR<Dataset | null>(
		id ? ["api:dataset", id] : null,
		async () => {
			try {
				const d: any = await datasetsService.get(id);
				if (!d) return null;
				return {
					id: d.id,
					name: d.name || d.dataset_name,
					description: d.description || "",
					language: d.language || "English",
					source_type: (d.source_type as Source) || "Local",
					status: (d.status as Dataset["status"]) || "Created",
					file_count: d.file_count || 0,
					updated_at: d.updated_at || new Date().toISOString(),
					created_at: d.created_at,
					tree: normalizeTree(d.tree),
					user_id: d.user_id,
				};
			} catch {
				return null;
			}
		},
		{ fallbackData: localDataset }
	);

	const dataset = remoteDataset || localDataset;
	const [uploadOpen, setUploadOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [attachOpen, setAttachOpen] = useState(false);
	const [moveModalOpen, setMoveModalOpen] = useState(false);
	const [query, setQuery] = useState("");

	const [attachFileIdInput, setAttachFileIdInput] = useState("");
	const [selectedNodeToMove, setSelectedNodeToMove] = useState<FileNode | null>(null);
	const [targetDatasetIdForMove, setTargetDatasetIdForMove] = useState("");

	if (role === "super_admin")
		return <p>Super admins cannot access customer datasets.</p>;
	if (isLoading && !dataset)
		return (
			<div className="p-12 text-center text-muted-foreground">
				Loading dataset...
			</div>
		);
	if (!dataset)
		return (
			<EmptyState
				title="Dataset not found"
				description="It may have been removed, or it belongs to another workspace."
			>
				<Link to="/datasets" className="text-link">
					Back to datasets
				</Link>
			</EmptyState>
		);

	async function handleAttachFileSubmit() {
		if (!attachFileIdInput.trim()) {
			toast.error("Please enter a valid File UUID");
			return;
		}
		try {
			await ingestionService.attachFile(dataset!.id, attachFileIdInput.trim());
			toast.success("File attached to dataset successfully");
			setAttachFileIdInput("");
			setAttachOpen(false);
			mutate(["api:dataset", dataset!.id]);
		} catch (err: any) {
			toast.error(err?.message || "Failed to attach file");
		}
	}

	async function handleMoveContentSubmit() {
		if (!selectedNodeToMove || !targetDatasetIdForMove) {
			toast.error("Please select a target destination dataset");
			return;
		}
		if (targetDatasetIdForMove === dataset!.id) {
			toast.error("Target dataset must be different from current dataset");
			return;
		}
		try {
			const payload: any = { target_dataset_id: targetDatasetIdForMove };
			if (selectedNodeToMove.type === "folder") payload.folder_id = selectedNodeToMove.id;
			else payload.file_id = selectedNodeToMove.id;

			await ingestionService.moveContent(dataset!.id, payload);
			toast.success(`Moved ${selectedNodeToMove.name} successfully`);
			setMoveModalOpen(false);
			setSelectedNodeToMove(null);
			setTargetDatasetIdForMove("");
			mutate(["api:dataset", dataset!.id]);
			setDatasets();
		} catch (err: any) {
			toast.error(err?.message || "Failed to move content");
		}
	}

	async function handleDeleteFileNode(node: FileNode) {
		try {
			await ingestionService.deleteUpload(node.id);
			toast.success(`Deleted ${node.name}`);
			mutate(["api:dataset", dataset!.id]);
		} catch (err: any) {
			toast.error(err?.message || "Failed to delete file");
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<Link
				to="/datasets"
				className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
			>
				<ArrowLeft className="size-4" />
				Back to datasets
			</Link>
			<PageHeading
				title={dataset.name}
				description={dataset.description || "No description added yet."}
				action={
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="lg"
							onClick={() => setAttachOpen(true)}
						>
							<Paperclip data-icon="inline-start" />
							Attach File ID
						</Button>
						<Button
							variant="outline"
							size="lg"
							onClick={() => setEditOpen(true)}
						>
							<Pencil data-icon="inline-start" />
							Edit dataset
						</Button>
						<Button size="lg" onClick={() => setUploadOpen(true)}>
							<Upload data-icon="inline-start" />
							Add files
						</Button>
					</div>
				}
			/>
			<div className="flex flex-wrap items-center gap-5">
				<StatusBadge status={dataset.status} />
				<SourceLabel source={dataset.source_type} />
				<span className="text-sm text-muted-foreground">
					{dataset.file_count} files
				</span>
				<span className="text-sm text-muted-foreground">
					{dataset.language}
				</span>
			</div>

			{/* ACTIVE DATASET INGESTION PROGRESS BANNER */}
			{(dataset as any).progress_percentage !== undefined &&
				(dataset as any).progress_percentage > 0 &&
				(dataset as any).progress_percentage < 100 && (
					<div className="panel p-4 border-l-4 border-l-primary bg-primary/5 flex flex-col gap-2.5 shadow-sm">
						<div className="flex items-center justify-between text-sm font-semibold text-primary">
							<span className="flex items-center gap-2">
								<Loader2 className="size-4 animate-spin text-primary" />
								Dataset Ingestion & Indexing Pipeline in Progress...
							</span>
							<span className="font-bold text-base">{(dataset as any).progress_percentage}%</span>
						</div>
						<div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full bg-primary transition-all duration-300"
								style={{ width: `${(dataset as any).progress_percentage}%` }}
							/>
						</div>
						<p className="text-xs text-muted-foreground">
							The backend pipeline is processing, embedding, and indexing your dataset documents.
						</p>
					</div>
				)}
			<Tabs defaultValue="files">
				<TabsList variant="line">
					<TabsTrigger value="files">Files & folders</TabsTrigger>
					<TabsTrigger value="activity">Ingestion activity</TabsTrigger>
					<TabsTrigger value="details">Dataset details</TabsTrigger>
				</TabsList>
				<TabsContent value="files">
					<div className="panel mt-4 overflow-hidden">
						<div className="flex items-center justify-between p-5">
							<h2 className="section-heading">Files & folders</h2>
							<div className="relative w-52">
								<Search className="absolute left-3 top-2 size-4 text-muted-foreground" />
								<Input
									className="pl-9"
									placeholder="Find a file..."
									aria-label="Find a file"
									value={query}
									onChange={(event) => setQuery(event.target.value)}
								/>
							</div>
						</div>
						{dataset.tree.length ? (
							<div className="overflow-x-auto">
								<table className="data-table">
									<thead>
										<tr>
											<th>Name</th>
											<th>Size</th>
											<th>Status</th>
											<th className="text-right">Actions</th>
										</tr>
									</thead>
									<tbody>
										{dataset.tree.map((node) => (
											<FileRow
												key={node.id}
												node={node}
												query={query}
												onMove={(n) => {
													setSelectedNodeToMove(n);
													setMoveModalOpen(true);
												}}
												onDelete={handleDeleteFileNode}
											/>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<EmptyState
								title="Your dataset is ready for files"
								description="Upload from your device, or bring files in from your connected sources."
							>
								<Button onClick={() => setUploadOpen(true)}>
									<Upload data-icon="inline-start" />
									Add files
								</Button>
							</EmptyState>
						)}
					</div>
				</TabsContent>
				<TabsContent value="activity">
					<div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{jobs
							.filter((job) => job.dataset_name === dataset.name)
							.map((job) => (
								<div key={job.job_id} className="panel p-5">
									<JobCard job={job} />
								</div>
							))}
					</div>
					{!jobs.some((job) => job.dataset_name === dataset.name) && (
						<EmptyState
							title="No ingestion jobs"
							description="New ingestion jobs for this dataset will appear here."
						/>
					)}
				</TabsContent>
				<TabsContent value="details">
					<div className="panel mt-5 max-w-2xl p-6">
						<h2 className="section-heading">About this dataset</h2>
						<dl className="mt-6 grid grid-cols-[140px_1fr] gap-x-4 gap-y-5 text-sm">
							<dt className="text-muted-foreground">Name</dt>
							<dd>{dataset.name}</dd>
							<dt className="text-muted-foreground">Description</dt>
							<dd>{dataset.description || "Not provided"}</dd>
							<dt className="text-muted-foreground">Language</dt>
							<dd>{dataset.language}</dd>
							<dt className="text-muted-foreground">Last updated</dt>
							<dd>{formatDate(dataset.updated_at)}</dd>
							<dt className="text-muted-foreground">Dataset ID</dt>
							<dd className="break-all">{dataset.id}</dd>
						</dl>
					</div>
				</TabsContent>
			</Tabs>

			{/* ATTACH FILE DIALOG */}
			<Dialog open={attachOpen} onOpenChange={setAttachOpen}>
				<DialogContent aria-describedby="attach-file-description">
					<DialogHeader>
						<DialogTitle>Attach Pre-uploaded File UUID</DialogTitle>
						<DialogDescription id="attach-file-description">
							Attach an existing file to this dataset using its unique UUID.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-4 py-2">
						<Field>
							<FieldLabel htmlFor="attach-file-id">File UUID</FieldLabel>
							<Input
								id="attach-file-id"
								placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
								value={attachFileIdInput}
								onChange={(e) => setAttachFileIdInput(e.target.value)}
							/>
							<FieldDescription>
								The backend file identifier returned from an upload session.
							</FieldDescription>
						</Field>
						<div className="flex justify-end gap-2 mt-2">
							<Button variant="outline" onClick={() => setAttachOpen(false)}>Cancel</Button>
							<Button onClick={handleAttachFileSubmit}>Attach File</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* MOVE CONTENT DIALOG */}
			<Dialog open={moveModalOpen} onOpenChange={setMoveModalOpen}>
				<DialogContent aria-describedby="move-content-description">
					<DialogHeader>
						<DialogTitle>Move Content to Another Dataset</DialogTitle>
						<DialogDescription id="move-content-description">
							Re-associate {selectedNodeToMove?.name} with a different target dataset.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-4 py-2">
						<Field>
							<FieldLabel htmlFor="target-dataset-move">Select Target Destination Dataset</FieldLabel>
							<select
								id="target-dataset-move"
								className="native-select text-base font-medium"
								value={targetDatasetIdForMove}
								onChange={(e) => setTargetDatasetIdForMove(e.target.value)}
							>
								<option value="">Choose a destination dataset...</option>
								{datasets
									.filter((d) => d.id !== dataset.id)
									.map((ds) => (
										<option key={ds.id} value={ds.id}>
											{ds.name} ({ds.language || "English"})
										</option>
									))}
							</select>
						</Field>
						<div className="flex justify-end gap-2 mt-2">
							<Button variant="outline" onClick={() => setMoveModalOpen(false)}>Cancel</Button>
							<Button onClick={handleMoveContentSubmit}>Move Content</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<DatasetDialog
				dataset={dataset}
				open={editOpen}
				onOpenChange={setEditOpen}
			/>
			<UploadDialog
				datasetId={dataset.id}
				open={uploadOpen}
				onOpenChange={setUploadOpen}
			/>
		</div>
	);
}
