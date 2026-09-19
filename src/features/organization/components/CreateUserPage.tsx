import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	UserPlus,
	ShieldCheck,
	CheckCircle2,
	Copy,
	ArrowLeft,
	Users,
	KeyRound,
	Mail,
	User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { PageHeading } from "@/components/PlatformUi";
import { useWorkspace } from "@/hooks/useWorkspace";
import { organizationService } from "@/features/organization/services/organization.service";

export function CreateUserPage() {
	const navigate = useNavigate();
	const { role, setMembers } = useWorkspace();

	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [userRole, setUserRole] = useState<"member" | "org_admin">("member");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [createdResult, setCreatedResult] = useState<{
		email: string;
		name: string;
		role: string;
		password?: string;
	} | null>(null);

	if (role !== "org_admin" && role !== "super_admin") {
		return (
			<div className="panel p-8 max-w-xl mx-auto mt-10">
				<ShieldCheck className="size-8 text-primary" />
				<h1 className="mt-4 text-xl font-semibold">Access Restricted</h1>
				<p className="page-description mt-2">
					Only Organization Admins can provision users into this organization.
				</p>
			</div>
		);
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const cleanEmail = email.trim().toLowerCase();
		const cleanName = fullName.trim();
		const cleanUsername = username.trim();
		const cleanPassword = password.trim();

		if (!cleanEmail) {
			toast.error("Please enter a valid email address.");
			return;
		}

		if (!cleanPassword || cleanPassword.length < 8) {
			toast.error("Password must be at least 8 characters long.");
			return;
		}

		try {
			setIsSubmitting(true);
			await organizationService.invite({
				user_identifier: cleanUsername || cleanEmail,
				email: cleanEmail,
				user_name: cleanName || undefined,
				role: userRole,
				temporary_password: cleanPassword,
			});

			await setMembers();

			setCreatedResult({
				email: cleanEmail,
				name: cleanName || cleanEmail.split("@")[0],
				role: userRole === "org_admin" ? "Organization Admin" : "Member",
				password: cleanPassword,
			});

			toast.success(`User ${cleanEmail} created successfully!`);
		} catch (err: any) {
			toast.error(err?.message || "Failed to create user in organization.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleReset = () => {
		setFullName("");
		setEmail("");
		setUsername("");
		setPassword("");
		setUserRole("member");
		setCreatedResult(null);
	};

	return (
		<div className="flex flex-col gap-7 max-w-4xl mx-auto">
			<div className="flex items-center gap-3">
				<Button variant="outline" size="sm" onClick={() => navigate("/organization/members")}>
					<ArrowLeft className="size-4 mr-1" />
					Back to Team Members
				</Button>
			</div>

			<PageHeading
				title="Create Organization User"
				description="Provision and register new users directly within your organization workspace."
			/>

			{createdResult ? (
				<div className="panel p-8 bg-success/5 border-success/30 flex flex-col gap-6">
					<div className="flex items-center gap-4">
						<div className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
							<CheckCircle2 className="size-6" />
						</div>
						<div>
							<h3 className="text-lg font-semibold text-foreground">
								User Account Created Successfully!
							</h3>
							<p className="text-sm text-muted-foreground">
								The user has been provisioned and assigned to your organization.
							</p>
						</div>
					</div>

					<div className="grid gap-4 rounded-lg border bg-card p-5">
						<div className="flex items-center justify-between border-b pb-3">
							<span className="text-sm text-muted-foreground flex items-center gap-2">
								<User className="size-4" /> Full Name
							</span>
							<span className="font-medium text-foreground">{createdResult.name}</span>
						</div>
						<div className="flex items-center justify-between border-b pb-3">
							<span className="text-sm text-muted-foreground flex items-center gap-2">
								<Mail className="size-4" /> Email / Identifier
							</span>
							<span className="font-medium text-foreground">{createdResult.email}</span>
						</div>
						<div className="flex items-center justify-between border-b pb-3">
							<span className="text-sm text-muted-foreground flex items-center gap-2">
								<ShieldCheck className="size-4" /> Organization Role
							</span>
							<span className="font-medium text-foreground">{createdResult.role}</span>
						</div>
						<div className="flex items-center justify-between border-b pb-3">
							<span className="text-sm text-muted-foreground flex items-center gap-2">
								<KeyRound className="size-4" /> Initial Password
							</span>
							<div className="flex items-center gap-2">
								<code className="rounded bg-muted px-2 py-0.5 text-sm font-mono">
									{createdResult.password}
								</code>
								<Button
									variant="ghost"
									size="icon-sm"
									onClick={() => {
										if (createdResult.password) {
											navigator.clipboard.writeText(createdResult.password);
											toast.success("Password copied to clipboard!");
										}
									}}
								>
									<Copy className="size-3.5" />
								</Button>
							</div>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">Verification OTP</span>
							<code className="rounded bg-primary/10 text-primary px-2 py-0.5 text-sm font-semibold">
								123456
							</code>
						</div>
					</div>

					<div className="flex flex-wrap gap-3 pt-2">
						<Button onClick={handleReset}>
							<UserPlus className="size-4 mr-2" />
							Create Another User
						</Button>
						<Button variant="outline" onClick={() => navigate("/organization/members")}>
							<Users className="size-4 mr-2" />
							View All Team Members
						</Button>
					</div>
				</div>
			) : (
				<form onSubmit={handleSubmit} className="panel p-7 flex flex-col gap-6">
					<h2 className="text-lg font-semibold border-b pb-4">New User Credentials & Details</h2>

					<FieldGroup className="grid gap-5 md:grid-cols-2">
						<Field className="md:col-span-1">
							<FieldLabel htmlFor="user-fullname">Full Name</FieldLabel>
							<Input
								id="user-fullname"
								placeholder="e.g. Alex Morgan"
								value={fullName}
								onChange={(e) => setFullName(e.target.value)}
								required
							/>
						</Field>

						<Field className="md:col-span-1">
							<FieldLabel htmlFor="user-email">Email Address</FieldLabel>
							<Input
								id="user-email"
								type="email"
								placeholder="e.g. alex.morgan@company.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</Field>

						<Field className="md:col-span-1">
							<FieldLabel htmlFor="user-username">Username (Optional)</FieldLabel>
							<Input
								id="user-username"
								placeholder="e.g. alexm"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
							/>
						</Field>

						<Field className="md:col-span-1">
							<FieldLabel htmlFor="user-password">Initial Password</FieldLabel>
							<Input
								id="user-password"
								type="text"
								placeholder="Min 8 characters (e.g. UserPass123!)"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								minLength={8}
							/>
						</Field>

						<Field className="md:col-span-2">
							<FieldLabel htmlFor="user-role">Organization Role</FieldLabel>
							<select
								id="user-role"
								className="native-select w-full"
								value={userRole}
								onChange={(e) => setUserRole(e.target.value as "member" | "org_admin")}
							>
								<option value="member">Member (Can manage datasets & file uploads)</option>
								<option value="org_admin">Organization Admin (Can manage users & settings)</option>
							</select>
						</Field>
					</FieldGroup>

					<div className="flex items-center justify-end gap-3 border-t pt-5">
						<Button
							type="button"
							variant="outline"
							onClick={() => navigate("/organization/members")}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							<UserPlus className="size-4 mr-2" />
							{isSubmitting ? "Provisioning..." : "Create User"}
						</Button>
					</div>
				</form>
			)}
		</div>
	);
}
