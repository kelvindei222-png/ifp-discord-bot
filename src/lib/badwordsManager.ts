import fs from "fs";
import path from "path";

const filePath = path.join(__dirname, "../data/badwords.json");

export function getBadWords(): string[] {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function addBadWord(word: string): boolean {
  const words = getBadWords();
  const lower = word.toLowerCase();
  if (words.includes(lower)) return false;

  words.push(lower);
  fs.writeFileSync(filePath, JSON.stringify(words, null, 2));
  return true;
}

export function removeBadWord(word: string): boolean {
  const words = getBadWords();
  const filtered = words.filter(w => w !== word.toLowerCase());
  if (words.length === filtered.length) return false;

  fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
  return true;
}
