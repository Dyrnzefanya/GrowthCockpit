import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { test, expect, admin, invitedSession } from "../support/auth";
import { toJakartaDate } from "../../src/domain/dates";

test("TEST-3.1/3.5/3.6 real checklist, snapshots, optimistic recovery and another browser", async ({
  page,
  baseURL,
}, info) => {
  test.setTimeout(180_000);
  const key = `phase3-${randomUUID()}`;
  const name = `Checklist verifikasi ${key.slice(-8)}`;
  let templateId: string | undefined;
  let noteId: string | undefined;
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (/hydrated|hydration/i.test(message.text()))
      hydrationErrors.push(message.text());
  });
  try {
    const existing = await admin
      .from("workflow_runs")
      .select("id")
      .eq("run_date", toJakartaDate(new Date()));
    expect(existing.error).toBeNull();
    if (!existing.data!.length) {
      await expect(
        page.getByText("Tidak ada checklist hari ini", { exact: true }),
      ).toBeVisible();
      console.log("Empty scheduled day rendered correctly.");
    }
    // Isolated malformed local fixture verifies recoverable materialization failure.
    templateId = randomUUID();
    const malformed = await admin.from("workflow_templates").insert({
      id: templateId,
      key: `invalid-${templateId}`,
      name: "Local invalid template",
      cadence: "daily",
      steps: [{ key: "bad", label: "", help: "", required: true }],
    });
    expect(malformed.error).toBeNull();
    await page.reload();
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "Checklist belum dapat dimuat atau dibuat",
    );
    await expect(
      page.getByLabel("Catatan cepat hari ini", { exact: true }),
    ).toBeEnabled();
    const removed = await admin
      .from("workflow_templates")
      .delete()
      .eq("id", templateId);
    expect(removed.error).toBeNull();
    templateId = undefined;
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
    await page.goto("/workflows/templates");
    const form = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Template baru", exact: true }),
    });
    await form.getByLabel("Nama template", { exact: true }).fill(name);
    await form.getByLabel("Kunci unik").fill(key);
    await form
      .getByLabel("Nama langkah", { exact: true })
      .fill("Periksa pekerjaan hari ini");
    await form.getByRole("button", { name: "Tambah langkah" }).click();
    await form
      .getByLabel("Nama langkah", { exact: true })
      .nth(1)
      .fill("Catat hasil pemeriksaan");
    const moveUp = form.getByRole("button", { name: "Naikkan langkah 2" });
    await moveUp.focus();
    await expect(moveUp).toBeFocused();
    await moveUp.press("Enter");
    await expect(
      form.getByLabel("Nama langkah", { exact: true }).first(),
    ).toHaveValue("Catat hasil pemeriksaan");
    await form.getByRole("button", { name: "Simpan template" }).click();
    await expect(form.getByRole("status")).toContainText("Template tersimpan");
    const created = await admin
      .from("workflow_templates")
      .select("id,version")
      .eq("key", key)
      .single();
    expect(created.error).toBeNull();
    templateId = created.data!.id;
    await page.goto("/today");
    // Concurrent authenticated reads and five fresh renders cannot duplicate runs/items.
    await Promise.all(
      Array.from({ length: 5 }, () => page.request.get("/today")),
    );
    for (let i = 0; i < 5; i++) await page.reload();
    const runs = await admin
      .from("workflow_runs")
      .select("*,workflow_items(*)")
      .eq("template_id", templateId);
    expect(runs.data).toHaveLength(1);
    expect(runs.data![0].workflow_items).toHaveLength(2);
    expect(runs.data![0].run_date).toBe(toJakartaDate(new Date()));
    const section = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
    const checkbox = section.getByRole("checkbox").first();
    await page.route("**/today*", async (route) => {
      if (route.request().method() === "POST") await route.abort();
      else await route.continue();
    });
    await checkbox.check();
    await expect(section.getByRole("alert")).toContainText("dikembalikan");
    await expect(checkbox).not.toBeChecked();
    await page.unroute("**/today*");
    await section.getByRole("button", { name: "Coba lagi" }).click();
    await expect(checkbox).toBeChecked();
    await expect(checkbox).toBeEnabled();
    await section.locator("summary").first().click();
    await section.getByRole("textbox").first().fill("Catatan langkah teruji");
    await section
      .getByRole("button", { name: "Simpan catatan", exact: true })
      .first()
      .click();
    await expect(
      section
        .getByRole("button", { name: "Simpan catatan", exact: true })
        .first(),
    ).toBeEnabled();
    await section.getByRole("checkbox").nth(1).check();
    await expect(section).toContainText("100%");
    const quickNote = `Catatan uji ${key}`;
    await page
      .getByLabel("Catatan cepat hari ini", { exact: true })
      .fill(quickNote);
    await page.getByRole("button", { name: "Simpan catatan hari ini" }).click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Catatan tersimpan untuk hari ini" }),
    ).toBeVisible();
    await expect(page.getByText(quickNote, { exact: true })).toBeVisible();
    const notes = await admin
      .from("notes")
      .select("id,note_date")
      .eq("body", quickNote)
      .single();
    expect(notes.error).toBeNull();
    noteId = notes.data!.id;
    expect(notes.data!.note_date).toBe(toJakartaDate(new Date()));
    await page.reload();
    await expect(section).toContainText("100%");
    await expect(page.getByText(quickNote, { exact: true })).toBeVisible();
    const browser = await chromium.launch();
    const context = await browser.newContext({ baseURL });
    const other = await context.newPage();
    const otherUser = await invitedSession(other);
    try {
      await expect(other.getByText(quickNote, { exact: true })).toBeVisible();
      const otherSection = other
        .locator("section")
        .filter({ has: other.getByRole("heading", { name, exact: true }) });
      await expect(otherSection).toContainText("100%");
      await otherSection.getByRole("checkbox").first().uncheck();
      await expect(otherSection).toContainText("50%");
      await page.reload();
      await expect(section).toContainText("50%");
      await section.locator("summary").first().click();
      await expect(section.getByRole("textbox").first()).toHaveValue(
        "Catatan langkah teruji",
      );
    } finally {
      await context.close();
      await browser.close();
      await admin.auth.admin.deleteUser(otherUser.id);
    }
    await page.goto("/workflows/templates");
    await page.locator("summary").filter({ hasText: name }).click();
    const editor = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
    await editor
      .getByLabel("Nama langkah", { exact: true })
      .first()
      .fill("Label baru untuk masa depan");
    await editor.getByLabel("Template aktif").uncheck();
    await editor.getByRole("button", { name: "Simpan template" }).click();
    await expect(
      page.locator("summary").filter({ hasText: name }),
    ).toContainText("Nonaktif");
    await page.goto("/today");
    await expect(section).toContainText("Catat hasil pemeriksaan");
    await expect(section).not.toContainText("Label baru untuk masa depan");
    await page.goto(`/workflows?run=${runs.data![0].id}`);
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    for (const width of [1280, 1920, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/today");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        caret: "initial",
        path: info.outputPath(`phase3-${width}.png`),
        fullPage: true,
      });
    }
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
    await page.goto("/workflows/templates");
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    expect(hydrationErrors).toEqual([]);
  } finally {
    if (noteId) await admin.from("notes").delete().eq("id", noteId);
    if (templateId) {
      await admin.from("workflow_runs").delete().eq("template_id", templateId);
      await admin.from("workflow_templates").delete().eq("id", templateId);
    }
  }
});
