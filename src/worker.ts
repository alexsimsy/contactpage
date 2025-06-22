/// <reference types="@cloudflare/workers-types" />
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface Env {
  SENDGRID_API_KEY: string;
  __STATIC_CONTENT: unknown;
  __STATIC_CONTENT_MANIFEST: unknown;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle API routes
    if (url.pathname === '/api/contact' && request.method === 'POST') {
      return handleContactForm(request, env);
    }
    
    // Serve static files
    try {
      return await getAssetFromKV(
        {
          request,
          waitUntil: ctx.waitUntil.bind(ctx),
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT as KVNamespace,
          ASSET_MANIFEST: env.__STATIC_CONTENT_MANIFEST as string,
        }
      );
    } catch (e) {
      // If the asset is not found, serve index.html for SPA routing
      if (e instanceof Error && e.message.includes('not found')) {
        try {
          return await getAssetFromKV(
            {
              request: new Request(new URL('/index.html', request.url)),
              waitUntil: ctx.waitUntil.bind(ctx),
            },
            {
              ASSET_NAMESPACE: env.__STATIC_CONTENT as KVNamespace,
              ASSET_MANIFEST: env.__STATIC_CONTENT_MANIFEST as string,
            }
          );
        } catch {
          return new Response('Not Found', { status: 404 });
        }
      }
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};

async function handleContactForm(request: Request, env: Env): Promise<Response> {
  try {
    const body: ContactFormData = await request.json();
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: 'All fields are required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Please enter a valid email address' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Send email using SendGrid
    const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: 'support@s-imsy.com' }],
            subject: `Contact Form: ${subject}`,
          },
        ],
        from: { email: 'noreply@s-imsy.com' },
        content: [
          {
            type: 'text/plain',
            value: `
Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}
            `,
          },
          {
            type: 'text/html',
            value: `
<h2>New Contact Form Submission</h2>
<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<p><strong>Subject:</strong> ${subject}</p>
<p><strong>Message:</strong></p>
<p>${message.replace(/\n/g, '<br>')}</p>
            `,
          },
        ],
      }),
    });

    if (!sendGridResponse.ok) {
      throw new Error('Failed to send email');
    }

    return new Response(
      JSON.stringify({ message: 'Email sent successfully' }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send email' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export default worker; 