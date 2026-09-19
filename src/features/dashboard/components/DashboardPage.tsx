import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
	Database,
	Files,
	ArrowDownToLine,
	Plug,
	Plus,
	Upload,
	ArrowRight,
	CalendarDays,
	ArrowUpRight,
	CircleCheck,
	FileText,
	ShieldCheck,
	MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading, SourceIcon, sourceLabels } from "@/components/PlatformUi";
import { DatasetDialog } from "@/features/datasets/components/DatasetDialog";
import { DatasetTable } from "@/features/datasets/components/DatasetTable";
import { UploadDialog } from "@/features/ingestion/components/UploadDialog";
import { JobCard } from "@/features/ingestion/components/JobCard";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { Source } from "@/types/platform";

export function DashboardPage() {
	const { datasets, jobs, organizationId, role, connections } = useWorkspace();
	const navigate = useNavigate();
	const [createOpen, setCreateOpen] = useState(false);
	const [uploadOpen, setUploadOpen] = useState(false);
	const activeJobs = jobs.filter((job) =>
		["pending", "in_progress"].includes(job.status),
	);
	const metrics = [
		{
			label: "Total datasets",
			value: String(datasets.length).padStart(2, "0"),
			detail: "Organized and ready to explore",
			icon: Database,
			foot: `${datasets.filter((item) => item.status === "Completed").length} completed`,
			href: "/datasets",
		},
		{
			label: "Files ingested",
			value: datasets
				.reduce((sum, dataset) => sum + dataset.file_count, 0)
				.toLocaleString(),
			detail: "Across all your datasets",
			icon: Files,
			foot: "From 4 different sources",
			href: "/datasets",
		},
		{
			label: "Active jobs",
			value: String(activeJobs.length).padStart(2, "0"),
			detail: "Your data is on its way",
			icon: ArrowDownToLine,
			foot: `${activeJobs.filter((job) => job.status === "in_progress").length} processing · ${activeJobs.filter((job) => job.status === "pending").length} queued`,
			href: "/jobs",
		},
		{
			label: "Connected sources",
			value: String(Object.values(connections).filter(Boolean).length).padStart(
				2,
				"0",
			),
			detail: "Bring everything together",
			icon: Plug,
			foot: `${Object.values(connections).filter((value) => !value).length} more source${Object.values(connections).filter((value) => !value).length === 1 ? "" : "s"} to connect`,
			href: "/integrations",
		},
	];
	if (role === "super_admin")
		return (
			<div className="panel p-8">
				<h1 className="page-title">Platform administration</h1>
				<p className="page-description">
					Super admins manage organizations, not customer datasets.
				</p>
				<Link to="/admin/organizations" className="text-link mt-5">
					Manage organizations <ArrowRight className="size-4" />
				</Link>
			</div>
		);
	return (
		<div className="flex flex-col gap-7">
			<div>
				<div className="mb-3 flex items-center justify-between">
					<p className="text-sm text-muted-foreground">
						Your workspace at a glance
					</p>
					<span className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
						<CalendarDays className="size-4" />
						Friday, September 18, 2026
					</span>
				</div>
				<PageHeading
					title="Good morning, Alex"
					description="Here’s what’s happening with your data today."
					action={
						<>
							<Button
								variant="outline"
								size="lg"
								onClick={() => setUploadOpen(true)}
							>
								<Upload data-icon="inline-start" />
								Upload files
							</Button>
							<Button size="lg" onClick={() => setCreateOpen(true)}>
								<Plus data-icon="inline-start" />
								Create dataset
							</Button>
						</>
					}
				/>
			</div>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{metrics.map((metric) => (
					<Link
						to={metric.href}
						key={metric.label}
						className="panel group overflow-hidden transition-shadow hover:shadow-sm"
					>
						<div className="p-5">
							<div className="flex items-center justify-between">
								<p className="font-medium text-muted-foreground">
									{metric.label}
								</p>
								<metric.icon
									className="size-[18px] text-muted-foreground"
									strokeWidth={1.6}
								/>
							</div>
							<div className="mt-3 flex items-baseline gap-3">
								<span className="text-[34px] font-semibold leading-tight tracking-[-1.5px]">
									{metric.value}
								</span>
								{metric.label === "Active jobs" && activeJobs.length > 0 && (
									<span className="flex items-center gap-1.5 text-sm text-primary">
										<span className="size-1.5 rounded-full bg-primary" />
										In progress
									</span>
								)}
							</div>
							<p className="mt-1 text-sm text-muted-foreground">
								{metric.detail}
							</p>
						</div>
						<div className="flex items-center justify-between border-t bg-muted/35 px-5 py-2.5">
							<span className="flex items-center gap-1.5 text-sm text-muted-foreground">
								{metric.label === "Total datasets" && (
									<CircleCheck className="size-3.5 text-success" />
								)}
								{metric.foot}
							</span>
							<ArrowUpRight className="size-3.5 text-muted-foreground group-hover:text-primary" />
						</div>
					</Link>
				))}
			</div>
			<div className="grid min-w-0 grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_330px] xl:grid-cols-[minmax(0,1fr)_305px]">
				<section className="panel min-w-0 overflow-hidden">
					<div className="flex items-center justify-between px-5 py-5">
						<div className="flex items-center gap-2.5">
							<h2 className="section-heading">Recent datasets</h2>
							<span className="rounded-md border px-1.5 text-sm text-muted-foreground">
								{datasets.length}
							</span>
						</div>
						<Link to="/datasets" className="text-link">
							View all <ArrowRight className="size-3.5" />
						</Link>
					</div>
					<DatasetTable datasets={datasets.slice(0, 6)} compact />
					<div className="flex items-center justify-between border-t px-5 py-3.5 text-sm text-muted-foreground">
						<span>Showing {Math.min(datasets.length, 6)} recent datasets</span>
						<button
							onClick={() => setCreateOpen(true)}
							className="flex items-center gap-1.5 font-medium hover:text-primary"
						>
							<Plus className="size-4" />
							New dataset
						</button>
					</div>
				</section>
				<section className="panel flex flex-col">
					<div className="flex items-center justify-between px-5 py-5">
						<div className="flex items-center gap-2">
							<h2 className="section-heading">Ingestion activity</h2>
							<span className="flex size-5 items-center justify-center rounded-md bg-primary/8 text-sm font-medium text-primary">
								{activeJobs.length}
							</span>
						</div>
						<Link to="/jobs" aria-label="View all ingestion jobs">
							<MoreHorizontal className="size-5 text-muted-foreground" />
						</Link>
					</div>
					<div className="flex flex-1 flex-col">
						{activeJobs.length ? (
							activeJobs.slice(0, 3).map((job) => (
								<div key={job.job_id} className="border-t px-5 py-5">
									<JobCard job={job} compact />
								</div>
							))
						) : (
							<p className="px-5 py-8 text-muted-foreground">
								All caught up. No active jobs.
							</p>
						)}
					</div>
					<Link
						to="/jobs"
						className="flex items-center justify-center gap-2 border-t py-4 text-sm font-medium text-muted-foreground hover:text-primary"
					>
						View all jobs <ArrowRight className="size-4" />
					</Link>
				</section>
			</div>
			<section>
				<div className="mb-4 flex items-center justify-between">
					<div>
						<h2 className="section-heading">Connect your data</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							All your files. Any source. One workspace.
						</p>
					</div>
					<Link to="/integrations" className="text-link">
						Manage integrations <ArrowRight className="size-3.5" />
					</Link>
				</div>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{(["Local", "GDrive", "Sharepoint", "FTP"] as Source[]).map(
						(source) => (
							<button
								key={source}
								onClick={() =>
									source === "Local"
										? setUploadOpen(true)
										: navigate(`/integrations?source=${source}`)
								}
								className="panel group p-4 text-left transition-colors hover:border-primary/30"
							>
								<div className="flex items-center justify-between">
									<span className="icon-tile">
										<SourceIcon source={source} className="size-5" />
									</span>
									<ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary" />
								</div>
								<h3 className="mt-3 font-semibold">{sourceLabels[source]}</h3>
								<p className="mt-1 text-sm text-muted-foreground">
									{source === "Local"
										? "Drag, drop, and you’re done."
										: source === "GDrive"
											? "From your drive to your dataset."
											: source === "Sharepoint"
												? "Keep your team’s files in sync."
												: "Connect your remote servers."}
								</p>
								<div className="mt-4 flex items-center gap-1.5 text-sm">
									{!connections[source] ? (
										<span className="text-muted-foreground">Not connected</span>
									) : (
										<>
											<span className="size-1.5 rounded-full bg-success" />
											<span className="text-success">
												{source === "Local" ? "Ready to upload" : "Connected"}
											</span>
										</>
									)}
								</div>
							</button>
						),
					)}
				</div>
			</section>
			<section className="panel">
				<div className="flex items-center justify-between px-5 py-4">
					<h2 className="section-heading">Recent activity</h2>
					<Link to="/audit-logs" className="text-link">
						View audit logs <ArrowRight className="size-3.5" />
					</Link>
				</div>
				{organizationId === "acme" ? (
					<div className="grid border-t md:grid-cols-3">
						{[
							{
								icon: CircleCheck,
								title: "Q3 Financial Reports is ready",
								detail: "24 files ingested successfully",
								time: "2 min ago",
							},
							{
								icon: FileText,
								title: "Customer Research updated",
								detail: "Alex uploaded 16 new files",
								time: "48 min ago",
							},
							{
								icon: ShieldCheck,
								title: "A new teammate was invited",
								detail: "Oliver Park was invited to Acme",
								time: "Yesterday",
							},
						].map((activity, index) => (
							<div
								key={activity.title}
								className={`flex items-start gap-3 p-5 ${index ? "border-t md:border-l md:border-t-0" : ""}`}
							>
								<activity.icon className="mt-0.5 size-[18px] shrink-0 text-muted-foreground" />
								<div>
									<p className="text-sm font-medium">{activity.title}</p>
									<p className="mt-1 text-sm text-muted-foreground">
										{activity.detail}
									</p>
									<p className="mt-2 text-sm text-muted-foreground">
										{activity.time}
									</p>
								</div>
							</div>
						))}
					</div>
				) : (
					<p className="border-t p-5 text-muted-foreground">
						No recent activity in this workspace.
					</p>
				)}
			</section>
			<DatasetDialog open={createOpen} onOpenChange={setCreateOpen} />
			<UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
		</div>
	);
}
