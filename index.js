// ============================================================
// البوت المتكامل - النسخة النهائية مع الثيم الداكن الموحد والقوائم المندمجة
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
  botControllerRole: String,
  sellerRole: String,
  pointsPerTask: { type: Number, default: 10 },
  promotionPoints: { type: Number, default: 100 },
  leavePanelImage: String,
  storePanelImage: String,
  uiTitle: { type: String, default: '✏️ تغيير الاسم' },
  uiDescription: { type: String, default: 'اضغط على الزر أدناه لتغيير اسمك المستعار في السيرفر.' },
  uiNoteText: { type: String, default: 'يمكنك تغيير اسمك مرة كل 5 ساعات.' },
  uiBannerUrl: { type: String, default: 'https://via.placeholder.com/800x240/1e1f22/5865f2?text=+BANNER+' },
  uiRolesDropdownLabel: { type: String, default: 'اختر الرتبة' },
  uiRolesOptions: { type: [String], default: ['Game Notice', 'Event Notice', 'Ajr Notice'] },
  uiRolesImage: { type: String, default: 'https://i.imgur.com/7dXe7tM.png' },
  uiSuggestTitle: { type: String, default: '💡 قناة الاقتراحات' },
  uiSuggestDescription: { type: String, default: 'شاركنا اقتراحك!' },
  uiSuggestImage: { type: String, default: '' },
  uiSuggestBanner: { type: String, default: 'https://via.placeholder.com/800x240/1e1f22/5865f2?text=+SUGGESTIONS+' },
  uiTicketTitle: { type: String, default: '🎫 تذاكر دعم فني' },
  uiTicketDescription: { type: String, default: 'اختر القسم المناسب لطلب المساعدة.' },
  uiTicketImage: { type: String, default: 'https://i.imgur.com/GkKqN3G.png' },
  uiLeaveTitle: { type: String, default: '📅 لوحة إدارة الإجازات والاستقالات' },
  uiLeaveDescription: { type: String, default: 'استخدم الأزرار أدناه لإدارة الطلبات.' },
  uiLeaveImage: { type: String, default: '' },
  uiStoreTitle: { type: String, default: '🛒 متجر الرتب' },
  uiStoreDescription: { type: String, default: 'اختر الرتبة التي تريد شراءها.' },
  uiStoreImage: { type: String, default: '' },
}, { timestamps: true });
const Config = mongoose.model('Config', ConfigSchema);

const UserSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  messages: { type: Number, default: 0 },
  adminPoints: { type: Number, default: 0 },
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

// ========== نموذج إعدادات الخريطة (جديد) ==========
const MapConfigSchema = new mongoose.Schema({
  guildId: { type: String, unique: true, required: true },
  title: { type: String, default: '🗺️ خريطة السيرفر' },
  description: { type: String, default: 'اضغط على أحد الأزرار أدناه لعرض القنوات التابعة لكل قسم.' },
  banner: { type: String, default: '' },
  sections: [{
    name: String,
    channels: [String] // قائمة معرفات القنوات
  }]
});
const MapConfig = mongoose.model('MapConfig', MapConfigSchema);

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
    const messages = await channel.messages.fetch({ limit: 100 });
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
      const fetched = await channel.messages.fetch({ limit: 100 });
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
        const author = typeof msg.author === 'string' ? msg.author : (msg.author?.tag || msg.author || 'غير معروف');
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

// ========== دوال إعدادات الخريطة (جديد) ==========
async function getMapConfig(guildId) {
  let map = await MapConfig.findOne({ guildId });
  if (!map) {
    map = new MapConfig({ guildId });
    await map.save();
  }
  return map;
}
async function updateMapConfig(guildId, data) {
  await MapConfig.findOneAndUpdate({ guildId }, data, { upsert: true, new: true });
}

// ============================================================
// ========== دوال بيانات القوائم ==========
// ============================================================

function getHelpData() {
  return {
    'general': {
      title: '📌 الأوامر العامة',
      description: 'أوامر أساسية للجميع.',
      fields: [
        { name: 'مساعدة', value: 'عرض هذه القائمة التفاعلية', inline: true },
        { name: 'معلومات', value: 'عرض معلومات عن عضو', inline: true },
        { name: 'سيرفر', value: 'عرض معلومات عن السيرفر', inline: true },
        { name: 'بينق', value: 'عرض سرعة الاستجابة', inline: true },
        { name: 'تغيير_اسم', value: 'فتح لوحة تغيير الاسم', inline: true },
        { name: 'رتب', value: 'فتح لوحة الرتب (قائمة منسدلة)', inline: true },
        { name: 'خريطة', value: 'عرض خريطة السيرفر (القنوات والأقسام)', inline: true },
      ]
    },
    'admin': {
      title: '🛡️ أوامر الإدارة',
      description: 'أوامر للمتحكمين فقط.',
      fields: [
        { name: 'متحكم / الغاء_متحكم', value: 'إدارة صلاحيات التحكم (للمالك)', inline: false },
        { name: 'قائمة_المتحكمين', value: 'عرض قائمة المتحكمين', inline: false },
        { name: 'لوحة_المهام', value: 'فتح لوحة المهام الإدارية', inline: false },
        { name: 'حظر / طرد / كتم / فك_كتم', value: 'إدارة الأعضاء', inline: false },
        { name: 'تحذير / ابطال_تحذيرات', value: 'نظام التحذيرات', inline: false },
        { name: 'مسح / قفل / فتح', value: 'إدارة القنوات', inline: false },
        { name: 'نقل_كل / طرد_صوتي / كتم_صوتي / فك_كتم_صوتي', value: 'إدارة الصوت', inline: false },
        { name: 'انشاء_قناة / حذف_قناة / تغيير_اسم_قناة', value: 'إدارة القنوات', inline: false },
        { name: 'تثبيت / الغاء_تثبيت', value: 'تثبيت الرسائل', inline: false },
        { name: 'اعطاء_رتبة / سحب_رتبة', value: 'إدارة الرتب', inline: false },
        { name: 'اعلان / قول / ايمبد', value: 'أدوات النشر', inline: false },
      ]
    },
    'levels': {
      title: '📊 نظام المستويات',
      description: 'أوامر المستويات والترتيب.',
      fields: [
        { name: 'مستوى', value: 'عرض مستوى عضو', inline: true },
        { name: 'ترتيب', value: 'عرض ترتيب المستويات', inline: true },
        { name: 'روم_ليفل', value: 'تعيين قناة إعلان المستويات (للمالك)', inline: false },
      ]
    },
    'tickets': {
      title: '🎫 نظام التذاكر',
      description: 'إدارة التذاكر والدعم الفني.',
      fields: [
        { name: 'بانل', value: 'إنشاء لوحة التذاكر', inline: false },
        { name: 'عرض_تذكرة', value: 'عرض إعدادات التذاكر', inline: false },
        { name: 'لوق_تذكرة', value: 'توليد تقرير HTML للتذكرة الحالية', inline: false },
        { name: 'تعيين تذكرة', value: 'إدارة أقسام التذاكر (للمالك)', inline: false },
      ]
    },
    'leaves': {
      title: '📅 نظام الإجازات والاستقالات',
      description: 'إدارة طلبات الإجازات والاستقالات.',
      fields: [
        { name: 'بانل_اجازات', value: 'فتح لوحة الإجازات (للمسؤول)', inline: false },
        { name: 'طلب_اجازة', value: 'تقديم طلب إجازة', inline: false },
        { name: 'الاجازات_الحالية', value: 'عرض الإجازات النشطة', inline: false },
        { name: 'سجل_الاجازات', value: 'عرض سجل الإجازات', inline: false },
      ]
    },
    'store': {
      title: '🛒 المتجر',
      description: 'شراء وبيع الرتب.',
      fields: [
        { name: 'متجر', value: 'فتح المتجر لشراء الرتب', inline: false },
        { name: 'بانل_اضافة_منتج', value: 'إضافة منتج جديد (للمتحكمين)', inline: false },
        { name: 'تعيين اضافة_منتج / حذف_منتج', value: 'إدارة المنتجات (للمالك)', inline: false },
      ]
    },
    'autoreply': {
      title: '💬 الردود التلقائية',
      description: 'إدارة الردود التلقائية.',
      fields: [
        { name: 'رد_تلقائي', value: 'إضافة رد تلقائي', inline: false },
        { name: 'عرض_الردود', value: 'عرض جميع الردود التلقائية', inline: false },
        { name: 'حذف_رد_تلقائي', value: 'حذف رد تلقائي', inline: false },
      ]
    },
    'settings': {
      title: '⚙️ الإعدادات',
      description: 'إعدادات البوت (للمالك فقط).',
      fields: [
        { name: 'تعيين', value: 'عرض أو تعيين الإعدادات', inline: false },
        { name: 'البادئة', value: 'جميع الأوامر تبدأ بـ `!`', inline: false },
      ]
    }
  };
}

function getSettingsData() {
  return {
    'welcome': {
      title: '👋 إعدادات الترحيب',
      description: 'إعدادات قناة الترحيب ورسالتها.',
      options: [
        '`ترحيب #قناة` - تعيين قناة الترحيب',
        '`رسالة_ترحيب نص` - تعيين نص الترحيب',
        '`صورة_ترحيب رابط` - تعيين صورة الترحيب',
        '`عنوان_ترحيب نص` - تعيين عنوان الترحيب',
        '`خلفية_ترحيب [لون/رابط]` - تعيين خلفية الترحيب',
        '`دور_دخول @دور` - تعيين دور يُعطى للعضو الجديد'
      ]
    },
    'logs': {
      title: '📋 إعدادات اللوق والسجلات',
      description: 'قنوات تسجيل الأحداث.',
      options: [
        '`سجلات #قناة` - تعيين قناة اللوق العام',
        '`قناة_سجلات_تذاكر #قناة` - تعيين قناة سجلات التذاكر (HTML)',
        '`قناة_سجلات_اجازات #قناة` - تعيين قناة سجلات الإجازات'
      ]
    },
    'levels': {
      title: '📊 إعدادات المستويات',
      description: 'قناة إعلان رفع المستوى.',
      options: [
        '`روم_ليفل #قناة` - تعيين قناة إعلان المستويات'
      ]
    },
    'autoline': {
      title: '🤖 إعدادات الأوتو لاين',
      description: 'رسائل أو صور تظهر تلقائياً في قناة.',
      options: [
        '`اوتر_لاين #روم [نص]` - تعيين نص أوتو لاين',
        '`صورة_اوترلاين #روم رابط` - تعيين صورة أوتو لاين',
        '`تفعيل_اوترلاين #روم` - تفعيل الأوتو لاين',
        '`تعطيل_اوترلاين #روم` - تعطيل الأوتو لاين',
        '`حذف_اوترلاين #روم` - حذف الأوتو لاين'
      ]
    },
    'tickets': {
      title: '🎫 إعدادات التذاكر',
      description: 'إدارة أقسام التذاكر.',
      options: [
        '`تذكرة` - عرض تعليمات إدارة التذاكر',
        '`تذكرة إضافة [الاسم] @دور :ايموجي: [قابل_لإعادة]` - إضافة قسم',
        '`تذكرة تعيين_ايموجي [الاسم] :ايموجي:` - تغيير إيموجي القسم',
        '`تذكرة حذف [الاسم]` - حذف قسم',
        '`تذكرة نص [النص]` - تغيير نص لوحة التذاكر',
        '`تذكرة صورة [رابط]` - تغيير صورة لوحة التذاكر'
      ]
    },
    'roles': {
      title: '🔔 إعدادات الرتب (القائمة المنسدلة)',
      description: 'إدارة الرتب التي تظهر في لوحة `رتب`.',
      options: [
        '`اضافة_رتبة [الاسم]` - إضافة رتبة جديدة للقائمة (للمتحكمين)',
        '`صورة_رتب [رابط]` - تعيين صورة لوحة الرتب',
        '`عنوان_قائمة_الرتب [نص]` - تعيين نص القائمة المنسدلة'
      ]
    },
    'general': {
      title: '🖼️ الإعدادات العامة',
      description: 'صور وبنرات عامة.',
      options: [
        '`صورة_بنر رابط` - تعيين صورة البنر العامة',
        '`صورة_عامة رابط` - تعيين الصورة العامة (تُستخدم في التذييلات)',
        '`بانر_عام رابط` - تعيين البانر العام (يظهر في العديد من اللوحات)'
      ]
    },
    'suggestions': {
      title: '💡 إعدادات الاقتراحات',
      description: 'قناة الاقتراحات وتنسيقها.',
      options: [
        '`قناة_اقتراح #قناة` - تعيين قناة الاقتراحات',
        '`عنوان_اقتراح نص` - تعيين عنوان لوحة الاقتراحات',
        '`وصف_اقتراح نص` - تعيين وصف لوحة الاقتراحات',
        '`لون_اقتراح #هيكس` - تعيين لون الاقتراحات',
        '`صورة_اقتراح رابط` - تعيين صورة الاقتراحات',
        '`عنوان_اقتراح_بانل [نص]` - عنوان لوحة الاقتراحات',
        '`وصف_اقتراح_بانل [نص]` - وصف لوحة الاقتراحات',
        '`صورة_اقتراح_بانل [رابط]` - صورة لوحة الاقتراحات',
        '`بانر_اقتراح_بانل [رابط]` - بانر لوحة الاقتراحات'
      ]
    },
    'admin_roles': {
      title: '👑 رتب الإدارة',
      description: 'تعيين رتب الإدارة والتحكم.',
      options: [
        '`رتبة_مسؤول_اجازات @رتبة` - تعيين رتبة مسؤول الإجازات',
        '`رتبة_تحكم_البوت @رتبة` - تعيين رتبة التحكم بالبوت (تتيح صلاحيات متحكم)',
        '`رتبة_بائع @رتبة` - تعيين رتبة البائع في المتجر'
      ]
    },
    'channels': {
      title: '📌 قنوات المهام والإجازات والمودات',
      description: 'تعيين قنوات خاصة بوظائف محددة.',
      options: [
        '`قناة_المهام #قناة` - تعيين قناة المهام',
        '`قناة_الاجازات #قناة` - تعيين قناة طلبات الإجازات',
        '`قناة_المودات #قناة` - تعيين قناة المودات (تسجيل الدخول)',
        '`قناة_المتجر #قناة` - تعيين قناة المتجر (تظهر فيها طلبات الشراء)'
      ]
    },
    'store': {
      title: '🛒 إعدادات المتجر',
      description: 'إدارة منتجات المتجر وصورته.',
      options: [
        '`اضافة_منتج @رتبة [السعر] [الوصف]` - إضافة منتج',
        '`حذف_منتج [معرف]` - حذف منتج',
        '`صورة_المتجر [رابط]` - تعيين صورة المتجر',
        '`عنوان_متجر_بانل [نص]` - عنوان لوحة المتجر',
        '`وصف_متجر_بانل [نص]` - وصف لوحة المتجر',
        '`صورة_متجر_بانل [رابط]` - صورة لوحة المتجر'
      ]
    },
    'ui_panels': {
      title: '✏️ واجهات المستخدم (لوحات)',
      description: 'تخصيص لوحات تغيير الاسم، الإجازات، التذاكر، إلخ.',
      options: [
        '`عنوان_الاسم [نص]` - عنوان لوحة تغيير الاسم',
        '`وصف_الاسم [نص]` - وصف لوحة تغيير الاسم',
        '`ملاحظة_الاسم [نص]` - نص الملاحظة في لوحة تغيير الاسم',
        '`بانر_الاسم [رابط]` - بانر لوحة تغيير الاسم',
        '`عنوان_اجازة_بانل [نص]` - عنوان لوحة الإجازات',
        '`وصف_اجازة_بانل [نص]` - وصف لوحة الإجازات',
        '`صورة_اجازة_بانل [رابط]` - صورة لوحة الإجازات',
        '`عنوان_تذكرة_بانل [نص]` - عنوان لوحة التذاكر',
        '`وصف_تذكرة_بانل [نص]` - وصف لوحة التذاكر',
        '`صورة_تذكرة_بانل [رابط]` - صورة لوحة التذاكر'
      ]
    },
    'points': {
      title: '⭐ نقاط المهام والترقية',
      description: 'تحديد نقاط المهام والترقية.',
      options: [
        '`نقاط_المهمة [عدد]` - تعيين النقاط الافتراضية للمهمة',
        '`نقاط_الترقية [عدد]` - تعيين النقاط المطلوبة للترقية'
      ]
    }
  };
}

