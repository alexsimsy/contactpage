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
    
    // Serve static files
    try {
      // Debug: Log what environment variables are available
      console.log('Environment variables:', {
        hasStaticContent: !!env.__STATIC_CONTENT,
        hasStaticManifest: !!env.__STATIC_CONTENT_MANIFEST,
        staticContentType: typeof env.__STATIC_CONTENT,
        staticManifestType: typeof env.__STATIC_CONTENT_MANIFEST
      });

      // Check if static content is available
      if (!env.__STATIC_CONTENT) {
        console.log('No static content available');
        return new Response('Static content not available', { 
          status: 500,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      console.log('Manifest not available, using direct KV access');
      return await serveStaticDirectly(request, env);
      
    } catch (e) {
      console.error('Error serving static content:', e);
      return new Response('Internal Server Error', { 
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  },
};

async function serveStaticDirectly(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const kvNamespace = env.__STATIC_CONTENT as KVNamespace;

  // Handle root path by searching for the hashed index.html
  if (path === '/') {
    return findAndServeHashedAsset(kvNamespace, 'index', 'html');
  }

  // Handle other paths directly
  const key = path.startsWith('/') ? path.slice(1) : path;
  console.log('Looking for KV key:', key);
  const asset = await kvNamespace.get(key, { type: 'arrayBuffer' });

  if (asset) {
    console.log('Found asset for key:', key);
    return new Response(asset, {
      headers: { 'Content-Type': getContentType(path) },
    });
  }

  console.log('Asset not found for key:', key, '- falling back to SPA index.');
  // Fallback to serving the main index file for SPA routing
  return findAndServeHashedAsset(kvNamespace, 'index', 'html');
}

async function findAndServeHashedAsset(kv: KVNamespace, baseName: string, extension: string): Promise<Response> {
  const prefix = `${baseName}.`;
  console.log(`Searching for asset with prefix: ${prefix}`);

  const list = await kv.list({ prefix });
  const key = list.keys.find(k => k.name.endsWith(`.${extension}`));

  if (key) {
    console.log(`Found hashed asset: ${key.name}`);
    const asset = await kv.get(key.name, { type: 'arrayBuffer' });
    if (asset) {
      return new Response(asset, {
        headers: { 'Content-Type': getContentType(key.name) },
      });
    }
  }

  console.log(`Could not find hashed asset for base: ${baseName}`);
  return new Response('Not Found', { status: 404 });
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