import { randomUUID } from "node:crypto";
import { test, expect, admin } from "../support/auth";
import { shiftDate, toJakartaDate } from "../../src/domain/dates";

test("NFR-3.2 Today remains within 1.5 seconds with 90 days of history", async ({
  page,
}, info) => {
  const id = randomUUID();
  const today = toJakartaDate(new Date());
  try {
    const template = await admin.from("workflow_templates").insert({
      id,
      key: `perf-${id}`,
      name: "Local performance verification",
      cadence: "daily",
      is_active: true,
      weekdays: null,
      steps: [
        {
          key: "check",
          label: "Local verification step",
          help: "",
          required: true,
        },
      ],
    });
    expect(template.error).toBeNull();
    const runs = await admin
      .from("workflow_runs")
      .insert(
        Array.from({ length: 90 }, (_, index) => ({
          template_id: id,
          template_name_snapshot: "Local performance verification",
          template_version: 1,
          run_date: shiftDate(today, -index - 1),
        })),
      )
      .select("id");
    expect(runs.error).toBeNull();
    expect(runs.data).toHaveLength(90);
    const items = await admin.from("workflow_items").insert(
      runs.data!.map((run) => ({
        run_id: run.id,
        step_key: "check",
        label_snapshot: "Local verification step",
        required_snapshot: true,
        position: 0,
      })),
    );
    expect(items.error).toBeNull();
    await page.goto("/today");
    await expect(
      page.getByRole("checkbox", { name: "Local verification step" }),
    ).toBeVisible();
    const elapsed: number[] = [];
    for (let sample = 0; sample < 3; sample++) {
      const start = performance.now();
      await page.reload();
      await expect(
        page.getByRole("checkbox", { name: "Local verification step" }),
      ).toBeVisible();
      elapsed.push(performance.now() - start);
    }
    await info.attach("today-90-day-history", {
      body: JSON.stringify({
        elapsedMs: elapsed,
        environment:
          "Warm local production server, Chromium, unthrottled, local Supabase",
      }),
      contentType: "application/json",
    });
    console.log(
      "Today 90-day history load times (ms):",
      elapsed.map(Math.round),
    );
    expect(Math.max(...elapsed)).toBeLessThanOrEqual(1500);
  } finally {
    await admin.from("workflow_runs").delete().eq("template_id", id);
    await admin.from("workflow_templates").delete().eq("id", id);
  }
});