// ============================================================
// ========== دوال عرض اللوحات (جميع الأزرار Secondary) ==========
// ============================================================

async function sendHelpPanel(interaction) {
  const helpData = getHelpData();
  const options = Object.keys(helpData).map(key => ({
    label: helpData[key].title,
    value: key,
    emoji: key === 'general' ? '📌' : key === 'admin' ? '🛡️' : key === 'levels' ? '📊' : key === 'tickets' ? '🎫' : key === 'leaves' ? '📅' : key === 'store' ? '🛒' : key === 'autoreply' ? '💬' : '⚙️'
  }));

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('help_menu')
      .setPlaceholder('📖 اختر قسماً لعرض أوامره')
      .addOptions(options)
  );

  const embed = new EmbedBuilder()
    .setTitle('📖 قائمة الأوامر التفاعلية')
    .setDescription('اختر القسم المناسب من القائمة المنسدلة أدناه لعرض أوامره.')
    .setColor(0x2b2d31)
    .setFooter({ text: 'يمكنك أيضاً استخدام الأوامر النصية بادئة !' });

  const generalImage = getGeneralImage(interaction.guild, await getGuildConfig(interaction.guild.id));
  if (generalImage) embed.setImage(generalImage);

  await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
}

async function sendSettingsPanel(interaction) {
  const settingsData = getSettingsData();
  const options = Object.keys(settingsData).map(key => ({
    label: settingsData[key].title,
    value: key,
    emoji: key === 'welcome' ? '👋' : key === 'logs' ? '📋' : key === 'levels' ? '📊' : key === 'autoline' ? '🤖' : key === 'tickets' ? '🎫' : key === 'roles' ? '🔔' : key === 'general' ? '🖼️' : key === 'suggestions' ? '💡' : key === 'admin_roles' ? '👑' : key === 'channels' ? '📌' : key === 'store' ? '🛒' : key === 'ui_panels' ? '✏️' : '⭐'
  }));

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('settings_menu')
      .setPlaceholder('⚙️ اختر قسم الإعدادات')
      .addOptions(options)
  );

  const embed = new EmbedBuilder()
    .setTitle('⚙️ لوحة الإعدادات التفاعلية')
    .setDescription('اختر القسم المناسب من القائمة المنسدلة لعرض خيارات الإعداد المتاحة.\nيمكنك تنفيذ الإعداد باستخدام الأمر النصي بالصيغة الموضحة.')
    .setColor(0x2b2d31)
    .setFooter({ text: 'جميع الأوامر تبدأ بـ !' });

  const generalImage = getGeneralImage(interaction.guild, await getGuildConfig(interaction.guild.id));
  if (generalImage) embed.setImage(generalImage);

  await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
}

async function sendNameChangePanel(channel, config, guildId) {
  const botUser = client.user;
  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setAuthor({
      name: botUser.username,
      iconURL: botUser.displayAvatarURL(),
    })
    .setTitle(config.uiTitle || '✏️ تغيير الاسم')
    .setDescription(config.uiDescription || 'اضغط على الزر أدناه لتغيير اسمك المستعار في السيرفر.')
    .setImage(config.uiBannerUrl || 'https://via.placeholder.com/800x240/1e1f22/5865f2?text=+BANNER+')
    .setFooter({ text: config.uiNoteText || 'يمكنك تغيير اسمك مرة كل 5 ساعات.' })
    .setTimestamp();

  const changeButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('change_name_ui')
      .setLabel('تغيير الاسم')
      .setEmoji('✏️')
      .setStyle(ButtonStyle.Secondary)
  );

  await channel.send({ embeds: [embed], components: [changeButton] });
}

