import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const migrationsDir = path.join(process.cwd(), "supabase", "migrations");

function allMigrationSql(): string {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(path.join(migrationsDir, f), "utf8"))
    .join("\n");
}

describe("Phase 2 database migrations", () => {
  const sql = allMigrationSql();

  const requiredTables = [
    "profiles",
    "businesses",
    "business_locations",
    "business_members",
    "business_claims",
    "categories",
    "subcategories",
    "products",
    "services",
    "menus",
    "menu_categories",
    "business_hours",
    "special_hours",
    "photos",
    "attributes",
    "tags",
    "reviews",
    "ratings",
    "offers",
    "favorites",
    "searches",
    "search_events",
    "search_actions",
    "leads",
    "notifications",
    "reports",
    "plans",
    "subscriptions",
    "payments",
    "invoices",
    "subscription_events",
    "sponsored_placements",
    "audit_logs",
    "geographic_areas",
    "seo_pages",
  ];

  it("includes migrations for all required entities", () => {
    for (const table of requiredTables) {
      expect(sql.toLowerCase()).toContain(`create table public.${table}`);
    }
  });

  it("creates users compatibility view", () => {
    expect(sql.toLowerCase()).toContain("create or replace view public.users");
  });

  it("enables RLS on core tables", () => {
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("businesses_public_read_published");
    expect(sql).toContain("favorites_own");
    expect(sql).toContain("is_business_owner");
    expect(sql).toContain("is_admin");
    expect(sql).toContain("is_super_admin");
  });

  it("defines PostGIS nearby and ownership helpers", () => {
    expect(sql).toContain("nearby_businesses");
    expect(sql).toContain("distance_meters");
    expect(sql).toContain("validate_business_ownership");
    expect(sql).toContain("aggregate_business_rating");
    expect(sql).toContain("refresh_business_rating");
    expect(sql).toContain("business_coordinates");
  });

  it("uses spatial indexes", () => {
    expect(sql.toLowerCase()).toContain("using gist");
    expect(sql.toLowerCase()).toContain("geography(point");
  });

  it("includes monetization and security hardening migrations", () => {
    expect(sql).toContain("subscription_events");
    expect(sql).toContain("sponsored_placements");
    expect(sql).toContain("business_claims_guard_status");
    expect(sql).toContain("reviews_guard_owner_columns");
    expect(sql).toContain("businesses_guard_trust_fields");
  });

  it("defines transactional listing submission and admin moderation", () => {
    expect(sql).toContain("submit_business_listing");
    expect(sql).toContain("submit_business_claim");
    expect(sql).toContain("save_owner_workspace");
    expect(sql).toContain("admin_moderate_business");
    expect(sql).toContain("admin_moderate_claim");
    expect(sql).toContain("revoke all on function public.admin_moderate_business");
    expect(sql).toContain("grant execute on function public.submit_business_listing");
    expect(sql).toContain("grant execute on function public.save_owner_workspace");
    expect(sql).toContain("onboarding_wizard");
    expect(sql).toContain("clothing-fashion");
    expect(sql).toContain("education-learning");
    expect(sql).toContain("v_old.status in ('DRAFT', 'REJECTED', 'PUBLISHED')");
    expect(sql).toContain("business-photos");
    expect(sql).toContain("file_size_limit = 5242880");
    expect(sql).toContain("allowed_mime_types");
    expect(sql).toContain("(b.metadata ->> 'temporarilyClosed')::boolean");
    expect(sql).toContain("v_unusable");
    expect(sql).toContain(
      "when v_old.status = 'PENDING_REVIEW' then 'PUBLISHED'::public.business_status",
    );
    expect(sql).toContain("photos_enforce_single_cover");
  });

  it("dev seed is explicitly non-production", () => {
    const seed = readFileSync(
      path.join(process.cwd(), "supabase", "seed", "pune_dev.sql"),
      "utf8",
    );
    expect(seed).toMatch(/DEV-ONLY|development seed|not for production/i);
    expect(seed).toContain("app.environment");
  });
});
