import { useState, useRef } from "react";
import {
	UploadCloud,
	FileText,
	X,
	ArrowRight,
	Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SourceIcon } from "@/components/PlatformUi";
import { useWorkspace } from "@/hooks/useWorkspace";
import { formatBytes } from "@/utils/format";
import { uploadFile, ingestionService } from "@/features/ingestion/services/ingestion.service";

export function UploadDialog({
	open,
	onOpenChange,
	datasetId,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	datasetId?: string;
}) {
	const { datasets, setDatasets, setJobs } = useWorkspace();
	const [files, setFiles] = useState<File[]>([]);
	const [dragging, setDragging] = useState(false);
	const [selectedDataset, setSelectedDataset] = useState(datasetId ?? "");
	const [driveUrl, setDriveUrl] = useState("");
	const [sharepointUrl, setSharepointUrl] = useState("");
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const [tab, setTab] = useState("local");

	const activeDatasetId = datasetId || selectedDataset;

	function addFiles(incoming: FileList | File[] | null) {
		if (!incoming) return;
		const valid = Array.from(incoming).filter(
			(file) => file.size > 0 && file.size <= 100 * 1024 * 1024,
		);
		if (valid.length !== incoming.length)
			toast.error("Choose non-empty files up to 100 MB.");
		setFiles((current) => [
			...current,
			...valid.filter(
				(file) =>
					!current.some(
						(item) => item.name === file.name && item.size === file.size,
					),
			),
		]);
	}

	async function handleUpload() {
		if (!activeDatasetId) {
			toast.error("Please select a target dataset.");
			return;
		}

		setIsUploading(true);
		setUploadProgress(0);

		try {
			if (tab === "local") {
				if (files.length === 0) return;
				for (let i = 0; i < files.length; i++) {
					const file = files[i];
					await uploadFile(file, activeDatasetId, (progress) => {
						const overall = Math.round(((i + progress / 100) / files.length) * 100);
						setUploadProgress(overall);
					});
				}
				toast.success(`Uploaded ${files.length} file${files.length === 1 ? "" : "s"} successfully`);
				setFiles([]);
			} else if (tab === "drive") {
				if (!driveUrl.trim()) {
					toast.error("Please enter a valid Google Drive URL.");
					setIsUploading(false);
					return;
				}
				await ingestionService.googleUrl(activeDatasetId, driveUrl.trim());
				toast.success("Google Drive ingestion queued successfully");
				setDriveUrl("");
			} else if (tab === "sharepoint") {
				if (!sharepointUrl.trim()) {
					toast.error("Please enter a valid SharePoint URL.");
					setIsUploading(false);
					return;
				}
				await ingestionService.sharepointUrl(activeDatasetId, sharepointUrl.trim());
				toast.success("SharePoint ingestion queued successfully");
				setSharepointUrl("");
			}

			await Promise.all([setDatasets(), setJobs()]);
			onOpenChange(false);
		} catch (err: any) {
			toast.error(err?.message || "Upload failed. Please check your backend connection.");
		} finally {
			setIsUploading(false);
			setUploadProgress(0);
		}
	}

	return (
		<Dialog open={open} onOpenChange={(val) => !isUploading && onOpenChange(val)}>
			<DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Bring your files together</DialogTitle>
					<DialogDescription>
						Add files to a dataset from your device or a connected source.
					</DialogDescription>
				</DialogHeader>
				<Field>
					<FieldLabel htmlFor="upload-dataset">Destination dataset</FieldLabel>
					<select
						id="upload-dataset"
						className="native-select"
						value={activeDatasetId}
						onChange={(event) => setSelectedDataset(event.target.value)}
						disabled={isUploading}
					>
						<option value="">Select a dataset</option>
						{datasets.map((dataset) => (
							<option key={dataset.id} value={dataset.id}>
								{dataset.name}
							</option>
						))}
					</select>
				</Field>
				<Tabs value={tab} onValueChange={(value: string | number | null) => setTab(String(value))}>
					<TabsList className="w-full">
						<TabsTrigger value="local" disabled={isUploading}>
							<SourceIcon source="Local" />
							Local
						</TabsTrigger>
						<TabsTrigger value="drive" disabled={isUploading}>
							<SourceIcon source="GDrive" />
							Drive
						</TabsTrigger>
						<TabsTrigger value="sharepoint" disabled={isUploading}>
							<SourceIcon source="Sharepoint" />
							SharePoint
						</TabsTrigger>
						<TabsTrigger value="ftp" disabled={isUploading}>
							<SourceIcon source="FTP" />
							FTP
						</TabsTrigger>
					</TabsList>
					<TabsContent value="local">
						<div
							onDragOver={(event) => {
								event.preventDefault();
								if (!isUploading) setDragging(true);
							}}
							onDragLeave={() => setDragging(false)}
							onDrop={(event) => {
								event.preventDefault();
								setDragging(false);
								if (!isUploading) addFiles(event.dataTransfer.files);
							}}
							className={`mt-3 flex flex-col items-center rounded-xl border-2 border-dashed px-5 py-10 text-center ${dragging ? "border-primary bg-accent" : "border-border bg-muted/30"}`}
						>
							<span className="icon-tile size-12">
								<UploadCloud className="size-6 text-primary" />
							</span>
							<p className="mt-4 font-medium">Drag and drop your files here</p>
							<p className="mt-1 text-sm text-muted-foreground">
								PDF, documents, spreadsheets, images, and more
							</p>
							<Button
								type="button"
								variant="outline"
								className="mt-4"
								disabled={isUploading}
								onClick={() => inputRef.current?.click()}
							>
								Browse files
							</Button>
							<input
								ref={inputRef}
								type="file"
								multiple
								disabled={isUploading}
								className="sr-only"
								aria-label="Choose files"
								onChange={(event) => {
									addFiles(event.target.files);
									event.target.value = "";
								}}
							/>
							<p className="mt-3 text-sm text-muted-foreground">
								Up to 100 MB per file
							</p>
						</div>
						{files.length > 0 && (
							<div className="mt-4 flex max-h-44 flex-col gap-2 overflow-auto">
								{files.map((file, index) => (
									<div
										key={`${file.name}-${file.size}`}
										className="flex items-center gap-3 rounded-lg border p-3"
									>
										<FileText className="size-4 shrink-0 text-muted-foreground" />
										<span className="min-w-0 flex-1 truncate text-sm">
											{file.name}
										</span>
										<span className="text-sm text-muted-foreground">
											{formatBytes(file.size)}
										</span>
										<Button
											variant="ghost"
											size="icon-sm"
											disabled={isUploading}
											aria-label={`Remove ${file.name}`}
											onClick={() =>
												setFiles(
													files.filter((_, itemIndex) => itemIndex !== index),
												)
											}
										>
											<X />
										</Button>
									</div>
								))}
							</div>
						)}
					</TabsContent>
					<TabsContent value="drive">
						<div className="py-5">
							<Field>
								<FieldLabel htmlFor="drive-url">
									Google Drive shared URL
								</FieldLabel>
								<Input
									id="drive-url"
									type="url"
									placeholder="https://drive.google.com/file/d/..."
									value={driveUrl}
									disabled={isUploading}
									onChange={(e) => setDriveUrl(e.target.value)}
								/>
							</Field>
							<p className="mt-3 text-sm text-muted-foreground">
								Paste a publicly accessible or organization-shared Google Drive link.
							</p>
						</div>
					</TabsContent>
					<TabsContent value="sharepoint">
						<div className="py-5">
							<Field>
								<FieldLabel htmlFor="sharepoint-url">
									SharePoint shared URL
								</FieldLabel>
								<Input
									id="sharepoint-url"
									type="url"
									placeholder="https://yourcompany.sharepoint.com/..."
									value={sharepointUrl}
									disabled={isUploading}
									onChange={(e) => setSharepointUrl(e.target.value)}
								/>
							</Field>
							<p className="mt-3 text-sm text-muted-foreground">
								Paste a SharePoint document link to ingest into this dataset.
							</p>
						</div>
					</TabsContent>
					<TabsContent value="ftp">
						<div className="flex flex-col items-center gap-4 py-8 text-center">
							<SourceIcon source="FTP" className="size-8" />
							<p>Connect an FTP server to browse and select remote files.</p>
							<Link
								to="/integrations?source=FTP"
								onClick={() => onOpenChange(false)}
								className="text-link"
							>
								Set up FTP connection <ArrowRight className="size-4" />
							</Link>
						</div>
					</TabsContent>
				</Tabs>

				{isUploading && (
					<div className="mt-2 space-y-2 rounded-lg border bg-muted/40 p-4">
						<div className="flex items-center justify-between text-sm">
							<span className="flex items-center gap-2 font-medium">
								<Loader2 className="size-4 animate-spin text-primary" />
								Uploading to backend...
							</span>
							<span className="text-muted-foreground">{uploadProgress}%</span>
						</div>
						<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full bg-primary transition-all duration-200"
								style={{ width: `${uploadProgress}%` }}
							/>
						</div>
					</div>
				)}

				<div className="flex justify-end gap-2 border-t pt-4">
					<Button
						variant="outline"
						disabled={isUploading}
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						disabled={
							isUploading ||
							!activeDatasetId ||
							(tab === "local" && files.length === 0) ||
							(tab === "drive" && !driveUrl.trim()) ||
							(tab === "sharepoint" && !sharepointUrl.trim()) ||
							tab === "ftp"
						}
						onClick={handleUpload}
					>
						{isUploading ? (
							<>
								<Loader2 className="animate-spin" data-icon="inline-start" />
								Uploading...
							</>
						) : tab === "local" ? (
							<>
								Upload {files.length || ""} file{files.length === 1 ? "" : "s"}
								<ArrowRight data-icon="inline-end" />
							</>
						) : (
							<>
								Start ingestion
								<ArrowRight data-icon="inline-end" />
							</>
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

