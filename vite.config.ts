import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [
      react(),
      {
        name: 'prestashop-proxy',
        configureServer(server) {
          return () => {
            server.middlewares.use('/api', async (req, res, next) => {
              // Skip upload endpoint
              if (req.url?.startsWith('/upload')) {
                return next();
              }

              try {
                const prestashopUrl = env.VITE_BASE_URL_FULL || 'http://localhost/prestashop_edition_classic_version_8.2.6';
                const apiKey = env.VITE_API_KEY;
                const resourcePath = req.url || '';

                // Construit l'URL PrestaShop avec la clé API
                const params = new URLSearchParams();

                // Parse et ajoute les paramètres existants
                const urlObj = new URL(resourcePath, 'http://localhost');
                for (const [key, value] of urlObj.searchParams.entries()) {
                  params.set(key, value);
                }

                // Reconstruit l'URL avec /api/ ajouté
                const fullUrl = `${prestashopUrl}/api${resourcePath.split('?')[0]}?${params.toString()}`;;

                console.log(`[PrestaShop Proxy] ${req.method} ${fullUrl}`);

                const options = {
                  method: req.method,
                  headers: {
                    'Accept': 'application/xml, image/*',
                    'User-Agent': 'ERP-Frontend',
                  } as any,
                };

                if (req.method !== 'GET' && req.headers['content-type']) {
                  options.headers['Content-Type'] = req.headers['content-type'];
                }

                const chunks: Buffer[] = [];
                
                if (req.method !== 'GET' && req.method !== 'HEAD') {
                  // Collecte le body
                  await new Promise((resolve) => {
                    req.on('data', (chunk: Buffer) => {
                      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                    });
                    req.on('end', resolve);
                  });

                  if (chunks.length > 0) {
                    const body = Buffer.concat(chunks);
                    options.headers['Content-Length'] = body.length;
                    (options as any).body = body;
                  }
                }

                const response = await fetch(fullUrl, {
                  method: req.method,
                  headers: {
                    Accept: 'application/xml, image/*',
                    Authorization:
                      'Basic ' +
                      Buffer.from(`${apiKey}:`).toString('base64'),
                    ...(req.headers['content-type']
                      ? {
                          'Content-Type': req.headers['content-type'],
                        }
                      : {}),
                  },
                  body: (options as any).body,
                });
                const contentType = response.headers.get('content-type') || '';

                // Gère les images (contenu binaire)
                if (contentType.includes('image/') || resourcePath.includes('/images/')) {
                  const buffer = await response.arrayBuffer();
                  const headers: any = {
                    'Content-Type': contentType || 'image/jpeg',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=31536000',
                  };
                  res.writeHead(response.status, headers);
                  res.end(Buffer.from(buffer));
                } else {
                  // Traite comme du texte (XML/JSON)
                  const responseBody = await response.text();
                  res.writeHead(response.status, {
                    'Content-Type': contentType || 'application/xml',
                    'Access-Control-Allow-Origin': '*',
                  });
                  res.end(responseBody);
                }
              } catch (error: any) {
                console.error('[PrestaShop Proxy Error]', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  error: 'Proxy error',
                  message: error.message,
                }));
              }
            });
          };
        },
      },
      {
        name: 'upload-middleware',
        configureServer(server) {
          return () => {
            server.middlewares.use('/api/upload', (req, res, next) => {
              if (req.method !== 'POST') {
                return next();
              }

              const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
              if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
              }

              let body = '';
              
              req.on('data', (chunk) => {
                body += chunk.toString('binary');
              });

              req.on('end', () => {
                try {
                  const timestamp = Date.now();
                  const fileName = `product_${timestamp}_${Math.random().toString(36).substring(7)}.jpg`;
                  const filePath = path.join(uploadsDir, fileName);
                  
                  fs.writeFileSync(filePath, Buffer.from('placeholder'));

                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ 
                    url: `/uploads/${fileName}`,
                    fileName,
                    success: true
                  }));
                } catch (error: any) {
                  console.error('Upload error:', error);
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: error.message }));
                }
              });
            });
          };
        },
      },
    ],
    server: {
      port: 5173,
      strictPort: true,
    },
  }
})