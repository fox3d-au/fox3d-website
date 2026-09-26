const categories = new Set(['General enquiry', 'Orders', 'Fox3D Scout', 'Website problem', '3D printing / model enquiry', 'Other']);
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max + 1) : '';
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export async function onRequestGet({ env }) {
  return json({ siteKey: env.TURNSTILE_SITE_KEY || null, available: Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY && env.RESEND_API_KEY && env.CONTACT_TO_EMAIL && env.CONTACT_FROM_EMAIL) });
}

export async function onRequestPost({ request, env }) {
  if (!env.TURNSTILE_SITE_KEY || !env.TURNSTILE_SECRET_KEY || !env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL || !env.CONTACT_FROM_EMAIL) return json({ error: 'The contact form is temporarily unavailable. Please email david@fox3d.au.' }, 503);
  if (!(request.headers.get('content-type') || '').toLowerCase().includes('application/json')) return json({ error: 'Invalid submission.' }, 415);
  if (Number(request.headers.get('content-length') || 0) > 12000) return json({ error: 'Message is too long.' }, 413);
  let data;
  try { const raw = await request.text(); if (raw.length > 12000) return json({ error: 'Message is too long.' }, 413); data = JSON.parse(raw); } catch { return json({ error: 'Invalid submission.' }, 400); }
  const name = clean(data.name, 100), email = clean(data.email, 254), category = clean(data.category, 60), reference = clean(data.reference, 80), message = clean(data.message, 5000);
  if (data.website) return json({ ok: true }); // Honeypot; no mail sent.
  if (!name || name.length > 100 || !emailPattern.test(email) || email.length > 254 || !categories.has(category) || reference.length > 80 || !message || message.length > 5000) return json({ error: 'Please check the required fields and try again.' }, 400);
  const token = clean(data.turnstileToken, 2048);
  if (!token || token.length > 2048) return json({ error: 'Please complete the verification.' }, 400);
  let verified;
  try {
    const body = new FormData();
    body.set('secret', env.TURNSTILE_SECRET_KEY);
    body.set('response', token);
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip) body.set('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    verified = await res.json();
  } catch { return json({ error: 'Verification is unavailable. Please try again.' }, 503); }
  if (!verified.success || (verified.hostname && !['fox3d.au', 'www.fox3d.au', 'fox3d-website.pages.dev'].includes(verified.hostname))) return json({ error: 'Verification failed. Please try again.' }, 403);
  const text = `Name: ${name}\nEmail: ${email}\nIssue: ${category}\nReference: ${reference || 'None'}\nReceived: ${new Date().toISOString()}\n\n${message}`;
  const send = async (payload) => {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  };
  try {
    await send({ from: env.CONTACT_FROM_EMAIL, to: [env.CONTACT_TO_EMAIL], reply_to: email, subject: `Fox3D contact: ${category}`, text });
  } catch (error) {
    console.error('Contact delivery failed', error);
    return json({ error: 'Your message could not be sent. Please email david@fox3d.au.' }, 502);
  }
  try {
    await send({ from: env.CONTACT_FROM_EMAIL, to: [email], reply_to: env.CONTACT_TO_EMAIL, subject: 'We’ve received your message – Fox3D', text: `Hi ${name},\n\nThanks for contacting Fox3D. Your message about ${category} has been received, and I’ll get back to you as soon as I can.\n\nIf you need to add anything, reply to this email.\n\nRegards,\nDavid\nFox3D` });
    return json({ ok: true, acknowledged: true });
  } catch (error) {
    console.error('Acknowledgement delivery failed', error);
    return json({ ok: true, acknowledged: false });
  }
}
