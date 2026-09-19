import {
	Layers2,
	HardDrive,
	Cloud,
	Server,
	Upload,
	CircleCheck,
	LoaderCircle,
	Clock3,
	CircleAlert,
	FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Source } from "@/types/platform";
import type { ReactNode } from "react";

export function Brand({ compact = false }: { compact?: boolean }) {
	return (
		<span className="flex items-center gap-2.5">
			<span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
				<Layers2 className="size-5" strokeWidth={2.1} />
			</span>
			{!compact && (
				<span className="text-[23px] font-semibold tracking-[-1px]">
					ingest<span className="text-primary">.</span>
				</span>
			)}
		</span>
	);
}
export const sourceLabels: Record<Source, string> = {
	Local: "Local upload",
	GDrive: "Google Drive",
	Sharepoint: "SharePoint",
	FTP: "FTP server",
};
export function SourceIcon({
	source,
	className,
}: {
	source: Source;
	className?: string;
}) {
	const Icon = {
		Local: Upload,
		GDrive: HardDrive,
		Sharepoint: Cloud,
		FTP: Server,
	}[source];
	return (
		<Icon
			className={cn(
				"size-4 shrink-0",
				source === "GDrive"
					? "text-success"
					: source === "Sharepoint"
						? "text-primary"
						: "text-muted-foreground",
				className,
			)}
			strokeWidth={1.8}
		/>
	);
}
export function SourceLabel({ source }: { source: Source }) {
	return (
		<span className="inline-flex items-center gap-2 whitespace-nowrap text-muted-foreground">
			<SourceIcon source={source} />
			{sourceLabels[source]}
		</span>
	);
}
export function StatusBadge({ status }: { status: string }) {
	const normalized = status.toLowerCase().replaceAll("_", " ");
	const success = [
		"completed",
		"active",
		"connected",
		"success",
		"created",
		"ready",
		"attached",
		"duplicate",
	].includes(normalized);
	const running = ["in progress", "processing", "ingesting", "pending"].includes(normalized);
	const failed = ["failed", "suspended", "error"].includes(normalized);
	const Icon = success
		? CircleCheck
		: running
			? LoaderCircle
			: failed
				? CircleAlert
				: Clock3;
	const label =
		normalized === "in progress"
			? "In progress"
			: normalized.charAt(0).toUpperCase() + normalized.slice(1);
	return (
		<span
			className={cn(
				"status-pill",
				success
					? "status-success"
					: running
						? "status-progress"
						: "status-neutral",
			)}
		>
			<Icon className="size-3.5" />
			{label}
		</span>
	);
}
export function PageHeading({
	title,
	description,
	action,
}: {
	title: string;
	description: string;
	action?: ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-start justify-between gap-4">
			<div>
				<h1 className="page-title">{title}</h1>
				<p className="page-description">{description}</p>
			</div>
			{action && <div className="flex items-center gap-2 pt-1">{action}</div>}
		</div>
	);
}
export function EmptyState({
	title = "Nothing here yet",
	description = "Create your first dataset to get started.",
	children,
}: {
	title?: string;
	description?: string;
	children?: ReactNode;
}) {
	return (
		<div className="flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-center">
			<span className="icon-tile size-12">
				<FolderOpen className="size-6" />
			</span>
			<div>
				<h3 className="font-medium">{title}</h3>
				<p className="mt-1 max-w-sm text-sm text-muted-foreground">
					{description}
				</p>
			</div>
			{children}
		</div>
	);
}
