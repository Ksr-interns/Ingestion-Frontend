import { describe, it, expect, beforeAll } from "vitest";
import { authService } from "../../src/features/auth/services/auth.service";
import { configureApi } from "../../src/services/api-client";

describe("Auth Endpoints Frontend to Backend Integration", () => {
	const email = `testuser_${Date.now()}@example.com`;
	const password = "TestPassword123!";
	const fullName = "Test User";

	beforeAll(() => {
		configureApi("http://localhost:8000");
	});

	it("should signup a new user", async () => {
		const signupRes = await authService.signup(email, fullName, password);
		expect(signupRes).toBeDefined();
		expect(signupRes.user.email).toBe(email);
	});

	it("should verify OTP and log in the user", async () => {
		const verifyRes = await authService.verify(email, "123456");
		expect(verifyRes).toBeDefined();
		expect(verifyRes.access_token).toBeTruthy();
	});

	it("should login successfully with registered credentials", async () => {
		const loginRes = await authService.login(email, password);
		expect(loginRes).toBeDefined();
		expect(loginRes.access_token).toBeTruthy();
		expect(loginRes.user.email).toBe(email);
	});

	it("should fetch current user profile via authService.me", async () => {
		const user = await authService.me();
		expect(user).toBeDefined();
		expect(user.email).toBe(email);
	});
});
