const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const MOVIES_DIR = path.join(__dirname, 'movies');

// Try multiple possible image locations
const IMG_DIRS = [
  path.join(__dirname, 'img'),
  path.join(__dirname, 'public', 'img')
];

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Serve img folder (posters / slideshow images)
app.use('/img', express.static(path.join(__dirname, 'img'), {
  maxAge: '7d',
  immutable: true
}));
app.use('/img', express.static(path.join(__dirname, 'public', 'img'), {
  maxAge: '7d',
  immutable: true
}));

// Load movies from metadata.json
function getMovies() {
  const metadataPath = path.join(MOVIES_DIR, 'metadata.json');

  if (!fs.existsSync(metadataPath)) {
    return [];
  }

  try {
    const data = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    return data.movies || [];
  } catch (e) {
    console.error('Error reading metadata.json:', e.message);
    return [];
  }
}

// API: Get all movies
app.get('/api/movies', (req, res) => {
  try {
    const movies = getMovies();
    res.json({ success: true, movies });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get single movie by id
app.get('/api/movies/:id', (req, res) => {
  try {
    const movies = getMovies();
    const movie = movies.find(m => m.id === parseInt(req.params.id));
    if (!movie) return res.status(404).json({ success: false, error: 'Movie not found' });
    res.json({ success: true, movie });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get all images from img/ folder (for hero slideshow)
app.get('/api/images', (req, res) => {
  try {
    const imgExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    let images = [];

    for (const dir of IMG_DIRS) {
      if (fs.existsSync(dir)) {
        const found = fs.readdirSync(dir)
          .filter(f => imgExts.includes(path.extname(f).toLowerCase()))
          .map(f => `/img/${f}`);
        if (found.length > 0) {
          images = found;
          break;
        }
      }
    }

    res.json({ success: true, images });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Only listen when running locally (not on Vercel)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`\n🎬 ═══════════════════════════════════════════`);
    console.log(`   ANIMOVID Server is running!`);
    console.log(`   🌐 http://localhost:${PORT}`);
    console.log(`   📁 Metadata: ${path.join(MOVIES_DIR, 'metadata.json')}`);
    console.log(`   ☁️  Videos stream from Google Drive`);
    console.log(`🎬 ═══════════════════════════════════════════\n`);
  });
}

// Export for Vercel serverless
module.exports = app;
