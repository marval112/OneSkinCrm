import { getDeliverySettings } from './reportDeliveryService';

export type SendEmailInput = {
  to: string[];
  subject: string;
  text?: string;
  html?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; status?: number; error?: string }>{
  const s = getDeliverySettings();
  if (s.emailProvider === 'emailjs') {
    return sendViaEmailJS(input);
  }
  return sendViaSendGrid(input, s.sendgridApiKey || '', s.fromEmail || '');
}

async function sendViaSendGrid(input: SendEmailInput, apiKey: string, fromEmail: string): Promise<{ ok: boolean; status?: number; error?: string }>{
  if (!apiKey || !fromEmail) return { ok: false, error: 'SendGrid not configured.' };
  const payload = {
    personalizations: [{ to: input.to.map(e => ({ email: e })) }],
    from: { email: fromEmail },
    subject: input.subject,
    content: [
      input.html ? { type: 'text/html', value: input.html } : { type: 'text/plain', value: input.text || '' }
    ]
  };
  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, status: res.status, error: res.ok ? undefined : await res.text() };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

async function sendViaEmailJS(input: SendEmailInput): Promise<{ ok: boolean; error?: string }>{
  const s = getDeliverySettings();
  const pub = s.emailjsPublicKey, svc = s.emailjsServiceId, tpl = s.emailjsTemplateId;
  if (!pub || !svc || !tpl) return { ok: false, error: 'EmailJS not configured.' };
  try {
    // @ts-ignore External CDN import for browser runtime
    const mod: any = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js');
    const emailjs = (mod && (mod.default || (window as any).emailjs)) as any;
    emailjs.init({ publicKey: pub });
    const params = {
      subject: input.subject,
      message: input.text || input.html || '',
      to_email: input.to[0] || '',
    };
    const res = await emailjs.send(svc, tpl, params);
    return { ok: !!res?.status && res.status >= 200 && res.status < 300 };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'EmailJS error' };
  }
}

// Legacy simulated sendEmail removed; use the exported sendEmail(input) above
