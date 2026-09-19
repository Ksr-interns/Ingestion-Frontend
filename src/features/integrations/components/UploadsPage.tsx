import { useState, useRef, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
	UploadCloud,
	FileText,
	X,
	ArrowRight,
	Folder,
	ShieldCheck,
	CheckCircle2,
	AlertCircle,
	Loader2,
	HardDrive,
	Globe,
	Server,
	FolderGit2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { PageHeading, SourceIcon, sourceLabels, StatusBadge } from "@/components/PlatformUi";
import { formatBytes } from "@/utils/format";
import type { Source } from "@/types/platform";
import { integrationsService, type RemoteFile } from "@/features/integrations/services/integrations.service";
import { uploadFile, ingestionService } from "@/features/ingestion/services/ingestion.service";
import { useAuth } from "@/contexts/AuthContext";

export function UploadsPage() {
	const auth = useAuth();
	const { datasets, setDatasets, connections, setConnections, role } = useWorkspace();
	const [params] = useSearchParams();

	const initialMode = (params.get("mode") as Source) || "Local";
	const [ingestionMode, setIngestionMode] = useState<Source>(
		["Local", "GDrive", "Sharepoint", "FTP"].includes(initialMode) ? initialMode : "Local",
	);
	const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");

	// Local file upload state
	const [localFiles, setLocalFiles] = useState<File[]>([]);
	const [dragging, setDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Cloud URL ingestion state
	const [driveUrl, setDriveUrl] = useState("");
	const [sharepointUrl, setSharepointUrl] = useState("");

	// FTP state
	const [ftpConnected, setFtpConnected] = useState(false);
	const [ftpHost, setFtpHost] = useState("ftp.example.com");
	const [ftpPort, setFtpPort] = useState("21");
	const [ftpUsername, setFtpUsername] = useState("");
	const [ftpPassword, setFtpPassword] = useState("");
	const [ftpPath, setFtpPath] = useState("/");
	const [ftpItems, setFtpItems] = useState<RemoteFile[]>([]);
	const [selectedFtpFile, setSelectedFtpFile] = useState<string | null>(null);

	// Ingestion progress state
	const [isIngesting, setIsIngesting] = useState(false);
	const [progressPercent, setProgressPercent] = useState<number>(0);
	const [progressStatus, setProgressStatus] = useState<string>("");
	const [completedFiles, setCompletedFiles] = useState<string[]>([]);
	const [failedReason, setFailedReason] = useState<string | null>(null);

	const isModeConnected = connections[ingestionMode];

	// Auto-select first dataset if available
	useEffect(() => {
		if (!selectedDatasetId && datasets.length > 0) {
			setSelectedDatasetId(datasets[0].id);
		}
	}, [datasets, selectedDatasetId]);

	// Sync connection status for FTP
	useEffect(() => {
		if (connections.FTP) {
			setFtpConnected(true);
			fetchFtpTree("/");
		} else {
			setFtpConnected(false);
		}
	}, [connections.FTP]);

	async function fetchFtpTree(path: string) {
		try {
			const data = await integrationsService.ftpTree(path);
			setFtpPath(data.current_path);
			setFtpItems(data.items);
		} catch (err: any) {
			toast.error(err?.message || "Failed to load FTP directory");
		}
	}

	function handleAddLocalFiles(incoming: FileList | File[] | null) {
		if (!incoming) return;
		const valid = Array.from(incoming).filter((f) => f.size > 0 && f.size <= 100 * 1024 * 1024);
		if (valid.length !== incoming.length) {
			toast.error("Choose non-empty files up to 100 MB.");
		}
		setLocalFiles((curr) => [
			...curr,
			...valid.filter((f) => !curr.some((existing) => existing.name === f.name && existing.size === f.size)),
		]);
	}

	async function handleFtpConnectSubmit(e: React.FormEvent) {
		e.preventDefault();
		try {
			setIsIngesting(true);
			setProgressStatus("Connecting to FTP server...");
			await integrationsService.connectFtp({
				host: ftpHost.trim(),
				port: Number(ftpPort) || 21,
				username: ftpUsername.trim(),
				password: ftpPassword,
				duration_seconds: 3600,
			});
			await setConnections();
			setFtpConnected(true);
			toast.success("FTP connected successfully");
			await fetchFtpTree("/");
		} catch (err: any) {
			toast.error(err?.message || "Failed to connect to FTP server");
		} finally {
			setIsIngesting(false);
			setProgressStatus("");
		}
	}

	async function startIngestion() {
		if (!selectedDatasetId) {
			toast.error("Please select a target dataset for ingestion.");
			return;
		}

		setIsIngesting(true);
		setProgressPercent(0);
		setFailedReason(null);
		setCompletedFiles([]);

		try {
			if (ingestionMode === "Local") {
				if (localFiles.length === 0) {
					toast.error("Please select at least one local file to upload.");
					setIsIngesting(false);
					return;
				}

				for (let i = 0; i < localFiles.length; i++) {
					const file = localFiles[i];
					setProgressStatus(`Preparing ${file.name} (${i + 1}/${localFiles.length})...`);

					await uploadFile(file, selectedDatasetId, (percent, statusMsg) => {
						const overall = Math.round(((i + percent / 100) / localFiles.length) * 100);
						setProgressPercent(overall);
						if (statusMsg) setProgressStatus(`[File ${i + 1}/${localFiles.length}] ${statusMsg}`);
					});

					setCompletedFiles((prev) => [...prev, file.name]);
				}

				setProgressPercent(100);
				setProgressStatus("All local files ingested successfully!");
				toast.success(`Successfully uploaded and ingested ${localFiles.length} file(s).`);
				setLocalFiles([]);
			} else if (ingestionMode === "GDrive") {
				if (!connections.GDrive) {
					auth.loginWithGoogle();
					setIsIngesting(false);
					return;
				}
				if (!driveUrl.trim()) {
					toast.error("Please enter a valid Google Drive URL.");
					setIsIngesting(false);
					return;
				}

				setProgressStatus("Connecting to Google Drive...");
				setProgressPercent(30);

				await ingestionService.googleUrl(selectedDatasetId, driveUrl.trim());

				setProgressPercent(100);
				setProgressStatus("Google Drive ingestion queued successfully!");
				toast.success("Google Drive ingestion queued.");
				setDriveUrl("");
			} else if (ingestionMode === "Sharepoint") {
				if (!connections.Sharepoint) {
					auth.loginWithMicrosoft();
					setIsIngesting(false);
					return;
				}
				if (!sharepointUrl.trim()) {
					toast.error("Please enter a valid SharePoint URL.");
					setIsIngesting(false);
					return;
				}

				setProgressStatus("Connecting to SharePoint...");
				setProgressPercent(40);

				await ingestionService.sharepointUrl(selectedDatasetId, sharepointUrl.trim());

				setProgressPercent(100);
				setProgressStatus("SharePoint ingestion queued successfully!");
				toast.success("SharePoint ingestion queued.");
				setSharepointUrl("");
			} else if (ingestionMode === "FTP") {
				if (!ftpConnected) {
					toast.error("Please connect to your FTP server first.");
					setIsIngesting(false);
					return;
				}
				if (!selectedFtpFile) {
					toast.error("Please select a file from the FTP server directory.");
					setIsIngesting(false);
					return;
				}

				const targetItem = ftpItems.find((i) => i.name === selectedFtpFile);
				const targetPath = targetItem?.path || `${ftpPath === "/" ? "" : ftpPath}/${selectedFtpFile}`;

				setProgressStatus(`Queueing remote FTP file ${selectedFtpFile} for background ingestion...`);
				setProgressPercent(50);

				await ingestionService.initFtp(selectedDatasetId, [
					{
						path: targetPath,
						is_folder: targetItem?.is_folder || false,
						size_bytes: targetItem?.size_bytes || 0,
					},
				]);

				setCompletedFiles((prev) => [...prev, selectedFtpFile]);
				setProgressPercent(100);
				setProgressStatus(`FTP Ingestion queued successfully for ${selectedFtpFile}!`);
				toast.success("FTP file ingestion initiated.");
			}

			await setDatasets();
		} catch (err: any) {
			const msg = err?.message || "Ingestion failed. Please check your backend connection.";
			setFailedReason(msg);
			toast.error(msg);
		} finally {
			setIsIngesting(false);
		}
	}

	if (role === "super_admin") {
		return (
			<div className="panel p-6">
				<p>File uploads and cloud ingestion are available to organization members.</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-8 max-w-5xl">
			<PageHeading
				title="Uploads & Ingestion"
				description="Select an ingestion mode, configure your destination dataset, and ingest your files directly into your workspace."
			/>

			{/* Ingestion Mode & Target Dataset Selection Controls */}
			<div className="panel grid gap-6 p-6 md:grid-cols-2 bg-card">
				<Field>
					<FieldLabel htmlFor="ingestion-mode-select">Select Ingestion Mode</FieldLabel>
					<select
						id="ingestion-mode-select"
						className="native-select text-base font-medium"
						value={ingestionMode}
						onChange={(e) => {
							setIngestionMode(e.target.value as Source);
							setFailedReason(null);
							setProgressStatus("");
							setProgressPercent(0);
						}}
						disabled={isIngesting}
					>
						<option value="Local">💻 Local File Upload (Direct Chunked Ingestion)</option>
						<option value="GDrive">☁️ Google Drive Ingestion</option>
						<option value="Sharepoint">🏢 SharePoint Ingestion</option>
						<option value="FTP">⚡ FTP Server Ingestion</option>
					</select>
					<FieldDescription className="mt-1">
						{ingestionMode === "Local" && "Upload documents, CSVs, and PDFs directly from your computer."}
						{ingestionMode === "GDrive" && "Ingest shared Google Drive files directly into datasets."}
						{ingestionMode === "Sharepoint" && "Access your SharePoint document libraries and Microsoft files."}
						{ingestionMode === "FTP" && "Connect to remote FTP servers and pull files into your datasets."}
					</FieldDescription>
				</Field>

				<Field>
					<FieldLabel htmlFor="target-dataset-select">Destination Dataset</FieldLabel>
					<select
						id="target-dataset-select"
						className="native-select text-base font-medium"
						value={selectedDatasetId}
						onChange={(e) => setSelectedDatasetId(e.target.value)}
						disabled={isIngesting}
					>
						{datasets.length === 0 ? (
							<option value="">No datasets available. Please create one first.</option>
						) : (
							datasets.map((ds) => (
								<option key={ds.id} value={ds.id}>
									{ds.name} ({ds.language || "English"})
								</option>
							))
						)}
					</select>
					<FieldDescription className="mt-1">
						All ingested files will be processed and linked to this dataset.
					</FieldDescription>
				</Field>
			</div>

			{/* Main Interactive Ingestion Mode Section */}
			<div className="panel p-6">
				<div className="flex items-center justify-between border-b pb-4 mb-6">
					<div className="flex items-center gap-3">
						<span className="icon-tile size-11">
							<SourceIcon source={ingestionMode} className="size-6 text-primary" />
						</span>
						<div>
							<h2 className="text-lg font-semibold">{sourceLabels[ingestionMode]} Mode</h2>
							<p className="text-sm text-muted-foreground">
								Status:{" "}
								<span className="font-medium text-foreground">
									{isModeConnected ? "Connected & Ready" : ingestionMode === "Local" ? "Ready" : "Not connected"}
								</span>
							</p>
						</div>
					</div>

					{!isModeConnected && ingestionMode !== "Local" && (
						<Button
							variant="default"
							onClick={() => {
								if (ingestionMode === "GDrive") auth.loginWithGoogle();
								else if (ingestionMode === "Sharepoint") auth.loginWithMicrosoft();
							}}
						>
							Connect {sourceLabels[ingestionMode]} Account
						</Button>
					)}
				</div>

				{/* MODE 1: LOCAL FILE UPLOAD */}
				{ingestionMode === "Local" && (
					<div className="flex flex-col gap-6">
						<div
							onDragOver={(e) => {
								e.preventDefault();
								if (!isIngesting) setDragging(true);
							}}
							onDragLeave={() => setDragging(false)}
							onDrop={(e) => {
								e.preventDefault();
								setDragging(false);
								if (!isIngesting) handleAddLocalFiles(e.dataTransfer.files);
							}}
							className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
								dragging ? "border-primary bg-accent/40" : "border-border bg-muted/20"
							}`}
						>
							<span className="icon-tile size-14 mb-3">
								<UploadCloud className="size-7 text-primary" />
							</span>
							<h3 className="text-base font-semibold">Drag & drop files here to ingest</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								Supports PDF, DOCX, CSV, JSON, images, and text files (up to 100 MB per file).
							</p>
							<Button
								type="button"
								variant="outline"
								className="mt-5"
								disabled={isIngesting}
								onClick={() => fileInputRef.current?.click()}
							>
								Browse Local Files
							</Button>
							<input
								ref={fileInputRef}
								type="file"
								multiple
								disabled={isIngesting}
								className="sr-only"
								onChange={(e) => {
									handleAddLocalFiles(e.target.files);
									e.target.value = "";
								}}
							/>
						</div>

						{localFiles.length > 0 && (
							<div className="flex flex-col gap-3">
								<div className="flex items-center justify-between">
									<h4 className="text-sm font-medium">Selected Files ({localFiles.length})</h4>
									<Button
										variant="ghost"
										size="sm"
										disabled={isIngesting}
										onClick={() => setLocalFiles([])}
									>
										Clear all
									</Button>
								</div>
								<div className="flex max-h-56 flex-col gap-2 overflow-auto pr-1">
									{localFiles.map((file, idx) => (
										<div
											key={`${file.name}-${file.size}`}
											className="flex items-center justify-between rounded-lg border bg-background px-4 py-3 text-sm shadow-xs"
										>
											<div className="flex items-center gap-3 truncate">
												<FileText className="size-4 shrink-0 text-primary" />
												<span className="truncate font-medium">{file.name}</span>
											</div>
											<div className="flex items-center gap-4">
												<span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
												<Button
													variant="ghost"
													size="icon-sm"
													disabled={isIngesting}
													onClick={() => setLocalFiles(localFiles.filter((_, i) => i !== idx))}
												>
													<X className="size-4" />
												</Button>
											</div>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				)}

				{/* MODE 2: GOOGLE DRIVE */}
				{ingestionMode === "GDrive" && (
					<div className="flex flex-col gap-5 py-2">
						<Field>
							<FieldLabel htmlFor="drive-url-input">Google Drive File or Folder Link</FieldLabel>
							<Input
								id="drive-url-input"
								type="url"
								placeholder="https://drive.google.com/file/d/1A2B3C.../view"
								value={driveUrl}
								onChange={(e) => setDriveUrl(e.target.value)}
								disabled={isIngesting}
							/>
							<FieldDescription>
								Paste a public or shared Google Drive file/folder URL to import directly.
							</FieldDescription>
						</Field>
					</div>
				)}

				{/* MODE 3: SHAREPOINT */}
				{ingestionMode === "Sharepoint" && (
					<div className="flex flex-col gap-5 py-2">
						<Field>
							<FieldLabel htmlFor="sharepoint-url-input">SharePoint Document Link</FieldLabel>
							<Input
								id="sharepoint-url-input"
								type="url"
								placeholder="https://yourdomain.sharepoint.com/sites/.../Doc.docx"
								value={sharepointUrl}
								onChange={(e) => setSharepointUrl(e.target.value)}
								disabled={isIngesting}
							/>
							<FieldDescription>
								Enter your SharePoint file or folder URL to ingest Microsoft documents.
							</FieldDescription>
						</Field>
					</div>
				)}

				{/* MODE 4: FTP SERVER */}
				{ingestionMode === "FTP" && (
					<div className="flex flex-col gap-6 py-2">
						{!ftpConnected ? (
							<form onSubmit={handleFtpConnectSubmit} className="grid gap-4 md:grid-cols-2">
								<Field>
									<FieldLabel htmlFor="ftp-host">Host Server</FieldLabel>
									<Input
										id="ftp-host"
										value={ftpHost}
										onChange={(e) => setFtpHost(e.target.value)}
										placeholder="ftp.example.com"
										required
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="ftp-port">Port</FieldLabel>
									<Input
										id="ftp-port"
										type="number"
										value={ftpPort}
										onChange={(e) => setFtpPort(e.target.value)}
										placeholder="21"
										required
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="ftp-username">Username</FieldLabel>
									<Input
										id="ftp-username"
										value={ftpUsername}
										onChange={(e) => setFtpUsername(e.target.value)}
										placeholder="ftp_user"
										required
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="ftp-password">Password</FieldLabel>
									<Input
										id="ftp-password"
										type="password"
										value={ftpPassword}
										onChange={(e) => setFtpPassword(e.target.value)}
										placeholder="••••••••"
										required
									/>
								</Field>
								<div className="md:col-span-2">
									<Button type="submit" disabled={isIngesting}>
										{isIngesting ? <Loader2 className="animate-spin" /> : "Connect FTP Server"}
									</Button>
								</div>
							</form>
						) : (
							<div className="flex flex-col gap-4">
								<div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
									<span className="text-sm font-medium">FTP Path: {ftpPath}</span>
									<Button variant="outline" size="sm" onClick={() => fetchFtpTree("/")}>
										Root Directory
									</Button>
								</div>
								<div className="flex max-h-60 flex-col gap-1 overflow-auto rounded-lg border p-2">
									{ftpItems.map((item) => (
										<button
											key={item.name}
											onClick={() => {
												if (item.is_folder) {
													fetchFtpTree(item.path || `${ftpPath}/${item.name}`);
												} else {
													setSelectedFtpFile(item.name);
												}
											}}
											className={`flex items-center justify-between rounded-md p-2.5 text-left text-sm transition-colors ${
												selectedFtpFile === item.name ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted"
											}`}
										>
											<span className="flex items-center gap-2">
												{item.is_folder ? <Folder className="size-4 text-primary" /> : <FileText className="size-4" />}
												{item.name}
											</span>
											{!item.is_folder && (
												<span className="text-xs text-muted-foreground">{formatBytes(item.size_bytes)}</span>
											)}
										</button>
									))}
								</div>
							</div>
						)}
					</div>
				)}

				{/* START INGESTION BUTTON */}
				<div className="mt-8 border-t pt-6 flex justify-end">
					<Button
						size="lg"
						disabled={isIngesting || (ingestionMode === "Local" && localFiles.length === 0)}
						onClick={startIngestion}
						className="min-w-[180px]"
					>
						{isIngesting ? (
							<>
								<Loader2 className="animate-spin" /> Ingesting Data...
							</>
						) : (
							<>
								Start Ingestion <ArrowRight />
							</>
						)}
					</Button>
				</div>
			</div>

			{/* LIVE INGESTION PROGRESS CARD */}
			{(isIngesting || progressPercent > 0 || progressStatus || failedReason) && (
				<div className="panel p-6 border-l-4 border-l-primary bg-card shadow-sm">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-3">
							{isIngesting ? (
								<Loader2 className="size-5 animate-spin text-primary" />
							) : failedReason ? (
								<AlertCircle className="size-5 text-destructive" />
							) : (
								<CheckCircle2 className="size-5 text-success" />
							)}
							<h3 className="text-base font-semibold">
								{isIngesting
									? "Ingestion Progress"
									: failedReason
										? "Ingestion Failed"
										: "Ingestion Completed"}
							</h3>
						</div>
						<span className="text-sm font-bold text-primary">{progressPercent}%</span>
					</div>

					{/* Animated Progress Bar */}
					<div className="h-3 w-full overflow-hidden rounded-full bg-muted">
						<div
							className={`h-full transition-all duration-300 ${
								failedReason ? "bg-destructive" : "bg-primary"
							}`}
							style={{ width: `${progressPercent}%` }}
						/>
					</div>

					<p className="mt-3 text-sm text-muted-foreground font-medium">
						{progressStatus || (failedReason ? failedReason : "Ingestion complete.")}
					</p>

					{completedFiles.length > 0 && (
						<div className="mt-4 border-t pt-3">
							<span className="text-xs font-semibold text-muted-foreground uppercase">Ingested Files:</span>
							<ul className="mt-2 flex flex-wrap gap-2">
								{completedFiles.map((name) => (
									<li key={name} className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
										<CheckCircle2 className="size-3 text-success" />
										{name}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
