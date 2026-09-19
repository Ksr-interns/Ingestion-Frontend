import { useState } from "react";
import {
	UserPlus,
	Search,
	ShieldCheck,
	MoreHorizontal,
	Trash2,
	Mail,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeading, StatusBadge } from "@/components/PlatformUi";
import { useWorkspace } from "@/hooks/useWorkspace";
import { initials, formatDate } from "@/utils/format";
import type { Member } from "@/types/platform";

import { organizationService } from "@/features/organization/services/organization.service";

export function MembersPage() {
	const { members, setMembers, role } = useWorkspace();
	const [query, setQuery] = useState("");
	const [inviteOpen, setInviteOpen] = useState(false);
	const [removing, setRemoving] = useState<Member | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	if (role !== "org_admin")
		return (
			<div className="panel p-8">
				<ShieldCheck className="size-8 text-primary" />
				<h1 className="mt-4 text-xl font-semibold">Team management</h1>
				<p className="page-description">
					Only organization admins can manage team members.
				</p>
			</div>
		);

	async function invite(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const values = new FormData(event.currentTarget);
		const email = String(values.get("email")).trim().toLowerCase();
		const name = String(values.get("name")).trim();
		const memberRole = values.get("role") as Member["role"];

		if (members.some((member) => member.email.toLowerCase() === email)) {
			toast.error("This email is already part of your team.");
			return;
		}

		try {
			setIsSubmitting(true);
			await organizationService.invite({
				email,
				user_name: name || undefined,
				role: memberRole,
			});
			await setMembers();
			setInviteOpen(false);
			toast.success("Member invited successfully");
		} catch (err: any) {
			toast.error(err?.message || "Failed to invite member");
		} finally {
			setIsSubmitting(false);
		}
	}

	const filtered = members.filter((member) =>
		`${member.full_name} ${member.email}`
			.toLowerCase()
			.includes(query.toLowerCase()),
	);

	return (
		<div className="flex flex-col gap-7">
			<PageHeading
				title="Team members"
				description="Great work happens together. Manage the people in your workspace."
				action={
					<Button size="lg" onClick={() => setInviteOpen(true)}>
						<UserPlus data-icon="inline-start" />
						Invite member
					</Button>
				}
			/>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 className="section-heading">
					Your team{" "}
					<span className="ml-2 rounded-md border px-2 py-0.5 text-sm font-normal text-muted-foreground">
						{members.length}
					</span>
				</h2>
				<div className="relative w-64">
					<Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
					<Input
						className="h-9 pl-9"
						aria-label="Search team members"
						placeholder="Search by name or email..."
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
				</div>
			</div>
			<div className="panel overflow-x-auto">
				<table className="data-table">
					<thead>
						<tr>
							<th>Member</th>
							<th>Role</th>
							<th>Status</th>
							<th>Joined</th>
							<th>
								<span className="sr-only">Manage</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((member) => (
							<tr key={member.membership_id}>
								<td>
									<div className="flex items-center gap-3">
										<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/8 text-sm font-medium text-primary">
											{initials(member.full_name)}
										</span>
										<div>
											<p className="font-medium">
												{member.full_name}
												{member.membership_id === "member-1" && (
													<span className="ml-2 font-normal text-muted-foreground">
														(you)
													</span>
												)}
											</p>
											<p className="mt-0.5 text-sm text-muted-foreground">
												{member.email}
											</p>
										</div>
									</div>
								</td>
								<td>
									<select
										className="native-select"
										aria-label={`Role for ${member.full_name}`}
										value={member.role}
										onChange={async (event) => {
											const newRole = event.target.value as Member["role"];
											try {
												await organizationService.changeRole(member.membership_id, newRole);
												await setMembers();
												toast.success("Member role updated");
											} catch (err: any) {
												toast.error(err?.message || "Failed to update role");
											}
										}}
									>
										<option value="member">Member</option>
										<option value="org_admin">Organization admin</option>
									</select>
								</td>
								<td>
									<StatusBadge
										status={member.is_active ? "Active" : "Invited"}
									/>
								</td>
								<td className="whitespace-nowrap text-muted-foreground">
									{formatDate(member.created_at)}
								</td>
								<td>
									<DropdownMenu>
										<DropdownMenuTrigger
											render={
												<Button
													variant="ghost"
													size="icon-sm"
													aria-label={`Manage ${member.full_name}`}
												/>
											}
										>
											<MoreHorizontal />
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end" className="w-48">
											<DropdownMenuGroup>
												{!member.is_active && (
													<DropdownMenuItem
														onClick={() =>
															toast.info(
																"Resending invitations requires your backend. No email was sent.",
															)
														}
													>
														<Mail />
														Resend invitation
													</DropdownMenuItem>
												)}
												<DropdownMenuItem
													disabled={member.membership_id === "member-1"}
													onClick={() => setRemoving(member)}
												>
													<Trash2 />
													Remove member
												</DropdownMenuItem>
											</DropdownMenuGroup>
										</DropdownMenuContent>
									</DropdownMenu>
								</td>
							</tr>
						))}
					</tbody>
				</table>
				{!filtered.length && (
					<p className="p-10 text-center text-muted-foreground">
						No members match your search.
					</p>
				)}
			</div>
			<div className="grid gap-4 md:grid-cols-2">
				<div className="panel p-5">
					<h3 className="font-medium">Organization admin</h3>
					<p className="mt-2 text-sm leading-6 text-muted-foreground">
						Manage settings, team membership, datasets, and ingestion from all
						sources.
					</p>
				</div>
				<div className="panel p-5">
					<h3 className="font-medium">Member</h3>
					<p className="mt-2 text-sm leading-6 text-muted-foreground">
						Create and manage datasets, ingest files, and view their own audit
						history.
					</p>
				</div>
			</div>
			<Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Invite a teammate</DialogTitle>
						<DialogDescription>
							Add someone to your organization workspace.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={invite} className="flex flex-col gap-6 pt-2">
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="member-name">Full name</FieldLabel>
								<Input
									id="member-name"
									name="name"
									placeholder="e.g. Jamie Taylor"
									maxLength={255}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="member-email">Email address</FieldLabel>
								<Input
									id="member-email"
									type="email"
									name="email"
									placeholder="jamie@company.com"
									required
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="member-role">Role</FieldLabel>
								<select id="member-role" name="role" className="native-select">
									<option value="member">Member</option>
									<option value="org_admin">Organization admin</option>
								</select>
							</Field>
						</FieldGroup>
						<div className="flex justify-end gap-2 border-t pt-4">
							<Button
								type="button"
								variant="outline"
								disabled={isSubmitting}
								onClick={() => setInviteOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								<UserPlus data-icon="inline-start" />
								{isSubmitting ? "Inviting..." : "Send invitation"}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
			<Dialog
				open={!!removing}
				onOpenChange={(open: boolean) => {
					if (!open) setRemoving(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Remove {removing?.full_name}?</DialogTitle>
						<DialogDescription>
							This member will lose access to this organization and its datasets.
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end gap-2 pt-4">
						<Button variant="outline" onClick={() => setRemoving(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={async () => {
								if (!removing) return;
								try {
									await organizationService.removeMember(removing.membership_id);
									await setMembers();
									setRemoving(null);
									toast.success("Member removed successfully");
								} catch (err: any) {
									toast.error(err?.message || "Failed to remove member");
								}
							}}
						>
							Remove member
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
