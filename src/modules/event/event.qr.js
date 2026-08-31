const sharp = require('sharp');
const QRCode = require('qrcode');
const axios = require('axios');
const { generateVietQR } = require('@viet-qr/core');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

const TEMPLATE_DIR = path.join(__dirname, '../../../assets/templates');
if (!fs.existsSync(TEMPLATE_DIR)) {
  fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
}

const BANK_BINS = {
  MBBank: '970422', MB: '970422', VCB: '970436', Vietcombank: '970436',
  TCB: '970407', Techcombank: '970407', VPB: '970432', VPBank: '970432',
  ACB: '970416', BIDV: '970418', VIB: '970441', TPB: '970423', TPBank: '970423',
  STB: '970403', Sacombank: '970403', CTG: '970415', VietinBank: '970415',
  OCB: '970448', MSB: '970426', SHB: '970443', HDB: '970437', HDBank: '970437',
  Agribank: '970405', VBA: '970405',
};

function getBankBin(bankCode) {
  if (!bankCode) return '970422';
  if (/^\d{6}$/.test(bankCode)) return bankCode;
  return BANK_BINS[bankCode] || BANK_BINS[bankCode.toUpperCase()] || '970422';
}

/**
 * Creates a default attractive template image if admin hasn't uploaded one yet
 */
async function generateDefaultTemplate(targetPath, width = 900, height = 1100, qrX = 225, qrY = 400, qrSize = 450) {
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="50%" stop-color="#1e1b4b" />
          <stop offset="100%" stop-color="#090d16" />
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#6366f1" />
          <stop offset="100%" stop-color="#ec4899" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="15" flood-color="#6366f1" flood-opacity="0.3"/>
        </filter>
      </defs>

      <!-- Background -->
      <rect width="100%" height="100%" fill="url(#bg)" rx="32"/>

      <!-- Header Card -->
      <rect x="50" y="50" width="${width - 100}" height="180" rx="24" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.1" stroke-width="2"/>
      <text x="${width / 2}" y="120" fill="url(#accent)" font-family="sans-serif" font-size="44" font-weight="bold" text-anchor="middle">CỔNG THANH TOÁN SỰ KIỆN</text>
      <text x="${width / 2}" y="175" fill="#94a3b8" font-family="sans-serif" font-size="24" text-anchor="middle">Quét mã VietQR để nhận Role tự động</text>

      <!-- QR Frame Placeholder (White Box for Sharp Overlay) -->
      <rect x="${qrX - 15}" y="${qrY - 15}" width="${qrSize + 30}" height="${qrSize + 30}" rx="28" fill="#ffffff" filter="url(#glow)"/>

      <!-- Instructions Box -->
      <rect x="50" y="${qrY + qrSize + 50}" width="${width - 100}" height="180" rx="24" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.1" stroke-width="2"/>
      <text x="${width / 2}" y="${qrY + qrSize + 110}" fill="#f8fafc" font-family="sans-serif" font-size="24" font-weight="bold" text-anchor="middle">HỆ THỐNG TỰ ĐỘNG XÁC NHẬN TRONG 1 - 2 PHÚT</text>
      <text x="${width / 2}" y="${qrY + qrSize + 160}" fill="#38bdf8" font-family="sans-serif" font-size="22" text-anchor="middle">Vui lòng giữ nguyên nội dung chuyển khoản</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(targetPath);

  logger.info(`Generated default template at ${targetPath}`);
}

/**
 * Sinh buffer mã VietQR chuẩn ngân hàng từ SePay API (hoặc fallback sang @viet-qr/core)
 */
