
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toAbsolute = (p) => path.resolve(__dirname, '..', p);

const ROUTES = [
    '/',
    '/work',
    '/pricing',
    '/live',
    '/contact',

    // Services
    '/services/gfx',
    '/services/editing',
    '/services/growth',

    // Service Items
    '/thumbnails',
    '/branding',
    '/shorts',
    '/video-editing',
    '/services/growth/seo',
    '/services/growth/captions',

    // Subcategories (GFX)
    '/services/gfx/thumbnails/youtube',
    '/services/gfx/thumbnails/gaming',
    '/services/gfx/thumbnails/podcast',
    '/services/gfx/branding/channel',
    '/services/gfx/branding/social',
    '/services/gfx/branding/banners',

    // Subcategories (Editing)
    '/services/editing/shorts/gaming',
    '/services/editing/shorts/vlog',
    '/services/editing/shorts/podcast',
    '/services/editing/long/gaming',
    '/services/editing/long/vlog',
    '/services/editing/long/podcast',

    // Subcategories (Growth)
    '/services/growth/seo/titles',
    '/services/growth/seo/descriptions',
    '/services/growth/seo/keywords',
    '/services/growth/captions/srt',
    '/services/growth/captions/styles',

    // Tools
    '/tools/thumbnail-previewer',
    '/roi-calculator',
    '/tools/srt',
    '/tools/seo',
];

(async () => {
    console.log('✨ Starting Pre-rendering with custom server...');

    // 1. Start a simple static server with SPA fallback
    const app = http.createServer((req, res) => {
        // Basic security: prevent traversing up
        const safePath = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '');

        // Determine path
        let filePath = toAbsolute(path.join('dist', safePath));

        // If directory, try index.html
        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
            filePath = path.join(filePath, 'index.html');
        }

        // SPA Fallback: If file doesn't exist, serve dist/index.html
        // But only for requests that look like HTML navigation (no extension or .html)
        // Assets (.js, .css, .png) should 404 if missing to avoid serving HTML as JS.
        const ext = path.extname(filePath);
        if (!fs.existsSync(filePath)) {
            if (!ext || ext === '.html') {
                filePath = toAbsolute('dist/index.html');
            } else {
                res.writeHead(404);
                res.end('Not Found');
                return;
            }
        }

        // Serve file
        const serveExt = path.extname(filePath);
        const mimeType = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.json': 'application/json',
            '.ico': 'image/x-icon',
            '.txt': 'text/plain',
            '.xml': 'text/xml',
        }[serveExt] || 'application/octet-stream';

        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end(`Error loading ${req.url}`);
                return;
            }
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(data);
        });
    });

    const server = app.listen(0, 'localhost', async () => {
        const port = server.address().port;
        const serverUrl = `http://localhost:${port}`;
        console.log(`🚀 Custom preview server running at ${serverUrl}`);

        // 2. Launch Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();

            for (const route of ROUTES) {
                console.log(`📸 Pre-rendering: ${route}`);
                const url = `${serverUrl}${route}`;

                try {
                    // Increase timeout and wait for network idle
                    const response = await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

                    if (!response) {
                        console.error(`❌ No response for ${route}`);
                        continue;
                    }
                    if (!response.ok()) {
                        console.error(`❌ HTTP Error ${response.status()} for ${route}`);
                        continue;
                    }

                    // Generate output path
                    const relativePath = route === '/' ? 'index.html' : `${route.substring(1)}/index.html`;
                    const destPath = toAbsolute(`dist/${relativePath}`);
                    const destDir = path.dirname(destPath);

                    if (!fs.existsSync(destDir)) {
                        fs.mkdirSync(destDir, { recursive: true });
                    }

                    const html = await page.content();
                    fs.writeFileSync(destPath, html);
                    console.log(`   ✅ Saved to ${relativePath}`);

                } catch (err) {
                    console.error(`❌ Failed to render ${route}:`, err.message);
                }
            }
        } catch (e) {
            console.error('Fatal error in puppeteer:', e);
        } finally {
            await browser.close();
            server.close(); // Close the custom server
            console.log('🏁 Pre-rendering finished.');
            process.exit(0);
        }
    });
})();
