import { apiRequest, setApiSession } from "@/services/api-client";
import type { PublicUser } from "@/types/platform";
export interface AuthResponse {
	message: string;
	user: PublicUser;
	access_token: string;
}
export const authService = {
	async login(identifier: string, password: string) {
		const response = await apiRequest<AuthResponse>(
			"/v1/auth/login",
			{ method: "POST", body: JSON.stringify({ identifier, password }) },
			false,
		);
		setApiSession(
			response.access_token,
			response.user.memberships.find((membership) => membership.is_active)
				?.organization_id ?? null,
		);
		return response;
	},
	signup: (email: string, full_name: string, password: string) =>
		apiRequest<{ message: string; user: PublicUser }>(
			"/v1/auth/signup/init",
			{ method: "POST", body: JSON.stringify({ email, full_name, password }) },
			false,
		),
	async verify(email: string, otp_code: string) {
		const response = await apiRequest<AuthResponse>(
			"/v1/auth/signup/verify",
			{ method: "POST", body: JSON.stringify({ email, otp_code }) },
			false,
		);
		setApiSession(
			response.access_token,
			response.user.memberships.find((membership) => membership.is_active)
				?.organization_id ?? null,
		);
		return response;
	},
	requestReset: (email: string) =>
		apiRequest<{ message: string; reset_token: string }>(
			"/v1/auth/password-reset/request",
			{ method: "POST", body: JSON.stringify({ email }) },
			false,
		),
	resetPassword: (email: string, reset_token: string, new_password: string) =>
		apiRequest<{ message: string }>(
			"/v1/auth/password-reset/verify",
			{
				method: "POST",
				body: JSON.stringify({ email, reset_token, new_password }),
			},
			false,
		),
	me: () => apiRequest<PublicUser>("/v1/auth/me", {}, false),
	async logout() {
		await apiRequest("/v1/auth/logout", { method: "POST" }, false);
		setApiSession(null, null);
	},
};
