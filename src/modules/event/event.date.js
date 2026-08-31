const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Parses user input date string into dayjs object with Asia/Ho_Chi_Minh timezone
 * Supported formats:
 * - DD/MM/YYYY (default to 23:59:59)
 * - HHhMM DD/MM/YYYY or HHhmm DD/MM/YYYY (e.g. 18h30 30/08/2026)
 * - HH:mm DD/MM/YYYY (e.g. 18:30 30/08/2026)
 * - HH:mm:ss DD/MM/YYYY
 * - YYYY-MM-DD or YYYY-MM-DD HH:mm:ss
 */
function parseVietnamDate(input) {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Vui lòng nhập định dạng ngày tháng hợp lệ.' };
  }

  const trimmed = input.trim();
  let parsed = null;

  // Case 1: HHhMM DD/MM/YYYY or HHhmm DD/MM/YYYY (e.g. "18h30 30/08/2026")
  const hPattern = /^(\d{1,2})[hH](\d{1,2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const hMatch = trimmed.match(hPattern);
  if (hMatch) {
    const [, hour, minute, day, month, year] = hMatch;
    const formatted = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`;
    parsed = dayjs.tz(formatted, 'YYYY-MM-DD HH:mm:ss', VN_TIMEZONE);
  }

  // Case 2: HH:mm DD/MM/YYYY
  if (!parsed || !parsed.isValid()) {
    const colonPattern = /^(\d{1,2}):(\d{1,2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const colonMatch = trimmed.match(colonPattern);
    if (colonMatch) {
      const [, hour, minute, day, month, year] = colonMatch;
      const formatted = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`;
      parsed = dayjs.tz(formatted, 'YYYY-MM-DD HH:mm:ss', VN_TIMEZONE);
    }
  }

  // Case 3: DD/MM/YYYY (default to 23:59:59)
  if (!parsed || !parsed.isValid()) {
    const dmyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const dmyMatch = trimmed.match(dmyPattern);
    if (dmyMatch) {
      const [, day, month, year] = dmyMatch;
      const formatted = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} 23:59:59`;
      parsed = dayjs.tz(formatted, 'YYYY-MM-DD HH:mm:ss', VN_TIMEZONE);
    }
  }

  // Case 4: Standard ISO / standard formats fallback
  if (!parsed || !parsed.isValid()) {
    const directParsed = dayjs.tz(trimmed, VN_TIMEZONE);
    if (directParsed.isValid()) {
      parsed = directParsed;
    }
  }

  if (!parsed || !parsed.isValid()) {
    return {
      valid: false,
      error: `Định dạng ngày "${input}" không hợp lệ! Hỗ trợ: \`DD/MM/YYYY\` (mặc định 23:59:59) hoặc \`HHhMM DD/MM/YYYY\` (VD: \`18h30 30/08/2026\`).`,
    };
  }

  const now = dayjs().tz(VN_TIMEZONE);
  if (parsed.isBefore(now)) {
    return {
      valid: false,
      error: `Thời gian "${input}" (${parsed.format('HH:mm:ss DD/MM/YYYY')}) đã trôi qua trong quá khứ! Vui lòng chọn thời gian tương lai.`,
    };
  }

  return {
    valid: true,
    dayjs: parsed,
    isoString: parsed.toISOString(),
    unixTimestamp: parsed.unix(),
    formatted: parsed.format('HH:mm:ss DD/MM/YYYY'),
  };
}

/**
 * Formats a timestamp into Discord tag syntax
 */
function toDiscordTimestamp(unixTimestamp, style = 'F') {
  return `<t:${unixTimestamp}:${style}>`;
}

/**
 * Format currency into VND string (e.g. 50,000 VNĐ)
 */
function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

module.exports = {
  parseVietnamDate,
  toDiscordTimestamp,
  formatVND,
  VN_TIMEZONE,
};
