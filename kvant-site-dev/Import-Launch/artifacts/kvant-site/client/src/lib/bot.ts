export const BOT_USERNAME = "physictutor_bot";
export const BOT_URL = `https://t.me/${BOT_USERNAME}`;
export function botLink(start: string) {
  return `${BOT_URL}?start=${start}`;
}
