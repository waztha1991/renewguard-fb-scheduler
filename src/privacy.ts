export function privacyPolicyHtml(): string {
  const updated = "August 15, 2026";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Privacy Policy — RenewGuard Social Scheduler</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@700;800&display=swap" rel="stylesheet" />
<style>
  :root { --ink:#17123f; --green:#12a150; --green-deep:#0b7a3e; --muted:#5f7268; --border:#dcece1; --bg:#f3faf5; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:"Inter",sans-serif; background:var(--bg); color:var(--ink); line-height:1.65; }
  .wrap { max-width:760px; margin:0 auto; padding:48px 20px 80px; }
  h1 { font-family:"Sora",sans-serif; font-weight:800; font-size:2rem; letter-spacing:-0.02em; margin:0 0 6px; }
  .updated { color:var(--muted); font-size:0.9rem; margin-bottom:32px; }
  h2 { font-family:"Sora",sans-serif; font-weight:700; font-size:1.25rem; margin:32px 0 10px; color:var(--green-deep); }
  p, li { color:#241c4d; }
  ul { padding-left:22px; }
  li { margin-bottom:6px; }
  a { color:var(--green-deep); }
  .card { background:#fff; border:1px solid var(--border); border-radius:1rem; padding:28px 32px; box-shadow:0 12px 32px -16px rgba(20,32,58,.15); }
  .logo { font-family:"Sora",sans-serif; font-weight:800; font-size:1rem; color:var(--green-deep); margin-bottom:20px; }
</style>
</head>
<body>
<div class="wrap">
  <div class="logo">RenewGuard Social Scheduler — by AntSolutions</div>
  <div class="card">
    <h1>Privacy Policy</h1>
    <div class="updated">Last updated: ${updated}</div>

    <p>This Privacy Policy explains what information the RenewGuard Social Scheduler
    ("the App") collects, how it is used, and how it is protected. The App is an
    internal tool built and operated by AntSolutions to schedule and publish
    RenewGuard marketing content to a connected Facebook Page and/or LinkedIn
    profile on behalf of its own administrators.</p>

    <h2>Who operates this App</h2>
    <p>AntSolutions operates this App for its own marketing use. The App is not
    offered to the general public and is only used by AntSolutions
    administrators who are authenticated with their own login credentials.</p>

    <h2>Information we collect</h2>
    <ul>
      <li><strong>Facebook:</strong> when you connect a Facebook Page, we receive the Page's
      ID, name, and a Page access token issued by Facebook, via Facebook Login.
      We do not receive your personal Facebook password.</li>
      <li><strong>LinkedIn:</strong> when you connect your LinkedIn account, we receive your
      LinkedIn member ID, display name, and an access token issued by LinkedIn,
      via "Sign In with LinkedIn using OpenID Connect." We do not receive your
      personal LinkedIn password.</li>
      <li><strong>Content you provide:</strong> campaign names, post captions, hashtags,
      calls to action, scheduling dates, and any images you upload through the
      App.</li>
      <li><strong>App login:</strong> the App has its own separate administrator
      username and password, set by AntSolutions, unrelated to your Facebook or
      LinkedIn credentials.</li>
    </ul>

    <h2>How we use this information</h2>
    <p>Information collected is used solely to:</p>
    <ul>
      <li>Publish the content you create in the App to your connected Facebook
      Page and/or LinkedIn profile, either on a schedule you set or when you
      manually click "Publish now."</li>
      <li>Display connection status and publishing history back to you inside
      the App's dashboard.</li>
    </ul>
    <p>We do not use this information for advertising, do not sell it, and do
    not share it with any third party other than Facebook's and LinkedIn's own
    APIs, which are necessary to perform the publishing action you requested.</p>

    <h2>Where information is stored</h2>
    <p>All data is stored in a Cloudflare D1 database associated with this
    App's own infrastructure, and images you upload are stored there as well.
    Access tokens are stored only as long as the connection remains active;
    disconnecting a platform (via the "Disconnect" button in the App) deletes
    the stored token immediately.</p>

    <h2>Data retention and deletion</h2>
    <p>Campaign and post data is retained until you delete it yourself using
    the App's own "Delete flyer" or "Delete campaign" controls. Facebook and
    LinkedIn connection tokens are retained until you disconnect that platform
    in the App, or revoke the App's access directly from your Facebook or
    LinkedIn account settings.</p>

    <h2>Your controls</h2>
    <ul>
      <li>Disconnect Facebook or LinkedIn at any time from the App's dashboard.</li>
      <li>Revoke the App's access directly at
      <a href="https://www.facebook.com/settings?tab=business_tools" target="_blank" rel="noopener">facebook.com/settings (Business Integrations)</a>
      or <a href="https://www.linkedin.com/psettings/permitted-services" target="_blank" rel="noopener">linkedin.com/psettings/permitted-services</a>.</li>
      <li>Delete any flyer, campaign, or uploaded image directly within the App.</li>
    </ul>

    <h2>Security</h2>
    <p>The App is served exclusively over HTTPS. Administrator access to the
    dashboard requires a username and password. Access tokens and app secrets
    are never displayed in full in the App's interface once saved.</p>

    <h2>Children's privacy</h2>
    <p>This App is an internal business tool and is not directed at, or
    knowingly used by, children.</p>

    <h2>Changes to this policy</h2>
    <p>We may update this policy from time to time to reflect changes to the
    App. The "Last updated" date above will reflect the most recent revision.</p>

    <h2>Contact</h2>
    <p>Questions about this policy or your data can be directed to AntSolutions
    at the contact details listed on the RenewGuard marketing site.</p>
  </div>
</div>
</body>
</html>`;
}
