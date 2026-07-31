// ============================================================
// البوت المتكامل - النسخة النهائية مع سجلات التذاكر ومكافآت الرسائل والفويس
// ============================================================

const {
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  PermissionsBitField, ChannelType, ModalBuilder,
  TextInputBuilder, TextInputStyle, ActivityType, MessageFlags
} = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const port = process.env.PORT || 3000;

// ========== خادم الويب ==========
app.get('/', (req, res) => res.send('✅ البوت يعمل'));
app.listen(port, () => console.log(`🌐 خادم الويب على المنفذ ${port}`));

// ========== متغيرات البيئة ==========
const TOKEN = process.env.DISCORD_TOKEN;
const MONGO_URL = process.env.MONGO_URL;
const OWNER_ID = process.env.OWNER_ID || '1507841424186675220';

if (!TOKEN || !MONGO_URL) {
  console.error('❌ تأكد من وجود DISCORD_TOKEN و MONGO_URL');
  process.exit(1);
}

// ========== اتصال MongoDB ==========
mongoose.connect(MONGO_URL)
  .then(() => console.log('✅ اتصال MongoDB ناجح'))
  .catch(err => { console.error('❌ فشل اتصال MongoDB:', err); process.exit(1); });

// ============================================================
// ========== نماذج MongoDB ==========
// ============================================================

const ConfigSchema = new mongoose.Schema({
  guildId: { type: String, unique: true, required: true },
  logChannel: String,
  ticketLogChannel: String, // قناة سجلات التذاكر
  welcomeChannel: String,
  welcomeMessage: { type: String, default: 'أهلاً بك في السيرفر! 🎉' },
  welcomeTitle: { type: String, default: '🔥 مرحباً بك في المجتمع' },
  welcomeImage: String,
  welcomeBackground: String,
  muteRole: String,
  joinRole: String,
  ticketPanelImage: String,
  rolesImage: String,
  bannerImage: String,
  generalImage: String,
  levelChannelId: String,
  suggestionsChannel: String,
  suggestionsTitle: { type: String, default: '💡 قناة الاقتراحات' },
  suggestionsDescription: { type: String, default: 'شاركنا اقتراحك!' },
  suggestionsColor: { type: String, default: '#2b2d31' },
  suggestionsImage: String,
  tasksChannel: String,
  leaveRequestChannel: String,
  storeChannel: String,
  leaveManagerRole: String,
  seniorAdminRole: String,
  juniorAdminRole: String,
  sellerRole: String,
  pointsPerTask: { type: Number, default: 10 },
  dailySalary: { type: Number, default: 5 },
  promotionPoints: { type: Number, default: 100 },
  leavePanelImage: String,
  storePanelImage: String,
}, { timestamps: true });
const Config = mongoose.model('Config', ConfigSchema);

const UserSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  messages: { type: Number, default: 0 },
  kl: { type: Number, default: 0 },
  adminPoints: { type: Number, default: 0 },
  lastDaily: Date,
  lastVoiceReward: { type: Date, default: null },
  assignedTasks: [{ taskId: mongoose.Schema.Types.ObjectId, status: { type: String, enum: ['pending', 'accepted', 'completed'], default: 'pending' } }],
  leave: { isOnLeave: { type: Boolean, default: false }, leaveEnd: Date, savedRoles: [String] },
  purchasedRoles: [String],
}, { timestamps: true });
UserSchema.index({ guildId: 1, userId: 1 }, { unique: true });
const User = mongoose.model('User', UserSchema);

const TaskSchema = new mongoose.Schema({
  guildId: String,
  assignedBy: String,
  assignedTo: String,
  title: String,
  description: String,
  status: { type: String, enum: ['pending', 'accepted', 'completed', 'rejected'], default: 'pending' },
  points: { type: Number, default: 10 },
  adminPoints: { type: Number, default: 0 },
  proofText: String,
  proofImage: String,
  createdAt: { type: Date, default: Date.now },
  completedAt: Date,
});
const Task = mongoose.model('Task', TaskSchema);

const LeaveRequestSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  reason: String,
  duration: Number,
  startDate: Date,
  endDate: Date,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: String,
  createdAt: { type: Date, default: Date.now },
});
const LeaveRequest = mongoose.model('LeaveRequest', LeaveRequestSchema);

const StoreItemSchema = new mongoose.Schema({
  guildId: String,
  roleId: String,
  price: Number,
  description: String,
});
const StoreItem = mongoose.model('StoreItem', StoreItemSchema);

const PendingPurchaseSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  roleId: String,
  roleName: String,
  price: Number,
  status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});
const PendingPurchase = mongoose.model('PendingPurchase', PendingPurchaseSchema);

const ModLoginSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  modPassword: String,
  lastLogin: Date,
});
const ModLogin = mongoose.model('ModLogin', ModLoginSchema);

const WarnSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  reason: String,
  moderator: String,
  date: { type: Date, default: Date.now },
});
const Warn = mongoose.model('Warn', WarnSchema);

const TicketSettingsSchema = new mongoose.Schema({
  guildId: { type: String, unique: true, required: true },
  sections: [{
    name: String,
    roleId: String,
    emoji: { type: String, default: '📌' },
  }],
  text: { type: String, default: 'مرحباً بكم في قسم التذاكر...' },
  image: { type: String, default: 'https://i.imgur.com/GkKqN3G.png' },
});
const TicketSettings = mongoose.model('TicketSettings', TicketSettingsSchema);

// ====== نموذج سجلات التذاكر ======
const TicketLogSchema = new mongoose.Schema({
  guildId: String,
  channelId: String,
  userId: String,
  section: String,
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['open', 'claimed', 'closed'], default: 'open' },
  claimedBy: { type: String, default: null },
  addedMembers: [String],
  closedAt: { type: Date, default: null },
});
const TicketLog = mongoose.model('TicketLog', TicketLogSchema);

const AutoLineSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  text: String,
  image: String,
  enabled: { type: Boolean, default: false },
});
AutoLineSchema.index({ guildId: 1, channelId: 1 }, { unique: true });
const AutoLine = mongoose.model('AutoLine', AutoLineSchema);

const AutoReplySchema = new mongoose.Schema({
  guildId: String,
  keyword: String,
  reply: String,
  image: String,
});
AutoReplySchema.index({ guildId: 1, keyword: 1 }, { unique: true });
const AutoReply = mongoose.model('AutoReply', AutoReplySchema);

const LevelRoleSchema = new mongoose.Schema({
  guildId: String,
  level: Number,
  roleId: String,
});
LevelRoleSchema.index({ guildId: 1, level: 1 }, { unique: true });
const LevelRole = mongoose.model('LevelRole', LevelRoleSchema);

const ControllerSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
});
ControllerSchema.index({ guildId: 1, userId: 1 }, { unique: true });
const Controller = mongoose.model('Controller', ControllerSchema);

const NameCooldownSchema = new mongoose.Schema({
  userId: { type: String, unique: true, required: true },
  timestamp: { type: Date, default: Date.now },
});
const NameCooldown = mongoose.model('NameCooldown', NameCooldownSchema);

// ============================================================
// ========== دوال مساعدة ==========
// ============================================================

async function getGuildConfig(guildId) {
  let config = await Config.findOne({ guildId });
  if (!config) {
    config = new Config({ guildId });
    await config.save();
  }
  return config;
}
async function updateGuildConfig(guildId, data) {
  await Config.findOneAndUpdate({ guildId }, data, { upsert: true, new: true });
}
async function getUser(guildId, userId) {
  let user = await User.findOne({ guildId, userId });
  if (!user) {
    user = new User({ guildId, userId });
    await user.save();
  }
  return user;
}

// الصلاحيات الأساسية
async function isController(userId, guildId) {
  if (OWNER_ID && userId === OWNER_ID) return true;
  const c = await Controller.findOne({ guildId, userId });
  return !!c;
}
async function hasPermission(member, guildId) {
  if (!member) return false;
  if (OWNER_ID && member.id === OWNER_ID) return true;
  return await isController(member.id, guildId);
}
async function isSeniorAdmin(member, guildId) {
  if (member.id === OWNER_ID) return true;
  const config = await getGuildConfig(guildId);
  if (!config.seniorAdminRole) return false;
  return member.roles.cache.has(config.seniorAdminRole);
}
async function isJuniorAdmin(member, guildId) {
  if (member.id === OWNER_ID) return true;
  const config = await getGuildConfig(guildId);
  if (!config.juniorAdminRole) return false;
  return member.roles.cache.has(config.juniorAdminRole) || await isSeniorAdmin(member, guildId);
}

// التذاكر
async function getTicketSettings(guildId) {
  let settings = await TicketSettings.findOne({ guildId });
  if (!settings) {
    settings = new TicketSettings({ guildId });
    await settings.save();
  }
  return settings;
}
async function saveTicketSettings(guildId, data) {
  await TicketSettings.findOneAndUpdate({ guildId }, data, { upsert: true });
}

// سجلات التذاكر
async function createTicketLog(guildId, channelId, userId, section) {
  const log = new TicketLog({ guildId, channelId, userId, section });
  await log.save();
  return log;
}
async function getTicketLogByChannel(channelId) {
  return await TicketLog.findOne({ channelId });
}
async function updateTicketLog(channelId, data) {
  await TicketLog.findOneAndUpdate({ channelId }, data, { upsert: true });
}
async function deleteTicketLog(channelId) {
  await TicketLog.deleteOne({ channelId });
}

// الأوتو لاين
async function getAutoLine(guildId, channelId) {
  let auto = await AutoLine.findOne({ guildId, channelId });
  if (!auto) {
    auto = new AutoLine({ guildId, channelId });
    await auto.save();
  }
  return auto;
}
async function setAutoLine(guildId, channelId, data) {
  await AutoLine.findOneAndUpdate({ guildId, channelId }, data, { upsert: true });
}
async function deleteAutoLine(guildId, channelId) {
  await AutoLine.deleteOne({ guildId, channelId });
}

// الردود التلقائية
async function getAutoReplies(guildId) { return await AutoReply.find({ guildId }); }
async function addAutoReply(guildId, keyword, reply, image = null) {
  const existing = await AutoReply.findOne({ guildId, keyword: { $regex: new RegExp(`^${keyword}$`, 'i') } });
  if (existing) {
    existing.reply = reply;
    existing.image = image;
    await existing.save();
    return false;
  }
  const newReply = new AutoReply({ guildId, keyword, reply, image });
  await newReply.save();
  return true;
}
async function removeAutoReply(guildId, keyword) {
  const result = await AutoReply.deleteOne({ guildId, keyword: { $regex: new RegExp(`^${keyword}$`, 'i') } });
  return result.deletedCount > 0;
}
async function findAutoReply(guildId, content) {
  const replies = await AutoReply.find({ guildId });
  return replies.find(r => content.toLowerCase().includes(r.keyword.toLowerCase()));
}

// التحذيرات
async function getWarns(guildId, userId) { return await Warn.find({ guildId, userId }); }
async function addWarn(guildId, userId, reason, moderator) {
  const warn = new Warn({ guildId, userId, reason, moderator });
  await warn.save();
  return await Warn.countDocuments({ guildId, userId });
}
async function clearWarns(guildId, userId) { await Warn.deleteMany({ guildId, userId }); }

// المتحكمين
async function addController(guildId, userId) {
  const existing = await Controller.findOne({ guildId, userId });
  if (!existing) {
    const c = new Controller({ guildId, userId });
    await c.save();
    return true;
  }
  return false;
}
async function removeController(guildId, userId) {
  const result = await Controller.deleteOne({ guildId, userId });
  return result.deletedCount > 0;
}
async function getControllers(guildId) {
  const docs = await Controller.find({ guildId });
  return docs.map(d => d.userId);
}

// كول داون تغيير الاسم
async function setNameCooldown(userId) {
  await NameCooldown.findOneAndUpdate({ userId }, { timestamp: new Date() }, { upsert: true });
}
async function getNameCooldown(userId) {
  const cd = await NameCooldown.findOne({ userId });
  return cd ? cd.timestamp : null;
}

// المتجر
async function getStoreItems(guildId) { return await StoreItem.find({ guildId }); }
async function addStoreItem(guildId, roleId, price, description) {
  const item = new StoreItem({ guildId, roleId, price, description });
  await item.save();
  return item;
}
async function removeStoreItem(guildId, itemId) {
  return await StoreItem.deleteOne({ guildId, _id: itemId });
}

// طلبات الشراء
async function createPendingPurchase(guildId, userId, roleId, roleName, price) {
  const purchase = new PendingPurchase({ guildId, userId, roleId, roleName, price });
  await purchase.save();
  return purchase;
}
async function getPendingPurchaseByUser(guildId, userId) {
  return await PendingPurchase.findOne({ guildId, userId, status: 'pending' }).sort({ createdAt: -1 });
}
async function completePendingPurchase(guildId, userId) {
  const purchase = await PendingPurchase.findOne({ guildId, userId, status: 'pending' }).sort({ createdAt: -1 });
  if (!purchase) return null;
  purchase.status = 'completed';
  await purchase.save();
  return purchase;
}

// المودات
async function getModLogin(guildId, userId) { return await ModLogin.findOne({ guildId, userId }); }
async function setModLogin(guildId, userId, password) {
  await ModLogin.findOneAndUpdate({ guildId, userId }, { modPassword: password, lastLogin: new Date() }, { upsert: true });
}

// سجلات عامة
async function logToChannel(guildId, data) {
  try {
    const config = await getGuildConfig(guildId);
    if (!config.logChannel) return;
    const channel = client.channels.cache.get(config.logChannel);
    if (!channel) return;
    const embed = new EmbedBuilder()
      .setColor(data.color || 0x2b2d31)
      .setTitle(data.title || '📋 سجل')
      .setDescription(data.description || '')
      .setTimestamp();
    if (data.footer) embed.setFooter({ text: data.footer });
    if (data.fields) for (const f of data.fields) embed.addFields(f);
    if (data.thumbnail) embed.setThumbnail(data.thumbnail);
    if (data.image) embed.setImage(data.image);
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('❌ خطأ في اللوق:', error);
  }
}

// الصورة العامة
function getGeneralImage(guild, config) {
  if (config.generalImage) return config.generalImage;
  if (config.bannerImage) return config.bannerImage;
  if (guild.iconURL()) return guild.iconURL({ size: 1024 });
  return null;
}

// ============================================================
// ========== العميل ==========
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
  ],
});

// جلسات الصوت (لتتبع وقت المستخدمين)
const voiceSessions = new Map();

client.once('ready', () => {
  console.log(`✅ البوت جاهز باسم ${client.user.tag}`);
  console.log(`👑 صاحب البوت: ${OWNER_ID}`);
  client.user.setActivity('The Kingdom Never Falls.', { type: ActivityType.Watching });

  // ====== نظام منح 1 KL لكل دقيقة في الفويس (خاص) ======
  setInterval(async () => {
    const now = Date.now();
    for (const [key, joinTime] of voiceSessions) {
      const [guildId, userId] = key.split('-');
      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) continue;
      if (!member.voice.channel) {
        voiceSessions.delete(key);
        continue;
      }
      const elapsed = now - joinTime;
      if (elapsed >= 60000) {
        const user = await getUser(guildId, userId);
        user.kl += 1;
        await user.save();
        voiceSessions.set(key, now);
        try {
          const dmEmbed = new EmbedBuilder()
            .setColor(0x2b2d31)
            .setTitle('🎧 مكافأة الفويس')
            .setDescription(`حصلت على **1 KL** مقابل قضائك دقيقة في الفويس.`)
            .setFooter({ text: 'استمر في التفاعل لكسب المزيد!' })
            .setTimestamp();
          await member.send({ embeds: [dmEmbed] });
        } catch (e) {}
      }
    }
  }, 60000);
});

// ============================================================
// ========== الترحيب ==========
// ============================================================

function drawDefaultBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#2b2d31');
  gradient.addColorStop(0.5, '#1e1e1e');
  gradient.addColorStop(1, '#2b2d31');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

