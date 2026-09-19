import { AuthPage } from "@/features/auth/components/AuthPage";
export const metadata = { title: "Sign in — Ingest" };
export default function Page() {
	return <AuthPage mode="login" />;
}
