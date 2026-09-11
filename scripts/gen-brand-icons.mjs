// Genera los íconos de marca wxlter. (app icon, capas de ícono adaptativo
// de Android, favicon web, íconos PWA y el ícono del splash nativo)
// proceduralmente, sin dependencias externas ni rasterizador de SVG
// disponible en la máquina. Dibuja a 4x y reduce (box filter) para
// suavizar bordes, y codifica PNG a mano (IHDR/IDAT vía zlib nativo/IEND).
//
// Alcance: solo la identidad de cara afuera (ícono + splash). El sistema
// interno de la app (tema oscuro, `--accent`, etc.) no se toca aquí.
//
// Uso: node scripts/gen-brand-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, '..', 'assets', 'images');
const publicDir = join(__dirname, '..', 'public');
mkdirSync(assetsDir, { recursive: true });
mkdirSync(publicDir, { recursive: true });

const SS = 4; // factor de supersampling para antialiasing

const INK = [17, 17, 17, 255]; // #111111
const FARO = [255, 219, 0, 255]; // #ffdb00

// --- PNG encoding -------------------------------------------------------

let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // sin filtro
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// --- Primitivas de dibujo (hard-edge; el AA sale del downsample) --------

function makeCanvas(w, h) {
  return Buffer.alloc(w * h * 4, 0);
}

function setPixel(buf, w, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= w) return;
  const idx = (y * w + x) * 4;
  if (idx < 0 || idx + 3 >= buf.length) return;
  buf[idx] = r;
  buf[idx + 1] = g;
  buf[idx + 2] = b;
  buf[idx + 3] = a;
}

function fillRect(buf, w, h, x0, y0, x1, y1, color) {
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(h, Math.ceil(y1)); y++) {
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(w, Math.ceil(x1)); x++) {
      setPixel(buf, w, x, y, ...color);
    }
  }
}

function downsample(buf, bigW, bigH, factor) {
  const outW = bigW / factor;
  const outH = bigH / factor;
  const out = Buffer.alloc(outW * outH * 4);
  for (let oy = 0; oy < outH; oy++) {
    for (let ox = 0; ox < outW; ox++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let dy = 0; dy < factor; dy++) {
        for (let dx = 0; dx < factor; dx++) {
          const idx = ((oy * factor + dy) * bigW + (ox * factor + dx)) * 4;
          r += buf[idx];
          g += buf[idx + 1];
          b += buf[idx + 2];
          a += buf[idx + 3];
        }
      }
      const n = factor * factor;
      const oidx = (oy * outW + ox) * 4;
      out[oidx] = Math.round(r / n);
      out[oidx + 1] = Math.round(g / n);
      out[oidx + 2] = Math.round(b / n);
      out[oidx + 3] = Math.round(a / n);
    }
  }
  return out;
}

// --- El glifo: barras ascendentes (presupuesto/tendencia), 4 rects planos,
// sin redondeo. `boxScale` controla qué fracción del lienzo ocupan (para
// respetar la zona segura de los íconos adaptativos/maskable de Android). --

function drawBars(buf, w, h, boxScale, color) {
  const bars = 4;
  const gap = w * 0.045 * (1 / boxScale > 1.4 ? 1 : boxScale);
  const boxW = w * boxScale;
  const boxH = h * boxScale;
  const x0 = (w - boxW) / 2;
  const yBase = h / 2 + boxH / 2;
  const barW = (boxW - gap * (bars - 1)) / bars;
  const heights = [0.34, 0.56, 0.78, 1];

  for (let i = 0; i < bars; i++) {
    const bx0 = x0 + i * (barW + gap);
    const bh = boxH * heights[i];
    fillRect(buf, w, h, bx0, yBase - bh, bx0 + barW, yBase, color);
  }
}

function drawFullIcon(size) {
  const w = size;
  const h = size;
  const buf = makeCanvas(w, h);
  fillRect(buf, w, h, 0, 0, w, h, INK);
  drawBars(buf, w, h, 0.56, FARO);
  return buf;
}

function drawMaskableIcon(size) {
  const w = size;
  const h = size;
  const buf = makeCanvas(w, h);
  fillRect(buf, w, h, 0, 0, w, h, INK);
  drawBars(buf, w, h, 0.4, FARO); // zona segura ~80% de diámetro
  return buf;
}

function drawForegroundLayer(size) {
  const w = size;
  const h = size;
  const buf = makeCanvas(w, h); // transparente
  drawBars(buf, w, h, 0.42, FARO); // dentro de la zona segura del ícono adaptativo
  return buf;
}

function drawBackgroundLayer(size) {
  const w = size;
  const h = size;
  const buf = makeCanvas(w, h);
  fillRect(buf, w, h, 0, 0, w, h, INK);
  return buf;
}

function drawMonochromeLayer(size) {
  const w = size;
  const h = size;
  const buf = makeCanvas(w, h); // transparente; Android lo retiñe con el tema del sistema
  drawBars(buf, w, h, 0.42, [17, 17, 17, 255]);
  return buf;
}

function drawSplashIcon(w, h) {
  const buf = makeCanvas(w, h); // transparente; se centra sobre el fondo papel del splash
  drawBars(buf, w, h, 0.86, INK);
  return buf;
}

function generate(dir, filename, w, h, drawFn) {
  const big = drawFn(w * SS, h * SS);
  const small = downsample(big, w * SS, h * SS, SS);
  const png = encodePNG(w, h, small);
  writeFileSync(join(dir, filename), png);
  console.log(`✓ ${filename} (${w}x${h}, ${(png.length / 1024).toFixed(1)} KB)`);
}

generate(assetsDir, 'icon.png', 1024, 1024, drawFullIcon);
generate(assetsDir, 'android-icon-foreground.png', 512, 512, drawForegroundLayer);
generate(assetsDir, 'android-icon-background.png', 512, 512, drawBackgroundLayer);
generate(assetsDir, 'android-icon-monochrome.png', 432, 432, drawMonochromeLayer);
generate(assetsDir, 'favicon.png', 48, 48, drawFullIcon);
generate(assetsDir, 'splash-icon.png', 228, 213, drawSplashIcon);

generate(publicDir, 'icon-192.png', 192, 192, drawFullIcon);
generate(publicDir, 'icon-512.png', 512, 512, drawFullIcon);
generate(publicDir, 'icon-maskable.png', 512, 512, drawMaskableIcon);

console.log('Listo.');
