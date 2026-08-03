import nodemailer from "nodemailer";
import { getEnv, isSmtpConfigured } from "@/lib/utils/env";
import { logger } from "@/lib/utils/logger";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailResult = {
  ok: boolean;
  disabled?: boolean;
  messageId?: string;
  error?: string;
};

function createTransport() {
  const host = getEnv("SMTP_HOST");
  const port = Number(getEnv("SMTP_PORT", "587"));
  const secure = getEnv("SMTP_SECURE", "false") === "true";
  const user = getEnv("SMTP_USER");
  const pass = getEnv("SMTP_PASSWORD");

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  });
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!isSmtpConfigured()) {
    return {
      ok: false,
      disabled: true,
      error: "SMTP não configurado; envio de alertas desativado.",
    };
  }

  try {
    const transport = createTransport();
    const info = await transport.sendMail({
      from: getEnv("SMTP_FROM"),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { ok: true, messageId: info.messageId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao enviar e-mail";
    logger.error("smtp.send_failed", { error: message });
    return { ok: false, error: message };
  }
}
