import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createServerClient } from "@/utils/supabase/server-client";
import * as supabaseJs from "@supabase/supabase-js";

// Spy on the createClient function
const createClientSpy = vi.spyOn(supabaseJs, "createClient");

// Mock the createClient implementation
createClientSpy.mockImplementation(() => ({
  storage: {
    from: vi.fn(() => ({
      download: vi.fn(),
    })),
  },
}));

describe("createServerClient", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...OLD_ENV }; // Make a copy
  });

  afterEach(() => {
    process.env = OLD_ENV; // Restore old environment
    vi.clearAllMocks();
  });

  it("should throw an error if environment variables are missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => createServerClient()).toThrow(
      "Missing Supabase environment variables"
    );
  });

  it("should return a SupabaseClient instance when environment variables are set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

    const client = createServerClient();
    expect(client).toBeDefined();
    expect(client.storage).toBeDefined();
    expect(client.storage.from).toBeInstanceOf(Function);
  });

  it("should create client with correct configuration", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

    createServerClient();

    expect(createClientSpy).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "test-service-role-key",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  });
});
