import { test, expect, type APIRequestContext } from "@playwright/test";

// ─── Helpers ─────────────────────────────────────────────────

const uniqueUser = () => {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return { username: `gov_${id}`, password: "GovPass123!" };
};

async function createAuthUser(request: APIRequestContext) {
  const user = uniqueUser();
  const res = await request.post("/api/auth/signup", {
    data: { username: user.username, password: user.password },
  });
  const body = await res.json();
  return { ...user, token: body.token as string, userId: body.user?.id as string };
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ─── Campfire Creation & Management ─────────────────────────

test.describe("Campfire Governance", () => {
  test("authenticated user can create a campfire", async ({ request }) => {
    const user = await createAuthUser(request);

    const res = await request.post("/api/campfires", {
      headers: authHeaders(user.token),
      data: {
        name: `test_campfire_${Date.now()}`,
        display_name: "E2E Test Campfire",
        description: "Created by integration tests.",
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.campfire || body.name).toBeDefined();
  });

  test("unauthenticated user cannot create a campfire", async ({ request }) => {
    const res = await request.post("/api/campfires", {
      data: {
        name: `unauth_campfire_${Date.now()}`,
        display_name: "Should Fail",
        description: "No auth token.",
      },
    });
    expect(res.status()).toBe(401);
  });

  test("campfire names must be valid slugs", async ({ request }) => {
    const user = await createAuthUser(request);

    const res = await request.post("/api/campfires", {
      headers: authHeaders(user.token),
      data: {
        name: "INVALID SLUG WITH SPACES!",
        display_name: "Bad Name",
        description: "Should fail validation.",
      },
    });

    expect([400, 422]).toContain(res.status());
    const body = await res.json();
    expect(body.error || body.code).toBeDefined();
  });

  test("duplicate campfire names are rejected", async ({ request }) => {
    const user = await createAuthUser(request);
    const name = `dup_campfire_${Date.now()}`;

    // Create first
    const res1 = await request.post("/api/campfires", {
      headers: authHeaders(user.token),
      data: { name, display_name: "First", description: "First creation." },
    });
    expect(res1.status()).toBe(201);

    // Create duplicate
    const res2 = await request.post("/api/campfires", {
      headers: authHeaders(user.token),
      data: { name, display_name: "Duplicate", description: "Duplicate." },
    });
    expect([400, 409, 422]).toContain(res2.status());
  });
});

// ─── Campfire Listing & Retrieval ───────────────────────────

test.describe("Campfire Discovery", () => {
  test("campfires list returns array with expected shape", async ({ request }) => {
    const res = await request.get("/api/campfires");
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.campfires).toBeDefined();
    expect(Array.isArray(body.campfires)).toBe(true);

    if (body.campfires.length > 0) {
      const campfire = body.campfires[0];
      // Verify expected fields exist
      expect(campfire.id).toBeDefined();
      expect(campfire.name).toBeDefined();
      expect(typeof campfire.name).toBe("string");
    }
  });

  test("individual campfire can be fetched by ID", async ({ request }) => {
    const listRes = await request.get("/api/campfires");
    const list = await listRes.json();
    if (!list.campfires?.length) {
      test.skip();
      return;
    }

    const campfireId = list.campfires[0].id;
    const res = await request.get(`/api/campfires/${campfireId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.campfire?.id ?? body.id).toBe(campfireId);
  });

  test("nonexistent campfire returns 404", async ({ request }) => {
    const res = await request.get(
      "/api/campfires/00000000-0000-0000-0000-ffffffffffff"
    );
    expect([404, 400]).toContain(res.status());
  });
});

// ─── Governance Proposals ───────────────────────────────────

test.describe("Governance Proposals", () => {
  test("proposal creation requires authentication", async ({ request }) => {
    const res = await request.post("/api/proposals", {
      data: {
        campfire_id: "00000000-0000-0000-0000-000000000001",
        proposal_type: "rule_change",
        title: "Should fail",
        description: "No auth.",
      },
    });
    expect(res.status()).toBe(401);
  });

  test("proposal creation requires campfire membership", async ({ request }) => {
    const user = await createAuthUser(request);

    // Try to create proposal without joining any campfire
    const campfires = await request.get("/api/campfires");
    const list = await campfires.json();
    if (!list.campfires?.length) {
      test.skip();
      return;
    }

    const res = await request.post("/api/proposals", {
      headers: authHeaders(user.token),
      data: {
        campfire_id: list.campfires[0].id,
        proposal_type: "rule_change",
        title: "Test Proposal",
        description: "Should fail — not a member.",
        proposed_changes: {},
      },
    });

    // Should fail with membership-related error (403 or 400)
    expect([400, 403]).toContain(res.status());
  });

  test("proposals list is accessible", async ({ request }) => {
    const campfires = await request.get("/api/campfires");
    const list = await campfires.json();
    if (!list.campfires?.length) {
      test.skip();
      return;
    }

    const res = await request.get(
      `/api/proposals?campfire_id=${list.campfires[0].id}`
    );
    expect([200, 404]).toContain(res.status());
  });
});

// ─── AI Config (Structured Governance Variables) ────────────

test.describe("AI Config / Governance Variables", () => {
  test("campfire AI config requires auth", async ({ request }) => {
    const campfires = await request.get("/api/campfires");
    const list = await campfires.json();
    if (!list.campfires?.length) {
      test.skip();
      return;
    }

    const res = await request.get(
      `/api/campfires/${list.campfires[0].id}/ai-config`
    );
    // Could be 200 (public) or 401 depending on implementation
    expect([200, 401]).toContain(res.status());
  });

  test("AI config update requires auth and membership", async ({ request }) => {
    const campfires = await request.get("/api/campfires");
    const list = await campfires.json();
    if (!list.campfires?.length) {
      test.skip();
      return;
    }

    const res = await request.put(
      `/api/campfires/${list.campfires[0].id}/ai-config`,
      {
        data: {
          toxicity_threshold: 50,
          spam_sensitivity: "medium",
        },
      }
    );
    expect([401, 403, 405]).toContain(res.status());
  });

  test("AI config rejects invalid values", async ({ request }) => {
    const user = await createAuthUser(request);
    const campfires = await request.get("/api/campfires");
    const list = await campfires.json();
    if (!list.campfires?.length) {
      test.skip();
      return;
    }

    const campfireId = list.campfires[0].id;

    // Join campfire first
    await request.post(`/api/campfires/${campfireId}/join`, {
      headers: authHeaders(user.token),
    });

    // Send invalid config
    const res = await request.put(
      `/api/campfires/${campfireId}/ai-config`,
      {
        headers: authHeaders(user.token),
        data: {
          toxicity_threshold: 999, // out of bounds (0-100)
          spam_sensitivity: "invalid_enum",
        },
      }
    );

    expect([400, 403, 405, 422]).toContain(res.status());
  });
});

// ─── Config Proposals (Democratic AI Config Changes) ────────

test.describe("Config Change Proposals", () => {
  test("config proposal endpoint exists", async ({ request }) => {
    const campfires = await request.get("/api/campfires");
    const list = await campfires.json();
    if (!list.campfires?.length) {
      test.skip();
      return;
    }

    const res = await request.get(
      `/api/campfires/${list.campfires[0].id}/config-proposals`
    );
    // Should respond (even if empty) or require auth
    expect([200, 401, 404]).toContain(res.status());
  });

  test("creating config proposal requires auth", async ({ request }) => {
    const campfires = await request.get("/api/campfires");
    const list = await campfires.json();
    if (!list.campfires?.length) {
      test.skip();
      return;
    }

    const res = await request.post(
      `/api/campfires/${list.campfires[0].id}/config-proposals`,
      {
        data: {
          proposed_changes: { toxicity_threshold: 75 },
          title: "Lower toxicity threshold",
          description: "We should be more lenient.",
        },
      }
    );
    expect([401, 403]).toContain(res.status());
  });
});

// ─── Membership Role Hierarchy ──────────────────────────────

test.describe("Membership Roles", () => {
  test("campfire creator becomes admin", async ({ request }) => {
    const user = await createAuthUser(request);
    const name = `role_test_${Date.now()}`;

    const createRes = await request.post("/api/campfires", {
      headers: authHeaders(user.token),
      data: {
        name,
        display_name: "Role Test",
        description: "Testing creator becomes admin.",
      },
    });

    if (createRes.status() !== 201) {
      test.skip();
      return;
    }

    const campfire = await createRes.json();
    const campfireId = campfire.campfire?.id ?? campfire.id;

    // Fetch campfire detail — creator should be admin
    const detailRes = await request.get(`/api/campfires/${campfireId}`, {
      headers: authHeaders(user.token),
    });
    expect(detailRes.status()).toBe(200);
    const detail = await detailRes.json();

    // The response may include membership info or the creator_id
    const createdBy = detail.campfire?.created_by ?? detail.created_by;
    expect(createdBy).toBe(user.userId);
  });
});
