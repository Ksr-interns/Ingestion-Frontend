import { apiRequest } from "@/services/api-client";
import type { Organization } from "@/types/platform";

export const adminService = {
	list: (page = 1) =>
		apiRequest<Organization[]>(
			`/v1/organizations?page=${page}&limit=50&include_inactive=true`,
			{},
			false,
		),
	get: (id: string) =>
		apiRequest<Organization>(
			`/v1/organizations/${encodeURIComponent(id)}`,
			{},
			false,
		),
	create: (data: {
		name: string;
		display_name: string;
		admin_email?: string;
		admin_name?: string;
		admin_username?: string;
		admin_password?: string;
		google_sso_enabled?: boolean;
	}) =>
		apiRequest<Organization>(
			"/v1/organizations",
			{ method: "POST", body: JSON.stringify(data) },
			false,
		),
	update: (
		id: string,
		data: {
			display_name?: string;
			is_active?: boolean;
			google_sso_enabled?: boolean;
		},
	) =>
		apiRequest<Organization>(
			`/v1/organizations/${encodeURIComponent(id)}`,
			{ method: "PATCH", body: JSON.stringify(data) },
			false,
		),
};
