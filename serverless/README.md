# Serverless email delivery examples

This folder contains ready-to-deploy functions that receive the CRM webhook payload and send the attached report via SendGrid.

Payload shape expected (matches the CRM webhook):

```
{
  "report": { "name": "Revenue", "recipients": ["to@example.com"] },
  "file": {
    "filename": "Revenue_2025-11-04.pdf",
    "content_type": "application/pdf",
    "base64": "..."
  },
  "stats": { "rows": 123, "generated_at": "2025-11-04T00:00:00.000Z" }
}
```

## Vercel
- File: `vercel/api/send-report.ts`
- Deploy in a Vercel project (Node.js runtime, Edge not required)
- Environment variables:
  - `SENDGRID_API_KEY`
  - `FROM_EMAIL`
  - (optional) `TO_OVERRIDE`
- Endpoint after deploy: `https://<your-app>.vercel.app/api/send-report`

## Netlify
- File: `netlify/send-report.ts`
- Deploy as a Netlify Function (Node 18+)
- Environment variables:
  - `SENDGRID_API_KEY`
  - `FROM_EMAIL`
  - (optional) `TO_OVERRIDE`
- Endpoint after deploy: `https://<your-site>/.netlify/functions/send-report`

## How to use from the CRM
- In Delivery Settings, set the Webhook URL to the deployed endpoint.
- Enable “Send automatically when run” (optional) or click “Send Now”.
- The CRM will POST the payload and the function sends the email with the attachment via SendGrid.

Security notes:
- Protect the endpoint behind a platform secret or add a simple shared key via header `X-API-KEY` and check it in the handler.
- Keep `SENDGRID_API_KEY` only on the server. Do not expose it in the browser.


