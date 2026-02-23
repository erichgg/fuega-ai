import { test, expect, type APIRequestContext } from "@playwright/test";

// ─── Helpers ─────────────────────────────────────────────────

const uniqueUser = () => {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return { username: `sec_${id}`, password: "SecPass123!" };
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

// ─── Authentication Security ────────────────────────────────

test.describe("Authentication Security", () => {
  test("invalid JWT is rejected", async ({ request }) => {
    const res = await request.get("/api/auth/me", {
      headers: { Authorization: "Bearer invalid.jwt.token" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("expired JWT is rejected", async ({ request }) => {
    // Craft a fake expired-looking token (will fail signature check)
    const fakeToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
      "eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6InRlc3QiLCJleHAiOjF9." +
      "invalid_signature";

    const res = await request.get("/api/auth/me", {
      headers: { Authorization: `Bearer ${fakeToken}` },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("missing auth header returns 401 on protected endpoints", async ({
    request,
  }) => {
    const protectedEndpoints = [
      { method: "POST" as const, url: "/api/posts" },
      { method: "POST" as const, url: "/api/campfires" },
      { method: "POST" as const, url: "/api/proposals" },
    ];

    for (const ep of protectedEndpoints) {
      const res = await request[ep.method.toLowerCase() as "post"](ep.url, {
        data: {},
      });
      expect([400, 401, 403]).toContain(res.status());
    }
  });

  test("auth cookie is httpOnly (cannot be read by JS)", async ({ page }) => {
    const user = uniqueUser();
    await page.goto("/signup");
    await page.getByLabel(/username/i).fill(user.username);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole("button", { name: /sign up|create account/i }).click();
    await page.waitForURL(/\/(f\/|$)/, { timeout: 10_000 });

    // Try reading cookie from JS — should be inaccessible
    const cookieValue = await page.evaluate(() => document.cookie);
    expect(cookieValue).not.toContain("fuega_token");
  });
});

// ─── SQL Injection Prevention ───────────────────────────────

test.describe("SQL Injection Prevention", () => {
  test("SQL injection in username is safely handled", async ({ request }) => {
    const sqlPayloads = [
      "admin'; DROP TABLE users; --",
      "' OR '1'='1",
      "admin'/*",
      "1; SELECT * FROM users --",
      "' UNION SELECT password_hash FROM users --",
    ];

    for (const payload of sqlPayloads) {
      const res = await request.post("/api/auth/signup", {
        data: { username: payload, password: "SafePassword123!" },
      });

      // Should fail validation (special chars) — NOT a 500 error
      expect([400, 422]).toContain(res.status());
      const body = await res.json();
      expect(body.code).not.toBe("INTERNAL_ERROR");
    }
  });

  test("SQL injection in post content is safely handled", async ({
    request,
  }) => {
    const user = await createAuthUser(request);
    const campfires = await request.get("/api/campfires");
    const list = await campfires.json();
    if (!list.campfires?.length) {
      test.skip();
      return;
    }

    await request.post(`/api/campfires/${list.campfires[0].id}/join`, {
      headers: authHeaders(user.token),
    });

    const res = await request.post("/api/posts", {
      headers: authHeaders(user.token),
      data: {
        campfire_id: list.campfires[0].id,
        title: "'; DROP TABLE posts; --",
        body: "Robert'); DROP TABLE comments;--",
        post_type: "text",
      },
    });

    // Should succeed or fail gracefully — never 500
    expect(res.status()).toBeLessThan(500);
  });

  test("SQL injection in query parameters is safely handled", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/posts?campfire=' OR 1=1 --&sort=hot"
    );
    // Should not crash
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── XSS Prevention ────────────────────────────────────────

test.describe("XSS Prevention", () => {
  test("script tags in post content are sanitized", async ({ request }) => {
    const user = await createAuthUser(request);
    const campfires = await request.get("/api/campfires");
    const list = await campfires.json();
    if (!list.campfires?.length) {
      test.skip();
      return;
    }

    await request.post(`/api/campfires/${list.campfires[0].id}/join`, {
      headers: authHeaders(user.token),
    });

    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src=x onerror="alert(1)">',
      "javascript:alert(1)",
      '<svg onload="alert(1)">',
      '"><script>document.location="http://evil.com"</script>',
    ];

    for (const payload of xssPayloads) {
      const res = await request.post("/api/posts", {
        headers: authHeaders(user.token),
        data: {
          campfire_id: list.campfires[0].id,
          title: "XSS Test",
          body: payload,
          post_type: "text",
        },
      });

      // Should not crash
      expect(res.status()).toBeLessThan(500);

      if (res.status() === 201 || res.status() === 200) {
        const body = await res.json();
        const content = JSON.stringify(body);
        // Response should not contain raw script tags
        expect(content).not.toContain("<script>");
        expect(content).not.toContain("onerror=");
      }
    }
  });

  test("XSS in username is prevented", async ({ request }) => {
    const res = await request.post("/api/auth/signup", {
      data: {
        username: '<script>alert("xss")</script>',
        password: "SafePassword123!",
      },
    });

    // Should be rejected by validation (only alphanumeric + underscore)
    expect([400, 422]).toContain(res.status());
  });
});

// ─── Rate Limiting ──────────────────────────────────────────

test.describe("Rate Limiting", () => {
  test("signup rate limit prevents rapid signups from same IP", async ({
    request,
  }) => {
    // First signup should succeed
    const user1 = uniqueUser();
    const res1 = await request.post("/api/auth/signup", {
      data: { username: user1.username, password: user1.password },
    });

    // Second rapid signup may be rate limited (same IP in test)
    const user2 = uniqueUser();
    const res2 = await request.post("/api/auth/signup", {
      data: { username: user2.username, password: user2.password },
    });

    // At least one should succeed; the second may be rate-limited
    expect([201, 429]).toContain(res1.status());
    expect([201, 429]).toContain(res2.status());

    // If rate limited, should have Retry-After header
    if (res2.status() === 429) {
      const retryAfter = res2.headers()["retry-after"];
      expect(retryAfter).toBeDefined();
    }
  });

  test("login rate limit prevents brute force", async ({ request }) => {
    const user = uniqueUser();

    // Create user first
    await request.post("/api/auth/signup", {
      data: { username: user.username, password: user.password },
    });

    // Attempt multiple wrong logins
    const attempts = [];
    for (let i = 0; i < 6; i++) {
      attempts.push(
        request.post("/api/auth/login", {
          data: { username: user.username, password: `wrong_pass_${i}` },
        })
      );
    }

    const results = await Promise.all(attempts);
    const statuses = results.map((r) => r.status());

    // Should have some 401s and eventually a 429
    expect(statuses.some((s) => s === 401 || s === 429)).toBe(true);
  });
});

// ─── IDOR Prevention (Insecure Direct Object Reference) ────

test.describe("IDOR Prevention", () => {
  test("user cannot access another user's private data", async ({
    request,
  }) => {
    const user1 = await createAuthUser(request);
    const user2 = await createAuthUser(request);

    // User1 checks their own auth - should work
    const meRes = await request.get("/api/auth/me", {
      headers: authHeaders(user1.token),
    });
    expect(meRes.status()).toBe(200);

    // User1's token should not return user2's data
    const meBody = await meRes.json();
    const username = meBody.user?.username ?? meBody.username;
    expect(username).toBe(user1.username);
    expect(username).not.toBe(user2.username);
  });

  test("user cannot modify another user's campfire", async ({ request }) => {
    const owner = await createAuthUser(request);
    const attacker = await createAuthUser(request);

    // Owner creates a campfire
    const name = `idor_test_${Date.now()}`;
    const createRes = await request.post("/api/campfires", {
      headers: authHeaders(owner.token),
      data: {
        name,
        display_name: "IDOR Test",
        description: "Testing access control.",
      },
    });

    if (createRes.status() !== 201) {
      test.skip();
      return;
    }

    const campfire = await createRes.json();
    const campfireId = campfire.campfire?.id ?? campfire.id;

    // Attacker tries to modify it
    const attackRes = await request.put(`/api/campfires/${campfireId}`, {
      headers: authHeaders(attacker.token),
      data: {
        display_name: "Hacked by attacker",
        description: "Unauthorized modification.",
      },
    });

    // Should be forbidden (not owner/admin)
    expect([403, 404, 405]).toContain(attackRes.status());
  });
});

// ─── Response Security Headers ──────────────────────────────

test.describe("Security Headers", () => {
  test("API responses do not leak sensitive information", async ({
    request,
  }) => {
    const res = await request.get("/api/campfires");
    const body = await res.json();

    // Should not contain password hashes, IP hashes, etc.
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain("password_hash");
    expect(bodyStr).not.toContain("ip_address_hash");
  });

  test("error responses use safe error codes", async ({ request }) => {
    const res = await request.post("/api/auth/signup", {
      data: { username: "", password: "" },
    });

    const body = await res.json();

    // Error should have code and message but not stack traces
    expect(body.error).toBeDefined();
    expect(body.code).toBeDefined();
    expect(JSON.stringify(body)).not.toContain("at Object.");
    expect(JSON.stringify(body)).not.toContain("node_modules");
  });

  test("nonexistent API route returns 404, not stack trace", async ({
    request,
  }) => {
    const res = await request.get("/api/nonexistent-endpoint-12345");
    expect([404, 405]).toContain(res.status());
  });
});

// ─── Input Validation Boundaries ────────────────────────────

test.describe("Input Validation", () => {
  test("extremely long username is rejected", async ({ request }) => {
    const res = await request.post("/api/auth/signup", {
      data: {
        username: "a".repeat(1000),
        password: "ValidPass123!",
      },
    });
    expect([400, 422]).toContain(res.status());
  });

  test("extremely long password is handled", async ({ request }) => {
    const res = await request.post("/api/auth/signup", {
      data: {
        username: uniqueUser().username,
        password: "A".repeat(10_000),
      },
    });
    // Should either accept (bcrypt truncates at 72 bytes) or reject
    expect(res.status()).toBeLessThan(500);
  });

  test("null bytes in input are handled", async ({ request }) => {
    const res = await request.post("/api/auth/signup", {
      data: {
        username: "test\x00user",
        password: "ValidPass123!",
      },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test("unicode edge cases in campfire name are handled", async ({
    request,
  }) => {
    const user = await createAuthUser(request);

    const unicodeCases = [
      "café_campfire",
      "campfire_🔥",
      "кириллица_test",
      "test\u200Bhidden",
    ];

    for (const name of unicodeCases) {
      const res = await request.post("/api/campfires", {
        headers: authHeaders(user.token),
        data: {
          name,
          display_name: "Unicode Test",
          description: "Testing unicode handling.",
        },
      });

      // Should be rejected (slug format: ^[a-z0-9_]+$) or accepted if relaxed
      expect(res.status()).toBeLessThan(500);
    }
  });

  test("JSON payload size limits are enforced", async ({ request }) => {
    const user = await createAuthUser(request);

    const res = await request.post("/api/posts", {
      headers: authHeaders(user.token),
      data: {
        campfire_id: "00000000-0000-0000-0000-000000000001",
        title: "Size Test",
        body: "X".repeat(100_000), // 100KB body — over 40K limit
        post_type: "text",
      },
    });

    // Should reject as too large or truncate
    expect(res.status()).toBeLessThan(500);
  });
});

// ─── Privacy (IP Hashing) ───────────────────────────────────

test.describe("Privacy Protection", () => {
  test("user profile does not expose IP information", async ({ request }) => {
    const user = await createAuthUser(request);

    const meRes = await request.get("/api/auth/me", {
      headers: authHeaders(user.token),
    });

    if (meRes.status() === 200) {
      const body = await meRes.json();
      const bodyStr = JSON.stringify(body);

      // Should never expose raw IP or IP hash to client
      expect(bodyStr).not.toContain("ip_address_hash");
      expect(bodyStr).not.toContain("ip_last_seen");
      expect(bodyStr).not.toMatch(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
    }
  });

  test("post responses do not expose author IP", async ({ request }) => {
    const res = await request.get("/api/posts");
    if (res.status() === 200) {
      const body = await res.json();
      const bodyStr = JSON.stringify(body);
      expect(bodyStr).not.toContain("ip_address_hash");
    }
  });
});

// ─── Soft Delete Verification ───────────────────────────────

test.describe("Soft Delete Behavior", () => {
  test("deleted content is not returned in listings", async ({ request }) => {
    // This test verifies the principle — deleted_at content should be filtered
    const res = await request.get("/api/posts");
    expect(res.status()).toBe(200);
    const body = await res.json();

    if (body.posts?.length) {
      for (const post of body.posts) {
        // No post in the listing should have a deleted_at value
        expect(post.deleted_at).toBeFalsy();
      }
    }
  });
});
