import { describe, it, expect, beforeAll } from "vitest";
import { authService } from "../../src/features/auth/services/auth.service";
import { datasetsService } from "../../src/features/datasets/services/datasets.service";
import { configureApi, setApiSession } from "../../src/services/api-client";

describe("Dataset Endpoints Frontend to Backend Integration", () => {
	let createdDatasetId: string;
	const email = `dsuser_${Date.now()}@example.com`;
	const password = "DsPassword123!";
	const testDatasetName = `Dataset Test ${Date.now()}`;

	beforeAll(async () => {
		configureApi("http://localhost:8000");
		await authService.signup(email, "Dataset Tester", password);
		const authRes = await authService.verify(email, "123456");
		const activeOrgId = authRes.user.memberships?.find((m) => m.is_active)?.organization_id || authRes.user.memberships?.[0]?.organization_id || null;
		setApiSession(authRes.access_token, activeOrgId);
	});

	it("should create a dataset successfully from frontend service", async () => {
		const dataset = await datasetsService.create({
			name: testDatasetName,
			description: "Automated test dataset description",
			language: "English",
		});
		expect(dataset).toBeDefined();
		expect(dataset.name).toBe(testDatasetName);
		expect(dataset.id).toBeTruthy();
		createdDatasetId = dataset.id;
	});

	it("should list datasets including the newly created dataset", async () => {
		const datasets = await datasetsService.list(1, 20);
		expect(Array.isArray(datasets)).toBe(true);
		const found = datasets.find((d) => d.name === testDatasetName || d.id === createdDatasetId);
		expect(found).toBeDefined();
	});

	it("should fetch dataset details by ID", async () => {
		expect(createdDatasetId).toBeTruthy();
		const dataset = await datasetsService.get(createdDatasetId);
		expect(dataset).toBeDefined();
		expect(dataset.id).toBe(createdDatasetId);
		expect(dataset.name).toBe(testDatasetName);
	});

	it("should update dataset details", async () => {
		expect(createdDatasetId).toBeTruthy();
		const updatedName = `${testDatasetName} Updated`;
		const dataset = await datasetsService.update(createdDatasetId, {
			name: updatedName,
			description: "Updated description via test",
		});
		expect(dataset).toBeDefined();
		expect(dataset.name).toBe(updatedName);
	});

	it("should delete the created dataset", async () => {
		expect(createdDatasetId).toBeTruthy();
		await datasetsService.remove(createdDatasetId);
		try {
			await datasetsService.get(createdDatasetId);
		} catch (err: any) {
			expect(err.message).toBeDefined();
		}
	});
});
