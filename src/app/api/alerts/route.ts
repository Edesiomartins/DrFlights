import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { alertSchema } from "@/lib/flights/validation";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const alerts = await prisma.priceAlert.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ alerts });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = alertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados do alerta inválidos.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const alert = await prisma.priceAlert.create({
    data: {
      userId: session.user.id,
      origin: data.origin,
      destination: data.destination,
      departureDateFrom: data.departureDateFrom,
      departureDateTo: data.departureDateTo,
      returnDateFrom: data.returnDateFrom ?? null,
      returnDateTo: data.returnDateTo ?? null,
      cabin: data.cabin,
      adults: data.adults,
      children: data.children,
      maxStops: data.maxStops ?? null,
      maxPrice: data.maxPrice ?? null,
      currency: data.currency,
      active: data.active ?? true,
    },
  });

  return NextResponse.json({ alert }, { status: 201 });
}
