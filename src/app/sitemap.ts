import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";
import { getAppUrl } from "@/lib/utils/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getAppUrl().replace(/\/$/, "");
  const staticEntries: MetadataRoute.Sitemap = [
    "",
    "/promocoes",
    "/alertas",
    "/privacidade",
    "/afiliados",
  ].map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.6,
  }));

  try {
    const routes = await prisma.search.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { requestData: true, createdAt: true },
    });

    const seen = new Set<string>();
    const routeEntries: MetadataRoute.Sitemap = [];
    for (const row of routes) {
      const data = row.requestData as {
        slices?: Array<{ origin?: string; destination?: string }>;
      };
      const first = data.slices?.[0];
      if (!first?.origin || !first?.destination) continue;
      const slug = `${first.origin}-${first.destination}`.toLowerCase();
      if (seen.has(slug)) continue;
      seen.add(slug);
      routeEntries.push({
        url: `${base}/voos/${slug}`,
        lastModified: row.createdAt,
        changeFrequency: "daily",
        priority: 0.7,
      });
      if (routeEntries.length >= 80) break;
    }

    return [...staticEntries, ...routeEntries];
  } catch {
    // Build/local environments without DB still produce a valid sitemap.
    return staticEntries;
  }
}
