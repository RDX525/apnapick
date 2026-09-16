import { describe, expect, it } from "vitest";
import {
  buildAdminSearchAnalytics,
  mapAdminPayments,
  mapAdminSeoPages,
  mapAdminSubscriptions,
} from "@/services/admin/growth";

describe("buildAdminSearchAnalytics", () => {
  it("merges popular and recent queries and attaches the latest coarse area", () => {
    const rows = buildAdminSearchAnalytics(
      [
        {
          normalized_query: "chicken curry",
          hit_count: 40,
          last_seen_at: "2026-09-16T06:00:00.000Z",
        },
        {
          normalized_query: "chicken curry",
          hit_count: 12,
          last_seen_at: "2026-09-16T07:00:00.000Z",
        },
        {
          normalized_query: "fade haircut",
          hit_count: 9,
          last_seen_at: "2026-09-16T05:00:00.000Z",
        },
      ],
      [
        {
          normalized_query: "chicken curry",
          coarse_area_slug: "kothrud",
          created_at: "2026-09-16T06:30:00.000Z",
        },
        {
          normalized_query: "chicken curry",
          coarse_area_slug: "baner",
          created_at: "2026-09-16T07:10:00.000Z",
        },
        {
          normalized_query: "misal pav",
          coarse_area_slug: "pune",
          created_at: "2026-09-16T08:00:00.000Z",
        },
      ],
    );

    expect(rows[0]).toMatchObject({
      query: "misal pav",
      area: "pune",
      count: 1,
    });
    expect(rows.find((row) => row.query === "chicken curry")).toMatchObject({
      query: "chicken curry",
      count: 40,
      area: "baner",
      lastSeen: "2026-09-16T07:00:00.000Z",
    });
    expect(rows.find((row) => row.query === "fade haircut")).toMatchObject({
      area: null,
      count: 9,
    });
  });

  it("ignores blank queries", () => {
    expect(
      buildAdminSearchAnalytics(
        [{ normalized_query: "  ", hit_count: 3, last_seen_at: "2026-09-16T00:00:00.000Z" }],
        [{ normalized_query: "", coarse_area_slug: "pune", created_at: "2026-09-16T00:00:00.000Z" }],
      ),
    ).toEqual([]);
  });
});

describe("mapAdminSubscriptions", () => {
  it("reads nested plan and business when PostgREST returns arrays", () => {
    expect(
      mapAdminSubscriptions([
        {
          id: "sub-1",
          status: "ACTIVE",
          current_period_end: "2026-10-01T00:00:00.000Z",
          plans: [{ name: "Business", price_cents: 49900 }],
          businesses: [{ name: "Curry Leaf Co." }],
        },
      ]),
    ).toEqual([
      {
        id: "sub-1",
        businessName: "Curry Leaf Co.",
        plan: "Business",
        status: "active",
        amountCents: 49900,
        renewsAt: "2026-10-01T00:00:00.000Z",
      },
    ]);
  });

  it("keeps catalog listings and unknown nested relations", () => {
    expect(
      mapAdminSubscriptions([
        {
          id: "sub-2",
          status: "TRIALING",
          plans: { name: "Free", price_cents: 0 },
          businesses: {
            id: "11111111-1111-1111-1111-111111111101",
            name: "Spice Route Kitchen",
            metadata: { source: "openstreetmap" },
          },
        },
      ])[0],
    ).toMatchObject({
      businessName: "Spice Route Kitchen",
      plan: "Free",
      status: "trialing",
    });
  });
});

describe("mapAdminPayments", () => {
  it("maps ledger rows without dropping billed catalog businesses", () => {
    expect(
      mapAdminPayments([
        {
          id: "pay-1",
          amount_cents: 49900,
          status: "SUCCEEDED",
          created_at: "2026-09-16T09:00:00.000Z",
          businesses: { name: "Fade Room Barbers" },
        },
      ]),
    ).toEqual([
      {
        id: "pay-1",
        businessName: "Fade Room Barbers",
        amountCents: 49900,
        status: "succeeded",
        createdAt: "2026-09-16T09:00:00.000Z",
      },
    ]);
  });
});

describe("mapAdminSeoPages", () => {
  it("maps registry rows for the live SEO queue", () => {
    expect(
      mapAdminSeoPages([
        {
          id: "seo-1",
          path: "/restaurants/pune",
          title: "Restaurants in Pune",
          indexable: true,
          business_count: 12,
        },
      ]),
    ).toEqual([
      {
        id: "seo-1",
        path: "/restaurants/pune",
        title: "Restaurants in Pune",
        indexable: true,
        businessCount: 12,
      },
    ]);
  });
});