async function sendRolesPanel(channel, config, guildId) {
  const botUser = client.user;
  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setAuthor({
      name: botUser.username,
      iconURL: botUser.displayAvatarURL(),
    })
    .setTitle('🔔 رتب الإشعارات')
    .setDescription('اختر الرتبة التي تريد الحصول عليها أو إزالتها من القائمة المنسدلة أدناه.')
    .setImage(config.uiRolesImage || 'https://i.imgur.com/7dXe7tM.png')
    .setFooter({ text: 'اضغط مرة للحصول على الرتبة، ومرة أخرى لإزالتها.' })
    .setTimestamp();
  if (config.uiBannerUrl) embed.setImage(config.uiBannerUrl);

  const roles = config.uiRolesOptions || ['Game Notice', 'Event Notice', 'Ajr Notice'];
  const options = roles.map(r => ({
    label: r,
    value: r,
    emoji: '🔔',
  }));

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('roles_dropdown')
      .setPlaceholder(config.uiRolesDropdownLabel || 'اختر الرتبة')
      .addOptions(options)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

// ============================================================
// ========== دوال خريطة السيرفر (المعدلة) ==========
// ============================================================

/**
 * توليد إمبيد خريطة السيرفر (بدون عرض أسماء الأقسام في الحقول)
 */
async function generateServerMapEmbed(guild, member, config, mapConfig) {
  const embed = new EmbedBuilder()
    .setTitle(mapConfig.title || '🗺️ خريطة السيرفر')
    .setDescription(mapConfig.description || 'اضغط على أحد الأزرار أدناه لعرض القنوات التابعة لكل قسم.')
    .setColor(0x2b2d31)
    .setTimestamp()
    .setFooter({ text: `عدد الأقسام: ${mapConfig.sections?.length || 0}` });

  if (mapConfig.banner) embed.setImage(mapConfig.banner);
  else {
    const generalImage = getGeneralImage(guild, config);
    if (generalImage) embed.setImage(generalImage);
  }

  // لا نضيف أي حقول للأقسام
  return embed;
}

/**
 * بناء أزرار الخريطة (تظهر فقط إذا كان هناك أقسام، وإلا يظهر زر الإضافة فقط)
 * تم إضافة زر "🗑️ حذف قسم"
 */
function buildMapButtons(mapConfig) {
  const rows = [];
  const sections = mapConfig.sections || [];

  // صف التحكم (تحديث + إضافة + حذف)
  const controlRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('refresh_map')
      .setLabel('🔄 تحديث')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('map_add_section')
      .setLabel('➕ إضافة قسم')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('map_delete_section')
      .setLabel('🗑️ حذف قسم')
      .setStyle(ButtonStyle.Secondary)
  );
  rows.push(controlRow);

  // أزرار الأقسام (فقط إذا وجدت)
  if (sections.length > 0) {
    const sectionButtons = sections.map((section, index) => 
      new ButtonBuilder()
        .setCustomId(`map_section_${index}`)
        .setLabel(section.name)
        .setStyle(ButtonStyle.Secondary)
    );
    for (let i = 0; i < sectionButtons.length; i += 5) {
      const chunk = sectionButtons.slice(i, i + 5);
      rows.push(new ActionRowBuilder().addComponents(chunk));
    }
  }

  return rows;
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

client.once('clientReady', async () => {
  console.log(`✅ البوت جاهز باسم ${client.user.tag}`);
  console.log(`👑 صاحب البوت: ${OWNER_ID}`);
  client.user.setActivity('The Kingdom Never Falls.', { type: ActivityType.Watching });

  if (CLIENT_ID && CLIENT_ID !== 'YOUR_CLIENT_ID') {
    const commands = [
      new SlashCommandBuilder().setName('مساعدة').setDescription('عرض قائمة الأوامر التفاعلية'),
      new SlashCommandBuilder().setName('تعيين').setDescription('عرض لوحة الإعدادات التفاعلية'),
      new SlashCommandBuilder().setName('مستوى').setDescription('عرض مستوى عضو').addUserOption(opt => opt.setName('عضو').setDescription('اختر عضواً (اختياري)').setRequired(false)),
      new SlashCommandBuilder().setName('ترتيب').setDescription('عرض ترتيب المستويات'),
      new SlashCommandBuilder().setName('معلومات').setDescription('عرض معلومات عن عضو').addUserOption(opt => opt.setName('عضو').setDescription('اختر عضواً (اختياري)').setRequired(false)),
      new SlashCommandBuilder().setName('سيرفر').setDescription('عرض معلومات عن السيرفر'),
      new SlashCommandBuilder().setName('بينق').setDescription('عرض سرعة الاستجابة'),
      new SlashCommandBuilder().setName('قائمة_المتحكمين').setDescription('عرض قائمة المتحكمين'),
      new SlashCommandBuilder().setName('تغيير_اسم').setDescription('فتح لوحة تغيير الاسم'),
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
      new SlashCommandBuilder().setName('رتب').setDescription('فتح لوحة الرتب (قائمة منسدلة)'),
      new SlashCommandBuilder().setName('اضافة_رتبة').setDescription('إضافة رتبة جديدة إلى القائمة (للمتحكمين)').addStringOption(opt => opt.setName('الاسم').setDescription('اسم الرتبة الجديدة').setRequired(true)),
      new SlashCommandBuilder().setName('خريطة').setDescription('عرض خريطة السيرفر (القنوات والأقسام)'),
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
// ========== نظام المستويات والأوتو لاين ==========
// ============================================================

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  if (message.content.startsWith('!')) return;

  const guildId = message.guild.id;
  const userId = message.author.id;
  const config = await getGuildConfig(guildId);

  try {
    const user = await getUser(guildId, userId);
    user.messages += 1;
    const gain = Math.floor(Math.random() * 15) + 5;
    user.xp += gain;

    const requiredXP = (user.level + 1) * 100;
    if (user.xp >= requiredXP) {
      user.level += 1;
      user.xp = 0;
      await user.save();

      const levelChannelId = config.levelChannelId;
      if (levelChannelId) {
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
  } catch (err) {
    console.error('[XP ERROR]', err);
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
// ========== معالج التفاعلات ==========
// ============================================================

client.on('interactionCreate', async (interaction) => {
  if (!interaction.guild) return;
  const guildId = interaction.guild.id;
  const config = await getGuildConfig(guildId);

  if (interaction.isCommand()) {
    const { commandName } = interaction;

    if (commandName === 'مساعدة') {
      await sendHelpPanel(interaction);
      return;
    }

    if (commandName === 'تعيين') {
      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ هذا الأمر للمالك فقط.', flags: MessageFlags.Ephemeral });
      }
      await sendSettingsPanel(interaction);
      return;
    }

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
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (commandName === 'ترتيب') {
      const top = await User.find({ guildId }).sort({ level: -1, xp: -1 }).limit(10);
      if (!top.length) return interaction.reply({ content: '📭 لا توجد بيانات مستويات.', flags: MessageFlags.Ephemeral });
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
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

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
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

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
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (commandName === 'بينق') {
      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setDescription(`🏓 البينق: ${client.ws.ping}ms`);
      const generalImage = getGeneralImage(interaction.guild, config);
      if (generalImage) embed.setImage(generalImage);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (commandName === 'قائمة_المتحكمين') {
      const controllers = await getControllers(guildId);
      if (!controllers.length) return interaction.reply({ content: '📋 لا يوجد متحكمون.', flags: MessageFlags.Ephemeral });
      const list = controllers.map(id => `<@${id}>`).join('\n');
      const embed = new EmbedBuilder().setTitle('🛡️ قائمة المتحكمين').setColor(0x2b2d31).setDescription(list);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (commandName === 'تغيير_اسم') {
      await sendNameChangePanel(interaction.channel, config, guildId);
      const reply = await interaction.reply({ content: '✅ تم إنشاء لوحة تغيير الاسم.', flags: MessageFlags.Ephemeral });
      setTimeout(async () => {
        try { await reply.delete(); } catch (e) {}
      }, 5000);
      return;
    }

    if (commandName === 'بانل') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ تحتاج صلاحية متحكم.', flags: MessageFlags.Ephemeral });
      }
      const settings = await getTicketSettings(guildId);
      const embed = new EmbedBuilder()
        .setTitle(config.uiTicketTitle || '🎫 تذاكر دعم فني')
        .setDescription(config.uiTicketDescription || 'اختر القسم المناسب لطلب المساعدة.')
        .setColor(0x2b2d31)
        .setImage(config.uiTicketImage || settings.image || 'https://i.imgur.com/GkKqN3G.png')
        .setTimestamp();
      const generalImage = getGeneralImage(interaction.guild, config);
      if (generalImage) embed.setThumbnail(generalImage);
      if (config.uiBannerUrl) embed.setImage(config.uiBannerUrl);
      const options = settings.sections.map(s => ({
        label: s.name,
        value: s.name,
        emoji: s.emoji || '📌',
      }));
      if (!options.length) {
        return interaction.reply({ content: '⚠️ لا توجد أقسام مضافة.', flags: MessageFlags.Ephemeral });
      }
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('ticket_menu').setPlaceholder('📌 اختر القسم...').addOptions(options)
      );
      await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
      return;
    }

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
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (commandName === 'لوق_تذكرة') {
      const log = await getTicketLogByChannel(interaction.channel.id);
      if (!log) {
        return interaction.reply({ content: '❌ هذه القناة ليست تذكرة مسجلة.', flags: MessageFlags.Ephemeral });
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

    if (commandName === 'متجر') {
      const items = await StoreItem.find({ guildId });
      if (!items.length) {
        return interaction.reply({ content: '📭 لا توجد منتجات في المتجر حالياً.', flags: MessageFlags.Ephemeral });
      }
      const embed = new EmbedBuilder()
        .setTitle(config.uiStoreTitle || '🛒 متجر الرتب')
        .setDescription(config.uiStoreDescription || 'اختر الرتبة التي تريد شراءها.')
        .setColor(0x2b2d31);
      if (config.uiStoreImage) embed.setImage(config.uiStoreImage);
      if (config.storePanelImage) embed.setImage(config.storePanelImage);
      if (config.uiBannerUrl) embed.setImage(config.uiBannerUrl);
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
      await interaction.reply({ embeds: [embed], components: rows, flags: MessageFlags.Ephemeral });
      return;
    }

    if (commandName === 'بانل_اضافة_منتج') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ تحتاج صلاحية متحكم.', flags: MessageFlags.Ephemeral });
      }
      const embed = new EmbedBuilder()
        .setTitle('➕ لوحة إضافة منتج')
        .setDescription('اضغط على الزر أدناه لإضافة منتج جديد إلى المتجر.')
        .setColor(0x2b2d31)
        .setTimestamp();
      if (config.uiBannerUrl) embed.setImage(config.uiBannerUrl);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('open_add_product_modal')
          .setLabel('➕ إضافة منتج')
          .setStyle(ButtonStyle.Secondary)
      );
      await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
      return;
    }

    if (commandName === 'رد_تلقائي') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ تحتاج صلاحية متحكم.', flags: MessageFlags.Ephemeral });
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
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (commandName === 'عرض_الردود') {
      const replies = await getAutoReplies(guildId);
      if (!replies.length) {
        return interaction.reply({ content: '📭 لا توجد ردود تلقائية في هذا السيرفر.', flags: MessageFlags.Ephemeral });
      }
      const list = replies.map((r, i) => `${i+1}. **${r.keyword}** → ${r.reply}${r.image ? ' (🖼️)' : ''}`).join('\n');
      const embed = new EmbedBuilder()
        .setTitle('💬 قائمة الردود التلقائية')
        .setColor(0x2b2d31)
        .setDescription(list)
        .setFooter({ text: `عدد الردود: ${replies.length}` });
      const generalImage = getGeneralImage(interaction.guild, config);
      if (generalImage) embed.setImage(generalImage);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (commandName === 'حذف_رد_تلقائي') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ تحتاج صلاحية متحكم.', flags: MessageFlags.Ephemeral });
      }
      const keyword = interaction.options.getString('الكلمة');
      const removed = await removeAutoReply(guildId, keyword);
      if (!removed) {
        return interaction.reply({ content: `⚠️ لا يوجد رد تلقائي للكلمة "${keyword}".`, flags: MessageFlags.Ephemeral });
      }
      await logToChannel(guildId, { title: '🗑️ حذف رد تلقائي', color: 0x2b2d31, description: `**${interaction.user}** حذف الرد التلقائي للكلمة **${keyword}**` });
      const embed = new EmbedBuilder()
        .setTitle('🗑️ تم حذف الرد التلقائي')
        .setColor(0x2b2d31)
        .setDescription(`تم حذف الرد التلقائي للكلمة: **${keyword}**`);
      const generalImage = getGeneralImage(interaction.guild, config);
      if (generalImage) embed.setImage(generalImage);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (commandName === 'لوحة_المهام') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ هذا الأمر للمتحكمين فقط.', flags: MessageFlags.Ephemeral });
      }
      const embed = new EmbedBuilder()
        .setTitle('📋 لوحة المهام الإدارية')
        .setDescription('اختر الإجراء المناسب من الأزرار أدناه.')
        .setColor(0x2b2d31);
      if (config.uiBannerUrl) embed.setImage(config.uiBannerUrl);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('task_create').setLabel('➕ إضافة مهمة').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('task_list').setLabel('📋 عرض المهام').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('task_complete').setLabel('✅ إنهاء مهمة').setStyle(ButtonStyle.Secondary)
      );
      await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
      return;
    }

    if (commandName === 'بانل_اجازات') {
      if (!config.leaveManagerRole || !interaction.member.roles.cache.has(config.leaveManagerRole)) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية الوصول إلى لوحة الاجازات.', flags: MessageFlags.Ephemeral });
      }
      const pending = await LeaveRequest.find({ guildId, status: 'pending' });
      const embed = new EmbedBuilder()
        .setTitle(config.uiLeaveTitle || '📅 لوحة إدارة الإجازات والاستقالات')
        .setDescription(config.uiLeaveDescription || 'استخدم الأزرار أدناه لإدارة الطلبات.')
        .setColor(0x2b2d31)
        .addFields(
          { name: '📋 طلبات معلقة', value: pending.length > 0 ? `**${pending.length}** طلب` : 'لا توجد طلبات معلقة', inline: true },
          { name: '📊 إجازات نشطة', value: `**${await LeaveRequest.countDocuments({ guildId, status: 'approved', endDate: { $gt: new Date() } })}**`, inline: true },
          { name: '📅 إجازات منتهية', value: `**${await LeaveRequest.countDocuments({ guildId, status: 'approved', endDate: { $lt: new Date() } })}**`, inline: true }
        )
        .setTimestamp();
      if (config.uiLeaveImage) embed.setImage(config.uiLeaveImage);
      if (config.leavePanelImage) embed.setImage(config.leavePanelImage);
      if (config.uiBannerUrl) embed.setImage(config.uiBannerUrl);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('leave_panel_pending').setLabel('📋 طلبات معلقة').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('leave_panel_active').setLabel('📊 إجازات نشطة').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('leave_panel_logs').setLabel('📜 سجل الإجازات').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('open_resignation_modal').setLabel('📝 تقديم استقالة').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('open_leave_modal').setLabel('📝 طلب إجازة').setStyle(ButtonStyle.Secondary)
      );
      await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
      return;
    }

    if (commandName === 'طلب_اجازة') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ هذا الأمر للمتحكمين فقط.', flags: MessageFlags.Ephemeral });
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

    if (commandName === 'الاجازات_الحالية') {
      const now = new Date();
      const activeLeaves = await LeaveRequest.find({
        guildId,
        status: 'approved',
        endDate: { $gt: now }
      }).populate('userId');
      if (activeLeaves.length === 0) {
        return interaction.reply({ content: '📭 لا توجد إجازات نشطة حالياً.', flags: MessageFlags.Ephemeral });
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
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (commandName === 'سجل_الاجازات') {
      const logs = await getLeaveLogs(guildId, 20);
      if (logs.length === 0) {
        return interaction.reply({ content: '📭 لا توجد سجلات إجازات.', flags: MessageFlags.Ephemeral });
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
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (commandName === 'بانل_اقتراح') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ تحتاج صلاحية متحكم.', flags: MessageFlags.Ephemeral });
      }
      const color = parseInt(config.suggestionsColor?.replace('#', '') || '2b2d31', 16);
      const embed = new EmbedBuilder()
        .setTitle(config.uiSuggestTitle || config.suggestionsTitle || '💡 قناة الاقتراحات')
        .setDescription(config.uiSuggestDescription || config.suggestionsDescription || 'شاركنا اقتراحك!')
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `بواسطة ${interaction.user.tag}` });
      if (config.uiSuggestImage) embed.setImage(config.uiSuggestImage);
      else if (config.suggestionsImage) embed.setImage(config.suggestionsImage);
      if (config.uiSuggestBanner) embed.setImage(config.uiSuggestBanner);
      if (config.uiBannerUrl) embed.setImage(config.uiBannerUrl);
      const generalImage = getGeneralImage(interaction.guild, config);
      if (generalImage) embed.setThumbnail(generalImage);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('suggest_modal').setLabel('📝 تقديم اقتراح').setStyle(ButtonStyle.Secondary)
      );
      await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
      return;
    }

    if (commandName === 'رتب') {
      await sendRolesPanel(interaction.channel, config, guildId);
      const reply = await interaction.reply({ content: '✅ تم إنشاء لوحة الرتب.', flags: MessageFlags.Ephemeral });
      setTimeout(async () => {
        try { await reply.delete(); } catch (e) {}
      }, 5000);
      return;
    }

    if (commandName === 'اضافة_رتبة') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ تحتاج صلاحية متحكم.', flags: MessageFlags.Ephemeral });
      }
      const roleName = interaction.options.getString('الاسم');
      if (!roleName) return interaction.reply({ content: '⚠️ يرجى إدخال اسم الرتبة.', flags: MessageFlags.Ephemeral });
      
      let roles = config.uiRolesOptions || [];
      if (roles.includes(roleName)) {
        return interaction.reply({ content: `⚠️ الرتبة "${roleName}" موجودة بالفعل.`, flags: MessageFlags.Ephemeral });
      }
      roles.push(roleName);
      await updateGuildConfig(guildId, { uiRolesOptions: roles });
      
      let role = interaction.guild.roles.cache.find(r => r.name === roleName);
      if (!role) {
        try {
          role = await interaction.guild.roles.create({
            name: roleName,
            color: '#00ff00',
            reason: `تم إنشاء الرتبة عبر أمر اضافة_رتبة بواسطة ${interaction.user.tag}`
          });
        } catch (e) {
          console.error('❌ فشل إنشاء الرتبة:', e);
        }
      }
      
      await logToChannel(guildId, { title: '➕ إضافة رتبة جديدة', color: 0x2b2d31, description: `**${interaction.user}** أضاف رتبة **${roleName}** إلى القائمة.` });
      const embed = new EmbedBuilder()
        .setTitle('✅ تم إضافة الرتبة')
        .setColor(0x2b2d31)
        .setDescription(`تم إضافة **${roleName}** إلى قائمة الرتب.`)
        .setFooter({ text: `عدد الرتب: ${roles.length}` });
      if (config.uiBannerUrl) embed.setImage(config.uiBannerUrl);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    // ===== أمر الخريطة (سلاش) =====
    if (commandName === 'خريطة') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ تحتاج صلاحية متحكم.', flags: MessageFlags.Ephemeral });
      }
      const mapConfig = await getMapConfig(guildId);
      const embed = await generateServerMapEmbed(interaction.guild, interaction.member, config, mapConfig);
      const components = buildMapButtons(mapConfig);
      await interaction.reply({ embeds: [embed], components, flags: MessageFlags.Ephemeral });
      return;
    }
  }

  // ============================================================
  // ========== معالج القوائم المنسدلة ==========
  // ============================================================

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'help_menu') {
      const section = interaction.values[0];
      const helpData = getHelpData();
      const data = helpData[section];
      if (!data) return interaction.reply({ content: '⚠️ قسم غير معروف.', flags: MessageFlags.Ephemeral });
      const embed = new EmbedBuilder()
        .setTitle(`📖 ${data.title}`)
        .setColor(0x2b2d31)
        .setDescription(data.description || '')
        .addFields(data.fields || [])
        .setFooter({ text: 'اختر قسماً آخر من القائمة أعلاه.' });
      const generalImage = getGeneralImage(interaction.guild, config);
      if (generalImage) embed.setImage(generalImage);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (interaction.customId === 'settings_menu') {
      const section = interaction.values[0];
      const settingsData = getSettingsData();
      const data = settingsData[section];
      if (!data) return interaction.reply({ content: '⚠️ قسم غير معروف.', flags: MessageFlags.Ephemeral });
      const embed = new EmbedBuilder()
        .setTitle(`⚙️ ${data.title}`)
        .setColor(0x2b2d31)
        .setDescription(data.description || '')
        .addFields({ name: '📌 الخيارات المتاحة', value: data.options.map(opt => `• ${opt}`).join('\n') })
        .setFooter({ text: 'استخدم الأمر النصي بالصيغة الموضحة لتنفيذ الإعداد.' });
      const generalImage = getGeneralImage(interaction.guild, config);
      if (generalImage) embed.setImage(generalImage);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (interaction.customId === 'ticket_menu') {
      const sectionName = interaction.values[0];
      const settings = await getTicketSettings(guildId);
      const section = settings.sections.find(s => s.name === sectionName);
      if (!section) {
        return interaction.reply({ content: '❌ قسم غير موجود.', flags: MessageFlags.Ephemeral });
      }
      settings.ticketCounter += 1;
      await settings.save();
      const ticketNumber = settings.ticketCounter;
      const role = section.roleId ? interaction.guild.roles.cache.get(section.roleId) : null;
      const username = interaction.user.displayName.replace(/\s/g, '_');
      const channel = await interaction.guild.channels.create({
        name: `${username}`,
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
        new ButtonBuilder().setCustomId('claim_ticket').setLabel('📥 استلام التذكرة').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('add_member_ticket').setLabel('➕ إضافة عضو').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('remove_member_ticket').setLabel('❌ إزالة عضو').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 إغلاق').setStyle(ButtonStyle.Secondary)
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
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (interaction.customId === 'task_complete_select') {
      const taskId = interaction.values[0];
      const task = await Task.findById(taskId);
      if (!task) return interaction.reply({ content: '❌ المهمة غير موجودة.', flags: MessageFlags.Ephemeral });
      if (task.assignedTo !== interaction.user.id) return interaction.reply({ content: '❌ هذه المهمة ليست موكلة إليك.', flags: MessageFlags.Ephemeral });
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

    if (interaction.customId.startsWith('store_buy_')) {
      const itemId = interaction.values[0];
      const item = await StoreItem.findById(itemId);
      if (!item) {
        return interaction.reply({ content: '❌ المنتج غير موجود.', flags: MessageFlags.Ephemeral });
      }
      const role = interaction.guild.roles.cache.get(item.roleId);
      if (!role) {
        return interaction.reply({ content: '❌ الرتبة غير موجودة حالياً.', flags: MessageFlags.Ephemeral });
      }
      const existing = await PendingPurchase.findOne({ guildId, userId: interaction.user.id, status: 'pending' });
      if (existing) {
        return interaction.reply({ content: '⚠️ لديك طلب شراء معلق بالفعل. انتظر حتى تتم معالجته.', flags: MessageFlags.Ephemeral });
      }
      const purchase = await createPendingPurchase(guildId, interaction.user.id, item.roleId, role.name, item.price);
      const storeChannel = config.storeChannel ? interaction.guild.channels.cache.get(config.storeChannel) : null;
      if (!storeChannel) {
        return interaction.reply({ content: '⚠️ لم يتم تعيين قناة المتجر بعد.', flags: MessageFlags.Ephemeral });
      }
      const embed = new EmbedBuilder()
        .setTitle('🛒 طلب شراء جديد')
        .setColor(0x2b2d31)
        .setDescription(`**المشتري:** ${interaction.user} (${interaction.user.id})\n**الرتبة:** ${role.name}\n**السعر:** ${item.price}\n**الوصف:** ${item.description || 'لا يوجد'}`)
        .setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`store_approve_${purchase._id}`)
          .setLabel('✅ تأكيد الشراء')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`store_reject_${purchase._id}`)
          .setLabel('❌ رفض')
          .setStyle(ButtonStyle.Secondary)
      );
      await storeChannel.send({ content: `<@&${config.sellerRole || ''}>`, embeds: [embed], components: [row] });
      await interaction.reply({ content: `✅ تم إرسال طلب شراء **${role.name}** إلى البائعين.`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (interaction.customId === 'roles_dropdown') {
      const roleName = interaction.values[0];
      let role = interaction.guild.roles.cache.find(r => r.name === roleName);
      if (!role) {
        try {
          role = await interaction.guild.roles.create({
            name: roleName,
            color: '#00ff00',
            reason: `تم إنشاء الرتبة عبر قائمة الرتب بواسطة ${interaction.user.tag}`
          });
        } catch (e) {
          return interaction.reply({ content: '❌ فشل إنشاء الرتبة. تأكد من الصلاحيات.', flags: MessageFlags.Ephemeral });
        }
      }
      if (interaction.member.roles.cache.has(role.id)) {
        await interaction.member.roles.remove(role);
        await interaction.reply({ content: `❌ تم إزالة رتبة ${roleName}.`, flags: MessageFlags.Ephemeral });
      } else {
        await interaction.member.roles.add(role);
        await interaction.reply({ content: `✅ تم إضافة رتبة ${roleName}.`, flags: MessageFlags.Ephemeral });
      }
      return;
    }

    // ===== قائمة اختيار القنوات عند إضافة قسم للخريطة (لم نعد نستخدمها) =====
    if (interaction.customId === 'map_select_channels') {
      return interaction.reply({ content: '⚠️ تم تحديث النظام: يرجى استخدام المودال لإدخال معرفات القنوات.', flags: MessageFlags.Ephemeral });
    }
  }

  // ============================================================
  // ========== معالج الأزرار ==========
  // ============================================================

  if (interaction.isButton()) {
    // ===== أزرار أقسام الخريطة =====
    if (interaction.customId.startsWith('map_section_')) {
      const index = parseInt(interaction.customId.split('_')[2]);
      const mapConfig = await getMapConfig(guildId);
      if (!mapConfig.sections || index >= mapConfig.sections.length) {
        return interaction.reply({ content: '❌ القسم غير موجود.', flags: MessageFlags.Ephemeral });
      }
      const section = mapConfig.sections[index];
      const channels = section.channels || [];
      if (channels.length === 0) {
        return interaction.reply({ content: `📭 لا توجد قنوات في قسم **${section.name}**.`, flags: MessageFlags.Ephemeral });
      }
      let channelList = '';
      for (const chId of channels) {
        const channel = interaction.guild.channels.cache.get(chId);
        if (channel) {
          const mention = channel.toString();
          channelList += `• ${mention}\n`;
        } else {
          channelList += `• معرف غير صالح: ${chId}\n`;
        }
      }
      const embed = new EmbedBuilder()
        .setTitle(`📂 قسم ${section.name}`)
        .setDescription(`القنوات التابعة لهذا القسم:\n${channelList}`)
        .setColor(0x2b2d31)
        .setTimestamp();
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    // ===== زر حذف قسم الخريطة =====
    if (interaction.customId === 'map_delete_section') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية.', flags: MessageFlags.Ephemeral });
      }
      const modal = new ModalBuilder()
        .setCustomId('delete_section_modal')
        .setTitle('🗑️ حذف قسم')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('section_name_to_delete')
              .setLabel('أدخل اسم القسم المراد حذفه')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder('مثال: عام')
          )
        );
      await interaction.showModal(modal);
      return;
    }

    if (interaction.customId === 'change_name_ui') {
      const userId = interaction.user.id;
      const last = await getNameCooldown(userId);
      if (last && Date.now() - last.getTime() < 5 * 60 * 60 * 1000) {
        const remaining = Math.ceil((5 * 60 * 60 * 1000 - (Date.now() - last.getTime())) / (60 * 60 * 1000));
        return interaction.reply({ content: `⏳ يمكنك تغيير اسمك بعد ${remaining} ساعة.`, flags: MessageFlags.Ephemeral });
      }
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

    if (interaction.customId === 'open_leave_modal') {
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

    if (interaction.customId.startsWith('leave_panel_')) {
      if (!config.leaveManagerRole || !interaction.member.roles.cache.has(config.leaveManagerRole)) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية الوصول إلى هذه البيانات.', flags: MessageFlags.Ephemeral });
      }
      const action = interaction.customId.replace('leave_panel_', '');
      try {
        if (action === 'pending') {
          const pending = await LeaveRequest.find({ guildId, status: 'pending' });
          if (!pending.length) {
            return interaction.reply({ content: '📭 لا توجد طلبات معلقة.', flags: MessageFlags.Ephemeral });
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
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } else if (action === 'active') {
          const now = new Date();
          const active = await LeaveRequest.find({
            guildId,
            status: 'approved',
            endDate: { $gt: now }
          });
          if (!active.length) {
            return interaction.reply({ content: '📭 لا توجد إجازات نشطة.', flags: MessageFlags.Ephemeral });
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
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } else if (action === 'logs') {
          const logs = await getLeaveLogs(guildId, 20);
          if (!logs.length) {
            return interaction.reply({ content: '📭 لا توجد سجلات.', flags: MessageFlags.Ephemeral });
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
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ content: '⚠️ خيار غير معروف.', flags: MessageFlags.Ephemeral });
        }
      } catch (error) {
        console.error('❌ خطأ في معالج لوحة الإجازات:', error);
        await interaction.reply({ content: '❌ حدث خطأ أثناء جلب البيانات.', flags: MessageFlags.Ephemeral });
      }
      return;
    }

    if (interaction.customId === 'open_resignation_modal') {
      if (!config.leaveManagerRole || !interaction.member.roles.cache.has(config.leaveManagerRole)) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية.', flags: MessageFlags.Ephemeral });
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

    if (interaction.customId === 'claim_ticket') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ هذا الزر مخصص فقط للأعضاء الذين لديهم رتبة التحكم بالبوت.', flags: MessageFlags.Ephemeral });
      }
      const log = await getTicketLogByChannel(interaction.channel.id);
      if (!log) {
        return interaction.reply({ content: '❌ هذه القناة ليست تذكرة مسجلة.', flags: MessageFlags.Ephemeral });
      }
      if (log.status === 'closed') {
        return interaction.reply({ content: '❌ هذه التذكرة مغلقة ولا يمكن استلامها.', flags: MessageFlags.Ephemeral });
      }
      if (log.status === 'claimed') {
        return interaction.reply({ content: '❌ هذه التذكرة مستلمة بالفعل بواسطة شخص آخر.', flags: MessageFlags.Ephemeral });
      }
      await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
        ManageChannels: true,
      });
      await updateTicketLog(interaction.channel.id, { claimedBy: interaction.user.id, status: 'claimed' });
      await interaction.reply({ content: `✅ ${interaction.user} استلم التذكرة وسيكون مسؤولاً عنها.`, flags: MessageFlags.Ephemeral });
      await interaction.channel.send(`📥 تم استلام التذكرة بواسطة ${interaction.user}.`);
      return;
    }

    if (interaction.customId === 'remove_member_ticket') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ هذا الزر مخصص فقط للأعضاء الذين لديهم رتبة التحكم بالبوت.', flags: MessageFlags.Ephemeral });
      }
      const log = await getTicketLogByChannel(interaction.channel.id);
      if (!log) {
        return interaction.reply({ content: '❌ هذه القناة ليست تذكرة مسجلة.', flags: MessageFlags.Ephemeral });
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
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ هذا الزر مخصص فقط للأعضاء الذين لديهم رتبة التحكم بالبوت.', flags: MessageFlags.Ephemeral });
      }
      const log = await getTicketLogByChannel(interaction.channel.id);
      if (!log) {
        return interaction.reply({ content: '❌ هذه القناة ليست تذكرة مسجلة.', flags: MessageFlags.Ephemeral });
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
        return interaction.reply({ content: '❌ هذه القناة ليست تذكرة مسجلة.', flags: MessageFlags.Ephemeral });
      }
      const isController = await hasPermission(interaction.member, guildId);
      const isClaimer = log.claimedBy === interaction.user.id;
      const isCreator = log.userId === interaction.user.id;
      if (!isController && !isClaimer && !isCreator) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية لإغلاق هذه التذكرة.', flags: MessageFlags.Ephemeral });
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
          new ButtonBuilder().setCustomId(`restart_ticket_${log._id}`).setLabel('🔄 إعادة فتح التذكرة').setStyle(ButtonStyle.Secondary)
        );
        await interaction.followUp({ content: 'يمكنك إعادة فتح هذه التذكرة عبر الزر أدناه.', components: [restartRow] });
      }
      await deleteTicketLog(interaction.channel.id);
      setTimeout(async () => {
        try { await interaction.channel.delete(); } catch (e) { console.error('خطأ في حذف التذكرة:', e); }
      }, 5000);
      return;
    }

    if (interaction.customId.startsWith('restart_ticket_')) {
      const logId = interaction.customId.split('_')[2];
      const oldLog = await TicketLog.findById(logId);
      if (!oldLog) return interaction.reply({ content: '❌ سجل التذكرة غير موجود.', flags: MessageFlags.Ephemeral });
      const settings = await getTicketSettings(guildId);
      const section = settings.sections.find(s => s.name === oldLog.section);
      if (!section) return interaction.reply({ content: '❌ القسم غير موجود حالياً.', flags: MessageFlags.Ephemeral });
      settings.ticketCounter += 1;
      await settings.save();
      const ticketNumber = settings.ticketCounter;
      const role = section.roleId ? interaction.guild.roles.cache.get(section.roleId) : null;
      const user = await interaction.guild.members.fetch(oldLog.userId).catch(() => null);
      const username = user ? user.displayName.replace(/\s/g, '_') : 'user';
      const channel = await interaction.guild.channels.create({
        name: `${username}`,
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
        new ButtonBuilder().setCustomId('claim_ticket').setLabel('📥 استلام التذكرة').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('add_member_ticket').setLabel('➕ إضافة عضو').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('remove_member_ticket').setLabel('❌ إزالة عضو').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 إغلاق').setStyle(ButtonStyle.Secondary)
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
      await interaction.reply({ content: `✅ تم إعادة فتح التذكرة: ${channel}`, flags: MessageFlags.Ephemeral });
      return;
    }

    if (interaction.customId === 'open_add_product_modal') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية.', flags: MessageFlags.Ephemeral });
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
              .setLabel('السعر')
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
        return interaction.reply({ content: '❌ الطلب غير موجود.', flags: MessageFlags.Ephemeral });
      }
      if (purchase.status !== 'pending') {
        return interaction.reply({ content: '⚠️ تمت معالجة هذا الطلب مسبقاً.', flags: MessageFlags.Ephemeral });
      }
      const isSeller = config.sellerRole && interaction.member.roles.cache.has(config.sellerRole);
      const isAdmin = await hasPermission(interaction.member, guildId);
      if (!isSeller && !isAdmin) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية البائع أو الإدارة.', flags: MessageFlags.Ephemeral });
      }
      if (action === 'approve') {
        const member = await interaction.guild.members.fetch(purchase.userId).catch(() => null);
        if (!member) {
          return interaction.reply({ content: '❌ المستخدم غير موجود في السيرفر.', flags: MessageFlags.Ephemeral });
        }
        const role = interaction.guild.roles.cache.get(purchase.roleId);
        if (!role) {
          return interaction.reply({ content: '❌ الرتبة غير موجودة.', flags: MessageFlags.Ephemeral });
        }
        await member.roles.add(role);
        purchase.status = 'completed';
        await purchase.save();
        const embed = new EmbedBuilder()
          .setTitle('✅ تم تأكيد الشراء')
          .setColor(0x2b2d31)
          .setDescription(`تم منح **${role.name}** لـ ${member}.\nالموافق: ${interaction.user}`)
          .setTimestamp();
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle('🎉 تم شراء الرتبة بنجاح!')
            .setDescription(`تم منحك رتبة **${role.name}** في **${interaction.guild.name}**.`)
            .setColor(0x2b2d31);
          await member.send({ embeds: [dmEmbed] });
        } catch (e) {}
        await logToChannel(guildId, {
          title: '🛒 شراء رتبة',
          color: 0x2b2d31,
          description: `**المشتري:** ${member.user.tag}\n**الرتبة:** ${role.name}\n**الموافق:** ${interaction.user.tag}`
        });
      } else if (action === 'reject') {
        purchase.status = 'cancelled';
        await purchase.save();
        await interaction.reply({ content: `❌ تم رفض طلب شراء <@${purchase.userId}>.`, flags: MessageFlags.Ephemeral });
        try {
          const userMember = await interaction.guild.members.fetch(purchase.userId);
          await userMember.send(`❌ تم رفض طلب شراء الرتبة **${purchase.roleName}**.`);
        } catch (e) {}
      }
      return;
    }

    if (interaction.customId === 'suggest_modal') {
      if (!config.suggestionsChannel) {
        return interaction.reply({ content: '⚠️ لم تُعيّن قناة الاقتراحات.', flags: MessageFlags.Ephemeral });
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

    if (interaction.customId === 'task_create') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية.', flags: MessageFlags.Ephemeral });
      }
      const modal = new ModalBuilder()
        .setCustomId('task_create_modal')
        .setTitle('➕ إضافة مهمة')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('task_title')
              .setLabel('عنوان المهمة')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(100)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('task_desc')
              .setLabel('وصف المهمة')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMaxLength(500)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('task_to')
              .setLabel('معرف المستلم')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder('أدخل معرف العضو')
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('task_admin_points')
              .setLabel('نقاط إدارية')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder('مثال: 10')
          )
        );
      await interaction.showModal(modal);
      return;
    }

    if (interaction.customId === 'task_list') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية.', flags: MessageFlags.Ephemeral });
      }
      const tasks = await Task.find({ guildId, status: { $ne: 'completed' } });
      if (!tasks.length) {
        return interaction.reply({ content: '📭 لا توجد مهام معلقة.', flags: MessageFlags.Ephemeral });
      }
      let desc = '';
      for (const task of tasks) {
        const assigner = await interaction.guild.members.fetch(task.assignedBy).catch(() => null);
        const assignee = await interaction.guild.members.fetch(task.assignedTo).catch(() => null);
        desc += `**${task.title}** - ${task.description}\nمن: ${assigner ? assigner.user.username : 'غير معروف'} → ${assignee ? assignee.user.username : 'غير معروف'}\nالحالة: ${task.status}\n\n`;
      }
      const embed = new EmbedBuilder()
        .setTitle('📋 قائمة المهام')
        .setColor(0x2b2d31)
        .setDescription(desc || 'لا توجد مهام')
        .setTimestamp();
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (interaction.customId === 'task_complete') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية.', flags: MessageFlags.Ephemeral });
      }
      const tasks = await Task.find({ guildId, assignedTo: interaction.user.id, status: { $ne: 'completed' } });
      if (!tasks.length) {
        return interaction.reply({ content: '📭 لا توجد مهام موكلة إليك.', flags: MessageFlags.Ephemeral });
      }
      const options = tasks.map(t => ({
        label: t.title,
        value: t._id.toString(),
        description: `الحالة: ${t.status}`,
      }));
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('task_complete_select')
          .setPlaceholder('اختر مهمة لإنهائها')
          .addOptions(options)
      );
      await interaction.reply({ content: 'اختر المهمة التي تريد إنهاءها:', components: [row], flags: MessageFlags.Ephemeral });
      return;
    }

    // ===== زر تحديث الخريطة =====
    if (interaction.customId === 'refresh_map') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية.', flags: MessageFlags.Ephemeral });
      }
      const mapConfig = await getMapConfig(guildId);
      const embed = await generateServerMapEmbed(interaction.guild, interaction.member, config, mapConfig);
      const components = buildMapButtons(mapConfig);
      await interaction.update({ embeds: [embed], components });
      return;
    }

    // ===== زر إضافة قسم للخريطة =====
    if (interaction.customId === 'map_add_section') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية.', flags: MessageFlags.Ephemeral });
      }
      const modal = new ModalBuilder()
        .setCustomId('map_section_modal')
        .setTitle('📁 إضافة قسم جديد')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('map_section_name')
              .setLabel('اسم القسم')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMinLength(2)
              .setMaxLength(50)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('map_channels_ids')
              .setLabel('معرفات القنوات (مفصولة بفاصلة أو مسافة)')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setPlaceholder('مثال: 123456789, 987654321, 112233445566')
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
    if (interaction.customId === 'change_name_modal') {
      const newName = interaction.fields.getTextInputValue('new_name');
      try {
        await interaction.member.setNickname(newName);
        await setNameCooldown(interaction.user.id);
        await interaction.reply({ content: `✅ تم تغيير اسمك إلى **${newName}**.`, flags: MessageFlags.Ephemeral });
      } catch (error) {
        await interaction.reply({ content: '❌ لا يمكن تغيير الاسم. قد لا تملك الصلاحية.', flags: MessageFlags.Ephemeral });
      }
      return;
    }

    if (interaction.customId === 'leave_modal') {
      const reason = interaction.fields.getTextInputValue('leave_reason');
      const duration = parseInt(interaction.fields.getTextInputValue('leave_duration'));
      if (!duration || duration < 1) return interaction.reply({ content: '⚠️ عدد الأيام غير صحيح.', flags: MessageFlags.Ephemeral });
      const user = await getUser(guildId, interaction.user.id);
      if (user.leave && user.leave.isOnLeave) return interaction.reply({ content: '⚠️ أنت بالفعل في إجازة.', flags: MessageFlags.Ephemeral });
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
          new ButtonBuilder().setCustomId(`leave_approve_${request._id}`).setLabel('✅ موافقة').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`leave_reject_${request._id}`).setLabel('❌ رفض').setStyle(ButtonStyle.Secondary)
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
      await interaction.reply({ content: '✅ تم إرسال طلب إجازتك بنجاح.', flags: MessageFlags.Ephemeral });
      return;
    }

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
      await interaction.reply({ content: '✅ تم تقديم استقالتك بنجاح.', flags: MessageFlags.Ephemeral });
      return;
    }

    if (interaction.customId === 'add_member_modal') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية لإضافة أعضاء.', flags: MessageFlags.Ephemeral });
      }
      const input = interaction.fields.getTextInputValue('member_input').trim();
      let memberId = input;
      const mentionMatch = input.match(/<@!?(\d+)>/);
      if (mentionMatch) memberId = mentionMatch[1];
      else if (!/^\d+$/.test(input)) return interaction.reply({ content: '⚠️ الرجاء إدخال منشن صحيح (مثل @user) أو المعرف الرقمي.', flags: MessageFlags.Ephemeral });
      const member = await interaction.guild.members.fetch(memberId).catch(() => null);
      if (!member) return interaction.reply({ content: '❌ العضو غير موجود.', flags: MessageFlags.Ephemeral });
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
      await interaction.reply({ content: `✅ تم إضافة ${member} إلى التذكرة.`, flags: MessageFlags.Ephemeral });
      await interaction.channel.send(`➕ تم إضافة ${member} إلى التذكرة بواسطة ${interaction.user}.`);
      return;
    }

    if (interaction.customId === 'remove_member_modal') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية لإزالة أعضاء.', flags: MessageFlags.Ephemeral });
      }
      const input = interaction.fields.getTextInputValue('remove_member_input').trim();
      let memberId = input;
      const mentionMatch = input.match(/<@!?(\d+)>/);
      if (mentionMatch) memberId = mentionMatch[1];
      else if (!/^\d+$/.test(input)) return interaction.reply({ content: '⚠️ الرجاء إدخال منشن صحيح (مثل @user) أو المعرف الرقمي.', flags: MessageFlags.Ephemeral });
      const member = await interaction.guild.members.fetch(memberId).catch(() => null);
      if (!member) return interaction.reply({ content: '❌ العضو غير موجود.', flags: MessageFlags.Ephemeral });
      const log = await getTicketLogByChannel(interaction.channel.id);
      if (log && log.userId === memberId) return interaction.reply({ content: '❌ لا يمكن إزالة منشئ التذكرة.', flags: MessageFlags.Ephemeral });
      await interaction.channel.permissionOverwrites.delete(member.id);
      if (log) {
        const added = log.addedMembers || [];
        const idx = added.indexOf(memberId);
        if (idx !== -1) {
          added.splice(idx, 1);
          await updateTicketLog(interaction.channel.id, { addedMembers: added });
        }
      }
      await interaction.reply({ content: `✅ تم إزالة ${member} من التذكرة.`, flags: MessageFlags.Ephemeral });
      await interaction.channel.send(`❌ تم إزالة ${member} من التذكرة بواسطة ${interaction.user}.`);
      return;
    }

    if (interaction.customId === 'task_create_modal') {
      const title = interaction.fields.getTextInputValue('task_title');
      const desc = interaction.fields.getTextInputValue('task_desc');
      const toId = interaction.fields.getTextInputValue('task_to');
      const adminPoints = parseInt(interaction.fields.getTextInputValue('task_admin_points')) || 0;
      const target = await interaction.guild.members.fetch(toId).catch(() => null);
      if (!target) return interaction.reply({ content: '❌ المستلم غير موجود.', flags: MessageFlags.Ephemeral });
      const task = new Task({
        guildId,
        assignedBy: interaction.user.id,
        assignedTo: toId,
        title,
        description: desc,
        adminPoints: adminPoints,
      });
      await task.save();
      const user = await getUser(guildId, toId);
      user.assignedTasks.push({ taskId: task._id, status: 'pending' });
      await user.save();
      await interaction.reply({ content: `✅ تم إنشاء المهمة وإرسالها إلى ${target}.\nنقاط إدارية: ${adminPoints}`, flags: MessageFlags.Ephemeral });
      try { await target.send(`📩 تم تكليفك بمهمة جديدة: **${title}**\nنقاط إدارية: ${adminPoints}\nاستخدم \`!لوحة_المهام\` لقبولها.`); } catch (e) {}
      return;
    }

    if (interaction.customId.startsWith('task_proof_')) {
      const taskId = interaction.customId.split('_')[2];
      const task = await Task.findById(taskId);
      if (!task) return interaction.reply({ content: '❌ المهمة غير موجودة.', flags: MessageFlags.Ephemeral });
      if (task.assignedTo !== interaction.user.id) return interaction.reply({ content: '❌ هذه المهمة ليست موكلة إليك.', flags: MessageFlags.Ephemeral });
      if (task.status === 'completed') return interaction.reply({ content: '⚠️ هذه المهمة مكتملة بالفعل.', flags: MessageFlags.Ephemeral });
      const proofText = interaction.fields.getTextInputValue('proof_text');
      const proofImage = interaction.fields.getTextInputValue('proof_image') || null;
      task.status = 'completed';
      task.completedAt = new Date();
      task.proofText = proofText;
      task.proofImage = proofImage;
      await task.save();
      const user = await getUser(guildId, interaction.user.id);
      user.adminPoints += task.adminPoints;
      await user.save();
      const userTasks = user.assignedTasks;
      const idx = userTasks.findIndex(t => t.taskId.toString() === taskId);
      if (idx !== -1) userTasks[idx].status = 'completed';
      await user.save();
      const promotionPoints = config.promotionPoints || 100;
      if (user.adminPoints >= promotionPoints) {
        await interaction.followUp({ content: `🎉 لقد تجاوزت نقاط الترقية (${promotionPoints})!`, flags: MessageFlags.Ephemeral });
        user.adminPoints -= promotionPoints;
        await user.save();
      }
      await interaction.reply({
        content: `✅ تم إنهاء المهمة **${task.title}**\nحصلت على **${task.adminPoints} نقاط إدارية**.\nالإثبات: ${proofText}${proofImage ? `\n[صورة](${proofImage})` : ''}`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (interaction.customId === 'add_product_modal') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية.', flags: MessageFlags.Ephemeral });
      }
      const roleId = interaction.fields.getTextInputValue('product_role').trim();
      const price = parseInt(interaction.fields.getTextInputValue('product_price'));
      const desc = interaction.fields.getTextInputValue('product_desc') || 'لا يوجد وصف';
      if (!roleId || isNaN(price) || price < 1) return interaction.reply({ content: '⚠️ بيانات غير صحيحة. تأكد من المعرف والسعر.', flags: MessageFlags.Ephemeral });
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) return interaction.reply({ content: '❌ الرتبة غير موجودة.', flags: MessageFlags.Ephemeral });
      await addStoreItem(guildId, roleId, price, desc);
      await interaction.reply({ content: `✅ تم إضافة المنتج **${role.name}** بسعر **${price}** بنجاح.`, flags: MessageFlags.Ephemeral });
      await logToChannel(guildId, {
        title: '🛒 إضافة منتج',
        color: 0x2b2d31,
        description: `**المنفذ:** ${interaction.user}\n**الرتبة:** ${role.name} (${roleId})\n**السعر:** ${price}\n**الوصف:** ${desc}`
      });
      return;
    }

    if (interaction.customId === 'suggest_submit') {
      const text = interaction.fields.getTextInputValue('suggest_text');
      const channel = interaction.guild.channels.cache.get(config.suggestionsChannel);
      if (!channel) return interaction.reply({ content: '⚠️ قناة الاقتراحات غير موجودة.', flags: MessageFlags.Ephemeral });
      const embed = new EmbedBuilder()
        .setTitle('💡 اقتراح جديد')
        .setDescription(text)
        .setColor(parseInt(config.suggestionsColor?.replace('#', '') || '2b2d31', 16))
        .setFooter({ text: `بواسطة ${interaction.user.tag}` })
        .setTimestamp();
      if (config.suggestionsImage) embed.setImage(config.suggestionsImage);
      if (config.uiSuggestImage) embed.setImage(config.uiSuggestImage);
      const msg = await channel.send({ embeds: [embed] });
      await msg.react('👍');
      await msg.react('👎');
      await interaction.reply({ content: '✅ تم إرسال اقتراحك.', flags: MessageFlags.Ephemeral });
      return;
    }

    if (interaction.customId === 'mod_login_modal') {
      const password = interaction.fields.getTextInputValue('mod_password');
      await setModLogin(guildId, interaction.user.id, password);
      await interaction.reply({ content: '✅ تم تسجيل الدخول بنجاح.', flags: MessageFlags.Ephemeral });
      await logToChannel(guildId, { title: '🔐 تسجيل مود', description: `${interaction.user} سجل دخوله.` });
      return;
    }

    // ===== مودال إضافة قسم الخريطة =====
    if (interaction.customId === 'map_section_modal') {
      const sectionName = interaction.fields.getTextInputValue('map_section_name');
      const channelsInput = interaction.fields.getTextInputValue('map_channels_ids');

      // استخراج المعرفات من النص (أرقام فقط)
      const ids = channelsInput.match(/\d{17,20}/g) || [];
      if (ids.length === 0) {
        return interaction.reply({ content: '⚠️ لم يتم العثور على معرفات صالحة. تأكد من إدخال معرفات القنوات (أرقام).', flags: MessageFlags.Ephemeral });
      }

      // التحقق من صحة المعرفات
      const validIds = [];
      const invalidIds = [];
      for (const id of ids) {
        const channel = interaction.guild.channels.cache.get(id);
        if (channel && (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice)) {
          validIds.push(id);
        } else {
          invalidIds.push(id);
        }
      }

      if (validIds.length === 0) {
        return interaction.reply({ content: '❌ لم يتم العثور على قنوات صالحة (نصية أو صوتية) بهذه المعرفات.', flags: MessageFlags.Ephemeral });
      }

      // حفظ القسم في قاعدة البيانات
      const mapConfig = await getMapConfig(guildId);
      const existingIndex = mapConfig.sections.findIndex(s => s.name === sectionName);
      if (existingIndex !== -1) {
        mapConfig.sections[existingIndex].channels = validIds;
      } else {
        mapConfig.sections.push({ name: sectionName, channels: validIds });
      }
      await mapConfig.save();

      let replyMsg = `✅ تم إضافة القسم **${sectionName}** مع ${validIds.length} قناة.`;
      if (invalidIds.length > 0) {
        replyMsg += `\n⚠️ المعرفات التالية غير صالحة أو ليست قنوات نصية/صوتية: ${invalidIds.join(', ')}`;
      }

      await interaction.reply({ content: replyMsg, flags: MessageFlags.Ephemeral });

      // تحديث الخريطة المعروضة
      try {
        const embed = await generateServerMapEmbed(interaction.guild, interaction.member, config, mapConfig);
        const components = buildMapButtons(mapConfig);
        await interaction.message?.edit({ embeds: [embed], components }).catch(() => {});
      } catch (e) {
        // إذا لم تكن هناك رسالة أصلية، نتجاهل
      }
      return;
    }

    // ===== مودال حذف قسم الخريطة (جديد) =====
    if (interaction.customId === 'delete_section_modal') {
      const sectionName = interaction.fields.getTextInputValue('section_name_to_delete').trim();
      if (!sectionName) {
        return interaction.reply({ content: '⚠️ يرجى إدخال اسم القسم.', flags: MessageFlags.Ephemeral });
      }

      const mapConfig = await getMapConfig(guildId);
      const sectionIndex = mapConfig.sections.findIndex(s => s.name.toLowerCase() === sectionName.toLowerCase());
      if (sectionIndex === -1) {
        return interaction.reply({ content: `❌ القسم **${sectionName}** غير موجود.`, flags: MessageFlags.Ephemeral });
      }

      mapConfig.sections.splice(sectionIndex, 1);
      await mapConfig.save();

      await interaction.reply({ content: `✅ تم حذف القسم **${sectionName}** بنجاح.`, flags: MessageFlags.Ephemeral });

      // تحديث الخريطة المعروضة
      try {
        const embed = await generateServerMapEmbed(interaction.guild, interaction.member, config, mapConfig);
        const components = buildMapButtons(mapConfig);
        await interaction.message?.edit({ embeds: [embed], components }).catch(() => {});
      } catch (e) {
        // إذا لم تكن هناك رسالة أصلية، نتجاهل
      }
      return;
    }
  }
});

