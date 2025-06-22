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
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
  let path = url.pathname;
  
  console.log('serveStaticDirectly called with path:', path);
  
  // Default to index.html for root path
  if (path === '/') {
    path = '/index.html';
  }
  
  // Remove leading slash for KV key
  const key = path.startsWith('/') ? path.slice(1) : path;
  
  console.log('Looking for KV key:', key);
  
  try {
    const kvNamespace = env.__STATIC_CONTENT as KVNamespace;
    
    // Try to list keys to see what's available
    try {
      const keys = await kvNamespace.list();
      console.log('Available KV keys (first 10):', keys.keys.slice(0, 10).map(k => k.name));
    } catch (listError) {
      console.log('Could not list KV keys:', listError);
    }
    
    const asset = await kvNamespace.get(key, { type: 'arrayBuffer' });
    
    if (!asset) {
      console.log('Asset not found for key:', key);
      // Try index.html for SPA routing
      if (path !== '/index.html') {
        console.log('Trying index.html as fallback');
        const indexAsset = await kvNamespace.get('index.html', { type: 'arrayBuffer' });
        if (indexAsset) {
          console.log('Found index.html, serving it');
          return new Response(indexAsset, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
      }
      console.log('No index.html found either');
      return new Response('Not Found', { status: 404 });
    }
    
    console.log('Found asset for key:', key, 'size:', asset.byteLength);
    
    // Determine content type based on file extension
    const contentType = getContentType(path);
    
    return new Response(asset, {
      headers: { 'Content-Type': contentType }
    });
  } catch (error) {
    console.error('Error serving static file directly:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
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