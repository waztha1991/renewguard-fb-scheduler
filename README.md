# RenewGuard Social Scheduler

Connects to your Facebook Page and LinkedIn profile, and automatically
publishes scheduled flyers — using Cloudflare Workers + D1 + a daily Cron
Trigger. The dashboard lets you manage multiple campaigns (schedules), add
or delete flyers, upload your own images, choose which platform(s) each
flyer goes to, watch progress, and manually publish/retry any post.

Infrastructure already provisioned:
- **D1 database** `renewguard-fb-scheduler-dev` (bound as `DB`), with a
  `campaigns` table (each a named, independent schedule) and a `posts`
  table (each post can target Facebook, LinkedIn, or both).
- Images can be **uploaded directly through the app** (stored in D1, served
  from this Worker's own `/image/:id` route) or reference an external URL
  (used by the original 30-day launch campaign, hosted on `renewguard-landing`).

## 1. Create a Meta (Facebook) Developer App

1. [developers.facebook.com](https://developers.facebook.com) → My Apps → Create App → "Other" → "Business".
2. Add the **Facebook Login** product.
3. Facebook Login → Settings → Valid OAuth Redirect URIs, add:
   `https://renewguard-fb-scheduler-dev.<your-subdomain>.workers.dev/auth/facebook/callback`
4. Copy the **App ID** and **App Secret** from Settings → Basic.
5. The Facebook account you connect with must be an admin of the target Page.

## 2. Create a LinkedIn Developer App

1. [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps) → Create app.
2. Under **Products**, request **"Sign In with LinkedIn using OpenID Connect"**
   (instant approval) — this is enough to post to your **personal profile**.
3. Under **Auth**, add this redirect URL:
   `https://renewguard-fb-scheduler-dev.<your-subdomain>.workers.dev/auth/linkedin/callback`
4. Copy the **Client ID** and **Client Secret** from the Auth tab.

> **Posting to a LinkedIn Company Page** instead of a personal profile needs
> LinkedIn's separate **Community Management API** access, which requires a
> manual partner application and approval from LinkedIn (not guaranteed,
> can take time). This app currently posts to your personal profile, which
> works immediately without that approval.

## 3. Add secrets to this GitHub repo

Settings → Secrets and variables → Actions → New repository secret:

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | same token used for your other RenewGuard repos |
| `CLOUDFLARE_ACCOUNT_ID` | same account ID used for your other RenewGuard repos |
| `FB_APP_ID` | from step 1 |
| `FB_APP_SECRET` | from step 1 |
| `LINKEDIN_CLIENT_ID` | from step 2 |
| `LINKEDIN_CLIENT_SECRET` | from step 2 |
| `SCHEDULER_ADMIN_USER` | username for this app's own login screen |
| `SCHEDULER_ADMIN_PASSWORD` | password for this app's own login screen |

## 4. Deploy

Push to `main` (or run the workflow manually from the Actions tab).

## 5. Use it

1. Open the deployed Worker URL, sign in with your admin username/password.
2. **Connect Facebook Page** and/or **Connect LinkedIn**.
3. Pick a campaign (or create a new one), a **start date**, and click **Start automation**.
4. Add flyers via **+ Add / upload flyer** — pick which platform(s) each one targets.
5. The Cron Trigger runs daily at 09:00 UTC and publishes that day's due flyer to every platform it's toggled on for. **Publish now** works on any row at any time.

## How scheduling works

`day_offset = (today - campaign.start_date) + 1`. Only one campaign can run
automation at a time — starting a new one automatically pauses any other.
Each post tracks Facebook and LinkedIn status independently, so a flyer can
succeed on one platform and be retried on the other without republishing
everywhere.
