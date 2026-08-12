import type { Env, PostRow } from "./types";
import { publishPhotoToPage } from "./facebook";

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

/** Public URL Facebook (and the dashboard) can fetch this post's image from. */
export function resolveImageUrl(origin: string, post: PostRow): string {
  if (post.image_source === "uploaded") return `${origin}/image/${post.id}`;
  return post.image_url || "";
}

/** Finds the currently-active campaign (automation_enabled = 1), if any. */
export async function activeCampaign(env: Env) {
  return env.DB.prepare("SELECT * FROM campaigns WHERE automation_enabled = 1 LIMIT 1").first<{
    id: number;
    name: string;
    start_date: string | null;
    automation_enabled: number;
  }>();
}

/** Which day_offset should be live today for the active campaign. Null if none due. */
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

export async function publishPostById(
  env: Env,
  origin: string,
  postId: number
): Promise<{ ok: boolean; message: string }> {
  const post = await env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(postId).first<PostRow>();
  if (!post) return { ok: false, message: "Post not found" };
  if (post.status === "published") return { ok: true, message: "Already published" };

  const pageId = await getConfig(env, "fb_page_id");
  const pageToken = await getConfig(env, "fb_page_token");
  if (!pageId || !pageToken) {
    await logPublish(env, post.id, false, "No Facebook page connected");
    return { ok: false, message: "No Facebook page connected" };
  }

  const imageUrl = resolveImageUrl(origin, post);
  if (!imageUrl) {
    await logPublish(env, post.id, false, "Post has no image");
    return { ok: false, message: "Post has no image" };
  }
  const caption = [post.caption, post.hashtags].filter(Boolean).join("\n\n");

  try {
    const result = await publishPhotoToPage(pageId, pageToken, imageUrl, caption);
    await env.DB.prepare("UPDATE posts SET status = 'published', fb_post_id = ?, published_at = ? WHERE id = ?")
      .bind(result.id, Date.now(), post.id)
      .run();
    await logPublish(env, post.id, true, `Published as Facebook post ${result.id}`);
    return { ok: true, message: `Published (Facebook post ${result.id})` };
  } catch (err: any) {
    await env.DB.prepare("UPDATE posts SET status = 'failed' WHERE id = ?").bind(post.id).run();
    await logPublish(env, post.id, false, String(err?.message || err));
    return { ok: false, message: String(err?.message || err) };
  }
}

async function logPublish(env: Env, postId: number, ok: boolean, message: string): Promise<void> {
  await env.DB.prepare("INSERT INTO publish_log (post_id, at, ok, message) VALUES (?, ?, ?, ?)")
    .bind(postId, Date.now(), ok ? 1 : 0, message)
    .run();
}
