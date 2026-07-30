#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');

const apiKey = process.argv[2] || process.env.YT_API_KEY;
const ids = process.argv.slice(3);
if (!apiKey || ids.length === 0) {
  console.error('Usage: node fetch_yt_avatars.js API_KEY identifier1 identifier2 ...');
  console.error('Or set environment variable YT_API_KEY and call: node fetch_yt_avatars.js identifier1 identifier2 ...');
  process.exit(1);
}

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

function downloadUrl(url, out) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(out);
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.headers.location) {
          return downloadUrl(res.headers.location, out).then(resolve).catch(reject);
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', (e) => {
        try { fs.unlinkSync(out); } catch (e) {}
        reject(e);
      });
  });
}

async function resolveChannelId(identifier) {
  if (identifier.startsWith('UC') && identifier.length >= 24) return identifier;
  const q = encodeURIComponent(identifier);
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=1&q=${q}&key=${apiKey}`;
  const data = await httpsGetJson(url);
  if (data.items && data.items[0]) return data.items[0].snippet.channelId || (data.items[0].id && data.items[0].id.channelId);
  throw new Error('Channel not found: ' + identifier);
}

(async () => {
  try {
    if (!fs.existsSync('images')) fs.mkdirSync('images');
    for (const ident of ids) {
      try {
        const id = await resolveChannelId(ident);
        const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${id}&key=${apiKey}`;
        const info = await httpsGetJson(url);
        const item = info.items && info.items[0];
        if (!item) throw new Error('No channel info for ' + ident);
        const thumbs = item.snippet.thumbnails || {};
        const chosen = thumbs.maxres || thumbs.high || thumbs.medium || thumbs.default;
        if (!chosen || !chosen.url) throw new Error('No thumbnail found for ' + ident);
        const thumbUrl = chosen.url;
        const ext = path.extname(new URL(thumbUrl).pathname).split('?')[0] || '.jpg';
        const safeName = ident.replace(/^@/, '').replace(/[^a-z0-9_\-]/gi, '_');
        const out = path.join('images', `${safeName}${ext}`);
        console.log('Downloading', thumbUrl, '->', out);
        await downloadUrl(thumbUrl, out);
        console.log('Saved', out);
      } catch (e) {
        console.error('Error for', ident, e.message || e);
      }
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
