import { apiRequest } from "@/services/api-client";
import type { Member, Organization } from "@/types/platform";

export const organizationService = {
	profile: () => apiRequest<Organization>("/v1/organizations/me/profile"),
	update: (settings: { display_name?: string; google_sso_enabled?: boolean }) =>
		apiRequest<Organization>("/v1/organizations/me/settings", {
			method: "PATCH",
			body: JSON.stringify(settings),
		}),
	members: () => apiRequest<Member[]>("/v1/organizations/me/members"),
	invite: (data: { email: string; user_name?: string; role: Member["role"]; user_identifier?: string; temporary_password?: string }) =>
		apiRequest<Member>("/v1/organizations/me/members", {
			method: "POST",
			body: JSON.stringify(data),
		}),
	changeRole: (membershipId: string, role: Member["role"]) =>
		apiRequest<Member>(
			`/v1/organizations/me/members/${encodeURIComponent(membershipId)}`,
			{ method: "PATCH", body: JSON.stringify({ role }) },
		),
	removeMember: (membershipId: string) =>
		apiRequest(
			`/v1/organizations/me/members/${encodeURIComponent(membershipId)}`,
			{ method: "DELETE" },
		),
};
