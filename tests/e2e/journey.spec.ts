import { expect, test } from "@playwright/test";
import { injectSessionCookie } from "./auth-helpers";
import {
  dismissCookieBannerIfPresent,
  futureDate,
  mockFlightSearch,
  skipOnboarding,
} from "./helpers";

test.describe("Jornada principal DrFlights", () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
  });

  test("abre home, rejeita cookies publicitários, busca, filtra e abre oferta", async ({
    page,
  }) => {
    await mockFlightSearch(page);

    await page.goto("/");
    await expect(page.getByTestId("search-form")).toBeVisible();

    const banner = page.getByTestId("cookie-banner");
    await expect(banner).toBeVisible();
    await page.getByTestId("cookie-reject-ads").click();
    await expect(banner).toHaveCount(0);

    const depart = futureDate(30);
    const ret = futureDate(37);
    await page.locator("#depart").fill(depart);
    await page.locator("#return").fill(ret);

    await page.keyboard.press("Escape");
    await page.locator(".home-brand").click({ force: true });
    await page.getByTestId("search-submit").click({ force: true });

    await expect(page).toHaveURL(/\/resultados/);
    await expect(page.getByTestId("offer-card").first()).toBeVisible();
    await expect(
      page.getByText(/fontes não responderam|parcial|Melhor custo-benefício/i).first(),
    ).toBeVisible();

    const filtersToggle = page.locator(".results-filters-toggle");
    if (await filtersToggle.isVisible()) {
      await filtersToggle.click();
    }
    await page.locator("#stops").selectOption("0");
    await expect(page.getByTestId("offer-card")).toHaveCount(2);

    const booking = page.getByTestId("offer-booking-link").first();
    await expect(booking).toBeVisible();
    await expect(booking).toHaveAttribute("href", /\/api\/go\?/);
  });

  test("cadastra usuário, entra e cria alerta", async ({ page, context }) => {
    test.skip(!process.env.AUTH_SECRET, "AUTH_SECRET necessário para sessão E2E");

    const email = `e2e.ui.${Date.now()}@example.com`;
    const password = "SenhaForte1!";
    const user = {
      id: "e2e-user-1",
      email,
      name: "Viajante E2E",
      role: "USER" as const,
    };

    await page.route("**/api/auth/register", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ user }),
      });
    });

    await page.route("**/api/auth/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/api/auth/register")) {
        await route.fallback();
        return;
      }
      if (url.includes("/api/auth/session")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user,
            expires: new Date(Date.now() + 86400000).toISOString(),
          }),
        });
        return;
      }
      if (url.includes("/api/auth/csrf")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ csrfToken: "e2e-csrf" }),
        });
        return;
      }
      if (
        url.includes("/api/auth/callback/credentials") ||
        url.includes("/api/auth/signin")
      ) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ url: "/" }),
        });
        return;
      }
      await route.fallback();
    });

    const createdAlert = {
      id: "alert-1",
      origin: "GRU",
      destination: "GIG",
      departureDateFrom: futureDate(40),
      departureDateTo: futureDate(50),
      returnDateFrom: null as string | null,
      maxPrice: 900,
      currency: "BRL",
      cabin: "economy",
      active: true,
      lastMatchedPrice: null as number | null,
      lastCheckedAt: null as string | null,
    };
    const alertsState: { items: typeof createdAlert[] } = { items: [] };

    await page.route("**/api/alerts", async (route) => {
      const method = route.request().method();
      if (method === "POST") {
        alertsState.items = [createdAlert];
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ alert: createdAlert }),
        });
        return;
      }
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ alerts: alertsState.items }),
        });
        return;
      }
      await route.fulfill({ status: 405, body: "Method Not Allowed" });
    });

    await page.route("**/api/health", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, smtpConfigured: false }),
      });
    });

    await page.goto("/cadastro");
    await dismissCookieBannerIfPresent(page);
    await page.locator("#name").fill(user.name);
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);

    const registerResponse = page.waitForResponse("**/api/auth/register");
    await page.getByTestId("register-submit").click();
    expect((await registerResponse).status()).toBe(201);

    await page.goto("/entrar");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByTestId("login-submit").click();

    await injectSessionCookie(context, user);
    await page.goto("/alertas");
    await expect(page.getByTestId("alert-form")).toBeVisible();
    await page.locator('input[name="origin"]').fill("GRU");
    await page.locator('input[name="destination"]').fill("GIG");
    await page.locator('input[name="departureDateFrom"]').fill(futureDate(40));
    await page.locator('input[name="departureDateTo"]').fill(futureDate(50));
    await page.locator('input[name="maxPrice"]').fill("900");

    const createResponse = page.waitForResponse(
      (res) =>
        res.url().includes("/api/alerts") && res.request().method() === "POST",
    );
    await page.getByTestId("alert-submit").click();
    expect((await createResponse).status()).toBe(201);
    await expect(page.getByText("GRU → GIG")).toBeVisible({ timeout: 15_000 });
  });

  test("abre página de promoções com estado vazio ou lista real", async ({
    page,
  }) => {
    await page.goto("/promocoes");
    await dismissCookieBannerIfPresent(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const empty = page.getByText(/Nenhuma promoção recente/i);
    const cards = page.locator(".deal-card");
    await expect(empty.or(cards.first())).toBeVisible();
  });

  test("rota SEO sem dados fictícios", async ({ page }) => {
    await page.goto("/voos/xxx-yyy");
    await expect(page.getByTestId("route-empty-price")).toBeVisible();
    await expect(page.getByText(/não há preço observado|Ainda não há/i)).toBeVisible();
  });
});

