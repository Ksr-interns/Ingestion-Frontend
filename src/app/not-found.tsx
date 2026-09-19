import Link from "next/link";
import { Brand } from "@/components/PlatformUi";
export default function NotFound() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-5 p-8 text-center">
			<Brand />
			<p className="mt-5 text-sm text-muted-foreground">404 · PAGE NOT FOUND</p>
			<h1 className="text-3xl font-semibold tracking-tight">
				This file took a different path.
			</h1>
			<p className="text-muted-foreground">
				The page you’re looking for doesn’t exist or has moved.
			</p>
			<Link href="/" className="text-link">
				Return to your workspace
			</Link>
		</main>
	);
}
