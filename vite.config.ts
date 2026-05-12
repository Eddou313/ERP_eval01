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
      proxy: {
        [env.VITE_BASE_URL]: {
          target: 'http://localhost:80/prestashop_edition_classic_version_8.2.6',
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
          },
        },
      },
    },
  }
})