import { useState } from "react";
import { Download, Search, ArrowUpDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { PageHeading, StatusBadge } from "@/components/PlatformUi";
import useSWR from "swr";
import { getAuditLogs } from "@/features/audit/services/audit.service";
import { downloadCsv } from "@/utils/format";
import type { AuditEntry } from "@/types/platform";

export function AuditPage() {
	const [status, setStatus] = useState<"all" | "success" | "failed">("all");
	const [range, setRange] = useState<"Today" | "Yesterday" | "Last 7 Days" | "Last 30 Days">("Last 7 Days");
	const [query, setQuery] = useState("");
	const [ascending, setAscending] = useState(false);
	const [selected, setSelected] = useState<AuditEntry | null>(null);

	const { data, isLoading } = useSWR(
		["api:audit-logs", status, range],
		async () => {
			try {
				const res = await getAuditLogs({
					status: status === "all" ? undefined : status,
					date_range: range,
					limit: 100,
				});
				return res;
			} catch {
				return { items: [], count: { total: 0, success: 0, failed: 0 } };
			}
		},
		{ fallbackData: { items: [], count: { total: 0, success: 0, failed: 0 } }, refreshInterval: 5000 }
	);

	const entries = data?.items || [];

	const filtered = entries
		.filter((item) => {
			const searchTarget = `${item.username || ""} ${item.action || ""} ${item.method || ""} ${item.id || ""} ${item.status || ""}`.toLowerCase();
			return searchTarget.includes(query.toLowerCase());
		})
		.sort((a, b) =>
			ascending
				? (a.timestamp || "").localeCompare(b.timestamp || "")
				: (b.timestamp || "").localeCompare(a.timestamp || ""),
		);

	function formatDate(timestamp: string) {
		try {
			const d = new Date(timestamp);
			if (isNaN(d.getTime())) return timestamp;
			return d.toLocaleString(undefined, {
				month: "short",
				day: "numeric",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
			});
		} catch {
			return timestamp;
		}
	}

	return (
		<div className="flex flex-col gap-7">
			<PageHeading
				title="Audit logs"
				description="A clear record of what happened, when, and who was involved."
				action={
					<Button
						variant="outline"
						size="lg"
						onClick={() =>
							downloadCsv("audit-logs.csv", [
								["Timestamp", "User", "Method", "Action / Event", "Status Code"],
								...filtered.map((item) => [
									item.timestamp,
									item.username || "User",
									item.method,
									item.action,
									String(item.status),
								]),
							])
						}
					>
						<Download data-icon="inline-start" />
						Export logs
					</Button>
				}
			/>

			{/* Filters & Search Toolbar */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="relative w-72">
					<Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
					<Input
						className="h-9 pl-9"
						placeholder="Search events, users, or methods..."
						aria-label="Search audit logs"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
				</div>
				<div className="flex items-center gap-3">
					<select
						className="native-select"
						aria-label="Filter audit date"
						value={range}
						onChange={(event) =>
							setRange(
								event.target.value as
									| "Today"
									| "Yesterday"
									| "Last 7 Days"
									| "Last 30 Days",
							)
						}
					>
						{["Today", "Yesterday", "Last 7 Days", "Last 30 Days"].map((val) => (
							<option key={val}>{val}</option>
						))}
					</select>
					<select
						className="native-select"
						aria-label="Filter audit status"
						value={status}
						onChange={(event) => setStatus(event.target.value as "all" | "success" | "failed")}
					>
						<option value="all">All statuses</option>
						<option value="success">Success</option>
						<option value="failed">Failed</option>
					</select>
				</div>
			</div>

			{/* Audit Log Data Table */}
			<div className="panel overflow-x-auto">
				<table className="data-table">
					<thead>
						<tr>
							<th>
								<button
									onClick={() => setAscending(!ascending)}
									className="flex items-center gap-2 hover:text-foreground"
								>
									Timestamp <ArrowUpDown className="size-3.5" />
								</button>
							</th>
							<th>User</th>
							<th>Event / Action</th>
							<th>Method</th>
							<th>HTTP Status</th>
							<th>
								<span className="sr-only">Details</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{isLoading ? (
							<tr>
								<td colSpan={6} className="py-8 text-center text-muted-foreground">
									Loading audit logs...
								</td>
							</tr>
						) : filtered.length === 0 ? (
							<tr>
								<td colSpan={6} className="py-8 text-center text-muted-foreground">
									No audit events recorded yet or matching search filters.
								</td>
							</tr>
						) : (
							filtered.map((entry) => (
								<tr key={entry.id}>
									<td className="whitespace-nowrap font-mono text-xs">
										{formatDate(entry.timestamp)}
									</td>
									<td className="whitespace-nowrap font-medium">
										{entry.username || "System User"}
									</td>
									<td>
										<p className="font-semibold text-foreground">{entry.action}</p>
										{entry.description && (
											<p className="mt-0.5 text-xs text-muted-foreground">{entry.description}</p>
										)}
									</td>
									<td>
										<span className="rounded-md border bg-muted/40 px-2 py-0.5 text-xs font-mono font-medium">
											{entry.method}
										</span>
									</td>
									<td>
										<StatusBadge
											status={entry.status < 400 ? "Success" : "Failed"}
										/>
									</td>
									<td>
										<Button variant="ghost" size="sm" onClick={() => setSelected(entry)}>
											Details
										</Button>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
				<div className="border-t p-4 text-sm text-muted-foreground">
					Showing {filtered.length} event{filtered.length === 1 ? "" : "s"}
				</div>
			</div>

			{/* Log Detail Dialog */}
			<Dialog
				open={!!selected}
				onOpenChange={(open: boolean) => {
					if (!open) setSelected(null);
				}}
			>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Audit Event Details</DialogTitle>
						<DialogDescription>
							Detailed record for request {selected?.id}
						</DialogDescription>
					</DialogHeader>
					{selected && (
						<dl className="grid grid-cols-[110px_1fr] gap-4 py-4 text-sm">
							{[
								["Event ID", selected.id],
								["Request ID", selected.request_id || "N/A"],
								["Timestamp", formatDate(selected.timestamp)],
								["User", selected.username || "System User"],
								["Action", selected.action],
								["HTTP Method", selected.method],
								["Status Code", String(selected.status)],
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
