# Fox3D Website v2

Public website for fox3d.au.

## Deployment
Cloudflare Pages deploys automatically from the `main` branch of `fox3d-au/fox3d-website`.

## Main improvements in v2
- Stronger product presentation for Scout and Locate
- No arbitrary development percentages
- Milestone-based development status
- Public development activity
- Community contribution messaging
- Scout beta-interest call-to-action
- GitHub and privacy links
- Improved About page positioning
- Responsive desktop/mobile layout

## Contact form setup
The existing `contact.html` now submits to the Cloudflare Pages Function in `functions/api/contact.js`. The form stays unavailable, with the direct email fallback visible, until its required settings are present. Cloudflare Email Routing receives mail at your domain; it does not send the acknowledgement. This implementation sends through Resend.

1. Create a Resend account, verify `fox3d.au` as a sending domain using the DNS records Resend supplies, and generate an API key. Keep the existing Cloudflare Email Routing MX records; add only the records Resend specifically asks for. Set the sender to an address on the verified domain, such as `Fox3D <contact@fox3d.au>`.
2. Create a Cloudflare Turnstile widget for `fox3d.au` and `www.fox3d.au`. Copy its site key and secret key.
3. In Cloudflare **Workers & Pages → fox3d-website → Settings → Variables and Secrets**, add these to the production environment (names must match exactly):
   - `RESEND_API_KEY` — secret
   - `TURNSTILE_SECRET_KEY` — secret
   - `TURNSTILE_SITE_KEY` — public site key
   - `CONTACT_TO_EMAIL` — your inbox address, e.g. `david@fox3d.au` if that mailbox/routing is active
   - `CONTACT_FROM_EMAIL` — verified sender, e.g. `Fox3D <contact@fox3d.au>`
4. Deploy the updated repository on `main`. Confirm the Cloudflare Pages project serves `GET /api/contact` with `available: true` and submit one test enquiry with your own email. Check that both the owner message and acknowledgement arrive and that replying to the acknowledgement reaches the owner address.

The endpoint validates required fields and Turnstile on the server, ignores the hidden spam field, and sends the owner email before the acknowledgement. If acknowledgement sending fails after delivery to the owner, the page reports that partial outcome without inviting a duplicate submission. No API key should be placed in the repository or client code.
