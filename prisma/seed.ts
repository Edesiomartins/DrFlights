import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const seedEmail = adminEmails[0] ?? process.env.SEED_ADMIN_EMAIL;
  const seedPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!seedEmail || !seedPassword) {
    console.log(
      "Seed opcional: defina SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD (ou ADMIN_EMAILS) para criar admin.",
    );
    return;
  }

  const passwordHash = await bcrypt.hash(seedPassword, 12);
  const user = await prisma.user.upsert({
    where: { email: seedEmail.toLowerCase() },
    update: { role: Role.ADMIN, passwordHash },
    create: {
      name: "Administrador",
      email: seedEmail.toLowerCase(),
      passwordHash,
      role: Role.ADMIN,
    },
  });

  console.log(`Admin pronto: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
