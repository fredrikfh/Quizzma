export function getEmojiForLine(index: number): string {
  const emojis = ["1️⃣", "2️⃣", "3️⃣"];
  return emojis[index % emojis.length];
}
