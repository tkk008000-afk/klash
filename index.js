// ============================================================
// البوت المتكامل - جميع الأوامر سلاش + نظام تذاكر متطور
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
  botControllerRole: String, // رتبة متحكم البوت
  pointsPerTask: { type: Number, default: 10 },
  dailySalary: { type: Number, default: 5 },
  promotionPoints: { type: Number, default: 100 },
  leavePanelImage: String,
  storePanelImage: String,
}, { timestamps: true });
const Config = mongoose.model('Config', ConfigSchema);

// عداد التذاكر لكل سيرفر
const TicketCounterSchema = new mongoose.Schema({
  guildId: { type: String, unique: true, required: true },
  count: { type: Number, default: 0 }
});
const TicketCounter = mongoose.model('TicketCounter', TicketCounterSchema);

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

const LeaveLogSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  action: { type: String, enum: ['requested', 'approved', 'rejected', 'ended'] },
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
  }],
  text: { type: String, default: 'مرحباً بكم في قسم التذاكر...' },
  image: { type: String, default: 'https://i.imgur.com/GkKqN3G.png' },
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
  return await isController(member.id, guildId);
}
async function isBotController(member, guildId) {
  if (OWNER_ID && member.id === OWNER_ID) return true;
  const config = await getGuildConfig(guildId);
  if (!config.botControllerRole) return false;
  return member.roles.cache.has(config.botControllerRole);
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

// دوال عداد التذاكر
async function getNextTicketNumber(guildId) {
  let counter = await TicketCounter.findOne({ guildId });
  if (!counter) {
    counter = new TicketCounter({ guildId, count: 0 });
    await counter.save();
  }
  counter.count += 1;
  await counter.save();
  return counter.count;
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
  try {
    const fetched = await channel.messages.fetch({ limit: 500 });
    messages = Array.from(fetched.values()).reverse();
  } catch (fetchError) {
    console.error('❌ فشل جلب رسائل التذكرة:', fetchError);
    messages = [];
  }

  const creator = await channel.guild.members.fetch(logData.userId).catch(() => null);
  const creatorName = creator ? creator.user.tag : 'غير معروف';
  const createdAt = logData.createdAt instanceof Date ? logData.createdAt : new Date();
  const statusText = logData.status === 'closed' ? 'مغلقة' : 'مفتوحة';

  let messagesHTML = '';
  if (messages.length === 0) {
    messagesHTML = `<div class="message" style="color: #ff6b6b;">⚠️ تعذر جلب الرسائل. قد تكون القناة فارغة أو لا توجد صلاحيات.</div>`;
  } else {
    for (const msg of messages) {
      try {
        const author = msg.author.tag;
        const content = msg.content || '(رسالة فارغة)';
        const timestamp = `<t:${Math.floor(msg.createdTimestamp / 1000)}:F>`;
        const attachments = msg.attachments.size > 0
          ? msg.attachments.map(a => `<a href="${a.url}" target="_blank">${a.name}</a>`).join(' ')
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

  // ====== نظام منح 1 KL لكل دقيقة في الفويس ======
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

  // ====== تسجيل أوامر السلاش ======
  if (CLIENT_ID && CLIENT_ID !== 'YOUR_CLIENT_ID') {
    const commands = [
      // العملة
      new SlashCommandBuilder()
        .setName('رصيدي')
        .setDescription('عرض رصيدك من KL والنقاط الإدارية'),
      new SlashCommandBuilder()
        .setName('توب')
        .setDescription('عرض ترتيب أغنى 10 أشخاص في السيرفر'),
      new SlashCommandBuilder()
        .setName('اعطاء_عملات')
        .setDescription('إعطاء عملات لعضو (للمتحكمين)')
        .addUserOption(option => option.setName('عضو').setDescription('العضو المستلم').setRequired(true))
        .addIntegerOption(option => option.setName('المبلغ').setDescription('عدد العملات').setRequired(true)),
      new SlashCommandBuilder()
        .setName('سحب_عملات')
        .setDescription('سحب عملات من عضو (للمتحكمين)')
        .addUserOption(option => option.setName('عضو').setDescription('العضو المستهدف').setRequired(true))
        .addIntegerOption(option => option.setName('المبلغ').setDescription('عدد العملات').setRequired(true)),
      new SlashCommandBuilder()
        .setName('مصرف')
        .setDescription('الحصول على الراتب اليومي'),
      
      // المستويات
      new SlashCommandBuilder()
        .setName('مستوى')
        .setDescription('عرض مستوى عضو')
        .addUserOption(option => option.setName('عضو').setDescription('اختر عضواً').setRequired(false)),
      new SlashCommandBuilder()
        .setName('ترتيب')
        .setDescription('عرض ترتيب المستويات'),

      // المهام
      new SlashCommandBuilder()
        .setName('لوحة_المهام')
        .setDescription('فتح لوحة المهام الإدارية'),

      // الإجازات
      new SlashCommandBuilder()
        .setName('بانل_اجازات')
        .setDescription('فتح لوحة الإجازات'),
      new SlashCommandBuilder()
        .setName('طلب_اجازة')
        .setDescription('تقديم طلب إجازة'),
      new SlashCommandBuilder()
        .setName('الموافقة_على_الاجازات')
        .setDescription('عرض طلبات الإجازات المعلقة'),

      // المتجر
      new SlashCommandBuilder()
        .setName('بانل_اضافة_منتج')
        .setDescription('فتح لوحة إضافة منتج (للمتحكمين)'),
      new SlashCommandBuilder()
        .setName('متجر')
        .setDescription('فتح المتجر لشراء الرتب'),

      // التذاكر
      new SlashCommandBuilder()
        .setName('بانل')
        .setDescription('إنشاء لوحة التذاكر'),
      new SlashCommandBuilder()
        .setName('عرض_تذكرة')
        .setDescription('عرض إعدادات التذاكر'),
      new SlashCommandBuilder()
        .setName('لوق_تذكرة')
        .setDescription('عرض تقرير التذكرة (داخل قناة التذكرة)'),

      // الاقتراحات
      new SlashCommandBuilder()
        .setName('بانل_اقتراح')
        .setDescription('إنشاء لوحة الاقتراحات'),

      // رتب الإشعارات
      new SlashCommandBuilder()
        .setName('رتب')
        .setDescription('إنشاء لوحة رتب الإشعارات'),

      // تغيير الاسم
      new SlashCommandBuilder()
        .setName('تغيير_اسم')
        .setDescription('تغيير اسمك المستعار في السيرفر'),

      // تسجيل الدخول للمودات
      new SlashCommandBuilder()
        .setName('تسجيل_الدخول')
        .setDescription('تسجيل الدخول للمودات'),

      // متحكمين
      new SlashCommandBuilder()
        .setName('متحكم')
        .setDescription('تعيين عضو كمتحكم (للمالك فقط)')
        .addUserOption(option => option.setName('عضو').setDescription('العضو').setRequired(true)),
      new SlashCommandBuilder()
        .setName('الغاء_متحكم')
        .setDescription('إلغاء صلاحية متحكم عن عضو (للمالك فقط)')
        .addUserOption(option => option.setName('عضو').setDescription('العضو').setRequired(true)),
      new SlashCommandBuilder()
        .setName('قائمة_المتحكمين')
        .setDescription('عرض قائمة المتحكمين'),

      // الإعدادات (للمالك فقط)
      new SlashCommandBuilder()
        .setName('تعيين')
        .setDescription('تعيين إعدادات البوت (للمالك فقط)')
        .addSubcommand(sub => sub.setName('ترحيب').setDescription('تعيين قناة الترحيب').addChannelOption(opt => opt.setName('قناة').setDescription('القناة').setRequired(true)))
        .addSubcommand(sub => sub.setName('سجلات').setDescription('تعيين قناة السجلات').addChannelOption(opt => opt.setName('قناة').setDescription('القناة').setRequired(true)))
        .addSubcommand(sub => sub.setName('قناة_سجلات_تذاكر').setDescription('تعيين قناة سجلات التذاكر').addChannelOption(opt => opt.setName('قناة').setDescription('القناة').setRequired(true)))
        .addSubcommand(sub => sub.setName('قناة_سجلات_اجازات').setDescription('تعيين قناة سجلات الإجازات').addChannelOption(opt => opt.setName('قناة').setDescription('القناة').setRequired(true)))
        .addSubcommand(sub => sub.setName('رتبة_بائع').setDescription('تعيين رتبة البائع').addRoleOption(opt => opt.setName('رتبة').setDescription('الرتبة').setRequired(true)))
        .addSubcommand(sub => sub.setName('رتبة_اداري_علوي').setDescription('تعيين رتبة الإداري العلوي').addRoleOption(opt => opt.setName('رتبة').setDescription('الرتبة').setRequired(true)))
        .addSubcommand(sub => sub.setName('رتبة_اداري_صغري').setDescription('تعيين رتبة الإداري الصغري').addRoleOption(opt => opt.setName('رتبة').setDescription('الرتبة').setRequired(true)))
        .addSubcommand(sub => sub.setName('رتبة_مسؤول_اجازات').setDescription('تعيين رتبة مسؤول الإجازات').addRoleOption(opt => opt.setName('رتبة').setDescription('الرتبة').setRequired(true)))
        .addSubcommand(sub => sub.setName('رتبة_متحكم_البوت').setDescription('تعيين رتبة متحكم البوت (تستطيع إغلاق أي تذكرة)').addRoleOption(opt => opt.setName('رتبة').setDescription('الرتبة').setRequired(true)))
        .addSubcommand(sub => sub.setName('نقاط_المهمة').setDescription('تعيين نقاط المهمة الافتراضية').addIntegerOption(opt => opt.setName('نقاط').setDescription('العدد').setRequired(true)))
        .addSubcommand(sub => sub.setName('راتب_يومي').setDescription('تعيين الراتب اليومي').addIntegerOption(opt => opt.setName('راتب').setDescription('العدد').setRequired(true)))
        .addSubcommand(sub => sub.setName('نقاط_الترقية').setDescription('تعيين نقاط الترقية').addIntegerOption(opt => opt.setName('نقاط').setDescription('العدد').setRequired(true)))
        .addSubcommand(sub => sub.setName('قناة_المتجر').setDescription('تعيين قناة المتجر').addChannelOption(opt => opt.setName('قناة').setDescription('القناة').setRequired(true)))
        .addSubcommand(sub => sub.setName('صورة_المتجر').setDescription('تعيين صورة المتجر').addStringOption(opt => opt.setName('رابط').setDescription('رابط الصورة').setRequired(true)))
        .addSubcommand(sub => sub.setName('صورة_بانل_اجازات').setDescription('تعيين صورة بانل الإجازات').addStringOption(opt => opt.setName('رابط').setDescription('رابط الصورة').setRequired(true)))
        .addSubcommand(sub => sub.setName('صورة_بانل').setDescription('تعيين صورة بانل التذاكر').addStringOption(opt => opt.setName('رابط').setDescription('رابط الصورة').setRequired(true)))
        .addSubcommand(sub => sub.setName('صورة_رتب').setDescription('تعيين صورة رتب الإشعارات').addStringOption(opt => opt.setName('رابط').setDescription('رابط الصورة').setRequired(true)))
        .addSubcommand(sub => sub.setName('صورة_بنر').setDescription('تعيين صورة البنر').addStringOption(opt => opt.setName('رابط').setDescription('رابط الصورة').setRequired(true)))
        .addSubcommand(sub => sub.setName('صورة_عامة').setDescription('تعيين الصورة العامة').addStringOption(opt => opt.setName('رابط').setDescription('رابط الصورة').setRequired(true)))
        .addSubcommand(sub => sub.setName('قناة_اقتراح').setDescription('تعيين قناة الاقتراحات').addChannelOption(opt => opt.setName('قناة').setDescription('القناة').setRequired(true)))
        .addSubcommand(sub => sub.setName('عنوان_اقتراح').setDescription('تعيين عنوان الاقتراحات').addStringOption(opt => opt.setName('نص').setDescription('العنوان').setRequired(true)))
        .addSubcommand(sub => sub.setName('وصف_اقتراح').setDescription('تعيين وصف الاقتراحات').addStringOption(opt => opt.setName('نص').setDescription('الوصف').setRequired(true)))
        .addSubcommand(sub => sub.setName('لون_اقتراح').setDescription('تعيين لون الاقتراحات').addStringOption(opt => opt.setName('لون').setDescription('مثل #2b2d31').setRequired(true)))
        .addSubcommand(sub => sub.setName('صورة_اقتراح').setDescription('تعيين صورة الاقتراحات').addStringOption(opt => opt.setName('رابط').setDescription('رابط الصورة').setRequired(true)))
        .addSubcommand(sub => sub.setName('روم_ليفل').setDescription('تعيين قناة المستويات').addChannelOption(opt => opt.setName('قناة').setDescription('القناة').setRequired(true)))
        .addSubcommand(sub => sub.setName('دور_دخول').setDescription('تعيين دور الدخول للجدد').addRoleOption(opt => opt.setName('رتبة').setDescription('الرتبة').setRequired(true)))
        .addSubcommand(sub => sub.setName('قناة_المهام').setDescription('تعيين قناة المهام').addChannelOption(opt => opt.setName('قناة').setDescription('القناة').setRequired(true)))
        .addSubcommand(sub => sub.setName('قناة_الاجازات').setDescription('تعيين قناة طلبات الإجازات').addChannelOption(opt => opt.setName('قناة').setDescription('القناة').setRequired(true)))
        .addSubcommand(sub => sub.setName('قناة_المودات').setDescription('تعيين قناة تسجيل المودات').addChannelOption(opt => opt.setName('قناة').setDescription('القناة').setRequired(true)))
        .addSubcommand(sub => sub.setName('تذكرة_اضافة_قسم').setDescription('إضافة قسم للتذاكر').addStringOption(opt => opt.setName('الاسم').setDescription('اسم القسم').setRequired(true)).addRoleOption(opt => opt.setName('دور').setDescription('الدور المسؤول').setRequired(true)).addStringOption(opt => opt.setName('ايموجي').setDescription('الإيموجي').setRequired(false)))
        .addSubcommand(sub => sub.setName('تذكرة_حذف_قسم').setDescription('حذف قسم من التذاكر').addStringOption(opt => opt.setName('الاسم').setDescription('اسم القسم').setRequired(true)))
        .addSubcommand(sub => sub.setName('تذكرة_تعيين_ايموجي').setDescription('تعيين إيموجي لقسم').addStringOption(opt => opt.setName('الاسم').setDescription('اسم القسم').setRequired(true)).addStringOption(opt => opt.setName('ايموجي').setDescription('الإيموجي').setRequired(true)))
        .addSubcommand(sub => sub.setName('تذكرة_نص').setDescription('تعيين نص التذاكر').addStringOption(opt => opt.setName('نص').setDescription('النص الجديد').setRequired(true)))
        .addSubcommand(sub => sub.setName('تذكرة_صورة').setDescription('تعيين صورة التذاكر').addStringOption(opt => opt.setName('رابط').setDescription('رابط الصورة').setRequired(true)))
        .addSubcommand(sub => sub.setName('اوتر_لاين').setDescription('تعيين أوتو لاين للقناة').addChannelOption(opt => opt.setName('قناة').setDescription('القناة').setRequired(true)).addStringOption(opt => opt.setName('نص').setDescription('النص').setRequired(true)))
        .addSubcommand(sub => sub.setName('صورة_اوترلاين').setDescription('تعيين صورة للأوتو لاين').addChannelOption(opt => opt.setName('قناة').setDescription('القناة').setRequired(true)).addStringOption(opt => opt.setName('رابط').setDescription('رابط الصورة').setRequired(true)))
        .addSubcommand(sub => sub.setName('تفعيل_اوترلاين').setDescription('تفعيل الأوتو لاين في قناة').addChannelOption(opt => opt.setName('قناة').setDescription('القناة').setRequired(true)))
        .addSubcommand(sub => sub.setName('تعطيل_اوترلاين').setDescription('تعطيل الأوتو لاين في قناة').addChannelOption(opt => opt.setName('قناة').setDescription('القناة').setRequired(true)))
        .addSubcommand(sub => sub.setName('حذف_اوترلاين').setDescription('حذف الأوتو لاين من قناة').addChannelOption(opt => opt.setName('قناة').setDescription('القناة').setRequired(true)))
        .addSubcommand(sub => sub.setName('رسالة_ترحيب').setDescription('تعيين رسالة الترحيب').addStringOption(opt => opt.setName('نص').setDescription('النص').setRequired(true)))
        .addSubcommand(sub => sub.setName('صورة_ترحيب').setDescription('تعيين صورة الترحيب').addStringOption(opt => opt.setName('رابط').setDescription('رابط الصورة').setRequired(true)))
        .addSubcommand(sub => sub.setName('عنوان_ترحيب').setDescription('تعيين عنوان الترحيب').addStringOption(opt => opt.setName('نص').setDescription('العنوان').setRequired(true)))
        .addSubcommand(sub => sub.setName('خلفية_ترحيب').setDescription('تعيين خلفية الترحيب').addStringOption(opt => opt.setName('خلفية').setDescription('لون أو رابط صورة').setRequired(true)))
        .addSubcommand(sub => sub.setName('اضافة_منتج').setDescription('إضافة منتج إلى المتجر').addRoleOption(opt => opt.setName('رتبة').setDescription('الرتبة').setRequired(true)).addIntegerOption(opt => opt.setName('السعر').setDescription('السعر بالـ KL').setRequired(true)).addStringOption(opt => opt.setName('الوصف').setDescription('وصف المنتج').setRequired(false)))
        .addSubcommand(sub => sub.setName('حذف_منتج').setDescription('حذف منتج من المتجر').addStringOption(opt => opt.setName('معرف').setDescription('معرف المنتج').setRequired(true)))
        .addSubcommand(sub => sub.setName('رد_تلقائي').setDescription('إضافة رد تلقائي').addStringOption(opt => opt.setName('كلمة').setDescription('الكلمة المفتاحية').setRequired(true)).addStringOption(opt => opt.setName('الرد').setDescription('الرد').setRequired(true)))
        .addSubcommand(sub => sub.setName('رد_تلقائي_صورة').setDescription('إضافة رد تلقائي مع صورة').addStringOption(opt => opt.setName('كلمة').setDescription('الكلمة المفتاحية').setRequired(true)).addStringOption(opt => opt.setName('الرد').setDescription('الرد').setRequired(true)).addStringOption(opt => opt.setName('رابط').setDescription('رابط الصورة').setRequired(true)))
        .addSubcommand(sub => sub.setName('حذف_رد_تلقائي').setDescription('حذف رد تلقائي').addStringOption(opt => opt.setName('كلمة').setDescription('الكلمة المفتاحية').setRequired(true))),
    ];

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

  if (newState.channelId && !oldState.channelId) {
    voiceSessions.set(`${guildId}-${userId}`, Date.now());
  }

  if (!newState.channelId && oldState.channelId) {
    voiceSessions.delete(`${guildId}-${userId}`);
  }
});

// ============================================================
// ========== معالج أوامر السلاش ==========
// ============================================================

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;
  const { commandName } = interaction;
  const guildId = interaction.guild.id;
  const config = await getGuildConfig(guildId);
  const generalImage = getGeneralImage(interaction.guild, config);

  try {
    // ===== العملة =====
    if (commandName === 'رصيدي') {
      const user = await getUser(guildId, interaction.user.id);
      const embed = new EmbedBuilder()
        .setTitle(`💰 رصيد ${interaction.user.username}`)
        .setDescription(`**KL:** ${user.kl}\n**نقاط إدارية:** ${user.adminPoints}`)
        .setColor(0x2b2d31);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (commandName === 'توب') {
      const top = await User.find({ guildId }).sort({ kl: -1 }).limit(10);
      if (!top.length) {
        return interaction.reply({ content: '📭 لا يوجد أي شخص لديه KL حتى الآن.', ephemeral: true });
      }
      let desc = '';
      let rank = 1;
      for (const entry of top) {
        const member = interaction.guild.members.cache.get(entry.userId);
        const name = member ? member.user.username : `مستخدم ${entry.userId}`;
        desc += `**#${rank}** ${name} - \`${entry.kl} KL\`\n`;
        rank++;
      }
      const embed = new EmbedBuilder().setTitle('🏆 ترتيب أغنى 10 أشخاص').setDescription(desc).setColor(0x2b2d31).setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (commandName === 'اعطاء_عملات') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ تحتاج صلاحية متحكم.', ephemeral: true });
      }
      const target = interaction.options.getUser('عضو');
      const amount = interaction.options.getInteger('المبلغ');
      if (!target || target.bot) {
        return interaction.reply({ content: '❌ يرجى اختيار عضو صحيح.', ephemeral: true });
      }
      const user = await getUser(guildId, target.id);
      user.kl += amount;
      await user.save();
      const embed = new EmbedBuilder()
        .setTitle('✅ تم إعطاء العملات')
        .setDescription(`تم إعطاء ${target} **${amount} KL**.\nرصيده الآن: **${user.kl} KL**`)
        .setColor(0x2b2d31);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      try {
        await target.send(`💰 تم إعطاؤك **${amount} KL** في **${interaction.guild.name}**!`);
      } catch (e) {}
      return;
    }

    if (commandName === 'سحب_عملات') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ تحتاج صلاحية متحكم.', ephemeral: true });
      }
      const target = interaction.options.getUser('عضو');
      const amount = interaction.options.getInteger('المبلغ');
      if (!target || target.bot) {
        return interaction.reply({ content: '❌ يرجى اختيار عضو صحيح.', ephemeral: true });
      }
      const user = await getUser(guildId, target.id);
      if (user.kl < amount) {
        return interaction.reply({ content: `⚠️ رصيده غير كافٍ. لديه ${user.kl} KL فقط.`, ephemeral: true });
      }
      user.kl -= amount;
      await user.save();
      const embed = new EmbedBuilder()
        .setTitle('✅ تم سحب العملات')
        .setDescription(`تم سحب **${amount} KL** من ${target}.\nرصيده الآن: **${user.kl} KL**`)
        .setColor(0x2b2d31);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

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
      user.kl += salary;
      user.lastDaily = new Date();
      await user.save();
      await interaction.reply({ content: `✅ تم إضافة **${salary} KL** كراتب يومي. رصيدك الآن: **${user.kl} KL**`, ephemeral: true });
      return;
    }

    // ===== المستويات =====
    if (commandName === 'مستوى') {
      const member = interaction.options.getUser('عضو') || interaction.user;
      const user = await getUser(guildId, member.id);
      const embed = new EmbedBuilder()
        .setTitle(`📊 مستوى ${member.username}`)
        .setColor(0x2b2d31)
        .addFields(
          { name: 'المستوى', value: `${user.level}`, inline: true },
          { name: 'XP', value: `${user.xp}/${(user.level + 1) * 100}`, inline: true },
          { name: 'الرسائل', value: `${user.messages}`, inline: true }
        );
      if (generalImage) embed.setImage(generalImage);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

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
      if (generalImage) embed.setImage(generalImage);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ===== المهام =====
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

    // ===== الإجازات =====
    if (commandName === 'بانل_اجازات') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ تحتاج صلاحية متحكم.', ephemeral: true });
      }
      if (!config.leaveLogChannel) {
        await interaction.reply({ content: '⚠️ لم تُعيّن قناة سجلات الإجازات. استخدم `/تعيين قناة_سجلات_اجازات #قناة`', ephemeral: true });
      }
      const embed = new EmbedBuilder()
        .setTitle('📅 لوحة إدارة الإجازات')
        .setDescription('اضغط على الزر أدناه لتقديم طلب إجازة، أو استخدم الأزرار الأخرى للإدارة.')
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
        new ButtonBuilder().setCustomId('leave_panel_logs').setLabel('📜 سجل الإجازات').setStyle(ButtonStyle.Secondary)
      );
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      return;
    }

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

    if (commandName === 'الموافقة_على_الاجازات') {
      if (!config.leaveManagerRole || !interaction.member.roles.cache.has(config.leaveManagerRole)) {
        return interaction.reply({ content: '❌ ليس لديك الصلاحية للموافقة على الإجازات.', ephemeral: true });
      }
      const pending = await LeaveRequest.find({ guildId, status: 'pending' });
      if (!pending.length) return interaction.reply({ content: '📭 لا توجد طلبات إجازة معلقة.', ephemeral: true });
      let desc = '';
      for (const req of pending) {
        const member = await interaction.guild.members.fetch(req.userId).catch(() => null);
        const name = member ? member.user.username : 'مستخدم غير معروف';
        desc += `**${name}** - ${req.reason} (${req.duration} يوم)\n`;
      }
      const embed = new EmbedBuilder()
        .setTitle('📋 طلبات الإجازات المعلقة')
        .setDescription(desc)
        .setColor(0x2b2d31)
        .setFooter({ text: `عدد الطلبات: ${pending.length}` })
        .setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ===== المتجر =====
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
      await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
      return;
    }

    // ===== التذاكر =====
    if (commandName === 'بانل') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ تحتاج صلاحية متحكم.', ephemeral: true });
      }
      const settings = await getTicketSettings(guildId);
      const imageUrl = settings.image || 'https://i.imgur.com/GkKqN3G.png';
      const embed = new EmbedBuilder().setTitle('🎫 تذاكر دعم فني').setDescription(settings.text).setColor(0x2b2d31).setImage(imageUrl);
      if (generalImage) embed.setThumbnail(generalImage);
      const options = settings.sections.map(s => ({
        label: s.name,
        value: s.name,
        emoji: s.emoji || '📌',
      }));
      if (!options.length) {
        return interaction.reply({ content: '⚠️ لا توجد أقسام مضافة. استخدم `/تعيين تذكرة_اضافة_قسم`.', ephemeral: true });
      }
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('ticket_menu').setPlaceholder('📌 اختر القسم...').addOptions(options)
      );
      await interaction.reply({ embeds: [embed], components: [row] });
      return;
    }

    if (commandName === 'عرض_تذكرة') {
      const settings = await getTicketSettings(guildId);
      const embed = new EmbedBuilder().setTitle('📋 إعدادات التذاكر').setColor(0x2b2d31)
        .setDescription(`**النص:** ${settings.text}`)
        .addFields(
          { name: '📌 الأقسام', value: settings.sections.map((s, i) => `${i+1}. ${s.emoji || '📌'} **${s.name}** ${s.roleId ? `<@&${s.roleId}>` : '(بدون دور)'}`).join('\n') || 'لا يوجد أقسام' },
          { name: '🖼️ الصورة', value: settings.image ? `[رابط](${settings.image})` : 'لا توجد صورة' }
        );
      if (generalImage) embed.setImage(generalImage);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (commandName === 'لوق_تذكرة') {
      if (!interaction.channel.name.startsWith('🎫-تذكرة-')) {
        return interaction.reply({ content: '❌ هذا الأمر يُستخدم فقط داخل قنوات التذاكر.', ephemeral: true });
      }
      const log = await getTicketLogByChannel(interaction.channel.id);
      if (!log) {
        return interaction.reply({ content: '❌ لا توجد سجلات لهذه التذكرة.', ephemeral: true });
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

    // ===== الاقتراحات =====
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
      if (generalImage) embed.setThumbnail(generalImage);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('suggest_modal').setLabel('📝 تقديم اقتراح').setStyle(ButtonStyle.Primary)
      );
      await interaction.reply({ embeds: [embed], components: [row] });
      return;
    }

    // ===== رتب الإشعارات =====
    if (commandName === 'رتب') {
      if (!(await hasPermission(interaction.member, guildId))) {
        return interaction.reply({ content: '❌ تحتاج صلاحية متحكم.', ephemeral: true });
      }
      const defaultImage = 'https://i.imgur.com/7dXe7tM.png';
      const imageUrl = config.rolesImage || defaultImage;
      const embed = new EmbedBuilder().setTitle('🔔 رتب الإشعارات').setDescription('اختر الرتب التي تريد استلام إشعارات عنها من خلال الأزرار أدناه.').setColor(0x2b2d31).setImage(imageUrl).setFooter({ text: 'اضغط مرة للحصول على الرتبة، ومرة أخرى لإزالتها.' });
      if (generalImage) embed.setThumbnail(generalImage);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('role_game').setLabel('🎮 Game Notice').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('role_event').setLabel('📅 Event Notice').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('role_ajr').setLabel('🔊 Ajr Notice').setStyle(ButtonStyle.Secondary)
      );
      await interaction.reply({ embeds: [embed], components: [row] });
      await logToChannel(guildId, { title: '🔔 إنشاء لوحة رتب الإشعارات', color: 0x2b2d31, description: `**${interaction.user}** أنشأ لوحة رتب الإشعارات.` });
      return;
    }

    // ===== تغيير الاسم =====
    if (commandName === 'تغيير_اسم') {
      const userId = interaction.user.id;
      const last = await getNameCooldown(userId);
      if (last && Date.now() - last.getTime() < 5 * 60 * 60 * 1000) {
        const remaining = Math.ceil((5 * 60 * 60 * 1000 - (Date.now() - last.getTime())) / (60 * 60 * 1000));
        return interaction.reply({ content: `⏳ يمكنك تغيير اسمك بعد ${remaining} ساعة.`, ephemeral: true });
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

    // ===== تسجيل الدخول للمودات =====
    if (commandName === 'تسجيل_الدخول') {
      const modal = new ModalBuilder()
        .setCustomId('mod_login_modal')
        .setTitle('🔐 تسجيل دخول المودات')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('mod_password').setLabel('كلمة المرور').setStyle(TextInputStyle.Short).setRequired(true)
          )
        );
      await interaction.showModal(modal);
      return;
    }

    // ===== متحكمين =====
    if (commandName === 'متحكم') {
      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ هذا الأمر للمالك فقط.', ephemeral: true });
      }
      const target = interaction.options.getUser('عضو');
      if (!target) return interaction.reply({ content: '⚠️ يرجى تحديد عضو.', ephemeral: true });
      if (await isController(target.id, guildId)) {
        return interaction.reply({ content: `⚠️ ${target} متحكم بالفعل.`, ephemeral: true });
      }
      await addController(guildId, target.id);
      await interaction.reply({ content: `✅ تم جعل ${target} متحكماً.`, ephemeral: true });
      return;
    }

    if (commandName === 'الغاء_متحكم') {
      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ هذا الأمر للمالك فقط.', ephemeral: true });
      }
      const target = interaction.options.getUser('عضو');
      if (!target) return interaction.reply({ content: '⚠️ يرجى تحديد عضو.', ephemeral: true });
      if (!(await isController(target.id, guildId))) {
        return interaction.reply({ content: `⚠️ ${target} ليس متحكماً.`, ephemeral: true });
      }
      await removeController(guildId, target.id);
      await interaction.reply({ content: `✅ تم إلغاء صلاحية التحكم عن ${target}.`, ephemeral: true });
      return;
    }

    if (commandName === 'قائمة_المتحكمين') {
      const controllers = await getControllers(guildId);
      if (!controllers.length) return interaction.reply({ content: '📋 لا يوجد متحكمون.', ephemeral: true });
      const list = controllers.map(id => `<@${id}>`).join('\n');
      const embed = new EmbedBuilder().setTitle('🛡️ قائمة المتحكمين').setColor(0x2b2d31).setDescription(list);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // ===== تعيين الإعدادات =====
    if (commandName === 'تعيين') {
      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({ content: '❌ هذا الأمر للمالك فقط.', ephemeral: true });
      }
      const sub = interaction.options.getSubcommand();

      const handlers = {
        'ترحيب': async () => {
          const channel = interaction.options.getChannel('قناة');
          await updateGuildConfig(guildId, { welcomeChannel: channel.id });
          await interaction.reply({ content: `✅ تم تعيين قناة الترحيب إلى ${channel}`, ephemeral: true });
        },
        'سجلات': async () => {
          const channel = interaction.options.getChannel('قناة');
          await updateGuildConfig(guildId, { logChannel: channel.id });
          await interaction.reply({ content: `✅ تم تعيين قناة السجلات إلى ${channel}`, ephemeral: true });
        },
        'قناة_سجلات_تذاكر': async () => {
          const channel = interaction.options.getChannel('قناة');
          await updateGuildConfig(guildId, { ticketLogChannel: channel.id });
          await interaction.reply({ content: `✅ تم تعيين قناة سجلات التذاكر إلى ${channel}`, ephemeral: true });
        },
        'قناة_سجلات_اجازات': async () => {
          const channel = interaction.options.getChannel('قناة');
          await updateGuildConfig(guildId, { leaveLogChannel: channel.id });
          await interaction.reply({ content: `✅ تم تعيين قناة سجلات الإجازات إلى ${channel}`, ephemeral: true });
        },
        'رتبة_بائع': async () => {
          const role = interaction.options.getRole('رتبة');
          await updateGuildConfig(guildId, { sellerRole: role.id });
          await interaction.reply({ content: `✅ تم تعيين رتبة البائع: ${role}`, ephemeral: true });
        },
        'رتبة_اداري_علوي': async () => {
          const role = interaction.options.getRole('رتبة');
          await updateGuildConfig(guildId, { seniorAdminRole: role.id });
          await interaction.reply({ content: `✅ تم تعيين رتبة الإداري العلوي: ${role}`, ephemeral: true });
        },
        'رتبة_اداري_صغري': async () => {
          const role = interaction.options.getRole('رتبة');
          await updateGuildConfig(guildId, { juniorAdminRole: role.id });
          await interaction.reply({ content: `✅ تم تعيين رتبة الإداري الصغري: ${role}`, ephemeral: true });
        },
        'رتبة_مسؤول_اجازات': async () => {
          const role = interaction.options.getRole('رتبة');
          await updateGuildConfig(guildId, { leaveManagerRole: role.id });
          await interaction.reply({ content: `✅ تم تعيين رتبة مسؤول الإجازات: ${role}`, ephemeral: true });
        },
        'رتبة_متحكم_البوت': async () => {
          const role = interaction.options.getRole('رتبة');
          await updateGuildConfig(guildId, { botControllerRole: role.id });
          await interaction.reply({ content: `✅ تم تعيين رتبة متحكم البوت: ${role}`, ephemeral: true });
        },
        'نقاط_المهمة': async () => {
          const pts = interaction.options.getInteger('نقاط');
          await updateGuildConfig(guildId, { pointsPerTask: pts });
          await interaction.reply({ content: `✅ تم تعيين نقاط المهمة: ${pts}`, ephemeral: true });
        },
        'راتب_يومي': async () => {
          const salary = interaction.options.getInteger('راتب');
          await updateGuildConfig(guildId, { dailySalary: salary });
          await interaction.reply({ content: `✅ تم تعيين الراتب اليومي: ${salary} KL`, ephemeral: true });
        },
        'نقاط_الترقية': async () => {
          const pts = interaction.options.getInteger('نقاط');
          await updateGuildConfig(guildId, { promotionPoints: pts });
          await interaction.reply({ content: `✅ تم تعيين نقاط الترقية: ${pts}`, ephemeral: true });
        },
        'قناة_المتجر': async () => {
          const channel = interaction.options.getChannel('قناة');
          await updateGuildConfig(guildId, { storeChannel: channel.id });
          await interaction.reply({ content: `✅ تم تعيين قناة المتجر: ${channel}`, ephemeral: true });
        },
        'صورة_المتجر': async () => {
          const url = interaction.options.getString('رابط');
          await updateGuildConfig(guildId, { storePanelImage: url });
          await interaction.reply({ content: `✅ تم تعيين صورة المتجر: ${url}`, ephemeral: true });
        },
        'صورة_بانل_اجازات': async () => {
          const url = interaction.options.getString('رابط');
          await updateGuildConfig(guildId, { leavePanelImage: url });
          await interaction.reply({ content: `✅ تم تعيين صورة بانل الإجازات: ${url}`, ephemeral: true });
        },
        'صورة_بانل': async () => {
          const url = interaction.options.getString('رابط');
          await updateGuildConfig(guildId, { ticketPanelImage: url });
          await interaction.reply({ content: `✅ تم تعيين صورة بانل التذاكر: ${url}`, ephemeral: true });
        },
        'صورة_رتب': async () => {
          const url = interaction.options.getString('رابط');
          await updateGuildConfig(guildId, { rolesImage: url });
          await interaction.reply({ content: `✅ تم تعيين صورة رتب الإشعارات: ${url}`, ephemeral: true });
        },
        'صورة_بنر': async () => {
          const url = interaction.options.getString('رابط');
          await updateGuildConfig(guildId, { bannerImage: url });
          await interaction.reply({ content: `✅ تم تعيين صورة البنر: ${url}`, ephemeral: true });
        },
        'صورة_عامة': async () => {
          const url = interaction.options.getString('رابط');
          await updateGuildConfig(guildId, { generalImage: url });
          await interaction.reply({ content: `✅ تم تعيين الصورة العامة: ${url}`, ephemeral: true });
        },
        'قناة_اقتراح': async () => {
          const channel = interaction.options.getChannel('قناة');
          await updateGuildConfig(guildId, { suggestionsChannel: channel.id });
          await interaction.reply({ content: `✅ تم تعيين قناة الاقتراحات: ${channel}`, ephemeral: true });
        },
        'عنوان_اقتراح': async () => {
          const text = interaction.options.getString('نص');
          await updateGuildConfig(guildId, { suggestionsTitle: text });
          await interaction.reply({ content: `✅ تم تعيين عنوان الاقتراحات: "${text}"`, ephemeral: true });
        },
        'وصف_اقتراح': async () => {
          const text = interaction.options.getString('نص');
          await updateGuildConfig(guildId, { suggestionsDescription: text });
          await interaction.reply({ content: `✅ تم تعيين وصف الاقتراحات:\n${text}`, ephemeral: true });
        },
        'لون_اقتراح': async () => {
          const color = interaction.options.getString('لون');
          await updateGuildConfig(guildId, { suggestionsColor: color });
          await interaction.reply({ content: `✅ تم تعيين لون الاقتراحات: ${color}`, ephemeral: true });
        },
        'صورة_اقتراح': async () => {
          const url = interaction.options.getString('رابط');
          await updateGuildConfig(guildId, { suggestionsImage: url });
          await interaction.reply({ content: `✅ تم تعيين صورة الاقتراحات: ${url}`, ephemeral: true });
        },
        'روم_ليفل': async () => {
          const channel = interaction.options.getChannel('قناة');
          await updateGuildConfig(guildId, { levelChannelId: channel.id });
          await interaction.reply({ content: `✅ تم تعيين قناة المستويات: ${channel}`, ephemeral: true });
        },
        'دور_دخول': async () => {
          const role = interaction.options.getRole('رتبة');
          await updateGuildConfig(guildId, { joinRole: role.id });
          await interaction.reply({ content: `✅ تم تعيين دور الدخول: ${role}`, ephemeral: true });
        },
        'قناة_المهام': async () => {
          const channel = interaction.options.getChannel('قناة');
          await updateGuildConfig(guildId, { tasksChannel: channel.id });
          await interaction.reply({ content: `✅ تم تعيين قناة المهام: ${channel}`, ephemeral: true });
        },
        'قناة_الاجازات': async () => {
          const channel = interaction.options.getChannel('قناة');
          await updateGuildConfig(guildId, { leaveRequestChannel: channel.id });
          await interaction.reply({ content: `✅ تم تعيين قناة الإجازات: ${channel}`, ephemeral: true });
        },
        'قناة_المودات': async () => {
          const channel = interaction.options.getChannel('قناة');
          await updateGuildConfig(guildId, { modLoginChannel: channel.id });
          await interaction.reply({ content: `✅ تم تعيين قناة المودات: ${channel}`, ephemeral: true });
        },
        'تذكرة_اضافة_قسم': async () => {
          const name = interaction.options.getString('الاسم');
          const role = interaction.options.getRole('دور');
          const emoji = interaction.options.getString('ايموجي') || '📌';
          const settings = await getTicketSettings(guildId);
          if (settings.sections.find(s => s.name === name)) {
            return interaction.reply({ content: `⚠️ قسم "${name}" موجود بالفعل.`, ephemeral: true });
          }
          settings.sections.push({ name, roleId: role.id, emoji });
          await saveTicketSettings(guildId, settings);
          await interaction.reply({ content: `✅ تم إضافة قسم **${name}** مع دور ${role} وإيموجي ${emoji}`, ephemeral: true });
        },
        'تذكرة_حذف_قسم': async () => {
          const name = interaction.options.getString('الاسم');
          const settings = await getTicketSettings(guildId);
          const idx = settings.sections.findIndex(s => s.name === name);
          if (idx === -1) return interaction.reply({ content: `⚠️ قسم "${name}" غير موجود.`, ephemeral: true });
          settings.sections.splice(idx, 1);
          await saveTicketSettings(guildId, settings);
          await interaction.reply({ content: `✅ تم حذف قسم **${name}**`, ephemeral: true });
        },
        'تذكرة_تعيين_ايموجي': async () => {
          const name = interaction.options.getString('الاسم');
          const emoji = interaction.options.getString('ايموجي');
          const settings = await getTicketSettings(guildId);
          const section = settings.sections.find(s => s.name === name);
          if (!section) return interaction.reply({ content: `⚠️ قسم "${name}" غير موجود.`, ephemeral: true });
          section.emoji = emoji;
          await saveTicketSettings(guildId, settings);
          await interaction.reply({ content: `✅ تم تعيين الإيموجي ${emoji} لقسم **${name}**`, ephemeral: true });
        },
        'تذكرة_نص': async () => {
          const text = interaction.options.getString('نص');
          const settings = await getTicketSettings(guildId);
          settings.text = text;
          await saveTicketSettings(guildId, settings);
          await interaction.reply({ content: `✅ تم تغيير نص التذاكر:\n${text}`, ephemeral: true });
        },
        'تذكرة_صورة': async () => {
          const url = interaction.options.getString('رابط');
          const settings = await getTicketSettings(guildId);
          settings.image = url;
          await saveTicketSettings(guildId, settings);
          await interaction.reply({ content: `✅ تم تغيير صورة التذاكر: ${url}`, ephemeral: true });
        },
        'اوتر_لاين': async () => {
          const channel = interaction.options.getChannel('قناة');
          const text = interaction.options.getString('نص');
          await setAutoLine(guildId, channel.id, { text, enabled: true });
          await interaction.reply({ content: `✅ تم تعيين الأوتو لاين في ${channel}`, ephemeral: true });
        },
        'صورة_اوترلاين': async () => {
          const channel = interaction.options.getChannel('قناة');
          const url = interaction.options.getString('رابط');
          await setAutoLine(guildId, channel.id, { image: url });
          await interaction.reply({ content: `✅ تم تعيين صورة الأوتو لاين في ${channel}`, ephemeral: true });
        },
        'تفعيل_اوترلاين': async () => {
          const channel = interaction.options.getChannel('قناة');
          await setAutoLine(guildId, channel.id, { enabled: true });
          await interaction.reply({ content: `✅ تم تفعيل الأوتو لاين في ${channel}`, ephemeral: true });
        },
        'تعطيل_اوترلاين': async () => {
          const channel = interaction.options.getChannel('قناة');
          await setAutoLine(guildId, channel.id, { enabled: false });
          await interaction.reply({ content: `✅ تم تعطيل الأوتو لاين في ${channel}`, ephemeral: true });
        },
        'حذف_اوترلاين': async () => {
          const channel = interaction.options.getChannel('قناة');
          await deleteAutoLine(guildId, channel.id);
          await interaction.reply({ content: `✅ تم حذف الأوتو لاين من ${channel}`, ephemeral: true });
        },
        'رسالة_ترحيب': async () => {
          const text = interaction.options.getString('نص');
          await updateGuildConfig(guildId, { welcomeMessage: text });
          await interaction.reply({ content: `✅ تم تعيين رسالة الترحيب:\n${text}`, ephemeral: true });
        },
        'صورة_ترحيب': async () => {
          const url = interaction.options.getString('رابط');
          await updateGuildConfig(guildId, { welcomeImage: url });
          await interaction.reply({ content: `✅ تم تعيين صورة الترحيب: ${url}`, ephemeral: true });
        },
        'عنوان_ترحيب': async () => {
          const text = interaction.options.getString('نص');
          await updateGuildConfig(guildId, { welcomeTitle: text });
          await interaction.reply({ content: `✅ تم تعيين عنوان الترحيب: "${text}"`, ephemeral: true });
        },
        'خلفية_ترحيب': async () => {
          const val = interaction.options.getString('خلفية');
          await updateGuildConfig(guildId, { welcomeBackground: val });
          await interaction.reply({ content: `✅ تم تعيين خلفية الترحيب: ${val}`, ephemeral: true });
        },
        'اضافة_منتج': async () => {
          const role = interaction.options.getRole('رتبة');
          const price = interaction.options.getInteger('السعر');
          const desc = interaction.options.getString('الوصف') || 'لا يوجد وصف';
          await addStoreItem(guildId, role.id, price, desc);
          await interaction.reply({ content: `✅ تم إضافة المنتج ${role} بسعر ${price} KL`, ephemeral: true });
        },
        'حذف_منتج': async () => {
          const id = interaction.options.getString('معرف');
          const result = await removeStoreItem(guildId, id);
          if (result.deletedCount) {
            await interaction.reply({ content: '✅ تم حذف المنتج.', ephemeral: true });
          } else {
            await interaction.reply({ content: '❌ المنتج غير موجود.', ephemeral: true });
          }
        },
        'رد_تلقائي': async () => {
          const keyword = interaction.options.getString('كلمة');
          const reply = interaction.options.getString('الرد');
          const added = await addAutoReply(guildId, keyword, reply);
          await interaction.reply({ content: `✅ ${added ? 'تمت الإضافة' : 'تم التحديث'} للكلمة ${keyword}`, ephemeral: true });
        },
        'رد_تلقائي_صورة': async () => {
          const keyword = interaction.options.getString('كلمة');
          const reply = interaction.options.getString('الرد');
          const url = interaction.options.getString('رابط');
          const added = await addAutoReply(guildId, keyword, reply, url);
          await interaction.reply({ content: `✅ ${added ? 'تمت الإضافة' : 'تم التحديث'} للكلمة ${keyword} مع صورة`, ephemeral: true });
        },
        'حذف_رد_تلقائي': async () => {
          const keyword = interaction.options.getString('كلمة');
          const removed = await removeAutoReply(guildId, keyword);
          if (removed) {
            await interaction.reply({ content: `✅ تم حذف الرد للكلمة ${keyword}`, ephemeral: true });
          } else {
            await interaction.reply({ content: `⚠️ لا يوجد رد للكلمة ${keyword}`, ephemeral: true });
          }
        }
      };

      if (handlers[sub]) {
        await handlers[sub]();
      } else {
        await interaction.reply({ content: '⚠️ خيار غير معروف.', ephemeral: true });
      }
      return;
    }

    await interaction.reply({ content: '⚠️ أمر غير معروف.', ephemeral: true });

  } catch (error) {
    console.error('❌ خطأ في معالج السلاش:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ حدث خطأ.', ephemeral: true }).catch(() => {});
    }
  }
});

