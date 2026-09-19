"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
			<h1 className="text-2xl font-semibold">
				Something interrupted your workspace
			</h1>
			<p className="max-w-md text-muted-foreground">
				Please try again. If this keeps happening, return to the overview.
			</p>
			<Button onClick={reset}>Try again</Button>
			<a href="/" className="text-link">
				Back to overview
			</a>
		</main>
	);
}
