import { apiRequest } from "@/services/api-client";
import type { AuditEntry } from "@/types/platform";

export function getAuditLogs(
	filters: {
		status?: "success" | "failed";
		date_range?: "Today" | "Yesterday" | "Last 7 Days" | "Last 30 Days";
		sort?: "timestamp" | "status" | "user_id" | "username" | "method";
		limit?: number;
	} = {},
) {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(filters))
		if (value !== undefined) query.set(key, String(value));
	return apiRequest<{
		items: AuditEntry[];
		count: { total: number; success: number; failed: number };
	}>(`/v1/audit-logs?${query}`, {}, false);
}