// ============================================================
// ========== معالج التفاعلات (الأزرار، القوائم، المودالات) ==========
// ============================================================

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;
  const guildId = interaction.guild.id;
  const config = await getGuildConfig(guildId);
  const generalImage = getGeneralImage(interaction.guild, config);

  try {
    // ===== طلب إجازة (زر) =====
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

    // ===== مودال طلب الإجازة =====
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

    // ===== أزرار الموافقة على الإجازات =====
    if (interaction.isButton() && interaction.customId.startsWith('leave_')) {
      const parts = interaction.customId.split('_');
      const action = parts[1];
      const requestId = parts[2];
      const request = await LeaveRequest.findById(requestId);
      if (!request) return interaction.reply({ content: '❌ الطلب غير موجود.', ephemeral: true });
      if (!config.leaveManagerRole || !interaction.member.roles.cache.has(config.leaveManagerRole))
        return interaction.reply({ content: '❌ ليس لديك صلاحية.', ephemeral: true });
      if (request.status !== 'pending') return interaction.reply({ content: '⚠️ تمت معالجة هذا الطلب مسبقاً.', ephemeral: true });

      if (action === 'approve') {
        request.status = 'approved';
        request.approvedBy = interaction.user.id;
        await request.save();
        await createLeaveLog(guildId, request.userId, 'approved', request._id, `بواسطة ${interaction.user.tag}`);
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
        if (config.leaveLogChannel) {
          const logChannel = interaction.guild.channels.cache.get(config.leaveLogChannel);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setTitle('✅ تمت الموافقة على إجازة')
              .setDescription(`**<@${request.userId}>** تمت الموافقة على إجازته لمدة ${request.duration} يوم.\nالموافق: ${interaction.user}`)
              .setColor(0x2b2d31)
              .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
          }
        }
        await interaction.reply({ content: `✅ تمت الموافقة على إجازة <@${request.userId}>.`, ephemeral: false });
        try {
          const userMember = await interaction.guild.members.fetch(request.userId);
          await userMember.send(`✅ تمت الموافقة على طلب إجازتك لمدة ${request.duration} يوم.`);
        } catch (e) {}
      } else if (action === 'reject') {
        request.status = 'rejected';
        await request.save();
        await createLeaveLog(guildId, request.userId, 'rejected', request._id, `بواسطة ${interaction.user.tag}`);
        if (config.leaveLogChannel) {
          const logChannel = interaction.guild.channels.cache.get(config.leaveLogChannel);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setTitle('❌ تم رفض إجازة')
              .setDescription(`**<@${request.userId}>** تم رفض إجازته.\nالرافض: ${interaction.user}`)
              .setColor(0x2b2d31)
              .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
          }
        }
        await interaction.reply({ content: `❌ تم رفض إجازة <@${request.userId}>.`, ephemeral: false });
        try {
          const userMember = await interaction.guild.members.fetch(request.userId);
          await userMember.send(`❌ تم رفض طلب إجازتك.`);
        } catch (e) {}
      }
      return;
    }

    // ===== أزرار لوحة الإجازات =====
    if (interaction.isButton() && interaction.customId.startsWith('leave_panel_')) {
      const action = interaction.customId.replace('leave_panel_', '');
      if (action === 'pending') {
        const pending = await LeaveRequest.find({ guildId, status: 'pending' });
        if (!pending.length) return interaction.reply({ content: '📭 لا توجد طلبات معلقة.', ephemeral: true });
        let desc = '';
        for (const req of pending) {
          const member = await interaction.guild.members.fetch(req.userId).catch(() => null);
          const name = member ? member.user.username : 'مستخدم غير معروف';
          desc += `**${name}** - ${req.reason} (${req.duration} يوم)\n`;
        }
        const embed = new EmbedBuilder()
          .setTitle('📋 طلبات الإجازات المعلقة')
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
        if (!active.length) return interaction.reply({ content: '📭 لا توجد إجازات نشطة.', ephemeral: true });
        let desc = '';
        for (const leave of active) {
          const member = await interaction.guild.members.fetch(leave.userId).catch(() => null);
          const name = member ? member.user.username : 'مستخدم غير معروف';
          const remaining = Math.ceil((leave.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          desc += `**${name}** - ${leave.reason}\n⏳ متبقي **${remaining}** يوم\n`;
        }
        const embed = new EmbedBuilder()
          .setTitle('📊 الإجازات النشطة')
          .setDescription(desc)
          .setColor(0x2b2d31)
          .setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } else if (action === 'logs') {
        const logs = await getLeaveLogs(guildId, 20);
        if (!logs.length) return interaction.reply({ content: '📭 لا توجد سجلات.', ephemeral: true });
        let desc = '';
        for (const log of logs) {
          const member = await interaction.guild.members.fetch(log.userId).catch(() => null);
          const name = member ? member.user.username : 'مستخدم غير معروف';
          const actionMap = {
            'requested': '📩 طلب',
            'approved': '✅ موافقة',
            'rejected': '❌ رفض',
            'ended': '🔚 انتهاء'
          };
          desc += `**${name}** ${actionMap[log.action] || log.action} - ${log.details || ''}\n`;
        }
        const embed = new EmbedBuilder()
          .setTitle('📜 سجل الإجازات')
          .setDescription(desc)
          .setColor(0x2b2d31)
          .setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
      return;
    }

    // ===== المهام =====
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
      try { await target.send(`📩 تم تكليفك بمهمة جديدة: **${title}**\nنقاط KL: ${klPoints} | نقاط إدارية: ${adminPoints}\nاستخدم /لوحة_المهام لقبولها.`); } catch (e) {}
      return;
    }

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
      const creator = await interaction.guild.members.fetch(task.assignedBy).catch(() => null);
      await interaction.reply({
        content: `✅ تم إنهاء المهمة **${task.title}**\nحصلت على **${task.points} KL** و **${task.adminPoints} نقاط إدارية**.\nالإثبات: ${proofText}${proofImage ? `\n[صورة](${proofImage})` : ''}`,
        ephemeral: true
      });
      return;
    }

    // ===== المتجر =====
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
      // نسمح بطلبات متعددة، لا نتحقق من وجود طلب معلق
      const purchase = await createPendingPurchase(guildId, interaction.user.id, item.roleId, role.name, item.price);
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
        if (user.kl < purchase.price) {
          return interaction.reply({ content: `⚠️ رصيد المستخدم غير كافٍ. لديه ${user.kl} KL فقط.`, ephemeral: true });
        }
        user.kl -= purchase.price;
        await user.save();
        await member.roles.add(role);
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

    // ===== التذاكر =====
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_menu') {
      const sectionName = interaction.values[0];
      const settings = await getTicketSettings(guildId);
      const section = settings.sections.find(s => s.name === sectionName);
      if (!section) {
        return interaction.reply({ content: '❌ قسم غير موجود.', ephemeral: true });
      }
      const role = section.roleId ? interaction.guild.roles.cache.get(section.roleId) : null;
      
      // الحصول على رقم التذكرة التالي
      const ticketNumber = await getNextTicketNumber(guildId);
      const channelName = `🎫-تذكرة-${ticketNumber}`;
      
      const channel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: interaction.channel.parentId,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          ...(role ? [{ id: role.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }] : [])
        ]
      });
      
      await createTicketLog(guildId, channel.id, interaction.user.id, sectionName);
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('claim_ticket').setLabel('📥 استلام التذكرة').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('add_member_ticket').setLabel('➕ إضافة عضو').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 إغلاق').setStyle(ButtonStyle.Danger)
      );
      
      const embed = new EmbedBuilder()
        .setTitle(`🎫 تذكرة جديدة (#${ticketNumber})`)
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

    if (interaction.isButton() && interaction.customId === 'claim_ticket') {
      if (!interaction.channel.name.startsWith('🎫-تذكرة-')) {
        return interaction.reply({ content: '❌ هذه ليست قناة تذكرة.', ephemeral: true });
      }
      // منح صلاحيات إدارة القناة للمستخدم
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

    if (interaction.isButton() && interaction.customId === 'add_member_ticket') {
      if (!interaction.channel.name.startsWith('🎫-تذكرة-')) {
        return interaction.reply({ content: '❌ هذه ليست قناة تذكرة.', ephemeral: true });
      }
      const modal = new ModalBuilder()
        .setCustomId('add_member_modal')
        .setTitle('➕ إضافة عضو إلى التذكرة')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('member_input')
              .setLabel('معرف العضو أو منشنه (مثل <@123456>)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setPlaceholder('أدخل المعرف أو @المنشن')
          )
        );
      await interaction.showModal(modal);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'add_member_modal') {
      const input = interaction.fields.getTextInputValue('member_input').trim();
      // استخراج المعرف من المنشن أو من النص
      let memberId = input;
      const mentionMatch = input.match(/^<@!?(\d+)>$/);
      if (mentionMatch) {
        memberId = mentionMatch[1];
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
        if (!added.includes(member.id)) {
          added.push(member.id);
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

    if (interaction.isButton() && interaction.customId === 'close_ticket') {
      if (!interaction.channel.name.startsWith('🎫-تذكرة-')) {
        return interaction.reply({ content: '❌ هذه ليست قناة تذكرة.', ephemeral: true });
      }
      // التحقق من الصلاحية: متحكم البوت، المنشئ، أو المستلم
      const log = await getTicketLogByChannel(interaction.channel.id);
      if (!log) return interaction.reply({ content: '❌ لا توجد سجلات.', ephemeral: true });
      const isCreator = log.userId === interaction.user.id;
      const isClaimer = log.claimedBy === interaction.user.id;
      const isBotController = await isBotController(interaction.member, guildId);
      const isAdmin = await hasPermission(interaction.member, guildId);
      if (!isCreator && !isClaimer && !isBotController && !isAdmin) {
        return interaction.reply({ content: '❌ ليس لديك صلاحية إغلاق هذه التذكرة. (مسموح فقط لمنشئها، مستلمها، متحكم البوت، أو إداري)', ephemeral: true });
      }

      // تحديث السجل
      await updateTicketLog(interaction.channel.id, { status: 'closed', closedAt: new Date() });
      const updatedLog = await getTicketLogByChannel(interaction.channel.id);
      const config = await getGuildConfig(guildId);
      let htmlBuffer = null;
      let generationFailed = false;
      try {
        const html = await generateTicketHTML(interaction.channel, updatedLog);
        htmlBuffer = Buffer.from(html, 'utf-8');
      } catch (e) {
        console.error('❌ خطأ في توليد HTML للإغلاق:', e);
        generationFailed = true;
      }
      const creator = await interaction.guild.members.fetch(updatedLog.userId).catch(() => null);
      const claimedBy = updatedLog.claimedBy ? await interaction.guild.members.fetch(updatedLog.claimedBy).catch(() => null) : null;
      const addedMembersList = updatedLog.addedMembers || [];
      const addedMembersMentions = addedMembersList.length ? addedMembersList.map(id => `<@${id}>`).join(', ') : 'لا يوجد';
      const embed = new EmbedBuilder()
        .setTitle('📋 تقرير التذكرة - مغلقة')
        .setColor(0x2b2d31)
        .addFields(
          { name: '🆔 معرف القناة', value: `#${interaction.channel.name}`, inline: true },
          { name: '👤 منشئ التذكرة', value: creator ? creator.toString() : 'غير معروف', inline: true },
          { name: '📂 القسم', value: updatedLog.section || 'غير محدد', inline: true },
          { name: '📅 وقت الفتح', value: `<t:${Math.floor(updatedLog.createdAt.getTime() / 1000)}:F>`, inline: true },
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

    // ===== الاقتراحات =====
    if (interaction.isButton() && interaction.customId === 'suggest_modal') {
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

    // ===== رتب الإشعارات =====
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

    // ===== تغيير الاسم (مودال) =====
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

    // ===== تسجيل الدخول للمودات (مودال) =====
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
