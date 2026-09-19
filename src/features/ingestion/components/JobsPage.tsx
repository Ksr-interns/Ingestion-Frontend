import { useState } from "react";
import {
	RefreshCw,
	Search,
	ArrowDownToLine,
	CircleCheck,
	Clock3,
	CircleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeading, SourceLabel, StatusBadge } from "@/components/PlatformUi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { JobCard } from "@/features/ingestion/components/JobCard";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { IngestionJob } from "@/types/platform";

export function JobsPage() {
	const { jobs, setJobs, role } = useWorkspace();
	const [filter, setFilter] = useState("all");
	const [query, setQuery] = useState("");
	const [selected, setSelected] = useState<IngestionJob | null>(null);
	const [isRefreshing, setIsRefreshing] = useState(false);

	if (role === "super_admin")
		return <p>Ingestion jobs are only available to organization members.</p>;

	async function handleRefresh() {
		try {
			setIsRefreshing(true);
			await setJobs();
			toast.success("Jobs refreshed");
		} finally {
			setIsRefreshing(false);
		}
	}

	const filtered = jobs.filter(
		(job) =>
			(filter === "all" || job.status === filter) &&
			`${job.filename} ${job.dataset_name}`
				.toLowerCase()
				.includes(query.toLowerCase()),
	);
	return (
		<div className="flex flex-col gap-7">
			<PageHeading
				title="Ingestion jobs"
				description="Follow every file, from its source to your workspace."
				action={
					<Button
						variant="outline"
						size="lg"
						disabled={isRefreshing}
						onClick={handleRefresh}
					>
						<RefreshCw className={isRefreshing ? "animate-spin" : ""} data-icon="inline-start" />
						Refresh
					</Button>
				}
			/>
			<div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
				{[
					{ key: "in_progress", title: "Processing", icon: ArrowDownToLine },
					{ key: "pending", title: "Queued", icon: Clock3 },
					{ key: "completed", title: "Completed", icon: CircleCheck },
					{ key: "failed", title: "Needs attention", icon: CircleAlert },
				].map((item) => (
					<button
						key={item.key}
						onClick={() => setFilter(filter === item.key ? "all" : item.key)}
						className={`panel p-5 text-left ${filter === item.key ? "border-primary bg-accent/40" : ""}`}
					>
						<div className="flex items-center justify-between text-muted-foreground">
							<span>{item.title}</span>
							<item.icon className="size-5" />
						</div>
						<p className="mt-3 text-3xl font-semibold">
							{jobs.filter((job) => job.status === item.key).length}
						</p>
					</button>
				))}
			</div>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<h2 className="section-heading">All jobs</h2>
					<select
						className="native-select"
						value={filter}
						onChange={(event) => setFilter(event.target.value)}
						aria-label="Filter job status"
					>
						<option value="all">All statuses</option>
						<option value="in_progress">Processing</option>
						<option value="pending">Queued</option>
						<option value="completed">Completed</option>
						<option value="failed">Failed</option>
					</select>
				</div>
				<div className="relative w-64">
					<Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
					<Input
						placeholder="Search jobs..."
						aria-label="Search jobs"
						className="h-9 pl-9"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
				</div>
			</div>
			<div className="panel overflow-x-auto">
				<table className="data-table">
					<thead>
						<tr>
							<th>File name</th>
							<th>Dataset</th>
							<th>Source</th>
							<th>Progress</th>
							<th>Status</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((job) => (
							<tr key={job.job_id}>
								<td>
									<button
										onClick={() => setSelected(job)}
										className="whitespace-nowrap font-medium hover:text-primary"
									>
										{job.filename}
									</button>
									<p className="mt-1 text-sm text-muted-foreground">
										{job.filesize}
									</p>
								</td>
								<td className="text-muted-foreground">{job.dataset_name}</td>
								<td>
									<SourceLabel source={job.provider} />
								</td>
								<td>
									<div className="flex min-w-28 items-center gap-3">
										<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
											<div
												className="h-full rounded-full bg-primary"
												style={{ width: `${job.progress_percentage}%` }}
											/>
										</div>
										<span className="text-sm text-muted-foreground">
											{job.progress_percentage}%
										</span>
									</div>
								</td>
								<td>
									<StatusBadge status={job.status} />
								</td>
								<td>
									<Button variant="ghost" onClick={() => setSelected(job)}>
										{job.status === "failed" ? "Review" : "Details"}
									</Button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
				{filtered.length === 0 && (
					<p className="p-12 text-center text-muted-foreground">
						No jobs match your search.
					</p>
				)}
			</div>
			<Dialog
				open={!!selected}
				onOpenChange={(open: boolean) => {
					if (!open) setSelected(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Ingestion details</DialogTitle>
						<DialogDescription>
							Job ID: {selected?.job_id}
						</DialogDescription>
					</DialogHeader>
					{selected && <JobCard job={selected} />}
				</DialogContent>
			</Dialog>
		</div>
	);
}