async function generateVietQrBuffer({ bankAccount, bankCode, amount, content }) {
  const qrUrl = `https://qr.sepay.vn/img?acc=${encodeURIComponent(bankAccount || '')}&bank=${encodeURIComponent(bankCode || '')}&amount=${amount || 0}&des=${encodeURIComponent(content || '')}`;

  try {
    const res = await axios.get(qrUrl, { responseType: 'arraybuffer', timeout: 5000 });
    return Buffer.from(res.data);
  } catch (err) {
    logger.warn(`SePay QR image fetch failed (${err.message}), falling back to local @viet-qr/core`);
    const bin = getBankBin(bankCode);
    const emvcoPayload = generateVietQR({
      bankId: bin,
      accountNo: bankAccount,
      amount: amount || 0,
      content: content || '',
    });
    return await QRCode.toBuffer(emvcoPayload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  }
}

/**
 * Sinh QR code từ chuỗi text tuỳ ý
 */
async function generateQrBuffer(text) {
  return await QRCode.toBuffer(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}

/**
 * Tự động tìm Tâm, Kích thước và Góc xoay chuẩn xác bằng Rotated Bounding Box (Rotating Calipers 2D)
 */
async function detectUniversalQrBoxWithAngle(templateBuffer) {
  const scanWidth = 400;
  const image = sharp(templateBuffer);
  const metadata = await image.metadata();

  const scale = metadata.width / scanWidth;
  const scanHeight = Math.round((metadata.height / metadata.width) * scanWidth);

  const { data, info } = await image
    .resize(scanWidth, scanHeight, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const totalPixels = width * height;

  // 1. Nhị phân hóa ảnh (Trắng > 235)
  const binary = new Uint8Array(totalPixels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      if (data[idx] > 235 && data[idx + 1] > 235 && data[idx + 2] > 235) {
        binary[y * width + x] = 1;
      }
    }
  }

  // 2. Tìm khối trắng lớn nhất (Khung QR)
  const visited = new Uint8Array(totalPixels);
  let bestPixels = null;
  let maxCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (binary[idx] === 1 && !visited[idx]) {
        const queue = [x, y];
        visited[idx] = 1;

        const blobPixels = [];
        let head = 0;

        while (head < queue.length) {
          const curX = queue[head++];
          const curY = queue[head++];
          blobPixels.push({ x: curX, y: curY });

          const neighbors = [
            [curX + 1, curY], [curX - 1, curY],
            [curX, curY + 1], [curX, curY - 1],
          ];

          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;
              if (binary[nIdx] === 1 && !visited[nIdx]) {
                visited[nIdx] = 1;
                queue.push(nx, ny);
              }
            }
          }
        }

        if (blobPixels.length > maxCount && blobPixels.length >= totalPixels * 0.03) {
          maxCount = blobPixels.length;
          bestPixels = blobPixels;
        }
      }
    }
  }

  if (!bestPixels) {
    const fallbackSize = Math.floor(metadata.width * 0.38);
    return {
      centerX: Math.floor(metadata.width / 2),
      centerY: Math.floor(metadata.height / 2),
      size: fallbackSize,
      angle: 0,
    };
  }

  // 3. TÍNH TÂM VÀ QUÉT TÌM GÓC XOAY TỐI ƯU (MINIMUM BOUNDING BOX)
  const n = bestPixels.length;
  let sumX = 0, sumY = 0;
  for (const p of bestPixels) {
    sumX += p.x;
    sumY += p.y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let minBBoxArea = Infinity;
  let bestAngleDeg = 0;
  let bestUnrotatedW = 0;
  let bestUnrotatedH = 0;

  // Quét góc xoay từ -30° đến +30° với bước 0.2° để tìm góc có diện tích bao nhỏ nhất
  for (let a = -30; a <= 30; a += 0.2) {
    const rad = (a * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const p of bestPixels) {
      const dx = p.x - meanX;
      const dy = p.y - meanY;
      const rx = dx * cos - dy * sin;
      const ry = dx * sin + dy * cos;

      if (rx < minX) minX = rx;
      if (rx > maxX) maxX = rx;
      if (ry < minY) minY = ry;
      if (ry > maxY) maxY = ry;
    }

    const bboxArea = (maxX - minX) * (maxY - minY);
    if (bboxArea < minBBoxArea) {
      minBBoxArea = bboxArea;
      bestAngleDeg = -a;
      bestUnrotatedW = (maxX - minX) * scale;
      bestUnrotatedH = (maxY - minY) * scale;
    }
  }

  // 4. TÍNH TOẠ ĐỘ VÀ KÍCH THƯỚC TRÊN ẢNH GỐC
  const realCenterX = meanX * scale;
  const realCenterY = meanY * scale;

  // Lấy 80% chiều rộng khung để vừa khít bên trong 4 góc bo tròn
  const qrSize = Math.round(Math.min(bestUnrotatedW, bestUnrotatedH) * 0.80);

  return {
    centerX: Math.round(realCenterX),
    centerY: Math.round(realCenterY),
    size: qrSize,
    angle: Number(bestAngleDeg.toFixed(2)),
  };
}

