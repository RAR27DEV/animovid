/**
 * ANIMOVID - Poster Downloader
 * =============================
 * Script untuk mendownload poster anime dari MyAnimeList (MAL) / IMDB
 * 
 * Cara pakai:
 *   node download-poster.js
 * 
 * Script ini akan mencoba download poster untuk setiap movie yang
 * belum punya poster di folder posters/
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const MOVIES_DIR = path.join(__dirname, 'movies');
const POSTERS_DIR = path.join(__dirname, 'posters');

// Poster URLs — tambahkan URL poster anime kamu di sini
// Format: { "nama-file-video.mp4": "URL-poster" }
const POSTER_URLS = {
    "lock back 1080p.mp4": "https://upload.wikimedia.org/wikipedia/en/f/f1/Look_Back_%28film%29.jpg"
};

if (!fs.existsSync(POSTERS_DIR)) fs.mkdirSync(POSTERS_DIR, { recursive: true });

function download(url, destPath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;

        protocol.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/*'
            },
            timeout: 15000
        }, (res) => {
            // Handle redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                console.log(`  ↪ Redirect ke: ${res.headers.location.substring(0, 60)}...`);
                download(res.headers.location, destPath).then(resolve).catch(reject);
                return;
            }

            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }

            const file = fs.createWriteStream(destPath);
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
    });
}

async function main() {
    console.log('\n🖼️  ANIMOVID Poster Downloader');
    console.log('═══════════════════════════════\n');

    const entries = Object.entries(POSTER_URLS);

    if (entries.length === 0) {
        console.log('Belum ada URL poster yang dikonfigurasi.');
        console.log('Edit file download-poster.js dan tambahkan URL di POSTER_URLS.\n');
        return;
    }

    for (const [filename, url] of entries) {
        const name = path.parse(filename).name;
        const ext = path.extname(url).split('?')[0] || '.jpg';
        const destPath = path.join(POSTERS_DIR, name + ext);

        if (fs.existsSync(destPath)) {
            console.log(`✅ ${filename} → poster sudah ada`);
            continue;
        }

        console.log(`📥 Downloading poster: ${filename}`);
        console.log(`   URL: ${url.substring(0, 70)}...`);

        try {
            await download(url, destPath);
            const size = fs.statSync(destPath).size;
            console.log(`   ✅ Berhasil! (${(size / 1024).toFixed(1)} KB)\n`);
        } catch (err) {
            console.log(`   ❌ Gagal: ${err.message}\n`);
        }
    }

    console.log('\nSelesai! Restart server untuk melihat perubahan.');
    console.log('Jalankan: node server.js\n');
}

main();
