// ============================================================
// البوت المتكامل - النسخة النهائية مع سجلات التذاكر (HTML) ومكافآت الفويس والرسائل
// ============================================================

const {
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  PermissionsBitField, ChannelType, ModalBuilder,
  TextInputBuilder, TextInputStyle, ActivityType, MessageFlags,
  SlashCommandBuilder, REST, Routes
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
const CLIENT_ID = process.env.CLIENT_ID || 'YOUR_CLIENT_ID';

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
  ticketLogChannel: String,
  leaveLogChannel: String,
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
  botControllerRole: String,
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
  pt: { type: Number, default: 0 },
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
  type: { type: String, enum: ['leave', 'resignation'], default: 'leave' },
});
const LeaveRequest = mongoose.model('LeaveRequest', LeaveRequestSchema);

const LeaveLogSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  action: { type: String, enum: ['requested', 'approved', 'rejected', 'ended', 'resigned'] },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveRequest' },
  details: String,
  timestamp: { type: Date, default: Date.now },
});
const LeaveLog = mongoose.model('LeaveLog', LeaveLogSchema);

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
    canRestart: { type: Boolean, default: false },
  }],
  text: { type: String, default: 'مرحباً بكم في قسم التذاكر...' },
  image: { type: String, default: 'https://i.imgur.com/GkKqN3G.png' },
  ticketCounter: { type: Number, default: 0 },
});
const TicketSettings = mongoose.model('TicketSettings', TicketSettingsSchema);

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
  messages: [{
    author: String,
    content: String,
    attachments: [String],
    timestamp: Date,
  }],
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

