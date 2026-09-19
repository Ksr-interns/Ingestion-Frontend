import { Link } from "react-router-dom";
import { useState } from "react";
import {
	Database,
	MoreHorizontal,
	ArrowUpRight,
	Pencil,
	Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { StatusBadge, SourceLabel, EmptyState } from "@/components/PlatformUi";
import { datasetsService } from "@/features/datasets/services/datasets.service";
import { DatasetDialog } from "@/features/datasets/components/DatasetDialog";
import { useWorkspace } from "@/hooks/useWorkspace";
import { relativePreviewTime } from "@/utils/format";
import type { Dataset } from "@/types/platform";

export function DatasetTable({
	datasets,
	compact = false,
}: {
	datasets: Dataset[];
	compact?: boolean;
}) {
	const { datasets: allDatasets, setDatasets } = useWorkspace();
	const [editing, setEditing] = useState<Dataset | undefined>();
	const [deleting, setDeleting] = useState<Dataset | undefined>();
	if (!datasets.length)
		return (
			<EmptyState
				title="No datasets found"
				description="Try another search, adjust your filters, or create a new dataset."
			/>
		);
	return (
		<>
			<div className="overflow-x-auto">
				<table className="data-table">
					<thead>
						<tr>
							<th>Dataset name</th>
							<th>Source</th>
							<th>Files</th>
							<th>Status</th>
							{!compact && <th>Last updated</th>}
							<th>
								<span className="sr-only">Actions</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{datasets.map((dataset) => (
							<tr key={dataset.id}>
								<td>
									<Link
										to={`/datasets/${dataset.id}`}
										className="group flex min-w-48 items-center gap-3"
									>
										<span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground group-hover:border-primary/30 group-hover:text-primary">
											<Database className="size-[17px]" strokeWidth={1.6} />
										</span>
										<span className="font-medium group-hover:text-primary">
											{dataset.name}
										</span>
									</Link>
								</td>
								<td>
									<SourceLabel source={dataset.source_type} />
								</td>
								<td className="text-muted-foreground">{dataset.file_count}</td>
								<td>
									<div className="flex flex-col gap-1">
										<StatusBadge status={dataset.status} />
										{(dataset as any).progress_percentage !== undefined &&
											(dataset as any).progress_percentage > 0 &&
											(dataset as any).progress_percentage < 100 && (
												<div className="w-28 space-y-1">
													<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
														<div
															className="h-full bg-primary transition-all duration-300"
															style={{ width: `${(dataset as any).progress_percentage}%` }}
														/>
													</div>
													<span className="text-[11px] text-muted-foreground font-medium">
														{(dataset as any).progress_percentage}% ingested
													</span>
												</div>
											)}
									</div>
								</td>
								{!compact && (
									<td className="whitespace-nowrap text-muted-foreground">
										{relativePreviewTime(dataset.updated_at)}
									</td>
								)}
								<td>
									<DropdownMenu>
										<DropdownMenuTrigger
											render={
												<Button
													variant="ghost"
													size="icon-sm"
													aria-label={`Actions for ${dataset.name}`}
												/>
											}
										>
											<MoreHorizontal />
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end" className="w-44">
											<DropdownMenuGroup>
												<DropdownMenuItem
													render={<Link to={`/datasets/${dataset.id}`} />}
												>
													<ArrowUpRight />
													Open dataset
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => setEditing(dataset)}>
													<Pencil />
													Edit dataset
												</DropdownMenuItem>
												<DropdownMenuItem onClick={() => setDeleting(dataset)}>
													<Trash2 />
													Delete dataset
												</DropdownMenuItem>
											</DropdownMenuGroup>
										</DropdownMenuContent>
									</DropdownMenu>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<DatasetDialog
				open={!!editing}
				onOpenChange={(open: boolean) => {
					if (!open) setEditing(undefined);
				}}
				dataset={editing}
			/>
			<Dialog
				open={!!deleting}
				onOpenChange={(open: boolean) => {
					if (!open) setDeleting(undefined);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete this dataset?</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete &ldquo;{deleting?.name}&rdquo;? Datasets with uploaded files cannot be deleted until files are cleared.
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end gap-2 pt-4">
						<Button variant="outline" onClick={() => setDeleting(undefined)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={async () => {
								if (!deleting) return;
								try {
									await datasetsService.remove(deleting.id);
									await setDatasets();
									setDeleting(undefined);
									toast.success("Dataset deleted successfully");
								} catch (err: any) {
									toast.error(err?.message || "Failed to delete dataset");
								}
							}}
						>
							Delete dataset
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
