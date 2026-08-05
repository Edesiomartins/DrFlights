import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const [users, searches, activeAlerts, providers, recentSearches] =
    await Promise.all([
      prisma.user.count(),
      prisma.search.count(),
      prisma.priceAlert.count({ where: { active: true } }),
      prisma.providerStatus.findMany({ orderBy: { provider: "asc" } }),
      prisma.search.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { requestData: true, createdAt: true },
      }),
    ]);

  const routeCounts = new Map<string, number>();
  for (const search of recentSearches) {
    const data = search.requestData as {
      slices?: Array<{ origin?: string; destination?: string }>;
    };
    const first = data.slices?.[0];
    if (!first?.origin || !first?.destination) continue;
    const key = `${first.origin}-${first.destination}`;
    routeCounts.set(key, (routeCounts.get(key) ?? 0) + 1);
  }

  const topRoutes = [...routeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([route, count]) => ({ route, count }));

  return NextResponse.json({
    users,
    searches,
    activeAlerts,
    providers,
    topRoutes,
    dealSources: await prisma.dealSource.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        enabled: true,
        url: true,
        lastIngestAt: true,
        lastIngestCount: true,
        lastIngestError: true,
        lastIngestDurationMs: true,
        _count: { select: { deals: true } },
      },
    }),
  });
}
