import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { test, expect, admin } from "../support/auth";

test("TEST-4.5 create, publish, search, archive and retrieve operational knowledge", async ({
  page,
}, info) => {
  test.setTimeout(600_000);
  const marker = randomUUID().replaceAll("-", "");
  const title = `SOP verifikasi ${marker.slice(0, 8)}`;
  const bodyTerm = `bodyterm${marker}`;
  const createdIds: string[] = [];
  try {
    await page.goto("/playbook");
    await expect(
      page.getByRole("heading", { name: "Playbook", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("SOP peluncuran kampanye", { exact: true }),
    ).toBeVisible();

    await page.goto("/playbook/new");
    await page.locator("#article-title").fill(title);
    await page.locator("#article-type").selectOption("troubleshooting");
    await page.locator("#article-category").fill("Verification");
    await page
      .locator("#article-summary")
      .fill("Prosedur lokal untuk menguji retrieval playbook.");
    await page.locator("#article-tags").fill("qa, retrieval, qa");
    const markdown = `# ${title}\n\n## Periksa sumber\n\nCari ${bodyTerm}.\n\n## Ambil tindakan\n\n- [ ] Catat hasil\n\n## Tutup pemeriksaan\n\n| Bukti | Status |\n| --- | --- |\n| Catatan | Selesai |\n\n<script>window.playbookInjected = true</script><img src=x onerror=alert(1)>`;
    await page.locator("#article-body").fill(markdown);
    await page.setViewportSize({ width: 390, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      caret: "initial",
      path: info.outputPath("phase4-editor-390.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.route("**/playbook/new", async (route) => {
      if (route.request().method() === "POST") await route.abort();
      else await route.continue();
    });
    await page.getByRole("button", { name: "Simpan artikel" }).click();
    await expect(page.getByRole("status")).toContainText("tetap dipertahankan");
    await expect(page.locator("#article-body")).toHaveValue(markdown);
    await page.unroute("**/playbook/new");
    await page.getByRole("button", { name: "Simpan artikel" }).click();
    await expect(page).toHaveURL(/\/playbook\/sop-verifikasi-[a-z0-9]+$/);
    const firstSlug = new URL(page.url()).pathname.split("/").at(-1)!;
    const first = await admin
      .from("playbook_articles")
      .select("id,status,version,tags")
      .eq("slug", firstSlug)
      .single();
    expect(first.error).toBeNull();
    createdIds.push(first.data!.id);
    expect(first.data).toMatchObject({
      status: "draft",
      version: 0,
      tags: ["qa", "retrieval"],
    });
    expect(await page.locator("article script, article img").count()).toBe(0);
    expect(await page.evaluate(() => "playbookInjected" in window)).toBe(false);
    await expect(
      page.getByRole("navigation", { name: "Daftar isi" }),
    ).toBeVisible();
    await page.screenshot({
      caret: "initial",
      path: info.outputPath("phase4-reader-1280.png"),
      fullPage: true,
    });

    await page.getByRole("link", { name: "Edit artikel" }).click();
    await page.locator("#article-status").selectOption("published");
    await page.getByRole("button", { name: "Simpan artikel" }).click();
    await expect(page).toHaveURL(`/playbook/${firstSlug}`);
    await expect(page.getByText("published", { exact: true })).toBeVisible();
    const published = await admin
      .from("playbook_articles")
      .select("version,published_at")
      .eq("id", first.data!.id)
      .single();
    expect(published.data!.version).toBe(1);
    expect(published.data!.published_at).not.toBeNull();

    await page.goto(`/playbook?q=${bodyTerm}`);
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await page.locator("#playbook-type").selectOption("troubleshooting");
    await page.locator("#playbook-category").selectOption("Verification");
    await page.locator("#playbook-tag").selectOption("retrieval");
    await page.getByRole("button", { name: "Terapkan" }).click();
    await expect(page).toHaveURL(/type=troubleshooting/);
    await expect(page).toHaveURL(/category=Verification/);
    await expect(page).toHaveURL(/tag=retrieval/);
    await expect(page.getByText(title, { exact: true })).toBeVisible();

    await page.goto(`/playbook?q=missing${marker}`);
    await expect(
      page.getByRole("heading", { name: "Artikel tidak ditemukan" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Buat artikel baru" }),
    ).toBeVisible();

    await page.goto("/playbook/new");
    await page.locator("#article-title").fill(title);
    await page.locator("#article-category").fill("Verification");
    await page
      .locator("#article-summary")
      .fill("Collision verification article.");
    await page
      .locator("#article-body")
      .fill("# Duplicate\n\nCollision content.");
    await page.getByRole("button", { name: "Simpan artikel" }).click();
    await expect(page).toHaveURL(`/playbook/${firstSlug}-2`);
    const duplicate = await admin
      .from("playbook_articles")
      .select("id")
      .eq("slug", `${firstSlug}-2`)
      .single();
    expect(duplicate.error).toBeNull();
    createdIds.push(duplicate.data!.id);
    await page.getByRole("link", { name: "Edit artikel" }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Hapus" }).click();
    await expect(page).toHaveURL("/playbook");
    expect(
      (
        await admin
          .from("playbook_articles")
          .select("id")
          .eq("id", duplicate.data!.id)
          .maybeSingle()
      ).data,
    ).toBeNull();
    createdIds.pop();

    await page.goto(`/playbook/${firstSlug}/edit`);
    await page.locator("#article-status").selectOption("archived");
    await page.getByRole("button", { name: "Simpan artikel" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "diarsipkan" }),
    ).toBeVisible();
    await page.goto(`/playbook?q=${encodeURIComponent(title)}`);
    await expect(page.locator(`a[href="/playbook/${firstSlug}"]`)).toHaveCount(
      0,
    );
    await page.locator("#playbook-status").selectOption("archived");
    await page.getByRole("button", { name: "Terapkan" }).click();
    await expect(
      page.locator(`a[href="/playbook/${firstSlug}"]`),
    ).toBeVisible();

    for (const width of [1280, 1920, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/playbook");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        caret: "initial",
        path: info.outputPath(`phase4-playbook-${width}.png`),
        fullPage: true,
      });
    }
    await page.locator("#playbook-search").click();
    await expect(page.locator("#playbook-search")).toBeFocused();
    for (const route of [
      "/playbook",
      `/playbook/${firstSlug}`,
      "/playbook/new",
    ]) {
      await page.goto(route);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(result.violations).toEqual([]);
    }
  } finally {
    if (createdIds.length)
      await admin.from("playbook_articles").delete().in("id", createdIds);
  }
});