async function isController(userId, guildId) {
  if (OWNER_ID && userId === OWNER_ID) return true;
  const c = await Controller.findOne({ guildId, userId });
  return !!c;
}
async function hasPermission(member, guildId) {
  if (!member) return false;
  if (OWNER_ID && member.id === OWNER_ID) return true;
  if (await isController(member.id, guildId)) return true;
  const config = await getGuildConfig(guildId);
  if (config.botControllerRole && member.roles.cache.has(config.botControllerRole)) return true;
  return false;
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

async function saveTicketMessages(channel) {
  if (!channel) return false;
  const log = await getTicketLogByChannel(channel.id);
  if (!log) return false;
  try {
    const messages = await channel.messages.fetch({ limit: 500 });
    const savedMessages = [];
    for (const msg of messages.values()) {
      savedMessages.push({
        author: msg.author.tag,
        content: msg.content || '',
        attachments: msg.attachments.map(a => a.url),
        timestamp: msg.createdAt,
      });
    }
    log.messages = savedMessages.reverse();
    await log.save();
    return true;
  } catch (error) {
    console.error('❌ خطأ في حفظ رسائل التذكرة:', error);
    return false;
  }
}

async function createLeaveLog(guildId, userId, action, requestId = null, details = '') {
  const log = new LeaveLog({ guildId, userId, action, requestId, details });
  await log.save();
  return log;
}
async function getLeaveLogs(guildId, limit = 50) {
  return await LeaveLog.find({ guildId }).sort({ timestamp: -1 }).limit(limit).populate('requestId');
}

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

async function getWarns(guildId, userId) { return await Warn.find({ guildId, userId }); }
async function addWarn(guildId, userId, reason, moderator) {
  const warn = new Warn({ guildId, userId, reason, moderator });
  await warn.save();
  return await Warn.countDocuments({ guildId, userId });
}
async function clearWarns(guildId, userId) { await Warn.deleteMany({ guildId, userId }); }

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

async function setNameCooldown(userId) {
  await NameCooldown.findOneAndUpdate({ userId }, { timestamp: new Date() }, { upsert: true });
}
async function getNameCooldown(userId) {
  const cd = await NameCooldown.findOne({ userId });
  return cd ? cd.timestamp : null;
}

async function getStoreItems(guildId) { return await StoreItem.find({ guildId }); }
async function addStoreItem(guildId, roleId, price, description) {
  const item = new StoreItem({ guildId, roleId, price, description });
  await item.save();
  return item;
}
async function removeStoreItem(guildId, itemId) {
  return await StoreItem.deleteOne({ guildId, _id: itemId });
}

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

async function getModLogin(guildId, userId) { return await ModLogin.findOne({ guildId, userId }); }
async function setModLogin(guildId, userId, password) {
  await ModLogin.findOneAndUpdate({ guildId, userId }, { modPassword: password, lastLogin: new Date() }, { upsert: true });
}

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

function getGeneralImage(guild, config) {
  if (config.generalImage) return config.generalImage;
  if (config.bannerImage) return config.bannerImage;
  if (guild.iconURL()) return guild.iconURL({ size: 1024 });
  return null;
}

async function generateTicketHTML(channel, logData) {
  let messages = [];
  if (logData.messages && logData.messages.length > 0) {
    messages = logData.messages;
  } else {
    try {
      const fetched = await channel.messages.fetch({ limit: 500 });
      messages = Array.from(fetched.values()).reverse();
      logData.messages = messages.map(msg => ({
        author: msg.author.tag,
        content: msg.content || '',
        attachments: msg.attachments.map(a => a.url),
        timestamp: msg.createdAt,
      }));
      await logData.save();
    } catch (fetchError) {
      console.error('❌ فشل جلب رسائل التذكرة:', fetchError);
      messages = [];
    }
  }

  const creator = await channel.guild.members.fetch(logData.userId).catch(() => null);
  const creatorName = creator ? creator.user.tag : 'غير معروف';
  const createdAt = logData.createdAt instanceof Date ? logData.createdAt : new Date();
  const statusText = logData.status === 'closed' ? 'مغلقة' : 'مفتوحة';

  let messagesHTML = '';
  if (messages.length === 0) {
    messagesHTML = `<div class="message" style="color: #ff6b6b;">⚠️ لا توجد رسائل محفوظة لهذه التذكرة.</div>`;
  } else {
    for (const msg of messages) {
      try {
        const author = msg.author || 'غير معروف';
        const content = msg.content || '(رسالة فارغة)';
        const timestamp = msg.timestamp ? `<t:${Math.floor(new Date(msg.timestamp).getTime() / 1000)}:F>` : 'وقت غير معروف';
        const attachments = msg.attachments && msg.attachments.length > 0
          ? msg.attachments.map(a => `<a href="${a}" target="_blank">${a}</a>`).join(' ')
          : '';

        messagesHTML += `
          <div class="message">
            <div class="author">${author}</div>
            <div class="content">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            <div class="attachments">${attachments}</div>
            <div class="timestamp">${timestamp}</div>
          </div>
        `;
      } catch (msgError) {
        console.error('❌ خطأ في معالجة رسالة:', msgError);
        continue;
      }
    }
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>تقرير التذكرة - ${channel.name}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #2b2d31; color: #e0e0e0; padding: 20px; direction: rtl; }
    .container { max-width: 800px; margin: auto; background: #1e1e22; border-radius: 10px; padding: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.5); }
    h1 { color: #fff; text-align: center; }
    .info { background: #2b2d31; padding: 10px; border-radius: 8px; margin-bottom: 20px; }
    .info span { color: #aaa; }
    .message { background: #2b2d31; margin: 8px 0; padding: 10px; border-radius: 6px; border-right: 3px solid #5865f2; }
    .author { font-weight: bold; color: #5865f2; }
    .content { margin: 4px 0; }
    .attachments { color: #00ffaa; font-size: 0.9em; }
    .timestamp { color: #888; font-size: 0.8em; margin-top: 4px; }
    .footer { text-align: center; margin-top: 20px; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📋 تقرير التذكرة</h1>
    <div class="info">
      <div><span>القناة:</span> #${channel.name}</div>
      <div><span>منشئ التذكرة:</span> ${creatorName}</div>
      <div><span>القسم:</span> ${logData.section || 'غير محدد'}</div>
      <div><span>تاريخ الفتح:</span> <t:${Math.floor(createdAt.getTime() / 1000)}:F></div>
      <div><span>الحالة:</span> ${statusText}</div>
      <div><span>عدد الرسائل المعروضة:</span> ${messages.length}</div>
    </div>
    <h2>المحادثة</h2>
    ${messagesHTML}
    <div class="footer">تم إنشاء هذا التقرير تلقائياً بواسطة البوت.</div>
  </div>
</body>
</html>
  `;
  return html;
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

const voiceSessions = new Map();

client.once('ready', async () => {
  console.log(`✅ البوت جاهز باسم ${client.user.tag}`);
  console.log(`👑 صاحب البوت: ${OWNER_ID}`);
  client.user.setActivity('The Kingdom Never Falls.', { type: ActivityType.Watching });

  setInterval(async () => {
    const now = Date.now();
    for (const [key, session] of voiceSessions) {
      const [guildId, userId] = key.split('-');
      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) continue;
      if (!member.voice.channel) continue;
      const elapsed = now - session.joinTime;
      const newMinutes = Math.floor(elapsed / 60000);
      if (newMinutes > session.minutes) {
        session.minutes = newMinutes;
      }
    }
  }, 10000);

  if (CLIENT_ID && CLIENT_ID !== 'YOUR_CLIENT_ID') {
    const commands = [
      new SlashCommandBuilder().setName('مساعدة').setDescription('عرض قائمة الأوامر'),
      new SlashCommandBuilder().setName('رصيدي').setDescription('عرض رصيدك من PT والنقاط الإدارية'),
      new SlashCommandBuilder().setName('توب').setDescription('عرض أغنى 10 أشخاص في السيرفر'),
      new SlashCommandBuilder().setName('مصرف').setDescription('الحصول على الراتب اليومي'),
      new SlashCommandBuilder().setName('مستوى').setDescription('عرض مستوى عضو').addUserOption(opt => opt.setName('عضو').setDescription('اختر عضواً (اختياري)').setRequired(false)),
      new SlashCommandBuilder().setName('ترتيب').setDescription('عرض ترتيب المستويات'),
      new SlashCommandBuilder().setName('معلومات').setDescription('عرض معلومات عن عضو').addUserOption(opt => opt.setName('عضو').setDescription('اختر عضواً (اختياري)').setRequired(false)),
      new SlashCommandBuilder().setName('سيرفر').setDescription('عرض معلومات عن السيرفر'),
      new SlashCommandBuilder().setName('بينق').setDescription('عرض سرعة الاستجابة'),
      new SlashCommandBuilder().setName('قائمة_المتحكمين').setDescription('عرض قائمة المتحكمين'),
      new SlashCommandBuilder().setName('تغيير_اسم').setDescription('تغيير اسمك المستعار في السيرفر'),
      new SlashCommandBuilder().setName('بانل').setDescription('إنشاء لوحة التذاكر'),
      new SlashCommandBuilder().setName('عرض_تذكرة').setDescription('عرض إعدادات التذاكر'),
      new SlashCommandBuilder().setName('لوق_تذكرة').setDescription('إنشاء تقرير HTML للتذكرة الحالية'),
      new SlashCommandBuilder().setName('متجر').setDescription('فتح المتجر لشراء الرتب'),
      new SlashCommandBuilder().setName('بانل_اضافة_منتج').setDescription('إنشاء لوحة إضافة منتج (للمتحكمين)'),
      new SlashCommandBuilder().setName('رد_تلقائي').setDescription('إضافة رد تلقائي').addStringOption(opt => opt.setName('الكلمة').setDescription('الكلمة المفتاحية').setRequired(true)).addStringOption(opt => opt.setName('الرد').setDescription('نص الرد').setRequired(true)),
      new SlashCommandBuilder().setName('عرض_الردود').setDescription('عرض جميع الردود التلقائية'),
      new SlashCommandBuilder().setName('حذف_رد_تلقائي').setDescription('حذف رد تلقائي').addStringOption(opt => opt.setName('الكلمة').setDescription('الكلمة المفتاحية').setRequired(true)),
      new SlashCommandBuilder().setName('لوحة_المهام').setDescription('فتح لوحة المهام الإدارية'),
      new SlashCommandBuilder().setName('بانل_اجازات').setDescription('فتح لوحة الإجازات (مدير الإجازات)'),
      new SlashCommandBuilder().setName('طلب_اجازة').setDescription('تقديم طلب إجازة'),
      new SlashCommandBuilder().setName('الاجازات_الحالية').setDescription('عرض الإجازات النشطة'),
      new SlashCommandBuilder().setName('سجل_الاجازات').setDescription('عرض سجل الإجازات'),
      new SlashCommandBuilder().setName('بانل_اقتراح').setDescription('إنشاء لوحة الاقتراحات'),
      new SlashCommandBuilder().setName('رتب').setDescription('إنشاء لوحة رتب الإشعارات'),
      new SlashCommandBuilder().setName('تعيين').setDescription('إعدادات البوت (للمالك فقط)').addStringOption(opt => opt.setName('الخيار').setDescription('الخيار المطلوب').setRequired(true)).addStringOption(opt => opt.setName('القيمة').setDescription('القيمة الجديدة').setRequired(false)),
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
      console.log('🔄 جاري تسجيل أوامر سلاش...');
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('✅ تم تسجيل أوامر سلاش بنجاح');
    } catch (error) {
      console.error('❌ فشل تسجيل أوامر سلاش:', error);
    }
  } else {
    console.log('⚠️ CLIENT_ID غير مضبوط. لن تعمل أوامر السلاش.');
  }
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

    if (user.messages % 30 === 0 && user.messages > 0) {
      user.pt += 15;
      await user.save();
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0x2b2d31)
          .setTitle('📝 مكافأة الرسائل')
          .setDescription(`وصلت إلى **${user.messages}** رسالة!\nحصلت على **15 PT** 🎉`)
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
  const key = `${guildId}-${userId}`;

  if (newState.channelId && !oldState.channelId) {
    voiceSessions.set(key, { joinTime: Date.now(), minutes: 0 });
  }

  if (!newState.channelId && oldState.channelId) {
    const session = voiceSessions.get(key);
    if (session) {
      const elapsed = Date.now() - session.joinTime;
      const minutes = Math.floor(elapsed / 60000);
      if (minutes > 0) {
        const user = await getUser(guildId, userId);
        user.pt += minutes;
        await user.save();
        try {
          const member = await newState.guild.members.fetch(userId);
          const dmEmbed = new EmbedBuilder()
            .setColor(0x2b2d31)
            .setTitle('🎧 مكافأة الفويس')
            .setDescription(`قضيت **${minutes}** دقيقة في الفويس.\nحصلت على **${minutes} PT** 🎉`)
            .setFooter({ text: 'استمر في التفاعل لكسب المزيد!' })
            .setTimestamp();
          await member.send({ embeds: [dmEmbed] });
        } catch (e) {
          console.log('❌ تعذر إرسال رسالة خاصة للمستخدم:', userId);
        }
      }
      voiceSessions.delete(key);
    }
  }
});

// ============================================================
// ========== معالج التفاعلات ==========
// ============================================================

client.on('interactionCreate', async (interaction) => {
  if (!interaction.guild) return;
  const guildId = interaction.guild.id;
  const config = await getGuildConfig(guildId);

  // ============================================================
  // ========== معالج أوامر السلاش ==========
  // ============================================================

  if (interaction.isCommand()) {
    const { commandName } = interaction;

    // ----- مساعدة -----
    if (commandName === 'مساعدة') {
      const embed = new EmbedBuilder()
        .setTitle('📖 قائمة الأوامر')
        .setColor(0x2b2d31)
        .addFields(
          { name: '👑 نظام التحكم', value: '`متحكم @شخص` `الغاء_متحكم @شخص` `قائمة_المتحكمين`', inline: false },
          { name: '📋 المهام', value: '`!لوحة_المهام` (للمدراء العلويين) – مع نقاط PT + نقاط إدارية وإثبات', inline: false },
          { name: '📅 الإجازات', value: '`!بانل_اجازات` (لوحة تحكم موحدة للمسؤول)\n`!طلب_اجازة` (للإداريين)\n**أوامر سلاش:** `/بانل_اجازات` `/الاجازات_الحالية` `/سجل_الاجازات`', inline: false },
          { name: '💰 العملة', value: '`!رصيدي` (يعرض PT + نقاط إدارية)\n`!مصرف` (راتب يومي)\n`!اعطاء_عملات` و `!سحب_عملات` (للمتحكمين)\n`!توب` (ترتيب العملة)\n**مكافآت تلقائية:** 15 PT كل 30 رسالة، 1 PT كل دقيقة في الفويس (تُرسل عند الخروج)', inline: false },
          { name: '🛒 المتجر', value: '`!بانل_اضافة_منتج` (للمتحكمين) – لإضافة منتج\n`!متجر` – شراء رتبة عبر القائمة المنسدلة\nيتطلب رتبة بائع (تُعيّن بـ `!تعيين رتبة_بائع`)', inline: false },
          { name: '🔐 تسجيل الدخول', value: '`!تسجيل_الدخول` (للمودات)', inline: false },
          { name: '📊 المستويات', value: '`!مستوى` `!ترتيب`', inline: false },
          { name: '🎫 التذاكر', value: '`!بانل` `!عرض_تذكرة` `!تعيين تذكرة`\n`!لوق_تذكرة` (داخل التذكرة)\n**ملاحظة:** اسم التذكرة = (ايموجي)-(اسم المستخدم)', inline: false },
          { name: '💡 الاقتراحات', value: '`!بانل_اقتراح`', inline: false },
          { name: '🛡️ الإدارة', value: 'حظر، طرد، كتم، تحذير، مسح، قفل، فتح، نقل_كل، طرد_صوتي، كتم_صوتي، فك_كتم_صوتي، إدارة الرتب، القنوات', inline: false },
          { name: '⚙️ الإعدادات', value: '`!تعيين` (للمالك فقط)', inline: false }
        )
        .setFooter({ text: `🔥 البادئة: !` });
      const generalImage = getGeneralImage(interaction.guild, config);
      if (generalImage) embed.setImage(generalImage);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ----- رصيدي -----
    if (commandName === 'رصيدي') {
      const user = await getUser(guildId, interaction.user.id);
      const embed = new EmbedBuilder()
        .setTitle(`💰 رصيد ${interaction.user.username}`)
        .setDescription(`**PT:** ${user.pt}\n**نقاط إدارية:** ${user.adminPoints}`)
        .setColor(0x2b2d31);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ----- توب -----
    if (commandName === 'توب') {
      const top = await User.find({ guildId }).sort({ pt: -1 }).limit(10);
      if (!top.length) {
        return interaction.reply({ content: '📭 لا يوجد أي شخص لديه PT حتى الآن.', ephemeral: true });
      }
      let desc = '';
      let rank = 1;
      for (const entry of top) {
        const member = interaction.guild.members.cache.get(entry.userId);
        const name = member ? member.user.username : `مستخدم ${entry.userId}`;
        desc += `**#${rank}** ${name} - \`${entry.pt} PT\`\n`;
        rank++;
      }
      const embed = new EmbedBuilder().setTitle('🏆 ترتيب أغنى 10 أشخاص').setDescription(desc).setColor(0x2b2d31).setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ----- مصرف -----
    if (commandName === 'مصرف') {
      const user = await getUser(guildId, interaction.user.id);
      const now = Date.now();
      const last = user.lastDaily ? user.lastDaily.getTime() : 0;
      if (now - last < 24 * 60 * 60 * 1000) {
        const remaining = 24 * 60 * 60 * 1000 - (now - last);
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        return interaction.reply({ content: `⏳ يمكنك الحصول على الراتب بعد ${hours} ساعة.`, ephemeral: true });
      }
      const salary = config.dailySalary || 5;
      user.pt += salary;
      user.lastDaily = new Date();
      await user.save();
      await interaction.reply({ content: `✅ تم إضافة **${salary} PT** كراتب يومي. رصيدك الآن: **${user.pt} PT**`, ephemeral: true });
      return;
    }

    // ----- مستوى -----
    if (commandName === 'مستوى') {
      const member = interaction.options.getMember('عضو') || interaction.member;
      const user = await getUser(guildId, member.id);
      const embed = new EmbedBuilder()
        .setTitle(`📊 مستوى ${member.user.username}`)
        .setColor(0x2b2d31)
        .addFields(
          { name: 'المستوى', value: `${user.level}`, inline: true },
          { name: 'XP', value: `${user.xp}/${(user.level + 1) * 100}`, inline: true },
          { name: 'الرسائل', value: `${user.messages}`, inline: true }
        );
      const generalImage = getGeneralImage(interaction.guild, config);
      if (generalImage) embed.setImage(generalImage);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ----- ترتيب -----
    if (commandName === 'ترتيب') {
      const top = await User.find({ guildId }).sort({ level: -1, xp: -1 }).limit(10);
      if (!top.length) return interaction.reply({ content: '📭 لا توجد بيانات مستويات.', ephemeral: true });
      let desc = '';
      let rank = 1;
      for (const entry of top) {
        const member = interaction.guild.members.cache.get(entry.userId);
        const name = member ? member.user.username : `مستخدم ${entry.userId}`;
        desc += `#${rank} ${name} - المستوى ${entry.level} (XP: ${entry.xp})\n`;
        rank++;
      }
      const embed = new EmbedBuilder().setTitle('🏆 ترتيب المستويات').setColor(0x2b2d31).setDescription(desc).setFooter({ text: 'أعلى 10 أعضاء' });
      const generalImage = getGeneralImage(interaction.guild, config);
      if (generalImage) embed.setImage(generalImage);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ----- معلومات -----
    if (commandName === 'معلومات') {
      const member = interaction.options.getMember('عضو') || interaction.member;
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
      const generalImage = getGeneralImage(interaction.guild, config);
      if (generalImage) embed.setImage(generalImage);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ----- سيرفر -----
    if (commandName === 'سيرفر') {
      const embed = new EmbedBuilder()
        .setTitle(interaction.guild.name)
        .setColor(0x2b2d31)
        .setThumbnail(interaction.guild.iconURL())
        .addFields(
          { name: '👥 الأعضاء', value: `${interaction.guild.memberCount}`, inline: true },
          { name: '💬 القنوات', value: `${interaction.guild.channels.cache.size}`, inline: true },
          { name: '👑 المالك', value: `<@${interaction.guild.ownerId}>`, inline: true }
        );
      const generalImage = getGeneralImage(interaction.guild, config);
      if (generalImage) embed.setImage(generalImage);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ----- بينق -----
    if (commandName === 'بينق') {
      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setDescription(`🏓 البينق: ${client.ws.ping}ms`);
      const generalImage = getGeneralImage(interaction.guild, config);
      if (generalImage) embed.setImage(generalImage);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ----- قائمة المتحكمين -----
    if (commandName === 'قائمة_المتحكمين') {
      const controllers = await getControllers(guildId);
      if (!controllers.length) return interaction.reply({ content: '📋 لا يوجد متحكمون.', ephemeral: true });
      const list = controllers.map(id => `<@${id}>`).join('\n');
      const embed = new EmbedBuilder().setTitle('🛡️ قائمة المتحكمين').setColor(0x2b2d31).setDescription(list);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ----- تغيير_اسم -----
    if (commandName === 'تغيير_اسم') {
      const userId = interaction.user.id;
      const last = await getNameCooldown(userId);
      if (last && Date.now() - last.getTime() < 5 * 60 * 60 * 1000) {
        const remaining = Math.ceil((5 * 60 * 60 * 1000 - (Date.now() - last.getTime())) / (60 * 60 * 1000));
        return interaction.reply({ content: `⏳ يمكنك تغيير اسمك بعد ${remaining} ساعة.`, ephemeral: true });
      }
      const embed = new EmbedBuilder().setTitle('✏️ تغيير الاسم').setDescription('اضغط على الزر أدناه لتغيير اسمك المستعار في السيرفر.').setColor(0x2b2d31).setFooter({ text: 'يمكنك تغيير اسمك مرة كل 5 ساعات.' });
      const generalImage = getGeneralImage(interaction.guild, config);
      if (generalImage) embed.setImage(generalImage);
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_name_modal').setLabel('✏️ تغيير الاسم').setStyle(ButtonStyle.Secondary));
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      return;
    }

    // ----- بانل (التذاكر) -----
    if (commandName === 'بانل') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ تحتاج صلاحية متحكم.', ephemeral: true });
      }
      const settings = await getTicketSettings(guildId);
      const imageUrl = settings.image || 'https://i.imgur.com/GkKqN3G.png';
      const embed = new EmbedBuilder().setTitle('🎫 تذاكر دعم فني').setDescription(settings.text).setColor(0x2b2d31).setImage(imageUrl);
      const generalImage = getGeneralImage(interaction.guild, config);
      if (generalImage) embed.setThumbnail(generalImage);
      const options = settings.sections.map(s => ({
        label: s.name,
        value: s.name,
        emoji: s.emoji || '📌',
      }));
      if (!options.length) {
        return interaction.reply({ content: '⚠️ لا توجد أقسام مضافة.', ephemeral: true });
      }
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('ticket_menu').setPlaceholder('📌 اختر القسم...').addOptions(options)
      );
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      return;
    }

    // ----- عرض_تذكرة -----
    if (commandName === 'عرض_تذكرة') {
      const settings = await getTicketSettings(guildId);
      const embed = new EmbedBuilder().setTitle('📋 إعدادات التذاكر').setColor(0x2b2d31)
        .setDescription(`**النص:** ${settings.text}`)
        .addFields(
          { name: '📌 الأقسام', value: settings.sections.map((s, i) => `${i+1}. ${s.emoji || '📌'} **${s.name}** ${s.roleId ? `<@&${s.roleId}>` : '(بدون دور)'}${s.canRestart ? ' 🔄' : ''}`).join('\n') || 'لا يوجد أقسام' },
          { name: '🖼️ الصورة', value: settings.image ? `[رابط](${settings.image})` : 'لا توجد صورة' }
        );
      const generalImage = getGeneralImage(interaction.guild, config);
      if (generalImage) embed.setImage(generalImage);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ----- لوق_تذكرة -----
    if (commandName === 'لوق_تذكرة') {
      const log = await getTicketLogByChannel(interaction.channel.id);
      if (!log) {
        return interaction.reply({ content: '❌ هذه القناة ليست تذكرة مسجلة.', ephemeral: true });
      }
      let htmlBuffer = null;
      let generationFailed = false;
      try {
        const html = await generateTicketHTML(interaction.channel, log);
        htmlBuffer = Buffer.from(html, 'utf-8');
      } catch (e) {
        console.error('❌ خطأ في توليد HTML للوق:', e);
        generationFailed = true;
      }
      const creator = await interaction.guild.members.fetch(log.userId).catch(() => null);
      const claimedBy = log.claimedBy ? await interaction.guild.members.fetch(log.claimedBy).catch(() => null) : null;
      const addedMembersList = log.addedMembers || [];
      const addedMembersMentions = addedMembersList.length ? addedMembersList.map(id => `<@${id}>`).join(', ') : 'لا يوجد';
      const embed = new EmbedBuilder()
        .setTitle('📋 تقرير التذكرة')
        .setColor(0x2b2d31)
        .addFields(
          { name: '🆔 معرف القناة', value: `#${interaction.channel.name}`, inline: true },
          { name: '👤 منشئ التذكرة', value: creator ? creator.toString() : 'غير معروف', inline: true },
          { name: '📂 القسم', value: log.section || 'غير محدد', inline: true },
          { name: '📅 وقت الفتح', value: `<t:${Math.floor(log.createdAt.getTime() / 1000)}:F>`, inline: true },
          { name: '📌 الحالة', value: log.status === 'open' ? '🟢 مفتوحة' : log.status === 'claimed' ? '🟡 مستلمة' : '🔴 مغلقة', inline: true },
          { name: '📥 استلمها', value: claimedBy ? claimedBy.toString() : 'لم تستلم بعد', inline: true },
          { name: '👥 الأعضاء المضافين', value: addedMembersMentions, inline: false },
          { name: '⏱️ وقت الإغلاق', value: log.closedAt ? `<t:${Math.floor(log.closedAt.getTime() / 1000)}:F>` : 'لم تغلق بعد', inline: true }
        )
        .setTimestamp();
      const replyData = {
        content: `📋 تقرير التذكرة **${interaction.channel.name}**${generationFailed ? ' ⚠️ (فشل توليد الملف، لكن التقرير النصي معروض)' : ''}`,
        embeds: [embed]
      };
      if (htmlBuffer) {
        replyData.files = [{ attachment: htmlBuffer, name: `تذكرة-${interaction.channel.name}.html` }];
      }
      await interaction.reply(replyData);
      const logChannelId = config.ticketLogChannel;
      if (logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel) {
          const logData = {
            content: `📋 تقرير التذكرة: ${interaction.channel.name}`,
            embeds: [embed]
          };
          if (htmlBuffer) logData.files = [{ attachment: htmlBuffer, name: `تذكرة-${interaction.channel.name}.html` }];
          await logChannel.send(logData).catch(() => {});
        }
      }
      if (creator) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle('📋 تقرير تذكرتك')
            .setDescription(`تم طلب تقرير تذكرتك \`${interaction.channel.name}\` في **${interaction.guild.name}**`)
            .setColor(0x2b2d31)
            .setTimestamp();
          const dmData = { embeds: [dmEmbed] };
          if (htmlBuffer) dmData.files = [{ attachment: htmlBuffer, name: `تذكرة-${interaction.channel.name}.html` }];
          await creator.send(dmData).catch(() => {});
        } catch (e) {}
      }
      return;
    }

    // ----- متجر -----
    if (commandName === 'متجر') {
      const items = await StoreItem.find({ guildId });
      if (!items.length) {
        return interaction.reply({ content: '📭 لا توجد منتجات في المتجر حالياً.', ephemeral: true });
      }
      const embed = new EmbedBuilder()
        .setTitle('🛒 متجر الرتب')
        .setDescription('اختر الرتبة التي تريد شراءها.\nسيتم إرسال طلبك إلى البائعين للموافقة.')
        .setColor(0x2b2d31);
      if (config.storePanelImage) {
        embed.setImage(config.storePanelImage);
      }
      const options = items.map(item => {
        const role = interaction.guild.roles.cache.get(item.roleId);
        return {
          label: role ? role.name : 'رتبة غير موجودة',
          value: item._id.toString(),
          description: `${item.price} PT`,
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
      await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
      return;
    }

    // ----- بانل_اضافة_منتج -----
    if (commandName === 'بانل_اضافة_منتج') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ تحتاج صلاحية متحكم.', ephemeral: true });
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
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      return;
    }

    // ----- رد_تلقائي -----
    if (commandName === 'رد_تلقائي') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ تحتاج صلاحية متحكم.', ephemeral: true });
      }
      const keyword = interaction.options.getString('الكلمة');
      const reply = interaction.options.getString('الرد');
      const added = await addAutoReply(guildId, keyword, reply);
      await logToChannel(guildId, { title: '💬 إضافة رد تلقائي', color: 0x2b2d31, description: `**${interaction.user}** أضاف رداً تلقائياً:\n**${keyword}** → ${reply}` });
      const embed = new EmbedBuilder()
        .setTitle(added ? '✅ تم إضافة رد تلقائي' : '🔄 تم تحديث رد تلقائي')
        .setColor(0x2b2d31)
        .setDescription(`**الكلمة:** ${keyword}\n**الرد:** ${reply}`)
        .setFooter({ text: 'سيرد البوت تلقائياً عند كتابة هذه الكلمة.' });
      const generalImage = getGeneralImage(interaction.guild, config);
      if (generalImage) embed.setImage(generalImage);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ----- عرض_الردود -----
    if (commandName === 'عرض_الردود') {
      const replies = await getAutoReplies(guildId);
      if (!replies.length) {
        return interaction.reply({ content: '📭 لا توجد ردود تلقائية في هذا السيرفر.', ephemeral: true });
      }
      const list = replies.map((r, i) => `${i+1}. **${r.keyword}** → ${r.reply}${r.image ? ' (🖼️)' : ''}`).join('\n');
      const embed = new EmbedBuilder()
        .setTitle('💬 قائمة الردود التلقائية')
        .setColor(0x2b2d31)
        .setDescription(list)
        .setFooter({ text: `عدد الردود: ${replies.length}` });
      const generalImage = getGeneralImage(interaction.guild, config);
      if (generalImage) embed.setImage(generalImage);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ----- حذف_رد_تلقائي -----
    if (commandName === 'حذف_رد_تلقائي') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ تحتاج صلاحية متحكم.', ephemeral: true });
      }
      const keyword = interaction.options.getString('الكلمة');
      const removed = await removeAutoReply(guildId, keyword);
      if (!removed) {
        return interaction.reply({ content: `⚠️ لا يوجد رد تلقائي للكلمة "${keyword}".`, ephemeral: true });
      }
      await logToChannel(guildId, { title: '🗑️ حذف رد تلقائي', color: 0x2b2d31, description: `**${interaction.user}** حذف الرد التلقائي للكلمة **${keyword}**` });
      const embed = new EmbedBuilder()
        .setTitle('🗑️ تم حذف الرد التلقائي')
        .setColor(0x2b2d31)
        .setDescription(`تم حذف الرد التلقائي للكلمة: **${keyword}**`);
      const generalImage = getGeneralImage(interaction.guild, config);
      if (generalImage) embed.setImage(generalImage);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ----- لوحة_المهام -----
    if (commandName === 'لوحة_المهام') {
      if (!(await isSeniorAdmin(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ هذا الأمر للإداريين العلويين فقط.', ephemeral: true });
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
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      return;
    }

    // ----- بانل_اجازات -----
    if (commandName === 'بانل_اجازات') {
      if (!config.leaveManagerRole || !interaction.member.roles.cache.has(config.leaveManagerRole)) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية الوصول إلى لوحة الاجازات.', ephemeral: true });
      }
      const pending = await LeaveRequest.find({ guildId, status: 'pending' });
      const embed = new EmbedBuilder()
        .setTitle('📅 لوحة إدارة الإجازات والاستقالات')
        .setDescription('استخدم الأزرار أدناه لإدارة الطلبات.')
        .setColor(0x2b2d31)
        .addFields(
          { name: '📋 طلبات معلقة', value: pending.length > 0 ? `**${pending.length}** طلب` : 'لا توجد طلبات معلقة', inline: true },
          { name: '📊 إجازات نشطة', value: `**${await LeaveRequest.countDocuments({ guildId, status: 'approved', endDate: { $gt: new Date() } })}**`, inline: true },
          { name: '📅 إجازات منتهية', value: `**${await LeaveRequest.countDocuments({ guildId, status: 'approved', endDate: { $lt: new Date() } })}**`, inline: true }
        )
        .setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('leave_panel_pending').setLabel('📋 طلبات معلقة').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('leave_panel_active').setLabel('📊 إجازات نشطة').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('leave_panel_logs').setLabel('📜 سجل الإجازات').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('open_resignation_modal').setLabel('📝 تقديم استقالة').setStyle(ButtonStyle.Danger)
      );
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      return;
    }

    // ----- طلب_اجازة -----
    if (commandName === 'طلب_اجازة') {
      if (!(await isJuniorAdmin(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ هذا الأمر للإداريين فقط.', ephemeral: true });
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
      await interaction.showModal(modal);
      return;
    }

    // ----- الاجازات_الحالية -----
    if (commandName === 'الاجازات_الحالية') {
      const now = new Date();
      const activeLeaves = await LeaveRequest.find({
        guildId,
        status: 'approved',
        endDate: { $gt: now }
      }).populate('userId');
      if (activeLeaves.length === 0) {
        return interaction.reply({ content: '📭 لا توجد إجازات نشطة حالياً.', ephemeral: true });
      }
      let desc = '';
      for (const leave of activeLeaves) {
        const member = await interaction.guild.members.fetch(leave.userId).catch(() => null);
        const name = member ? member.user.username : 'مستخدم غير معروف';
        const remaining = Math.ceil((leave.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const remainingText = remaining > 0 ? `⏳ متبقي **${remaining}** يوم` : '🔴 انتهت اليوم';
        const typeText = leave.type === 'resignation' ? '📝 استقالة' : '📅 إجازة';
        desc += `**${name}** - ${typeText}\n${leave.reason}\n📅 ${remainingText}\n`;
      }
      const embed = new EmbedBuilder()
        .setTitle('📊 الإجازات والاستقالات النشطة')
        .setDescription(desc || 'لا توجد إجازات نشطة')
        .setColor(0x2b2d31)
        .setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ----- سجل_الاجازات -----
    if (commandName === 'سجل_الاجازات') {
      const logs = await getLeaveLogs(guildId, 20);
      if (logs.length === 0) {
        return interaction.reply({ content: '📭 لا توجد سجلات إجازات.', ephemeral: true });
      }
      let desc = '';
      for (const log of logs) {
        const member = await interaction.guild.members.fetch(log.userId).catch(() => null);
        const name = member ? member.user.username : 'مستخدم غير معروف';
        const actionMap = {
          'requested': '📩 طلب',
          'approved': '✅ موافقة',
          'rejected': '❌ رفض',
          'ended': '🔚 انتهاء',
          'resigned': '📝 استقالة'
        };
        const request = log.requestId;
        const typeText = request && request.type === 'resignation' ? ' (استقالة)' : '';
        desc += `**${name}** ${actionMap[log.action] || log.action}${typeText} - ${log.details || ''} (${log.timestamp.toLocaleDateString()})\n`;
      }
      const embed = new EmbedBuilder()
        .setTitle('📜 سجل الإجازات والاستقالات')
        .setDescription(desc || 'لا توجد سجلات')
        .setColor(0x2b2d31)
        .setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ----- بانل_اقتراح -----
    if (commandName === 'بانل_اقتراح') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ تحتاج صلاحية متحكم.', ephemeral: true });
      }
      const color = parseInt(config.suggestionsColor?.replace('#', '') || '2b2d31', 16);
      const embed = new EmbedBuilder()
        .setTitle(config.suggestionsTitle || '💡 قناة الاقتراحات')
        .setDescription(config.suggestionsDescription || 'شاركنا اقتراحك!')
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `بواسطة ${interaction.user.tag}` });
      if (config.suggestionsImage) embed.setImage(config.suggestionsImage);
      const generalImage = getGeneralImage(interaction.guild, config);
      if (generalImage) embed.setThumbnail(generalImage);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('suggest_modal').setLabel('📝 تقديم اقتراح').setStyle(ButtonStyle.Primary)
      );
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      return;
    }

    // ----- رتب -----
    if (commandName === 'رتب') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ تحتاج صلاحية متحكم.', ephemeral: true });
      }
      const defaultImage = 'https://i.imgur.com/7dXe7tM.png';
      const imageUrl = config.rolesImage || defaultImage;
      const embed = new EmbedBuilder().setTitle('🔔 رتب الإشعارات').setDescription('اختر الرتب التي تريد استلام إشعارات عنها من خلال الأزرار أدناه.').setColor(0x2b2d31).setImage(imageUrl).setFooter({ text: 'اضغط مرة للحصول على الرتبة، ومرة أخرى لإزالتها.' });
      const generalImage = getGeneralImage(interaction.guild, config);
      if (generalImage) embed.setThumbnail(generalImage);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('role_game').setLabel('🎮 Game Notice').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('role_event').setLabel('📅 Event Notice').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('role_ajr').setLabel('🔊 Ajr Notice').setStyle(ButtonStyle.Secondary)
      );
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      await logToChannel(guildId, { title: '🔔 إنشاء لوحة رتب الإشعارات', color: 0x2b2d31, description: `**${interaction.user}** أنشأ لوحة رتب الإشعارات.` });
      return;
    }

    // ----- تعيين (للمالك فقط) -----
    if (commandName === 'تعيين') {
      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ هذا الأمر للمالك فقط.', ephemeral: true });
      }
      const sub = interaction.options.getString('الخيار')?.toLowerCase();
      const value = interaction.options.getString('القيمة');
      if (!sub) {
        const embed = new EmbedBuilder()
          .setTitle('⚙️ أوامر الإعدادات')
          .setColor(0x2b2d31)
          .addFields(
            { name: '👋 الترحيب', value: '`ترحيب #قناة`، `رسالة_ترحيب نص`، `صورة_ترحيب رابط`، `عنوان_ترحيب نص`، `خلفية_ترحيب [لون/رابط]`', inline: false },
            { name: '📋 اللوق', value: '`سجلات #قناة`' },
            { name: '📋 سجلات التذاكر (HTML)', value: '`قناة_سجلات_تذاكر #قناة`' },
            { name: '📋 سجلات الإجازات', value: '`قناة_سجلات_اجازات #قناة`' },
            { name: '📊 المستويات', value: '`روم_ليفل #قناة`' },
            { name: '🤖 الأوتو لاين', value: '`اوتر_لاين #روم [نص]`، `صورة_اوترلاين #روم رابط`، `تفعيل_اوترلاين #روم`، `تعطيل_اوترلاين #روم`، `حذف_اوترلاين #روم`' },
            { name: '🎫 التذاكر', value: '`تذكرة` (لإدارة الأقسام)' },
            { name: '🔔 رتب الإشعارات', value: '`صورة_رتب رابط`' },
            { name: '🖼️ عام', value: '`صورة_بنر رابط`، `صورة_عامة رابط`' },
            { name: '🚪 دور الدخول', value: '`دور_دخول @دور`' },
            { name: '💡 الاقتراحات', value: '`قناة_اقتراح #قناة`، `عنوان_اقتراح نص`، `وصف_اقتراح نص`، `لون_اقتراح #هيكس`، `صورة_اقتراح رابط`' },
            { name: '👑 الإدارة', value: '`رتبة_اداري_علوي @رتبة`، `رتبة_اداري_صغري @رتبة`، `رتبة_مسؤول_اجازات @رتبة`، `رتبة_تحكم_البوت @رتبة`' },
            { name: '💰 المالية', value: '`نقاط_المهمة [عدد]`، `راتب_يومي [عدد]`، `نقاط_الترقية [عدد]`' },
            { name: '🛒 المتجر', value: '`اضافة_منتج @رتبة السعر [الوصف]`، `حذف_منتج [معرف]`، `صورة_المتجر [رابط]`، `قناة_المتجر #قناة`' },
            { name: '📌 القنوات', value: '`قناة_المهام #قناة`، `قناة_الاجازات #قناة`، `قناة_المودات #قناة`' },
            { name: '🖼️ بانل الإجازات', value: '`صورة_بانل_اجازات [رابط]`' },
            { name: '👤 رتبة البائع', value: '`رتبة_بائع @رتبة`' }
          )
          .setFooter({ text: 'الصيغة: !تعيين [الخيار] [القيمة]' });
        const generalImage = getGeneralImage(interaction.guild, config);
        if (generalImage) embed.setImage(generalImage);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }
      await interaction.reply({ content: '⚠️ استخدم الأمر النصي `!تعيين` لإدارة الإعدادات.', ephemeral: true });
      return;
    }
  }

  // ============================================================
  // ========== معالج الأزرار ==========
  // ============================================================

  if (interaction.isButton()) {
    // ----- أزرار لوحة الإجازات -----
    if (interaction.customId.startsWith('leave_panel_')) {
      if (!config.leaveManagerRole || !interaction.member.roles.cache.has(config.leaveManagerRole)) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية الوصول إلى هذه البيانات.', ephemeral: true });
      }
      const action = interaction.customId.replace('leave_panel_', '');
      try {
        if (action === 'pending') {
          const pending = await LeaveRequest.find({ guildId, status: 'pending' });
          if (!pending.length) {
            return interaction.reply({ content: '📭 لا توجد طلبات معلقة.', ephemeral: true });
          }
          let desc = '';
          for (const req of pending) {
            const member = await interaction.guild.members.fetch(req.userId).catch(() => null);
            const name = member ? member.user.username : 'مستخدم غير معروف';
            const typeText = req.type === 'resignation' ? '📝 استقالة' : '📅 إجازة';
            desc += `**${name}** - ${typeText} - ${req.reason} (${req.duration} يوم)\n`;
          }
          const embed = new EmbedBuilder()
            .setTitle('📋 طلبات الإجازات والاستقالات المعلقة')
            .setDescription(desc)
            .setColor(0x2b2d31)
            .setFooter({ text: `عدد الطلبات: ${pending.length}` })
            .setTimestamp();
          await interaction.reply({ embeds: [embed], ephemeral: true });
        } else if (action === 'active') {
          const now = new Date();
          const active = await LeaveRequest.find({
            guildId,
            status: 'approved',
            endDate: { $gt: now }
          });
          if (!active.length) {
            return interaction.reply({ content: '📭 لا توجد إجازات نشطة.', ephemeral: true });
          }
          let desc = '';
          for (const leave of active) {
            const member = await interaction.guild.members.fetch(leave.userId).catch(() => null);
            const name = member ? member.user.username : 'مستخدم غير معروف';
            const remaining = Math.ceil((leave.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const typeText = leave.type === 'resignation' ? '📝 استقالة' : '📅 إجازة';
            desc += `**${name}** - ${typeText}\n${leave.reason}\n⏳ متبقي **${remaining}** يوم\n`;
          }
          const embed = new EmbedBuilder()
            .setTitle('📊 الإجازات والاستقالات النشطة')
            .setDescription(desc)
            .setColor(0x2b2d31)
            .setTimestamp();
          await interaction.reply({ embeds: [embed], ephemeral: true });
        } else if (action === 'logs') {
          const logs = await getLeaveLogs(guildId, 20);
          if (!logs.length) {
            return interaction.reply({ content: '📭 لا توجد سجلات.', ephemeral: true });
          }
          let desc = '';
          for (const log of logs) {
            const member = await interaction.guild.members.fetch(log.userId).catch(() => null);
            const name = member ? member.user.username : 'مستخدم غير معروف';
            const actionMap = {
              'requested': '📩 طلب',
              'approved': '✅ موافقة',
              'rejected': '❌ رفض',
              'ended': '🔚 انتهاء',
              'resigned': '📝 استقالة'
            };
            const request = log.requestId;
            const typeText = request && request.type === 'resignation' ? ' (استقالة)' : '';
            desc += `**${name}** ${actionMap[log.action] || log.action}${typeText} - ${log.details || ''}\n`;
          }
          const embed = new EmbedBuilder()
            .setTitle('📜 سجل الإجازات والاستقالات')
            .setDescription(desc)
            .setColor(0x2b2d31)
            .setTimestamp();
          await interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
          await interaction.reply({ content: '⚠️ خيار غير معروف.', ephemeral: true });
        }
      } catch (error) {
        console.error('❌ خطأ في معالج لوحة الإجازات:', error);
        await interaction.reply({ content: '❌ حدث خطأ أثناء جلب البيانات.', ephemeral: true });
      }
      return;
    }

    // ----- زر تقديم استقالة -----
    if (interaction.customId === 'open_resignation_modal') {
      if (!config.leaveManagerRole || !interaction.member.roles.cache.has(config.leaveManagerRole)) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية.', ephemeral: true });
      }
      const modal = new ModalBuilder()
        .setCustomId('resignation_modal')
        .setTitle('📝 تقديم استقالة')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('resignation_reason')
              .setLabel('سبب الاستقالة')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMinLength(5)
              .setMaxLength(500)
          )
        );
      await interaction.showModal(modal);
      return;
    }

    // ----- أزرار التذاكر -----
    if (interaction.customId === 'claim_ticket') {
      const log = await getTicketLogByChannel(interaction.channel.id);
      if (!log) {
        return interaction.reply({ content: '❌ هذه القناة ليست تذكرة مسجلة.', ephemeral: true });
      }
      if (log.status === 'closed') {
        return interaction.reply({ content: '❌ هذه التذكرة مغلقة ولا يمكن استلامها.', ephemeral: true });
      }
      if (log.status === 'claimed') {
        return interaction.reply({ content: '❌ هذه التذكرة مستلمة بالفعل بواسطة شخص آخر.', ephemeral: true });
      }
      await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
        ManageChannels: true,
      });
      await updateTicketLog(interaction.channel.id, { claimedBy: interaction.user.id, status: 'claimed' });
      await interaction.reply({
        content: `✅ ${interaction.user} استلم التذكرة وسيكون مسؤولاً عنها.`,
        ephemeral: false
      });
      await interaction.channel.send(`📥 تم استلام التذكرة بواسطة ${interaction.user}.`);
      return;
    }

    if (interaction.customId === 'remove_member_ticket') {
      const isController = await hasPermission(interaction.member, guildId);
      if (!isController) {
        return interaction.reply({ content: '❌ هذا الزر للمتحكمين فقط.', ephemeral: true });
      }
      const log = await getTicketLogByChannel(interaction.channel.id);
      if (!log) {
        return interaction.reply({ content: '❌ هذه القناة ليست تذكرة مسجلة.', ephemeral: true });
      }
      const modal = new ModalBuilder()
        .setCustomId('remove_member_modal')
        .setTitle('❌ إزالة عضو من التذكرة')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('remove_member_input')
              .setLabel('أدخل معرف العضو أو منشنه')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder('@member أو 123456789012345678')
          )
        );
      await interaction.showModal(modal);
      return;
    }

    if (interaction.customId === 'add_member_ticket') {
      const log = await getTicketLogByChannel(interaction.channel.id);
      if (!log) {
        return interaction.reply({ content: '❌ هذه القناة ليست تذكرة مسجلة.', ephemeral: true });
      }
      const modal = new ModalBuilder()
        .setCustomId('add_member_modal')
        .setTitle('➕ إضافة عضو إلى التذكرة')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('member_input')
              .setLabel('أدخل منشن العضو (مثل @user) أو المعرف')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder('@member أو 123456789012345678')
          )
        );
      await interaction.showModal(modal);
      return;
    }

    if (interaction.customId === 'close_ticket') {
      const log = await getTicketLogByChannel(interaction.channel.id);
      if (!log) {
        return interaction.reply({ content: '❌ هذه القناة ليست تذكرة مسجلة.', ephemeral: true });
      }
      const isController = await hasPermission(interaction.member, guildId);
      const isClaimer = log.claimedBy === interaction.user.id;
      const isCreator = log.userId === interaction.user.id;
      if (!isController && !isClaimer && !isCreator) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية لإغلاق هذه التذكرة.\nيمكن للمتحكمين، أو المستلم، أو المنشئ إغلاقها.', ephemeral: true });
      }
      await saveTicketMessages(interaction.channel);
      await updateTicketLog(interaction.channel.id, { status: 'closed', closedAt: new Date() });
      const updatedLog = await getTicketLogByChannel(interaction.channel.id);
      let htmlBuffer = null;
      let generationFailed = false;
      try {
        const html = await generateTicketHTML(interaction.channel, updatedLog);
        htmlBuffer = Buffer.from(html, 'utf-8');
      } catch (e) {
        console.error('❌ خطأ في توليد HTML للإغلاق:', e);
        generationFailed = true;
      }
      const creator = await interaction.guild.members.fetch(log.userId).catch(() => null);
      const claimedBy = log.claimedBy ? await interaction.guild.members.fetch(log.claimedBy).catch(() => null) : null;
      const addedMembersList = log.addedMembers || [];
      const addedMembersMentions = addedMembersList.length ? addedMembersList.map(id => `<@${id}>`).join(', ') : 'لا يوجد';
      const embed = new EmbedBuilder()
        .setTitle('📋 تقرير التذكرة - مغلقة')
        .setColor(0x2b2d31)
        .addFields(
          { name: '🆔 معرف القناة', value: `#${interaction.channel.name}`, inline: true },
          { name: '👤 منشئ التذكرة', value: creator ? creator.toString() : 'غير معروف', inline: true },
          { name: '📂 القسم', value: log.section || 'غير محدد', inline: true },
          { name: '📅 وقت الفتح', value: `<t:${Math.floor(log.createdAt.getTime() / 1000)}:F>`, inline: true },
          { name: '📌 الحالة', value: '🔴 مغلقة', inline: true },
          { name: '📥 استلمها', value: claimedBy ? claimedBy.toString() : 'لم تستلم', inline: true },
          { name: '👥 الأعضاء المضافين', value: addedMembersMentions, inline: false },
          { name: '⏱️ وقت الإغلاق', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        )
        .setTimestamp();
      const replyData = {
        content: `🔒 تم إغلاق التذكرة.${generationFailed ? ' ⚠️ حدث خطأ أثناء توليد ملف HTML، لكن التقرير النصي موجود أدناه.' : ''}`,
        embeds: [embed]
      };
      if (htmlBuffer) {
        replyData.files = [{ attachment: htmlBuffer, name: `تذكرة-${interaction.channel.name}.html` }];
      }
      await interaction.reply(replyData);
      const logChannelId = config.ticketLogChannel;
      if (logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel) {
          const logData = {
            content: `📋 تقرير التذكرة المغلقة: ${interaction.channel.name}`,
            embeds: [embed]
          };
          if (htmlBuffer) logData.files = [{ attachment: htmlBuffer, name: `تذكرة-${interaction.channel.name}.html` }];
          await logChannel.send(logData).catch(() => {});
        }
      }
      if (creator) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle('📋 تقرير تذكرتك المغلقة')
            .setDescription(`تم إغلاق تذكرتك \`${interaction.channel.name}\` في **${interaction.guild.name}**`)
            .setColor(0x2b2d31)
            .setTimestamp();
          const dmData = { embeds: [dmEmbed] };
          if (htmlBuffer) dmData.files = [{ attachment: htmlBuffer, name: `تذكرة-${interaction.channel.name}.html` }];
          await creator.send(dmData).catch(() => {});
        } catch (e) {}
      }
      const settings = await getTicketSettings(guildId);
      const section = settings.sections.find(s => s.name === log.section);
      if (section && section.canRestart) {
        const restartRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`restart_ticket_${log._id}`).setLabel('🔄 إعادة فتح التذكرة').setStyle(ButtonStyle.Primary)
        );
        await interaction.followUp({ content: 'يمكنك إعادة فتح هذه التذكرة عبر الزر أدناه.', components: [restartRow] });
      }
      await deleteTicketLog(interaction.channel.id);
      setTimeout(async () => {
        try {
          await interaction.channel.delete();
        } catch (e) {
          console.error('خطأ في حذف التذكرة:', e);
        }
      }, 5000);
      return;
    }

    if (interaction.customId.startsWith('restart_ticket_')) {
      const logId = interaction.customId.split('_')[2];
      const oldLog = await TicketLog.findById(logId);
      if (!oldLog) return interaction.reply({ content: '❌ سجل التذكرة غير موجود.', ephemeral: true });
      const settings = await getTicketSettings(guildId);
      const section = settings.sections.find(s => s.name === oldLog.section);
      if (!section) return interaction.reply({ content: '❌ القسم غير موجود حالياً.', ephemeral: true });
      settings.ticketCounter += 1;
      await settings.save();
      const ticketNumber = settings.ticketCounter;
      const emoji = section.emoji || '📌';
      const role = section.roleId ? interaction.guild.roles.cache.get(section.roleId) : null;
      const user = await interaction.guild.members.fetch(oldLog.userId).catch(() => null);
      // 🔹 استخدام displayName للحصول على الاسم المعروض
      const username = user ? user.displayName.replace(/\s/g, '_') : 'user';
      const channel = await interaction.guild.channels.create({
        name: `${emoji}-${username}`,
        type: ChannelType.GuildText,
        parent: interaction.channel.parentId,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: oldLog.userId,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
          },
          ...(role ? [{
            id: role.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
          }] : [])
        ]
      });
      let savedMessages = oldLog.messages || [];
      if (savedMessages.length > 0) {
        const embed = new EmbedBuilder()
          .setTitle('📜 سجل المحادثة السابقة')
          .setDescription(`تم استعادة ${savedMessages.length} رسالة من التذكرة السابقة.`)
          .setColor(0x2b2d31)
          .setTimestamp();
        await channel.send({ embeds: [embed] });
        for (const msg of savedMessages) {
          try {
            const content = msg.content || '(رسالة فارغة)';
            await channel.send(`**${msg.author}**: ${content}`);
          } catch (e) {}
        }
      }
      await createTicketLog(guildId, channel.id, oldLog.userId, oldLog.section);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('claim_ticket').setLabel('📥 استلام التذكرة').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('add_member_ticket').setLabel('➕ إضافة عضو').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('remove_member_ticket').setLabel('❌ إزالة عضو').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 إغلاق').setStyle(ButtonStyle.Danger)
      );
      const embed = new EmbedBuilder()
        .setTitle('🔄 تذكرة معاد فتحها')
        .setDescription(`**القسم:** ${oldLog.section}\n**المستخدم:** <@${oldLog.userId}>\n**رقم التذكرة:** #${ticketNumber}\n(تم إعادة فتحها بناءً على طلب ${interaction.user})\n**ملاحظة:** تم استعادة المحادثة السابقة.`)
        .setColor(0x2b2d31)
        .setTimestamp();
      await channel.send({
        content: `<@${oldLog.userId}> ${role ? `<@&${role.id}>` : ''}`,
        embeds: [embed],
        components: [row]
      });
      await interaction.reply({
        content: `✅ تم إعادة فتح التذكرة: ${channel}`,
        ephemeral: true
      });
      return;
    }

    // ----- أزرار المتجر -----
    if (interaction.customId === 'open_add_product_modal') {
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
              .setLabel('السعر (PT)')
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

    if (interaction.customId.startsWith('store_')) {
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
        const user = await getUser(guildId, purchase.userId);
        if (user.pt < purchase.price) {
          return interaction.reply({ content: `⚠️ رصيد المستخدم غير كافٍ. لديه ${user.pt} PT فقط.`, ephemeral: true });
        }
        user.pt -= purchase.price;
        await user.save();
        await member.roles.add(role);
        purchase.status = 'completed';
        await purchase.save();
        const embed = new EmbedBuilder()
          .setTitle('✅ تم تأكيد الشراء')
          .setColor(0x2b2d31)
          .setDescription(`تم منح **${role.name}** لـ ${member}.\nالسعر: **${purchase.price} PT**\nالموافق: ${interaction.user}`)
          .setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: false });
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle('🎉 تم شراء الرتبة بنجاح!')
            .setDescription(`تم منحك رتبة **${role.name}** في **${interaction.guild.name}**.\nتم خصم **${purchase.price} PT** من رصيدك.`)
            .setColor(0x2b2d31);
          await member.send({ embeds: [dmEmbed] });
        } catch (e) {}
        await logToChannel(guildId, {
          title: '🛒 شراء رتبة',
          color: 0x2b2d31,
          description: `**المشتري:** ${member.user.tag}\n**الرتبة:** ${role.name}\n**السعر:** ${purchase.price} PT\n**الموافق:** ${interaction.user.tag}`
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

    // ----- أزرار رتب الإشعارات -----
    if (['role_game', 'role_event', 'role_ajr'].includes(interaction.customId)) {
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

    // ----- زر تغيير الاسم -----
    if (interaction.customId === 'open_name_modal') {
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

    // ----- زر الاقتراحات -----
    if (interaction.customId === 'suggest_modal') {
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
  }

  // ============================================================
  // ========== معالج المودالات ==========
  // ============================================================

  if (interaction.isModalSubmit()) {
    // ----- مودال طلب الإجازة -----
    if (interaction.customId === 'leave_modal') {
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
        type: 'leave',
      });
      await request.save();
      await createLeaveLog(guildId, interaction.user.id, 'requested', request._id, `${reason} (${duration} يوم)`);
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
      if (config.leaveLogChannel) {
        const logChannel = interaction.guild.channels.cache.get(config.leaveLogChannel);
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setTitle('📋 طلب إجازة جديد')
            .setDescription(`**${interaction.user}** طلب إجازة لمدة ${duration} يوم.\nالسبب: ${reason}`)
            .setColor(0x2b2d31)
            .setTimestamp();
          await logChannel.send({ embeds: [logEmbed] });
        }
      }
      await interaction.reply({ content: '✅ تم إرسال طلب إجازتك بنجاح.', ephemeral: true });
      return;
    }

    // ----- مودال تقديم استقالة -----
    if (interaction.customId === 'resignation_modal') {
      const reason = interaction.fields.getTextInputValue('resignation_reason');
      const request = new LeaveRequest({
        guildId,
        userId: interaction.user.id,
        reason,
        duration: 0,
        startDate: new Date(),
        endDate: new Date(),
        type: 'resignation',
        status: 'approved',
      });
      await request.save();
      await createLeaveLog(guildId, interaction.user.id, 'resigned', request._id, `السبب: ${reason}`);
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const adminRoles = [config.seniorAdminRole, config.juniorAdminRole].filter(Boolean);
      for (const roleId of adminRoles) {
        if (member.roles.cache.has(roleId)) await member.roles.remove(roleId).catch(() => {});
      }
      if (config.leaveLogChannel) {
        const logChannel = interaction.guild.channels.cache.get(config.leaveLogChannel);
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setTitle('📝 استقالة جديدة')
            .setDescription(`**${interaction.user}** قدم استقالته.\nالسبب: ${reason}`)
            .setColor(0x2b2d31)
            .setTimestamp();
          await logChannel.send({ embeds: [logEmbed] });
        }
      }
      await interaction.reply({ content: '✅ تم تقديم استقالتك بنجاح.', ephemeral: true });
      return;
    }

    // ----- مودال إضافة عضو -----
    if (interaction.customId === 'add_member_modal') {
      const input = interaction.fields.getTextInputValue('member_input').trim();
      let memberId = input;
      const mentionMatch = input.match(/<@!?(\d+)>/);
      if (mentionMatch) {
        memberId = mentionMatch[1];
      } else if (!/^\d+$/.test(input)) {
        return interaction.reply({ content: '⚠️ الرجاء إدخال منشن صحيح (مثل @user) أو المعرف الرقمي.', ephemeral: true });
      }
      const member = await interaction.guild.members.fetch(memberId).catch(() => null);
      if (!member) {
        return interaction.reply({ content: '❌ العضو غير موجود. تأكد من المعرف أو المنشن.', ephemeral: true });
      }
      await interaction.channel.permissionOverwrites.edit(member.id, {
        ViewChannel: true,
        SendMessages: true,
      });
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

    // ----- مودال إزالة عضو -----
    if (interaction.customId === 'remove_member_modal') {
      const input = interaction.fields.getTextInputValue('remove_member_input').trim();
      let memberId = input;
      const mentionMatch = input.match(/<@!?(\d+)>/);
      if (mentionMatch) {
        memberId = mentionMatch[1];
      } else if (!/^\d+$/.test(input)) {
        return interaction.reply({ content: '⚠️ الرجاء إدخال منشن صحيح (مثل @user) أو المعرف الرقمي.', ephemeral: true });
      }
      const member = await interaction.guild.members.fetch(memberId).catch(() => null);
      if (!member) {
        return interaction.reply({ content: '❌ العضو غير موجود. تأكد من المعرف أو المنشن.', ephemeral: true });
      }
      const log = await getTicketLogByChannel(interaction.channel.id);
      if (log && log.userId === memberId) {
        return interaction.reply({ content: '❌ لا يمكن إزالة منشئ التذكرة.', ephemeral: true });
      }
      await interaction.channel.permissionOverwrites.delete(member.id);
      if (log) {
        const added = log.addedMembers || [];
        const idx = added.indexOf(memberId);
        if (idx !== -1) {
          added.splice(idx, 1);
          await updateTicketLog(interaction.channel.id, { addedMembers: added });
        }
      }
      await interaction.reply({
        content: `✅ تم إزالة ${member} من التذكرة.`,
        ephemeral: true
      });
      await interaction.channel.send(`❌ تم إزالة ${member} من التذكرة بواسطة ${interaction.user}.`);
      return;
    }

    // ----- مودال إنشاء مهمة -----
    if (interaction.customId === 'task_create_modal') {
      const title = interaction.fields.getTextInputValue('task_title');
      const desc = interaction.fields.getTextInputValue('task_desc');
      const toId = interaction.fields.getTextInputValue('task_to');
      const ptPoints = parseInt(interaction.fields.getTextInputValue('task_pt_points')) || 0;
      const adminPoints = parseInt(interaction.fields.getTextInputValue('task_admin_points')) || 0;
      const target = await interaction.guild.members.fetch(toId).catch(() => null);
      if (!target) return interaction.reply({ content: '❌ المستلم غير موجود.', ephemeral: true });
      const task = new Task({
        guildId,
        assignedBy: interaction.user.id,
        assignedTo: toId,
        title,
        description: desc,
        points: ptPoints,
        adminPoints: adminPoints,
      });
      await task.save();
      const user = await getUser(guildId, toId);
      user.assignedTasks.push({ taskId: task._id, status: 'pending' });
      await user.save();
      await interaction.reply({ content: `✅ تم إنشاء المهمة وإرسالها إلى ${target}.\nنقاط PT: ${ptPoints} | نقاط إدارية: ${adminPoints}`, ephemeral: true });
      try { await target.send(`📩 تم تكليفك بمهمة جديدة: **${title}**\nنقاط PT: ${ptPoints} | نقاط إدارية: ${adminPoints}\nاستخدم \`!لوحة_المهام\` لقبولها.`); } catch (e) {}
      return;
    }

    // ----- مودال تقديم إثبات مهمة -----
    if (interaction.customId.startsWith('task_proof_')) {
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
      user.pt += task.points;
      user.adminPoints += task.adminPoints;
      await user.save();
      const userTasks = user.assignedTasks;
      const idx = userTasks.findIndex(t => t.taskId.toString() === taskId);
      if (idx !== -1) userTasks[idx].status = 'completed';
      await user.save();
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
      await interaction.reply({
        content: `✅ تم إنهاء المهمة **${task.title}**\nحصلت على **${task.points} PT** و **${task.adminPoints} نقاط إدارية**.\nالإثبات: ${proofText}${proofImage ? `\n[صورة](${proofImage})` : ''}`,
        ephemeral: true
      });
      return;
    }

    // ----- مودال إضافة منتج -----
    if (interaction.customId === 'add_product_modal') {
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
      await interaction.reply({ content: `✅ تم إضافة المنتج **${role.name}** بسعر **${price} PT** بنجاح.`, ephemeral: true });
      await logToChannel(guildId, {
        title: '🛒 إضافة منتج',
        color: 0x2b2d31,
        description: `**المنفذ:** ${interaction.user}\n**الرتبة:** ${role.name} (${roleId})\n**السعر:** ${price} PT\n**الوصف:** ${desc}`
      });
      return;
    }

    // ----- مودال تغيير الاسم -----
    if (interaction.customId === 'change_name_modal') {
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

    // ----- مودال تقديم اقتراح -----
    if (interaction.customId === 'suggest_submit') {
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

    // ----- مودال تسجيل الدخول للمودات -----
    if (interaction.customId === 'mod_login_modal') {
      const password = interaction.fields.getTextInputValue('mod_password');
      await setModLogin(guildId, interaction.user.id, password);
      await interaction.reply({ content: '✅ تم تسجيل الدخول بنجاح.', ephemeral: true });
      await logToChannel(guildId, {
        title: '🔐 تسجيل مود',
        description: `${interaction.user} سجل دخوله.`
      });
      return;
    }
  }

  // ============================================================
  // ========== معالج القوائم المنسدلة ==========
  // ============================================================

  if (interaction.isStringSelectMenu()) {
    // ----- قائمة التذاكر -----
    if (interaction.customId === 'ticket_menu') {
      const sectionName = interaction.values[0];
      const settings = await getTicketSettings(guildId);
      const section = settings.sections.find(s => s.name === sectionName);
      if (!section) {
        return interaction.reply({ content: '❌ قسم غير موجود.', ephemeral: true });
      }
      settings.ticketCounter += 1;
      await settings.save();
      const ticketNumber = settings.ticketCounter;
      const emoji = section.emoji || '📌';
      const role = section.roleId ? interaction.guild.roles.cache.get(section.roleId) : null;
      // 🔹 استخدام displayName بدلاً من username
      const username = interaction.user.displayName.replace(/\s/g, '_');
      const channel = await interaction.guild.channels.create({
        name: `${emoji}-${username}`,
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
      await createTicketLog(guildId, channel.id, interaction.user.id, sectionName);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('claim_ticket').setLabel('📥 استلام التذكرة').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('add_member_ticket').setLabel('➕ إضافة عضو').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('remove_member_ticket').setLabel('❌ إزالة عضو').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 إغلاق').setStyle(ButtonStyle.Danger)
      );
      const embed = new EmbedBuilder()
        .setTitle('🎫 تذكرة جديدة')
        .setDescription(`**القسم:** ${sectionName}\n**المستخدم:** ${interaction.user}\n**رقم التذكرة:** #${ticketNumber}\nاستخدم الأزرار أدناه لإدارة التذكرة.`)
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

    // ----- قائمة إنهاء المهام -----
    if (interaction.customId === 'task_complete_select') {
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

    // ----- قائمة شراء من المتجر -----
    if (interaction.customId.startsWith('store_buy_')) {
      const itemId = interaction.values[0];
      const item = await StoreItem.findById(itemId);
      if (!item) {
        return interaction.reply({ content: '❌ المنتج غير موجود.', ephemeral: true });
      }
      const role = interaction.guild.roles.cache.get(item.roleId);
      if (!role) {
        return interaction.reply({ content: '❌ الرتبة غير موجودة حالياً.', ephemeral: true });
      }
      const existing = await PendingPurchase.findOne({ guildId, userId: interaction.user.id, status: 'pending' });
      if (existing) {
        return interaction.reply({ content: '⚠️ لديك طلب شراء معلق بالفعل. انتظر حتى تتم معالجته.', ephemeral: true });
      }
      const purchase = await createPendingPurchase(guildId, interaction.user.id, item.roleId, role.name, item.price);
      const storeChannel = config.storeChannel ? interaction.guild.channels.cache.get(config.storeChannel) : null;
      if (!storeChannel) {
        return interaction.reply({ content: '⚠️ لم يتم تعيين قناة المتجر بعد.', ephemeral: true });
      }
      const embed = new EmbedBuilder()
        .setTitle('🛒 طلب شراء جديد')
        .setColor(0x2b2d31)
        .setDescription(`**المشتري:** ${interaction.user} (${interaction.user.id})\n**الرتبة:** ${role.name}\n**السعر:** ${item.price} PT\n**الوصف:** ${item.description || 'لا يوجد'}`)
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
  }
});

// ============================================================
// ========== الأوامر النصية (الكاملة) ==========
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
    // == أوامر العملة (PT) ==
    // ============================================================

    if (cmd === 'رصيدي') {
      const user = await getUser(guildId, message.author.id);
      const embed = new EmbedBuilder()
        .setTitle(`💰 رصيد ${message.author.username}`)
        .setDescription(`**PT:** ${user.pt}\n**نقاط إدارية:** ${user.adminPoints}`)
        .setColor(0x2b2d31);
      await message.channel.send({ embeds: [embed] });
      return;
    }

    if (cmd === 'توب') {
      const top = await User.find({ guildId }).sort({ pt: -1 }).limit(10);
      if (!top.length) {
        await message.reply('📭 لا يوجد أي شخص لديه PT حتى الآن.');
        return;
      }
      let desc = '';
      let rank = 1;
      for (const entry of top) {
        const member = message.guild.members.cache.get(entry.userId);
        const name = member ? member.user.username : `مستخدم ${entry.userId}`;
        desc += `**#${rank}** ${name} - \`${entry.pt} PT\`\n`;
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
      user.pt += amount;
      await user.save();
      const embed = new EmbedBuilder()
        .setTitle('✅ تم إعطاء العملات')
        .setDescription(`تم إعطاء <@${target.id}> **${amount} PT** بنجاح.\nرصيده الآن: **${user.pt} PT**`)
        .setColor(0x2b2d31);
      await message.channel.send({ embeds: [embed] });
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle('💰 استلام PT')
          .setDescription(`تم إعطاؤك **${amount} PT** في **${message.guild.name}**!\nرصيدك الحالي: **${user.pt} PT**`)
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
      if (user.pt < amount) {
        await message.reply(`⚠️ رصيده غير كافٍ. لديه **${user.pt} PT** فقط.`);
        return;
      }
      user.pt -= amount;
      await user.save();
      const embed = new EmbedBuilder()
        .setTitle('✅ تم سحب العملات')
        .setDescription(`تم سحب **${amount} PT** من <@${target.id}>.\nرصيده الآن: **${user.pt} PT**`)
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
      user.pt += salary;
      user.lastDaily = new Date();
      await user.save();
      await message.reply(`✅ تم إضافة **${salary} PT** كراتب يومي. رصيدك الآن: **${user.pt} PT**`);
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
    // == الإجازات (لوحة تحكم موحدة) ==
    // ============================================================

    if (cmd === 'بانل_اجازات' || cmd === 'لوحة_اجازات') {
      if (!(await hasPermission(message.member, guildId))) {
        return message.reply('❌ تحتاج صلاحية متحكم.');
      }

      if (!config.leaveLogChannel) {
        await message.reply('⚠️ لم تُعيّن قناة سجلات الإجازات. استخدم `!تعيين قناة_سجلات_اجازات #قناة`');
      }

      const embed = new EmbedBuilder()
        .setTitle('📅 لوحة إدارة الإجازات والاستقالات')
        .setDescription('اضغط على الزر أدناه لتقديم طلب إجازة أو استقالة، أو استخدم الأزرار الأخرى للإدارة.')
        .setColor(0x2b2d31)
        .setTimestamp();
      if (config.leavePanelImage) {
        embed.setImage(config.leavePanelImage);
      }

      const pending = await LeaveRequest.find({ guildId, status: 'pending' });
      const active = await LeaveRequest.countDocuments({ guildId, status: 'approved', endDate: { $gt: new Date() } });

      embed.addFields(
        { name: '📋 طلبات معلقة', value: pending.length > 0 ? `**${pending.length}** طلب` : 'لا توجد طلبات معلقة', inline: true },
        { name: '📊 إجازات نشطة', value: `**${active}**`, inline: true }
      );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('open_leave_modal').setLabel('📝 طلب إجازة').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('leave_panel_pending').setLabel('📋 طلبات معلقة').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('leave_panel_active').setLabel('📊 إجازات نشطة').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('leave_panel_logs').setLabel('📜 سجل الإجازات').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('open_resignation_modal').setLabel('📝 تقديم استقالة').setStyle(ButtonStyle.Danger)
      );

      await message.channel.send({ embeds: [embed], components: [row] });
      await message.reply('✅ تم إنشاء لوحة الإجازات.');
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
        const typeText = req.type === 'resignation' ? '📝 استقالة' : '📅 إجازة';
        desc += `**${name}** - ${typeText} - ${req.reason} (${req.duration} يوم)\n`;
      }
      const embed = new EmbedBuilder()
        .setTitle('📋 طلبات الإجازات والاستقالات المعلقة')
        .setDescription(desc)
        .setColor(0x2b2d31)
        .setFooter({ text: `عدد الطلبات: ${pending.length}` })
        .setTimestamp();
      
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
          description: `${item.price} PT`,
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
      const log = await getTicketLogByChannel(message.channel.id);
      if (!log) {
        return message.reply('❌ هذه القناة ليست تذكرة مسجلة.');
      }
      
      let htmlBuffer = null;
      let generationFailed = false;
      try {
        const html = await generateTicketHTML(message.channel, log);
        htmlBuffer = Buffer.from(html, 'utf-8');
      } catch (e) {
        console.error('❌ خطأ في توليد HTML للوق:', e);
        generationFailed = true;
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

      const replyData = {
        content: `📋 تقرير التذكرة **${message.channel.name}**${generationFailed ? ' ⚠️ (فشل توليد الملف، لكن التقرير النصي معروض)' : ''}`,
        embeds: [embed]
      };
      if (htmlBuffer) {
        replyData.files = [{ attachment: htmlBuffer, name: `تذكرة-${message.channel.name}.html` }];
      }
      await message.channel.send(replyData);

      const logChannelId = config.ticketLogChannel;
      if (logChannelId) {
        const logChannel = message.guild.channels.cache.get(logChannelId);
        if (logChannel) {
          const logData = {
            content: `📋 تقرير التذكرة: ${message.channel.name}`,
            embeds: [embed]
          };
          if (htmlBuffer) logData.files = [{ attachment: htmlBuffer, name: `تذكرة-${message.channel.name}.html` }];
          await logChannel.send(logData).catch(() => {});
        }
      }

      if (creator) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle('📋 تقرير تذكرتك')
            .setDescription(`تم طلب تقرير تذكرتك \`${message.channel.name}\` في **${message.guild.name}**`)
            .setColor(0x2b2d31)
            .setTimestamp();
          const dmData = { embeds: [dmEmbed] };
          if (htmlBuffer) dmData.files = [{ attachment: htmlBuffer, name: `تذكرة-${message.channel.name}.html` }];
          await creator.send(dmData).catch(() => {});
        } catch (e) {}
      }

      await message.reply({ content: '✅ تم نشر التقرير في الروم وإرساله إلى قناة السجلات ومنشئ التذكرة.', ephemeral: true });
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
            { name: '📋 سجلات التذاكر (HTML)', value: '`قناة_سجلات_تذاكر #قناة`' },
            { name: '📋 سجلات الإجازات', value: '`قناة_سجلات_اجازات #قناة`' },
            { name: '📊 المستويات', value: '`روم_ليفل #قناة`' },
            { name: '🤖 الأوتو لاين', value: '`اوتر_لاين #روم [نص]`، `صورة_اوترلاين #روم رابط`، `تفعيل_اوترلاين #روم`، `تعطيل_اوترلاين #روم`، `حذف_اوترلاين #روم`' },
            { name: '🎫 التذاكر', value: '`تذكرة` (لإدارة الأقسام)' },
            { name: '🔔 رتب الإشعارات', value: '`صورة_رتب رابط`' },
            { name: '🖼️ عام', value: '`صورة_بنر رابط`، `صورة_عامة رابط`' },
            { name: '🚪 دور الدخول', value: '`دور_دخول @دور`' },
            { name: '💡 الاقتراحات', value: '`قناة_اقتراح #قناة`، `عنوان_اقتراح نص`، `وصف_اقتراح نص`، `لون_اقتراح #هيكس`، `صورة_اقتراح رابط`' },
            { name: '👑 الإدارة', value: '`رتبة_اداري_علوي @رتبة`، `رتبة_اداري_صغري @رتبة`، `رتبة_مسؤول_اجازات @رتبة`، `رتبة_تحكم_البوت @رتبة`' },
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

      // ---- قناة سجلات الإجازات ----
      if (sub === 'قناة_سجلات_اجازات' || sub === 'سجلات_اجازات') {
        const channel = message.mentions.channels.first();
        if (!channel) {
          await updateGuildConfig(guildId, { leaveLogChannel: null });
          await message.reply('✅ تم إلغاء تعيين قناة سجلات الإجازات.');
          return;
        }
        await updateGuildConfig(guildId, { leaveLogChannel: channel.id });
        await logToChannel(guildId, { title: '⚙️ إعدادات', color: 0x2b2d31, description: `**${message.author}** عيّن قناة سجلات الإجازات إلى ${channel}` });
        await message.reply(`✅ تم تعيين قناة سجلات الإجازات إلى ${channel}`);
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

      if (sub === 'رتبة_تحكم_البوت') {
        const role = message.mentions.roles.first();
        if (!role) { await message.reply('⚠️ منشن الرتبة.'); return; }
        await updateGuildConfig(guildId, { botControllerRole: role.id });
        await message.reply(`✅ تم تعيين رتبة التحكم بالبوت: ${role}`);
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

      // ============================================================
      // == إدارة التذاكر (مع خيار إعادة التعيين) ==
      // ============================================================

      if (sub === 'تذكرة') {
        const settings = await getTicketSettings(guildId);
        const action = args[1]?.toLowerCase();
        const actionValue = args.slice(2).join(' ');

        if (!action) {
          const embed = new EmbedBuilder()
            .setTitle('⚙️ إدارة التذاكر')
            .setColor(0x2b2d31)
            .addFields(
              { name: '➕ إضافة قسم', value: '`!تعيين تذكرة إضافة [الاسم] @دور :ايموجي: [قابل_لإعادة]`\nمثال: `!تعيين تذكرة إضافة دعم فني @SupportRole 🛠️ قابل_لإعادة`' },
              { name: '🎨 تعيين إيموجي لقسم', value: '`!تعيين تذكرة تعيين_ايموجي [الاسم] :ايموجي:`' },
              { name: '➖ حذف قسم', value: '`!تعيين تذكرة حذف [الاسم]`' },
              { name: '📝 تغيير النص', value: '`!تعيين تذكرة نص [النص]`' },
              { name: '🖼️ تغيير الصورة', value: '`!تعيين تذكرة صورة [رابط]`' },
              { name: '👀 عرض الأقسام', value: '`!عرض_تذكرة`' },
              { name: '🔄 إعادة التعيين', value: 'عند إضافة قسم مع `قابل_لإعادة`، سيظهر زر لإعادة فتح التذكرة بعد الإغلاق.' }
            )
            .setFooter({ text: 'الأقسام الحالية: ' + settings.sections.map(s => `${s.emoji || '📌'} ${s.name}${s.canRestart ? ' (🔄)' : ''}`).join(', ') });
          if (generalImage) embed.setImage(generalImage);
          await message.channel.send({ embeds: [embed] });
          return;
        }

        if (action === 'إضافة') {
          const regex = /^(.+?)\s+<@&(\d+)>\s*(\S+)?\s*(قابل_لإعادة)?$/;
          const parts = actionValue.match(regex);
          if (!parts) { await message.reply('⚠️ الصيغة: `!تعيين تذكرة إضافة [الاسم] @دور :ايموجي: [قابل_لإعادة]`'); return; }
          const sectionName = parts[1].trim();
          const roleId = parts[2];
          const emoji = parts[3] || '📌';
          const canRestart = parts[4] === 'قابل_لإعادة';
          if (settings.sections.find(s => s.name === sectionName)) { await message.reply(`⚠️ قسم "${sectionName}" موجود بالفعل.`); return; }
          settings.sections.push({ name: sectionName, roleId, emoji, canRestart });
          await saveTicketSettings(guildId, settings);
          await logToChannel(guildId, { title: '🎫 إضافة قسم تذكرة', color: 0x2b2d31, description: `**${message.author}** أضاف قسم **${sectionName}** مع دور <@&${roleId}> وإيموجي ${emoji}${canRestart ? ' (قابل لإعادة الفتح)' : ''}` });
          await message.reply(`✅ تم إضافة قسم **${sectionName}** مع دور <@&${roleId}> وإيموجي ${emoji}${canRestart ? ' (قابل لإعادة الفتح)' : ''}.`);
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
        await message.reply(`✅ تم تعيين الراتب اليومي: ${salary} PT`);
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
        await message.reply(`✅ تم إضافة المنتج ${role} بسعر ${price} PT`);
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

      if (sub === 'صورة_بانل_اجازات') {
        if (!value) { await message.reply('⚠️ أدخل رابط الصورة.'); return; }
        await updateGuildConfig(guildId, { leavePanelImage: value });
        await message.reply(`✅ تم تعيين صورة بانل الإجازات: ${value}`);
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
          { name: '📋 المهام', value: '`!لوحة_المهام` (للمدراء العلويين) – مع نقاط PT + نقاط إدارية وإثبات', inline: false },
          { name: '📅 الإجازات', value: '`!بانل_اجازات` (لوحة تحكم موحدة للمسؤول)\n`!طلب_اجازة` (للإداريين)\n**أوامر سلاش:** `/بانل_اجازات` `/الاجازات_الحالية` `/سجل_الاجازات`', inline: false },
          { name: '💰 العملة', value: '`!رصيدي` (يعرض PT + نقاط إدارية)\n`!مصرف` (راتب يومي)\n`!اعطاء_عملات` و `!سحب_عملات` (للمتحكمين)\n`!توب` (ترتيب العملة)\n**مكافآت تلقائية:** 15 PT كل 30 رسالة، 1 PT كل دقيقة في الفويس (تُرسل عند الخروج)', inline: false },
          { name: '🛒 المتجر', value: '`!بانل_اضافة_منتج` (للمتحكمين) – لإضافة منتج\n`!متجر` – شراء رتبة عبر القائمة المنسدلة\nيتطلب رتبة بائع (تُعيّن بـ `!تعيين رتبة_بائع`)', inline: false },
          { name: '🔐 تسجيل الدخول', value: '`!تسجيل_الدخول` (للمودات)', inline: false },
          { name: '📊 المستويات', value: '`!مستوى` `!ترتيب`', inline: false },
          { name: '🎫 التذاكر', value: '`!بانل` `!عرض_تذكرة` `!تعيين تذكرة`\n`!لوق_تذكرة` (داخل التذكرة)\n**ملاحظة:** اسم التذكرة = (ايموجي)-(اسم المستخدم)', inline: false },
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
    // == أوامر الإشراف (جميعها موجودة وتعمل) ==
    // ============================================================

    if (cmd === 'حظر') {
      if (!(await hasPermission(message.member, guildId))) {
        sentReply = await message.reply('❌ تحتاج صلاحية متحكم.');
        deleteAfter(sentReply);
        return;
      }
      const member = message.mentions.members.first();
      if (!member) {
        sentReply = await message.reply('⚠️ منشن العضو.');
        deleteAfter(sentReply);
        return;
      }
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
      if (!(await hasPermission(message.member, guildId))) {
        sentReply = await message.reply('❌ تحتاج صلاحية متحكم.');
        deleteAfter(sentReply);
        return;
      }
      const member = message.mentions.members.first();
      if (!member) {
        sentReply = await message.reply('⚠️ منشن العضو.');
        deleteAfter(sentReply);
        return;
      }
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
      if (!(await hasPermission(message.member, guildId))) {
        sentReply = await message.reply('❌ تحتاج صلاحية متحكم.');
        deleteAfter(sentReply);
        return;
      }
      const member = message.mentions.members.first();
      if (!member) {
        sentReply = await message.reply('⚠️ منشن العضو.');
        deleteAfter(sentReply);
        return;
      }
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
      if (!(await hasPermission(message.member, guildId))) {
        sentReply = await message.reply('❌ تحتاج صلاحية متحكم.');
        deleteAfter(sentReply);
        return;
      }
      const member = message.mentions.members.first();
      if (!member) {
        sentReply = await message.reply('⚠️ منشن العضو.');
        deleteAfter(sentReply);
        return;
      }
      const muteRole = message.guild.roles.cache.find(r => r.name === 'Muted');
      if (!muteRole) {
        sentReply = await message.reply('⚠️ لا يوجد دور Muted.');
        deleteAfter(sentReply);
        return;
      }
      await member.roles.remove(muteRole);
      const embed = new EmbedBuilder().setTitle('🔊 تم فك الكتم').setColor(0x2b2d31).setDescription(`${member.user.tag} تم فك الكتم عنه.`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '🔊 فك كتم', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**المستهدف:** ${member.user.tag}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'تحذير') {
      if (!(await hasPermission(message.member, guildId))) {
        sentReply = await message.reply('❌ تحتاج صلاحية متحكم.');
        deleteAfter(sentReply);
        return;
      }
      const member = message.mentions.members.first();
      if (!member) {
        sentReply = await message.reply('⚠️ منشن العضو.');
        deleteAfter(sentReply);
        return;
      }
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
      if (!(await hasPermission(message.member, guildId))) {
        sentReply = await message.reply('❌ تحتاج صلاحية متحكم.');
        deleteAfter(sentReply);
        return;
      }
      const member = message.mentions.members.first();
      if (!member) {
        sentReply = await message.reply('⚠️ منشن العضو.');
        deleteAfter(sentReply);
        return;
      }
      await clearWarns(guildId, member.id);
      const embed = new EmbedBuilder().setTitle('✅ تم إبطال التحذيرات').setColor(0x2b2d31).setDescription(`تم إلغاء كل تحذيرات ${member.user.tag}.`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '✅ إبطال تحذيرات', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**المستهدف:** ${member.user.tag}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'مسح') {
      if (!(await hasPermission(message.member, guildId))) {
        sentReply = await message.reply('❌ تحتاج صلاحية متحكم.');
        deleteAfter(sentReply);
        return;
      }
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
      if (!(await hasPermission(message.member, guildId))) {
        sentReply = await message.reply('❌ تحتاج صلاحية متحكم.');
        deleteAfter(sentReply);
        return;
      }
      await message.channel.permissionOverwrites.create(message.guild.id, { SendMessages: false });
      const embed = new EmbedBuilder().setTitle('🔒 تم قفل القناة').setColor(0x2b2d31).setDescription(`تم قفل ${message.channel}`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '🔒 قفل قناة', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**القناة:** ${message.channel.name}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'فتح') {
      if (!(await hasPermission(message.member, guildId))) {
        sentReply = await message.reply('❌ تحتاج صلاحية متحكم.');
        deleteAfter(sentReply);
        return;
      }
      await message.channel.permissionOverwrites.delete(message.guild.id);
      const embed = new EmbedBuilder().setTitle('🔓 تم فتح القناة').setColor(0x2b2d31).setDescription(`تم فتح ${message.channel}`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '🔓 فتح قناة', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**القناة:** ${message.channel.name}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'نقل_كل') {
      if (!(await hasPermission(message.member, guildId))) {
        sentReply = await message.reply('❌ تحتاج صلاحية متحكم.');
        deleteAfter(sentReply);
        return;
      }
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
      if (!(await hasPermission(message.member, guildId))) {
        sentReply = await message.reply('❌ تحتاج صلاحية متحكم.');
        deleteAfter(sentReply);
        return;
      }
      const member = message.mentions.members.first();
      if (!member) {
        sentReply = await message.reply('⚠️ منشن العضو.');
        deleteAfter(sentReply);
        return;
      }
      if (!member.voice.channel) {
        sentReply = await message.reply('⚠️ هذا العضو ليس في روم صوتي.');
        deleteAfter(sentReply);
        return;
      }
      await member.voice.disconnect();
      const embed = new EmbedBuilder().setTitle('🔊 تم طرد العضو من الصوت').setColor(0x2b2d31).setDescription(`تم طرد ${member.user.tag} من الروم الصوتي.`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '🔊 طرد من الصوت', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**المستهدف:** ${member.user.tag}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'كتم_صوتي') {
      if (!(await hasPermission(message.member, guildId))) {
        sentReply = await message.reply('❌ تحتاج صلاحية متحكم.');
        deleteAfter(sentReply);
        return;
      }
      const member = message.mentions.members.first();
      if (!member) {
        sentReply = await message.reply('⚠️ منشن العضو.');
        deleteAfter(sentReply);
        return;
      }
      if (!member.voice.channel) {
        sentReply = await message.reply('⚠️ هذا العضو ليس في روم صوتي.');
        deleteAfter(sentReply);
        return;
      }
      await member.voice.setMute(true);
      const embed = new EmbedBuilder().setTitle('🔇 تم الكتم الصوتي').setColor(0x2b2d31).setDescription(`تم كتم صوت ${member.user.tag} في الروم الصوتي.`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '🔇 كتم صوتي', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**المستهدف:** ${member.user.tag}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'فك_كتم_صوتي') {
      if (!(await hasPermission(message.member, guildId))) {
        sentReply = await message.reply('❌ تحتاج صلاحية متحكم.');
        deleteAfter(sentReply);
        return;
      }
      const member = message.mentions.members.first();
      if (!member) {
        sentReply = await message.reply('⚠️ منشن العضو.');
        deleteAfter(sentReply);
        return;
      }
      if (!member.voice.channel) {
        sentReply = await message.reply('⚠️ هذا العضو ليس في روم صوتي.');
        deleteAfter(sentReply);
        return;
      }
      await member.voice.setMute(false);
      const embed = new EmbedBuilder().setTitle('🔊 تم فك الكتم الصوتي').setColor(0x2b2d31).setDescription(`تم فك كتم صوت ${member.user.tag} في الروم الصوتي.`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '🔊 فك كتم صوتي', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**المستهدف:** ${member.user.tag}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'انشاء_قناة') {
      if (!(await hasPermission(message.member, guildId))) {
        sentReply = await message.reply('❌ تحتاج صلاحية متحكم.');
        deleteAfter(sentReply);
        return;
      }
      const name = args.join(' ');
      if (!name) {
        sentReply = await message.reply('⚠️ أدخل اسم القناة.');
        deleteAfter(sentReply);
        return;
      }
      const channel = await message.guild.channels.create({ name, type: ChannelType.GuildText });
      const embed = new EmbedBuilder().setTitle('✅ تم إنشاء القناة').setColor(0x2b2d31).setDescription(`تم إنشاء ${channel}`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '📁 إنشاء قناة', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**القناة:** ${channel.name}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'حذف_قناة') {
      if (!(await hasPermission(message.member, guildId))) {
        sentReply = await message.reply('❌ تحتاج صلاحية متحكم.');
        deleteAfter(sentReply);
        return;
      }
      const channel = message.mentions.channels.first();
      if (!channel) {
        sentReply = await message.reply('⚠️ منشن القناة.');
        deleteAfter(sentReply);
        return;
      }
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
      if (!(await hasPermission(message.member, guildId))) {
        sentReply = await message.reply('❌ تحتاج صلاحية متحكم.');
        deleteAfter(sentReply);
        return;
      }
      const channel = message.mentions.channels.first();
      if (!channel) {
        sentReply = await message.reply('⚠️ منشن القناة.');
        deleteAfter(sentReply);
        return;
      }
      const oldName = channel.name;
      const newName = args.slice(1).join(' ');
      if (!newName) {
        sentReply = await message.reply('⚠️ أدخل الاسم الجديد.');
        deleteAfter(sentReply);
        return;
      }
      await channel.setName(newName);
      const embed = new EmbedBuilder().setTitle('✏️ تم تغيير اسم القناة').setColor(0x2b2d31).setDescription(`تم تغيير اسم القناة إلى ${newName}`);
      if (generalImage) embed.setImage(generalImage);
      sentReply = await message.channel.send({ embeds: [embed] });
      await logToChannel(guildId, { title: '✏️ تغيير اسم قناة', color: 0x2b2d31, description: `**المنفذ:** ${message.author}\n**الاسم القديم:** ${oldName}\n**الاسم الجديد:** ${newName}` });
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'تثبيت') {
      if (!(await hasPermission(message.member, guildId))) {
        sentReply = await message.reply('❌ تحتاج صلاحية متحكم.');
        deleteAfter(sentReply);
        return;
      }
      const msgId = args[0];
      if (!msgId) {
        sentReply = await message.reply('⚠️ أدخل معرف الرسالة.');
        deleteAfter(sentReply);
        return;
      }
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
      if (!(await hasPermission(message.member, guildId))) {
        sentReply = await message.reply('❌ تحتاج صلاحية متحكم.');
        deleteAfter(sentReply);
        return;
      }
      const msgId = args[0];
      if (!msgId) {
        sentReply = await message.reply('⚠️ أدخل معرف الرسالة.');
        deleteAfter(sentReply);
        return;
      }
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
      if (!(await hasPermission(message.member, guildId))) {
        sentReply = await message.reply('❌ تحتاج صلاحية متحكم.');
        deleteAfter(sentReply);
        return;
      }
      const member = message.mentions.members.first();
      if (!member) {
        sentReply = await message.reply('⚠️ منشن العضو.');
        deleteAfter(sentReply);
        return;
      }
      const role = message.mentions.roles.first();
      if (!role) {
        sentReply = await message.reply('⚠️ منشن الرتبة.');
        deleteAfter(sentReply);
        return;
      }
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
      if (!(await hasPermission(message.member, guildId))) {
        sentReply = await message.reply('❌ تحتاج صلاحية متحكم.');
        deleteAfter(sentReply);
        return;
      }
      const member = message.mentions.members.first();
      if (!member) {
        sentReply = await message.reply('⚠️ منشن العضو.');
        deleteAfter(sentReply);
        return;
      }
      const role = message.mentions.roles.first();
      if (!role) {
        sentReply = await message.reply('⚠️ منشن الرتبة.');
        deleteAfter(sentReply);
        return;
      }
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
      if (!text) {
        sentReply = await message.reply('⚠️ اكتب النص.');
        deleteAfter(sentReply);
        return;
      }
      sentReply = await message.channel.send(text);
      deleteAfter(sentReply);
      return;
    }

    if (cmd === 'ايمبد') {
      const fullText = args.join(' ');
      if (!fullText) {
        sentReply = await message.reply('⚠️ الصيغة: `!ايمبد [العنوان] ، [الوصف]`');
        deleteAfter(sentReply);
        return;
      }
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
      if (!(await hasPermission(message.member, guildId))) {
        sentReply = await message.reply('❌ تحتاج صلاحية متحكم.');
        deleteAfter(sentReply);
        return;
      }
      let mentionType = 'everyone';
      let text = args.join(' ');
      if (args[0]?.toLowerCase() === 'here') { mentionType = 'here'; text = args.slice(1).join(' '); }
      if (!text) {
        sentReply = await message.reply('⚠️ اكتب نص الإعلان.');
        deleteAfter(sentReply);
        return;
      }
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
          { name: '📌 الأقسام', value: settings.sections.map((s, i) => `${i+1}. ${s.emoji || '📌'} **${s.name}** ${s.roleId ? `<@&${s.roleId}>` : '(بدون دور)'}${s.canRestart ? ' 🔄' : ''}`).join('\n') || 'لا يوجد أقسام' },
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
// ========== تشغيل البوت ==========
// ============================================================

client.login(TOKEN);
