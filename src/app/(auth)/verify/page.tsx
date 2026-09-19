import { AuthPage } from "@/features/auth/components/AuthPage";
export const metadata = { title: "Verify your email — Ingest" };
export default function Page() {
	return <AuthPage mode="verify" />;
}
