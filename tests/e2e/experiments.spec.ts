import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { test, expect, admin } from "../support/auth";
import { toJakartaDate } from "../../src/domain/dates";

test("TEST-5.6 create, run, review, complete and retrieve a learning", async ({
  page,
}, info) => {
  test.setTimeout(300_000);
  const marker = randomUUID().replaceAll("-", "");
  const title = `Creative evidence ${marker.slice(0, 8)}`;
  const learningTerm = `learning${marker}`;
  const today = toJakartaDate(new Date());
  let experimentId: string | undefined;
  try {
    await page.goto("/experiments");
    await expect(
      page.getByRole("heading", { name: "Experiments", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("(priority × confidence) / effort"),
    ).toBeVisible();

    await page.goto("/experiments/new");
    await page.getByLabel("Judul", { exact: true }).fill(title);
    await page
      .getByLabel("Hipotesis")
      .fill(
        "Jika pesan dibuat lebih spesifik maka respons berkualitas meningkat.",
      );
    await page.getByLabel("Variabel yang diuji").fill("creative message");
    await page.getByLabel("KPI utama").fill("MQL rate");
    await page.getByLabel("Tanggal mulai").fill(today);
    await page.getByLabel("Tanggal review").fill(today);
    await expect(page.getByText("Peringatan durasi:")).toBeVisible();
    await page.getByLabel("Priority").selectOption("5");
    await page.getByLabel("Confidence").selectOption("4");
    await page.getByLabel("Effort").selectOption("2");
    await expect(page.getByText("10.00", { exact: true })).toBeVisible();
    await page.getByText("KPI tambahan dan referensi eksternal").click();
    await page.getByLabel("Control (opsional)").fill("Pesan lama");
    await page.getByLabel("Variant (opsional)").fill("Pesan spesifik");
    await page.getByLabel("Campaign ID").fill("campaign-local-test");
    await page
      .getByLabel("Landing page URL")
      .fill("https://example.test/experiment");
    await page.setViewportSize({ width: 390, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      caret: "initial",
      path: info.outputPath("phase5-create-390.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole("button", { name: "Simpan ke backlog" }).click();
    await expect(page).toHaveURL(/\/experiments\/[0-9a-f-]{36}$/);
    experimentId = new URL(page.url()).pathname.split("/").at(-1);
    await expect(page.getByText(/EXP-[0-9]{4}-[0-9]{3}/)).toBeVisible();
    await expect(page.getByText("draft", { exact: true })).toBeVisible();

    const created = await admin
      .from("experiments")
      .select("code,status,priority,confidence,effort,external_refs")
      .eq("id", experimentId!)
      .single();
    expect(created.error).toBeNull();
    expect(created.data).toMatchObject({
      status: "draft",
      priority: 5,
      confidence: 4,
      effort: 2,
      external_refs: {
        campaign_id: "campaign-local-test",
        landing_page_url: "https://example.test/experiment",
      },
    });

    await page.getByRole("button", { name: "Mulai eksperimen" }).click();
    await expect(page.getByText("running", { exact: true })).toBeVisible();
    await page.goto("/today");
    const queue = page.locator("section").filter({
      has: page.getByRole("heading", {
        name: "Experiment review queue",
        exact: true,
      }),
    });
    await expect(queue.getByText(title, { exact: true })).toBeVisible();
    await page.screenshot({
      caret: "initial",
      path: info.outputPath("phase5-today-1280.png"),
      fullPage: true,
    });

    await queue.getByText(title, { exact: true }).click();
    await page.getByRole("button", { name: "Selesaikan" }).click();
    await expect(page.getByText("Sampel di bawah 10")).toBeVisible();
    await page.getByLabel("Outcome").selectOption("win");
    await page.getByLabel("Hasil KPI utama").fill("18.5");
    await page.getByLabel("Jumlah hasil teramati").fill("4");
    await page
      .getByLabel("Kesimpulan")
      .fill("Pesan spesifik memperbaiki respons.");
    await page
      .getByLabel("Tindakan berikutnya")
      .fill("Ulangi pada audiens lain.");
    await page.getByRole("button", { name: "Simpan hasil" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .locator("#result-learning")
      .fill(`${learningTerm} fokus pada satu perubahan.`);
    await page.getByRole("button", { name: "Simpan hasil" }).click();
    await expect(page.getByText("completed", { exact: true })).toBeVisible();
    await expect(page.getByText("inconclusive_by_default")).toBeVisible();

    const persisted = await admin
      .from("experiment_results")
      .select("learning,evidence")
      .eq("experiment_id", experimentId!)
      .single();
    expect(persisted.error).toBeNull();
    expect(persisted.data).toMatchObject({
      learning: `${learningTerm} fokus pada satu perubahan.`,
      evidence: {
        observed_results: 4,
        minimum_results: 10,
        sample_warning: true,
        verdict_label: "inconclusive_by_default",
      },
    });

    await page.goto(`/experiments/learnings?q=${learningTerm}`);
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await page.getByLabel("Variabel").selectOption("creative message");
    await page.getByLabel("KPI").selectOption("MQL rate");
    await page.getByLabel("Outcome").selectOption("win");
    await page.getByRole("button", { name: "Terapkan" }).click();
    await expect(page).toHaveURL(/variable=creative/);
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await page.screenshot({
      caret: "initial",
      path: info.outputPath("phase5-learnings-1280.png"),
      fullPage: true,
    });

    for (const width of [1280, 1920, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/experiments?status=completed");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        caret: "initial",
        path: info.outputPath(`phase5-experiments-${width}.png`),
        fullPage: true,
      });
    }
    for (const route of [
      "/experiments",
      "/experiments/new",
      `/experiments/${experimentId}`,
      "/experiments/learnings",
      "/today",
    ]) {
      await page.goto(route);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(result.violations).toEqual([]);
    }
  } finally {
    if (experimentId) {
      await admin
        .from("experiment_results")
        .delete()
        .eq("experiment_id", experimentId);
      await admin.from("experiments").delete().eq("id", experimentId);
    }
  }
});