async function generateWelcomeImage(member, memberCount, background = null) {
  const width = 1200, height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (background) {
    if (background.match(/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)/i)) {
      try { const bgImage = await loadImage(background); ctx.drawImage(bgImage, 0, 0, width, height); }
      catch (e) { drawDefaultBackground(ctx, width, height); }
    } else { ctx.fillStyle = background; ctx.fillRect(0, 0, width, height); }
  } else { drawDefaultBackground(ctx, width, height); }

  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 6;
  const borderRadius = 20, x = 30, y = 30, w = width - 60, h = height - 60;
  ctx.beginPath();
  ctx.moveTo(x + borderRadius, y);
  ctx.lineTo(x + w - borderRadius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + borderRadius);
  ctx.lineTo(x + w, y + h - borderRadius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - borderRadius, y + h);
  ctx.lineTo(x + borderRadius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - borderRadius);
  ctx.lineTo(x, y + borderRadius);
  ctx.quadraticCurveTo(x, y, x + borderRadius, y);
  ctx.closePath();
  ctx.stroke();

  const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
  const avatar = await loadImage(avatarURL);
  const radius = 140, centerX = 250, centerY = 300;
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 6, 0, Math.PI * 2);
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 10;
  ctx.font = 'bold 52px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 15;
  ctx.fillText(`مرحباً ${member.user.username}`, 460, 190);
  ctx.font = '36px Arial';
  ctx.fillStyle = '#cccccc';
  ctx.shadowBlur = 10;
  ctx.fillText(`العضو رقم #${memberCount}`, 460, 270);
  ctx.font = '28px Arial';
  ctx.fillStyle = '#aaaaaa';
  ctx.shadowBlur = 5;
  ctx.fillText('نتمنى لك قضاء وقت ممتع في السيرفر! 🎉', 460, 340);
  ctx.textAlign = 'right';
  ctx.font = '22px Arial';
  ctx.fillStyle = '#999999';
  ctx.shadowBlur = 0;
  ctx.fillText('مرحباً بك', width - 50, height - 40);
  ctx.shadowBlur = 0;

  return canvas.toBuffer('image/png');
}

client.on('guildMemberAdd', async (member) => {
  try {
    const config = await getGuildConfig(member.guild.id);
    if (!config.welcomeChannel) return;
    const channel = member.guild.channels.cache.get(config.welcomeChannel);
    if (!channel) return;
    const memberCount = member.guild.memberCount;
    const imageBuffer = await generateWelcomeImage(member, memberCount, config.welcomeBackground);
    const generalImage = getGeneralImage(member.guild, config);
    const embed = new EmbedBuilder()
      .setTitle(config.welcomeTitle || '🔥 مرحباً بك في المجتمع')
      .setDescription(config.welcomeMessage || `أهلاً ${member} في السيرفر!`)
      .setColor(0x2b2d31)
      .setImage('attachment://welcome.png')
      .setTimestamp();
    if (config.welcomeImage) embed.setThumbnail(config.welcomeImage);
    if (generalImage) embed.setFooter({ text: 'نتمنى لك قضاء وقت ممتع!', iconURL: generalImage });
    await channel.send({ content: `${member}`, embeds: [embed], files: [{ attachment: imageBuffer, name: 'welcome.png' }] });
    if (config.joinRole) {
      const role = member.guild.roles.cache.get(config.joinRole);
      if (role) await member.roles.add(role).catch(() => {});
    }
  } catch (error) { console.error('❌ خطأ في الترحيب:', error); }
});

client.on('guildMemberRemove', async (member) => {
  try {
    const config = await getGuildConfig(member.guild.id);
    if (!config.logChannel) return;
    const channel = member.guild.channels.cache.get(config.logChannel);
    if (!channel) return;
    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle('🚫 عضو غادر')
      .setDescription(`**${member.user.tag}** غادر السيرفر.`)
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();
    await channel.send({ embeds: [embed] });
  } catch (error) { console.error('❌ خطأ في مغادرة العضو:', error); }
});

client.on('messageDelete', async (message) => {
  if (!message.guild || message.author?.bot) return;
  try {
    const config = await getGuildConfig(message.guild.id);
    if (!config.logChannel) return;
    const channel = message.guild.channels.cache.get(config.logChannel);
    if (!channel) return;
    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle('🗑️ حذف رسالة')
      .setDescription(`**المستخدم:** ${message.author?.tag || 'غير معروف'}\n**القناة:** ${message.channel.name}\n**المحتوى:** ${message.content || 'غير مرئي'}`)
      .setTimestamp();
    await channel.send({ embeds: [embed] });
  } catch (error) { console.error('❌ خطأ في حذف الرسالة:', error); }
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (!oldMessage.guild || oldMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;
  try {
    const config = await getGuildConfig(oldMessage.guild.id);
    if (!config.logChannel) return;
    const channel = oldMessage.guild.channels.cache.get(config.logChannel);
    if (!channel) return;
    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle('✏️ تعديل رسالة')
      .setDescription(`**المستخدم:** ${oldMessage.author?.tag || 'غير معروف'}\n**القناة:** ${oldMessage.channel.name}`)
      .addFields(
        { name: '📜 النص القديم', value: oldMessage.content || 'فارغ' },
        { name: '📝 النص الجديد', value: newMessage.content || 'فارغ' }
      )
      .setTimestamp();
    await channel.send({ embeds: [embed] });
  } catch (error) { console.error('❌ خطأ في تعديل الرسالة:', error); }
});

// ============================================================
// ========== نظام المستويات والأوتو لاين ومكافأة الرسائل ==========
// ============================================================

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  if (message.content.startsWith('!')) return;

  const guildId = message.guild.id;
  const userId = message.author.id;
  const config = await getGuildConfig(guildId);

  if (!config.levelChannelId || message.channel.id === config.levelChannelId) {
    const user = await getUser(guildId, userId);
    user.messages += 1;
    const gain = Math.floor(Math.random() * 15) + 5;
    user.xp += gain;
    let currentLevel = user.level;
    let requiredXP = (currentLevel + 1) * 100;

    // ====== مكافأة كل 30 رسالة (خاص) ======
    if (user.messages % 30 === 0 && user.messages > 0) {
      user.kl += 15;
      await user.save();
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0x2b2d31)
          .setTitle('📝 مكافأة الرسائل')
          .setDescription(`وصلت إلى **${user.messages}** رسالة!\nحصلت على **15 KL** 🎉`)
          .setFooter({ text: 'استمر في الكتابة!' })
          .setTimestamp();
        await message.author.send({ embeds: [dmEmbed] });
      } catch (e) {}
    }

    if (user.xp >= requiredXP) {
      user.level += 1;
      user.xp = 0;
      await user.save();

      const levelChannelId = config.levelChannelId || message.channel.id;
      const levelChannel = message.guild.channels.cache.get(levelChannelId);
      if (levelChannel) {
        const embed = new EmbedBuilder()
          .setTitle('🎉 مستوى جديد!')
          .setDescription(`${message.author} وصل إلى المستوى **${user.level}**!`)
          .setColor(0x2b2d31)
          .setTimestamp();
        const generalImage = getGeneralImage(message.guild, config);
        if (generalImage) embed.setThumbnail(generalImage);
        await levelChannel.send({ embeds: [embed] });
      }

      const levelRole = await LevelRole.findOne({ guildId, level: user.level });
      if (levelRole) {
        const role = message.guild.roles.cache.get(levelRole.roleId);
        if (role) {
          const member = await message.guild.members.fetch(userId).catch(() => null);
          if (member) await member.roles.add(role).catch(() => {});
        }
      }
    } else {
      await user.save();
    }
  }

  // الأوتو لاين
  const auto = await AutoLine.findOne({ guildId, channelId: message.channel.id });
  if (auto && auto.enabled && (auto.text || auto.image)) {
    const channel = client.channels.cache.get(message.channel.id);
    if (channel) {
      try {
        if (auto.text && auto.image) {
          const embed = new EmbedBuilder().setDescription(auto.text).setColor(0x2b2d31).setImage(auto.image).setTimestamp();
          await channel.send({ embeds: [embed] });
        } else if (auto.image) {
          const embed = new EmbedBuilder().setColor(0x2b2d31).setImage(auto.image).setTimestamp();
          await channel.send({ embeds: [embed] });
        } else if (auto.text) {
          await channel.send(auto.text);
        }
      } catch (e) {}
      return;
    }
  }

  // الردود التلقائية
  const autoReply = await findAutoReply(guildId, message.content);
  if (autoReply) {
    try {
      if (autoReply.image) {
        const embed = new EmbedBuilder().setDescription(autoReply.reply).setColor(0x2b2d31).setImage(autoReply.image).setTimestamp();
        await message.reply({ embeds: [embed] });
      } else {
        await message.reply(autoReply.reply);
      }
    } catch (e) {
      await message.channel.send(autoReply.reply).catch(() => {});
    }
  }
});

// ============================================================
// ========== نظام الصوت ==========
// ============================================================

client.on('voiceStateUpdate', async (oldState, newState) => {
  const userId = newState.member.id;
  const guildId = newState.guild.id;

  if (newState.channelId && !oldState.channelId) {
    voiceSessions.set(`${guildId}-${userId}`, Date.now());
  }

  if (!newState.channelId && oldState.channelId) {
    voiceSessions.delete(`${guildId}-${userId}`);
  }
});

// ============================================================
// ========== الأوامر النصية (كاملة) ==========
// ============================================================

