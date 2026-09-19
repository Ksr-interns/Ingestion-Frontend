import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowUpRight, Save, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldDescription,
} from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeading } from "@/components/PlatformUi";
import { useWorkspace } from "@/hooks/useWorkspace";
import { configureApi, getApiBaseUrl } from "@/services/api-client";

import { organizationService } from "@/features/organization/services/organization.service";
import { useAuth } from "@/contexts/AuthContext";

export function SettingsPage({
	organizationSettings = false,
}: {
	organizationSettings?: boolean;
}) {
	const auth = useAuth();
	const user = auth?.user;
	const { organization, setOrganizations, role } =
		useWorkspace();
	const [sso, setSso] = useState(organization.google_sso_enabled);
	const [apiUrl, setApiUrl] = useState(getApiBaseUrl() ?? "");
	const [apiError, setApiError] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [jobNotifications, setJobNotifications] = useState(true);
	const [teamNotifications, setTeamNotifications] = useState(true);

	if (organizationSettings && role !== "org_admin")
		return <p>Only organization admins can access organization settings.</p>;

	async function saveOrganization(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const name = String(
			new FormData(event.currentTarget).get("display_name"),
		).trim();
		if (!name) return;

		try {
			setIsSaving(true);
			await organizationService.update({
				display_name: name,
				google_sso_enabled: sso,
			});
			await setOrganizations();
			toast.success("Organization settings updated successfully");
		} catch (err: any) {
			toast.error(err?.message || "Failed to update organization settings");
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<div className="flex flex-col gap-7">
			<PageHeading
				title={organizationSettings ? "Organization settings" : "Your settings"}
				description={
					organizationSettings
						? "Make this workspace your own. Manage your organization and sign-in preferences."
						: "Manage your profile, notifications, and backend connection."
				}
			/>
			{organizationSettings ? (
				<div className="max-w-3xl">
					<form onSubmit={saveOrganization} className="panel overflow-hidden">
						<div className="border-b p-6">
							<h2 className="section-heading">General information</h2>
							<p className="mt-1 text-sm text-muted-foreground">
								Details that identify your organization.
							</p>
						</div>
						<div className="p-6">
							<FieldGroup>
								<Field>
									<FieldLabel htmlFor="org-display-name">
										Organization name
									</FieldLabel>
									<Input
										id="org-display-name"
										name="display_name"
										defaultValue={organization.display_name}
										required
										maxLength={255}
										key={organization.id}
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="org-slug">Organization slug</FieldLabel>
									<Input id="org-slug" value={organization.name} readOnly />
									<FieldDescription>
										The unique identifier for your organization.
									</FieldDescription>
								</Field>
								<Field>
									<FieldLabel htmlFor="org-id">Organization ID</FieldLabel>
									<Input id="org-id" value={organization.id} readOnly />
								</Field>
							</FieldGroup>
						</div>
						<div className="border-t p-6">
							<div className="flex items-start justify-between gap-5">
								<div>
									<h3 className="flex items-center gap-2 font-medium">
										<ShieldCheck className="size-4 text-primary" />
										Google single sign-on
									</h3>
									<p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
										Allow members of this organization to sign in using their Google accounts.
									</p>
								</div>
								<Switch
									aria-label="Enable Google SSO"
									checked={sso}
									onCheckedChange={setSso}
								/>
							</div>
						</div>
						<div className="flex justify-end border-t bg-muted/30 p-4">
							<Button type="submit" disabled={isSaving}>
								<Save data-icon="inline-start" />
								{isSaving ? "Saving..." : "Save changes"}
							</Button>
						</div>
					</form>
				</div>
			) : (
				<Tabs defaultValue="profile">
					<TabsList variant="line">
						<TabsTrigger value="profile">Profile</TabsTrigger>
						<TabsTrigger value="notifications">Notifications</TabsTrigger>
						<TabsTrigger value="api">API connection</TabsTrigger>
					</TabsList>
					<TabsContent value="profile">
						<div className="panel mt-5 max-w-3xl">
							<div className="border-b p-6">
								<h2 className="section-heading">Personal information</h2>
								<p className="mt-1 text-sm text-muted-foreground">
									Your authenticated account profile.
								</p>
							</div>
							<div className="p-6">
								<div className="mb-6 flex items-center gap-4">
									<span className="flex size-16 items-center justify-center rounded-full bg-primary/8 text-xl font-medium text-primary uppercase">
										{user?.full_name ? user.full_name.slice(0, 2) : user?.email ? user.email.slice(0, 2) : "U"}
									</span>
									<div>
										<p className="font-medium">{user?.full_name || user?.username || "Workspace User"}</p>
										<p className="text-sm text-muted-foreground capitalize">
											{role.replace("_", " ")}
										</p>
									</div>
								</div>
								<FieldGroup>
									<Field>
										<FieldLabel htmlFor="profile-name">Full name</FieldLabel>
										<Input
											id="profile-name"
											value={user?.full_name || ""}
											readOnly
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor="profile-email">
											Email address
										</FieldLabel>
										<Input
											id="profile-email"
											type="email"
											value={user?.email || ""}
											readOnly
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor="profile-username">Username</FieldLabel>
										<Input
											id="profile-username"
											value={user?.username || ""}
											readOnly
										/>
									</Field>
								</FieldGroup>
							</div>
							<div className="flex items-center justify-between border-t p-4">
								<Link to="/forgot-password" className="text-link">
									Reset password <ArrowUpRight className="size-4" />
								</Link>
							</div>
						</div>
					</TabsContent>
					<TabsContent value="notifications">
						<div className="panel mt-5 max-w-3xl p-6">
							<h2 className="section-heading">Stay in the loop</h2>
							<p className="mt-1 text-sm text-muted-foreground">
								Manage your notification preferences.
							</p>
							<div className="mt-6 flex items-center justify-between border-t py-5">
								<div>
									<h3 className="font-medium">Ingestion updates</h3>
									<p className="mt-1 text-sm text-muted-foreground">
										When a job completes or needs attention.
									</p>
								</div>
								<Switch
									aria-label="Ingestion notifications"
									checked={jobNotifications}
									onCheckedChange={setJobNotifications}
								/>
							</div>
							<div className="flex items-center justify-between border-t py-5">
								<div>
									<h3 className="font-medium">Team activity</h3>
									<p className="mt-1 text-sm text-muted-foreground">
										New members, invitations, and role changes.
									</p>
								</div>
								<Switch
									aria-label="Team notifications"
									checked={teamNotifications}
									onCheckedChange={setTeamNotifications}
								/>
							</div>
						</div>
					</TabsContent>
					<TabsContent value="api">
						<form
							className="panel mt-5 max-w-3xl p-6"
							onSubmit={(event) => {
								event.preventDefault();
								try {
									configureApi(apiUrl);
									setApiError("");
									toast.success("API URL configured successfully");
								} catch (error) {
									setApiError(
										error instanceof Error ? error.message : "Invalid URL",
									);
								}
							}}
						>
							<h2 className="section-heading">Connect your backend API</h2>
							<p className="mb-6 mt-2 text-sm leading-6 text-muted-foreground">
								Configure the active backend API URL for this client session.
							</p>
							<Field>
								<FieldLabel htmlFor="api-url">API base URL</FieldLabel>
								<Input
									id="api-url"
									type="url"
									placeholder="https://api.yourcompany.com"
									required
									value={apiUrl}
									onChange={(event) => setApiUrl(event.target.value)}
									aria-invalid={!!apiError}
								/>
								<FieldDescription>
									Use HTTPS in production. HTTP is supported only for localhost.
								</FieldDescription>
							</Field>
							{apiError && (
								<p role="alert" className="mt-3 text-sm">
									{apiError}
								</p>
							)}
							<div className="mt-6 flex items-center gap-3">
								<Button type="submit">
									<Link2 data-icon="inline-start" />
									Configure API
								</Button>
								<Link to="/login" className="text-link">
									Go to sign in <ArrowUpRight className="size-4" />
								</Link>
							</div>
							<p className="mt-5 text-sm text-muted-foreground">
								The URL and access token are kept in memory only. Refreshing the
								page clears them.
							</p>
						</form>
					</TabsContent>
				</Tabs>
			)}
		</div>
	);
}
