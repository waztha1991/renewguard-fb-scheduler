import type { Env } from "./types";

const LI_VERSION = "202401";

export async function exchangeLinkedInCode(env: Env, code: string, redirectUri: string): Promise<string> {
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: env.LINKEDIN_CLIENT_ID,
      client_secret: env.LINKEDIN_CLIENT_SECRET,
    }),
  });
  const data = (await res.json()) as { access_token?: string; error_description?: string };
  if (!data.access_token) throw new Error(data.error_description || "LinkedIn token exchange failed");
  return data.access_token;
}

export async function getLinkedInProfile(accessToken: string): Promise<{ sub: string; name: string }> {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as { sub?: string; name?: string; error_description?: string };
  if (!data.sub) throw new Error(data.error_description || "Could not read LinkedIn profile");
  return { sub: data.sub, name: data.name || "LinkedIn member" };
}

async function registerImageUpload(accessToken: string, ownerUrn: string): Promise<{ uploadUrl: string; asset: string }> {
  const res = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": LI_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({ initializeUploadRequest: { owner: ownerUrn } }),
  });
  const data = (await res.json()) as {
    value?: { uploadUrl: string; image: string };
    message?: string;
  };
  if (!data.value) throw new Error(data.message || "LinkedIn image upload init failed");
  return { uploadUrl: data.value.uploadUrl, asset: data.value.image };
}

export async function publishImagePostToLinkedIn(
  accessToken: string,
  ownerUrn: string,
  imageUrl: string,
  commentary: string
): Promise<{ id: string }> {
  // 1. Fetch the image bytes from wherever it's hosted (our own /image/:id route or an external URL).
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Could not fetch image for LinkedIn upload (${imgRes.status})`);
  const imgBytes = await imgRes.arrayBuffer();

  // 2. Register the upload, then PUT the raw bytes to LinkedIn's returned URL.
  const { uploadUrl, asset } = await registerImageUpload(accessToken, ownerUrn);
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: imgBytes,
  });
  if (!putRes.ok) throw new Error(`LinkedIn image upload failed (${putRes.status})`);

  // 3. Create the post referencing the uploaded image asset.
  const postRes = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": LI_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: ownerUrn,
      commentary,
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      content: { media: { id: asset } },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  if (!postRes.ok) {
    const errText = await postRes.text();
    throw new Error(`LinkedIn post failed (${postRes.status}): ${errText.slice(0, 300)}`);
  }
  const id = postRes.headers.get("x-restli-id") || postRes.headers.get("x-linkedin-id") || "";
  return { id };
}
