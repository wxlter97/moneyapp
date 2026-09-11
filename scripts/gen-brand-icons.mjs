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

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projx = x1 + t * dx;
  const projy = y1 + t * dy;
  const ddx = px - projx;
  const ddy = py - projy;
  return Math.sqrt(ddx * ddx + ddy * ddy);
}

function drawLine(buf, w, h, x1, y1, x2, y2, thickness, color) {
  const minX = Math.max(0, Math.floor(Math.min(x1, x2) - thickness));
  const maxX = Math.min(w, Math.ceil(Math.max(x1, x2) + thickness));
  const minY = Math.max(0, Math.floor(Math.min(y1, y2) - thickness));
  const maxY = Math.min(h, Math.ceil(Math.max(y1, y2) + thickness));
  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      if (distToSegment(x, y, x1, y1, x2, y2) <= thickness / 2) setPixel(buf, w, x, y, ...color);
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

// --- El glifo: signo de dólar. La "S" se traza como una polilínea gruesa
// (mismo recurso que el símbolo wxlter. de la esquina y las barras de la
// versión anterior: nada de geometría de arcos) y la barra vertical la
// cruza de punta a punta. `boxScale` controla qué fracción del lienzo
// ocupa (zona segura de los íconos adaptativos/maskable de Android). -----

function drawDollar(buf, w, h, boxScale, color) {
  const cx = w / 2;
  const cy = h / 2;
  const unit = h * boxScale;
  const X = (fx) => cx + fx * unit;
  const Y = (fy) => cy + fy * unit;

  const sPoints = [
    [0.3, -0.36],
    [-0.22, -0.36],
    [-0.22, 0],
    [0.22, 0],
    [0.22, 0.36],
    [-0.3, 0.36],
  ];
  const sThickness = unit * 0.16;
  for (let i = 0; i < sPoints.length - 1; i++) {
    drawLine(buf, w, h, X(sPoints[i][0]), Y(sPoints[i][1]), X(sPoints[i + 1][0]), Y(sPoints[i + 1][1]), sThickness, color);
  }

  const barThickness = unit * 0.115;
  fillRect(buf, w, h, cx - barThickness / 2, Y(-0.47), cx + barThickness / 2, Y(0.47), color);
}

// --- El símbolo wxlter. (la marca del sitio: zigzag amarillo faro sobre
// tinta) en una esquina, a modo de sello de marca — solo en los ícono
// planos de bordes completos (no en las capas adaptativas/maskable de
// Android, que un launcher puede recortar a un círculo y perderían la
// esquina por completo). --------------------------------------------------

function drawCornerMark(buf, w, h, color) {
  const box = w * 0.2;
  const margin = w * 0.08;
  const ox = w - margin - box;
  const oy = h - margin - box;
  const X = (v) => ox + (v / 100) * box;
  const Y = (v) => oy + (v / 100) * box;
  const stroke = box * 0.16;
  const pts = [
    [14, 24],
    [32, 76],
    [50, 44],
    [68, 76],
    [86, 24],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    drawLine(buf, w, h, X(pts[i][0]), Y(pts[i][1]), X(pts[i + 1][0]), Y(pts[i + 1][1]), stroke, color);
  }
}

function drawFullIcon(size) {
  const w = size;
  const h = size;
  const buf = makeCanvas(w, h);
  fillRect(buf, w, h, 0, 0, w, h, INK);
  drawDollar(buf, w, h, 0.56, FARO);
  drawCornerMark(buf, w, h, FARO);
  return buf;
}

function drawMaskableIcon(size) {
  const w = size;
  const h = size;
  const buf = makeCanvas(w, h);
  fillRect(buf, w, h, 0, 0, w, h, INK);
  drawDollar(buf, w, h, 0.36, FARO); // zona segura ~80% de diámetro
  return buf;
}

function drawForegroundLayer(size) {
  const w = size;
  const h = size;
  const buf = makeCanvas(w, h); // transparente
  drawDollar(buf, w, h, 0.38, FARO); // dentro de la zona segura del ícono adaptativo
  return buf;
}

function drawMonochromeLayer(size) {
  const w = size;
  const h = size;
  const buf = makeCanvas(w, h); // transparente; Android lo retiñe con el tema del sistema
  drawDollar(buf, w, h, 0.38, [17, 17, 17, 255]);
  return buf;
}

function drawBackgroundLayer(size) {
  const w = size;
  const h = size;
  const buf = makeCanvas(w, h);
  fillRect(buf, w, h, 0, 0, w, h, INK);
  return buf;
}

function drawSplashIcon(w, h) {
  const buf = makeCanvas(w, h); // transparente; se centra sobre el fondo papel del splash
  drawDollar(buf, w, h, 0.8, INK);
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