function isAdminCommand(cmd) {
  const adminCmds = [
    'حظر', 'طرد', 'كتم', 'فك_كتم', 'تحذير', 'ابطال_تحذيرات',
    'مسح', 'قفل', 'فتح', 'نقل_كل', 'طرد_صوتي', 'كتم_صوتي', 'فك_كتم_صوتي',
    'انشاء_قناة', 'حذف_قناة', 'تغيير_اسم_قناة',
    'تثبيت', 'الغاء_تثبيت', 'اعطاء_رتبة', 'سحب_رتبة', 'اعلان'
  ];
  return adminCmds.includes(cmd);
}

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith('!')) return;
  const args = message.content.slice(1).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  const guildId = message.guild.id;
  const config = await getGuildConfig(guildId);
  const generalImage = getGeneralImage(message.guild, config);

  const deleteDelay = isAdminCommand(cmd) ? 5000 : 0;
  let sentReply = null;

  const deleteAfter = async (replyMsg) => {
    if (deleteDelay === 0) return;
    setTimeout(async () => {
      try { await message.delete(); } catch (e) {}
      if (replyMsg) { try { await replyMsg.delete(); } catch (e) {} }
    }, deleteDelay);
  };

  try {

    // ============================================================
    // == أوامر العملة (KL) ==
    // ============================================================

    if (cmd === 'رصيدي') {
      const user = await getUser(guildId, message.author.id);
      const embed = new EmbedBuilder()
        .setTitle(`💰 رصيد ${message.author.username}`)
        .setDescription(`**KL:** ${user.kl}\n**نقاط إدارية:** ${user.adminPoints}`)
        .setColor(0x2b2d31);
      await message.channel.send({ embeds: [embed] });
      return;
    }

    if (cmd === 'توب') {
      const top = await User.find({ guildId }).sort({ kl: -1 }).limit(10);
      if (!top.length) {
        await message.reply('📭 لا يوجد أي شخص لديه KL حتى الآن.');
        return;
      }
      let desc = '';
      let rank = 1;
      for (const entry of top) {
        const member = message.guild.members.cache.get(entry.userId);
        const name = member ? member.user.username : `مستخدم ${entry.userId}`;
        desc += `**#${rank}** ${name} - \`${entry.kl} KL\`\n`;
        rank++;
      }
      const embed = new EmbedBuilder().setTitle('🏆 ترتيب أغنى 10 أشخاص').setDescription(desc).setColor(0x2b2d31).setTimestamp();
      await message.channel.send({ embeds: [embed] });
      return;
    }

    if (cmd === 'اعطاء_عملات' || cmd === 'اعطاء_عمله') {
      if (!(await hasPermission(message.member, guildId))) {
        await message.reply('❌ تحتاج صلاحية متحكم.');
        return;
      }
      const target = message.mentions.members.first();
      const amount = parseInt(args[0]);
      if (!target || !amount || amount <= 0) {
        await message.reply('⚠️ الاستخدام: `!اعطاء_عملات @شخص <المبلغ>`');
        return;
      }
      if (target.user.bot) {
        await message.reply('❌ لا يمكن إعطاء البوتات.');
        return;
      }
      const user = await getUser(guildId, target.id);
      user.kl += amount;
      await user.save();
      const embed = new EmbedBuilder()
        .setTitle('✅ تم إعطاء العملات')
        .setDescription(`تم إعطاء <@${target.id}> **${amount} KL** بنجاح.\nرصيده الآن: **${user.kl} KL**`)
        .setColor(0x2b2d31);
      await message.channel.send({ embeds: [embed] });
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle('💰 استلام KL')
          .setDescription(`تم إعطاؤك **${amount} KL** في **${message.guild.name}**!\nرصيدك الحالي: **${user.kl} KL**`)
          .setColor(0x2b2d31);
        await target.send({ embeds: [dmEmbed] }).catch(() => {});
      } catch (e) {}
      return;
    }

    if (cmd === 'سحب_عملات' || cmd === 'سحب_عمله') {
      if (!(await hasPermission(message.member, guildId))) {
        await message.reply('❌ تحتاج صلاحية متحكم.');
        return;
      }
      const target = message.mentions.members.first();
      const amount = parseInt(args[0]);
      if (!target || !amount || amount <= 0) {
        await message.reply('⚠️ الاستخدام: `!سحب_عملات @شخص <المبلغ>`');
        return;
      }
      if (target.user.bot) {
        await message.reply('❌ لا يمكن السحب من البوتات.');
        return;
      }
      const user = await getUser(guildId, target.id);
      if (user.kl < amount) {
        await message.reply(`⚠️ رصيده غير كافٍ. لديه **${user.kl} KL** فقط.`);
        return;
      }
      user.kl -= amount;
      await user.save();
      const embed = new EmbedBuilder()
        .setTitle('✅ تم سحب العملات')
        .setDescription(`تم سحب **${amount} KL** من <@${target.id}>.\nرصيده الآن: **${user.kl} KL**`)
        .setColor(0x2b2d31);
      await message.channel.send({ embeds: [embed] });
      return;
    }

    if (cmd === 'مصرف') {
      const user = await getUser(guildId, message.author.id);
      const now = Date.now();
      const last = user.lastDaily ? user.lastDaily.getTime() : 0;
      if (now - last < 24 * 60 * 60 * 1000) {
        const remaining = 24 * 60 * 60 * 1000 - (now - last);
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        await message.reply(`⏳ يمكنك الحصول على الراتب بعد ${hours} ساعة.`);
        return;
      }
      const salary = config.dailySalary || 5;
      user.kl += salary;
      user.lastDaily = new Date();
      await user.save();
      await message.reply(`✅ تم إضافة **${salary} KL** كراتب يومي. رصيدك الآن: **${user.kl} KL**`);
      return;
    }

    // ============================================================
    // == لوحة المهام ==
    // ============================================================

    if (cmd === 'لوحة_المهام') {
      if (!(await isSeniorAdmin(message.member, guildId))) {
        return message.reply('❌ هذا الأمر للإداريين العلويين فقط.');
      }
      const embed = new EmbedBuilder()
        .setTitle('📋 لوحة المهام الإدارية')
        .setDescription('اختر الإجراء المناسب من الأزرار أدناه.')
        .setColor(0x2b2d31);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('task_create').setLabel('➕ إضافة مهمة').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('task_list').setLabel('📋 عرض المهام').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('task_complete').setLabel('✅ إنهاء مهمة').setStyle(ButtonStyle.Success)
      );
      await message.channel.send({ embeds: [embed], components: [row] });
      return;
    }

    // ============================================================
    // == الإجازات ==
    // ============================================================

    if (cmd === 'بانل_اجازات' || cmd === 'لوحة_اجازات') {
      if (!(await hasPermission(message.member, guildId))) {
        return message.reply('❌ تحتاج صلاحية متحكم.');
      }
      const embed = new EmbedBuilder()
        .setTitle('📅 طلب إجازة')
        .setDescription('اضغط على الزر أدناه لتقديم طلب إجازة.')
        .setColor(0x2b2d31)
        .setTimestamp();
      if (config.leavePanelImage) {
        embed.setImage(config.leavePanelImage);
      }
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('open_leave_modal')
          .setLabel('📝 طلب إجازة')
          .setStyle(ButtonStyle.Primary)
      );
      await message.channel.send({ embeds: [embed], components: [row] });
      await message.reply('✅ تم إنشاء بانل طلب الإجازات.');
      return;
    }

    if (cmd === 'طلب_اجازة') {
      if (!(await isJuniorAdmin(message.member, guildId))) {
        return message.reply('❌ هذا الأمر للإداريين فقط.');
      }
      const modal = new ModalBuilder()
        .setCustomId('leave_modal')
        .setTitle('📝 طلب إجازة')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('leave_reason').setLabel('سبب الإجازة').setStyle(TextInputStyle.Paragraph).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('leave_duration').setLabel('عدد الأيام').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('مثال: 5')
          )
        );
      await message.showModal(modal);
      return;
    }

    if (cmd === 'الموافقة_على_الاجازات') {
      if (!config.leaveManagerRole || !message.member.roles.cache.has(config.leaveManagerRole)) {
        return message.reply('❌ ليس لديك الصلاحية للموافقة على الإجازات.');
      }
      const pending = await LeaveRequest.find({ guildId, status: 'pending' });
      if (!pending.length) return message.reply('📭 لا توجد طلبات إجازة معلقة.');
      let desc = '';
      for (const req of pending) {
        const member = await message.guild.members.fetch(req.userId).catch(() => null);
        const name = member ? member.user.username : 'مستخدم غير معروف';
        desc += `**${name}** - ${req.reason} (${req.duration} يوم)\n`;
      }
      const embed = new EmbedBuilder().setTitle('📋 طلبات الإجازات المعلقة').setDescription(desc).setColor(0x2b2d31);
      await message.channel.send({ embeds: [embed] });
      return;
    }

    // ============================================================
    // == المتجر ==
    // ============================================================

    if (cmd === 'بانل_اضافة_منتج') {
      if (!(await hasPermission(message.member, guildId))) {
        return message.reply('❌ تحتاج صلاحية متحكم.');
      }
      const embed = new EmbedBuilder()
        .setTitle('➕ لوحة إضافة منتج')
        .setDescription('اضغط على الزر أدناه لإضافة منتج جديد إلى المتجر.')
        .setColor(0x2b2d31)
        .setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('open_add_product_modal')
          .setLabel('➕ إضافة منتج')
          .setStyle(ButtonStyle.Primary)
      );
      await message.channel.send({ embeds: [embed], components: [row] });
      return;
    }

    if (cmd === 'متجر') {
      const items = await StoreItem.find({ guildId });
      if (!items.length) {
        return message.reply('📭 لا توجد منتجات في المتجر حالياً.');
      }
      
      const embed = new EmbedBuilder()
        .setTitle('🛒 متجر الرتب')
        .setDescription('اختر الرتبة التي تريد شراءها.\nسيتم إرسال طلبك إلى البائعين للموافقة.')
        .setColor(0x2b2d31);
      
      if (config.storePanelImage) {
        embed.setImage(config.storePanelImage);
      }
      
      const options = items.map(item => {
        const role = message.guild.roles.cache.get(item.roleId);
        return {
          label: role ? role.name : 'رتبة غير موجودة',
          value: item._id.toString(),
          description: `${item.price} KL`,
          emoji: '🛒',
        };
      });
      
      const chunkSize = 25;
      const rows = [];
      for (let i = 0; i < options.length; i += chunkSize) {
        const chunk = options.slice(i, i + chunkSize);
        rows.push(
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`store_buy_${i}`)
              .setPlaceholder(`اختر رتبة (${i+1}-${Math.min(i+chunkSize, options.length)})`)
              .addOptions(chunk)
          )
        );
      }
      
      await message.channel.send({ embeds: [embed], components: rows });
      return;
    }

    // ============================================================
    // == تسجيل الدخول للمودات ==
    // ============================================================

    if (cmd === 'تسجيل_الدخول') {
      const modal = new ModalBuilder()
        .setCustomId('mod_login_modal')
        .setTitle('🔐 تسجيل دخول المودات')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('mod_password').setLabel('كلمة المرور').setStyle(TextInputStyle.Short).setRequired(true)
          )
        );
      await message.showModal(modal);
      return;
    }

    // ============================================================
    // == أمر لوق التذكرة ==
    // ============================================================

    if (cmd === 'لوق_تذكرة' || cmd === 'لوق' || cmd === 'تقرير') {
      if (!message.channel.name.startsWith('تذكرة-')) {
        return message.reply('❌ هذا الأمر يُستخدم فقط داخل قنوات التذاكر.');
      }
      const log = await getTicketLogByChannel(message.channel.id);
      if (!log) {
        return message.reply('❌ لا توجد سجلات لهذه التذكرة.');
      }

      const creator = await message.guild.members.fetch(log.userId).catch(() => null);
      const claimedBy = log.claimedBy ? await message.guild.members.fetch(log.claimedBy).catch(() => null) : null;
      const addedMembersList = log.addedMembers || [];
      const addedMembersMentions = addedMembersList.length ? addedMembersList.map(id => `<@${id}>`).join(', ') : 'لا يوجد';

      const embed = new EmbedBuilder()
        .setTitle('📋 تقرير التذكرة')
        .setColor(0x2b2d31)
        .addFields(
          { name: '🆔 معرف القناة', value: `#${message.channel.name}`, inline: true },
          { name: '👤 منشئ التذكرة', value: creator ? creator.toString() : 'غير معروف', inline: true },
          { name: '📂 القسم', value: log.section || 'غير محدد', inline: true },
          { name: '📅 وقت الفتح', value: `<t:${Math.floor(log.createdAt.getTime() / 1000)}:F>`, inline: true },
          { name: '📌 الحالة', value: log.status === 'open' ? '🟢 مفتوحة' : log.status === 'claimed' ? '🟡 مستلمة' : '🔴 مغلقة', inline: true },
          { name: '📥 استلمها', value: claimedBy ? claimedBy.toString() : 'لم تستلم بعد', inline: true },
          { name: '👥 الأعضاء المضافين', value: addedMembersMentions, inline: false },
          { name: '⏱️ وقت الإغلاق', value: log.closedAt ? `<t:${Math.floor(log.closedAt.getTime() / 1000)}:F>` : 'لم تغلق بعد', inline: true }
        )
        .setTimestamp();

      // إرسال إلى قناة السجلات الخاصة بالتذاكر
      const logChannelId = config.ticketLogChannel;
      if (logChannelId) {
        const logChannel = message.guild.channels.cache.get(logChannelId);
        if (logChannel) {
          await logChannel.send({ embeds: [embed] });
        }
      }

      // إرسال للمنشئ في الخاص
      if (creator) {
        try {
          await creator.send({ embeds: [embed] });
        } catch (e) {}
      }

      await message.reply({ content: '✅ تم إرسال تقرير التذكرة إلى قناة السجلات وإلى منشئ التذكرة.', ephemeral: true });
      return;
    }

    // ============================================================
    // == تعيين الإعدادات ==
    // ============================================================

    if (cmd === 'تعيين') {
      if (message.author.id !== OWNER_ID) return message.reply('❌ هذا الأمر للمالك فقط.');

      const sub = args[0]?.toLowerCase();
      const value = args.slice(1).join(' ');

      if (!sub) {
        const embed = new EmbedBuilder()
          .setTitle('⚙️ أوامر الإعدادات')
          .setColor(0x2b2d31)
          .addFields(
            { name: '👋 الترحيب', value: '`ترحيب #قناة`، `رسالة_ترحيب نص`، `صورة_ترحيب رابط`، `عنوان_ترحيب نص`، `خلفية_ترحيب [لون/رابط]`', inline: false },
            { name: '📋 اللوق', value: '`سجلات #قناة`' },
            { name: '📋 سجلات التذاكر', value: '`قناة_سجلات_تذاكر #قناة`' },
            { name: '📊 المستويات', value: '`روم_ليفل #قناة`' },
            { name: '🤖 الأوتو لاين', value: '`اوتر_لاين #روم [نص]`، `صورة_اوترلاين #روم رابط`، `تفعيل_اوترلاين #روم`، `تعطيل_اوترلاين #روم`، `حذف_اوترلاين #روم`' },
            { name: '🎫 التذاكر', value: '`تذكرة` (لإدارة الأقسام)' },
            { name: '🔔 رتب الإشعارات', value: '`صورة_رتب رابط`' },
            { name: '🖼️ عام', value: '`صورة_بنر رابط`، `صورة_عامة رابط`' },
            { name: '🚪 دور الدخول', value: '`دور_دخول @دور`' },
            { name: '💡 الاقتراحات', value: '`قناة_اقتراح #قناة`، `عنوان_اقتراح نص`، `وصف_اقتراح نص`، `لون_اقتراح #هيكس`، `صورة_اقتراح رابط`' },
            { name: '👑 الإدارة', value: '`رتبة_اداري_علوي @رتبة`، `رتبة_اداري_صغري @رتبة`، `رتبة_مسؤول_اجازات @رتبة`' },
            { name: '💰 المالية', value: '`نقاط_المهمة [عدد]`، `راتب_يومي [عدد]`، `نقاط_الترقية [عدد]`' },
            { name: '🛒 المتجر', value: '`اضافة_منتج @رتبة السعر [الوصف]`، `حذف_منتج [معرف]`، `صورة_المتجر [رابط]`، `قناة_المتجر #قناة`' },
            { name: '📌 القنوات', value: '`قناة_المهام #قناة`، `قناة_الاجازات #قناة`، `قناة_المودات #قناة`' },
            { name: '🖼️ بانل الإجازات', value: '`صورة_بانل_اجازات [رابط]`' },
            { name: '👤 رتبة البائع', value: '`رتبة_بائع @رتبة`' }
          )
          .setFooter({ text: 'الصيغة: !تعيين [الخيار] [القيمة]' });
        if (generalImage) embed.setImage(generalImage);
        await message.channel.send({ embeds: [embed] });
        return;
      }

      // ---- قناة سجلات التذاكر ----
      if (sub === 'قناة_سجلات_تذاكر' || sub === 'سجلات_تذاكر') {
        const channel = message.mentions.channels.first();
        if (!channel) {
          await updateGuildConfig(guildId, { ticketLogChannel: null });
          await message.reply('✅ تم إلغاء تعيين قناة سجلات التذاكر.');
          return;
        }
        await updateGuildConfig(guildId, { ticketLogChannel: channel.id });
        await logToChannel(guildId, { title: '⚙️ إعدادات', color: 0x2b2d31, description: `**${message.author}** عيّن قناة سجلات التذاكر إلى ${channel}` });
        await message.reply(`✅ تم تعيين قناة سجلات التذاكر إلى ${channel}`);
        return;
      }

      // ---- باقي الإعدادات ----
      if (sub === 'صورة_المتجر') {
        if (!value) {
          await updateGuildConfig(guildId, { storePanelImage: null });
          await logToChannel(guildId, { title: '⚙️ إعدادات', color: 0x2b2d31, description: `**${message.author}** ألغى صورة المتجر.` });
          await message.reply('✅ تم إلغاء صورة المتجر.');
          return;
        }
        const isUrl = /^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)/i.test(value);
        if (!isUrl) { await message.reply('⚠️ الرابط غير صالح.'); return; }
        await updateGuildConfig(guildId, { storePanelImage: value });
        await logToChannel(guildId, { title: '⚙️ إعدادات', color: 0x2b2d31, description: `**${message.author}** عيّن صورة المتجر: ${value}` });
        await message.reply(`✅ تم تعيين صورة المتجر: ${value}`);
        return;
      }

      if (sub === 'قناة_المتجر') {
        const channel = message.mentions.channels.first();
        if (!channel) {
          await updateGuildConfig(guildId, { storeChannel: null });
          await message.reply('✅ تم إلغاء تعيين قناة المتجر.');
          return;
        }
        await updateGuildConfig(guildId, { storeChannel: channel.id });
        await logToChannel(guildId, { title: '⚙️ إعدادات', color: 0x2b2d31, description: `**${message.author}** عيّن قناة المتجر إلى ${channel}` });
        await message.reply(`✅ تم تعيين قناة المتجر إلى ${channel}`);
        return;
      }

      if (sub === 'رتبة_بائع') {
        const role = message.mentions.roles.first();
        if (!role) { await message.reply('⚠️ منشن الرتبة.'); return; }
        await updateGuildConfig(guildId, { sellerRole: role.id });
        await message.reply(`✅ تم تعيين رتبة البائع: ${role}`);
        return;
      }

      if (sub === 'ترحيب') {
        const channel = message.mentions.channels.first();
        if (!channel) {
          await updateGuildConfig(guildId, { welcomeChannel: null });
          await message.reply('✅ تم إلغاء تحديد قناة الترحيب.');
          return;
        }
        await updateGuildConfig(guildId, { welcomeChannel: channel.id });
        await message.reply(`✅ تم تعيين قناة الترحيب إلى ${channel}`);
        return;
      }

      if (sub === 'رسالة_ترحيب') {
        if (!value) { await message.reply('⚠️ أدخل نص الترحيب الجديد.'); return; }
        await updateGuildConfig(guildId, { welcomeMessage: value });
        await message.reply(`✅ تم تعيين نص الترحيب:\n${value}`);
        return;
      }

      if (sub === 'صورة_ترحيب') {
        if (!value) {
          await updateGuildConfig(guildId, { welcomeImage: null });
          await message.reply('✅ تم إلغاء صورة الترحيب.');
          return;
        }
        await updateGuildConfig(guildId, { welcomeImage: value });
        await message.reply(`✅ تم تعيين صورة الترحيب: ${value}`);
        return;
      }

      if (sub === 'عنوان_ترحيب') {
        if (!value) { await message.reply('⚠️ أدخل العنوان الجديد.'); return; }
        await updateGuildConfig(guildId, { welcomeTitle: value });
        await message.reply(`✅ تم تعيين عنوان الترحيب: "${value}"`);
        return;
      }

      if (sub === 'خلفية_ترحيب') {
        if (!value) {
          await updateGuildConfig(guildId, { welcomeBackground: null });
          await message.reply('✅ تم إلغاء خلفية الترحيب.');
          return;
        }
        const isHex = /^#[0-9a-fA-F]{6}$/.test(value);
        const isUrl = /^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)/i.test(value);
        if (!isHex && !isUrl) { await message.reply('⚠️ أدخل لوناً صحيحاً بصيغة Hex أو رابط صورة.'); return; }
        await updateGuildConfig(guildId, { welcomeBackground: value });
        await message.reply(`✅ تم تعيين خلفية الترحيب: ${value}`);
        return;
      }

      if (sub === 'سجلات') {
        const channel = message.mentions.channels.first();
        if (!channel) {
          await updateGuildConfig(guildId, { logChannel: null });
          await message.reply('✅ تم إلغاء تعيين قناة اللوق.');
          return;
        }
        await updateGuildConfig(guildId, { logChannel: channel.id });
        await message.reply(`✅ تم تعيين قناة اللوق إلى ${channel}`);
        return;
      }

      if (sub === 'روم_ليفل') {
        const channel = message.mentions.channels.first();
        if (!channel) {
          await updateGuildConfig(guildId, { levelChannelId: null });
          await message.reply('✅ تم إلغاء تحديد قناة الليفل.');
          return;
        }
        await updateGuildConfig(guildId, { levelChannelId: channel.id });
        await message.reply(`✅ تم تعيين قناة الليفل إلى ${channel}`);
        return;
      }

      if (sub === 'اوتر_لاين') {
        const channel = message.mentions.channels.first();
        if (!channel) { await message.reply('⚠️ منشن الروم.'); return; }
        const text = args.slice(2).join(' ');
        await setAutoLine(guildId, channel.id, { text: text || null, enabled: true });
        const embed = new EmbedBuilder()
          .setTitle('✅ تم تعيين الأوتو لاين')
          .setColor(0x2b2d31)
          .setDescription(`**الروم:** ${channel}${text ? `\n**النص:** ${text}` : ''}`);
        await message.channel.send({ embeds: [embed] });
        return;
      }

      if (sub === 'صورة_اوترلاين') {
        const channel = message.mentions.channels.first();
        if (!channel) { await message.reply('⚠️ منشن الروم.'); return; }
        const imageUrl = args.slice(2).join(' ');
        if (!imageUrl) {
          await setAutoLine(guildId, channel.id, { image: null });
          await message.reply(`✅ تم إزالة صورة الأوتو لاين من ${channel}`);
          return;
        }
        await setAutoLine(guildId, channel.id, { image: imageUrl });
        const embed = new EmbedBuilder()
          .setTitle('✅ تم تعيين صورة الأوتو لاين')
          .setColor(0x2b2d31)
          .setDescription(`**الروم:** ${channel}\n[رابط الصورة](${imageUrl})`)
          .setImage(imageUrl);
        await message.channel.send({ embeds: [embed] });
        return;
      }

      if (sub === 'تفعيل_اوترلاين') {
        const channel = message.mentions.channels.first();
        if (!channel) { await message.reply('⚠️ منشن الروم.'); return; }
        await setAutoLine(guildId, channel.id, { enabled: true });
        await message.reply(`✅ تم تفعيل الأوتو لاين في ${channel}`);
        return;
      }

      if (sub === 'تعطيل_اوترلاين') {
        const channel = message.mentions.channels.first();
        if (!channel) { await message.reply('⚠️ منشن الروم.'); return; }
        await setAutoLine(guildId, channel.id, { enabled: false });
        await message.reply(`✅ تم تعطيل الأوتو لاين في ${channel}`);
        return;
      }

      if (sub === 'حذف_اوترلاين' || sub === 'حذف_اوتر_لاين') {
        const channel = message.mentions.channels.first();
        if (!channel) { await message.reply('⚠️ منشن الروم.'); return; }
        await deleteAutoLine(guildId, channel.id);
        await message.reply(`✅ تم حذف الأوتو لاين من ${channel}`);
        return;
      }

      if (sub === 'دور_دخول') {
        const role = message.mentions.roles.first();
        if (!role) { await message.reply('⚠️ منشن الدور.'); return; }
        await updateGuildConfig(guildId, { joinRole: role.id });
        await message.reply(`✅ تم تعيين دور الدخول إلى ${role}`);
        return;
      }

      if (sub === 'صورة_بانل') {
        if (!value) { await message.reply('⚠️ أدخل رابط الصورة.'); return; }
        await updateGuildConfig(guildId, { ticketPanelImage: value });
        await message.reply(`✅ تم تعيين صورة البانل: ${value}`);
        return;
      }

      if (sub === 'صورة_رتب') {
        if (!value) { await message.reply('⚠️ أدخل رابط الصورة.'); return; }
        await updateGuildConfig(guildId, { rolesImage: value });
        await message.reply(`✅ تم تعيين صورة رتب الإشعارات: ${value}`);
        return;
      }

      if (sub === 'صورة_بنر') {
        if (!value) { await message.reply('⚠️ أدخل رابط الصورة.'); return; }
        await updateGuildConfig(guildId, { bannerImage: value });
        await message.reply(`✅ تم تعيين صورة البنر: ${value}`);
        return;
      }

      if (sub === 'صورة_عامة') {
        if (!value) { await message.reply('⚠️ أدخل رابط الصورة.'); return; }
        await updateGuildConfig(guildId, { generalImage: value });
        await message.reply(`✅ تم تعيين الصورة العامة: ${value}`);
        return;
      }

      if (sub === 'قناة_اقتراح') {
        const channel = message.mentions.channels.first();
        if (!channel) { await message.reply('⚠️ منشن القناة.'); return; }
        await updateGuildConfig(guildId, { suggestionsChannel: channel.id });
        await message.reply(`✅ تم تعيين قناة الاقتراحات إلى ${channel}`);
        return;
      }

      if (sub === 'عنوان_اقتراح') {
        if (!value) { await message.reply('⚠️ أدخل العنوان.'); return; }
        await updateGuildConfig(guildId, { suggestionsTitle: value });
        await message.reply(`✅ تم تعيين عنوان الاقتراحات: "${value}"`);
        return;
      }

      if (sub === 'وصف_اقتراح') {
        if (!value) { await message.reply('⚠️ أدخل الوصف.'); return; }
        await updateGuildConfig(guildId, { suggestionsDescription: value });
        await message.reply(`✅ تم تعيين وصف الاقتراحات:\n${value}`);
        return;
      }

      if (sub === 'لون_اقتراح') {
        if (!value || !value.match(/^#[0-9a-fA-F]{6}$/)) { await message.reply('⚠️ أدخل لوناً صحيحاً بصيغة Hex.'); return; }
        await updateGuildConfig(guildId, { suggestionsColor: value });
        await message.reply(`✅ تم تعيين لون الاقتراحات: ${value}`);
        return;
      }

      if (sub === 'صورة_اقتراح') {
        if (!value) { await message.reply('⚠️ أدخل رابط الصورة.'); return; }
        await updateGuildConfig(guildId, { suggestionsImage: value });
        await message.reply(`✅ تم تعيين صورة الاقتراحات: ${value}`);
        return;
      }

      // التذاكر
      if (sub === 'تذكرة') {
        const settings = await getTicketSettings(guildId);
        const action = args[1]?.toLowerCase();
        const actionValue = args.slice(2).join(' ');

        if (!action) {
          const embed = new EmbedBuilder()
            .setTitle('⚙️ إدارة التذاكر')
            .setColor(0x2b2d31)
            .addFields(
              { name: '➕ إضافة قسم', value: '`!تعيين تذكرة إضافة [الاسم] @دور :ايموجي:`\nمثال: `!تعيين تذكرة إضافة دعم فني @SupportRole 🛠️`' },
              { name: '🎨 تعيين إيموجي لقسم', value: '`!تعيين تذكرة تعيين_ايموجي [الاسم] :ايموجي:`' },
              { name: '➖ حذف قسم', value: '`!تعيين تذكرة حذف [الاسم]`' },
              { name: '📝 تغيير النص', value: '`!تعيين تذكرة نص [النص]`' },
              { name: '🖼️ تغيير الصورة', value: '`!تعيين تذكرة صورة [رابط]`' },
              { name: '👀 عرض الأقسام', value: '`!عرض_تذكرة`' }
            )
            .setFooter({ text: 'الأقسام الحالية: ' + settings.sections.map(s => `${s.emoji || '📌'} ${s.name}`).join(', ') });
          if (generalImage) embed.setImage(generalImage);
          await message.channel.send({ embeds: [embed] });
          return;
        }

        if (action === 'إضافة') {
          const parts = actionValue.match(/^(.+?)\s+<@&(\d+)>\s*(\S+)?$/);
          if (!parts) { await message.reply('⚠️ الصيغة: `!تعيين تذكرة إضافة [الاسم] @دور :ايموجي:`'); return; }
          const sectionName = parts[1].trim();
          const roleId = parts[2];
          const emoji = parts[3] || '📌';
          if (settings.sections.find(s => s.name === sectionName)) { await message.reply(`⚠️ قسم "${sectionName}" موجود بالفعل.`); return; }
          settings.sections.push({ name: sectionName, roleId, emoji });
          await saveTicketSettings(guildId, settings);
          await logToChannel(guildId, { title: '🎫 إضافة قسم تذكرة', color: 0x2b2d31, description: `**${message.author}** أضاف قسم **${sectionName}** مع دور <@&${roleId}> وإيموجي ${emoji}` });
          await message.reply(`✅ تم إضافة قسم **${sectionName}** مع دور <@&${roleId}> وإيموجي ${emoji}.`);
          return;
        }

        if (action === 'تعيين_ايموجي') {
          const parts = actionValue.match(/^(.+?)\s+(\S+)$/);
          if (!parts) { await message.reply('⚠️ الصيغة: `!تعيين تذكرة تعيين_ايموجي [الاسم] :ايموجي:`'); return; }
          const sectionName = parts[1].trim();
          const emoji = parts[2];
          const section = settings.sections.find(s => s.name === sectionName);
          if (!section) { await message.reply(`⚠️ قسم "${sectionName}" غير موجود.`); return; }
          section.emoji = emoji;
          await saveTicketSettings(guildId, settings);
          await logToChannel(guildId, { title: '🎨 تعيين إيموجي قسم', color: 0x2b2d31, description: `**${message.author}** عيّن الإيموجي ${emoji} لقسم **${sectionName}**` });
          await message.reply(`✅ تم تعيين الإيموجي ${emoji} لقسم **${sectionName}**.`);
          return;
        }

        if (action === 'حذف') {
          const sectionName = actionValue.trim();
          const index = settings.sections.findIndex(s => s.name === sectionName);
          if (index === -1) { await message.reply(`⚠️ قسم "${sectionName}" غير موجود.`); return; }
          settings.sections.splice(index, 1);
          await saveTicketSettings(guildId, settings);
          await logToChannel(guildId, { title: '🗑️ حذف قسم تذكرة', color: 0x2b2d31, description: `**${message.author}** حذف قسم **${sectionName}**` });
          await message.reply(`✅ تم حذف قسم **${sectionName}**.`);
          return;
        }

        if (action === 'نص') {
          if (!actionValue) { await message.reply('⚠️ أدخل النص الجديد.'); return; }
          settings.text = actionValue;
          await saveTicketSettings(guildId, settings);
          await logToChannel(guildId, { title: '📝 تغيير نص التذاكر', color: 0x2b2d31, description: `**${message.author}** غيّر نص التذاكر.` });
          await message.reply(`✅ تم تغيير نص التذاكر:\n${actionValue}`);
          return;
        }

        if (action === 'صورة') {
          if (!actionValue) { await message.reply('⚠️ أدخل رابط الصورة.'); return; }
          settings.image = actionValue;
          await saveTicketSettings(guildId, settings);
          await logToChannel(guildId, { title: '🖼️ تغيير صورة التذاكر', color: 0x2b2d31, description: `**${message.author}** غيّر صورة التذاكر.` });
          await message.reply(`✅ تم تغيير صورة التذاكر: ${actionValue}`);
          return;
        }

        await message.reply('⚠️ أمر غير معروف. استخدم `!تعيين تذكرة` لعرض التعليمات.');
        return;
      }

      if (sub === 'رتبة_اداري_علوي') {
        const role = message.mentions.roles.first();
        if (!role) { await message.reply('⚠️ منشن الرتبة.'); return; }
        await updateGuildConfig(guildId, { seniorAdminRole: role.id });
        await message.reply(`✅ تم تعيين رتبة الإداري العلوي: ${role}`);
        return;
      }

      if (sub === 'رتبة_اداري_صغري') {
        const role = message.mentions.roles.first();
        if (!role) { await message.reply('⚠️ منشن الرتبة.'); return; }
        await updateGuildConfig(guildId, { juniorAdminRole: role.id });
        await message.reply(`✅ تم تعيين رتبة الإداري الصغري: ${role}`);
        return;
      }

      if (sub === 'رتبة_مسؤول_اجازات') {
        const role = message.mentions.roles.first();
        if (!role) { await message.reply('⚠️ منشن الرتبة.'); return; }
        await updateGuildConfig(guildId, { leaveManagerRole: role.id });
        await message.reply(`✅ تم تعيين رتبة مسؤول الإجازات: ${role}`);
        return;
      }

      if (sub === 'نقاط_المهمة') {
        const pts = parseInt(value);
        if (!pts || pts < 1) { await message.reply('⚠️ أدخل عدد نقاط صحيح.'); return; }
        await updateGuildConfig(guildId, { pointsPerTask: pts });
        await message.reply(`✅ تم تعيين نقاط المهمة الافتراضية: ${pts}`);
        return;
      }

      if (sub === 'راتب_يومي') {
        const salary = parseInt(value);
        if (!salary || salary < 0) { await message.reply('⚠️ أدخل راتباً صحيحاً.'); return; }
        await updateGuildConfig(guildId, { dailySalary: salary });
        await message.reply(`✅ تم تعيين الراتب اليومي: ${salary} KL`);
        return;
      }

      if (sub === 'نقاط_الترقية') {
        const pts = parseInt(value);
        if (!pts || pts < 1) { await message.reply('⚠️ أدخل عدد نقاط صحيح.'); return; }
        await updateGuildConfig(guildId, { promotionPoints: pts });
        await message.reply(`✅ تم تعيين نقاط الترقية: ${pts}`);
        return;
      }

      if (sub === 'اضافة_منتج') {
        const role = message.mentions.roles.first();
        const price = parseInt(args[1]);
        const desc = args.slice(2).join(' ');
        if (!role || !price) {
          await message.reply('⚠️ الصيغة: `!تعيين اضافة_منتج @رتبة السعر [الوصف]`');
          return;
        }
        await addStoreItem(guildId, role.id, price, desc || 'لا يوجد وصف');
        await message.reply(`✅ تم إضافة المنتج ${role} بسعر ${price} KL`);
        return;
      }

      if (sub === 'حذف_منتج') {
        const id = args[0];
        if (!id) { await message.reply('⚠️ أدخل معرف المنتج.'); return; }
        const result = await removeStoreItem(guildId, id);
        if (result.deletedCount) { await message.reply('✅ تم حذف المنتج.'); } else { await message.reply('❌ المنتج غير موجود.'); }
        return;
      }

      if (sub === 'قناة_المهام') {
        const channel = message.mentions.channels.first();
        if (!channel) { await message.reply('⚠️ منشن القناة.'); return; }
        await updateGuildConfig(guildId, { tasksChannel: channel.id });
        await message.reply(`✅ تم تعيين قناة المهام: ${channel}`);
        return;
      }

      if (sub === 'قناة_الاجازات') {
        const channel = message.mentions.channels.first();
        if (!channel) { await message.reply('⚠️ منشن القناة.'); return; }
        await updateGuildConfig(guildId, { leaveRequestChannel: channel.id });
        await message.reply(`✅ تم تعيين قناة الإجازات: ${channel}`);
        return;
      }

      if (sub === 'قناة_المودات') {
        const channel = message.mentions.channels.first();
        if (!channel) { await message.reply('⚠️ منشن القناة.'); return; }
        await updateGuildConfig(guildId, { modLoginChannel: channel.id });
        await message.reply(`✅ تم تعيين قناة المودات: ${channel}`);
        return;
      }

      await message.reply('⚠️ خيار غير معروف. استخدم `!تعيين` لعرض القائمة.');
      return;
    }

    // ============================================================
    // == الأوامر العامة ==
    // ============================================================

    if (cmd === 'مساعدة') {
      const embed = new EmbedBuilder()
        .setTitle('📖 قائمة الأوامر')
        .setColor(0x2b2d31)
        .addFields(
          { name: '👑 نظام التحكم', value: '`متحكم @شخص` `الغاء_متحكم @شخص` `قائمة_المتحكمين`', inline: false },
          { name: '📋 المهام', value: '`!لوحة_المهام` (للمدراء العلويين) – مع نقاط KL + نقاط إدارية وإثبات', inline: false },
          { name: '📅 الإجازات', value: '`!بانل_اجازات` (للمتحكمين)\n`!طلب_اجازة` (للإداريين)\n`!الموافقة_على_الاجازات` (لمسؤول الإجازات)', inline: false },
          { name: '💰 العملة', value: '`!رصيدي` (يعرض KL + نقاط إدارية)\n`!مصرف` (راتب يومي)\n`!اعطاء_عملات` و `!سحب_عملات` (للمتحكمين)\n`!توب` (ترتيب العملة)\n**مكافآت تلقائية:** 15 KL كل 30 رسالة، 1 KL كل دقيقة في الفويس', inline: false },
          { name: '🛒 المتجر', value: '`!بانل_اضافة_منتج` (للمتحكمين) – لإضافة منتج\n`!متجر` – شراء رتبة عبر القائمة المنسدلة\nيتطلب رتبة بائع (تُعيّن بـ `!تعيين رتبة_بائع`)', inline: false },
          { name: '🔐 تسجيل الدخول', value: '`!تسجيل_الدخول` (للمودات)', inline: false },
          { name: '📊 المستويات', value: '`!مستوى` `!ترتيب`', inline: false },
          { name: '🎫 التذاكر', value: '`!بانل` `!عرض_تذكرة` `!تعيين تذكرة`\n`!لوق_تذكرة` (داخل التذكرة)', inline: false },
          { name: '💡 الاقتراحات', value: '`!بانل_اقتراح`', inline: false },
          { name: '🛡️ الإدارة', value: 'حظر، طرد، كتم، تحذير، مسح، قفل، فتح، نقل_كل، طرد_صوتي، كتم_صوتي، فك_كتم_صوتي، إدارة الرتب، القنوات', inline: false },
          { name: '⚙️ الإعدادات', value: '`!تعيين` (للمالك فقط)', inline: false }
        )
        .setFooter({ text: `🔥 البادئة: !` });
      if (generalImage) embed.setImage(generalImage);
      await message.channel.send({ embeds: [embed] });
      return;
    }

    if (cmd === 'مستوى') {
      const member = message.mentions.members.first() || message.member;
      const user = await getUser(guildId, member.id);
      const embed = new EmbedBuilder()
        .setTitle(`📊 مستوى ${member.user.username}`)
        .setColor(0x2b2d31)
        .addFields(
          { name: 'المستوى', value: `${user.level}`, inline: true },
          { name: 'XP', value: `${user.xp}/${(user.level + 1) * 100}`, inline: true },
          { name: 'الرسائل', value: `${user.messages}`, inline: true }
        );
      if (generalImage) embed.setImage(generalImage);
      await message.channel.send({ embeds: [embed] });
      return;
    }

    if (cmd === 'ترتيب') {
      const top = await User.find({ guildId }).sort({ level: -1, xp: -1 }).limit(10);
      if (!top.length) return message.reply('📭 لا توجد بيانات مستويات.');
      let desc = '';
      let rank = 1;
      for (const entry of top) {
        const member = message.guild.members.cache.get(entry.userId);
        const name = member ? member.user.username : `مستخدم ${entry.userId}`;
        desc += `#${rank} ${name} - المستوى ${entry.level} (XP: ${entry.xp})\n`;
        rank++;
      }
      const embed = new EmbedBuilder().setTitle('🏆 ترتيب المستويات').setColor(0x2b2d31).setDescription(desc).setFooter({ text: 'أعلى 10 أعضاء' });
      if (generalImage) embed.setImage(generalImage);
      await message.channel.send({ embeds: [embed] });
      return;
    }

    // متحكم
    if (cmd === 'متحكم' || cmd === 'تعيين_متحكم') {
      if (message.author.id !== OWNER_ID) return message.reply('❌ هذا الأمر للمالك فقط.');
      const member = message.mentions.members.first();
      if (!member) return message.reply('⚠️ منشن العضو.');
      if (await isController(member.id, guildId)) return message.reply(`⚠️ ${member} متحكم بالفعل.`);
      await addController(guildId, member.id);
      await message.reply(`✅ تم جعل ${member} متحكماً.`);
      return;
    }

    if (cmd === 'الغاء_متحكم') {
      if (message.author.id !== OWNER_ID) return message.reply('❌ هذا الأمر للمالك فقط.');
      const member = message.mentions.members.first();
      if (!member) return message.reply('⚠️ منشن العضو.');
      if (!(await isController(member.id, guildId))) return message.reply(`⚠️ ${member} ليس متحكماً.`);
      await removeController(guildId, member.id);
      await message.reply(`✅ تم إلغاء صلاحية التحكم عن ${member}.`);
      return;
    }

    if (cmd === 'قائمة_المتحكمين') {
      const controllers = await getControllers(guildId);
      if (!controllers.length) return message.reply('📋 لا يوجد متحكمون.');
      const list = controllers.map(id => `<@${id}>`).join('\n');
      const embed = new EmbedBuilder().setTitle('🛡️ قائمة المتحكمين').setColor(0x2b2d31).setDescription(list);
      await message.channel.send({ embeds: [embed] });
      return;
    }

    // ============================================================
    // == أوامر الإشراف (تُحذف بعد 5 ثوانٍ) ==
    // ============================================================

    if (cmd === 'حظر') {
      if (!(await hasPermission(message.member, guildId))) { sentReply = await message.reply('❌ تحتاج صلاحية متحكم.'); deleteAfter(sentReply); return; }
      const member = message.mentions.members.first();
      if (!member) { sentReply = await message.reply('⚠️ منشن العضو.'); deleteAfter(sentReply); return; }
      const reason = args.join(' ') || 'لا يوجد سبب';
      await member.ban({ reason });
      const embed = new EmbedBuilder().setTitle('✅ تم الحظر').setColor(0x2b2d31).setDescription(`${member.user.tag} تم حظره بسبب: ${reason}`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '🔨 حظر', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**المستهدف:** ${member.user.tag}\n**السبب:** ${reason}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'طرد') {
      if (!(await hasPermission(message.member, guildId))) { sentReply = await message.reply('❌ تحتاج صلاحية متحكم.'); deleteAfter(sentReply); return; }
      const member = message.mentions.members.first();
      if (!member) { sentReply = await message.reply('⚠️ منشن العضو.'); deleteAfter(sentReply); return; }
      const reason = args.join(' ') || 'لا يوجد سبب';
      await member.kick(reason);
      const embed = new EmbedBuilder().setTitle('✅ تم الطرد').setColor(0x2b2d31).setDescription(`${member.user.tag} تم طرده بسبب: ${reason}`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '🚪 طرد', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**المستهدف:** ${member.user.tag}\n**السبب:** ${reason}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'كتم') {
      if (!(await hasPermission(message.member, guildId))) { sentReply = await message.reply('❌ تحتاج صلاحية متحكم.'); deleteAfter(sentReply); return; }
      const member = message.mentions.members.first();
      if (!member) { sentReply = await message.reply('⚠️ منشن العضو.'); deleteAfter(sentReply); return; }
      const reason = args.join(' ') || 'لا يوجد سبب';
      let muteRole = message.guild.roles.cache.find(r => r.name === 'Muted');
      if (!muteRole) {
        muteRole = await message.guild.roles.create({ name: 'Muted', permissions: [] });
        message.guild.channels.cache.forEach(ch => ch.permissionOverwrites.create(muteRole, { SendMessages: false }).catch(() => {}));
      }
      await member.roles.add(muteRole, reason);
      const embed = new EmbedBuilder().setTitle('🔇 تم الكتم').setColor(0x2b2d31).setDescription(`${member.user.tag} تم كتمه بسبب: ${reason}`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '🔇 كتم', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**المستهدف:** ${member.user.tag}\n**السبب:** ${reason}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'فك_كتم') {
      if (!(await hasPermission(message.member, guildId))) { sentReply = await message.reply('❌ تحتاج صلاحية متحكم.'); deleteAfter(sentReply); return; }
      const member = message.mentions.members.first();
      if (!member) { sentReply = await message.reply('⚠️ منشن العضو.'); deleteAfter(sentReply); return; }
      const muteRole = message.guild.roles.cache.find(r => r.name === 'Muted');
      if (!muteRole) { sentReply = await message.reply('⚠️ لا يوجد دور Muted.'); deleteAfter(sentReply); return; }
      await member.roles.remove(muteRole);
      const embed = new EmbedBuilder().setTitle('🔊 تم فك الكتم').setColor(0x2b2d31).setDescription(`${member.user.tag} تم فك الكتم عنه.`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '🔊 فك كتم', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**المستهدف:** ${member.user.tag}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'تحذير') {
      if (!(await hasPermission(message.member, guildId))) { sentReply = await message.reply('❌ تحتاج صلاحية متحكم.'); deleteAfter(sentReply); return; }
      const member = message.mentions.members.first();
      if (!member) { sentReply = await message.reply('⚠️ منشن العضو.'); deleteAfter(sentReply); return; }
      const reason = args.join(' ') || 'لا يوجد سبب';
      const count = await addWarn(guildId, member.id, reason, message.author.id);
      const embed = new EmbedBuilder().setTitle('⚠️ تحذير').setColor(0x2b2d31).setDescription(`${member.user.tag} تم تحذيره بسبب: ${reason}\nإجمالي التحذيرات: ${count}`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '⚠️ تحذير', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**المستهدف:** ${member.user.tag}\n**السبب:** ${reason}\n**عدد التحذيرات:** ${count}` });
      try {
        const dmEmbed = new EmbedBuilder().setTitle('⚠️ تم تحذيرك').setColor(0x2b2d31)
          .setDescription(`**السيرفر:** ${message.guild.name}\n**السبب:** ${reason}\n**إجمالي تحذيراتك:** ${count}`)
          .setTimestamp().setFooter({ text: `بواسطة ${message.author.tag}` });
        if (generalImage) dmEmbed.setThumbnail(generalImage);
        await member.send({ embeds: [dmEmbed] });
      } catch (e) {}
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'ابطال_تحذيرات') {
      if (!(await hasPermission(message.member, guildId))) { sentReply = await message.reply('❌ تحتاج صلاحية متحكم.'); deleteAfter(sentReply); return; }
      const member = message.mentions.members.first();
      if (!member) { sentReply = await message.reply('⚠️ منشن العضو.'); deleteAfter(sentReply); return; }
      await clearWarns(guildId, member.id);
      const embed = new EmbedBuilder().setTitle('✅ تم إبطال التحذيرات').setColor(0x2b2d31).setDescription(`تم إلغاء كل تحذيرات ${member.user.tag}.`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '✅ إبطال تحذيرات', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**المستهدف:** ${member.user.tag}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'مسح') {
      if (!(await hasPermission(message.member, guildId))) { sentReply = await message.reply('❌ تحتاج صلاحية متحكم.'); deleteAfter(sentReply); return; }
      let amount = parseInt(args[0]) || 5;
      if (amount > 100) amount = 100;
      const deleted = await message.channel.bulkDelete(amount, true).catch(() => {});
      const count = deleted ? deleted.size : 0;
      sentReply = await message.channel.send(`🗑️ تم مسح ${count} رسالة.`);
      await logToChannel(guildId, { title: '🗑️ مسح رسائل', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**القناة:** ${message.channel.name}\n**عدد الرسائل:** ${count}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'قفل') {
      if (!(await hasPermission(message.member, guildId))) { sentReply = await message.reply('❌ تحتاج صلاحية متحكم.'); deleteAfter(sentReply); return; }
      await message.channel.permissionOverwrites.create(message.guild.id, { SendMessages: false });
      const embed = new EmbedBuilder().setTitle('🔒 تم قفل القناة').setColor(0x2b2d31).setDescription(`تم قفل ${message.channel}`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '🔒 قفل قناة', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**القناة:** ${message.channel.name}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'فتح') {
      if (!(await hasPermission(message.member, guildId))) { sentReply = await message.reply('❌ تحتاج صلاحية متحكم.'); deleteAfter(sentReply); return; }
      await message.channel.permissionOverwrites.delete(message.guild.id);
      const embed = new EmbedBuilder().setTitle('🔓 تم فتح القناة').setColor(0x2b2d31).setDescription(`تم فتح ${message.channel}`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '🔓 فتح قناة', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**القناة:** ${message.channel.name}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'نقل_كل') {
      if (!(await hasPermission(message.member, guildId))) { sentReply = await message.reply('❌ تحتاج صلاحية متحكم.'); deleteAfter(sentReply); return; }
      const from = message.mentions.channels.first();
      const to = message.mentions.channels.last();
      if (!from || !to || from.type !== ChannelType.GuildVoice || to.type !== ChannelType.GuildVoice) {
        sentReply = await message.reply('⚠️ منشن رومين صوتيين: `!نقل_كل #من #إلى`');
        deleteAfter(sentReply);
        return;
      }
      const members = from.members.filter(m => !m.user.bot);
      let count = 0;
      for (const m of members) { await m.voice.setChannel(to).catch(() => {}); count++; }
      const embed = new EmbedBuilder().setTitle('🔊 تم نقل الأعضاء').setColor(0x2b2d31).setDescription(`تم نقل ${count} عضو من ${from} إلى ${to}`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '🔊 نقل أعضاء صوتي', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**من:** ${from.name}\n**إلى:** ${to.name}\n**عدد الأعضاء:** ${count}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'طرد_صوتي') {
      if (!(await hasPermission(message.member, guildId))) { sentReply = await message.reply('❌ تحتاج صلاحية متحكم.'); deleteAfter(sentReply); return; }
      const member = message.mentions.members.first();
      if (!member) { sentReply = await message.reply('⚠️ منشن العضو.'); deleteAfter(sentReply); return; }
      if (!member.voice.channel) { sentReply = await message.reply('⚠️ هذا العضو ليس في روم صوتي.'); deleteAfter(sentReply); return; }
      await member.voice.disconnect();
      const embed = new EmbedBuilder().setTitle('🔊 تم طرد العضو من الصوت').setColor(0x2b2d31).setDescription(`تم طرد ${member.user.tag} من الروم الصوتي.`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '🔊 طرد من الصوت', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**المستهدف:** ${member.user.tag}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'كتم_صوتي') {
      if (!(await hasPermission(message.member, guildId))) { sentReply = await message.reply('❌ تحتاج صلاحية متحكم.'); deleteAfter(sentReply); return; }
      const member = message.mentions.members.first();
      if (!member) { sentReply = await message.reply('⚠️ منشن العضو.'); deleteAfter(sentReply); return; }
      if (!member.voice.channel) { sentReply = await message.reply('⚠️ هذا العضو ليس في روم صوتي.'); deleteAfter(sentReply); return; }
      await member.voice.setMute(true);
      const embed = new EmbedBuilder().setTitle('🔇 تم الكتم الصوتي').setColor(0x2b2d31).setDescription(`تم كتم صوت ${member.user.tag} في الروم الصوتي.`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '🔇 كتم صوتي', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**المستهدف:** ${member.user.tag}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'فك_كتم_صوتي') {
      if (!(await hasPermission(message.member, guildId))) { sentReply = await message.reply('❌ تحتاج صلاحية متحكم.'); deleteAfter(sentReply); return; }
      const member = message.mentions.members.first();
      if (!member) { sentReply = await message.reply('⚠️ منشن العضو.'); deleteAfter(sentReply); return; }
      if (!member.voice.channel) { sentReply = await message.reply('⚠️ هذا العضو ليس في روم صوتي.'); deleteAfter(sentReply); return; }
      await member.voice.setMute(false);
      const embed = new EmbedBuilder().setTitle('🔊 تم فك الكتم الصوتي').setColor(0x2b2d31).setDescription(`تم فك كتم صوت ${member.user.tag} في الروم الصوتي.`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '🔊 فك كتم صوتي', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**المستهدف:** ${member.user.tag}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'انشاء_قناة') {
      if (!(await hasPermission(message.member, guildId))) { sentReply = await message.reply('❌ تحتاج صلاحية متحكم.'); deleteAfter(sentReply); return; }
      const name = args.join(' ');
      if (!name) { sentReply = await message.reply('⚠️ أدخل اسم القناة.'); deleteAfter(sentReply); return; }
      const channel = await message.guild.channels.create({ name, type: ChannelType.GuildText });
      const embed = new EmbedBuilder().setTitle('✅ تم إنشاء القناة').setColor(0x2b2d31).setDescription(`تم إنشاء ${channel}`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '📁 إنشاء قناة', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**القناة:** ${channel.name}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'حذف_قناة') {
      if (!(await hasPermission(message.member, guildId))) { sentReply = await message.reply('❌ تحتاج صلاحية متحكم.'); deleteAfter(sentReply); return; }
      const channel = message.mentions.channels.first();
      if (!channel) { sentReply = await message.reply('⚠️ منشن القناة.'); deleteAfter(sentReply); return; }
      const channelName = channel.name;
      await channel.delete();
      const embed = new EmbedBuilder().setTitle('🗑️ تم حذف القناة').setColor(0x2b2d31).setDescription(`تم حذف ${channelName}`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '🗑️ حذف قناة', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**القناة:** ${channelName}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'تغيير_اسم_قناة') {
      if (!(await hasPermission(message.member, guildId))) { sentReply = await message.reply('❌ تحتاج صلاحية متحكم.'); deleteAfter(sentReply); return; }
      const channel = message.mentions.channels.first();
      if (!channel) { sentReply = await message.reply('⚠️ منشن القناة.'); deleteAfter(sentReply); return; }
      const oldName = channel.name;
      const newName = args.slice(1).join(' ');
      if (!newName) { sentReply = await message.reply('⚠️ أدخل الاسم الجديد.'); deleteAfter(sentReply); return; }
      await channel.setName(newName);
      const embed = new EmbedBuilder().setTitle('✏️ تم تغيير اسم القناة').setColor(0x2b2d31).setDescription(`تم تغيير اسم القناة إلى ${newName}`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '✏️ تغيير اسم قناة', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**الاسم القديم:** ${oldName}\n**الاسم الجديد:** ${newName}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'تثبيت') {
      if (!(await hasPermission(message.member, guildId))) { sentReply = await message.reply('❌ تحتاج صلاحية متحكم.'); deleteAfter(sentReply); return; }
      const msgId = args[0];
      if (!msgId) { sentReply = await message.reply('⚠️ أدخل معرف الرسالة.'); deleteAfter(sentReply); return; }
      try {
        const msg = await message.channel.messages.fetch(msgId);
        await msg.pin();
        const embed = new EmbedBuilder().setTitle('📌 تم تثبيت الرسالة').setColor(0x2b2d31).setDescription(`[رابط الرسالة](${msg.url})`);
        if (generalImage) embed.setImage(generalImage);
        sentReply = await message.channel.send({ embeds: [embed] });
        await logToChannel(guildId, { title: '📌 تثبيت رسالة', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**القناة:** ${message.channel.name}\n[رابط الرسالة](${msg.url})` });
        deleteAfter(sentReply);
      } catch (e) {
        sentReply = await message.reply('❌ حدث خطأ. تأكد من المعرف.');
        deleteAfter(sentReply);
      }
      return;
    }

    if (cmd === 'الغاء_تثبيت') {
      if (!(await hasPermission(message.member, guildId))) { sentReply = await message.reply('❌ تحتاج صلاحية متحكم.'); deleteAfter(sentReply); return; }
      const msgId = args[0];
      if (!msgId) { sentReply = await message.reply('⚠️ أدخل معرف الرسالة.'); deleteAfter(sentReply); return; }
      try {
        const msg = await message.channel.messages.fetch(msgId);
        await msg.unpin();
        const embed = new EmbedBuilder().setTitle('📌 تم إلغاء تثبيت الرسالة').setColor(0x2b2d31).setDescription(`[رابط الرسالة](${msg.url})`);
        if (generalImage) embed.setImage(generalImage);
        sentReply = await message.channel.send({ embeds: [embed] });
        await logToChannel(guildId, { title: '📌 إلغاء تثبيت رسالة', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**القناة:** ${message.channel.name}\n[رابط الرسالة](${msg.url})` });
        deleteAfter(sentReply);
      } catch (e) {
        sentReply = await message.reply('❌ حدث خطأ. تأكد من المعرف.');
        deleteAfter(sentReply);
      }
      return;
    }

    if (cmd === 'اعطاء_رتبة') {
      if (!(await hasPermission(message.member, guildId))) { sentReply = await message.reply('❌ تحتاج صلاحية متحكم.'); deleteAfter(sentReply); return; }
      const member = message.mentions.members.first();
      if (!member) { sentReply = await message.reply('⚠️ منشن العضو.'); deleteAfter(sentReply); return; }
      const role = message.mentions.roles.first();
      if (!role) { sentReply = await message.reply('⚠️ منشن الرتبة.'); deleteAfter(sentReply); return; }
      if (role.position >= message.member.roles.highest.position && message.author.id !== OWNER_ID) {
        sentReply = await message.reply('❌ لا يمكنك إعطاء رتبة أعلى من رتبتك.');
        deleteAfter(sentReply);
        return;
      }
      await member.roles.add(role);
      const embed = new EmbedBuilder().setTitle('✅ تم إعطاء الرتبة').setColor(0x2b2d31).setDescription(`تم إعطاء ${member} رتبة ${role}`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '🎭 إعطاء رتبة', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**المستهدف:** ${member.user.tag}\n**الرتبة:** ${role.name}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'سحب_رتبة') {
      if (!(await hasPermission(message.member, guildId))) { sentReply = await message.reply('❌ تحتاج صلاحية متحكم.'); deleteAfter(sentReply); return; }
      const member = message.mentions.members.first();
      if (!member) { sentReply = await message.reply('⚠️ منشن العضو.'); deleteAfter(sentReply); return; }
      const role = message.mentions.roles.first();
      if (!role) { sentReply = await message.reply('⚠️ منشن الرتبة.'); deleteAfter(sentReply); return; }
      if (role.position >= message.member.roles.highest.position && message.author.id !== OWNER_ID) {
        sentReply = await message.reply('❌ لا يمكنك سحب رتبة أعلى من رتبتك.');
        deleteAfter(sentReply);
        return;
      }
      await member.roles.remove(role);
      const embed = new EmbedBuilder().setTitle('✅ تم سحب الرتبة').setColor(0x2b2d31).setDescription(`تم سحب رتبة ${role} من ${member}`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '🎭 سحب رتبة', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**المستهدف:** ${member.user.tag}\n**الرتبة:** ${role.name}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'عرض_رتب') {
      const member = message.mentions.members.first() || message.member;
      const roles = member.roles.cache.filter(r => r.id !== message.guild.id).map(r => r.toString()).join(' ') || 'لا يوجد رتب';
      const embed = new EmbedBuilder().setTitle(`🎭 رتب ${member.user.username}`).setColor(0x2b2d31).setDescription(roles);
      if (generalImage) embed.setImage(generalImage);
      await message.channel.send({ embeds: [embed] });
      return;
    }

    if (cmd === 'قول') {
      const text = args.join(' ');
      if (!text) { sentReply = await message.reply('⚠️ اكتب النص.'); deleteAfter(sentReply); return; }
      sentReply = await message.channel.send(text);
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'ايمبد') {
      const fullText = args.join(' ');
      if (!fullText) { sentReply = await message.reply('⚠️ الصيغة: `!ايمبد [العنوان] ، [الوصف]`'); deleteAfter(sentReply); return; }
      const parts = fullText.split(/[،,]\s*/).map(s => s.trim());
      let title = 'بدون عنوان', description = fullText;
      if (parts.length >= 2) { title = parts[0]; description = parts.slice(1).join(' ، '); }
      const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x2b2d31).setTimestamp();
      const imageMatch = description.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp))/i);
      if (imageMatch) { embed.setImage(imageMatch[1]); embed.setDescription(description.replace(imageMatch[1], '').trim() || 'بدون وصف'); }
      if (generalImage) embed.setThumbnail(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'اعلان') {
      if (!(await hasPermission(message.member, guildId))) { sentReply = await message.reply('❌ تحتاج صلاحية متحكم.'); deleteAfter(sentReply); return; }
      let mentionType = 'everyone';
      let text = args.join(' ');
      if (args[0]?.toLowerCase() === 'here') { mentionType = 'here'; text = args.slice(1).join(' '); }
      if (!text) { sentReply = await message.reply('⚠️ اكتب نص الإعلان.'); deleteAfter(sentReply); return; }
      const embed = new EmbedBuilder().setTitle('📢 إعلان').setDescription(text).setColor(0x2b2d31).setTimestamp().setFooter({ text: `بواسطة ${message.author.tag}` });
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ content: mentionType === 'everyone' ? '@everyone' : '@here', embeds: [embed] });
      deleteAfter(sentReply);
      return;
    }

    // ============================================================
    // == اللوحات الدائمة ==
    // ============================================================

    if (cmd === 'بانل_اقتراح') {
      if (!(await hasPermission(message.member, guildId))) { await message.reply('❌ تحتاج صلاحية متحكم.'); return; }
      const color = parseInt(config.suggestionsColor?.replace('#', '') || '2b2d31', 16);
      const embed = new EmbedBuilder()
        .setTitle(config.suggestionsTitle || '💡 قناة الاقتراحات')
        .setDescription(config.suggestionsDescription || 'شاركنا اقتراحك!')
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `بواسطة ${message.author.tag}` });
      if (config.suggestionsImage) embed.setImage(config.suggestionsImage);
      if (generalImage) embed.setThumbnail(generalImage);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('suggest_modal').setLabel('📝 تقديم اقتراح').setStyle(ButtonStyle.Primary)
      );
      await message.channel.send({ embeds: [embed], components: [row] });
      await message.reply('✅ تم إنشاء لوحة الاقتراحات.');
      return;
    }

    if (cmd === 'بانل') {
      if (!(await hasPermission(message.member, guildId))) { await message.reply('❌ تحتاج صلاحية متحكم.'); return; }
      const settings = await getTicketSettings(guildId);
      const imageUrl = settings.image || 'https://i.imgur.com/GkKqN3G.png';
      const embed = new EmbedBuilder().setTitle('🎫 تذاكر دعم فني').setDescription(settings.text).setColor(0x2b2d31).setImage(imageUrl);
      if (generalImage) embed.setThumbnail(generalImage);
      const options = settings.sections.map(s => ({
        label: s.name,
        value: s.name,
        emoji: s.emoji || '📌',
      }));
      if (!options.length) { await message.reply('⚠️ لا توجد أقسام مضافة.'); return; }
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('ticket_menu').setPlaceholder('📌 اختر القسم...').addOptions(options)
      );
      await message.channel.send({ embeds: [embed], components: [row] });
      await message.reply('✅ تم إنشاء لوحة التذاكر.');
      return;
    }

    if (cmd === 'عرض_تذكرة') {
      const settings = await getTicketSettings(guildId);
      const embed = new EmbedBuilder().setTitle('📋 إعدادات التذاكر').setColor(0x2b2d31)
        .setDescription(`**النص:** ${settings.text}`)
        .addFields(
          { name: '📌 الأقسام', value: settings.sections.map((s, i) => `${i+1}. ${s.emoji || '📌'} **${s.name}** ${s.roleId ? `<@&${s.roleId}>` : '(بدون دور)'}`).join('\n') || 'لا يوجد أقسام' },
          { name: '🖼️ الصورة', value: settings.image ? `[رابط](${settings.image})` : 'لا توجد صورة' }
        );
      if (generalImage) embed.setImage(generalImage);
      await message.channel.send({ embeds: [embed] });
      return;
    }

    if (cmd === 'رتب') {
      if (!(await hasPermission(message.member, guildId))) { await message.reply('❌ تحتاج صلاحية متحكم.'); return; }
      const defaultImage = 'https://i.imgur.com/7dXe7tM.png';
      const imageUrl = config.rolesImage || defaultImage;
      const embed = new EmbedBuilder().setTitle('🔔 رتب الإشعارات').setDescription('اختر الرتب التي تريد استلام إشعارات عنها من خلال الأزرار أدناه.').setColor(0x2b2d31).setImage(imageUrl).setFooter({ text: 'اضغط مرة للحصول على الرتبة، ومرة أخرى لإزالتها.' });
      if (generalImage) embed.setThumbnail(generalImage);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('role_game').setLabel('🎮 Game Notice').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('role_event').setLabel('📅 Event Notice').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('role_ajr').setLabel('🔊 Ajr Notice').setStyle(ButtonStyle.Secondary)
      );
      await message.channel.send({ embeds: [embed], components: [row] });
      await logToChannel(guildId, { title: '🔔 إنشاء لوحة رتب الإشعارات', color: 0x2b2d31, description: `**${message.author}** أنشأ لوحة رتب الإشعارات.` });
      await message.reply('✅ تم إنشاء لوحة الرتب.');
      return;
    }

    // ============================================================
    // == تغيير الاسم ==
    // ============================================================

    if (cmd === 'تغيير_اسم') {
      const userId = message.author.id;
      const last = await getNameCooldown(userId);
      if (last && Date.now() - last.getTime() < 5 * 60 * 60 * 1000) {
        const remaining = Math.ceil((5 * 60 * 60 * 1000 - (Date.now() - last.getTime())) / (60 * 60 * 1000));
        await message.reply(`⏳ يمكنك تغيير اسمك بعد ${remaining} ساعة.`);
        return;
      }
      const embed = new EmbedBuilder().setTitle('✏️ تغيير الاسم').setDescription('اضغط على الزر أدناه لتغيير اسمك المستعار في السيرفر.').setColor(0x2b2d31).setFooter({ text: 'يمكنك تغيير اسمك مرة كل 5 ساعات.' });
      if (generalImage) embed.setImage(generalImage);
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_name_modal').setLabel('✏️ تغيير الاسم').setStyle(ButtonStyle.Secondary));
      await message.channel.send({ embeds: [embed], components: [row] });
      return;
    }

    // ============================================================
    // == الردود التلقائية ==
    // ============================================================

    if (cmd === 'رد_تلقائي') {
      if (!(await hasPermission(message.member, guildId))) { await message.reply('❌ تحتاج صلاحية متحكم.'); return; }
      const keyword = args[0];
      const reply = args.slice(1).join(' ');
      if (!keyword || !reply) {
        await message.reply('⚠️ الصيغة: `!رد_تلقائي [الكلمة] [الرد]`');
        return;
      }
      const added = await addAutoReply(guildId, keyword, reply);
      await logToChannel(guildId, { title: '💬 إضافة رد تلقائي', color: 0x2b2d31, description: `**${message.author}** أضاف رداً تلقائياً:\n**${keyword}** → ${reply}` });
      const embed = new EmbedBuilder()
        .setTitle(added ? '✅ تم إضافة رد تلقائي' : '🔄 تم تحديث رد تلقائي')
        .setColor(0x2b2d31)
        .setDescription(`**الكلمة:** ${keyword}\n**الرد:** ${reply}`)
        .setFooter({ text: 'سيرد البوت تلقائياً عند كتابة هذه الكلمة.' });
      if (generalImage) embed.setImage(generalImage);
      await message.channel.send({ embeds: [embed] });
      return;
    }

    if (cmd === 'رد_تلقائي_صورة') {
      if (!(await hasPermission(message.member, guildId))) { await message.reply('❌ تحتاج صلاحية متحكم.'); return; }
      const keyword = args[0];
      const image = args[args.length - 1];
      const reply = args.slice(1, -1).join(' ');
      if (!keyword || !reply || !image) {
        await message.reply('⚠️ الصيغة: `!رد_تلقائي_صورة [الكلمة] [الرد] [رابط_الصورة]`');
        return;
      }
      if (!image.match(/^https?:\/\/.+/)) {
        await message.reply('⚠️ الرابط غير صالح.');
        return;
      }
      const added = await addAutoReply(guildId, keyword, reply, image);
      await logToChannel(guildId, { title: '💬 إضافة رد تلقائي مع صورة', color: 0x2b2d31, description: `**${message.author}** أضاف رداً تلقائياً مع صورة:\n**${keyword}** → ${reply}` });
      const embed = new EmbedBuilder()
        .setTitle(added ? '✅ تم إضافة رد تلقائي مع صورة' : '🔄 تم تحديث رد تلقائي مع صورة')
        .setColor(0x2b2d31)
        .setDescription(`**الكلمة:** ${keyword}\n**الرد:** ${reply}`)
        .setImage(image)
        .setFooter({ text: 'سيرد البوت مع الصورة تلقائياً.' });
      if (generalImage) embed.setThumbnail(generalImage);
      await message.channel.send({ embeds: [embed] });
      return;
    }

    if (cmd === 'حذف_رد_تلقائي') {
      if (!(await hasPermission(message.member, guildId))) { await message.reply('❌ تحتاج صلاحية متحكم.'); return; }
      const keyword = args.join(' ');
      if (!keyword) {
        await message.reply('⚠️ اكتب الكلمة المفتاحية التي تريد حذفها.');
        return;
      }
      const removed = await removeAutoReply(guildId, keyword);
      if (!removed) {
        await message.reply(`⚠️ لا يوجد رد تلقائي للكلمة "${keyword}".`);
        return;
      }
      await logToChannel(guildId, { title: '🗑️ حذف رد تلقائي', color: 0x2b2d31, description: `**${message.author}** حذف الرد التلقائي للكلمة **${keyword}**` });
      const embed = new EmbedBuilder()
        .setTitle('🗑️ تم حذف الرد التلقائي')
        .setColor(0x2b2d31)
        .setDescription(`تم حذف الرد التلقائي للكلمة: **${keyword}**`);
      if (generalImage) embed.setImage(generalImage);
      await message.channel.send({ embeds: [embed] });
      return;
    }

    if (cmd === 'عرض_الردود') {
      const replies = await getAutoReplies(guildId);
      if (!replies.length) {
        await message.reply('📭 لا توجد ردود تلقائية في هذا السيرفر.');
        return;
      }
      const list = replies.map((r, i) => `${i+1}. **${r.keyword}** → ${r.reply}${r.image ? ' (🖼️)' : ''}`).join('\n');
      const embed = new EmbedBuilder()
        .setTitle('💬 قائمة الردود التلقائية')
        .setColor(0x2b2d31)
        .setDescription(list)
        .setFooter({ text: `عدد الردود: ${replies.length}` });
      if (generalImage) embed.setImage(generalImage);
      await message.channel.send({ embeds: [embed] });
      return;
    }

    // ============================================================
    // == معلومات، سيرفر، بينق ==
    // ============================================================

    if (cmd === 'معلومات') {
      const member = message.mentions.members.first() || message.member;
      const embed = new EmbedBuilder()
        .setTitle(`ℹ️ معلومات ${member.user.username}`)
        .setColor(0x2b2d31)
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
          { name: '🆔 المعرف', value: member.id, inline: true },
          { name: '📅 تاريخ الانضمام', value: member.joinedAt.toDateString(), inline: true },
          { name: '📅 تاريخ الحساب', value: member.user.createdAt.toDateString(), inline: true },
          { name: '🎭 أعلى رتبة', value: member.roles.highest.toString(), inline: true },
          { name: '🔊 في روم صوتي', value: member.voice.channel ? member.voice.channel.name : 'لا', inline: true }
        );
      if (generalImage) embed.setImage(generalImage);
      await message.channel.send({ embeds: [embed] });
      return;
    }

    if (cmd === 'سيرفر') {
      const embed = new EmbedBuilder()
        .setTitle(message.guild.name)
        .setColor(0x2b2d31)
        .setThumbnail(message.guild.iconURL())
        .addFields(
          { name: '👥 الأعضاء', value: `${message.guild.memberCount}`, inline: true },
          { name: '💬 القنوات', value: `${message.guild.channels.cache.size}`, inline: true },
          { name: '👑 المالك', value: `<@${message.guild.ownerId}>`, inline: true }
        );
      if (generalImage) embed.setImage(generalImage);
      await message.channel.send({ embeds: [embed] });
      return;
    }

    if (cmd === 'بينق') {
      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setDescription(`🏓 البينق: ${client.ws.ping}ms`);
      if (generalImage) embed.setImage(generalImage);
      await message.channel.send({ embeds: [embed] });
      return;
    }

    // ============================================================
    // == إيقاف ==
    // ============================================================

    if (cmd === 'إيقاف') {
      if (message.author.id !== OWNER_ID) return message.reply('❌ هذا الأمر للمالك فقط.');
      sentReply = await message.reply('🛑 جاري الإيقاف...');
      deleteAfter(sentReply);
      process.exit(0);
      return;
    }

  } catch (error) {
    console.error('❌ خطأ في الأمر:', error);
    sentReply = await message.reply('❌ حدث خطأ.').catch(() => {});
    if (sentReply) deleteAfter(sentReply);
  }
});

