import type { Env, PostRow } from "./types";
import { json, getCookie, sessionCookie, clearSessionCookie, randomToken } from "./types";
import { dashboardHtml } from "./dashboard";
import { exchangeCodeForUserToken, exchangeForLongLivedToken, listManagedPages } from "./facebook";
import { exchangeLinkedInCode, getLinkedInProfile } from "./linkedin";
import { getConfig, setConfig, getCredentials, currentDueDay, publishPostById, resolveImageUrl } from "./publish";

async function requireSession(req: Request, env: Env): Promise<boolean> {
  const token = getCookie(req, "session");
  if (!token) return false;
  const stored = await getConfig(env, "session_token");
  return !!stored && stored === token;
}

function pageSelectorHtml(pages: { id: string; name: string; access_token: string }[]): string {
  const rows = pages
    .map(
      (p) => `
      <form method="POST" action="/auth/facebook/select" style="margin-bottom:10px">
        <input type="hidden" name="page_id" value="${p.id}" />
        <input type="hidden" name="page_name" value="${p.name.replace(/"/g, "&quot;")}" />
        <input type="hidden" name="page_token" value="${p.access_token}" />
        <button type="submit" style="width:100%;padding:14px;font-size:16px;border-radius:10px;border:1px solid #dcece1;background:#fff;cursor:pointer;font-weight:700">${p.name}</button>
      </form>`
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Choose a Page</title>
  <style>body{font-family:sans-serif;max-width:480px;margin:80px auto;padding:0 16px}</style></head>
  <body><h2>Choose the Facebook Page to connect</h2>${rows || "<p>No pages found for this account.</p>"}</body></html>`;
}

function postToJson(origin: string, p: PostRow) {
  return { ...p, resolved_image_url: resolveImageUrl(origin, p) };
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    const origin = url.origin;

    if (path === "/" && req.method === "GET") {
      // Remember our own public origin so the cron handler (which has no request) can build image URLs.
      ctx.waitUntil(setConfig(env, "worker_origin", origin));
      return new Response(dashboardHtml(), { headers: { "Content-Type": "text/html" } });
    }

    const imageMatch = path.match(/^\/image\/(\d+)$/);
    if (imageMatch && req.method === "GET") {
      const post = await env.DB.prepare("SELECT image_data, image_mime FROM posts WHERE id = ?")
        .bind(parseInt(imageMatch[1], 10))
        .first<{ image_data: string | null; image_mime: string | null }>();
      if (!post || !post.image_data) return new Response("Not found", { status: 404 });
      const bytes = Uint8Array.from(atob(post.image_data), (c) => c.charCodeAt(0));
      return new Response(bytes, {
        headers: { "Content-Type": post.image_mime || "image/png", "Cache-Control": "public, max-age=86400" },
      });
    }

    if (path === "/api/login" && req.method === "POST") {
      const body = (await req.json()) as { username?: string; password?: string };
      if (body.username === env.ADMIN_USER && body.password === env.ADMIN_PASSWORD) {
        const token = randomToken();
        await setConfig(env, "session_token", token);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json", "Set-Cookie": sessionCookie(token) },
        });
      }
      return json({ error: "Invalid username or password" }, 401);
    }
    if (path === "/api/logout" && req.method === "POST") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json", "Set-Cookie": clearSessionCookie() },
      });
    }

    if ((path.startsWith("/api/") || path.startsWith("/auth/")) && !(await requireSession(req, env))) {
      return json({ error: "Not authenticated" }, 401);
    }

    if (path === "/auth/facebook/start" && req.method === "GET") {
      const creds = await getCredentials(env);
      if (!creds.fbAppId) return new Response("Facebook App ID not configured — set it in Settings first.", { status: 400 });
      const redirectUri = `${origin}/auth/facebook/callback`;
      const authUrl =
        `https://www.facebook.com/v19.0/dialog/oauth?client_id=${creds.fbAppId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent("pages_show_list,pages_manage_posts,pages_read_engagement")}` +
        `&response_type=code`;
      return Response.redirect(authUrl, 302);
    }

    if (path === "/auth/facebook/callback" && req.method === "GET") {
      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing code", { status: 400 });
      try {
        const creds = await getCredentials(env);
        const redirectUri = `${origin}/auth/facebook/callback`;
        const shortToken = await exchangeCodeForUserToken(creds.fbAppId, creds.fbAppSecret, code, redirectUri);
        const longToken = await exchangeForLongLivedToken(creds.fbAppId, creds.fbAppSecret, shortToken);
        const pages = await listManagedPages(longToken);
        if (pages.length === 1) {
          await setConfig(env, "fb_page_id", pages[0].id);
          await setConfig(env, "fb_page_name", pages[0].name);
          await setConfig(env, "fb_page_token", pages[0].access_token);
          return Response.redirect(`${origin}/`, 302);
        }
        return new Response(pageSelectorHtml(pages), { headers: { "Content-Type": "text/html" } });
      } catch (err: any) {
        return new Response(`Facebook connection failed: ${err?.message || err}`, { status: 500 });
      }
    }

    if (path === "/auth/facebook/select" && req.method === "POST") {
      const form = await req.formData();
      await setConfig(env, "fb_page_id", String(form.get("page_id")));
      await setConfig(env, "fb_page_name", String(form.get("page_name")));
      await setConfig(env, "fb_page_token", String(form.get("page_token")));
      return Response.redirect(`${origin}/`, 302);
    }

    // ---- LinkedIn OAuth (posts to the connected personal profile) ----
    if (path === "/auth/linkedin/start" && req.method === "GET") {
      const creds = await getCredentials(env);
      if (!creds.liClientId) return new Response("LinkedIn Client ID not configured — set it in Settings first.", { status: 400 });
      const redirectUri = `${origin}/auth/linkedin/callback`;
      const authUrl =
        `https://www.linkedin.com/oauth/v2/authorization?response_type=code` +
        `&client_id=${creds.liClientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent("openid profile w_member_social")}`;
      return Response.redirect(authUrl, 302);
    }

    if (path === "/auth/linkedin/callback" && req.method === "GET") {
      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing code", { status: 400 });
      try {
        const creds = await getCredentials(env);
        const redirectUri = `${origin}/auth/linkedin/callback`;
        const accessToken = await exchangeLinkedInCode(creds.liClientId, creds.liClientSecret, code, redirectUri);
        const profile = await getLinkedInProfile(accessToken);
        await setConfig(env, "li_access_token", accessToken);
        await setConfig(env, "li_person_urn", `urn:li:person:${profile.sub}`);
        await setConfig(env, "li_person_name", profile.name);
        return Response.redirect(`${origin}/`, 302);
      } catch (err: any) {
        return new Response(`LinkedIn connection failed: ${err?.message || err}`, { status: 500 });
      }
    }

    function mask(v: string): string {
      if (!v) return "";
      return v.length <= 4 ? "••••" : v.slice(0, 2) + "••••" + v.slice(-2);
    }

    if (path === "/api/settings" && req.method === "GET") {
      const creds = await getCredentials(env);
      return json({
        fb_app_id: creds.fbAppId,
        fb_app_secret_set: !!creds.fbAppSecret,
        fb_app_secret_masked: mask(creds.fbAppSecret),
        li_client_id: creds.liClientId,
        li_client_secret_set: !!creds.liClientSecret,
        li_client_secret_masked: mask(creds.liClientSecret),
      });
    }

    if (path === "/api/settings" && req.method === "POST") {
      const body = (await req.json()) as {
        fb_app_id?: string;
        fb_app_secret?: string;
        li_client_id?: string;
        li_client_secret?: string;
      };
      if (body.fb_app_id !== undefined) await setConfig(env, "fb_app_id", body.fb_app_id.trim());
      if (body.fb_app_secret) await setConfig(env, "fb_app_secret", body.fb_app_secret.trim());
      if (body.li_client_id !== undefined) await setConfig(env, "li_client_id", body.li_client_id.trim());
      if (body.li_client_secret) await setConfig(env, "li_client_secret", body.li_client_secret.trim());
      return json({ ok: true });
    }

    if (path === "/api/status" && req.method === "GET") {
      const pageId = await getConfig(env, "fb_page_id");
      const pageName = await getConfig(env, "fb_page_name");
      const liName = await getConfig(env, "li_person_name");
      const due = await currentDueDay(env);
      return json({
        connected: !!pageId,
        page_id: pageId,
        page_name: pageName,
        linkedin_connected: !!liName,
        linkedin_name: liName,
        due,
      });
    }

    if (path === "/api/disconnect" && req.method === "POST") {
      await setConfig(env, "fb_page_id", "");
      await setConfig(env, "fb_page_name", "");
      await setConfig(env, "fb_page_token", "");
      return json({ ok: true });
    }

    if (path === "/api/disconnect/linkedin" && req.method === "POST") {
      await setConfig(env, "li_access_token", "");
      await setConfig(env, "li_person_urn", "");
      await setConfig(env, "li_person_name", "");
      return json({ ok: true });
    }

    if (path === "/api/campaigns" && req.method === "GET") {
      const { results } = await env.DB.prepare(
        `SELECT c.*,
          (SELECT COUNT(*) FROM posts p WHERE p.campaign_id = c.id) AS post_count,
          (SELECT COUNT(*) FROM posts p WHERE p.campaign_id = c.id AND p.status = 'published') AS published_count
         FROM campaigns c ORDER BY c.id DESC`
      ).all();
      return json(results || []);
    }

    if (path === "/api/campaigns" && req.method === "POST") {
      const body = (await req.json()) as { name?: string };
      const name = (body.name || "").trim();
      if (!name) return json({ error: "Campaign name required" }, 400);
      const res = await env.DB.prepare(
        "INSERT INTO campaigns (name, start_date, automation_enabled, created_at) VALUES (?, NULL, 0, ?)"
      )
        .bind(name, Date.now())
        .run();
      return json({ id: res.meta.last_row_id, name });
    }

    const campaignIdMatch = path.match(/^\/api\/campaigns\/(\d+)$/);
    if (campaignIdMatch && req.method === "DELETE") {
      const id = parseInt(campaignIdMatch[1], 10);
      await env.DB.prepare("DELETE FROM publish_log WHERE post_id IN (SELECT id FROM posts WHERE campaign_id = ?)")
        .bind(id)
        .run();
      await env.DB.prepare("DELETE FROM posts WHERE campaign_id = ?").bind(id).run();
      await env.DB.prepare("DELETE FROM campaigns WHERE id = ?").bind(id).run();
      return json({ ok: true });
    }

    const campaignStartMatch = path.match(/^\/api\/campaigns\/(\d+)\/start$/);
    if (campaignStartMatch && req.method === "POST") {
      const id = parseInt(campaignStartMatch[1], 10);
      const body = (await req.json()) as { start_date?: string };
      if (!body.start_date) return json({ error: "start_date required" }, 400);
      await env.DB.prepare("UPDATE campaigns SET automation_enabled = 0").run();
      await env.DB.prepare("UPDATE campaigns SET automation_enabled = 1, start_date = ? WHERE id = ?")
        .bind(body.start_date, id)
        .run();
      return json({ ok: true });
    }

    const campaignPauseMatch = path.match(/^\/api\/campaigns\/(\d+)\/pause$/);
    if (campaignPauseMatch && req.method === "POST") {
      const id = parseInt(campaignPauseMatch[1], 10);
      await env.DB.prepare("UPDATE campaigns SET automation_enabled = 0 WHERE id = ?").bind(id).run();
      return json({ ok: true });
    }

    if (path === "/api/posts" && req.method === "GET") {
      const campaignId = url.searchParams.get("campaign_id");
      if (!campaignId) return json({ error: "campaign_id required" }, 400);
      const { results } = await env.DB.prepare("SELECT * FROM posts WHERE campaign_id = ? ORDER BY day_offset")
        .bind(parseInt(campaignId, 10))
        .all<PostRow>();
      return json((results || []).map((p) => postToJson(origin, p)));
    }

    if (path === "/api/posts" && req.method === "POST") {
      const form = await req.formData();
      const campaignId = parseInt(String(form.get("campaign_id") || "0"), 10);
      const dayOffset = parseInt(String(form.get("day_offset") || "0"), 10);
      const caption = String(form.get("caption") || "");
      if (!campaignId || !dayOffset || !caption) {
        return json({ error: "campaign_id, day_offset, and caption are required" }, 400);
      }
      const pillar = String(form.get("pillar") || "");
      const focus = String(form.get("focus") || "");
      const hashtags = String(form.get("hashtags") || "");
      const cta = String(form.get("cta") || "");
      const file = form.get("image") as File | null;
      const publishFacebook = form.get("publish_facebook") === "1" ? 1 : 0;
      const publishLinkedin = form.get("publish_linkedin") === "1" ? 1 : 0;

      let imageSource = "external";
      let imageData: string | null = null;
      let imageMime: string | null = null;
      let imageUrl: string | null = String(form.get("image_url") || "") || null;

      if (file && file.size > 0) {
        const buf = new Uint8Array(await file.arrayBuffer());
        let binary = "";
        for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
        imageData = btoa(binary);
        imageMime = file.type || "image/png";
        imageSource = "uploaded";
        imageUrl = null;
      }

      const res = await env.DB.prepare(
        `INSERT INTO posts (campaign_id, day_offset, pillar, focus, caption, hashtags, cta, image_source, image_url, image_data, image_mime, publish_facebook, publish_linkedin)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          campaignId,
          dayOffset,
          pillar,
          focus,
          caption,
          hashtags,
          cta,
          imageSource,
          imageUrl,
          imageData,
          imageMime,
          publishFacebook,
          publishLinkedin
        )
        .run();
      return json({ id: res.meta.last_row_id });
    }

    const postIdMatch = path.match(/^\/api\/posts\/(\d+)$/);
    if (postIdMatch && req.method === "PUT") {
      const id = parseInt(postIdMatch[1], 10);
      const form = await req.formData();
      const fields: string[] = [];
      const values: any[] = [];
      for (const [key, col] of [
        ["pillar", "pillar"],
        ["focus", "focus"],
        ["caption", "caption"],
        ["hashtags", "hashtags"],
        ["cta", "cta"],
        ["day_offset", "day_offset"],
        ["publish_facebook", "publish_facebook"],
        ["publish_linkedin", "publish_linkedin"],
      ] as const) {
        const v = form.get(key);
        if (v !== null) {
          fields.push(`${col} = ?`);
          values.push(key === "day_offset" ? parseInt(String(v), 10) : key.startsWith("publish_") ? (v === "1" ? 1 : 0) : String(v));
        }
      }
      const file = form.get("image") as File | null;
      if (file && file.size > 0) {
        const buf = new Uint8Array(await file.arrayBuffer());
        let binary = "";
        for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
        fields.push("image_source = ?", "image_data = ?", "image_mime = ?", "image_url = ?");
        values.push("uploaded", btoa(binary), file.type || "image/png", null);
      }
      if (fields.length === 0) return json({ error: "Nothing to update" }, 400);
      values.push(id);
      await env.DB.prepare(`UPDATE posts SET ${fields.join(", ")} WHERE id = ?`)
        .bind(...values)
        .run();
      return json({ ok: true });
    }

    if (postIdMatch && req.method === "DELETE") {
      const id = parseInt(postIdMatch[1], 10);
      await env.DB.prepare("DELETE FROM publish_log WHERE post_id = ?").bind(id).run();
      await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
      return json({ ok: true });
    }

    const publishMatch = path.match(/^\/api\/publish\/(\d+)$/);
    if (publishMatch && req.method === "POST") {
      const id = parseInt(publishMatch[1], 10);
      const result = await publishPostById(env, origin, id);
      return json(result, result.ok ? 200 : 500);
    }

    return new Response("Not found", { status: 404 });
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const due = await currentDueDay(env);
    if (!due) return;
    const post = await env.DB.prepare("SELECT id FROM posts WHERE campaign_id = ? AND day_offset = ?")
      .bind(due.campaignId, due.day)
      .first<{ id: number }>();
    if (!post) return;
    const origin = (await getConfig(env, "worker_origin")) || "";
    if (!origin) return;
    ctx.waitUntil(publishPostById(env, origin, post.id).then(() => undefined));
  },
};
