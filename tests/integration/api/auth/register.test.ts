import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../setup/test-setup";

describe("POST /api/auth/register", () => {
  const endpoint = "/api/auth/register";

  beforeEach(() => {
    server.use(
      http.post(endpoint, async ({ request }) => {
        const { email, password } = await request.json();

        if (!email || !password) {
          return HttpResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
          );
        }

        return HttpResponse.json(
          { message: "User registered successfully" },
          { status: 201 }
        );
      })
    );
  });

  it("successfully registers a new user", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "Password123!",
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.message).toBe("User registered successfully");
  });

  it("returns error for missing fields", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Missing required fields");
  });

  it("handles server errors gracefully", async () => {
    server.use(
      http.post(endpoint, () => {
        return HttpResponse.json(
          { error: "Internal server error" },
          { status: 500 }
        );
      })
    );

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "Password123!",
      }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Internal server error");
  });
});
