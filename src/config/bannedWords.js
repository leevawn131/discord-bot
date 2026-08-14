/**
 * ArrayList danh sách các từ cấm (Bao gồm cả Tiếng Việt có dấu, không dấu và các mẫu Regex cấm)
 * Bạn có thể thêm hoặc bớt các từ cấm trực tiếp vào mảng dưới đây.
 */
module.exports = [
  // Mẫu kiểm tra chuỗi cấm đặc biệt (Regex)
  /\.steam/i,

  // Các từ cấm Tiếng Việt (Cả có dấu và không dấu, hỗ trợ Đ/đ chuẩn 100%)
  `nigga`,
  `níc ga`
];
