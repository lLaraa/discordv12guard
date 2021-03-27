const { Discord, Client, MessageEmbed } = require("discord.js");
const config = require('./config.json')
const whitelist = require('./güvenli.json')
const client = new Client({
  ignoreDirect: true,
  ignoreRoles: true,
  ignoreEveryone: true
});
require('events').EventEmitter.defaultMaxListeners = Infinity; 


client.on("ready", async () => {
   client.user.setPresence({ activity: { name: config.Durum }, status: "idle" });
  let botVoiceChannel = client.channels.cache.get(config.botVoiceChannel);
  if (botVoiceChannel) botVoiceChannel.join().catch(err => console.error("Bot ses kanalına bağlanamadı!"));
});

client.login(config.token).catch(err => console.log('Tokene bağlanamadım. Lütfen değiştir veya yeni token gir'));
client.once('ready', () => {
  console.log('Bot Başarıyla Aktifleştirildi.')
})

client.on("message", async message => {
  if (message.author.bot || !message.guild || !message.content.toLowerCase().startsWith(config.prefix)) return;
  if (message.author.id !== config.Owner && message.author.id !== message.guild.owner.id) return;
  let args = message.content.split(' ').slice(1);
  let command = message.content.split(' ')[0].slice(config.prefix.length);
  let embed = new MessageEmbed().setColor("RANDOM").setAuthor(message.member.displayName, message.author.avatarURL({ dynamic: true, })).setTimestamp();

  
  if(command === "güvenli") {
        let safemember = whitelist.güvenli || [];

        message.channel.send(embed.addField("Güvenli Liste", safemember.length > 0 ? safemember.map(g => (message.guild.roles.cache.has(g.slice(1)) || message.guild.members.cache.has(g.slice(1))) ? (message.guild.roles.cache.get(g.slice(1)) || message.guild.members.cache.get(g.slice(1))) : g).join('\n') : "Herhangi bir üye bulunamadı."));

  }

  if(command === "ytkapat") {
    let guildID = config.guildID;
    let sunucu = client.guilds.cache.get(guildID);
    if (!sunucu) return;
    sunucu.roles.cache.filter(r => r.editable && (r.permissions.has("ADMINISTRATOR") || r.permissions.has("MANAGE_GUILD") || r.permissions.has("MANAGE_ROLES") || r.permissions.has("MANAGE_WEBHOOKS"))).forEach(async r => {
      await r.setPermissions(0);
    });
    message.channel.send(new MessageEmbed().setColor("#00ffdd").setTitle('İzinler Kapatıldı!').setDescription(`Rollerin yetkileri kapatıldı!`).setTimestamp()).catch(); 
  };
})


function güvenli(strg) {
  let member = client.guilds.cache.get(config.guildID).members.cache.get(strg);
  let guvenliler = whitelist.güvenli || [];
  if (!member || member.id === client.user.id || member.id === config.Owner || member.id === member.guild.owner.id || guvenliler.some(g => member.id === g.slice(1) || member.roles.cache.has(g.slice(1)))) return true
  else return false;
};

const yetkiPermleri = ["ADMINISTRATOR", "MANAGE_ROLES", "MANAGE_CHANNELS", "MANAGE_GUILD", "BAN_MEMBERS", "KICK_MEMBERS", "MANAGE_NICKNAMES", "MANAGE_EMOJIS", "MANAGE_WEBHOOKS"];
function punish(strg, hammer) {
  let member = client.guilds.cache.get(config.guildID).members.cache.get(strg);
  if (!member) return;
  if (hammer == "jail") return member.roles.cache.has(config.booster) ? member.roles.set([config.booster, config.jail]) : member.roles.set([config.jail]).catch(err => console.log('Kişiyi Sunucudan atamadım. Lütfen Kontrol ediniz.'));
  if (hammer == "ban") return member.ban({ reason: "Guard Tarafından Banlandı." }).catch(err => console.log('Kişiyi banlayamadım. Lütfen kontrol ediniz.'));
};


client.on('guildUpdate', async (oldGuild, newGuild) => {
  let raviwen = await newGuild.fetchAuditLogs({type: 'GUILD_UPDATE'}).then(audit => audit.entries.first());
  if (!raviwen || !raviwen.executor || güvenli(raviwen.executor.id)) return ;
  punish(raviwen.executor.id, "ban");
  if (newGuild.name !== oldGuild.name) newGuild.setName(oldGuild.name);
  if (newGuild.iconURL({dynamic: true, size: 2048}) !== oldGuild.iconURL({dynamic: true, size: 2048})) newGuild.setIcon(oldGuild.iconURL({dynamic: true, size: 2048}));
  client.channels.cache.get(config.Log.GuildUpdateLog).send(new MessageEmbed().setTitle('**Sunucu Güncellendi**').setColor("RED").setTimestamp().setDescription(`${raviwen.executor} \`${raviwen.executor.id}\` sunucuyu güncelledi. \n Sunucuyu eski haline çevirdim ve güncelleyen kişiyi banladım.`))
})

