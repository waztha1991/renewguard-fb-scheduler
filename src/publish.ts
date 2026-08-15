import type { Env, PostRow } from "./types";
import { publishPhotoToPage } from "./facebook";
import { publishImagePostToLinkedIn } from "./linkedin";

export async function getConfig(env: Env, key: string): Promise<string | null> {
  const row = await env.DB.prepare("SELECT value FROM config WHERE key = ?").bind(key).first<{ value: string }>();
  return row ? row.value : null;
}

export async function setConfig(env: Env, key: string, value: string): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  )
    .bind(key, value)
    .run();
}

/** App-level credentials can be set either in the dashboard (stored in D1) or as GitHub/Worker
 * secrets at deploy time. Values saved in the dashboard always take priority. */
export async function getCredentials(env: Env) {
  const [fbAppId, fbAppSecret, liClientId, liClientSecret] = await Promise.all([
    getConfig(env, "fb_app_id"),
    getConfig(env, "fb_app_secret"),
    getConfig(env, "li_client_id"),
    getConfig(env, "li_client_secret"),
  ]);
  return {
    fbAppId: fbAppId || env.FB_APP_ID || "",
    fbAppSecret: fbAppSecret || env.FB_APP_SECRET || "",
    liClientId: liClientId || env.LINKEDIN_CLIENT_ID || "",
    liClientSecret: liClientSecret || env.LINKEDIN_CLIENT_SECRET || "",
  };
}

/** Public URL any platform's servers (and the dashboard) can fetch this post's image from. */
export function resolveImageUrl(origin: string, post: PostRow): string {
  if (post.image_source === "uploaded") return `${origin}/image/${post.id}`;
  return post.image_url || "";
}

export async function activeCampaign(env: Env) {
  return env.DB.prepare("SELECT * FROM campaigns WHERE automation_enabled = 1 LIMIT 1").first<{
    id: number;
    name: string;
    start_date: string | null;
    automation_enabled: number;
  }>();
}

export async function currentDueDay(env: Env): Promise<{ campaignId: number; day: number } | null> {
  const campaign = await activeCampaign(env);
  if (!campaign || !campaign.start_date) return null;
  const start = new Date(campaign.start_date + "T00:00:00Z");
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const diffDays = Math.floor((todayUtc.getTime() - start.getTime()) / 86400000) + 1;
  if (diffDays < 1) return null;
  return { campaignId: campaign.id, day: diffDays };
}

async function logPublish(env: Env, postId: number, platform: string, ok: boolean, message: string): Promise<void> {
  await env.DB.prepare("INSERT INTO publish_log (post_id, at, ok, message) VALUES (?, ?, ?, ?)")
    .bind(postId, Date.now(), ok ? 1 : 0, `[${platform}] ${message}`)
    .run();
}

async function publishToFacebook(env: Env, origin: string, post: PostRow): Promise<{ ok: boolean; message: string }> {
  const pageId = await getConfig(env, "fb_page_id");
  const pageToken = await getConfig(env, "fb_page_token");
  if (!pageId || !pageToken) return { ok: false, message: "No Facebook page connected" };

  const imageUrl = resolveImageUrl(origin, post);
  if (!imageUrl) return { ok: false, message: "Post has no image" };
  const caption = [post.caption, post.hashtags].filter(Boolean).join("\n\n");

  try {
    const result = await publishPhotoToPage(pageId, pageToken, imageUrl, caption);
    await env.DB.prepare("UPDATE posts SET status = 'published', fb_post_id = ?, published_at = ? WHERE id = ?")
      .bind(result.id, Date.now(), post.id)
      .run();
    return { ok: true, message: `Facebook post ${result.id}` };
  } catch (err: any) {
    await env.DB.prepare("UPDATE posts SET status = 'failed' WHERE id = ?").bind(post.id).run();
    return { ok: false, message: String(err?.message || err) };
  }
}

async function publishToLinkedIn(env: Env, origin: string, post: PostRow): Promise<{ ok: boolean; message: string }> {
  const accessToken = await getConfig(env, "li_access_token");
  const personUrn = await getConfig(env, "li_person_urn");
  if (!accessToken || !personUrn) return { ok: false, message: "No LinkedIn account connected" };

  const imageUrl = resolveImageUrl(origin, post);
  if (!imageUrl) return { ok: false, message: "Post has no image" };
  const commentary = [post.caption, post.hashtags].filter(Boolean).join("\n\n");

  try {
    const result = await publishImagePostToLinkedIn(accessToken, personUrn, imageUrl, commentary);
    await env.DB.prepare("UPDATE posts SET li_status = 'published', li_post_id = ?, li_published_at = ? WHERE id = ?")
      .bind(result.id, Date.now(), post.id)
      .run();
    return { ok: true, message: `LinkedIn post ${result.id || "published"}` };
  } catch (err: any) {
    await env.DB.prepare("UPDATE posts SET li_status = 'failed' WHERE id = ?").bind(post.id).run();
    return { ok: false, message: String(err?.message || err) };
  }
}

/** Publishes a post to every platform it's toggled on for. Returns a combined, human-readable result. */
export async function publishPostById(
  env: Env,
  origin: string,
  postId: number
): Promise<{ ok: boolean; message: string }> {
  const post = await env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(postId).first<PostRow>();
  if (!post) return { ok: false, message: "Post not found" };

  const messages: string[] = [];
  let anyOk = false;
  let anyAttempted = false;

  if (post.publish_facebook && post.status !== "published") {
    anyAttempted = true;
    const r = await publishToFacebook(env, origin, post);
    await logPublish(env, post.id, "facebook", r.ok, r.message);
    messages.push(`Facebook: ${r.message}`);
    if (r.ok) anyOk = true;
  }
  if (post.publish_linkedin && post.li_status !== "published") {
    anyAttempted = true;
    const r = await publishToLinkedIn(env, origin, post);
    await logPublish(env, post.id, "linkedin", r.ok, r.message);
    messages.push(`LinkedIn: ${r.message}`);
    if (r.ok) anyOk = true;
  }

  if (!anyAttempted) return { ok: true, message: "Already published on every enabled platform" };
  return { ok: anyOk, message: messages.join(" · ") };
}
