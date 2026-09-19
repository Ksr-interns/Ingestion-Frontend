import { FileText, Clock3 } from "lucide-react";
import { SourceIcon, sourceLabels } from "@/components/PlatformUi";
import type { IngestionJob } from "@/types/platform";

export function JobCard({
	job,
	compact = false,
}: {
	job: IngestionJob;
	compact?: boolean;
}) {
	return (
		<div>
			<div className="flex items-start gap-2.5">
				<span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
					<FileText className="size-4" />
				</span>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium" title={job.filename}>
						{job.filename}
					</p>
					<p className="mt-0.5 truncate text-sm text-muted-foreground">
						{job.dataset_name}
					</p>
				</div>
			</div>
			{job.status === "pending" ? (
				<div className="mt-4 flex items-center justify-between text-sm">
					<span className="flex items-center gap-1.5 text-muted-foreground">
						<Clock3 className="size-3.5" />
						Queued
					</span>
					<span className="text-muted-foreground">Waiting to start</span>
				</div>
			) : (
				<>
					<div className="mt-4 flex items-center justify-between text-sm">
						<span
							className={
								job.status === "failed" ? "text-foreground" : "text-primary"
							}
						>
							{job.status === "completed"
								? "Completed"
								: job.status === "failed"
									? "Failed"
									: "Processing"}
						</span>
						<span className="font-medium text-muted-foreground">
							{job.progress_percentage}%
						</span>
					</div>
					<div
						role="progressbar"
						aria-label={`${job.filename} progress`}
						aria-valuenow={job.progress_percentage}
						aria-valuemin={0}
						aria-valuemax={100}
						className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
					>
						<div
							className="h-full rounded-full bg-primary"
							style={{ width: `${job.progress_percentage}%` }}
						/>
					</div>
				</>
			)}
			<div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
				<span className="flex items-center gap-1.5">
					<SourceIcon source={job.provider} className="size-3.5" />
					{sourceLabels[job.provider]}
				</span>
				<span>{job.filesize}</span>
			</div>
			{!compact && job.error_message && (
				<p className="mt-4 rounded-lg bg-muted p-3 text-sm">
					{job.error_message}
				</p>
			)}
		</div>
	);
}
