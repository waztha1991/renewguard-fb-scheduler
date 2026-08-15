const GRAPH = "https://graph.facebook.com/v19.0";

export interface FbPage {
  id: string;
  name: string;
  access_token: string;
}

export async function exchangeCodeForUserToken(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<string> {
  const url =
    `${GRAPH}/oauth/access_token?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&client_secret=${clientSecret}&code=${encodeURIComponent(code)}`;
  const res = await fetch(url);
  const data = (await res.json()) as { access_token?: string; error?: { message: string } };
  if (!data.access_token) throw new Error(data.error?.message || "Facebook token exchange failed");
  return data.access_token;
}

export async function exchangeForLongLivedToken(
  clientId: string,
  clientSecret: string,
  shortToken: string
): Promise<string> {
  const url =
    `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token` +
    `&client_id=${clientId}&client_secret=${clientSecret}` +
    `&fb_exchange_token=${encodeURIComponent(shortToken)}`;
  const res = await fetch(url);
  const data = (await res.json()) as { access_token?: string; error?: { message: string } };
  if (!data.access_token) throw new Error(data.error?.message || "Facebook long-lived exchange failed");
  return data.access_token;
}

export async function listManagedPages(longLivedUserToken: string): Promise<FbPage[]> {
  const url = `${GRAPH}/me/accounts?access_token=${encodeURIComponent(longLivedUserToken)}&fields=id,name,access_token`;
  const res = await fetch(url);
  const data = (await res.json()) as { data?: FbPage[]; error?: { message: string } };
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}

export async function publishPhotoToPage(
  pageId: string,
  pageAccessToken: string,
  imageUrl: string,
  caption: string
): Promise<{ id: string }> {
  const res = await fetch(`${GRAPH}/${pageId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      url: imageUrl,
      caption,
      access_token: pageAccessToken,
    }),
  });
  const data = (await res.json()) as { id?: string; post_id?: string; error?: { message: string } };
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Facebook publish failed (${res.status})`);
  }
  return { id: data.post_id || data.id || "" };
}
