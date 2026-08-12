# RenewGuard Facebook Scheduler

Connects to your Facebook Page and automatically publishes one of the 30
pre-built RenewGuard flyers per day, using Cloudflare Workers + D1 + a daily
Cron Trigger. Dashboard lets you connect the page, set a start date, watch
progress, and manually publish/retry any day.

Infrastructure already provisioned:
- **D1 database** `renewguard-fb-scheduler-dev` (bound as `DB`), pre-seeded
  with all 30 posts (caption, hashtags, CTA, image filename).
- **Images** hosted on `renewguard-landing` at `/fb-assets/DayNN_*.png` —
  Facebook's API needs a public URL, not a file upload, for scheduled posts.

## 1. Create a Meta (Facebook) Developer App — you'll need to do this part

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps** → **Create App** → choose **"Other"** → **"Business"**.
2. In the app, add the **Facebook Login** product (Settings → Basic is enough for now; you don't need App Review for pages you personally administer).
3. Under **Facebook Login → Settings**, add this Valid OAuth Redirect URI (replace the domain once deployed):
   `https://renewguard-fb-scheduler-dev.<your-subdomain>.workers.dev/auth/facebook/callback`
4. Copy your **App ID** and **App Secret** from Settings → Basic.
5. Make sure the Facebook account you'll use to connect is an **admin of the Page** you want to post to.

## 2. Add secrets to this GitHub repo

Settings → Secrets and variables → Actions → New repository secret:

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | same token used for your other RenewGuard repos |
| `CLOUDFLARE_ACCOUNT_ID` | same account ID used for your other RenewGuard repos |
| `FB_APP_ID` | from step 1 |
| `FB_APP_SECRET` | from step 1 |
| `SCHEDULER_ADMIN_USER` | username for the scheduler's own login screen |
| `SCHEDULER_ADMIN_PASSWORD` | password for the scheduler's own login screen |

## 3. Deploy

Push to `main` (or run the workflow manually from the Actions tab). This
deploys the Worker and pushes the four app secrets into it.

## 4. Use it

1. Open the deployed Worker URL, sign in with the admin username/password you set.
2. Click **Connect Facebook Page** → log in with Facebook → approve → pick the Page (if you manage more than one).
3. Pick a **campaign start date** and click **Start automation**.
4. The Cron Trigger runs daily at 09:00 UTC and publishes that day's flyer automatically. You can also click **Publish now** on any row to publish (or retry a failed) post manually.

## How the schedule works

`day = (today - start_date) + 1`. Day 1 through Day 30 map 1:1 to the rows
in the `posts` D1 table. Pausing automation (or not setting a start date)
stops the cron handler from publishing anything.
