const defaultEnvUrl = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "http://localhost:8000";
let baseUrl: string | null = defaultEnvUrl;
let accessToken: string | null = null;
let activeOrganizationId: string | null = null;
let refreshPromise: Promise<void> | null = null;

export function configureApi(url: string) {
	const parsed = new URL(url);
	if (
		parsed.protocol !== "https:" &&
		!(
			parsed.protocol === "http:" &&
			["localhost", "127.0.0.1"].includes(parsed.hostname)
		)
	)
		throw new Error(
			"Use an HTTPS backend URL (HTTP is allowed for localhost).",
		);
	baseUrl = parsed.origin;
}
export function setApiSession(
	token: string | null,
	organizationId: string | null,
) {
	accessToken = token;
	activeOrganizationId = organizationId;
}
export function getApiBaseUrl() {
	return baseUrl;
}

export async function apiRequest<T>(
	path: string,
	options: RequestInit = {},
	tenantScoped = true,
	retry = true,
): Promise<T> {
	if (!baseUrl)
		throw new Error(
			"Backend API is not configured. Please configure API base URL in Settings.",
		);
	const headers = new Headers(options.headers);
	if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
	if (activeOrganizationId)
		headers.set("X-Organization-ID", activeOrganizationId);
	if (options.body && !(options.body instanceof FormData))
		headers.set("Content-Type", "application/json");
	const response = await fetch(`${baseUrl}${path}`, {
		...options,
		headers,
		credentials: "include",
	});
	if (response.status === 401 && retry && !path.startsWith("/v1/auth/")) {
		refreshPromise ??= apiRequest<{ access_token: string }>(
			"/v1/auth/refresh",
			{ method: "POST" },
			false,
			false,
		)
			.then((data) => {
				accessToken = data.access_token;
			})
			.finally(() => {
				refreshPromise = null;
			});
		await refreshPromise;
		return apiRequest<T>(path, options, tenantScoped, false);
	}
	const body = await response.json().catch(() => ({}));
	if (!response.ok)
		throw new Error(
			typeof body.detail === "string"
				? body.detail
				: `Request failed (${response.status}). Please check your input and try again.`,
		);
	return body as T;
}
