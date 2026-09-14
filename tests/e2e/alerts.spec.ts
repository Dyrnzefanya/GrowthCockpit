import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test, expect, admin } from "../support/auth";

test("Phase 9 Today alert lifecycle, detail, notification volume and responsive access", async ({
  page,
}, info) => {
  const ids: string[] = [];
  const raise = async (
    type: "scheduler_overdue" | "stale_lead" | "new_mql",
    severity: "critical" | "warning" | "info",
    title: string,
    notify: boolean,
  ) => {
    const entity = randomUUID();
    const { data, error } = await admin.rpc("raise_alert", {
      p_alert: {
        alert_key: `${type}:${entity}`,
        type,
        severity,
        source: "phase9_test",
        entity_type: "lead",
        entity_id: entity,
        title,
        message: "Synthetic local acceptance condition.",
        evidence: { lead_id: entity, reason_code: "PHASE9_TEST" },
        notify,
        detected_at: new Date().toISOString(),
      },
    });
    if (error || !data) throw new Error(`Alert fixture failed: ${error?.code}`);
    ids.push(data.id);
    return data.id;
  };
  try {
    const acknowledged = await raise(
      "scheduler_overdue",
      "critical",
      "Phase 9 acknowledge fixture",
      false,
    );
    await raise("stale_lead", "warning", "Phase 9 snooze fixture", false);
    const delivered = await raise(
      "new_mql",
      "info",
      "Phase 9 delivery fixture",
      true,
    );
    const delivery = await admin.rpc("record_alert_delivery", {
      p_ids: [delivered],
      p_outcome: "sent",
      p_error: null!,
      p_next: null!,
      p_max: 5,
    });
    if (delivery.error)
      throw new Error(`Delivery fixture failed: ${delivery.error.code}`);

    await page.goto("/today");
    await expect(
      page.getByRole("heading", { name: "Alerts", exact: true }),
    ).toBeVisible();
    const first = page
      .locator("article")
      .filter({ hasText: "Phase 9 acknowledge fixture" });
    await first.getByRole("button", { name: "Detail alert" }).click();
    await expect(page.getByRole("dialog")).toContainText("Lifecycle history");
    await expect(page.getByRole("dialog")).toContainText(acknowledged);
    await page.keyboard.press("Escape");
    await expect(
      first.getByRole("button", { name: "Detail alert" }),
    ).toBeFocused();
    await first.getByRole("button", { name: "Acknowledge" }).click();
    await expect(page.getByText("Phase 9 acknowledge fixture")).toHaveCount(0);

    const snooze = page
      .locator("article")
      .filter({ hasText: "Phase 9 snooze fixture" });
    await snooze.getByLabel("Snooze").selectOption("240");
    await snooze.getByRole("button", { name: "Snooze", exact: true }).click();
    await expect(page.getByText("Phase 9 snooze fixture")).toHaveCount(0);

    for (const width of [390, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/today#alerts");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: info.outputPath(`phase9-today-${width}.png`),
        fullPage: true,
      });
    }
    await page.goto("/integrations");
    await expect(
      page.getByRole("heading", { name: "Notification volume" }),
    ).toBeVisible();
    await expect(page.getByRole("cell", { name: "new mql" })).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  } finally {
    const project = readFileSync("supabase/config.toml", "utf8").match(
      /^project_id = "([^"]+)"/m,
    )![1];
    execFileSync(
      "docker",
      [
        "exec",
        "-i",
        `supabase_db_${project}`,
        "psql",
        "-U",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      {
        input: `delete from public.alerts where id=any(array[${ids.map((id) => `'${id}'::uuid`).join(",")} ]::uuid[]);`,
        stdio: ["pipe", "ignore", "pipe"],
      },
    );
  }
});
