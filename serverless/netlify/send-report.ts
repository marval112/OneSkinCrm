// Netlify Function: POST /.netlify/functions/send-report
// Sends an email with attachment via SendGrid using the webhook payload from the CRM

export async function handler(event: any) {
  // CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-KEY',
  } as Record<string, string>;

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.FROM_EMAIL;
  if (!apiKey || !fromEmail) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server not configured (SENDGRID_API_KEY, FROM_EMAIL)' }) };

  try {
    const payload = JSON.parse(event.body || '{}');
    const report = payload.report || {};
    const file = payload.file || {};
    const recipients: string[] = Array.isArray(report.recipients) ? report.recipients : [];
    const overrideTo = process.env.TO_OVERRIDE; // optional

    if (!file?.base64 || !file?.filename || !file?.content_type) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid file payload' }) };
    }
    const toList = overrideTo ? [overrideTo] : recipients;
    if (!toList.length) return { statusCode: 400, headers, body: JSON.stringify({ error: 'No recipients' }) };

    const subject = report?.name || 'CRM Report';
    const sgPayload = {
      personalizations: [{ to: toList.map((e: string) => ({ email: e })) }],
      from: { email: fromEmail },
      subject,
      content: [{ type: 'text/plain', value: `Attached: ${subject}` }],
      attachments: [{
        content: file.base64,
        filename: file.filename,
        type: file.content_type,
        disposition: 'attachment',
      }],
    };

    const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sgPayload),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return { statusCode: resp.status, headers, body: JSON.stringify({ error: text || 'SendGrid error' }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e?.message || 'Unexpected error' }) };
  }
}


