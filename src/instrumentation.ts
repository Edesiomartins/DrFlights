import { reportUnhandledError } from "@/lib/monitoring";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("unhandledRejection", (reason) => {
      reportUnhandledError(reason, "unhandledRejection");
    });
    process.on("uncaughtException", (error) => {
      reportUnhandledError(error, "uncaughtException");
    });
  }
}
