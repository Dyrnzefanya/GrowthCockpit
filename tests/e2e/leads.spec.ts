import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { test, expect, admin } from "../support/auth";
import { cleanupLeads } from "../support/crm";
test("TEST-6.11 manual inquiry, duplicate, repeat, override, deal and funnel", async ({
  page,
}, info) => {
  test.setTimeout(300_000);
  const marker = randomUUID().slice(0, 8),
    email = "buyer-" + marker + "@example.com",
    ids: string[] = [];
  const original = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "qualification.min_quantity")
    .single();
  async function create(time: string, contact = email) {
    await page.goto("/leads/new");
    await expect(
      page.getByRole("navigation", { name: "Breadcrumb" }),
    ).toContainText("Inquiry baru");
    await page.getByLabel("Waktu inquiry · WIB").fill(time);
    await page.getByLabel("Email", { exact: true }).fill(contact);
    await page
      .getByLabel("Nama orang", { exact: true })
      .fill("Buyer " + marker);
    await page.getByLabel("Produk yang diminati").fill("Gift " + marker);
    await page.getByLabel("Estimasi jumlah").fill("100");
    await page.getByText("Atribusi dan owner (opsional)").click();
    await page
      .getByLabel("UTM campaign", { exact: true })
      .fill("Campaign " + marker);
    await page.getByLabel("UTM source", { exact: true }).fill("facebook");
    await page
      .getByRole("button", { name: "Simpan inquiry", exact: true })
      .click();
    await expect(page).toHaveURL(/\/leads\/[0-9a-f-]{36}$/, { timeout: 30000 });
    const id = new URL(page.url()).pathname.split("/").at(-1)!;
    if (!ids.includes(id)) ids.push(id);
    return id;
  }
  try {
    const first = await create("2026-09-01T10:00");
    await expect(
      page
        .getByText("Q_CONTACTABLE,Q_BUSINESS,Q_INTENT,Q_SIZE", { exact: false })
        .first(),
    ).toBeVisible();
    const duplicate = await create("2026-09-02T10:00");
    expect(duplicate).toBe(first);
    const repeat = await create("2026-09-03T10:01");
    expect(repeat).not.toBe(first);
    const { data: rows } = await admin
      .from("leads")
      .select("contact_id,inquiry_observations")
      .in("id", ids);
    expect(new Set(rows!.map((r) => r.contact_id)).size).toBe(1);
    await page.goto("/leads/" + first);
    await page.getByRole("button", { name: "Override kualifikasi" }).click();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Override kualifikasi" }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Override kualifikasi" }).click();
    await page.getByLabel("Status baru").selectOption("sql");
    await page.getByRole("button", { name: "Simpan override" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .getByLabel("Alasan wajib")
      .fill("Sales accepted for documented requirement");
    await page.getByRole("button", { name: "Simpan override" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(
      page.getByText("Override manual — tidak ditimpa otomatis"),
    ).toBeVisible();
    await page.getByLabel("Nama deal", { exact: true }).fill("Deal " + marker);
    await page.getByLabel("Pipeline", { exact: true }).fill("Manual");
    await page.getByLabel("Stage key", { exact: true }).fill("closedwon");
    await page.getByLabel("Label stage", { exact: true }).fill("Closed Won");
    await page.getByLabel("Kategori stage").selectOption("won");
    await page.getByLabel("Nilai deal").fill("1500000.25");
    await page.getByLabel("Tanggal close aktual").fill("2026-09-12");
    await page.getByRole("button", { name: "Simpan deal" }).click();
    await expect(
      page.getByText("Deal tersimpan.", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Nilai deal")).toHaveValue("1500000.25");
    const anon = await create("2026-09-04T10:00", "");
    const { data: anonymous } = await admin
      .from("leads")
      .select("contact_id,qualification_reason")
      .eq("id", anon)
      .single();
    expect(anonymous).toEqual({
      contact_id: null,
      qualification_reason: "DQ_NO_CONTACT",
    });
    await page.goto("/settings");
    await page
      .getByLabel("Minimum jumlah untuk Q_SIZE", { exact: true })
      .fill("101");
    await page
      .getByRole("button", {
        name: "Simpan Minimum jumlah untuk Q_SIZE",
        exact: true,
      })
      .click();
    await expect(
      page.getByText(
        "Tersimpan. Berlaku untuk inquiry baru; riwayat tidak diubah.",
      ),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByLabel("Minimum jumlah untuk Q_SIZE", { exact: true }),
    ).toHaveValue("101");
    const setting = await admin
      .from("app_settings")
      .select("updated_by,updated_at")
      .eq("key", "qualification.min_quantity")
      .single();
    expect(setting.data?.updated_by).toBeTruthy();
    const future = await create("2026-09-06T10:00");
    const persisted = await admin
      .from("leads")
      .select("qualification_status,qualification_settings,manual_override")
      .eq("id", future)
      .single();
    expect(persisted.data?.qualification_status).toBe("new");
    const history = await admin
      .from("leads")
      .select("qualification_status,manual_override")
      .eq("id", first)
      .single();
    expect(history.data).toEqual({
      qualification_status: "sql",
      manual_override: true,
    });
    const owner = await admin
      .from("leads")
      .select("owner_id")
      .eq("id", first)
      .single();
    const historyFixture = await admin.from("lead_stage_events").insert(
      Array.from({ length: 21 }, (_, n) => ({
        lead_id: first,
        from_status: "sql",
        to_status: "sql",
        changed_at: new Date(Date.UTC(2026, 8, 13, 0, 0, n)).toISOString(),
        source: "manual",
        actor: owner.data!.owner_id!,
        note: "Pagination fixture " + n,
      })),
    );
    expect(historyFixture.error).toBeNull();
    await page.goto("/leads/" + first);
    await page
      .getByRole("navigation", { name: "Halaman timeline" })
      .getByRole("link", { name: "Berikutnya" })
      .click();
    await expect(page).toHaveURL(/event_page=1/);
    await expect(
      page.getByText("Pagination fixture 20", { exact: true }),
    ).toBeVisible();
    for (const route of [
      "/leads",
      "/leads/new",
      "/leads/import",
      "/leads/" + first,
      "/funnel?from=2026-09-01&to=2026-09-30",
      "/today",
    ]) {
      await page.goto(route);
      await expect(page.locator("main h1")).toBeVisible();
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(axe.violations).toEqual([]);
      for (const width of [1280, 1920, 390]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: info.outputPath(
            route.split("?")[0].replaceAll("/", "-") + "-" + width + ".png",
          ),
          fullPage: true,
        });
      }
    }
    await page.goto("/funnel?from=2026-09-01&to=2026-09-30");
    await expect(
      page.getByText("Maturity window: 14 hari.", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Metrik biaya belum tersedia" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Activity", exact: true }).click();
    await expect(
      page.getByRole("heading", {
        name: "Activity — peristiwa pada tanggal perubahan",
      }),
    ).toBeVisible();
    await page.goto(
      "/leads?campaign=" + encodeURIComponent("Campaign " + marker),
    );
    await page
      .getByRole("button", { name: "Kualifikasi", exact: true })
      .click();
    await expect(page).toHaveURL(/sort=qualification_status/);
  } finally {
    await admin
      .from("app_settings")
      .update({ value: original.data!.value })
      .eq("key", "qualification.min_quantity");
    await cleanupLeads(ids);
  }
});
test("TEST-6.9 CSV mapping/dry-run/reimport and NFR-6.3 5000-row atomic import", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const marker = randomUUID(),
    campaign = "csv-" + marker,
    ids: string[] = [];
  const content =
    "Inquiry timestamp,Email,Product interest,Estimated quantity,UTM campaign\n" +
    Array.from(
      { length: 5000 },
      (_, n) =>
        `2026-09-01T00:00:00Z,csv${n}-${marker}@example.com,Gift,100,${campaign}`,
    ).join("\n");
  try {
    await page.goto("/leads/import");
    await page.getByLabel("File CSV").setInputFiles({
      name: "inquiries.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(content),
    });
    for (const [field, column] of Object.entries({
      occurred_at: "Inquiry timestamp",
      email: "Email",
      product_interest: "Product interest",
      estimated_quantity: "Estimated quantity",
      utm_campaign: "UTM campaign",
    }))
      await page.locator("#map-" + field).selectOption(column);
    await page.getByRole("button", { name: "Jalankan dry-run" }).click();
    await expect(page.getByText("Created: 5000", { exact: false })).toBeVisible(
      { timeout: 60000 },
    );
    const before = await admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("lt_campaign", campaign);
    expect(before.count).toBe(0);
    const started = Date.now();
    await page.getByRole("button", { name: "Commit import" }).click();
    await expect(
      page.getByText("Import selesai.", { exact: true }),
    ).toBeVisible({ timeout: 60000 });
    expect(Date.now() - started).toBeLessThan(60000);
    console.log("NFR-6.3 5000-row browser commit (ms):", Date.now() - started);
    const count = await admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("lt_campaign", campaign);
    expect(count.count).toBe(5000);
    await page.goto(
      "/leads?status=mql&channel=import&platform=unknown&attribution=complete&from=2026-09-01&to=2026-09-01&campaign=" +
        encodeURIComponent(campaign),
    );
    await expect(page.getByText("5000 records", { exact: true })).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(20);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page).toHaveURL(/page=1/);
    await expect(page.locator("tbody tr")).toHaveCount(20);
    await page.goto("/leads/import");
    await page.getByLabel("File CSV").setInputFiles({
      name: "inquiries.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(content),
    });
    for (const [field, column] of Object.entries({
      occurred_at: "Inquiry timestamp",
      email: "Email",
      product_interest: "Product interest",
      estimated_quantity: "Estimated quantity",
      utm_campaign: "UTM campaign",
    }))
      await page.locator("#map-" + field).selectOption(column);
    await page.getByRole("button", { name: "Jalankan dry-run" }).click();
    await expect(
      page.getByText("Created: 0 · Updated: 0 · Skipped: 5000 · Errors: 0"),
    ).toBeVisible({ timeout: 60000 });
    await page.getByRole("button", { name: "Commit import" }).click();
    await expect(
      page.getByText("Import selesai.", { exact: true }),
    ).toBeVisible({ timeout: 60000 });
  } finally {
    for (let offset = 0; offset < 6000; offset += 1000) {
      const { data } = await admin
        .from("leads")
        .select("id")
        .eq("lt_campaign", campaign)
        .order("id")
        .range(offset, offset + 999);
      ids.push(...(data ?? []).map((r) => r.id));
      if ((data?.length ?? 0) < 1000) break;
    }
    // Bounded batches also collect and remove their individual contacts.
    await cleanupLeads(ids);
  }
});
