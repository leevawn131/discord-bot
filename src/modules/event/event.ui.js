const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { toDiscordTimestamp, formatVND } = require('./event.date');
const env = require('../../config/env');

/**
 * Creates the modal for creating a new event
 */
function createEventModal() {
  const modal = new ModalBuilder()
    .setCustomId('modal_event_create')
    .setTitle('Tạo Sự Kiện Mới');

  const titleInput = new TextInputBuilder()
    .setCustomId('event_title')
    .setLabel('Tiêu đề sự kiện')
    .setPlaceholder('VD: Giải Đấu Liên Quân Mùa Hè 2026')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(150);

  const rulesInput = new TextInputBuilder()
    .setCustomId('event_rules')
    .setLabel('Nội dung / Thể lệ sự kiện')
    .setPlaceholder('Nhập thể lệ, quyền lợi và thông tin chi tiết sự kiện...')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(2000);

  const priceInput = new TextInputBuilder()
    .setCustomId('event_price')
    .setLabel('Giá vé donate (VNĐ)')
    .setPlaceholder('VD: 50000 (nhập số nguyên, không dấu chấm phẩy)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(15);

  const donateDeadlineInput = new TextInputBuilder()
    .setCustomId('donate_deadline')
    .setLabel('Hạn chót donate')
    .setPlaceholder('DD/MM/YYYY (mặc định 23:59:59) hoặc HHhMM DD/MM/YYYY')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(30);

  const roleDeadlineInput = new TextInputBuilder()
    .setCustomId('role_deadline')
    .setLabel('Hạn kết thúc sự kiện (Thu hồi Role)')
    .setPlaceholder('DD/MM/YYYY (mặc định 23:59:59) hoặc HHhMM DD/MM/YYYY')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(30);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(rulesInput),
    new ActionRowBuilder().addComponents(priceInput),
    new ActionRowBuilder().addComponents(donateDeadlineInput),
    new ActionRowBuilder().addComponents(roleDeadlineInput)
  );

  return modal;
}

/**
 * Creates the public embed and join button for the event channel
 */
function createEventPublicMessage(event) {
  const donateUnix = Math.floor(new Date(event.donate_deadline).getTime() / 1000);
  const roleUnix = Math.floor(new Date(event.role_deadline).getTime() / 1000);

  let statusBadge = '🟢 [ĐANG DIỄN RA]';
  let color = 0x6366f1; // Indigo
  let buttonLabel = '🎟️ Tham gia sự kiện';
  let buttonDisabled = false;
  let buttonStyle = ButtonStyle.Success;

  if (event.status === 'CLOSED_REGISTRATION') {
    statusBadge = '🟡 [ĐÃ ĐÓNG ĐĂNG KÝ]';
    color = 0xf59e0b; // Amber
    buttonLabel = '🔒 Đã đóng cổng đăng ký';
    buttonDisabled = true;
    buttonStyle = ButtonStyle.Secondary;
  } else if (event.status === 'ENDED') {
    statusBadge = '🔴 [SỰ KIỆN ĐÃ KẾT THÚC]';
    color = 0x64748b; // Slate
    buttonLabel = '🏁 Sự kiện đã kết thúc';
    buttonDisabled = true;
    buttonStyle = ButtonStyle.Secondary;
  }

  const embed = new EmbedBuilder()
    .setTitle(`${statusBadge} ${event.title}`)
    .setDescription(event.rules)
    .setColor(color)
    .addFields(
      {
        name: '💰 Giá vé tham gia',
        value: `**${formatVND(event.price)}**`,
        inline: true,
      },
      {
        name: '⏰ Hạn chót đăng ký',
        value: `${toDiscordTimestamp(donateUnix, 'F')}\n(${toDiscordTimestamp(donateUnix, 'R')})`,
        inline: true,
      },
      {
        name: '🏁 Hạn kết thúc sự kiện',
        value: `${toDiscordTimestamp(roleUnix, 'F')}\n(${toDiscordTimestamp(roleUnix, 'R')})`,
        inline: true,
      },
      {
        name: '🎭 Quyền lợi thành viên',
        value: `Tự động nhận Role <@&${event.role_id || env.eventRoleId}> và mở khóa các kênh đặc quyền.`,
        inline: false,
      },
      {
        name: '⚡ Hướng dẫn đăng ký',
        value: 'Nhấn nút **"Tham gia sự kiện"** bên dưới để nhận mã QR thanh toán cá nhân.',
        inline: false,
      }
    )
    .setFooter({ text: `ID Sự kiện: #${event.id} • Tự động kích hoạt bởi Vaxloz Bot` })
    .setTimestamp();

  const button = new ButtonBuilder()
    .setCustomId(`btn_event_join_${event.id}`)
    .setLabel(buttonLabel)
    .setStyle(buttonStyle)
    .setDisabled(buttonDisabled);

  const row = new ActionRowBuilder().addComponents(button);

  return { embeds: [embed], components: [row] };
}

/**
 * Creates the ephemeral payment response embed
 */
function createPaymentEmbed(event, user, qrAttachmentName) {
  const sepay = env.sepay;
  const transferContent = `VAX ${user.id}`;

  const embed = new EmbedBuilder()
    .setTitle(`🎟️ VÉ THAM GIA: ${event.title}`)
    .setDescription('Vui lòng quét mã QR bên dưới hoặc chuyển khoản chính xác theo thông tin để được cấp Role tự động:')
    .setColor(0x10b981) // Emerald Green
    .addFields(
      {
        name: '🏦 Ngân hàng',
        value: `**${sepay.bankCode || 'MBBank'}**`,
        inline: true,
      },
      {
        name: '🔢 Số tài khoản',
        value: `\`${sepay.bankAccount || 'Chưa cấu hình'}\``,
        inline: true,
      },
      {
        name: '👤 Tên tài khoản',
        value: `**${sepay.accountName || 'Chưa cấu hình'}**`,
        inline: true,
      },
      {
        name: '💵 Số tiền cần thanh toán',
        value: `\`${formatVND(event.price)}\``,
        inline: true,
      },
      {
        name: '📝 Nội dung chuyển khoản (Bắt buộc)',
        value: `\`${transferContent}\``,
        inline: true,
      },
      {
        name: '⚠️ Lưu ý quan trọng',
        value:
          '• Giữ nguyên cú pháp **`' +
          transferContent +
          '`** để bot nhận diện.\n' +
          '• Hệ thống SePay sẽ tự động duyệt và cấp Role trong **1 - 2 phút**.\n' +
          '• Bot sẽ gửi tin nhắn trực tiếp (DM) cho bạn ngay khi nhận được tiền.',
        inline: false,
      }
    )
    .setImage(`attachment://${qrAttachmentName}`)
    .setFooter({ text: 'Thanh toán bảo mật qua SePay.vn • Vaxloz Bot' })
    .setTimestamp();

  return embed;
}

module.exports = {
  createEventModal,
  createEventPublicMessage,
  createPaymentEmbed,
};
