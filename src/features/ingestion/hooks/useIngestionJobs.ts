"use client";

import useSWR from "swr";
import { ingestionService } from "@/features/ingestion/services/ingestion.service";

export function useIngestionJobs(
	organizationId: string | null,
	enabled: boolean,
) {
	return useSWR(
		enabled && organizationId ? ["live:ingestion-jobs", organizationId] : null,
		ingestionService.status,
		{
			refreshInterval: (data) =>
				data?.jobs.some(
					(job) => job.status === "pending" || job.status === "in_progress",
				)
					? 4000
					: 0,
			revalidateOnFocus: true,
			shouldRetryOnError: false,
		},
	);
}
