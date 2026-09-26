(() => {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const status = document.getElementById('contact-status');
  const button = form.querySelector('button[type="submit"]');
  const category = form.elements.category;
  const reference = document.getElementById('reference-wrap');
  let widgetId;
  const setStatus = (message, type = '') => { status.textContent = message; status.className = `contact-status ${type}`; };
  category.addEventListener('change', () => { reference.hidden = !['Orders', 'Website problem'].includes(category.value); });
  async function setup() {
    try {
      const response = await fetch('/api/contact');
      if (!response.ok) throw new Error('Unavailable');
      const config = await response.json();
      if (!config.available || !config.siteKey) throw new Error('Unavailable');
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => {
        widgetId = window.turnstile.render('#contact-turnstile', { sitekey: config.siteKey, theme: 'dark' });
        button.disabled = false;
        setStatus('');
      };
      script.onerror = () => setStatus('The form is unavailable. Please email david@fox3d.au.', 'error');
      document.head.append(script);
    } catch { setStatus('The form is unavailable. Please email david@fox3d.au.', 'error'); }
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const token = window.turnstile?.getResponse(widgetId);
    if (!token) { setStatus('Please complete the verification.', 'error'); return; }
    button.disabled = true;
    setStatus('Sending…');
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.turnstileToken = token;
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Could not send your message. Please try again.');
      form.reset();
      reference.hidden = true;
      setStatus(result.acknowledged ? 'Thanks! Your message has been sent. A confirmation has also been emailed to you.' : 'Thanks! Your message has been sent, but the confirmation email could not be delivered.', 'success');
    } catch (error) { setStatus(error.message || 'Could not send your message. Please try again.', 'error'); }
    finally { window.turnstile?.reset(widgetId); button.disabled = false; }
  });
  setup();
})();
