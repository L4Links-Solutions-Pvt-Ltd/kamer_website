// Vercel serverless function: POST /api/leads
// Stores an offer-form submission in the separate "kamer-leads" Neon database
// (never the app DB) and, when configured, sends the WhatsApp offer via Interakt.
//
// Env vars (Vercel project settings; never committed):
//   DATABASE_URL            pooled connection string, role kamer_leads_app
//   INTERAKT_API_KEY        Interakt API key (Basic auth value)
//   INTERAKT_TEMPLATE_NAME  approved template, e.g. kamer_offer_welcome_v1
//   INTERAKT_TEMPLATE_LANG  template language code (default "te")
//   INTERAKT_FLYER_URL      public https URL of the flyer image (template header)
//   EMAIL_API_KEY_ZEPTO     ZeptoMail send key (same one kamer_backend uses)
//   LEADS_NOTIFY_EMAIL      where every lead is emailed (default info@kamerapp.com)
// Without the INTERAKT_* vars the lead is still saved and whatsapp_status stays "pending".
import { neon } from '@neondatabase/serverless';

// Offer code shown in the WhatsApp flyer, per QR/ad source. Unknown sources get DEFAULT_CODE.
const OFFER_CODES = { 'itcha-2026-oct-12': 'ITCHA20' };
const DEFAULT_CODE = 'KAMER20';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

const ZEPTO_URL = 'https://api.zeptomail.in/v1.1/email';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// Accepts 9876543210, 09876543210, 919876543210, +91 98765 43210. Returns 10 digits or null.
function tenDigitPhone(raw) {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

async function sendWhatsApp({ phone10, name, code }) {
  const { INTERAKT_API_KEY, INTERAKT_TEMPLATE_NAME, INTERAKT_FLYER_URL } = process.env;
  const template = {
    name: INTERAKT_TEMPLATE_NAME,
    languageCode: process.env.INTERAKT_TEMPLATE_LANG || 'te',
    bodyValues: [name, code],
  };
  if (INTERAKT_FLYER_URL) template.headerValues = [INTERAKT_FLYER_URL];

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch('https://api.interakt.ai/v1/public/message/', {
      method: 'POST',
      headers: { Authorization: `Basic ${INTERAKT_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        countryCode: '+91',
        phoneNumber: phone10,
        callbackData: 'kamer-offer',
        type: 'Template',
        template,
      }),
      signal: ctrl.signal,
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok || body.result === false) {
      return { ok: false, error: clean(body.message || `HTTP ${r.status}`, 300) };
    }
    return { ok: true, id: body.id ? String(body.id) : null };
  } catch (e) {
    return { ok: false, error: clean(e?.message || 'send failed', 300) };
  } finally {
    clearTimeout(timer);
  }
}

// Emails the lead to the team inbox. Never throws; returns { ok, error? }.
async function emailLead(lead) {
  const key = process.env.EMAIL_API_KEY_ZEPTO;
  if (!key) return { ok: false, error: 'EMAIL_API_KEY_ZEPTO not set' };
  const to = process.env.LEADS_NOTIFY_EMAIL || 'info@kamerapp.com';
  const auth = key.startsWith('Zoho-enczapikey ') ? key : `Zoho-enczapikey ${key}`;
  const ist = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  const rows = [
    ['Name', esc(lead.name)],
    ['Phone', `<a href="tel:${esc(lead.phone)}">${esc(lead.phone)}</a> (<a href="https://wa.me/${esc(lead.phone.slice(1))}">WhatsApp</a>)`],
    ['Hostel', esc(lead.hostel) || '-'],
    ['Source', esc(lead.src)],
    ['UTM', esc(JSON.stringify(lead.utm)) || '-'],
    ['WhatsApp offer', esc(lead.whatsapp)],
    ['Saved in leads DB', lead.saved ? 'yes' : '<strong style="color:#b3261e">NO (database error, follow up from this email)</strong>'],
    ['Received', `${esc(ist)} IST`],
  ];
  const html = `<table cellpadding="6" style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="color:#666;vertical-align:top"><b>${k}</b></td><td>${v}</td></tr>`)
    .join('')}</table>`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(ZEPTO_URL, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        from: { address: 'noreply@kamerapp.com', name: 'Kamer Leads' },
        to: [{ email_address: { address: to } }],
        subject: `New lead: ${lead.name} (${lead.src})`,
        htmlbody: html,
      }),
      signal: ctrl.signal,
    });
    if (!r.ok) return { ok: false, error: `Zepto HTTP ${r.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: clean(e?.message || 'email failed', 200) };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  // Honeypot: bots fill the hidden "website" field. Pretend success, store nothing.
  if (clean(b.website, 10)) return res.status(200).json({ ok: true });

  const name = clean(b.name, 80);
  const hostel = clean(b.hostel, 120) || null;
  const phone10 = tenDigitPhone(b.phone);
  const consent = b.consent === true || b.consent === 'on' || b.consent === 'true';
  const src = clean(b.src, 60).replace(/[^a-zA-Z0-9_-]/g, '') || 'direct';

  if (!name) return res.status(400).json({ ok: false, error: 'name_required' });
  if (!phone10) return res.status(400).json({ ok: false, error: 'invalid_phone' });
  if (!consent) return res.status(400).json({ ok: false, error: 'consent_required' });

  const utm = {};
  for (const k of UTM_KEYS) if (b.utm?.[k]) utm[k] = clean(b.utm[k], 100);

  const phone = `+91${phone10}`;
  const lead = { name, phone, hostel, src, utm, saved: false, whatsapp: 'not attempted' };

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Same number already sent the flyer in the last 24h (rescan / double tap): save but don't resend.
    const recent = await sql`
      SELECT 1 FROM leads
      WHERE phone = ${phone} AND whatsapp_status = 'sent' AND created_at > now() - interval '24 hours'
      LIMIT 1`;

    const [row] = await sql`
      INSERT INTO leads (phone, name, hostel_name, src, utm, consent_whatsapp, whatsapp_status)
      VALUES (${phone}, ${name}, ${hostel}, ${src}, ${JSON.stringify(utm)}::jsonb, ${consent},
              ${recent.length ? 'skipped' : 'pending'})
      RETURNING id`;
    lead.saved = true;
    lead.whatsapp = recent.length ? 'skipped (already sent in last 24h)' : 'pending (not configured yet)';

    const canSend = !recent.length && process.env.INTERAKT_API_KEY && process.env.INTERAKT_TEMPLATE_NAME;
    if (canSend) {
      const code = OFFER_CODES[src] || DEFAULT_CODE;
      const sent = await sendWhatsApp({ phone10, name, code });
      if (sent.ok) {
        lead.whatsapp = 'sent';
        await sql`UPDATE leads SET whatsapp_status = 'sent', whatsapp_message_id = ${sent.id}, updated_at = now() WHERE id = ${row.id}`;
      } else {
        lead.whatsapp = `FAILED: ${sent.error}`;
        await sql`UPDATE leads SET whatsapp_status = 'failed', whatsapp_error = ${sent.error}, updated_at = now() WHERE id = ${row.id}`;
      }
    }
  } catch (e) {
    console.error('leads db error', e?.message);
  }

  // Every lead is emailed to the team inbox, even if the DB or WhatsApp step failed above.
  const mail = await emailLead(lead);
  if (!mail.ok) console.error('leads email error', mail.error);

  // The lead is safe if it reached the DB or the inbox; only fail the visitor if both failed.
  if (!lead.saved && !mail.ok) return res.status(500).json({ ok: false, error: 'server_error' });
  return res.status(200).json({ ok: true });
}
