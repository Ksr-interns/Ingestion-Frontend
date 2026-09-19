import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
	UploadCloud,
	FileText,
	X,
	ArrowRight,
	Folder,
	CheckCircle2,
	AlertCircle,
	Loader2,
	RefreshCw,
	FolderTree,
	FileCode2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { PageHeading, SourceIcon, sourceLabels } from "@/components/PlatformUi";
import { formatBytes } from "@/utils/format";
import type { Source } from "@/types/platform";
import { integrationsService, type RemoteFile } from "@/features/integrations/services/integrations.service";
import { uploadFile, ingestionService } from "@/features/ingestion/services/ingestion.service";
import { useAuth } from "@/contexts/AuthContext";

declare global {
	interface Window {
		gapi?: any;
		google?: any;
	}
}

export function UploadsPage() {
	const auth = useAuth();
	const { datasets, setDatasets, connections, setConnections, role, jobs } = useWorkspace();
	const [params] = useSearchParams();

	const initialMode = (params.get("mode") as Source) || "Local";
	const [ingestionMode, setIngestionMode] = useState<Source>(
		["Local", "GDrive", "Sharepoint", "FTP"].includes(initialMode) ? initialMode : "Local",
	);
	const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");

	// Local file upload state
	const [localFiles, setLocalFiles] = useState<File[]>([]);
	const [dragging, setDragging] = useState(false);
	const [autoRenameLocal, setAutoRenameLocal] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Cloud URL ingestion state
	const [driveUrl, setDriveUrl] = useState("");
	const [driveFileId, setDriveFileId] = useState("");
	const [sharepointUrl, setSharepointUrl] = useState("");
	const [sharepointFileId, setSharepointFileId] = useState("");
	const [sharepointTreeItems, setSharepointTreeItems] = useState<any[]>([]);
	const [sharepointLoadingTree, setSharepointLoadingTree] = useState(false);

	// FTP state
	const [ftpConnected, setFtpConnected] = useState(false);
	const [ftpHost, setFtpHost] = useState("ftp.example.com");
	const [ftpPort, setFtpPort] = useState("21");
	const [ftpUsername, setFtpUsername] = useState("");
	const [ftpPassword, setFtpPassword] = useState("");
	const [ftpPath, setFtpPath] = useState("/");
	const [ftpItems, setFtpItems] = useState<RemoteFile[]>([]);
	const [selectedFtpFile, setSelectedFtpFile] = useState<string | null>(null);
	const [ftpAutoRename, setFtpAutoRename] = useState(false);
	const [ftpConflictInfo, setFtpConflictInfo] = useState<{
		message: string;
		conflicting_files: string[];
		suggestion: string;
	} | null>(null);

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

	async function fetchSharePointTree(folderId?: string) {
		try {
			setSharepointLoadingTree(true);
			const data = await ingestionService.sharepointTree(folderId);
			setSharepointTreeItems(data.items || []);
		} catch (err: any) {
			toast.error(err?.message || "Failed to fetch SharePoint directory");
		} finally {
			setSharepointLoadingTree(false);
		}
	}

	function handleAddLocalFiles(incoming: FileList | File[] | null) {
		if (!incoming) return;
		const valid = Array.from(incoming).filter((f) => f.size > 0 && f.size <= 500 * 1024 * 1024);
		if (valid.length !== incoming.length) {
			toast.error("Choose non-empty files up to 500 MB.");
		}
		setLocalFiles((curr) => [
			...curr,
			...valid.filter((f) => !curr.some((existing) => existing.name === f.name && existing.size === f.size)),
		]);
	}

	async function handleOpenGooglePicker() {
		if (!selectedDatasetId) {
			toast.error("Please select a target dataset first.");
			return;
		}
		try {
			toast.loading("Loading Google Picker API...");
			const tokenRes = await ingestionService.getGoogleToken().catch(() => null);
			const token = tokenRes?.access_token || "";

			if (typeof window !== "undefined" && !window.gapi) {
				await new Promise<void>((resolve, reject) => {
					const script = document.createElement("script");
					script.src = "https://apis.google.com/js/api.js";
					script.onload = () => window.gapi.load("picker", resolve);
					script.onerror = reject;
					document.body.appendChild(script);
				});
			} else if (window.gapi) {
				await new Promise<void>((resolve) => window.gapi.load("picker", resolve));
			}

			toast.dismiss();

			if (!window.google || !window.google.picker) {
				toast.error("Google Picker API failed to load.");
				return;
			}

			const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
			const builder = new window.google.picker.PickerBuilder()
				.addView(view)
				.setOrigin(window.location.origin)
				.setCallback(async (data: any) => {
					if (data.action === window.google.picker.Action.PICKED) {
						const doc = data.docs[0];
						setDriveFileId(doc.id);
						toast.info(`Picked file: ${doc.name}`);

						// Auto ingest
						setIsIngesting(true);
						setProgressStatus(`Ingesting Google Drive file ${doc.name}...`);
						setProgressPercent(30);

						await ingestionService.gdriveInit(selectedDatasetId, doc.id, doc.name, doc.mimeType);

						setProgressPercent(100);
						setProgressStatus(`Google Drive file ${doc.name} queued successfully!`);
						toast.success(`Ingested ${doc.name}`);
						setIsIngesting(false);
					}
				});

			if (token) builder.setOAuthToken(token);
			builder.build().setVisible(true);
		} catch (err: any) {
			toast.dismiss();
			toast.error(err?.message || "Failed to open Google Picker");
		}
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

	async function startIngestion(overrideAutoRename = false) {
		if (!selectedDatasetId) {
			toast.error("Please select a target dataset for ingestion.");
			return;
		}

		setIsIngesting(true);
		setProgressPercent(0);
		setFailedReason(null);
		setCompletedFiles([]);
		setFtpConflictInfo(null);

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

					await uploadFile(
						file,
						selectedDatasetId,
						(percent, statusMsg) => {
							const overall = Math.round(((i + percent / 100) / localFiles.length) * 100);
							setProgressPercent(overall);
							if (statusMsg) setProgressStatus(`[File ${i + 1}/${localFiles.length}] ${statusMsg}`);
						},
						undefined,
						{ autoRename: autoRenameLocal || overrideAutoRename },
					);

					setCompletedFiles((prev) => [...prev, file.name]);
				}

				setProgressPercent(100);
				setProgressStatus("All local files ingested successfully!");
				toast.success(`Successfully uploaded and ingested ${localFiles.length} file(s).`);
				setLocalFiles([]);
			} else if (ingestionMode === "GDrive") {
				if (driveFileId) {
					setProgressStatus("Queueing Google Drive File Ingestion...");
					setProgressPercent(40);
					await ingestionService.gdriveInit(selectedDatasetId, driveFileId.trim());
					setDriveFileId("");
				} else if (driveUrl.trim()) {
					setProgressStatus("Connecting to Google Drive...");
					setProgressPercent(30);
					await ingestionService.googleUrl(selectedDatasetId, driveUrl.trim());
					setDriveUrl("");
				} else {
					toast.error("Please enter a Google Drive link or select a file via Google Picker.");
					setIsIngesting(false);
					return;
				}

				setProgressPercent(100);
				setProgressStatus("Google Drive ingestion queued successfully!");
				toast.success("Google Drive ingestion queued.");
			} else if (ingestionMode === "Sharepoint") {
				if (sharepointFileId) {
					setProgressStatus("Queueing SharePoint File Ingestion...");
					setProgressPercent(40);
					await ingestionService.sharepointInit(selectedDatasetId, sharepointFileId.trim());
					setSharepointFileId("");
				} else if (sharepointUrl.trim()) {
					setProgressStatus("Connecting to SharePoint...");
					setProgressPercent(40);
					await ingestionService.sharepointUrl(selectedDatasetId, sharepointUrl.trim());
					setSharepointUrl("");
				} else {
					toast.error("Please enter a SharePoint URL or pick an item from the SharePoint tree.");
					setIsIngesting(false);
					return;
				}

				setProgressPercent(100);
				setProgressStatus("SharePoint ingestion queued successfully!");
				toast.success("SharePoint ingestion queued.");
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

				setProgressStatus(`Queueing remote FTP file ${selectedFtpFile}...`);
				setProgressPercent(50);

				try {
					await ingestionService.initFtp(
						selectedDatasetId,
						[
							{
								path: targetPath,
								is_folder: targetItem?.is_folder || false,
								size_bytes: targetItem?.size_bytes || 0,
							},
						],
						ftpAutoRename || overrideAutoRename,
					);

					setCompletedFiles((prev) => [...prev, selectedFtpFile]);
					setProgressPercent(100);
					setProgressStatus(`FTP Ingestion queued successfully for ${selectedFtpFile}!`);
					toast.success("FTP file ingestion initiated.");
				} catch (err: any) {
					if (err?.status === 409 || err?.message?.includes("collision")) {
						setFtpConflictInfo({
							message: err?.message || "Filename collision detected",
							conflicting_files: [selectedFtpFile],
							suggestion: `Auto-rename to ${selectedFtpFile.replace(/(\.[^.]+)$/, " (1)$1")}`,
						});
					} else {
						throw err;
					}
				}
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
							setFtpConflictInfo(null);
						}}
						disabled={isIngesting}
					>
						<option value="Local">💻 Local File Upload (Direct Chunked Ingestion)</option>
						<option value="GDrive">☁️ Google Drive Ingestion</option>
						<option value="Sharepoint">🏢 SharePoint Ingestion</option>
						<option value="FTP">⚡ FTP Server Ingestion</option>
					</select>
					<FieldDescription className="mt-1">
						{ingestionMode === "Local" && "Upload documents, CSVs, and PDFs directly from your computer with SHA-256 Merkle hashes."}
						{ingestionMode === "GDrive" && "Ingest Google Drive files directly into datasets using Shared URLs or Google Picker."}
						{ingestionMode === "Sharepoint" && "Access your SharePoint document libraries and Microsoft Graph remote trees."}
						{ingestionMode === "FTP" && "Connect to remote FTP servers with automatic 409 collision resolution."}
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
								Supports PDF, DOCX, CSV, JSON, images, and text files (up to 500 MB per file).
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

						<div className="flex items-center gap-2">
							<input
								id="auto-rename-local"
								type="checkbox"
								checked={autoRenameLocal}
								onChange={(e) => setAutoRenameLocal(e.target.checked)}
								className="size-4 rounded border-border"
							/>
							<label htmlFor="auto-rename-local" className="text-sm font-medium text-foreground cursor-pointer">
								Auto-rename files on filename collision
							</label>
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

						<div className="flex items-center gap-4 border-t pt-4">
							<span className="text-xs font-semibold uppercase text-muted-foreground">Or pick visually:</span>
							<Button variant="outline" type="button" onClick={handleOpenGooglePicker} disabled={isIngesting}>
								<FolderTree className="size-4 mr-2 text-primary" /> Open Google Picker Window
							</Button>
						</div>
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

						<div className="border-t pt-4 flex flex-col gap-3">
							<div className="flex items-center justify-between">
								<span className="text-xs font-semibold uppercase text-muted-foreground">SharePoint Remote Explorer</span>
								<Button variant="outline" size="sm" type="button" onClick={() => fetchSharePointTree()} disabled={sharepointLoadingTree}>
									{sharepointLoadingTree ? <Loader2 className="animate-spin size-3 mr-1" /> : <RefreshCw className="size-3 mr-1" />}
									Fetch Tree
								</Button>
							</div>

							{sharepointTreeItems.length > 0 && (
								<div className="flex max-h-56 flex-col gap-1 overflow-auto rounded-lg border p-2 bg-muted/20">
									{sharepointTreeItems.map((item) => (
										<button
											key={item.id}
											onClick={() => {
												if (item.is_folder) {
													fetchSharePointTree(item.id);
												} else {
													setSharepointFileId(item.id);
													toast.info(`Selected SharePoint file: ${item.name}`);
												}
											}}
											className={`flex items-center justify-between rounded-md p-2 text-left text-sm transition-colors ${
												sharepointFileId === item.id ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted"
											}`}
										>
											<span className="flex items-center gap-2">
												{item.is_folder ? <Folder className="size-4 text-primary" /> : <FileCode2 className="size-4" />}
												{item.name}
											</span>
											{item.size_bytes && <span className="text-xs text-muted-foreground">{formatBytes(item.size_bytes)}</span>}
										</button>
									))}
								</div>
							)}
						</div>
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
									<span className="text-sm font-medium">FTP Remote Path: {ftpPath}</span>
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

								<div className="flex items-center gap-2 mt-2">
									<input
										id="ftp-auto-rename"
										type="checkbox"
										checked={ftpAutoRename}
										onChange={(e) => setFtpAutoRename(e.target.checked)}
										className="size-4 rounded border-border"
									/>
									<label htmlFor="ftp-auto-rename" className="text-sm font-medium text-foreground cursor-pointer">
										Auto-rename on filename collision (409 Conflict)
									</label>
								</div>

								{ftpConflictInfo && (
									<div className="rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-4 text-amber-900 dark:text-amber-200">
										<div className="flex items-center gap-2 font-semibold">
											<AlertCircle className="size-4 text-amber-600" />
											409 Filename Collision Detected
										</div>
										<p className="mt-1 text-sm">{ftpConflictInfo.message}</p>
										{ftpConflictInfo.suggestion && (
											<p className="mt-1 text-xs italic">Suggestion: {ftpConflictInfo.suggestion}</p>
										)}
										<Button
											size="sm"
											className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
											onClick={() => startIngestion(true)}
										>
											Auto-Rename & Ingest
										</Button>
									</div>
								)}
							</div>
						)}
					</div>
				)}

				{/* START INGESTION BUTTON */}
				<div className="mt-8 border-t pt-6 flex justify-end">
					<Button
						size="lg"
						disabled={isIngesting || (ingestionMode === "Local" && localFiles.length === 0)}
						onClick={() => startIngestion(false)}
						className="min-w-[180px]"
					>
						{isIngesting ? (
							<>
								<Loader2 className="animate-spin mr-2" /> Ingesting Data...
							</>
						) : (
							<>
								Start Ingestion <ArrowRight className="ml-2 size-4" />
							</>
						)}
					</Button>
				</div>
			</div>

			{/* DATASET BACKGROUND INGESTION PIPELINE PROGRESS CARD */}
			{jobs.filter((j) => j.status === "in_progress" || j.status === "pending").map((activeJob) => (
				<div key={activeJob.job_id} className="panel p-6 border-l-4 border-l-primary bg-primary/5 shadow-sm flex flex-col gap-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Loader2 className="size-5 animate-spin text-primary" />
							<div>
								<h3 className="text-base font-semibold text-primary">
									Dataset Background Pipeline: {activeJob.dataset_name}
								</h3>
								<p className="text-xs text-muted-foreground">
									File: <span className="font-medium text-foreground">{activeJob.filename}</span> ({activeJob.provider})
								</p>
							</div>
						</div>
						<span className="text-base font-bold text-primary">{activeJob.progress_percentage}%</span>
					</div>
					<div className="h-3 w-full overflow-hidden rounded-full bg-muted">
						<div
							className="h-full bg-primary transition-all duration-300"
							style={{ width: `${activeJob.progress_percentage}%` }}
						/>
					</div>
					<p className="text-xs text-muted-foreground font-medium">
						The backend ingestion pipeline is parsing, embedding, and linking documents to the dataset.
					</p>
				</div>
			))}

			{/* LIVE FILE TRANSFER PROGRESS CARD */}
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
									? "File Transfer Progress"
									: failedReason
										? "Transfer Failed"
										: "File Transfer Completed"}
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
						{progressStatus || (failedReason ? failedReason : "File transfer complete.")}
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
