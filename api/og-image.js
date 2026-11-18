import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { id } = req.query;
  const cleanId = String(id || '').replace(/[^0-9]/g, '');

  let imageUrl = null;

  // Fetch directly from live backend API
  if (cleanId) {
    try {
      const apiRes = await fetch(`http://179.197.251.47:30080/herbal/products/${cleanId}/`, {
        signal: AbortSignal.timeout(3000)
      });
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data && data.image) {
          imageUrl = String(data.image).trim().replace(/([^:])\/\/+/g, '$1/');
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (!imageUrl) {
    return res.redirect(302, '/logo.png');
  }

  try {
    const imgRes = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(6000)
    });

    if (!imgRes.ok) {
      return res.redirect(302, imageUrl);
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    // WhatsApp requires image/jpeg or image/png
    if (contentType.includes('webp') || (!contentType.includes('jpeg') && !contentType.includes('png'))) {
      contentType = 'image/jpeg';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400');
    return res.status(200).send(buffer);
  } catch (err) {
    console.error('Error proxying image:', err.message);
    return res.redirect(302, imageUrl);
  }
}
