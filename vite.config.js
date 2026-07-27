import { defineConfig } from 'vite';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/* Dev-only frame sink.
   The look of this site is the product, so it has to be reviewed as frames, not
   as code. POST a base64 PNG to /__shot?name=foo and it lands in .frames/foo.png.
   Serves the same role a render-preview would in a compositing app. Never runs in
   a production build — `apply: 'serve'`. */
function frameSink() {
  return {
    name: 'gas-frame-sink',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__shot', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => {
          const name = new URL(req.url, 'http://x').searchParams.get('name') || 'frame';
          const file = resolve(server.config.root, '.frames', `${name.replace(/[^\w.-]/g, '_')}.png`);
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, Buffer.from(body, 'base64'));
          res.end(file);
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [frameSink()],
  server: { port: 5173 },
});
