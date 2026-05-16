// @vitest-environment node
// jsdom's global Headers doesn't match Next.js' internal Headers prototype,
// which breaks the `instanceof Headers` check in NextResponse.next({ request }).
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { middleware } from "@/middleware";

type MaybeProfile = { onboarding_completed: boolean } | null;

function buildSupabase(user: { id: string } | null, profile: MaybeProfile = null) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
    })),
  };
}

function buildRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://stub.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "stub-anon";
});

describe("middleware — WKH-COBRAYA-DAPP-SHELL W4", () => {
  it("AC-1: anon user on /dashboard → redirect /login", async () => {
    (createServerClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      buildSupabase(null),
    );
    const res = await middleware(buildRequest("/dashboard"));
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") || "";
    expect(loc).toContain("/login");
  });

  it("AC-2: authed user with onboarding pending on /dashboard → /onboarding/step/1", async () => {
    const supa = buildSupabase({ id: "u1" }, { onboarding_completed: false });
    (createServerClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(supa);
    const res = await middleware(buildRequest("/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/onboarding/step/1");
    expect(supa.from).toHaveBeenCalledWith("cobraya_profiles");
  });

  it("AC-3: authed user with onboarding complete on /login → /dashboard", async () => {
    const supa = buildSupabase({ id: "u1" }, { onboarding_completed: true });
    (createServerClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(supa);
    const res = await middleware(buildRequest("/login"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard");
  });

  it("bounce: authed user pending on /signup → /onboarding/step/1", async () => {
    const supa = buildSupabase({ id: "u1" }, { onboarding_completed: false });
    (createServerClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(supa);
    const res = await middleware(buildRequest("/signup"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/onboarding/step/1");
  });

  it("edge: maybeSingle returns null (trigger race) → treated as pending → /onboarding/step/1", async () => {
    const supa = buildSupabase({ id: "u1" }, null);
    (createServerClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(supa);
    const res = await middleware(buildRequest("/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/onboarding/step/1");
  });

  it("splash / is auth-exempt — anon stays on /", async () => {
    (createServerClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      buildSupabase(null),
    );
    const res = await middleware(buildRequest("/"));
    // 200/NextResponse.next is the un-redirected case
    expect(res.status).toBe(200);
  });

  it("anon on /signup is auth-exempt — no redirect", async () => {
    (createServerClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      buildSupabase(null),
    );
    const res = await middleware(buildRequest("/signup"));
    expect(res.status).toBe(200);
  });

  it("authed user inside /onboarding/* with pending profile is NOT redirected (avoids loop)", async () => {
    const supa = buildSupabase({ id: "u1" }, { onboarding_completed: false });
    (createServerClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(supa);
    const res = await middleware(buildRequest("/onboarding/step/3"));
    expect(res.status).toBe(200);
  });
});
