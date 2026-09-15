export function parseCampaignName(name: string) {
  const match =
    /^(.+?) - Fase([1-5]) - (Jan|Feb|Mar|Apr|Mei|May|Jun|Jul|Agu|Aug|Sep|Okt|Oct|Nov|Des|Dec)$/.exec(
      name.trim(),
    );
  return match
    ? { product: match[1], phase: Number(match[2]), month: match[3] }
    : null;
}
export function parseAdsetName(name: string) {
  const match = /^(T\d+) - (.+)$/.exec(name.trim());
  return match ? { topic: match[1], label: match[2] } : null;
}
export function parseAdName(name: string) {
  const match = /^(T\d+)-([A-Z0-9_]+)-(H\d+)-([A-Z0-9_]+)-([A-Z0-9_]+)$/.exec(
    name.trim(),
  );
  return match
    ? {
        topic: match[1],
        angle: match[2],
        hook: match[3],
        format: match[4],
        visual: match[5],
      }
    : null;
}
