import type { Metadata } from "next";
import { getPublicEnv } from "@/config/env";

export type BuildPageMetadataInput = {
  title: string;
  description: string;
  path?: string;
  /** Prefer canonical when path is an alias / duplicate combination */
  canonicalPath?: string;
  noIndex?: boolean;
  /** When noIndex, still allow follow for public thin hubs (default true) */
  follow?: boolean;
  imageUrl?: string | null;
};

export function buildPageMetadata(input: BuildPageMetadataInput): Metadata {
  const { NEXT_PUBLIC_APP_NAME: appName, NEXT_PUBLIC_APP_URL: configuredBase } =
    getPublicEnv();
  const base =
    process.env.NODE_ENV === "production" && configuredBase.includes("localhost")
      ? "https://apnapick.com"
      : configuredBase;
  const name = appName ?? "ApnaPick";
  const canonicalPath = input.canonicalPath ?? input.path;
  const url = canonicalPath ? new URL(canonicalPath, base).toString() : base;

  const noIndex = Boolean(input.noIndex);
  const follow = input.follow ?? true;
  const image = input.imageUrl ? new URL(input.imageUrl, base).toString() : undefined;

  return {
    title: {
      absolute: `${input.title} · ${name}`,
    },
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: name,
      type: "website",
      locale: "en_IN",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: image ? [image] : undefined,
    },
    robots: noIndex ? { index: false, follow } : { index: true, follow: true },
  };
}
