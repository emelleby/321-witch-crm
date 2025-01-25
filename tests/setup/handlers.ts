import { http, HttpResponse } from "msw";

export const handlers = [
  // Auth endpoints
  http.post("*/auth/v1/signup", async () => {
    return HttpResponse.json({
      data: {
        user: {
          id: "test-user-id",
          email: "test@example.com",
        },
      },
      error: null,
    });
  }),

  // Profile endpoints
  http.post("*/rest/v1/profiles", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      data: {
        id: "test-profile-id",
        ...body,
      },
      error: null,
    });
  }),

  // Organization endpoints
  http.post("*/rest/v1/organizations", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      data: {
        id: "test-org-id",
        ...body,
      },
      error: null,
    });
  }),

  http.get("*/rest/v1/organizations", () => {
    return HttpResponse.json({
      data: [
        {
          id: "test-org-id",
          name: "Test Organization",
          domain: "test.com",
        },
      ],
    });
  }),
];
