/**
 * Cấu hình các kênh bị hạn chế (Cấm nhắn tin, ai nhắn tin vào sẽ bị xóa tin và tự động kick)
 */
module.exports = {
  restrictedChannels: [
    {
      channelId: '1539992129252630528',
      exemptMessageIds: [
        '1539992204154503230',
        '1539992854879936573',
        '1539992890451959928',
      ],
      reason: 'Tự động kick: Nhắn tin vào kênh bị cấm',
    },
  ],
};
