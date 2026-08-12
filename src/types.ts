export interface Env {
  DB: D1Database;
  FB_APP_ID: string;
  FB_APP_SECRET: string;
  ADMIN_USER: string;
  ADMIN_PASSWORD: string;
}

export interface Campaign {
  id: number;
  name: string;
  start_date: string | null;
  automation_enabled: number;
  created_at: number;
}

export interface PostRow {
  id: number;
  campaign_id: number;
  day_offset: number;
  pillar: string;
  focus: string;
  caption: string;
  hashtags: string;
  cta: string;
  image_source: "external" | "uploaded";
  image_url: string | null;
  image_data: string | null;
  image_mime: string | null;
  status: "pending" | "published" | "failed";
  fb_post_id: string | null;
  published_at: number | null;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function randomToken(bytes = 24): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get("Cookie") || "";
  const match = header.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export function sessionCookie(token: string): string {
  return `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}

export function clearSessionCookie(): string {
  return "session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}
