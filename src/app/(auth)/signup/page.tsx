import { AuthPage } from "@/features/auth/components/AuthPage";
export const metadata = { title: "Create an account — Ingest" };
export default function Page() {
	return <AuthPage mode="signup" />;
}
