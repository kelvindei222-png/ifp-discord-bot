import fs from "fs";
import path from "path";

const dirPath = path.join(__dirname, "../../data");
const filePath = path.join(dirPath, "mutedUsers.json");

interface MuteData {
  userId: string;
  guildId: string;
  unmuteAt: number;
}

export function loadMuteStore(): Record<string, MuteData> {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw || "{}");
}

export function saveMuteStore(data: Record<string, MuteData>) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
