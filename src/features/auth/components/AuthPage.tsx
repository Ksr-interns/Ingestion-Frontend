import { useState } from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Brand, SourceIcon } from "@/components/PlatformUi";
import { authService } from "@/features/auth/services/auth.service";
import { getApiBaseUrl } from "@/services/api-client";

export type AuthMode = "login" | "signup" | "verify" | "forgot-password";
export function AuthPage({ mode: initialMode = "login" }: { mode?: AuthMode } = {}) {
	const [mode, setMode] = useState<AuthMode>(initialMode);
	const [email, setEmail] = useState("");
	const [passwordVisible, setPasswordVisible] = useState(false);
	const [error, setError] = useState("");
	const [pending, setPending] = useState(false);
	const [resetStep, setResetStep] = useState(false);
	const [resetToken, setResetToken] = useState("");
	const [success, setSuccess] = useState("");
	const title =
		mode === "login"
			? "Welcome back."
			: mode === "signup"
				? "Make room for better data."
				: mode === "verify"
					? "Check your inbox."
					: resetStep
						? "Choose a new password."
						: "Let’s get you back in.";
	const description =
		mode === "login"
			? "Sign in to your connected data workspace."
			: mode === "signup"
				? "Create an account and bring your files together."
				: mode === "verify"
					? "Enter the 6-digit verification code sent to your email."
					: resetStep
						? "Use your reset token to securely update your password."
						: "Enter your email to request a password reset.";
	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		setError("");
		setPending(true);
		try {
			if (mode === "login") {
				const result = await authService.login(
					String(data.get("identifier")),
					String(data.get("password")),
				);
				setSuccess(
					`You’re authenticated as ${result.user.email}.`,
				);
			} else if (mode === "signup") {
				await authService.signup(
					email,
					String(data.get("full_name")),
					String(data.get("password")),
				);
				setMode("verify");
			} else if (mode === "verify") {
				const result = await authService.verify(
					email,
					String(data.get("otp_code")),
				);
				setSuccess(
					`Your email ${result.user.email} has been verified by your backend.`,
				);
			} else if (!resetStep) {
				const challenge = await authService.requestReset(email);
				setResetToken(challenge.reset_token);
				setResetStep(true);
			} else {
				if (data.get("new_password") !== data.get("confirm_password"))
					throw new Error("The passwords do not match.");
				await authService.resetPassword(
					email,
					String(data.get("reset_token")),
					String(data.get("new_password")),
				);
				setSuccess(
					"Your password has been updated. You can now sign in with your new password.",
				);
			}
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Something went wrong. Please try again.",
			);
		} finally {
			setPending(false);
		}
	}
	function oauth(provider: "google" | "microsoft") {
		const base = getApiBaseUrl();
		if (!base) {
			setError(
				"Configure your backend in Settings → API connection to enable single sign-on.",
			);
			return;
		}
		window.location.assign(`${base}/auth/${provider}`);
	}
	return (
		<main className="grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
			<section className="hidden flex-col justify-between bg-primary px-12 py-10 text-primary-foreground lg:flex">
				<Link to="/" className="text-primary-foreground">
					<span className="flex items-center gap-2.5">
						<span className="flex size-8 items-center justify-center rounded-lg bg-primary-foreground/15">
							<Database className="size-5" />
						</span>
						<span className="text-2xl font-semibold tracking-tight">
							ingest.
						</span>
					</span>
				</Link>
				<div className="max-w-md self-center py-14">
					<p className="mb-5 text-sm font-medium tracking-widest text-primary-foreground/65">
						LESS FRICTION. MORE FLOW.
					</p>
					<h1 className="text-balance text-5xl font-medium leading-[1.15] tracking-[-2px]">
						Every file.
						<br />
						Every source.
						<br />
						One workspace.
					</h1>
					<p className="mt-6 max-w-sm text-base leading-7 text-primary-foreground/75">
						Give your team a simpler way to bring data together. Organized,
						connected, and ready for what comes next.
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
					<span>© 2026 Ingest</span>
					<span className="flex items-center gap-2">
						<ShieldCheck className="size-4" />
						Built for your team
					</span>
				</div>
			</section>
			<section className="flex flex-col px-6 py-8 sm:px-12">
				<div className="flex items-center justify-between">
					<Link to="/" className="lg:invisible">
						<Brand />
					</Link>
					<Link
						to="/"
						className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
					>
						Go to workspace <ArrowRight className="size-4" />
					</Link>
				</div>
				<div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
					{success ? (
						<div className="flex flex-col gap-5">
							<CircleCheck className="size-10 text-success" />
							<h2 className="text-2xl font-semibold">You’re all set.</h2>
							<p className="leading-6 text-muted-foreground">{success}</p>
							<Link
								className="text-link"
								to={mode === "forgot-password" ? "/login" : "/"}
							>
								{mode === "forgot-password"
									? "Back to sign in"
									: "Go to workspace"}
								<ArrowRight className="size-4" />
							</Link>
						</div>
					) : (
						<>
							<h2 className="text-balance text-3xl font-semibold tracking-tight">
								{title}
							</h2>
							<p className="mb-8 mt-3 leading-6 text-muted-foreground">
								{description}
							</p>
							{(mode === "login" || mode === "signup") && (
								<>
									<div className="flex flex-col gap-3">
										<Button
											variant="outline"
											size="lg"
											onClick={() => oauth("google")}
										>
											<SourceIcon source="GDrive" />
											Continue with Google
										</Button>
										<Button
											variant="outline"
											size="lg"
											onClick={() => oauth("microsoft")}
										>
											<SourceIcon source="Sharepoint" />
											Continue with Microsoft
										</Button>
									</div>
									<div className="my-6 flex items-center gap-4">
										<div className="flex-1 border-t" />
										<span className="text-sm text-muted-foreground">
											or continue with email
										</span>
										<div className="flex-1 border-t" />
									</div>
								</>
							)}
							<form onSubmit={submit} className="flex flex-col gap-5">
								<FieldGroup>
									{mode === "signup" && (
										<Field>
											<FieldLabel htmlFor="auth-full-name">
												Full name
											</FieldLabel>
											<Input
												id="auth-full-name"
												name="full_name"
												placeholder="Your full name"
												autoComplete="name"
												required
												maxLength={255}
											/>
										</Field>
									)}
									{mode === "login" ? (
										<Field>
											<FieldLabel htmlFor="auth-identifier">
												Email or username
											</FieldLabel>
											<Input
												id="auth-identifier"
												name="identifier"
												placeholder="you@company.com"
												autoComplete="username"
												minLength={3}
												required
											/>
										</Field>
									) : (
										<Field>
											<FieldLabel htmlFor="auth-email">
												Email address
											</FieldLabel>
											<Input
												id="auth-email"
												type="email"
												name="email"
												placeholder="you@company.com"
												autoComplete="email"
												value={email}
												onChange={(event) => setEmail(event.target.value)}
												required
											/>
										</Field>
									)}
									{(mode === "login" || mode === "signup") && (
										<Field>
											<div className="flex items-center justify-between">
												<FieldLabel htmlFor="auth-password">
													Password
												</FieldLabel>
												{mode === "login" && (
													<Link
														to="/forgot-password"
														className="text-sm text-primary hover:underline"
													>
														Forgot password?
													</Link>
												)}
											</div>
											<div className="relative">
												<Input
													id="auth-password"
													name="password"
													type={passwordVisible ? "text" : "password"}
													className="pr-10"
													placeholder={
														mode === "signup"
															? "At least 8 characters"
															: "Enter your password"
													}
													autoComplete={
														mode === "signup"
															? "new-password"
															: "current-password"
													}
													minLength={8}
													maxLength={128}
													required
												/>
												<button
													type="button"
													className="absolute right-3 top-2 text-muted-foreground"
													aria-label={
														passwordVisible ? "Hide password" : "Show password"
													}
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
											<FieldLabel htmlFor="auth-otp">
												Verification code
											</FieldLabel>
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
										</Field>
									)}
									{mode === "forgot-password" && resetStep && (
										<>
											<Field>
												<FieldLabel htmlFor="auth-reset-token">
													Reset token
												</FieldLabel>
												<Input
													id="auth-reset-token"
													name="reset_token"
													type="password"
													defaultValue={resetToken}
													autoComplete="off"
													minLength={16}
													maxLength={255}
													placeholder="Your reset token"
													required
												/>
											</Field>
											<Field>
												<FieldLabel htmlFor="auth-new-password">
													New password
												</FieldLabel>
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
												<FieldLabel htmlFor="auth-confirm-password">
													Confirm new password
												</FieldLabel>
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
										className="rounded-lg border bg-muted p-3 text-sm leading-6"
									>
										{error}
										<Link
											to="/settings"
											className="mt-2 block font-medium text-primary"
										>
											Open API settings
										</Link>
									</div>
								)}
								<Button type="submit" size="lg" disabled={pending}>
									{pending ? (
										<>
											<Loader2 className="animate-spin" />
											Please wait
										</>
									) : (
										<>
											{mode === "login"
												? "Sign in"
												: mode === "signup"
													? "Create account"
													: mode === "verify"
														? "Verify email"
														: resetStep
															? "Reset password"
															: "Send reset request"}
											<ArrowRight data-icon="inline-end" />
										</>
									)}
								</Button>
							</form>
							{mode === "login" && (
								<button
									className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary"
									onClick={() =>
										toast.info(
											"Enterprise SSO requires your organization’s Auth0 configuration in the backend.",
										)
									}
								>
									<Building2 className="size-4" />
									Sign in with enterprise SSO
								</button>
							)}
							<p className="mt-7 text-center text-sm text-muted-foreground">
								{mode === "login" ? (
									<>
										New to Ingest?{" "}
										<Link to="/signup" className="font-medium text-primary">
											Create an account
										</Link>
									</>
								) : mode === "signup" ? (
									<>
										Already have an account?{" "}
										<Link to="/login" className="font-medium text-primary">
											Sign in
										</Link>
									</>
								) : (
									<Link
										to="/login"
										className="inline-flex items-center gap-2 hover:text-primary"
									>
										<ArrowLeft className="size-4" />
										Back to sign in
									</Link>
								)}
							</p>
						</>
					)}
				</div>
				<p className="text-center text-sm text-muted-foreground">
					Your data, connected.
				</p>
			</section>
		</main>
	);
}
