import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Database, Plus } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useWorkspace } from "@/hooks/useWorkspace";
import type { Dataset } from "@/types/platform";

import { datasetsService } from "@/features/datasets/services/datasets.service";

export function DatasetDialog({
	dataset,
	open,
	onOpenChange,
}: {
	dataset?: Dataset;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { datasets, setDatasets } = useWorkspace();
	const [name, setName] = useState(dataset?.name || "");
	const [description, setDescription] = useState(dataset?.description || "");
	const [language, setLanguage] = useState(dataset?.language || "English");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (open) {
			setName(dataset?.name || "");
			setDescription(dataset?.description || "");
			setLanguage(dataset?.language || "English");
			setError("");
		}
	}, [open, dataset]);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		if (!name.trim()) {
			setError("Dataset name is required.");
			return;
		}
		if (
			datasets.some(
				(item) =>
					item.name.toLowerCase() === name.trim().toLowerCase() &&
					item.id !== dataset?.id,
			)
		) {
			setError("A dataset with this name already exists in this workspace.");
			return;
		}

		try {
			setLoading(true);
			setError("");
			if (dataset) {
				await datasetsService.update(dataset.id, {
					name: name.trim(),
					description: description.trim(),
					language,
				});
				toast.success("Dataset updated successfully");
			} else {
				await datasetsService.create({
					name: name.trim(),
					description: description.trim(),
					language,
				});
				toast.success("Dataset created successfully");
			}
			await setDatasets();
			onOpenChange(false);
		} catch (err: any) {
			setError(err?.message || "Failed to save dataset");
		} finally {
			setLoading(false);
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(value: boolean) => {
				onOpenChange(value);
				setError("");
			}}
		>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<span className="icon-tile mb-2">
						<Database className="size-5 text-primary" />
					</span>
					<DialogTitle>
						{dataset ? "Edit dataset" : "Create a dataset"}
					</DialogTitle>
					<DialogDescription>
						Give your files a home. You can add files from any source later.
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={submit}
					key={dataset?.id ?? "create"}
					className="flex flex-col gap-6 pt-2"
				>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="dataset-name">
								Dataset name <span className="text-muted-foreground">*</span>
							</FieldLabel>
							<Input
								id="dataset-name"
								name="name"
								placeholder="e.g. Q3 Financial Reports"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								maxLength={255}
								aria-invalid={!!error}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="dataset-description">
								Description{" "}
								<span className="font-normal text-muted-foreground">
									(optional)
								</span>
							</FieldLabel>
							<Textarea
								id="dataset-description"
								name="description"
								placeholder="What will this dataset contain?"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								maxLength={500}
								rows={3}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="dataset-language">Language</FieldLabel>
							<select
								id="dataset-language"
								name="language"
								className="native-select"
								value={language}
								onChange={(e) => setLanguage(e.target.value)}
							>
								{[
									"English",
									"Spanish",
									"French",
									"German",
									"Japanese",
									"Chinese",
									"Portuguese",
									"Hindi",
								].map((language) => (
									<option key={language}>{language}</option>
								))}
							</select>
						</Field>
					</FieldGroup>
					{error && (
						<p role="alert" className="text-sm">
							{error}
						</p>
					)}
					<div className="flex justify-end gap-2 border-t pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={loading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={loading}>
							<Plus data-icon="inline-start" />
							{loading
								? "Saving..."
								: dataset
									? "Save changes"
									: "Create dataset"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
