// Vercel Serverless Function: POST /api/inbound-email
// Use with email providers (SendGrid Inbound Parse, Mailgun, etc.) to convert inbound emails into activities

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-KEY');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const required = [process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE, process.env.INBOUND_API_KEY];
  if (required.some(v => !v)) return res.status(500).json({ error: 'Server not configured (SUPABASE_URL, SUPABASE_SERVICE_ROLE, INBOUND_API_KEY)' });

  // Simple shared secret
  if (req.headers['x-api-key'] !== process.env.INBOUND_API_KEY) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = req.body || {};
    // Normalize common fields from providers
    const subject = payload.subject || payload.envelope?.subject || '(no subject)';
    const from = payload.from || payload.sender || payload.envelope?.from;
    const to = payload.to || payload.recipients || payload.envelope?.to || [];
    const text = payload.text || payload['stripped-text'] || payload.html || '';
    // Optional: if you include entity ids in custom headers, extract here
    const leadId = parseInt(payload['X-Lead-Id'] || payload.headers?.['X-Lead-Id'] || '0', 10) || null;
    const customerId = parseInt(payload['X-Customer-Id'] || payload.headers?.['X-Customer-Id'] || '0', 10) || null;
    const dealId = parseInt(payload['X-Deal-Id'] || payload.headers?.['X-Deal-Id'] || '0', 10) || null;

    const bucket = process.env.ACTIVITIES_BUCKET || 'activities';
    const attachmentsRaw = Array.isArray(payload.attachments) ? payload.attachments : [];
    const attachments = [] as any[];
    for (const att of attachmentsRaw) {
      const filename = att.filename || att.name || 'attachment';
      const contentType = att.content_type || att.type || 'application/octet-stream';
      const base64 = att.base64 || att.content || null;
      const remoteUrl = att.url || null;
      let size = att.size || undefined;
      let publicUrl: string | undefined = undefined;

      try {
        const path = buildStoragePath(filename);
        const uploadRes = await uploadToStorage(bucket, path, { base64, remoteUrl, contentType, supabaseUrl: process.env.SUPABASE_URL as string, serviceKey: process.env.SUPABASE_SERVICE_ROLE as string });
        publicUrl = uploadRes.publicUrl;
        size = uploadRes.size || size;
      } catch (e) {
        // Fallback: keep original url/base64 if upload fails
        publicUrl = remoteUrl || undefined;
      }
      attachments.push({ filename, content_type: contentType, size, url: publicUrl });
    }

    const activity = {
      user_id: null,
      lead_id: leadId,
      customer_id: customerId,
      deal_id: dealId,
      channel: 'email',
      direction: 'in',
      subject,
      message: text,
      to: Array.isArray(to) ? to : String(to || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      from: String(from || ''),
      created_at: new Date().toISOString(),
      attachments,
    };

    const resp = await fetch(`${process.env.SUPABASE_URL}/rest/v1/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE as string,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(activity),
    });
    if (!resp.ok) {
      const textBody = await resp.text().catch(() => '');
      return res.status(resp.status).json({ error: textBody || 'Insert failed' });
    }
    const data = await resp.json();
    return res.status(200).json({ ok: true, activity: data?.[0] || null });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Unexpected error' });
  }
}

function buildStoragePath(filename: string): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 10);
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${yyyy}/${mm}/${dd}/${rand}_${safe}`;
}

async function uploadToStorage(bucket: string, path: string, opts: { base64: string | null; remoteUrl: string | null; contentType: string; supabaseUrl: string; serviceKey: string }): Promise<{ publicUrl: string; size?: number }>{
  const endpoint = `${opts.supabaseUrl}/storage/v1/object/${bucket}/${path}`;
  let body: ArrayBuffer;
  if (opts.base64) {
    body = Buffer.from(opts.base64, 'base64');
  } else if (opts.remoteUrl) {
    const r = await fetch(opts.remoteUrl);
    if (!r.ok) throw new Error('Fetch attachment failed');
    body = await r.arrayBuffer();
  } else {
    throw new Error('No attachment data');
  }
  const upload = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': opts.contentType,
      'Authorization': `Bearer ${opts.serviceKey}`,
      'apikey': opts.serviceKey,
      'x-upsert': 'true'
    },
    body: Buffer.from(body),
  });
  if (!upload.ok) {
    const t = await upload.text().catch(() => '');
    throw new Error(`Storage upload failed: ${t}`);
  }
  const publicUrl = `${opts.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  return { publicUrl, size: (body as any).byteLength || undefined };
}


