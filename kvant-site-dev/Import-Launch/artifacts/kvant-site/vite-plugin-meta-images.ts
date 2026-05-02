import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Vite plugin that updates og:image, twitter:image, og:url, and canonical
 * meta tags to point to the app's correct Replit domain at build time.
 */
export function metaImagesPlugin(): Plugin {
  return {
    name: 'vite-plugin-meta-images',
    transformIndexHtml(html) {
      const baseUrl = getDeploymentUrl();
      if (!baseUrl) {
        log('[meta-images] no Replit deployment domain found, skipping meta tag updates');
        return html;
      }

      // Update canonical and og:url with the real deployment URL
      html = html.replace(
        /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/g,
        `<link rel="canonical" href="${baseUrl}" />`
      );
      html = html.replace(
        /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/g,
        `<meta property="og:url" content="${baseUrl}" />`
      );

      // Update robots.txt sitemap URL
      // (robots.txt is a static file; domain update done server-side)

      // Check if opengraph image exists in public directory
      const publicDir = path.resolve(process.cwd(), 'client', 'public');
      const opengraphPngPath = path.join(publicDir, 'opengraph.png');
      const opengraphJpgPath = path.join(publicDir, 'opengraph.jpg');
      const opengraphJpegPath = path.join(publicDir, 'opengraph.jpeg');

      let imageExt: string | null = null;
      if (fs.existsSync(opengraphPngPath)) {
        imageExt = 'png';
      } else if (fs.existsSync(opengraphJpgPath)) {
        imageExt = 'jpg';
      } else if (fs.existsSync(opengraphJpegPath)) {
        imageExt = 'jpeg';
      }

      if (imageExt) {
        const imageUrl = `${baseUrl}/opengraph.${imageExt}`;
        log('[meta-images] updating meta image tags to:', imageUrl);

        html = html.replace(
          /<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/g,
          `<meta property="og:image" content="${imageUrl}" />`
        );
        html = html.replace(
          /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/>/g,
          `<meta name="twitter:image" content="${imageUrl}" />`
        );
      } else {
        log('[meta-images] OpenGraph image not found, skipping image meta tag updates');
      }

      return html;
    },
  };
}

function getDeploymentUrl(): string | null {
  if (process.env.REPLIT_INTERNAL_APP_DOMAIN) {
    const url = `https://${process.env.REPLIT_INTERNAL_APP_DOMAIN}`;
    log('[meta-images] using internal app domain:', url);
    return url;
  }

  if (process.env.REPLIT_DEV_DOMAIN) {
    const url = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    log('[meta-images] using dev domain:', url);
    return url;
  }

  return null;
}

function log(...args: any[]): void {
  if (process.env.NODE_ENV === 'production') {
    console.log(...args);
  }
}
