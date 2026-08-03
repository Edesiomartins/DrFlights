import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "searches";

  if (type === "prices") {
    const origin = searchParams.get("origin")?.toUpperCase();
    const destination = searchParams.get("destination")?.toUpperCase();
    const snapshots = await prisma.priceSnapshot.findMany({
      where: {
        ...(origin ? { origin } : {}),
        ...(destination ? { destination } : {}),
      },
      orderBy: { observedAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ snapshots });
  }

  const searches = await prisma.search.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      requestData: true,
      providerStatuses: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  return NextResponse.json({ searches });
}
