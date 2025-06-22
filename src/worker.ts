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
      return handleApiRequest(request, env);
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

  const findHashedAsset = async (assetPath: string) => {
    // Example: assetPath = "/_next/static/css/main.css"
    const noLeadingSlash = assetPath.slice(1);
    const lastDotIndex = noLeadingSlash.lastIndexOf('.');
    
    // If there's no extension, we can't find a hashed asset.
    if (lastDotIndex === -1) return null;

    const base = noLeadingSlash.substring(0, lastDotIndex);
    const extension = noLeadingSlash.substring(lastDotIndex);
    const prefix = base + '.';

    const list = await kvNamespace.list({ prefix });
    const key = list.keys.find(k => k.name.endsWith(extension));

    if (key) {
      const asset = await kvNamespace.get(key.name, { type: 'arrayBuffer' });
      if (asset) {
        return new Response(asset, { headers: { 'Content-Type': getContentType(key.name) } });
      }
    }
    return null;
  };
  
  // Root path should always serve the hashed index.html
  if (path === '/') {
    return (await findHashedAsset('/index.html')) || new Response('Not Found', { status: 404 });
  }
  
  // For any other path, first try a direct lookup for an un-hashed asset
  const key = path.slice(1);
  const directAsset = await kvNamespace.get(key, { type: 'arrayBuffer' });
  if (directAsset) {
    return new Response(directAsset, { headers: { 'Content-Type': getContentType(path) } });
  }

  // If not found, try finding a hashed version
  const hashedResponse = await findHashedAsset(path);
  if (hashedResponse) {
    return hashedResponse;
  }

  // If it's still not found, it might be an SPA route. Serve index.
  const hasExtension = path.lastIndexOf('.') > path.lastIndexOf('/');
  if (!hasExtension) {
    return (await findHashedAsset('/index.html')) || new Response('Not Found', { status: 404 });
  }

  // This was a request for a specific asset that truly doesn't exist.
  return new Response(`Not Found: ${path}`, { status: 404 });
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

async function handleApiRequest(request: Request, env: Env): Promise<Response> {
  if (new URL(request.url).pathname !== '/api/contact' || request.method !== 'POST') {
    return new Response('Not Found', { status: 404 });
  }

  if (!env.SENDGRID_API_KEY) {
    const errorMessage = 'SENDGRID_API_KEY secret not set in Cloudflare worker.';
    console.error(errorMessage);
    return new Response(errorMessage, { status: 500 });
  }

  try {
    const { name, email, message } = await request.json<{ name: string; email: string; message: string; }>();

    const send_request = new Request('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: 'hello@simsy.io' }] }],
        from: { email: 'hello@simsy.io', name: 'Simsy Contact Form' },
        reply_to: { email: email, name: name },
        subject: `New contact from ${name}`,
        content: [{ type: 'text/plain', value: `Name: ${name}\nEmail: ${email}\nMessage: ${message}` }],
      }),
    });

    const resp = await fetch(send_request);

    if (resp.ok) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      const errorText = await resp.text();
      const errorMessage = `Failed to send email. SendGrid responded with ${resp.status} ${resp.statusText}: ${errorText}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  } catch (error) {
    const errorDetails = error instanceof Error ? error.message : String(error);
    console.error('Error during email sending process:', errorDetails);
    return new Response(`Failed to send email: ${errorDetails}`, { status: 500 });
  }
}

export default worker; 