// ============================================================
// ========== معالج التفاعلات (الأزرار، القوائم، المودالات) ==========
// ============================================================

client.on('interactionCreate', async (interaction) => {
  if (!interaction.guild) return;
  const guildId = interaction.guild.id;

  try {

    // ----- زر فتح مودال طلب الإجازة -----
    if (interaction.isButton() && interaction.customId === 'open_leave_modal') {
      const hasPerm = await isJuniorAdmin(interaction.member, guildId);
      if (!hasPerm) return interaction.reply({ content: '❌ هذا الزر مخصص للإداريين فقط.', ephemeral: true });
      const modal = new ModalBuilder()
        .setCustomId('leave_modal')
        .setTitle('📝 طلب إجازة')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('leave_reason').setLabel('سبب الإجازة').setStyle(TextInputStyle.Paragraph).setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('leave_duration').setLabel('عدد الأيام').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('مثال: 5')
          )
        );
      await interaction.showModal(modal);
      return;
    }

    // ----- مودال طلب الإجازة -----
    if (interaction.isModalSubmit() && interaction.customId === 'leave_modal') {
      const reason = interaction.fields.getTextInputValue('leave_reason');
      const duration = parseInt(interaction.fields.getTextInputValue('leave_duration'));
      if (!duration || duration < 1) return interaction.reply({ content: '⚠️ عدد الأيام غير صحيح.', ephemeral: true });
      const user = await getUser(guildId, interaction.user.id);
      if (user.leave && user.leave.isOnLeave) return interaction.reply({ content: '⚠️ أنت بالفعل في إجازة.', ephemeral: true });
      const request = new LeaveRequest({
        guildId,
        userId: interaction.user.id,
        reason,
        duration,
        startDate: new Date(),
        endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
      });
      await request.save();
      const config = await getGuildConfig(guildId);
      const channel = config.leaveRequestChannel ? interaction.guild.channels.cache.get(config.leaveRequestChannel) : null;
      if (channel) {
        const embed = new EmbedBuilder()
          .setTitle('📩 طلب إجازة جديد')
          .setDescription(`**${interaction.user}** طلب إجازة لمدة **${duration}** يوم.\nالسبب: ${reason}`)
          .setColor(0x2b2d31)
          .setTimestamp();
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`leave_approve_${request._id}`).setLabel('✅ موافقة').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`leave_reject_${request._id}`).setLabel('❌ رفض').setStyle(ButtonStyle.Danger)
        );
        await channel.send({ content: `<@&${config.leaveManagerRole}>`, embeds: [embed], components: [row] });
      }
      await interaction.reply({ content: '✅ تم إرسال طلب إجازتك بنجاح.', ephemeral: true });
      return;
    }

    // ----- أزرار الموافقة على الإجازات -----
    if (interaction.isButton() && interaction.customId.startsWith('leave_')) {
      const parts = interaction.customId.split('_');
      const action = parts[1];
      const requestId = parts[2];
      const request = await LeaveRequest.findById(requestId);
      if (!request) return interaction.reply({ content: '❌ الطلب غير موجود.', ephemeral: true });
      const config = await getGuildConfig(guildId);
      if (!config.leaveManagerRole || !interaction.member.roles.cache.has(config.leaveManagerRole))
        return interaction.reply({ content: '❌ ليس لديك صلاحية.', ephemeral: true });
      if (request.status !== 'pending') return interaction.reply({ content: '⚠️ تمت معالجة هذا الطلب مسبقاً.', ephemeral: true });
      if (action === 'approve') {
        request.status = 'approved';
        request.approvedBy = interaction.user.id;
        await request.save();
        const user = await getUser(guildId, request.userId);
        const member = await interaction.guild.members.fetch(request.userId).catch(() => null);
        if (member) {
          const roles = member.roles.cache.filter(r => r.id !== interaction.guild.id && r.name !== '@everyone').map(r => r.id);
          user.leave = { isOnLeave: true, leaveEnd: request.endDate, savedRoles: roles };
          await user.save();
          const adminRoles = [config.seniorAdminRole, config.juniorAdminRole].filter(Boolean);
          for (const roleId of adminRoles) {
            if (member.roles.cache.has(roleId)) await member.roles.remove(roleId).catch(() => {});
          }
          let leaveRole = interaction.guild.roles.cache.find(r => r.name === 'إجازة');
          if (!leaveRole) leaveRole = await interaction.guild.roles.create({ name: 'إجازة', color: '#808080' });
          await member.roles.add(leaveRole);
        }
        await interaction.reply({ content: `✅ تمت الموافقة على إجازة <@${request.userId}>.`, ephemeral: false });
        try {
          const userMember = await interaction.guild.members.fetch(request.userId);
          await userMember.send(`✅ تمت الموافقة على طلب إجازتك لمدة ${request.duration} يوم.`);
        } catch (e) {}
      } else if (action === 'reject') {
        request.status = 'rejected';
        await request.save();
        await interaction.reply({ content: `❌ تم رفض إجازة <@${request.userId}>.`, ephemeral: false });
        try {
          const userMember = await interaction.guild.members.fetch(request.userId);
          await userMember.send(`❌ تم رفض طلب إجازتك.`);
        } catch (e) {}
      }
      return;
    }

    // ----- أزرار المهام (إنشاء، عرض، إنهاء) -----
    if (interaction.isButton() && interaction.customId.startsWith('task_')) {
      const action = interaction.customId.split('_')[1];
      if (action === 'create') {
        if (!(await isSeniorAdmin(interaction.member, guildId)))
          return interaction.reply({ content: '❌ ليس لديك صلاحية.', ephemeral: true });
        const modal = new ModalBuilder()
          .setCustomId('task_create_modal')
          .setTitle('📝 إنشاء مهمة')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('task_title').setLabel('عنوان المهمة').setStyle(TextInputStyle.Short).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('task_desc').setLabel('وصف المهمة').setStyle(TextInputStyle.Paragraph).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('task_to').setLabel('معرف المستلم (ID)').setStyle(TextInputStyle.Short).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('task_kl_points').setLabel('نقاط KL').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('مثال: 10')
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('task_admin_points').setLabel('نقاط إدارية').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('مثال: 5')
            )
          );
        await interaction.showModal(modal);
        return;
      } else if (action === 'list') {
        const tasks = await Task.find({ guildId, status: { $in: ['pending', 'accepted'] } });
        if (!tasks.length) return interaction.reply({ content: '📭 لا توجد مهام معلقة.', ephemeral: true });
        let desc = '';
        for (const t of tasks) {
          const assignedBy = await interaction.guild.members.fetch(t.assignedBy).catch(() => null);
          const assignedTo = await interaction.guild.members.fetch(t.assignedTo).catch(() => null);
          desc += `**${t.title}** - ${t.status}\nمن: ${assignedBy ? assignedBy.user.username : 'غير معروف'} → إلى: ${assignedTo ? assignedTo.user.username : 'غير معروف'}\n`;
        }
        const embed = new EmbedBuilder().setTitle('📋 المهام').setDescription(desc).setColor(0x2b2d31);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      } else if (action === 'complete') {
        const tasks = await Task.find({ guildId, assignedTo: interaction.user.id, status: 'accepted' });
        if (!tasks.length) return interaction.reply({ content: '📭 لا توجد مهام موكلة إليك.', ephemeral: true });
        const options = tasks.map(t => ({
          label: t.title,
          value: t._id.toString(),
          description: `حالة: ${t.status}`,
        }));
        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('task_complete_select')
            .setPlaceholder('اختر مهمة لإنهائها...')
            .addOptions(options)
        );
        await interaction.reply({ content: 'اختر المهمة التي أنجزتها:', components: [row], ephemeral: true });
        return;
      }
    }

    // ----- مودال إنشاء مهمة -----
    if (interaction.isModalSubmit() && interaction.customId === 'task_create_modal') {
      const title = interaction.fields.getTextInputValue('task_title');
      const desc = interaction.fields.getTextInputValue('task_desc');
      const toId = interaction.fields.getTextInputValue('task_to');
      const klPoints = parseInt(interaction.fields.getTextInputValue('task_kl_points')) || 0;
      const adminPoints = parseInt(interaction.fields.getTextInputValue('task_admin_points')) || 0;
      const target = await interaction.guild.members.fetch(toId).catch(() => null);
      if (!target) return interaction.reply({ content: '❌ المستلم غير موجود.', ephemeral: true });
      const task = new Task({
        guildId,
        assignedBy: interaction.user.id,
        assignedTo: toId,
        title,
        description: desc,
        points: klPoints,
        adminPoints: adminPoints,
      });
      await task.save();
      const user = await getUser(guildId, toId);
      user.assignedTasks.push({ taskId: task._id, status: 'pending' });
      await user.save();
      await interaction.reply({ content: `✅ تم إنشاء المهمة وإرسالها إلى ${target}.\nنقاط KL: ${klPoints} | نقاط إدارية: ${adminPoints}`, ephemeral: true });
      try { await target.send(`📩 تم تكليفك بمهمة جديدة: **${title}**\nنقاط KL: ${klPoints} | نقاط إدارية: ${adminPoints}\nاستخدم \`!لوحة_المهام\` لقبولها.`); } catch (e) {}
      return;
    }

    // ----- اختيار مهمة لإنهائها (يعرض مودال إثبات) -----
    if (interaction.isStringSelectMenu() && interaction.customId === 'task_complete_select') {
      const taskId = interaction.values[0];
      const task = await Task.findById(taskId);
      if (!task) return interaction.reply({ content: '❌ المهمة غير موجودة.', ephemeral: true });
      if (task.assignedTo !== interaction.user.id) return interaction.reply({ content: '❌ هذه المهمة ليست موكلة إليك.', ephemeral: true });
      const modal = new ModalBuilder()
        .setCustomId(`task_proof_${taskId}`)
        .setTitle('📝 تقديم إثبات إنجاز')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('proof_text')
              .setLabel('نص الإثبات (شرح الإنجاز)')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMinLength(5)
              .setMaxLength(500)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('proof_image')
              .setLabel('رابط صورة (اختياري)')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setPlaceholder('https://...')
          )
        );
      await interaction.showModal(modal);
      return;
    }

    // ----- تقديم الإثبات وإنهاء المهمة -----
    if (interaction.isModalSubmit() && interaction.customId.startsWith('task_proof_')) {
      const taskId = interaction.customId.split('_')[2];
      const task = await Task.findById(taskId);
      if (!task) return interaction.reply({ content: '❌ المهمة غير موجودة.', ephemeral: true });
      if (task.assignedTo !== interaction.user.id) return interaction.reply({ content: '❌ هذه المهمة ليست موكلة إليك.', ephemeral: true });
      if (task.status === 'completed') return interaction.reply({ content: '⚠️ هذه المهمة مكتملة بالفعل.', ephemeral: true });
      const proofText = interaction.fields.getTextInputValue('proof_text');
      const proofImage = interaction.fields.getTextInputValue('proof_image') || null;
      task.status = 'completed';
      task.completedAt = new Date();
      task.proofText = proofText;
      task.proofImage = proofImage;
      await task.save();
      const user = await getUser(guildId, interaction.user.id);
      user.kl += task.points;
      user.adminPoints += task.adminPoints;
      await user.save();
      const userTasks = user.assignedTasks;
      const idx = userTasks.findIndex(t => t.taskId.toString() === taskId);
      if (idx !== -1) userTasks[idx].status = 'completed';
      await user.save();
      const config = await getGuildConfig(guildId);
      const promotionPoints = config.promotionPoints || 100;
      if (user.adminPoints >= promotionPoints) {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const juniorRole = config.juniorAdminRole ? interaction.guild.roles.cache.get(config.juniorAdminRole) : null;
        if (juniorRole && !member.roles.cache.has(juniorRole.id)) {
          await member.roles.add(juniorRole);
          await interaction.followUp({ content: `🎉 ترقية! لقد وصلت إلى رتبة الإداري الصغري.`, ephemeral: true });
          user.adminPoints -= promotionPoints;
          await user.save();
        } else {
          await interaction.followUp({ content: `🎉 لقد تجاوزت نقاط الترقية، لكن لا توجد رتبة أعلى متاحة.`, ephemeral: true });
        }
      }
      // ====== إصلاح الخطأ هنا ======
      const creator = await interaction.guild.members.fetch(task.assignedBy).catch(() => null);
      // ==============================
      await interaction.reply({
        content: `✅ تم إنهاء المهمة **${task.title}**\nحصلت على **${task.points} KL** و **${task.adminPoints} نقاط إدارية**.\nالإثبات: ${proofText}${proofImage ? `\n[صورة](${proofImage})` : ''}`,
        ephemeral: true
      });
      return;
    }

    // ============================================================
    // == معالجات المتجر (الجديدة) ==
    // ============================================================

    // ----- زر فتح مودال إضافة منتج -----
    if (interaction.isButton() && interaction.customId === 'open_add_product_modal') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية.', ephemeral: true });
      }
      const modal = new ModalBuilder()
        .setCustomId('add_product_modal')
        .setTitle('➕ إضافة منتج')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('product_role')
              .setLabel('معرف الرتبة (ID)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder('مثال: 123456789012345678')
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('product_price')
              .setLabel('السعر (KL)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder('مثال: 50')
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('product_desc')
              .setLabel('الوصف (اختياري)')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(false)
              .setPlaceholder('وصف الرتبة...')
          )
        );
      await interaction.showModal(modal);
      return;
    }

    // ----- مودال إضافة منتج -----
    if (interaction.isModalSubmit() && interaction.customId === 'add_product_modal') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية.', ephemeral: true });
      }
      const roleId = interaction.fields.getTextInputValue('product_role').trim();
      const price = parseInt(interaction.fields.getTextInputValue('product_price'));
      const desc = interaction.fields.getTextInputValue('product_desc') || 'لا يوجد وصف';
      if (!roleId || isNaN(price) || price < 1) {
        return interaction.reply({ content: '⚠️ بيانات غير صحيحة. تأكد من المعرف والسعر.', ephemeral: true });
      }
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) {
        return interaction.reply({ content: '❌ الرتبة غير موجودة.', ephemeral: true });
      }
      await addStoreItem(guildId, roleId, price, desc);
      await interaction.reply({ content: `✅ تم إضافة المنتج **${role.name}** بسعر **${price} KL** بنجاح.`, ephemeral: true });
      await logToChannel(guildId, {
        title: '🛒 إضافة منتج',
        color: 0x2b2d31,
        description: `**المنفذ:** ${interaction.user}\n**الرتبة:** ${role.name} (${roleId})\n**السعر:** ${price} KL\n**الوصف:** ${desc}`
      });
      return;
    }

    // ----- اختيار منتج من المتجر (إنشاء طلب) -----
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('store_buy_')) {
      const itemId = interaction.values[0];
      const item = await StoreItem.findById(itemId);
      if (!item) {
        return interaction.reply({ content: '❌ المنتج غير موجود.', ephemeral: true });
      }
      const role = interaction.guild.roles.cache.get(item.roleId);
      if (!role) {
        return interaction.reply({ content: '❌ الرتبة غير موجودة حالياً.', ephemeral: true });
      }
      // التحقق من أن المستخدم ليس لديه طلب معلق
      const existing = await PendingPurchase.findOne({ guildId, userId: interaction.user.id, status: 'pending' });
      if (existing) {
        return interaction.reply({ content: '⚠️ لديك طلب شراء معلق بالفعل. انتظر حتى تتم معالجته.', ephemeral: true });
      }
      // إنشاء طلب الشراء
      const purchase = await createPendingPurchase(guildId, interaction.user.id, item.roleId, role.name, item.price);
      
      // إرسال الطلب إلى قناة البائعين
      const config = await getGuildConfig(guildId);
      const storeChannel = config.storeChannel ? interaction.guild.channels.cache.get(config.storeChannel) : null;
      if (!storeChannel) {
        return interaction.reply({ content: '⚠️ لم يتم تعيين قناة المتجر بعد.', ephemeral: true });
      }
      
      const embed = new EmbedBuilder()
        .setTitle('🛒 طلب شراء جديد')
        .setColor(0x2b2d31)
        .setDescription(`**المشتري:** ${interaction.user} (${interaction.user.id})\n**الرتبة:** ${role.name}\n**السعر:** ${item.price} KL\n**الوصف:** ${item.description || 'لا يوجد'}`)
        .setTimestamp();
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`store_approve_${purchase._id}`)
          .setLabel('✅ تأكيد الشراء')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`store_reject_${purchase._id}`)
          .setLabel('❌ رفض')
          .setStyle(ButtonStyle.Danger)
      );
      
      await storeChannel.send({ content: `<@&${config.sellerRole || ''}>`, embeds: [embed], components: [row] });
      await interaction.reply({ content: `✅ تم إرسال طلب شراء **${role.name}** إلى البائعين.`, ephemeral: true });
      return;
    }

    // ----- أزرار الموافقة على الشراء -----
    if (interaction.isButton() && interaction.customId.startsWith('store_')) {
      const parts = interaction.customId.split('_');
      const action = parts[1];
      const purchaseId = parts[2];
      const purchase = await PendingPurchase.findById(purchaseId);
      if (!purchase) {
        return interaction.reply({ content: '❌ الطلب غير موجود.', ephemeral: true });
      }
      if (purchase.status !== 'pending') {
        return interaction.reply({ content: '⚠️ تمت معالجة هذا الطلب مسبقاً.', ephemeral: true });
      }
      
      const config = await getGuildConfig(guildId);
      // التحقق من صلاحية البائع أو المتحكم
      const isSeller = config.sellerRole && interaction.member.roles.cache.has(config.sellerRole);
      const isAdmin = await hasPermission(interaction.member, guildId);
      if (!isSeller && !isAdmin) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية البائع أو الإدارة.', ephemeral: true });
      }

      if (action === 'approve') {
        const member = await interaction.guild.members.fetch(purchase.userId).catch(() => null);
        if (!member) {
          return interaction.reply({ content: '❌ المستخدم غير موجود في السيرفر.', ephemeral: true });
        }
        const role = interaction.guild.roles.cache.get(purchase.roleId);
        if (!role) {
          return interaction.reply({ content: '❌ الرتبة غير موجودة.', ephemeral: true });
        }
        // خصم العملات
        const user = await getUser(guildId, purchase.userId);
        if (user.kl < purchase.price) {
          return interaction.reply({ content: `⚠️ رصيد المستخدم غير كافٍ. لديه ${user.kl} KL فقط.`, ephemeral: true });
        }
        user.kl -= purchase.price;
        await user.save();
        // منح الرتبة
        await member.roles.add(role);
        // تحديث حالة الطلب
        purchase.status = 'completed';
        await purchase.save();
        
        const embed = new EmbedBuilder()
          .setTitle('✅ تم تأكيد الشراء')
          .setColor(0x2b2d31)
          .setDescription(`تم منح **${role.name}** لـ ${member}.\nالسعر: **${purchase.price} KL**\nالموافق: ${interaction.user}`)
          .setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: false });
        
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle('🎉 تم شراء الرتبة بنجاح!')
            .setDescription(`تم منحك رتبة **${role.name}** في **${interaction.guild.name}**.\nتم خصم **${purchase.price} KL** من رصيدك.`)
            .setColor(0x2b2d31);
          await member.send({ embeds: [dmEmbed] });
        } catch (e) {}
        
        await logToChannel(guildId, {
          title: '🛒 شراء رتبة',
          color: 0x2b2d31,
          description: `**المشتري:** ${member.user.tag}\n**الرتبة:** ${role.name}\n**السعر:** ${purchase.price} KL\n**الموافق:** ${interaction.user.tag}`
        });
        
      } else if (action === 'reject') {
        purchase.status = 'cancelled';
        await purchase.save();
        await interaction.reply({ content: `❌ تم رفض طلب شراء <@${purchase.userId}>.`, ephemeral: false });
        try {
          const userMember = await interaction.guild.members.fetch(purchase.userId);
          await userMember.send(`❌ تم رفض طلب شراء الرتبة **${purchase.roleName}**.`);
        } catch (e) {}
      }
      return;
    }

    // ============================================================
    // == معالجات التذاكر المتطورة (استلام - إضافة عضو - إغلاق) ==
    // ============================================================

    // ----- فتح تذكرة من القائمة المنسدلة -----
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_menu') {
      const sectionName = interaction.values[0];
      const settings = await getTicketSettings(guildId);
      const section = settings.sections.find(s => s.name === sectionName);
      if (!section) {
        return interaction.reply({ content: '❌ قسم غير موجود.', ephemeral: true });
      }
      
      const role = section.roleId ? interaction.guild.roles.cache.get(section.roleId) : null;
      
      // إنشاء قناة التذكرة
      const channel = await interaction.guild.channels.create({
        name: `تذكرة-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: interaction.channel.parentId,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
          },
          ...(role ? [{
            id: role.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
          }] : [])
        ]
      });
      
      // إنشاء سجل التذكرة
      await createTicketLog(guildId, channel.id, interaction.user.id, sectionName);
      
      // الأزرار الجديدة: استلام، إضافة عضو، إغلاق
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('claim_ticket')
          .setLabel('📥 استلام التذكرة')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('add_member_ticket')
          .setLabel('➕ إضافة عضو')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('🔒 إغلاق')
          .setStyle(ButtonStyle.Danger)
      );
      
      const embed = new EmbedBuilder()
        .setTitle('🎫 تذكرة جديدة')
        .setDescription(`**القسم:** ${sectionName}\n**المستخدم:** ${interaction.user}\nاستخدم الأزرار أدناه لإدارة التذكرة.`)
        .setColor(0x2b2d31)
        .setTimestamp();
      
      await channel.send({
        content: `${interaction.user} ${role ? `<@&${role.id}>` : ''}`,
        embeds: [embed],
        components: [row]
      });
      
      await interaction.reply({
        content: `✅ تم إنشاء تذكرتك: ${channel}`,
        ephemeral: true
      });
      return;
    }

    // ----- استلام التذكرة (claim) -----
    if (interaction.isButton() && interaction.customId === 'claim_ticket') {
      if (!interaction.channel.name.startsWith('تذكرة-')) {
        return interaction.reply({ content: '❌ هذه ليست قناة تذكرة.', ephemeral: true });
      }
      
      // منح العضو صلاحية إدارة القناة
      await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
        ManageChannels: true,
      });
      
      // تحديث السجل
      await updateTicketLog(interaction.channel.id, { claimedBy: interaction.user.id, status: 'claimed' });
      
      await interaction.reply({
        content: `✅ ${interaction.user} استلم التذكرة وسيكون مسؤولاً عنها.`,
        ephemeral: false
      });
      
      await interaction.channel.send(`📥 تم استلام التذكرة بواسطة ${interaction.user}.`);
      return;
    }

    // ----- إضافة عضو إلى التذكرة (مودال) -----
    if (interaction.isButton() && interaction.customId === 'add_member_ticket') {
      if (!interaction.channel.name.startsWith('تذكرة-')) {
        return interaction.reply({ content: '❌ هذه ليست قناة تذكرة.', ephemeral: true });
      }
      
      const modal = new ModalBuilder()
        .setCustomId('add_member_modal')
        .setTitle('➕ إضافة عضو إلى التذكرة')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('member_id')
              .setLabel('معرف العضو (ID)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder('مثال: 123456789012345678')
          )
        );
      await interaction.showModal(modal);
      return;
    }

    // ----- مودال إضافة عضو -----
    if (interaction.isModalSubmit() && interaction.customId === 'add_member_modal') {
      const memberId = interaction.fields.getTextInputValue('member_id').trim();
      const member = await interaction.guild.members.fetch(memberId).catch(() => null);
      if (!member) {
        return interaction.reply({ content: '❌ العضو غير موجود.', ephemeral: true });
      }
      
      // إضافة صلاحيات للعضو في قناة التذكرة
      await interaction.channel.permissionOverwrites.edit(member.id, {
        ViewChannel: true,
        SendMessages: true,
      });
      
      // تحديث السجل بإضافة العضو
      const log = await getTicketLogByChannel(interaction.channel.id);
      if (log) {
        const added = log.addedMembers || [];
        if (!added.includes(memberId)) {
          added.push(memberId);
          await updateTicketLog(interaction.channel.id, { addedMembers: added });
        }
      }
      
      await interaction.reply({
        content: `✅ تم إضافة ${member} إلى التذكرة.`,
        ephemeral: true
      });
      
      await interaction.channel.send(`➕ تم إضافة ${member} إلى التذكرة بواسطة ${interaction.user}.`);
      return;
    }

    // ----- إغلاق التذكرة -----
    if (interaction.isButton() && interaction.customId === 'close_ticket') {
      if (!interaction.channel.name.startsWith('تذكرة-')) {
        return interaction.reply({ content: '❌ هذه ليست قناة تذكرة.', ephemeral: true });
      }
      
      // تحديث السجل بالإغلاق
      await updateTicketLog(interaction.channel.id, { status: 'closed', closedAt: new Date() });
      
      await interaction.reply({ content: '🔒 جاري إغلاق التذكرة...', ephemeral: false });
      
      setTimeout(async () => {
        try {
          await interaction.channel.delete();
        } catch (e) {
          console.error('خطأ في حذف التذكرة:', e);
        }
      }, 5000);
      return;
    }

    // ============================================================
    // == معالجات الاقتراحات ==
    // ============================================================

    if (interaction.isButton() && interaction.customId === 'suggest_modal') {
      const config = await getGuildConfig(guildId);
      if (!config.suggestionsChannel) {
        return interaction.reply({ content: '⚠️ لم تُعيّن قناة الاقتراحات.', ephemeral: true });
      }
      const modal = new ModalBuilder()
        .setCustomId('suggest_submit')
        .setTitle('💡 تقديم اقتراح')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('suggest_text')
              .setLabel('نص الاقتراح')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMinLength(5)
              .setMaxLength(1000)
          )
        );
      await interaction.showModal(modal);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'suggest_submit') {
      const config = await getGuildConfig(guildId);
      const text = interaction.fields.getTextInputValue('suggest_text');
      const channel = interaction.guild.channels.cache.get(config.suggestionsChannel);
      if (!channel) {
        return interaction.reply({ content: '⚠️ قناة الاقتراحات غير موجودة.', ephemeral: true });
      }
      const embed = new EmbedBuilder()
        .setTitle('💡 اقتراح جديد')
        .setDescription(text)
        .setColor(parseInt(config.suggestionsColor?.replace('#', '') || '2b2d31', 16))
        .setFooter({ text: `بواسطة ${interaction.user.tag}` })
        .setTimestamp();
      if (config.suggestionsImage) embed.setImage(config.suggestionsImage);
      const msg = await channel.send({ embeds: [embed] });
      await msg.react('👍');
      await msg.react('👎');
      await interaction.reply({ content: '✅ تم إرسال اقتراحك.', ephemeral: true });
      return;
    }

    // ============================================================
    // == معالجات رتب الإشعارات ==
    // ============================================================

    if (interaction.isButton() && ['role_game', 'role_event', 'role_ajr'].includes(interaction.customId)) {
      const roleMap = {
        'role_game': 'Game Notice',
        'role_event': 'Event Notice',
        'role_ajr': 'Ajr Notice'
      };
      const roleName = roleMap[interaction.customId];
      let role = interaction.guild.roles.cache.find(r => r.name === roleName);
      if (!role) {
        role = await interaction.guild.roles.create({
          name: roleName,
          color: '#00ff00',
          reason: 'تم إنشاء الرتبة عبر لوحة الإشعارات'
        });
      }
      if (interaction.member.roles.cache.has(role.id)) {
        await interaction.member.roles.remove(role);
        await interaction.reply({ content: `❌ تم إزالة رتبة ${roleName}.`, ephemeral: true });
      } else {
        await interaction.member.roles.add(role);
        await interaction.reply({ content: `✅ تم إضافة رتبة ${roleName}.`, ephemeral: true });
      }
      return;
    }

    // ============================================================
    // == معالجات تغيير الاسم ==
    // ============================================================

    if (interaction.isButton() && interaction.customId === 'open_name_modal') {
      const modal = new ModalBuilder()
        .setCustomId('change_name_modal')
        .setTitle('✏️ تغيير الاسم')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('new_name')
              .setLabel('الاسم الجديد')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMinLength(2)
              .setMaxLength(32)
          )
        );
      await interaction.showModal(modal);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'change_name_modal') {
      const newName = interaction.fields.getTextInputValue('new_name');
      try {
        await interaction.member.setNickname(newName);
        await setNameCooldown(interaction.user.id);
        await interaction.reply({ content: `✅ تم تغيير اسمك إلى **${newName}**.`, ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: '❌ لا يمكن تغيير الاسم. قد لا تملك الصلاحية.', ephemeral: true });
      }
      return;
    }

    // ============================================================
    // == معالجات تسجيل الدخول للمودات ==
    // ============================================================

    if (interaction.isModalSubmit() && interaction.customId === 'mod_login_modal') {
      const password = interaction.fields.getTextInputValue('mod_password');
      await setModLogin(guildId, interaction.user.id, password);
      await interaction.reply({ content: '✅ تم تسجيل الدخول بنجاح.', ephemeral: true });
      await logToChannel(guildId, {
        title: '🔐 تسجيل مود',
        description: `${interaction.user} سجل دخوله.`
      });
      return;
    }

  } catch (error) {
    console.error('❌ خطأ في معالج التفاعل:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ حدث خطأ.', ephemeral: true }).catch(() => {});
    }
  }
});

// ============================================================
// ========== تشغيل البوت ==========
// ============================================================

client.login(TOKEN);
