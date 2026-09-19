import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Building2, ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { PageHeading, StatusBadge, EmptyState } from "@/components/PlatformUi";
import { useWorkspace } from "@/hooks/useWorkspace";
import { formatDate } from "@/utils/format";
import type { Organization } from "@/types/platform";

import { adminService } from "@/features/admin/services/admin.service";

export function OrganizationsPage({ id }: { id?: string }) {
	const { organizations, setOrganizations, role } = useWorkspace();
	const [query, setQuery] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const [confirming, setConfirming] = useState<Organization | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	if (role !== "super_admin")
		return (
			<div className="panel p-8">
				<ShieldCheck className="size-8 text-primary" />
				<h1 className="mt-4 text-xl font-semibold">Platform administration</h1>
				<p className="page-description">
					This screen requires platform super admin privileges.
				</p>
			</div>
		);
	const selected = id ? organizations.find((org) => org.id === id) : undefined;

	async function create(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const name = String(form.get("name")).trim();
		const display_name = String(form.get("display_name")).trim();
		const admin_name = String(form.get("admin_name")).trim();
		const admin_email = String(form.get("admin_email")).trim();
		const admin_password = String(form.get("admin_password")).trim();

		if (organizations.some((org) => org.name === name)) {
			toast.error("This organization slug already exists.");
			return;
		}

		try {
			setIsSubmitting(true);
			await adminService.create({
				name,
				display_name,
				admin_name: admin_name || undefined,
				admin_email: admin_email || undefined,
				admin_password: admin_password || "OrgAdmin123!",
			});
			await setOrganizations();
			setCreateOpen(false);
			toast.success(`Organization '${display_name}' & Org Admin '${admin_email}' created successfully!`);
		} catch (err: any) {
			toast.error(err?.message || "Failed to create organization");
		} finally {
			setIsSubmitting(false);
		}
	}

	if (id && !selected)
		return (
			<EmptyState
				title="Organization not found"
				description="Choose another organization from the directory."
			/>
		);
	return (
		<div className="flex flex-col gap-7">
			{selected ? (
				<>
					<Link to="/admin/organizations" className="text-link">
						<ArrowLeft className="size-4" />
						All organizations
					</Link>
					<PageHeading
						title={selected.display_name}
						description={`Organization ID: ${selected.id}`}
						action={
							<StatusBadge
								status={selected.is_active ? "Active" : "Suspended"}
							/>
						}
					/>
					<form
						className="panel max-w-3xl p-6"
						onSubmit={async (event) => {
							event.preventDefault();
							const display_name = String(
								new FormData(event.currentTarget).get("display_name"),
							).trim();
							if (!display_name) return;
							try {
								await adminService.update(selected.id, { display_name });
								await setOrganizations();
								toast.success("Organization updated successfully");
							} catch (err: any) {
								toast.error(err?.message || "Failed to update organization");
							}
						}}
					>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="admin-org-name">Display name</FieldLabel>
								<Input
									id="admin-org-name"
									name="display_name"
									defaultValue={selected.display_name}
									required
									maxLength={255}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="admin-org-slug">Slug</FieldLabel>
								<Input id="admin-org-slug" value={selected.name} readOnly />
							</Field>
							<Field orientation="horizontal">
								<FieldLabel htmlFor="admin-org-sso">
									Google SSO enabled
								</FieldLabel>
								<Switch
									id="admin-org-sso"
									checked={selected.google_sso_enabled}
									onCheckedChange={async (value: boolean) => {
										try {
											await adminService.update(selected.id, { google_sso_enabled: value });
											await setOrganizations();
											toast.success("SSO setting updated");
										} catch (err: any) {
											toast.error(err?.message || "Failed to update SSO");
										}
									}}
								/>
							</Field>
						</FieldGroup>
						<div className="mt-6 flex justify-between border-t pt-5">
							<Button
								type="button"
								variant="outline"
								onClick={() => setConfirming(selected)}
							>
								{selected.is_active
									? "Suspend organization"
									: "Activate organization"}
							</Button>
							<Button type="submit">Save changes</Button>
						</div>
					</form>
					<p className="text-sm text-muted-foreground">
						Super admins cannot access customer datasets or file contents.
					</p>
				</>
			) : (
				<>
					<PageHeading
						title="Organizations"
						description="Manage the workspaces that make up your platform."
						action={
							<Button size="lg" onClick={() => setCreateOpen(true)}>
								<Plus data-icon="inline-start" />
								Create organization
							</Button>
						}
					/>
					<div className="relative w-72">
						<Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
						<Input
							className="h-9 pl-9"
							placeholder="Search organizations..."
							aria-label="Search organizations"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
						/>
					</div>
					<div className="panel overflow-x-auto">
						<table className="data-table">
							<thead>
								<tr>
									<th>Organization</th>
									<th>Members</th>
									<th>Status</th>
									<th>Created</th>
									<th>Action</th>
								</tr>
							</thead>
							<tbody>
								{organizations
									.filter((org) =>
										`${org.display_name} ${org.name}`
											.toLowerCase()
											.includes(query.toLowerCase()),
									)
									.map((org) => (
										<tr key={org.id}>
											<td>
												<Link
													to={`/admin/organizations/${org.id}`}
													className="flex items-center gap-3"
												>
													<span className="icon-tile">
														<Building2 className="size-5" />
													</span>
													<span>
														<span className="block font-medium hover:text-primary">
															{org.display_name}
														</span>
														<span className="text-sm text-muted-foreground">
															{org.name}
														</span>
													</span>
												</Link>
											</td>
											<td>{org.members}</td>
											<td>
												<StatusBadge
													status={org.is_active ? "Active" : "Suspended"}
												/>
											</td>
											<td className="text-muted-foreground">
												{formatDate(org.created_at)}
											</td>
											<td>
												<Button
													variant="outline"
													onClick={() => setConfirming(org)}
												>
													{org.is_active ? "Suspend" : "Activate"}
												</Button>
											</td>
										</tr>
									))}
							</tbody>
						</table>
					</div>
				</>
			)}
			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Create an organization</DialogTitle>
						<DialogDescription>
							Set up a new workspace and its initial administrator.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={create} className="flex flex-col gap-6">
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="create-org-name">Display name</FieldLabel>
								<Input
									id="create-org-name"
									name="display_name"
									placeholder="Acme Inc."
									required
									minLength={2}
									maxLength={255}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="create-org-slug">
									Organization slug
								</FieldLabel>
								<Input
									id="create-org-slug"
									name="name"
									placeholder="acme-inc"
									pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
									title="Use lowercase letters, numbers, and single hyphens."
									required
									minLength={2}
									maxLength={255}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="create-admin-name">Org Admin Name</FieldLabel>
								<Input
									id="create-admin-name"
									name="admin_name"
									placeholder="e.g. Org Admin"
									required
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="create-admin-email">
									Org Admin Email
								</FieldLabel>
								<Input
									id="create-admin-email"
									type="email"
									name="admin_email"
									placeholder="admin@company.com"
									required
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="create-admin-password">
									Initial Password (admin(org))
								</FieldLabel>
								<Input
									id="create-admin-password"
									type="text"
									name="admin_password"
									placeholder="OrgAdmin123!"
									defaultValue="OrgAdmin123!"
									required
									minLength={8}
								/>
							</Field>
						</FieldGroup>
						<div className="flex justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								disabled={isSubmitting}
								onClick={() => setCreateOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Creating..." : "Create organization"}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
			<Dialog
				open={!!confirming}
				onOpenChange={(open: boolean) => {
					if (!open) setConfirming(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{confirming?.is_active ? "Suspend" : "Activate"}{" "}
							{confirming?.display_name}?
						</DialogTitle>
						<DialogDescription>
							{confirming?.is_active
								? "Users from this organization will not be able to log in or access data while suspended."
								: "Users from this organization will be able to log in and use workspace datasets."}
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end gap-2 pt-4">
						<Button variant="outline" onClick={() => setConfirming(null)}>
							Cancel
						</Button>
						<Button
							variant={confirming?.is_active ? "destructive" : "default"}
							onClick={async () => {
								if (!confirming) return;
								try {
									await adminService.update(confirming.id, {
										is_active: !confirming.is_active,
									});
									await setOrganizations();
									setConfirming(null);
									toast.success(
										confirming.is_active
											? "Organization suspended"
											: "Organization activated",
									);
								} catch (err: any) {
									toast.error(err?.message || "Failed to update organization status");
								}
							}}
						>
							Confirm
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
