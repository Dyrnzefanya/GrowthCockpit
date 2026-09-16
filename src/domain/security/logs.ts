export function scrubLogValue(value: string | null) {
  return value
    ?.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
    .replace(/(?<!\d)(?:\+?62|0)8\d{8,11}(?!\d)/g, "[phone]")
    .replace(/https?:\/\/[^\s)]+/g, "[url]")
    .slice(0, 4000);
}
