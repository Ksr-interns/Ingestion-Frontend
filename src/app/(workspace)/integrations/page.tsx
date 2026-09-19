import { Suspense } from "react";
import { IntegrationsPage } from "@/features/integrations/components/IntegrationsPage";
export const metadata = { title: "Integrations — Ingest" };
export default function Page() {
	return (
		<Suspense
			fallback={
				<p role="status" className="text-muted-foreground">
					Loading integrations…
				</p>
			}
		>
			<IntegrationsPage />
		</Suspense>
	);
}
