import { AuthPage } from "@/features/auth/components/AuthPage";
export const metadata = { title: "Reset your password — Ingest" };
export default function Page() {
	return <AuthPage mode="forgot-password" />;
}