// ============================================================
// ========== معالج الرسائل النصية ==========
// ============================================================

let tempMapData = {};

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith('!')) return;
  const args = message.content.slice(1).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  const guildId = message.guild.id;
  const config = await getGuildConfig(guildId);
  const generalImage = getGeneralImage(message.guild, config);

  const deleteDelay = 5000;
  let sentReply = null;

  const deleteAfter = async (replyMsg) => {
    if (!replyMsg) return;
    setTimeout(async () => {
      try { await message.delete(); } catch (e) {}
      try { await replyMsg.delete(); } catch (e) {}
    }, deleteDelay);
  };

  try {
    if (cmd === 'مساعدة') {
      const helpData = getHelpData();
      const options = Object.keys(helpData).map(key => ({
        label: helpData[key].title,
        value: key,
        emoji: key === 'general' ? '📌' : key === 'admin' ? '🛡️' : key === 'levels' ? '📊' : key === 'tickets' ? '🎫' : key === 'leaves' ? '📅' : key === 'store' ? '🛒' : key === 'autoreply' ? '💬' : '⚙️'
      }));
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('help_menu')
          .setPlaceholder('📖 اختر قسماً لعرض أوامره')
          .addOptions(options)
      );
      const embed = new EmbedBuilder()
        .setTitle('📖 قائمة الأوامر التفاعلية')
        .setDescription('اختر القسم المناسب من القائمة المنسدلة أدناه لعرض أوامره.')
        .setColor(0x2b2d31)
        .setFooter({ text: 'يمكنك أيضاً استخدام الأوامر النصية بادئة !' });
      if (generalImage) embed.setImage(generalImage);
      await message.channel.send({ embeds: [embed], components: [row] });
      return;
    }

    // ===== أمر تعيين مع دعم الوسائط الفرعية =====
    if (cmd === 'تعيين') {
      if (args.length === 0) {
        if (message.author.id !== OWNER_ID) return message.reply('❌ هذا الأمر للمالك فقط.');
        const settingsData = getSettingsData();
        const options = Object.keys(settingsData).map(key => ({
          label: settingsData[key].title,
          value: key,
          emoji: key === 'welcome' ? '👋' : key === 'logs' ? '📋' : key === 'levels' ? '📊' : key === 'autoline' ? '🤖' : key === 'tickets' ? '🎫' : key === 'roles' ? '🔔' : key === 'general' ? '🖼️' : key === 'suggestions' ? '💡' : key === 'admin_roles' ? '👑' : key === 'channels' ? '📌' : key === 'store' ? '🛒' : key === 'ui_panels' ? '✏️' : '⭐'
        }));
        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('settings_menu')
            .setPlaceholder('⚙️ اختر قسم الإعدادات')
            .addOptions(options)
        );
        const embed = new EmbedBuilder()
          .setTitle('⚙️ لوحة الإعدادات التفاعلية')
          .setDescription('اختر القسم المناسب من القائمة المنسدلة لعرض خيارات الإعداد المتاحة.\nيمكنك تنفيذ الإعداد باستخدام الأمر النصي بالصيغة الموضحة.')
          .setColor(0x2b2d31)
          .setFooter({ text: 'جميع الأوامر تبدأ بـ !' });
        if (generalImage) embed.setImage(generalImage);
        await message.channel.send({ embeds: [embed], components: [row] });
        return;
      }

      const subCmd = args[0].toLowerCase();
      const value = args.slice(1).join(' ');

      const settingHandlers = {
        'ترحيب': async () => {
          const channel = message.mentions.channels.first();
          if (!channel) return message.reply('⚠️ منشن القناة.');
          await updateGuildConfig(guildId, { welcomeChannel: channel.id });
          await message.reply(`✅ تم تعيين قناة الترحيب: ${channel}`);
        },
        'رسالة_ترحيب': async () => {
          if (!value) return message.reply('⚠️ اكتب نص الترحيب.');
          await updateGuildConfig(guildId, { welcomeMessage: value });
          await message.reply(`✅ تم تعيين رسالة الترحيب: ${value}`);
        },
        'صورة_ترحيب': async () => {
          if (!value || !value.match(/^https?:\/\/.+/)) return message.reply('⚠️ رابط صورة غير صالح.');
          await updateGuildConfig(guildId, { welcomeImage: value });
          await message.reply(`✅ تم تعيين صورة الترحيب: ${value}`);
        },
        'عنوان_ترحيب': async () => {
          if (!value) return message.reply('⚠️ اكتب عنوان الترحيب.');
          await updateGuildConfig(guildId, { welcomeTitle: value });
          await message.reply(`✅ تم تعيين عنوان الترحيب: ${value}`);
        },
        'خلفية_ترحيب': async () => {
          if (!value) return message.reply('⚠️ أدخل لون أو رابط صورة.');
          await updateGuildConfig(guildId, { welcomeBackground: value });
          await message.reply(`✅ تم تعيين خلفية الترحيب: ${value}`);
        },
        'دور_دخول': async () => {
          const role = message.mentions.roles.first();
          if (!role) return message.reply('⚠️ منشن الدور.');
          await updateGuildConfig(guildId, { joinRole: role.id });
          await message.reply(`✅ تم تعيين دور الدخول: ${role}`);
        },
        'سجلات': async () => {
          const channel = message.mentions.channels.first();
          if (!channel) return message.reply('⚠️ منشن القناة.');
          await updateGuildConfig(guildId, { logChannel: channel.id });
          await message.reply(`✅ تم تعيين قناة السجلات: ${channel}`);
        },
        'قناة_سجلات_تذاكر': async () => {
          const channel = message.mentions.channels.first();
          if (!channel) return message.reply('⚠️ منشن القناة.');
          await updateGuildConfig(guildId, { ticketLogChannel: channel.id });
          await message.reply(`✅ تم تعيين قناة سجلات التذاكر: ${channel}`);
        },
        'قناة_سجلات_اجازات': async () => {
          const channel = message.mentions.channels.first();
          if (!channel) return message.reply('⚠️ منشن القناة.');
          await updateGuildConfig(guildId, { leaveLogChannel: channel.id });
          await message.reply(`✅ تم تعيين قناة سجلات الإجازات: ${channel}`);
        },
        'روم_ليفل': async () => {
          const channel = message.mentions.channels.first();
          if (!channel) return message.reply('⚠️ منشن القناة.');
          await updateGuildConfig(guildId, { levelChannelId: channel.id });
          await message.reply(`✅ تم تعيين قناة إعلان المستويات: ${channel}`);
        },
        'اوتر_لاين': async () => {
          const channel = message.mentions.channels.first();
          if (!channel || !value) return message.reply('⚠️ الصيغة: `!تعيين اوتر_لاين #قناة النص`');
          const text = value.replace(/<#\d+>/, '').trim();
          if (!text) return message.reply('⚠️ أدخل نص الأوتو لاين.');
          await setAutoLine(guildId, channel.id, { text, enabled: true });
          await message.reply(`✅ تم تعيين نص الأوتو لاين في ${channel}`);
        },
        'صورة_اوترلاين': async () => {
          const channel = message.mentions.channels.first();
          if (!channel || !value) return message.reply('⚠️ الصيغة: `!تعيين صورة_اوترلاين #قناة رابط`');
          const image = value.replace(/<#\d+>/, '').trim();
          if (!image.match(/^https?:\/\/.+/)) return message.reply('⚠️ رابط صورة غير صالح.');
          await setAutoLine(guildId, channel.id, { image, enabled: true });
          await message.reply(`✅ تم تعيين صورة الأوتو لاين في ${channel}`);
        },
        'تفعيل_اوترلاين': async () => {
          const channel = message.mentions.channels.first();
          if (!channel) return message.reply('⚠️ منشن القناة.');
          const auto = await getAutoLine(guildId, channel.id);
          auto.enabled = true;
          await auto.save();
          await message.reply(`✅ تم تفعيل الأوتو لاين في ${channel}`);
        },
        'تعطيل_اوترلاين': async () => {
          const channel = message.mentions.channels.first();
          if (!channel) return message.reply('⚠️ منشن القناة.');
          const auto = await getAutoLine(guildId, channel.id);
          auto.enabled = false;
          await auto.save();
          await message.reply(`✅ تم تعطيل الأوتو لاين في ${channel}`);
        },
        'حذف_اوترلاين': async () => {
          const channel = message.mentions.channels.first();
          if (!channel) return message.reply('⚠️ منشن القناة.');
          await deleteAutoLine(guildId, channel.id);
          await message.reply(`✅ تم حذف الأوتو لاين من ${channel}`);
        },
        'تذكرة': async () => {
          await message.reply('⚠️ استخدم الأمر `!تذكرة` لإدارة التذاكر.');
        },
        'اضافة_رتبة': async () => {
          if (!value) return message.reply('⚠️ أدخل اسم الرتبة.');
          let roles = config.uiRolesOptions || [];
          if (roles.includes(value)) return message.reply(`⚠️ الرتبة "${value}" موجودة بالفعل.`);
          roles.push(value);
          await updateGuildConfig(guildId, { uiRolesOptions: roles });
          await message.reply(`✅ تم إضافة الرتبة "${value}" إلى القائمة.`);
        },
        'صورة_رتب': async () => {
          if (!value || !value.match(/^https?:\/\/.+/)) return message.reply('⚠️ رابط صورة غير صالح.');
          await updateGuildConfig(guildId, { uiRolesImage: value });
          await message.reply(`✅ تم تعيين صورة الرتب: ${value}`);
        },
        'عنوان_قائمة_الرتب': async () => {
          if (!value) return message.reply('⚠️ أدخل النص.');
          await updateGuildConfig(guildId, { uiRolesDropdownLabel: value });
          await message.reply(`✅ تم تعيين نص القائمة المنسدلة: ${value}`);
        },
        'صورة_بنر': async () => {
          if (!value || !value.match(/^https?:\/\/.+/)) return message.reply('⚠️ رابط صورة غير صالح.');
          await updateGuildConfig(guildId, { bannerImage: value });
          await message.reply(`✅ تم تعيين صورة البنر: ${value}`);
        },
        'صورة_عامة': async () => {
          if (!value || !value.match(/^https?:\/\/.+/)) return message.reply('⚠️ رابط صورة غير صالح.');
          await updateGuildConfig(guildId, { generalImage: value });
          await message.reply(`✅ تم تعيين الصورة العامة: ${value}`);
        },
        'بانر_عام': async () => {
          if (!value || !value.match(/^https?:\/\/.+/)) return message.reply('⚠️ رابط صورة غير صالح.');
          await updateGuildConfig(guildId, { uiBannerUrl: value });
          await message.reply(`✅ تم تعيين البانر العام: ${value}`);
        },
        'قناة_اقتراح': async () => {
          const channel = message.mentions.channels.first();
          if (!channel) return message.reply('⚠️ منشن القناة.');
          await updateGuildConfig(guildId, { suggestionsChannel: channel.id });
          await message.reply(`✅ تم تعيين قناة الاقتراحات: ${channel}`);
        },
        'عنوان_اقتراح': async () => {
          if (!value) return message.reply('⚠️ أدخل النص.');
          await updateGuildConfig(guildId, { suggestionsTitle: value });
          await message.reply(`✅ تم تعيين عنوان الاقتراحات: ${value}`);
        },
        'وصف_اقتراح': async () => {
          if (!value) return message.reply('⚠️ أدخل النص.');
          await updateGuildConfig(guildId, { suggestionsDescription: value });
          await message.reply(`✅ تم تعيين وصف الاقتراحات: ${value}`);
        },
        'لون_اقتراح': async () => {
          if (!value.match(/^#[0-9a-fA-F]{6}$/)) return message.reply('⚠️ أدخل لون بصيغة #هيكس.');
          await updateGuildConfig(guildId, { suggestionsColor: value });
          await message.reply(`✅ تم تعيين لون الاقتراحات: ${value}`);
        },
        'صورة_اقتراح': async () => {
          if (!value || !value.match(/^https?:\/\/.+/)) return message.reply('⚠️ رابط صورة غير صالح.');
          await updateGuildConfig(guildId, { suggestionsImage: value });
          await message.reply(`✅ تم تعيين صورة الاقتراحات: ${value}`);
        },
        'عنوان_اقتراح_بانل': async () => {
          if (!value) return message.reply('⚠️ أدخل النص.');
          await updateGuildConfig(guildId, { uiSuggestTitle: value });
          await message.reply(`✅ تم تعيين عنوان لوحة الاقتراحات: ${value}`);
        },
        'وصف_اقتراح_بانل': async () => {
          if (!value) return message.reply('⚠️ أدخل النص.');
          await updateGuildConfig(guildId, { uiSuggestDescription: value });
          await message.reply(`✅ تم تعيين وصف لوحة الاقتراحات: ${value}`);
        },
        'صورة_اقتراح_بانل': async () => {
          if (!value || !value.match(/^https?:\/\/.+/)) return message.reply('⚠️ رابط صورة غير صالح.');
          await updateGuildConfig(guildId, { uiSuggestImage: value });
          await message.reply(`✅ تم تعيين صورة لوحة الاقتراحات: ${value}`);
        },
        'بانر_اقتراح_بانل': async () => {
          if (!value || !value.match(/^https?:\/\/.+/)) return message.reply('⚠️ رابط صورة غير صالح.');
          await updateGuildConfig(guildId, { uiSuggestBanner: value });
          await message.reply(`✅ تم تعيين بانر لوحة الاقتراحات: ${value}`);
        },
        'رتبة_مسؤول_اجازات': async () => {
          const role = message.mentions.roles.first();
          if (!role) return message.reply('⚠️ منشن الرتبة.');
          await updateGuildConfig(guildId, { leaveManagerRole: role.id });
          await message.reply(`✅ تم تعيين رتبة مسؤول الإجازات: ${role}`);
        },
        'رتبة_تحكم_البوت': async () => {
          const role = message.mentions.roles.first();
          if (!role) return message.reply('⚠️ منشن الرتبة.');
          await updateGuildConfig(guildId, { botControllerRole: role.id });
          await message.reply(`✅ تم تعيين رتبة التحكم بالبوت: ${role}`);
        },
        'رتبة_بائع': async () => {
          const role = message.mentions.roles.first();
          if (!role) return message.reply('⚠️ منشن الرتبة.');
          await updateGuildConfig(guildId, { sellerRole: role.id });
          await message.reply(`✅ تم تعيين رتبة البائع: ${role}`);
        },
        'قناة_المهام': async () => {
          const channel = message.mentions.channels.first();
          if (!channel) return message.reply('⚠️ منشن القناة.');
          await updateGuildConfig(guildId, { tasksChannel: channel.id });
          await message.reply(`✅ تم تعيين قناة المهام: ${channel}`);
        },
        'قناة_الاجازات': async () => {
          const channel = message.mentions.channels.first();
          if (!channel) return message.reply('⚠️ منشن القناة.');
          await updateGuildConfig(guildId, { leaveRequestChannel: channel.id });
          await message.reply(`✅ تم تعيين قناة طلبات الإجازات: ${channel}`);
        },
        'قناة_المودات': async () => {
          await message.reply('⚠️ قناة المودات غير محددة في النظام الحالي.');
        },
        'قناة_المتجر': async () => {
          const channel = message.mentions.channels.first();
          if (!channel) return message.reply('⚠️ منشن القناة.');
          await updateGuildConfig(guildId, { storeChannel: channel.id });
          await message.reply(`✅ تم تعيين قناة المتجر: ${channel}`);
        },
        'اضافة_منتج': async () => {
          const role = message.mentions.roles.first();
          if (!role) return message.reply('⚠️ منشن الرتبة.');
          const parts = value.replace(/<@&\d+>/, '').trim().split(/\s+/);
          if (parts.length < 2) return message.reply('⚠️ الصيغة: `!تعيين اضافة_منتج @رتبة السعر الوصف`');
          const price = parseInt(parts[0]);
          if (isNaN(price) || price < 1) return message.reply('⚠️ السعر غير صحيح.');
          const desc = parts.slice(1).join(' ') || 'لا يوجد وصف';
          await addStoreItem(guildId, role.id, price, desc);
          await message.reply(`✅ تم إضافة المنتج **${role.name}** بسعر **${price}**.`);
        },
        'حذف_منتج': async () => {
          if (!value) return message.reply('⚠️ أدخل معرف المنتج.');
          const deleted = await removeStoreItem(guildId, value);
          if (!deleted) return message.reply('❌ المنتج غير موجود.');
          await message.reply(`✅ تم حذف المنتج.`);
        },
        'صورة_المتجر': async () => {
          if (!value || !value.match(/^https?:\/\/.+/)) return message.reply('⚠️ رابط صورة غير صالح.');
          await updateGuildConfig(guildId, { storePanelImage: value });
          await message.reply(`✅ تم تعيين صورة المتجر: ${value}`);
        },
        'عنوان_متجر_بانل': async () => {
          if (!value) return message.reply('⚠️ أدخل النص.');
          await updateGuildConfig(guildId, { uiStoreTitle: value });
          await message.reply(`✅ تم تعيين عنوان لوحة المتجر: ${value}`);
        },
        'وصف_متجر_بانل': async () => {
          if (!value) return message.reply('⚠️ أدخل النص.');
          await updateGuildConfig(guildId, { uiStoreDescription: value });
          await message.reply(`✅ تم تعيين وصف لوحة المتجر: ${value}`);
        },
        'صورة_متجر_بانل': async () => {
          if (!value || !value.match(/^https?:\/\/.+/)) return message.reply('⚠️ رابط صورة غير صالح.');
          await updateGuildConfig(guildId, { uiStoreImage: value });
          await message.reply(`✅ تم تعيين صورة لوحة المتجر: ${value}`);
        },
        'عنوان_الاسم': async () => {
          if (!value) return message.reply('⚠️ أدخل النص.');
          await updateGuildConfig(guildId, { uiTitle: value });
          await message.reply(`✅ تم تعيين عنوان لوحة تغيير الاسم: ${value}`);
        },
        'وصف_الاسم': async () => {
          if (!value) return message.reply('⚠️ أدخل النص.');
          await updateGuildConfig(guildId, { uiDescription: value });
          await message.reply(`✅ تم تعيين وصف لوحة تغيير الاسم: ${value}`);
        },
        'ملاحظة_الاسم': async () => {
          if (!value) return message.reply('⚠️ أدخل النص.');
          await updateGuildConfig(guildId, { uiNoteText: value });
          await message.reply(`✅ تم تعيين ملاحظة لوحة تغيير الاسم: ${value}`);
        },
        'بانر_الاسم': async () => {
          if (!value || !value.match(/^https?:\/\/.+/)) return message.reply('⚠️ رابط صورة غير صالح.');
          await updateGuildConfig(guildId, { uiBannerUrl: value });
          await message.reply(`✅ تم تعيين بانر لوحة تغيير الاسم: ${value}`);
        },
        'عنوان_اجازة_بانل': async () => {
          if (!value) return message.reply('⚠️ أدخل النص.');
          await updateGuildConfig(guildId, { uiLeaveTitle: value });
          await message.reply(`✅ تم تعيين عنوان لوحة الإجازات: ${value}`);
        },
        'وصف_اجازة_بانل': async () => {
          if (!value) return message.reply('⚠️ أدخل النص.');
          await updateGuildConfig(guildId, { uiLeaveDescription: value });
          await message.reply(`✅ تم تعيين وصف لوحة الإجازات: ${value}`);
        },
        'صورة_اجازة_بانل': async () => {
          if (!value || !value.match(/^https?:\/\/.+/)) return message.reply('⚠️ رابط صورة غير صالح.');
          await updateGuildConfig(guildId, { uiLeaveImage: value });
          await message.reply(`✅ تم تعيين صورة لوحة الإجازات: ${value}`);
        },
        'عنوان_تذكرة_بانل': async () => {
          if (!value) return message.reply('⚠️ أدخل النص.');
          await updateGuildConfig(guildId, { uiTicketTitle: value });
          await message.reply(`✅ تم تعيين عنوان لوحة التذاكر: ${value}`);
        },
        'وصف_تذكرة_بانل': async () => {
          if (!value) return message.reply('⚠️ أدخل النص.');
          await updateGuildConfig(guildId, { uiTicketDescription: value });
          await message.reply(`✅ تم تعيين وصف لوحة التذاكر: ${value}`);
        },
        'صورة_تذكرة_بانل': async () => {
          if (!value || !value.match(/^https?:\/\/.+/)) return message.reply('⚠️ رابط صورة غير صالح.');
          await updateGuildConfig(guildId, { uiTicketImage: value });
          await message.reply(`✅ تم تعيين صورة لوحة التذاكر: ${value}`);
        },
        'نقاط_المهمة': async () => {
          const points = parseInt(value);
          if (isNaN(points) || points < 1) return message.reply('⚠️ أدخل عدداً صحيحاً موجباً.');
          await updateGuildConfig(guildId, { pointsPerTask: points });
          await message.reply(`✅ تم تعيين نقاط المهمة الافتراضية: ${points}`);
        },
        'نقاط_الترقية': async () => {
          const points = parseInt(value);
          if (isNaN(points) || points < 1) return message.reply('⚠️ أدخل عدداً صحيحاً موجباً.');
          await updateGuildConfig(guildId, { promotionPoints: points });
          await message.reply(`✅ تم تعيين نقاط الترقية المطلوبة: ${points}`);
        },
        'عنوان_خريطة': async () => {
          if (!value) return message.reply('⚠️ أدخل النص.');
          const mapConfig = await getMapConfig(guildId);
          mapConfig.title = value;
          await mapConfig.save();
          await message.reply(`✅ تم تعيين عنوان الخريطة: ${value}`);
        },
        'وصف_خريطة': async () => {
          if (!value) return message.reply('⚠️ أدخل النص.');
          const mapConfig = await getMapConfig(guildId);
          mapConfig.description = value;
          await mapConfig.save();
          await message.reply(`✅ تم تعيين وصف الخريطة: ${value}`);
        },
        'بانر_خريطة': async () => {
          if (!value || !value.match(/^https?:\/\/.+/)) return message.reply('⚠️ رابط صورة غير صالح.');
          const mapConfig = await getMapConfig(guildId);
          mapConfig.banner = value;
          await mapConfig.save();
          await message.reply(`✅ تم تعيين بانر الخريطة: ${value}`);
        }
      };

      const handler = settingHandlers[subCmd];
      if (handler) {
        if (message.author.id !== OWNER_ID) return message.reply('❌ هذا الأمر للمالك فقط.');
        await handler();
      } else {
        await message.reply(`⚠️ الأمر الفرعي "${subCmd}" غير معروف. استخدم \`!تعيين\` لعرض القائمة.`);
      }
      return;
    }

    // ===== باقي الأوامر (مستوى، ترتيب، لوحة_المهام، إلخ) =====
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

    if (cmd === 'اختبار_xp') {
      const user = await getUser(guildId, message.author.id);
      await message.reply(`📊 **بياناتك الحالية:**\n- المستوى: ${user.level}\n- XP: ${user.xp}/${(user.level + 1) * 100}\n- عدد الرسائل: ${user.messages}`);
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

    if (cmd === 'لوحة_المهام') {
      if (!(await hasPermission(message.member, guildId))) {
        return message.reply('❌ هذا الأمر للمتحكمين فقط.');
      }
      const embed = new EmbedBuilder()
        .setTitle('📋 لوحة المهام الإدارية')
        .setDescription('اختر الإجراء المناسب من الأزرار أدناه.')
        .setColor(0x2b2d31);
      if (config.uiBannerUrl) embed.setImage(config.uiBannerUrl);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('task_create').setLabel('➕ إضافة مهمة').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('task_list').setLabel('📋 عرض المهام').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('task_complete').setLabel('✅ إنهاء مهمة').setStyle(ButtonStyle.Secondary)
      );
      await message.channel.send({ embeds: [embed], components: [row] });
      return;
    }

    if (cmd === 'بانل_اجازات' || cmd === 'لوحة_اجازات') {
      if (!(await hasPermission(message.member, guildId))) {
        return message.reply('❌ تحتاج صلاحية متحكم.');
      }
      if (!config.leaveLogChannel) {
        await message.reply('⚠️ لم تُعيّن قناة سجلات الإجازات. استخدم `!تعيين قناة_سجلات_اجازات #قناة`');
      }
      const embed = new EmbedBuilder()
        .setTitle(config.uiLeaveTitle || '📅 لوحة إدارة الإجازات والاستقالات')
        .setDescription(config.uiLeaveDescription || 'اضغط على الزر أدناه لتقديم طلب إجازة أو استقالة، أو استخدم الأزرار الأخرى للإدارة.')
        .setColor(0x2b2d31)
        .setTimestamp();
      if (config.uiLeaveImage) embed.setImage(config.uiLeaveImage);
      if (config.leavePanelImage) embed.setImage(config.leavePanelImage);
      if (config.uiBannerUrl) embed.setImage(config.uiBannerUrl);
      const pending = await LeaveRequest.find({ guildId, status: 'pending' });
      const active = await LeaveRequest.countDocuments({ guildId, status: 'approved', endDate: { $gt: new Date() } });
      embed.addFields(
        { name: '📋 طلبات معلقة', value: pending.length > 0 ? `**${pending.length}** طلب` : 'لا توجد طلبات معلقة', inline: true },
        { name: '📊 إجازات نشطة', value: `**${active}**`, inline: true }
      );
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('open_leave_modal').setLabel('📝 طلب إجازة').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('leave_panel_pending').setLabel('📋 طلبات معلقة').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('leave_panel_active').setLabel('📊 إجازات نشطة').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('leave_panel_logs').setLabel('📜 سجل الإجازات').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('open_resignation_modal').setLabel('📝 تقديم استقالة').setStyle(ButtonStyle.Secondary)
      );
      await message.channel.send({ embeds: [embed], components: [row] });
      await message.reply('✅ تم إنشاء لوحة الإجازات.');
      return;
    }

    if (cmd === 'طلب_اجازة') {
      if (!(await hasPermission(message.member, guildId))) {
        return message.reply('❌ هذا الأمر للمتحكمين فقط.');
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

    if (cmd === 'بانل_اضافة_منتج') {
      if (!(await hasPermission(message.member, guildId))) {
        return message.reply('❌ تحتاج صلاحية متحكم.');
      }
      const embed = new EmbedBuilder()
        .setTitle('➕ لوحة إضافة منتج')
        .setDescription('اضغط على الزر أدناه لإضافة منتج جديد إلى المتجر.')
        .setColor(0x2b2d31)
        .setTimestamp();
      if (config.uiBannerUrl) embed.setImage(config.uiBannerUrl);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('open_add_product_modal')
          .setLabel('➕ إضافة منتج')
          .setStyle(ButtonStyle.Secondary)
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
        .setTitle(config.uiStoreTitle || '🛒 متجر الرتب')
        .setDescription(config.uiStoreDescription || 'اختر الرتبة التي تريد شراءها.\nسيتم إرسال طلبك إلى البائعين للموافقة.')
        .setColor(0x2b2d31);
      if (config.uiStoreImage) embed.setImage(config.uiStoreImage);
      if (config.storePanelImage) embed.setImage(config.storePanelImage);
      if (config.uiBannerUrl) embed.setImage(config.uiBannerUrl);
      const options = items.map(item => {
        const role = message.guild.roles.cache.get(item.roleId);
        return {
          label: role ? role.name : 'رتبة غير موجودة',
          value: item._id.toString(),
          description: `${item.price}`,
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

    if (cmd === 'رتب') {
      await sendRolesPanel(message.channel, config, guildId);
      const reply = await message.reply('✅ تم إنشاء لوحة الرتب.');
      setTimeout(async () => {
        try { await reply.delete(); } catch (e) {}
        try { await message.delete(); } catch (e) {}
      }, 5000);
      return;
    }

    if (cmd === 'اضافة_رتبة') {
      if (!(await hasPermission(message.member, guildId))) {
        return message.reply('❌ تحتاج صلاحية متحكم.');
      }
      const roleName = args.join(' ');
      if (!roleName) return message.reply('⚠️ يرجى إدخال اسم الرتبة.');
      let roles = config.uiRolesOptions || [];
      if (roles.includes(roleName)) {
        return message.reply(`⚠️ الرتبة "${roleName}" موجودة بالفعل.`);
      }
      roles.push(roleName);
      await updateGuildConfig(guildId, { uiRolesOptions: roles });
      let role = message.guild.roles.cache.find(r => r.name === roleName);
      if (!role) {
        try {
          role = await message.guild.roles.create({
            name: roleName,
            color: '#00ff00',
            reason: `تم إنشاء الرتبة عبر أمر اضافة_رتبة بواسطة ${message.author.tag}`
          });
        } catch (e) {
          console.error('❌ فشل إنشاء الرتبة:', e);
        }
      }
      await logToChannel(guildId, { title: '➕ إضافة رتبة جديدة', color: 0x2b2d31, description: `**${message.author}** أضاف رتبة **${roleName}** إلى القائمة.` });
      const embed = new EmbedBuilder()
        .setTitle('✅ تم إضافة الرتبة')
        .setColor(0x2b2d31)
        .setDescription(`تم إضافة **${roleName}** إلى قائمة الرتب.`)
        .setFooter({ text: `عدد الرتب: ${roles.length}` });
      if (config.uiBannerUrl) embed.setImage(config.uiBannerUrl);
      await message.channel.send({ embeds: [embed] });
      return;
    }

    if (cmd === 'تغيير_اسم') {
      await sendNameChangePanel(message.channel, config, guildId);
      const reply = await message.reply('✅ تم إنشاء لوحة تغيير الاسم.');
      setTimeout(async () => {
        try { await reply.delete(); } catch (e) {}
        try { await message.delete(); } catch (e) {}
      }, 5000);
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

    // ====== أمر خريطة السيرفر (نصي) ======
    if (cmd === 'خريطة' || cmd === 'بانل_خريطة') {
      if (!(await hasPermission(message.member, guildId))) {
        return message.reply('❌ تحتاج صلاحية متحكم.');
      }
      const mapConfig = await getMapConfig(guildId);
      const embed = await generateServerMapEmbed(message.guild, message.member, config, mapConfig);
      const components = buildMapButtons(mapConfig);
      await message.channel.send({ embeds: [embed], components });
      await message.reply('✅ تم إنشاء خريطة السيرفر.');
      return;
    }

    // ====== أوامر الإشراف الكاملة ======
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

    if (cmd === 'بانل_اقتراح') {
      if (!(await hasPermission(message.member, guildId))) { await message.reply('❌ تحتاج صلاحية متحكم.'); return; }
      const color = parseInt(config.suggestionsColor?.replace('#', '') || '2b2d31', 16);
      const embed = new EmbedBuilder()
        .setTitle(config.uiSuggestTitle || config.suggestionsTitle || '💡 قناة الاقتراحات')
        .setDescription(config.uiSuggestDescription || config.suggestionsDescription || 'شاركنا اقتراحك!')
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `بواسطة ${message.author.tag}` });
      if (config.uiSuggestImage) embed.setImage(config.uiSuggestImage);
      else if (config.suggestionsImage) embed.setImage(config.suggestionsImage);
      if (config.uiSuggestBanner) embed.setImage(config.uiSuggestBanner);
      if (config.uiBannerUrl) embed.setImage(config.uiBannerUrl);
      if (generalImage) embed.setThumbnail(generalImage);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('suggest_modal').setLabel('📝 تقديم اقتراح').setStyle(ButtonStyle.Secondary)
      );
      await message.channel.send({ embeds: [embed], components: [row] });
      await message.reply('✅ تم إنشاء لوحة الاقتراحات.');
      return;
    }

    if (cmd === 'بانل') {
      if (!(await hasPermission(message.member, guildId))) { await message.reply('❌ تحتاج صلاحية متحكم.'); return; }
      const settings = await getTicketSettings(guildId);
      const embed = new EmbedBuilder()
        .setTitle(config.uiTicketTitle || '🎫 تذاكر دعم فني')
        .setDescription(config.uiTicketDescription || 'اختر القسم المناسب لطلب المساعدة.')
        .setColor(0x2b2d31)
        .setImage(config.uiTicketImage || settings.image || 'https://i.imgur.com/GkKqN3G.png')
        .setTimestamp();
      if (generalImage) embed.setThumbnail(generalImage);
      if (config.uiBannerUrl) embed.setImage(config.uiBannerUrl);
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
