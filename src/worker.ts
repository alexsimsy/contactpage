/// <reference types="@cloudflare/workers-types" />

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
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle API routes
    if (url.pathname === '/api/contact' && request.method === 'POST') {
      return handleContactForm(request, env);
    }
    
    try {
      return await serveStaticAsset(request, env);
    } catch (e) {
      console.error('Error serving static asset:', e);
      // Don't expose internal errors to the user
      return new Response('An unexpected error occurred', { status: 500 });
    }
  },
};

async function serveStaticAsset(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const kvNamespace = env.__STATIC_CONTENT as KVNamespace;

  // Find the hashed index.html for the root path or SPA navigation
  const serveIndex = async () => {
    const list = await kvNamespace.list({ prefix: 'index.' });
    const indexKey = list.keys.find(k => k.name.endsWith('.html'));
    if (indexKey) {
      const asset = await kvNamespace.get(indexKey.name, { type: 'arrayBuffer' });
      if (asset) {
        return new Response(asset, { headers: { 'Content-Type': 'text/html' } });
      }
    }
    return new Response('Not Found', { status: 404 });
  };

  // Root path should always serve index.html
  if (path === '/') {
    return serveIndex();
  }

  // For any other path, first try a direct lookup.
  // This will match requests for /_next/static/..., /simsy-logo.png, etc.
  // if their keys match the path exactly.
  const key = path.slice(1); // remove leading slash
  const asset = await kvNamespace.get(key, { type: 'arrayBuffer' });

  if (asset) {
    return new Response(asset, { headers: { 'Content-Type': getContentType(path) } });
  }

  // If the direct lookup fails, it's NOT an asset. It's an SPA navigation.
  // A request for a page like /about won't have a matching key.
  // In that case, we serve index.html and let the client-side router handle it.
  const hasExtension = path.split('/').pop()?.includes('.') ?? false;
  if (!hasExtension) {
    return serveIndex();
  }

  // If it has an extension but wasn't found, it's a real 404 for an asset.
  return new Response(`Asset not found: ${path}`, { status: 404 });
}

function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html': return 'text/html';
    case 'css': return 'text/css';
    case 'js': return 'application/javascript';
    case 'json': return 'application/json';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    case 'ico': return 'image/x-icon';
    case 'woff': return 'font/woff';
    case 'woff2': return 'font/woff2';
    case 'ttf': return 'font/ttf';
    case 'txt': return 'text/plain';
    default: return 'application/octet-stream';
  }
}

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