client.on('guildMemberAdd', async member => {
  let raviwen = await member.guild.fetchAuditLogs({type: 'BOT_ADD'}).then(audit => audit.entries.first());
  if (!member.user.bot || !raviwen || !raviwen.executor || güvenli(raviwen.executor.id)) return;
  punish(raviwen.executor.id, "ban");
  punish(member.id, "ban");
  client.channels.cache.get(config.Log.BotAddLog).send(new MessageEmbed().setTitle('**Bir Bot Eklendi**').setColor("RED").setTimestamp().setDescription(`${raviwen.executor} \`${raviwen.executor.id}\` Tarafından bot eklendi. \n ${raviwen.executor} ve ${member} banladım.`).addField('Eklenen Bot', member))
})

client.on("guildMemberRemove", async member => {
  let raviwen = await member.guild.fetchAuditLogs({type: 'MEMBER_KICK'}).then(audit => audit.entries.first());
  if ( !raviwen || !raviwen.executor || güvenli(raviwen.executor.id)) return;
  punish(raviwen.executor.id, "ban")
  client.channels.cache.get(config.Log.KickLog).send(new MessageEmbed().setTitle('**Üye Tarafından Kick Atıldı**').setColor("RED").setTimestamp().setDescription(`${raviwen.executor} \`${raviwen.executor.id}\` Tarafından kick atıldı.`).addField('Kicklenen Üye', member))
})

client.on('guildBanAdd', async (guild, user) => {
  let raviwen = await guild.fetchAuditLogs({type: 'MEMBER_BAN_ADD'}).then(audit => audit.entries.first());
  if (!raviwen || !raviwen.executor || güvenli(raviwen.executor.id)) return;
  punish(raviwen.executor.id, "ban");
  guild.members.unban(user.id, "Sağ Tık ile banlandığını için banını geri açtım.").catch(err => console.log('Kişinin banını açamadım. Satır 116'))
  client.channels.cache.get(config.Log.BanLog).send(new MessageEmbed().setTitle('**Üye Tarafından Ban Atıldı**').setColor("RED").setTimestamp().setDescription(`${raviwen.executor} \`${raviwen.executor.id}\` Tarafından ban atıldı. \n Ban atan kişiyi banladım ve banlanan kişinin banını kaldırdım.`).addField('Banlanan Üye', user))

})

client.on('roleCreate', async role => {
  let raviwen = await role.guild.fetchAuditLogs({type: 'ROLE_CREATE'}).then(audit => audit.entries.first());
  if (!raviwen || !raviwen.executor || güvenli(raviwen.executor.id)) return;
  role.delete({reason: "Guard Bot Tarafından Silidnid"})
  punish(raviwen.executor.id, "jail")
  client.channels.cache.get(config.Log.RoleLog).send(new MessageEmbed().setTitle('**Bir Rol Oluşturuldu**').setColor("RED").setTimestamp().setDescription(`${raviwen.executor} \`${raviwen.executor.id}\` Tarafından rol oluşturuldu \n Rolü oluşturan kişiyi Jail Attım ve Oluşturulan rolü sildim.`))
})

client.on('channelCreate', async channel => {
  let raviwen = await channel.guild.fetchAuditLogs({type: 'CHANNEL_CREATE'}).then(audit => audit.entries.first());
  if (!raviwen || !raviwen.executor || güvenli(raviwen.executor.id)) return;
  channel.delete({reason: 'Guard Bot Tarafından Silindi'})
  punish(raviwen.executor.id, "jail")
  client.channels.cache.get(config.Log.ChannelLog).send(new MessageEmbed().setTitle('**Bir Kanal Oluşturuldu**').setColor("RED").setTimestamp().setDescription(`${raviwen.executor} \`${raviwen.executor.id}\` Tarafından Kanal oluşturuldu \n Kanalı oluşturan kişiyi Jail Attım ve Oluşturulan kanalı sildim.`))
})

client.on("channelDelete", async channel => {
  let raviwen = await channel.guild.fetchAuditLogs({type: 'CHANNEL_DELETE'}).then(audit => audit.entries.first());
  if (!raviwen || !raviwen.executor || güvenli(raviwen.executor.id)) return;
  punish(raviwen.executor.id, "ban");
  await channel.clone({ reason: "Guard Bot Tarafından Oluşturuldu" }).then(async kanal => {
    if (channel.parentID != null) await kanal.setParent(channel.parentID);
    await kanal.setPosition(channel.position);
    if (channel.type == "category") await channel.guild.channels.cache.filter(k => k.parentID == channel.id).forEach(x => x.setParent(kanal.id));
  });
  client.channels.cache.get(config.Log.ChannelLog).send(new MessageEmbed().setTitle('**Bir Kanal Silindi**').setColor("RED").setTimestamp().setDescription(`${raviwen.executor} \`${raviwen.executor.id}\` Tarafından kanal silindi. \n Kanalı silen kişiyi banladım ve kanalı yeniden oluşturdum. (Deleted Yazıyorsa Denetim Kaydını İnceleyiniz) \n Geri oluşturulan kanalın ayarlarını düzenleyiniz.`).addField('Silinen Kanal', channel))

});


