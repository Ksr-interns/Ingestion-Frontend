import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
	Database,
	UploadCloud,
	History,
	ScrollText,
	Users,
	Settings2,
	ChevronsUpDown,
	ChevronRight,
	Search,
	Bell,
	HelpCircle,
	Menu,
	X,
	Building2,
	Check,
	BookOpen,
	LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Brand } from "@/components/PlatformUi";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const mainNav = [
	{ label: "Datasets", href: "/datasets", icon: Database },
	{ label: "Uploads", href: "/uploads", icon: UploadCloud },
	{ label: "History", href: "/history", icon: History },
	{ label: "Audit logs", href: "/audit-logs", icon: ScrollText },
];
const orgNav = [
	{ label: "Team members", href: "/organization/members", icon: Users },
	{
		label: "Organization settings",
		href: "/organization/settings",
		icon: Settings2,
	},
];

export function WorkspaceShell({ children }: { children: ReactNode }) {
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const { user, logout, activeOrganizationId, setActiveOrganizationId } = useAuth();

	const [mobileOpen, setMobileOpen] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [helpOpen, setHelpOpen] = useState(false);
	const [notificationsOpen, setNotificationsOpen] = useState(false);

	// Determine user role from memberships
	const role = user?.role === "super_admin"
		? "super_admin"
		: user?.memberships?.find((m) => m.organization_id === activeOrganizationId)?.role ?? "member";

	const activeOrg = user?.memberships?.find(
		(m) => m.organization_id === activeOrganizationId
	);
	const orgDisplayName = activeOrg?.organization_name ?? "Workspace";
	const userInitials = user?.full_name
		? user.full_name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: user?.email?.slice(0, 2).toUpperCase() ?? "U";

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (
				(event.metaKey || event.ctrlKey) &&
				event.key.toLowerCase() === "k" &&
				!event.isComposing &&
				event.keyCode !== 229
			) {
				event.preventDefault();
				setSearchOpen((value) => !value);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	const nav =
		role === "super_admin"
			? [
					{
						label: "Organizations",
						href: "/admin/organizations",
						icon: Building2,
					},
					{ label: "Audit logs", href: "/audit-logs", icon: ScrollText },
				]
			: mainNav;

	const active = [
		...mainNav,
		...orgNav,
		{ label: "Settings", href: "/settings" },
		{ label: "Organizations", href: "/admin/organizations" },
	].find((item) => pathname.startsWith(item.href));

	const handleLogout = async () => {
		await logout();
		navigate("/login");
	};

	const sidebar = (
		<>
			<div className="flex h-20 items-center justify-between px-6">
				<Link to="/" aria-label="Ingest home">
					<Brand />
				</Link>
				<button
					className="lg:hidden"
					onClick={() => setMobileOpen(false)}
					aria-label="Close navigation"
				>
					<X className="size-5" />
				</button>
			</div>
			<div className="flex flex-1 flex-col pt-7">
				<nav aria-label="Main navigation" className="px-3">
					<div className="flex flex-col gap-1">
						{nav.map((item) => {
							const selected =
								pathname === "/"
									? item.href === "/datasets"
									: pathname.startsWith(item.href);
							return (
								<Link
									key={item.href}
									to={item.href}
									onClick={() => setMobileOpen(false)}
									aria-current={selected ? "page" : undefined}
									className={cn(
										"flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
										selected
											? "bg-primary/9 font-medium text-primary"
											: "text-muted-foreground hover:bg-foreground/4 hover:text-foreground",
									)}
								>
									<item.icon className="size-[18px]" strokeWidth={1.8} />
									<span className="flex-1">{item.label}</span>
								</Link>
							);
						})}
					</div>
				</nav>
				{(role === "org_admin") && (
					<nav aria-label="Organization navigation" className="px-3 pt-8">
						<p className="px-3 pb-3 text-sm font-medium text-muted-foreground">
							Organization
						</p>
						<div className="flex flex-col gap-1">
							{orgNav.map((item) => (
								<Link
									key={item.href}
									to={item.href}
									onClick={() => setMobileOpen(false)}
									className={cn(
										"flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm",
										pathname === item.href
											? "bg-primary/9 font-medium text-primary"
											: "text-muted-foreground hover:bg-foreground/4",
									)}
								>
									<item.icon className="size-[18px]" strokeWidth={1.8} />
									{item.label}
								</Link>
							))}
						</div>
					</nav>
				)}
			</div>
			<div className="border-t p-4">
				<DropdownMenu>
					<DropdownMenuTrigger className="flex w-full items-center gap-3 text-left">
						<span className="flex size-9 items-center justify-center rounded-full bg-foreground/9 font-medium text-foreground">
							{userInitials}
						</span>
						<span className="flex-1">
							<span className="block font-medium">
								{user?.full_name ?? user?.email ?? "User"}
							</span>
							<span className="text-sm text-muted-foreground">
								{role === "org_admin"
									? "Organization admin"
									: role === "super_admin"
										? "Platform admin"
										: "Member"}
							</span>
						</span>
						<ChevronsUpDown className="size-4 text-muted-foreground" />
					</DropdownMenuTrigger>
					<DropdownMenuContent side="top" className="w-56">
						<DropdownMenuGroup>
							<DropdownMenuItem onClick={() => navigate("/settings")}>
								<Settings2 />
								Profile & settings
							</DropdownMenuItem>
							<DropdownMenuItem onClick={handleLogout}>
								<LogOut />
								Sign out
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</>
	);

	return (
		<div className="min-h-screen">
			<aside className="fixed inset-y-0 left-0 hidden w-[244px] flex-col overflow-y-auto border-r bg-sidebar lg:flex">
				{sidebar}
			</aside>
			<Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
				<DialogContent
					showCloseButton={false}
					className="left-0 top-0 h-dvh w-[270px] translate-x-0 translate-y-0 rounded-none p-0 sm:max-w-[270px]"
				>
					<DialogHeader className="sr-only">
						<DialogTitle>Workspace navigation</DialogTitle>
						<DialogDescription>
							Navigate your organization and workspace.
						</DialogDescription>
					</DialogHeader>
					<aside className="flex h-full min-h-0 flex-col overflow-y-auto bg-sidebar text-sidebar-foreground">
						{sidebar}
					</aside>
				</DialogContent>
			</Dialog>
			<div className="lg:pl-[244px]">
				<header className="flex h-[72px] items-center justify-between border-b px-5 md:px-8">
					<div className="flex items-center gap-3">
						<Button
							variant="ghost"
							size="icon"
							className="lg:hidden"
							onClick={() => setMobileOpen(true)}
							aria-label="Open navigation"
						>
							<Menu />
						</Button>
						<span className="hidden text-sm text-muted-foreground sm:block">
							Workspace
						</span>
						<ChevronRight className="hidden size-3.5 text-muted-foreground sm:block" />
						<span className="text-sm font-medium">
							{active?.label ?? "Datasets"}
						</span>
					</div>
					<div className="flex items-center gap-4">
						<button
							onClick={() => setSearchOpen(true)}
							className="flex items-center gap-2.5 text-muted-foreground"
							aria-label="Search workspace"
						>
							<Search className="size-[18px]" />
							<span className="hidden text-sm md:inline">
								Search anything...
							</span>
							<kbd className="hidden rounded border px-1.5 text-sm md:inline">
								⌘ K
							</kbd>
						</button>
						<div className="h-5 border-l" />
						<button
							onClick={() => setNotificationsOpen(true)}
							aria-label="Notifications"
							className="relative text-muted-foreground"
						>
							<Bell className="size-[19px]" />
							<span className="absolute right-0 top-0 size-1.5 rounded-full bg-primary ring-2 ring-background" />
						</button>
						<button
							onClick={() => setHelpOpen(true)}
							aria-label="Help"
							className="text-muted-foreground"
						>
							<HelpCircle className="size-[19px]" />
						</button>
					</div>
				</header>
				<main
					id="main-content"
					className="page-enter mx-auto max-w-[1600px] p-5 md:p-8"
				>
					{children}
				</main>
				<footer className="flex flex-wrap items-center justify-between gap-2 px-5 pb-5 text-sm text-muted-foreground md:px-8">
					<span>© 2026 Ingest. Your data, connected.</span>
					<span className="flex items-center gap-2">
						<span className="size-1.5 rounded-full bg-success" />
						All systems operational
					</span>
				</footer>
			</div>
			<Dialog open={searchOpen} onOpenChange={setSearchOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Search your workspace</DialogTitle>
						<DialogDescription>
							Find datasets and navigate your workspace.
						</DialogDescription>
					</DialogHeader>
					<Input
						autoFocus
						aria-label="Search datasets"
						placeholder="Search datasets, pages..."
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
					<div className="flex max-h-80 flex-col gap-1 overflow-auto">
						{nav
							.map((item) => ({ name: item.label, href: item.href }))
							.filter((item) =>
								item.name.toLowerCase().includes(query.toLowerCase()),
							)
							.map((item) => (
								<button
									key={item.href}
									onClick={() => {
										navigate(item.href);
										setSearchOpen(false);
									}}
									className="flex items-center justify-between rounded-lg p-3 text-left hover:bg-muted"
								>
									{item.name}
									<ChevronRight className="size-4 text-muted-foreground" />
								</button>
							))}
					</div>
				</DialogContent>
			</Dialog>
			<Dialog open={helpOpen} onOpenChange={setHelpOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Welcome to Ingest</DialogTitle>
						<DialogDescription>
							Your guide to a connected data workspace.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-5 py-3">
						{[
							[
								"Organize your data",
								"Create a dataset, choose its language, and add a description.",
							],
							[
								"Bring your files together",
								"Choose local uploads, Google Drive, SharePoint, or an FTP server.",
							],
							[
								"Track every step",
								"Monitor ingestion jobs and review your organization's audit trail.",
							],
						].map(([title, body]) => (
							<div key={title} className="flex gap-3">
								<BookOpen className="mt-0.5 size-5 shrink-0 text-primary" />
								<div>
									<h3 className="font-medium">{title}</h3>
									<p className="mt-1 text-muted-foreground">{body}</p>
								</div>
							</div>
						))}
					</div>
				</DialogContent>
			</Dialog>
			<Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Notifications</DialogTitle>
						<DialogDescription>
							Recent activity in your workspace.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-4 py-2">
						<p className="text-sm text-muted-foreground">
							No new notifications.
						</p>
						<Button
							variant="outline"
							onClick={() => {
								setNotificationsOpen(false);
								navigate("/datasets");
							}}
						>
							View datasets
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
