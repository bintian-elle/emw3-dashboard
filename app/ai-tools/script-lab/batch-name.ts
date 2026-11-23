const batchTimeFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Chicago",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function batchName(value: string) {
  return `Biceek · ${batchTimeFormatter.format(new Date(value))}`;
}
