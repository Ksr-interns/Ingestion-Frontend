export function formatBytes(bytes: number) {
	if (!bytes) return "0 B";
	const index = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0)} ${["B", "KB", "MB", "GB"][index] ?? "GB"}`;
}
export function initials(name: string) {
	return name
		.split(" ")
		.map((part) => part[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
}
export function formatDate(value: string) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC",
	}).format(new Date(value));
}
export function relativePreviewTime(value: string) {
	const diff = Date.now() - new Date(value).getTime();
	const minutes = Math.max(0, Math.round(diff / 60000));
	if (minutes < 1) return "Just now";
	if (minutes < 60) return `${minutes} min ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
	const days = Math.floor(hours / 24);
	if (days === 1) return "Yesterday";
	if (days < 30) return `${days} days ago`;
	return formatDate(value);
}
export function downloadCsv(filename: string, rows: string[][]) {
	const escape = (value: string) =>
		`"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
	const blob = new Blob(
		[rows.map((row) => row.map(escape).join(",")).join("\n")],
		{ type: "text/csv;charset=utf-8;" },
	);
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
}
