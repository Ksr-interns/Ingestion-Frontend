import { OrganizationsPage } from "@/features/admin/components/OrganizationsPage";
export const metadata = { title: "Organization details — Ingest" };
export default async function Page({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return <OrganizationsPage id={id} />;
}
