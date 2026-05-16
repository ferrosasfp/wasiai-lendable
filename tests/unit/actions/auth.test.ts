import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { signIn, signUp, signOut } from "@/actions/auth";

type SupaStubOpts = {
  signInError?: { code: string } | null;
};

function buildSupabaseStub(opts: SupaStubOpts = {}) {
  return {
    auth: {
      signInWithPassword: vi
        .fn()
        .mockResolvedValue({ error: opts.signInError ?? null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

type AdminStubOpts = {
  createUserError?: { code: string } | null;
};

function buildAdminStub(opts: AdminStubOpts = {}) {
  return {
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({
          data: { user: { id: "mock-uuid", email: "a@b.com" } },
          error: opts.createUserError ?? null,
        }),
      },
    },
  };
}

function fd(obj: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.append(k, v);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signUp — WKH-COBRAYA-DAPP-SHELL W3 + DD-P (AC-4)", () => {
  it("DD-P: uses admin.createUser with email_confirm:true + injects DD-O metadata", async () => {
    const admin = buildAdminStub();
    const supabase = buildSupabaseStub();
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(admin);
    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(supabase);
    await expect(
      signUp({}, fd({ email: "a@b.com", password: "abc12345" })),
    ).rejects.toThrow("REDIRECT:/onboarding/step/1");
    expect(redirect).toHaveBeenCalledWith("/onboarding/step/1");
    // Admin createUser was called with email_confirm true (LUM-100 per-user) +
    // DD-O metadata guard for the trigger.
    expect(admin.auth.admin.createUser).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "abc12345",
      email_confirm: true,
      user_metadata: { app: "cobraya" },
    });
    // After admin createUser, the anon client signs in to set session cookies.
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "a@b.com",
      password: "abc12345",
    });
  });

  it("returns Zod validation error when password fails policy", async () => {
    const admin = buildAdminStub();
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(admin);
    const result = await signUp({}, fd({ email: "a@b.com", password: "weak" }));
    expect(result.error).toContain("al menos 8 caracteres");
    expect(admin.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it("maps email_exists to ES-MX copy and logs CD-31-safe", async () => {
    const admin = buildAdminStub({ createUserError: { code: "email_exists" } });
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(admin);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await signUp({}, fd({ email: "a@b.com", password: "abc12345" }));
    expect(result.error).toBe("Este correo ya está registrado.");
    expect(warn).toHaveBeenCalledWith("[cobraya-action]", {
      action: "signUp",
      errorCode: "email_exists",
    });
    warn.mockRestore();
  });

  it("DD-P: when admin succeeds but signInWithPassword fails, surfaces error and does NOT redirect", async () => {
    const admin = buildAdminStub();
    const supabase = buildSupabaseStub({
      signInError: { code: "invalid_credentials" },
    });
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(admin);
    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(supabase);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await signUp({}, fd({ email: "a@b.com", password: "abc12345" }));
    expect(result.error).toBe("Correo o contraseña incorrectos.");
    expect(redirect).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("signIn — WKH-COBRAYA-DAPP-SHELL W3", () => {
  it("redirects to /dashboard on success", async () => {
    const stub = buildSupabaseStub();
    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(stub);
    await expect(
      signIn({}, fd({ email: "a@b.com", password: "x" })),
    ).rejects.toThrow("REDIRECT:/dashboard");
  });

  it("maps invalid_credentials to ES-MX copy", async () => {
    const stub = buildSupabaseStub({ signInError: { code: "invalid_credentials" } });
    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(stub);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await signIn({}, fd({ email: "a@b.com", password: "x" }));
    expect(result.error).toBe("Correo o contraseña incorrectos.");
    warn.mockRestore();
  });
});

describe("signOut — WKH-COBRAYA-DAPP-SHELL W3 (AC-5)", () => {
  it("calls supabase.auth.signOut and redirects /login", async () => {
    const stub = buildSupabaseStub();
    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(stub);
    await expect(signOut()).rejects.toThrow("REDIRECT:/login");
    expect(stub.auth.signOut).toHaveBeenCalled();
  });
});
