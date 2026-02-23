import { test, expect, type Page } from "@playwright/test";

// ─── Helpers ─────────────────────────────────────────────────

const uniqueUser = () => {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return { username: `e2e_${id}`, password: "TestPass123!" };
};

async function signup(page: Page, user: { username: string; password: string }) {
  await page.goto("/signup");
  await page.getByLabel(/username/i).fill(user.username);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole("button", { name: /sign up|create account/i }).click();
}

async function login(page: Page, user: { username: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel(/username/i).fill(user.username);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
}

async function signupAndGetToken(
  page: Page,
  user: { username: string; password: string }
): Promise<string> {
  const response = await page.request.post("/api/auth/signup", {
    data: { username: user.username, password: user.password },
  });
  const body = await response.json();
  return body.token as string;
}

// ─── Test Flow 1: New User Journey ──────────────────────────

test.describe("New User Journey", () => {
  test("visitor can view landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/fuega/i);
    // Landing page should have CTA to sign up or explore
    await expect(
      page.getByRole("link", { name: /sign up|join|get started/i }).first()
    ).toBeVisible();
  });

  test("visitor can navigate to static pages", async ({ page }) => {
    // About
    await page.goto("/about");
    await expect(page.locator("h1, h2").first()).toBeVisible();

    // How it works
    await page.goto("/how-it-works");
    await expect(page.locator("h1, h2").first()).toBeVisible();

    // Security
    await page.goto("/security");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("user can sign up with valid credentials", async ({ page }) => {
    const user = uniqueUser();
    await signup(page, user);

    // Should redirect to app or show success
    await page.waitForURL(/\/(f\/|$)/, { timeout: 10_000 });
    // Should see username or logged-in state somewhere
    await expect(page.getByText(user.username).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("signup rejects invalid username (too short)", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel(/username/i).fill("ab");
    await page.getByLabel(/password/i).fill("TestPass123!");
    await page.getByRole("button", { name: /sign up|create account/i }).click();

    await expect(
      page.getByText(/at least 3 characters|too short|invalid/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("signup rejects weak password", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel(/username/i).fill(uniqueUser().username);
    await page.getByLabel(/password/i).fill("short");
    await page.getByRole("button", { name: /sign up|create account/i }).click();

    await expect(
      page.getByText(/at least 8 characters|too short|password/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("signup rejects duplicate username", async ({ page }) => {
    const user = uniqueUser();

    // Sign up first time via API
    const res = await page.request.post("/api/auth/signup", {
      data: { username: user.username, password: user.password },
    });
    expect(res.status()).toBe(201);

    // Try same username via UI
    await signup(page, user);

    await expect(
      page.getByText(/already taken|exists|in use/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("user can log in after signing up", async ({ page }) => {
    const user = uniqueUser();

    // Signup via API
    await page.request.post("/api/auth/signup", {
      data: { username: user.username, password: user.password },
    });

    // Login via UI
    await login(page, user);
    await page.waitForURL(/\/(f\/|$)/, { timeout: 10_000 });
    await expect(page.getByText(user.username).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("login rejects wrong password", async ({ page }) => {
    const user = uniqueUser();

    // Signup via API
    await page.request.post("/api/auth/signup", {
      data: { username: user.username, password: user.password },
    });

    // Login with wrong password
    await page.goto("/login");
    await page.getByLabel(/username/i).fill(user.username);
    await page.getByLabel(/password/i).fill("WrongPassword999!");
    await page.getByRole("button", { name: /log in|sign in/i }).click();

    await expect(
      page.getByText(/invalid|incorrect|wrong|failed/i).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

// ─── Test Flow 2: Post Lifecycle ────────────────────────────

test.describe("Post Lifecycle", () => {
  let authToken: string;
  const user = uniqueUser();

  test.beforeAll(async ({ request }) => {
    const res = await request.post("/api/auth/signup", {
      data: { username: user.username, password: user.password },
    });
    const body = await res.json();
    authToken = body.token;
  });

  test("authenticated user can create a post via API", async ({ request }) => {
    // First join a campfire
    const campfires = await request.get("/api/campfires");
    const campfireList = await campfires.json();

    // Skip if no campfires seeded
    if (!campfireList.campfires?.length) {
      test.skip();
      return;
    }

    const campfireId = campfireList.campfires[0].id;

    // Join campfire
    await request.post(`/api/campfires/${campfireId}/join`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    // Create post
    const postRes = await request.post("/api/posts", {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        campfire_id: campfireId,
        title: "E2E Test Post",
        body: "This is an automated integration test post.",
        post_type: "text",
      },
    });

    expect(postRes.status()).toBe(201);
    const postBody = await postRes.json();
    expect(postBody.post).toBeDefined();
    expect(postBody.post.title).toBe("E2E Test Post");
  });

  test("unauthenticated user cannot create a post", async ({ request }) => {
    const res = await request.post("/api/posts", {
      data: {
        campfire_id: "00000000-0000-0000-0000-000000000001",
        title: "Should fail",
        body: "No auth token.",
        post_type: "text",
      },
    });
    expect(res.status()).toBe(401);
  });

  test("posts list is accessible without auth", async ({ request }) => {
    const res = await request.get("/api/posts");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.posts).toBeDefined();
    expect(Array.isArray(body.posts)).toBe(true);
  });

  test("posts can be filtered by campfire", async ({ request }) => {
    const campfires = await request.get("/api/campfires");
    const list = await campfires.json();
    if (!list.campfires?.length) {
      test.skip();
      return;
    }

    const res = await request.get(
      `/api/posts?campfire=${list.campfires[0].id}`
    );
    expect(res.status()).toBe(200);
  });
});

// ─── Test Flow 3: Campfire Membership ───────────────────────

test.describe("Campfire Membership", () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const user = uniqueUser();
    const res = await request.post("/api/auth/signup", {
      data: { username: user.username, password: user.password },
    });
    const body = await res.json();
    authToken = body.token;
  });

  test("user can list campfires", async ({ request }) => {
    const res = await request.get("/api/campfires");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.campfires).toBeDefined();
  });

  test("user can join and leave a campfire", async ({ request }) => {
    const campfires = await request.get("/api/campfires");
    const list = await campfires.json();
    if (!list.campfires?.length) {
      test.skip();
      return;
    }

    const campfireId = list.campfires[0].id;
    const headers = { Authorization: `Bearer ${authToken}` };

    // Join
    const joinRes = await request.post(
      `/api/campfires/${campfireId}/join`,
      { headers }
    );
    expect([200, 201, 409]).toContain(joinRes.status()); // 409 if already member

    // Leave
    const leaveRes = await request.post(
      `/api/campfires/${campfireId}/leave`,
      { headers }
    );
    expect([200, 204]).toContain(leaveRes.status());
  });

  test("unauthenticated user cannot join a campfire", async ({ request }) => {
    const campfires = await request.get("/api/campfires");
    const list = await campfires.json();
    if (!list.campfires?.length) {
      test.skip();
      return;
    }

    const res = await request.post(
      `/api/campfires/${list.campfires[0].id}/join`
    );
    expect(res.status()).toBe(401);
  });
});

// ─── Test Flow 4: Voting ────────────────────────────────────

test.describe("Spark/Douse Voting", () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const user = uniqueUser();
    const res = await request.post("/api/auth/signup", {
      data: { username: user.username, password: user.password },
    });
    const body = await res.json();
    authToken = body.token;
  });

  test("authenticated user can spark a post", async ({ request }) => {
    const headers = { Authorization: `Bearer ${authToken}` };

    // Get a post to vote on
    const postsRes = await request.get("/api/posts");
    const posts = await postsRes.json();
    if (!posts.posts?.length) {
      test.skip();
      return;
    }

    const postId = posts.posts[0].id;
    const voteRes = await request.post(`/api/posts/${postId}/vote`, {
      headers,
      data: { vote_type: "spark" },
    });

    // 200 = voted, 201 = created, 409 = already voted
    expect([200, 201, 409]).toContain(voteRes.status());
  });

  test("unauthenticated user cannot vote", async ({ request }) => {
    const postsRes = await request.get("/api/posts");
    const posts = await postsRes.json();
    if (!posts.posts?.length) {
      test.skip();
      return;
    }

    const res = await request.post(`/api/posts/${posts.posts[0].id}/vote`, {
      data: { vote_type: "spark" },
    });
    expect(res.status()).toBe(401);
  });
});

// ─── Test Flow 5: Comment Lifecycle ─────────────────────────

test.describe("Comment Lifecycle", () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const user = uniqueUser();
    const res = await request.post("/api/auth/signup", {
      data: { username: user.username, password: user.password },
    });
    const body = await res.json();
    authToken = body.token;
  });

  test("authenticated user can comment on a post", async ({ request }) => {
    const headers = { Authorization: `Bearer ${authToken}` };

    const postsRes = await request.get("/api/posts");
    const posts = await postsRes.json();
    if (!posts.posts?.length) {
      test.skip();
      return;
    }

    const postId = posts.posts[0].id;
    const commentRes = await request.post(`/api/posts/${postId}/comments`, {
      headers,
      data: { body: "E2E integration test comment." },
    });

    expect([200, 201]).toContain(commentRes.status());
    const commentBody = await commentRes.json();
    expect(commentBody.comment || commentBody.body).toBeDefined();
  });

  test("comments list is accessible", async ({ request }) => {
    const postsRes = await request.get("/api/posts");
    const posts = await postsRes.json();
    if (!posts.posts?.length) {
      test.skip();
      return;
    }

    const res = await request.get(
      `/api/posts/${posts.posts[0].id}/comments`
    );
    expect(res.status()).toBe(200);
  });

  test("unauthenticated user cannot comment", async ({ request }) => {
    const postsRes = await request.get("/api/posts");
    const posts = await postsRes.json();
    if (!posts.posts?.length) {
      test.skip();
      return;
    }

    const res = await request.post(
      `/api/posts/${posts.posts[0].id}/comments`,
      { data: { body: "Should fail" } }
    );
    expect(res.status()).toBe(401);
  });
});

// ─── Test Flow 6: Auth Cookie Persistence ───────────────────

test.describe("Auth Cookie Persistence", () => {
  test("auth cookie persists across page navigations", async ({ page }) => {
    const user = uniqueUser();
    await signup(page, user);
    await page.waitForURL(/\/(f\/|$)/, { timeout: 10_000 });

    // Navigate to another page
    await page.goto("/about");
    await page.goto("/");

    // Should still show logged-in state (check /api/auth/me)
    const meRes = await page.request.get("/api/auth/me");
    expect(meRes.status()).toBe(200);
    const me = await meRes.json();
    expect(me.user?.username ?? me.username).toBe(user.username);
  });

  test("logout clears auth state", async ({ page }) => {
    const user = uniqueUser();
    await signup(page, user);
    await page.waitForURL(/\/(f\/|$)/, { timeout: 10_000 });

    // Logout via API
    await page.request.post("/api/auth/logout");

    // /me should now fail
    const meRes = await page.request.get("/api/auth/me");
    expect([401, 403]).toContain(meRes.status());
  });
});
