export function formatSummaryText(summaryText: string): string[] {
  return summaryText
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => line.trim().replace(/^-\s*/, ""));
}
