import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
	ArrowRight,
	ArrowLeft,
	Database,
	FileText,
	Cloud,
	Server,
	ShieldCheck,
	Eye,
	EyeOff,
	Loader2,
	CircleCheck,
	Building2,
	ShieldAlert,
	CheckCircle2,
	KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Brand, SourceIcon } from "@/components/PlatformUi";
import { useAuth } from "@/contexts/AuthContext";
import { getApiBaseUrl } from "@/services/api-client";

export type AuthMode = "login" | "superadmin" | "verify" | "forgot-password";

export function AuthPage({ mode: initialMode = "login" }: { mode?: AuthMode } = {}) {
	const navigate = useNavigate();
	const auth = useAuth();
	const [mode, setMode] = useState<AuthMode>(initialMode === "superadmin" ? "superadmin" : "login");
	const [email, setEmail] = useState("");
	const [passwordVisible, setPasswordVisible] = useState(false);
	const [error, setError] = useState("");
	const [pending, setPending] = useState(false);
	const [resetStep, setResetStep] = useState(false);
	const [resetToken, setResetToken] = useState("");
	const [success, setSuccess] = useState("");

	const isSuperAdminMode = mode === "superadmin";

	const title =
		mode === "login"
			? "Organization Sign In"
			: mode === "superadmin"
				? "Super Admin Portal"
				: mode === "verify"
					? "Verify Account OTP"
					: resetStep
						? "Choose a New Password"
						: "Reset Password";

	const description =
		mode === "login"
			? "Sign in to your organization workspace. Accounts are provisioned by your Organization Admin."
			: mode === "superadmin"
				? "Restricted system administration portal. Sign in to provision organizations and organization admins."
				: mode === "verify"
					? "Enter the 6-digit verification code sent to your email by your administrator."
					: resetStep
						? "Use your reset token to securely update your password."
						: "Enter your email to request a password reset.";

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		setError("");
		setPending(true);

		try {
			if (mode === "login" || mode === "superadmin") {
				const identifier = String(data.get("identifier") || "").trim();
				const password = String(data.get("password") || "");

				if (!identifier || !password) {
					throw new Error("Please enter both email/username and password.");
				}

				await auth.login(identifier, password);
				toast.success(`Welcome back! Logged in successfully.`);

				if (isSuperAdminMode) {
					navigate("/admin/organizations", { replace: true });
				} else {
					navigate("/datasets", { replace: true });
				}
			} else if (mode === "verify") {
				const submittedEmail = String(data.get("email") || email || "").trim();
				const otpCode = String(data.get("otp_code") || "").trim();
				if (!submittedEmail || !otpCode) {
					throw new Error("Please enter both your email address and 6-digit OTP code.");
				}
				await auth.verifyOtp(submittedEmail, otpCode);
				toast.success("Account verified successfully!");
				navigate("/datasets", { replace: true });
			} else if (!resetStep) {
				const submittedEmail = String(data.get("email") || email || "").trim();
				if (!submittedEmail) {
					throw new Error("Please enter your email address.");
				}
				const challenge = await auth.requestPasswordReset(submittedEmail);
				setResetToken(challenge.reset_token);
				setResetStep(true);
				toast.info("Password reset request sent. Check backend terminal for OTP/token.");
			} else {
				const submittedEmail = String(data.get("email") || email || "").trim();
				if (data.get("new_password") !== data.get("confirm_password")) {
					throw new Error("The passwords do not match.");
				}
				await auth.confirmPasswordReset(
					submittedEmail,
					String(data.get("reset_token")),
					String(data.get("new_password")),
				);
				setSuccess("Your password has been updated. You can now sign in with your new password.");
			}
		} catch (err: any) {
			setError(
				err instanceof Error
					? err.message
					: err?.message || "Authentication failed. Please check your credentials.",
			);
		} finally {
			setPending(false);
		}
	}

	function handleOAuth(provider: "google" | "microsoft") {
		if (provider === "google") auth.loginWithGoogle();
		else if (provider === "microsoft") auth.loginWithMicrosoft();
	}

	return (
		<main className="grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
			{/* Left Decorative Banner */}
			<section className="hidden flex-col justify-between bg-primary px-12 py-10 text-primary-foreground lg:flex">
				<Link to="/" className="text-primary-foreground">
					<span className="flex items-center gap-2.5">
						<span className="flex size-8 items-center justify-center rounded-lg bg-primary-foreground/15">
							<Database className="size-5" />
						</span>
						<span className="text-2xl font-semibold tracking-tight">ingest.</span>
					</span>
				</Link>
				<div className="max-w-md self-center py-14">
					<p className="mb-5 text-sm font-medium tracking-widest text-primary-foreground/65">
						ENTERPRISE INGESTION PLATFORM
					</p>
					<h1 className="text-balance text-4xl font-semibold leading-[1.2] tracking-tight">
						Multi-tenant Ingestion Workspace
					</h1>
					<p className="mt-6 max-w-sm text-base leading-7 text-primary-foreground/75">
						Provisioned organization architecture. Super admins create organization admins, org admins manage team members, and users manage datasets & cloud ingestion.
					</p>
					<div className="mt-10 flex items-center gap-3">
						{[FileText, Cloud, Server].map((Icon, index) => (
							<div
								key={index}
								className="flex size-14 items-center justify-center rounded-xl border border-primary-foreground/20 bg-primary-foreground/10"
							>
								<Icon className="size-6" strokeWidth={1.5} />
							</div>
						))}
						<ArrowRight className="mx-1 size-5 text-primary-foreground/55" />
						<div className="flex size-14 items-center justify-center rounded-xl bg-primary-foreground text-primary">
							<Database className="size-6" />
						</div>
					</div>
				</div>
				<div className="flex items-center justify-between text-sm text-primary-foreground/65">
					<span>© 2026 Ingest Platform</span>
					<span className="flex items-center gap-2">
						<ShieldCheck className="size-4" /> Secure Enterprise Access
					</span>
				</div>
			</section>

			{/* Right Auth Form */}
			<section className="flex flex-col px-6 py-8 sm:px-12 bg-background">
				<div className="flex items-center justify-between">
					<Link to="/" className="lg:invisible">
						<Brand />
					</Link>
					
					{/* Dedicated Super Admin Login Switcher */}
					{mode === "login" && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setMode("superadmin");
								setError("");
							}}
							className="border-primary/30 text-primary hover:bg-primary/5 font-medium"
						>
							<ShieldAlert className="size-4 mr-1.5 text-primary" />
							Super Admin Sign In
						</Button>
					)}
					{mode === "superadmin" && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setMode("login");
								setError("");
							}}
							className="border-border text-foreground hover:bg-muted font-medium"
						>
							<Building2 className="size-4 mr-1.5 text-primary" />
							Organization Sign In
						</Button>
					)}
				</div>

				<div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
					{success ? (
						<div className="flex flex-col gap-5">
							<CircleCheck className="size-10 text-success" />
							<h2 className="text-2xl font-semibold">Verification Complete</h2>
							<p className="leading-6 text-muted-foreground">{success}</p>
							<Button onClick={() => setMode("login")}>
								Sign In to Workspace <ArrowRight className="size-4 ml-1" />
							</Button>
						</div>
					) : (
						<>
							{/* Header Badge & Title */}
							<div className="flex flex-col gap-2">
								{isSuperAdminMode ? (
									<span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 w-max border border-amber-500/20">
										<ShieldAlert className="size-3.5" /> Super Admin Access Only
									</span>
								) : (
									<span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary w-max border border-primary/20">
										<Building2 className="size-3.5" /> Organization Member Access
									</span>
								)}

								<h2 className="text-balance text-3xl font-semibold tracking-tight mt-1">
									{title}
								</h2>
								<p className="mb-6 mt-1 text-sm leading-6 text-muted-foreground">
									{description}
								</p>
							</div>

							{/* OAuth Buttons for regular Org users */}
							{mode === "login" && (
								<>
									<div className="flex flex-col gap-3">
										<Button
											variant="outline"
											size="lg"
											type="button"
											onClick={() => handleOAuth("google")}
										>
											<SourceIcon source="GDrive" />
											Continue with Google SSO
										</Button>
										<Button
											variant="outline"
											size="lg"
											type="button"
											onClick={() => handleOAuth("microsoft")}
										>
											<SourceIcon source="Sharepoint" />
											Continue with Microsoft SSO
										</Button>
									</div>
									<div className="my-6 flex items-center gap-4">
										<div className="flex-1 border-t" />
										<span className="text-xs font-semibold uppercase text-muted-foreground">
											or sign in with credentials
										</span>
										<div className="flex-1 border-t" />
									</div>
								</>
							)}

							{/* Super Admin Notice */}
							{mode === "superadmin" && (
								<div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-xs leading-5 text-amber-900 dark:text-amber-200">
									<p className="font-semibold flex items-center gap-1.5">
										<KeyRound className="size-4 text-amber-600" />
										No Public Signup Available
									</p>
									<p className="mt-1">
										Super Admin credentials are pre-configured in your system environment (`superadmin@example.com`).
									</p>
								</div>
							)}

							<form onSubmit={handleSubmit} className="flex flex-col gap-5">
								<FieldGroup>
									{(mode === "login" || mode === "superadmin") ? (
										<Field>
											<FieldLabel htmlFor="auth-identifier">
												{isSuperAdminMode ? "Super Admin Email or Username" : "Email address or Username"}
											</FieldLabel>
											<Input
												id="auth-identifier"
												name="identifier"
												placeholder={isSuperAdminMode ? "superadmin@example.com" : "you@organization.com"}
												autoComplete="username"
												minLength={3}
												required
											/>
										</Field>
									) : (
										<Field>
											<FieldLabel htmlFor="auth-email">Email Address</FieldLabel>
											<Input
												id="auth-email"
												type="email"
												name="email"
												placeholder="you@organization.com"
												autoComplete="email"
												value={email}
												onChange={(event) => setEmail(event.target.value)}
												required
											/>
										</Field>
									)}

									{(mode === "login" || mode === "superadmin") && (
										<Field>
											<div className="flex items-center justify-between">
												<FieldLabel htmlFor="auth-password">Password</FieldLabel>
												{mode === "login" && (
													<button
														type="button"
														onClick={() => setMode("forgot-password")}
														className="text-xs text-primary hover:underline font-medium"
													>
														Forgot password?
													</button>
												)}
											</div>
											<div className="relative">
												<Input
													id="auth-password"
													name="password"
													type={passwordVisible ? "text" : "password"}
													className="pr-10"
													placeholder="Enter your password"
													autoComplete="current-password"
													minLength={6}
													maxLength={128}
													required
												/>
												<button
													type="button"
													className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
													aria-label={passwordVisible ? "Hide password" : "Show password"}
													onClick={() => setPasswordVisible(!passwordVisible)}
												>
													{passwordVisible ? (
														<EyeOff className="size-4" />
													) : (
														<Eye className="size-4" />
													)}
												</button>
											</div>
										</Field>
									)}

									{mode === "verify" && (
										<Field>
											<FieldLabel htmlFor="auth-otp">6-Digit Verification Code</FieldLabel>
											<Input
												id="auth-otp"
												name="otp_code"
												inputMode="numeric"
												autoComplete="one-time-code"
												pattern="[0-9]{6}"
												minLength={6}
												maxLength={6}
												placeholder="000000"
												className="h-12 text-center text-xl tracking-[0.5em]"
												required
											/>
											<FieldDescription className="mt-1">
												Enter the code sent to your email to verify your provisioned account.
											</FieldDescription>
										</Field>
									)}

									{mode === "forgot-password" && resetStep && (
										<>
											<Field>
												<FieldLabel htmlFor="auth-reset-token">Reset Token / OTP</FieldLabel>
												<Input
													id="auth-reset-token"
													name="reset_token"
													type="text"
													defaultValue={resetToken}
													autoComplete="off"
													placeholder="Your reset token"
													required
												/>
											</Field>
											<Field>
												<FieldLabel htmlFor="auth-new-password">New Password</FieldLabel>
												<Input
													id="auth-new-password"
													name="new_password"
													type="password"
													autoComplete="new-password"
													minLength={8}
													maxLength={128}
													required
												/>
											</Field>
											<Field>
												<FieldLabel htmlFor="auth-confirm-password">Confirm New Password</FieldLabel>
												<Input
													id="auth-confirm-password"
													name="confirm_password"
													type="password"
													autoComplete="new-password"
													minLength={8}
													maxLength={128}
													required
												/>
											</Field>
										</>
									)}
								</FieldGroup>

								{error && (
									<div
										role="alert"
										className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs leading-5 text-destructive"
									>
										{error}
									</div>
								)}

								<Button type="submit" size="lg" disabled={pending} className="w-full">
									{pending ? (
										<>
											<Loader2 className="animate-spin mr-2 size-4" />
											Signing in...
										</>
									) : (
										<>
											{isSuperAdminMode
												? "Sign In as Super Admin"
												: mode === "login"
													? "Sign In"
													: mode === "verify"
														? "Verify Account"
														: resetStep
															? "Reset Password"
															: "Send Password Reset Code"}
											<ArrowRight className="ml-2 size-4" />
										</>
									)}
								</Button>
							</form>

							{/* Verification Shortcut for newly provisioned members */}
							{mode === "login" && (
								<div className="mt-5 border-t pt-4 text-center">
									<p className="text-xs text-muted-foreground">
										Have a 6-digit OTP verification code?{" "}
										<button
											type="button"
											onClick={() => setMode("verify")}
											className="font-semibold text-primary hover:underline"
										>
											Verify your account
										</button>
									</p>
								</div>
							)}

							{mode !== "login" && (
								<p className="mt-6 text-center text-sm text-muted-foreground">
									<button
										type="button"
										onClick={() => setMode("login")}
										className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
									>
										<ArrowLeft className="size-4" />
										Back to Organization Sign In
									</button>
								</p>
							)}
						</>
					)}
				</div>

				<div className="mt-auto border-t pt-4 text-center text-xs text-muted-foreground">
					Multi-Tenant Organization Management Platform
				</div>
			</section>
		</main>
	);
}
