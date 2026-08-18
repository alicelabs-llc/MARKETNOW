import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// This simple plugin mocks the Cloudflare worker API for local dev
const mockApiPlugin = () => ({
  name: 'mock-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url.startsWith('/api/skills')) {
        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          
          if (url.pathname === '/api/skills.json') {
             return next();
          }

          // Mock the /api/skills endpoint
          const skillsRaw = fs.readFileSync(path.resolve('./public/api/skills.json'), 'utf-8');
          let skills = JSON.parse(skillsRaw);
          
          const page = parseInt(url.searchParams.get('page') || '1');
          const limit = parseInt(url.searchParams.get('limit') || '20');
          const cat = url.searchParams.get('cat');
          const q = url.searchParams.get('q');
          const sort = url.searchParams.get('sort') || 'name';
          const order = url.searchParams.get('order') || 'asc';
          
          if (cat && cat !== 'All') {
            skills = skills.filter(s => s.category === cat);
          }
          if (q) {
            const query = q.toLowerCase();
            skills = skills.filter(s => s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query));
          }
          
          skills.sort((a, b) => {
            let valA = a[sort];
            let valB = b[sort];
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            
            if (valA < valB) return order === 'asc' ? -1 : 1;
            if (valA > valB) return order === 'asc' ? 1 : -1;
            return 0;
          });
          
          const total = skills.length;
          const totalPages = Math.ceil(total / limit);
          const paginated = skills.slice((page - 1) * limit, page * limit);
          
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            skills: paginated,
            total,
            totalPages,
            page,
            categories: [...new Set(JSON.parse(skillsRaw).map(s => s.category))]
          }));
          return;
        } catch (e) {
          console.error('Mock API Error:', e);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
          return;
        }
      }
      next();
    });
  }
});

export default defineConfig({
<<<<<<< Updated upstream
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash]-v25.js',
        entryFileNames: 'assets/[name]-[hash]-v25.js',
        assetFileNames: 'assets/[name]-[hash]-v25.[ext]',
      },
    },
  },
})
=======
  plugins: [react(), mockApiPlugin()],
});
>>>>>>> Stashed changes
