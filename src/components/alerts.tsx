import Link from "next/link";
import { AlertItem, SectionCard } from "@/components/operational";
import { DetailDrawer } from "@/components/overlays";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states";
import { AlertControls } from "@/components/alert-controls";
import { todayAlerts } from "@/services/alerts";
import { jakartaDateTime } from "@/domain/dates";

export async function Alerts() {
  const alerts = await todayAlerts().catch(() => null);
  if (!alerts)
    return (
      <SectionCard title="Alerts">
        <p role="alert" className="p-5 text-sm">
          Alert belum dapat dimuat. Muat ulang atau periksa Integrations.
        </p>
      </SectionCard>
    );
  const groups = (["critical", "warning", "info"] as const).map((severity) => ({
    severity,
    rows: alerts.filter((alert) => alert.severity === severity),
  }));
  return (
    <div id="alerts">
      <SectionCard
        title="Alerts"
        description="Kondisi aktif yang membutuhkan perhatian, dikelompokkan berdasarkan severity."
      >
        {!alerts.length ? (
          <EmptyState
            title="Tidak ada alert aktif"
            description="Kondisi yang terdeteksi akan muncul di sini; keadaan kosong tidak membuat data pengganti."
          />
        ) : (
          <div className="divide-y">
            {groups
              .filter((group) => group.rows.length)
              .map((group) => (
                <section
                  key={group.severity}
                  aria-labelledby={`alerts-${group.severity}`}
                >
                  <h3
                    id={`alerts-${group.severity}`}
                    className="bg-muted px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {group.severity} · {group.rows.length}
                  </h3>
                  {group.rows.map((alert) => (
                    <AlertItem
                      key={alert.id}
                      severity={alert.severity}
                      title={alert.title}
                      evidence={`${alert.message} · ${alert.occurrenceCount} occurrence · last seen ${jakartaDateTime(new Date(alert.lastSeenAt))} WIB`}
                      actions={
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <AlertControls id={alert.id} />
                          <DetailDrawer
                            trigger={
                              <Button variant="outline">Detail alert</Button>
                            }
                            title={alert.title}
                            description={`${alert.type} · ${alert.entityType}`}
                          >
                            <div className="space-y-5 text-sm">
                              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
                                <dt>Alert ID</dt>
                                <dd className="break-all font-mono text-xs">
                                  {alert.id}
                                </dd>
                                <dt>First seen</dt>
                                <dd>
                                  {jakartaDateTime(new Date(alert.firstSeenAt))}{" "}
                                  WIB
                                </dd>
                                <dt>Last seen</dt>
                                <dd>
                                  {jakartaDateTime(new Date(alert.lastSeenAt))}{" "}
                                  WIB
                                </dd>
                                <dt>Occurrences</dt>
                                <dd>{alert.occurrenceCount}</dd>
                                <dt>Slack deliveries</dt>
                                <dd>{alert.notificationCount}</dd>
                                {alert.entityId && (
                                  <>
                                    <dt>Entity ID</dt>
                                    <dd className="break-all font-mono text-xs">
                                      {alert.entityId}
                                    </dd>
                                  </>
                                )}
                                {alert.evidence.map((item) => (
                                  <div className="contents" key={item.label}>
                                    <dt>{item.label}</dt>
                                    <dd className="break-all">{item.value}</dd>
                                  </div>
                                ))}
                              </dl>
                              {alert.playbook && (
                                <Link
                                  className="text-primary underline"
                                  href={`/playbook/${alert.playbook}`}
                                >
                                  Buka panduan terkait
                                </Link>
                              )}
                              <div>
                                <h4 className="mb-2 font-medium">
                                  Lifecycle history
                                </h4>
                                <ol className="space-y-2 border-l pl-4">
                                  {alert.history.map((event, index) => (
                                    <li key={`${event.at}-${index}`}>
                                      <p>{event.event.replaceAll("_", " ")}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {jakartaDateTime(new Date(event.at))}{" "}
                                        WIB
                                        {event.reason
                                          ? ` · ${event.reason}`
                                          : ""}
                                        {event.code ? ` · ${event.code}` : ""}
                                      </p>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            </div>
                          </DetailDrawer>
                        </div>
                      }
                    />
                  ))}
                </section>
              ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
