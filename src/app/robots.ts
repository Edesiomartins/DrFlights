import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/utils/env";

export default function robots(): MetadataRoute.Robots {
  const base = getAppUrl().replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/entrar", "/cadastro", "/historico"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
