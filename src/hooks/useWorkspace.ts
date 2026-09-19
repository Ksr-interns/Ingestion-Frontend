import useSWR from "swr";
import { useAuth } from "@/contexts/AuthContext";
import { datasetsService } from "@/features/datasets/services/datasets.service";

import { ingestionService } from "@/features/ingestion/services/ingestion.service";
import { organizationService } from "@/features/organization/services/organization.service";
import { integrationsService } from "@/features/integrations/services/integrations.service";
import { adminService } from "@/features/admin/services/admin.service";
import type {
	Dataset,
	PreviewRole,
	Organization,
	Member,
	IngestionJob,
	Source,
	FileNode,
} from "@/types/platform";

function normalizeTree(treeNode: any): FileNode[] {
	if (!treeNode) return [];
	if (Array.isArray(treeNode)) return treeNode;
	return [
		{
			id: treeNode.id || "root",
			name: treeNode.name || "Root",
			type: treeNode.type || "folder",
			size: treeNode.size || 0,
			status: treeNode.status || "ready",
			children: treeNode.children ? treeNode.children.map(normalizeTree).flat() : undefined,
		},
	];
}

export function useWorkspace() {
	const auth = useAuth();
	const isAuthenticated = auth?.isAuthenticated ?? false;
	const activeOrgId = auth?.activeOrganizationId;
	const user = auth?.user;

	// Organization ID selection
	const { data: organizationId = activeOrgId || "acme", mutate: setOrganization } =
		useSWR<string>(
			"workspace:organization",
			() => activeOrgId || "acme",
			{ fallbackData: activeOrgId || "acme" }
		);

	// User role: resolve from auth user or default to org_admin
	const defaultRole: PreviewRole =
		user?.role === "super_admin"
			? "super_admin"
			: (user?.memberships?.find((m) => m.organization_id === organizationId)?.role as PreviewRole) ||
				"org_admin";

	const { data: role = defaultRole, mutate: setRole } = useSWR<PreviewRole>(
		["workspace:role", user?.id, organizationId],
		() => defaultRole,
		{ fallbackData: defaultRole }
	);

	// Organizations
	const {
		data: organizations = [],
		mutate: setOrganizations,
	} = useSWR<Organization[]>(
		isAuthenticated ? ["api:organizations", user?.id, user?.role] : null,
		async () => {
			if (!isAuthenticated) return [];
			try {
				if (user?.role === "super_admin") {
					const res = await adminService.list();
					return res || [];
				}
				// For org admins or members, fetch their active profile or derive from user memberships
				const myOrg = await organizationService.profile().catch(() => null);
				if (myOrg) return [myOrg];
				if (user?.memberships?.length) {
					return user.memberships.map((m) => ({
						id: m.organization_id,
						name: m.organization_name || m.organization_id,
						display_name: m.organization_name || m.organization_id,
						is_active: true,
						google_sso_enabled: false,
						created_at: new Date().toISOString(),
						members: 1,
					}));
				}
				return [];
			} catch {
				return [];
			}
		},
		{ fallbackData: [] }
	);

	// Datasets
	const { data: datasets = [], mutate: setDatasets } = useSWR<Dataset[]>(
		isAuthenticated && organizationId
			? ["api:datasets", organizationId]
			: null,
		async () => {
			if (!isAuthenticated || !organizationId) return [];
			try {
				const list = await datasetsService.list(1, 100);
				return (list || []).map((d: any) => ({
					id: d.id,
					name: d.name || d.dataset_name,
					description: d.description || "",
					language: d.language || "English",
					source_type: (d.source_type as Source) || "Local",
					status: (d.status as Dataset["status"]) || "Created",
					file_count: d.file_count || 0,
					updated_at: d.updated_at || new Date().toISOString(),
					created_at: d.created_at,
					tree: normalizeTree(d.tree),
					user_id: d.user_id,
				}));
			} catch {
				return [];
			}
		},
		{ fallbackData: [] }
	);

	// Ingestion jobs
	const { data: jobs = [], mutate: setJobs } = useSWR<IngestionJob[]>(
		isAuthenticated && organizationId
			? ["api:jobs", organizationId]
			: null,
		async () => {
			if (!isAuthenticated || !organizationId) return [];
			try {
				const status = await ingestionService.status();
				return status.jobs || [];
			} catch {
				return [];
			}
		},
		{
			fallbackData: [],
			refreshInterval: isAuthenticated ? 4000 : 0, // poll live jobs every 4s
		}
	);

	// Organization members
	const { data: members = [], mutate: setMembers } = useSWR<Member[]>(
		isAuthenticated && organizationId
			? ["api:members", organizationId]
			: null,
		async () => {
			if (!isAuthenticated || !organizationId) return [];
			try {
				const list = await organizationService.members();
				return list || [];
			} catch {
				return [];
			}
		},
		{ fallbackData: [] }
	);

	// Connected integrations
	const {
		data: connections = {
			Local: true,
			GDrive: false,
			Sharepoint: false,
			FTP: false,
		},
		mutate: setConnections,
	} = useSWR<Record<Source, boolean>>(
		isAuthenticated ? ["api:connections", user?.id] : null,
		async () => {
			if (!isAuthenticated) {
				return { Local: true, GDrive: false, Sharepoint: false, FTP: false };
			}
			try {
				const status = await integrationsService.status();
				return {
					Local: true,
					GDrive: !!status.google_connected,
					Sharepoint: !!status.microsoft_connected,
					FTP: false,
				};
			} catch {
				return { Local: true, GDrive: false, Sharepoint: false, FTP: false };
			}
		},
		{
			fallbackData: { Local: true, GDrive: false, Sharepoint: false, FTP: false },
		}
	);

	const organization =
		organizations.find((org) => org.id === organizationId) ??
		organizations[0] ?? {
			id: organizationId,
			name: "Workspace",
			display_name: "My Workspace",
			is_active: true,
			google_sso_enabled: false,
			created_at: new Date().toISOString(),
			members: 1,
		};

	// Merge datasets with live background job progression
	const datasetsWithLiveProgress = datasets.map((ds) => {
		const activeJob = jobs.find(
			(j) =>
				(j.dataset_id === ds.id || j.dataset_name === ds.name) &&
				(j.status === "in_progress" || j.status === "pending")
		);
		if (activeJob) {
			return {
				...ds,
				status: "In Progress" as const,
				progress_percentage: activeJob.progress_percentage ?? 0,
				active_job: activeJob,
			};
		}
		return ds;
	});

	return {
		organizationId,
		organization,
		setOrganization: (orgId: string) => {
			setOrganization(orgId);
			auth?.setActiveOrganizationId(orgId);
		},
		role,
		setRole,
		datasets: datasetsWithLiveProgress,
		setDatasets,
		jobs,
		setJobs,
		members,
		setMembers,
		organizations,
		setOrganizations,
		connections,
		setConnections,
	};
}
