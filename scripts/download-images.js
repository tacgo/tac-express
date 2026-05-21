const fs = require('fs');
const https = require('https');
const path = require('path');

const urls = [
  { url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=2070&fm=webp', name: 'tac-truck-hero.webp' },
  { url: 'https://images.unsplash.com/photo-1586528116311-ad8ed7c80a30?q=80&w=2070&fm=webp', name: 'tac-dock-illustration.webp' }
];

const dirs = [
  path.join(__dirname, 'apps/web/public/images'),
  path.join(__dirname, 'apps/dashboard/public/images')
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

urls.forEach(({ url, name }) => {
  https.get(url, (response) => {
    dirs.forEach(dir => {
      const file = fs.createWriteStream(path.join(dir, name));
      response.pipe(file);
    });
  });
});
