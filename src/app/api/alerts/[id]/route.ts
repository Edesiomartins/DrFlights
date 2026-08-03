import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { alertSchema } from "@/lib/flights/validation";

type Params = { params: Promise<{ id: string }> };

async function ownedAlert(userId: string, id: string) {
  return prisma.priceAlert.findFirst({ where: { id, userId } });
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const existing = await ownedAlert(session.user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Alerta não encontrado." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = alertSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const alert = await prisma.priceAlert.update({
    where: { id },
    data: {
      ...parsed.data,
      returnDateFrom: parsed.data.returnDateFrom ?? undefined,
      returnDateTo: parsed.data.returnDateTo ?? undefined,
      maxStops: parsed.data.maxStops === null ? null : parsed.data.maxStops,
      maxPrice: parsed.data.maxPrice === null ? null : parsed.data.maxPrice,
    },
  });

  return NextResponse.json({ alert });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const existing = await ownedAlert(session.user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Alerta não encontrado." }, { status: 404 });
  }

  await prisma.priceAlert.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