/**
 * Ghép QR code vào vị trí chuẩn tuyệt đối
 */
async function compositeQrToTemplate(templateInput, qrTextOrBuffer) {
  const templateBuffer = Buffer.isBuffer(templateInput)
    ? templateInput
    : fs.readFileSync(templateInput);

  const { centerX, centerY, size, angle } = await detectUniversalQrBoxWithAngle(templateBuffer);

  const qrBuffer = Buffer.isBuffer(qrTextOrBuffer)
    ? qrTextOrBuffer
    : await generateQrBuffer(qrTextOrBuffer);

  const rotatedQr = await sharp(qrBuffer)
    .resize(size, size, { fit: 'fill' })
    .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer({ resolveWithObject: true });

  const left = Math.round(centerX - rotatedQr.info.width / 2);
  const top = Math.round(centerY - rotatedQr.info.height / 2);

  return await sharp(templateBuffer)
    .composite([
      {
        input: rotatedQr.data,
        top: top,
        left: left,
      },
    ])
    .png()
    .toBuffer();
}

/**
 * Generate VietQR image overlayed onto the template
 * @param {Object} options
 * @param {string} options.bankAccount
 * @param {string} options.bankCode
 * @param {number} options.amount
 * @param {string} options.content - Transfer content e.g. "VAX 123456789"
 * @param {string} [options.templatePath]
 * @returns {Promise<Buffer>} Composited image buffer (PNG)
 */
async function generateEventQrImage({
  bankAccount,
  bankCode,
  amount,
  content,
  templatePath,
}) {
  let targetTemplatePath = templatePath;

  if (targetTemplatePath) {
    if (!fs.existsSync(targetTemplatePath)) {
      const inTemplateDir = path.join(TEMPLATE_DIR, path.basename(targetTemplatePath));
      if (fs.existsSync(inTemplateDir)) {
        targetTemplatePath = inTemplateDir;
      }
    }
  }

  // If no template path provided or file doesn't exist, use or create default template
  if (!targetTemplatePath || !fs.existsSync(targetTemplatePath)) {
    targetTemplatePath = path.join(TEMPLATE_DIR, 'default_template.png');
    if (!fs.existsSync(targetTemplatePath)) {
      await generateDefaultTemplate(targetTemplatePath);
    }
  }

  // Sinh buffer ảnh VietQR chuẩn ngân hàng (SePay / EMVCo)
  const qrBuffer = await generateVietQrBuffer({
    bankAccount,
    bankCode,
    amount,
    content,
  });

  const templateBuffer = fs.readFileSync(targetTemplatePath);
  return await compositeQrToTemplate(templateBuffer, qrBuffer);
}

module.exports = {
  generateVietQrBuffer,
  generateQrBuffer,
  detectUniversalQrBoxWithAngle,
  compositeQrToTemplate,
  generateEventQrImage,
  generateDefaultTemplate,
  TEMPLATE_DIR,
};
