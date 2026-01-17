import { ReportFormat, ReportType, ScheduledReport } from '../types';
import { generateCSVBlob, generatePDFBlob } from './exportService';
import { getReportData } from './reportDataService';

export type DeliverySettings = {
  webhookUrl: string;
  sendOnRun: boolean;
  retryCount: number; // number of retries after the first attempt
  backoffMs: number;  // delay between retries
  emailEnabled?: boolean;
  sendgridApiKey?: string;
  fromEmail?: string;
  emailProvider?: 'sendgrid' | 'emailjs';
  emailjsPublicKey?: string;
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
};

const STORAGE_KEY = 'crm_report_delivery_settings';

export function getDeliverySettings(): DeliverySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        webhookUrl: parsed.webhookUrl || '',
        sendOnRun: Boolean(parsed.sendOnRun),
        retryCount: Number.isFinite(parsed.retryCount) ? parsed.retryCount : 2,
        backoffMs: Number.isFinite(parsed.backoffMs) ? parsed.backoffMs : 2000,
        emailEnabled: Boolean(parsed.emailEnabled),
        sendgridApiKey: parsed.sendgridApiKey || '',
        fromEmail: parsed.fromEmail || '',
        emailProvider: parsed.emailProvider || 'sendgrid',
        emailjsPublicKey: parsed.emailjsPublicKey || '',
        emailjsServiceId: parsed.emailjsServiceId || '',
        emailjsTemplateId: parsed.emailjsTemplateId || '',
      };
    }
  } catch {}
  return { webhookUrl: '', sendOnRun: false, retryCount: 2, backoffMs: 2000 };
}

export function saveDeliverySettings(settings: DeliverySettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export async function sendReportViaWebhook(report: ScheduledReport, filters?: { from?: string; to?: string }): Promise<{ ok: boolean; status?: number; error?: string }>{
  const settings = getDeliverySettings();
  if (!settings.webhookUrl) return { ok: false, error: 'Webhook URL is not configured.' };

  const data = await getReportData(report.report_type, filters);
  const filenameBase = `${report.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}`;

  let blob: Blob;
  let contentType: string;
  if (report.format === ReportFormat.CSV) {
    blob = generateCSVBlob(data);
    contentType = 'text/csv';
  } else {
    blob = await generatePDFBlob(data, { includeCharts: report.include_charts !== false });
    contentType = 'application/pdf';
  }

  const arrayBuffer = await blob.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);

  const payload = {
    report: {
      id: report.id,
      name: report.name,
      type: report.report_type,
      format: report.format,
      frequency: report.frequency,
      recipients: report.recipients,
    },
    file: {
      filename: `${filenameBase}.${report.format === ReportFormat.CSV ? 'csv' : 'pdf'}`,
      content_type: contentType,
      base64,
      size_bytes: blob.size,
    },
    stats: { rows: data.length, generated_at: new Date().toISOString() },
  };

  try {
    const res = await fetch(settings.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok, status: res.status, error: res.ok ? undefined : await safeText(res) };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

export async function sendReportViaEmail(report: ScheduledReport, filters?: { from?: string; to?: string }): Promise<{ ok: boolean; status?: number; error?: string }>{
  const settings = getDeliverySettings();
  if (settings.emailProvider === 'emailjs') {
    return sendReportViaEmailJS(report, filters);
  }
  // Default: SendGrid
  const apiKey = settings.sendgridApiKey as string | undefined;
  const fromEmail = settings.fromEmail as string | undefined;
  if (!apiKey || !fromEmail) return { ok: false, error: 'SendGrid not configured.' };

  const data = await getReportData(report.report_type, filters);
  let blob: Blob;
  let contentType: string;
  let ext: string;
  if (report.format === ReportFormat.CSV) {
    blob = generateCSVBlob(data);
    contentType = 'text/csv';
    ext = 'csv';
  } else {
    blob = await generatePDFBlob(data, { includeCharts: report.include_charts !== false });
    contentType = 'application/pdf';
    ext = 'pdf';
  }
  const buffer = await blob.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  const subject = `${report.name}`;
  const emailTo = report.recipients;

  const payload = {
    personalizations: [{ to: emailTo.map(e => ({ email: e })) }],
    from: { email: fromEmail },
    subject,
    content: [{ type: 'text/plain', value: `Attached: ${report.name}` }],
    attachments: [{
      content: base64,
      filename: `${report.name.replace(/\s+/g, '_')}.${ext}`,
      type: contentType,
      disposition: 'attachment',
    }]
  };

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return { ok: res.ok, status: res.status, error: res.ok ? undefined : await safeText(res) };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

async function sendReportViaEmailJS(report: ScheduledReport, _filters?: { from?: string; to?: string }): Promise<{ ok: boolean; error?: string }>{
  const s = getDeliverySettings();
  const pub = s.emailjsPublicKey, svc = s.emailjsServiceId, tpl = s.emailjsTemplateId;
  if (!pub || !svc || !tpl) return { ok: false, error: 'EmailJS not configured.' };
  try {
    // Load EmailJS browser client
    const mod: any = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js');
    const emailjs = (mod && (mod.default || (window as any).emailjs)) as any;
    if (!emailjs) return { ok: false, error: 'EmailJS SDK not available.' };
    emailjs.init({ publicKey: pub });
    // Note: EmailJS (client) no adjunta archivos binarios fácilmente desde el navegador.
    // Enviamos un correo con asunto y detalle; el adjunto queda solo en SendGrid.
    const params = {
      subject: report.name,
      report_name: report.name,
      recipients: report.recipients.join(', '),
      message: `Report "${report.name}" was generated. Please check the CRM to download it.`,
      reply_to: s.fromEmail || undefined,
      to_email: report.recipients[0] || undefined,
    };
    const res = await emailjs.send(svc, tpl, params);
    return { ok: !!res?.status && res.status >= 200 && res.status < 300 };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'EmailJS error' };
  }
}

export async function sendReportWithRetries(
  report: ScheduledReport,
  filters: { from?: string; to?: string } | undefined,
  retryCount: number,
  backoffMs: number
): Promise<{ ok: boolean; status?: number; error?: string }>{
  let attempt = 0;
  let lastError: string | undefined;
  while (attempt <= retryCount) {
    const res = await sendReportViaWebhook(report, filters);
    if (res.ok) return res;
    lastError = res.error || `HTTP ${res.status ?? ''}`;
    attempt++;
    if (attempt <= retryCount) {
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }
  return { ok: false, error: `Failed after ${retryCount + 1} attempts. Last error: ${lastError || 'Unknown'}` };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function safeText(res: Response): Promise<string> {
  try { return await res.text(); } catch { return 'Unknown error'; }
}


