import {Client,ModalBuilder,REST,Routes,SlashCommandBuilder,Events,GatewayIntentBits,Partials,ChannelType,PermissionFlagsBits,EmbedBuilder,AuditLogEvent,MessageFlags,MessageType,PermissionsBitField} from "discord.js";
import "dotenv/config";
import fs from 'fs/promises';
import path from 'path';
const COUNTING_CHANNEL = "1514978569158135919";
const FILE_PATH = path.resolve("./counting.json");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User,
  ]
});
const LOG_CHANNEL_ID = "1514976269425578004";
export function initAuditLogs(client) {
  const sendLog = async (
    title,
    user,
    text,
    color = "#ffffff",
    thumb = null,
    channelId = null,
  ) => {
    if (channelId === LOG_CHANNEL_ID) return;
    const chan = client.channels.cache.get(LOG_CHANNEL_ID);
    if (!chan) return;
    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({
        name: user?.tag || "System / Admin",
        iconURL: user?.displayAvatarURL() || client.user.displayAvatarURL(),
      })
      .setDescription(`**Event:** \`${title}\`\n${text}`)
      .setFooter({ text: "Kekse Clan Security | Master Log" })
      .setTimestamp();
    if (thumb) embed.setThumbnail(thumb);
    await chan.send({ embeds: [embed] }).catch(() => {});
  };
  client.on(Events.MessageDelete, async (msg) => {
    if (msg.partial || msg.author?.bot || msg.channel.id === LOG_CHANNEL_ID)
      return;
    const ghostPing =
      msg.mentions.users.size > 0 ? "⚠️ **GHOST PING ERKANNT**\n" : "";
    await sendLog(
      "Nachricht gelöscht",
      msg.author,
      `${ghostPing}**Kanal:** ${msg.channel}\n**Inhalt:**\n\`\`\`${msg.content || "Kein Textinhalt"}\`\`\``,
      "#ffffff",
      null,
      msg.channel.id,
    );
  });
  client.on(Events.MessageUpdate, async (oldMsg, newMsg) => {
    if (
      oldMsg.partial ||
      oldMsg.content === newMsg.content ||
      oldMsg.author?.bot ||
      oldMsg.channel.id === LOG_CHANNEL_ID
    )
      return;
    await sendLog(
      "Nachricht editiert",
      oldMsg.author,
      `**Kanal:** ${oldMsg.channel}\n**Vorher:**\n\`\`\`${oldMsg.content}\`\`\`\n**Nachher:**\n\`\`\`${newMsg.content}\`\`\``,
      "#ffffff",
      null,
      oldMsg.channel.id,
    );
  });
  client.on(Events.GuildMemberAdd, async (member) => {
    await sendLog(
      "User Join",
      member.user,
      `<@${member.id}> (${member.user.tag}) ist beigetreten.\nAccount erstellt: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
      "#ffffff",
      member.user.displayAvatarURL(),
    );
  });
  client.on(Events.GuildMemberRemove, async (member) => {
    await sendLog(
      "User Leave",
      member.user,
      `<@${member.id}> (${member.user.tag}) ist gegangen oder wurde entfernt.`,
      "#f04747",
      member.user.displayAvatarURL(),
    );
  });
  client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    if (oldMember.nickname !== newMember.nickname) {
      await sendLog(
        "Nickname geändert",
        newMember.user,
        `Alt: \`${oldMember.nickname || "Kein"}\`\nNeu: \`${newMember.nickname || "Kein"}\``,
      );
    }
    const addedRoles = newMember.roles.cache.filter(
      (r) => !oldMember.roles.cache.has(r.id),
    );
    const removedRoles = oldMember.roles.cache.filter(
      (r) => !newMember.roles.cache.has(r.id),
    );
    if (addedRoles.size > 0)
      await sendLog(
        "Rolle vergeben",
        newMember.user,
        `Hinzugefügt: ${addedRoles.map((r) => r.name).join(", ")}`,
        "#43b581",
      );
    if (removedRoles.size > 0)
      await sendLog(
        "Rolle entfernt",
        newMember.user,
        `Entfernt: ${removedRoles.map((r) => r.name).join(", ")}`,
        "#f04747",
      );
  });
  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    const user = newState.member.user;
    if (!oldState.channelId && newState.channelId) {
      await sendLog(
        "VC Join",
        user,
        `Kanal: <#${newState.channelId}>`,
        "#ffffff",
      );
    } else if (oldState.channelId && !newState.channelId) {
      await sendLog(
        "VC Leave",
        user,
        `Kanal: <#${oldState.channelId}>`,
        "#ffffff",
      );
    } else if (oldState.channelId !== newState.channelId) {
      await sendLog(
        "VC Wechsel",
        user,
        `<#${oldState.channelId}> ➔ <#${newState.channelId}>`,
        "#ffffff",
      );
    }
    if (!oldState.selfMute && newState.selfMute) {
      await sendLog(
        "User gestummt (VC)",
        user,
        `In Kanal: <#${newState.channelId}>`,
      );
    }
  });
  client.on(Events.GuildAuditLogEntryCreate, async (entry) => {
    const { action, executorId, targetId } = entry;
    const executor = await client.users.fetch(executorId).catch(() => null);
    if (action === AuditLogEvent.ChannelCreate) {
      await sendLog(
        "Channel erstellt",
        executor,
        `ID: <#${targetId}>\nEin neuer Kanal wurde angelegt.`,
      );
    }
    if (action === AuditLogEvent.ChannelDelete) {
      await sendLog(
        "Channel gelöscht",
        executor,
        `ID: \`${targetId}\` (Kanal wurde entfernt)`,
        "#ffffff",
      );
    }
    if (action === AuditLogEvent.ChannelUpdate) {
      await sendLog(
        "Channel aktualisiert",
        executor,
        `Einstellungen in <#${targetId}> wurden geändert.`,
      );
    }
    if (
      action === AuditLogEvent.ChannelOverwriteUpdate ||
      action === AuditLogEvent.ChannelOverwriteCreate ||
      action === AuditLogEvent.ChannelOverwriteDelete
    ) {
      await sendLog(
        "Channel Permissions aktualisiert",
        executor,
        `Berechtigungen in <#${targetId}> wurden modifiziert.`,
        "#ffffff",
      );
    }
    if (action === AuditLogEvent.ThreadCreate) {
      await sendLog("Thread erstellt", executor, `Thread: <#${targetId}>`);
    }
    if (action === AuditLogEvent.ThreadDelete) {
      await sendLog(
        "Thread gelöscht",
        executor,
        `Ein Thread wurde entfernt.`,
        "#ffffff",
      );
    }
    if (action === AuditLogEvent.ThreadUpdate) {
      await sendLog(
        "Thread aktualisiert",
        executor,
        `Thread <#${targetId}> wurde bearbeitet.`,
      );
    }
    if (action === AuditLogEvent.RoleCreate) {
      await sendLog(
        "Rolle erstellt",
        executor,
        `Eine neue Rolle wurde angelegt.`,
      );
    }
    if (action === AuditLogEvent.RoleDelete) {
      await sendLog(
        "Rolle gelöscht",
        executor,
        `ID: \`${targetId}\` (Rolle wurde entfernt)`,
        "#ffffff",
      );
    }
    if (action === AuditLogEvent.RoleUpdate) {
      await sendLog(
        "Rolle aktualisiert",
        executor,
        `Die Rolle <@&${targetId}> wurde bearbeitet.`,
      );
    }
    if (action === AuditLogEvent.InviteCreate) {
      await sendLog(
        "Invite erstellt",
        executor,
        `Ein neuer Einladungslink wurde generiert.`,
      );
    }
    if (action === AuditLogEvent.GuildUpdate) {
      await sendLog(
        "Server aktualisiert",
        executor,
        `Die allgemeinen Server-Einstellungen wurden geändert.`,
        "#ffffff",
      );
    }
    if (action === AuditLogEvent.MemberBanAdd)
      await sendLog("BAN", executor, `Ziel: <@${targetId}>`, "#ffffff");
    if (action === AuditLogEvent.MemberBanRemove)
      await sendLog("UNBAN", executor, `Ziel: <@${targetId}>`, "#ffffff");
    if (action === AuditLogEvent.MemberKick)
      await sendLog("KICK", executor, `Ziel: <@${targetId}>`, "#ffffff");
  });
  client.on(Events.GuildInviteCreate, async (invite) => {
    await sendLog(
      "Invite gesendet",
      invite.inviter,
      `Code: \`${invite.code}\`\nKanal: <#${invite.channelId}>`,
    );
  });
}
const defaultData = {
  currentNumber: 1,
  direction: 1,
  lastUserId: null,
  lastCountingTime: null,
  scoreboard: {},
  systemPuffer: 0,
  lastPufferGranted: 0,
  lastMessageId: null
};

let countingData = { ...defaultData };
async function loadCounting() {
  try {
    const data = await fs.readFile(FILE_PATH, "utf-8");
    countingData = JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      await saveCounting();
    } else {
      console.error("Fehler beim Lesen der JSON-Datenbank:", err);
    }
  }
}
async function saveCounting() {
  try {
    await fs.writeFile(FILE_PATH, JSON.stringify(countingData, null, 2), "utf-8");
  } catch (err) {
    console.error("Fehler beim Schreiben in die JSON-Datenbank:", err);
  }
}

export async function initCounting(client) {
  await loadCounting();

  const sendKekseLog = async (action, user, details) => {
    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel) return;

    const logEmbed = new EmbedBuilder()
      .setColor("#ffffff")
      .setAuthor({
        name: user.username,
        iconURL: user.displayAvatarURL({ size: 512 }),
      })
      .setDescription(`**Aktion:** \`${action}\`\n${details}`)
      .setFooter({ text: "Kekse Clan | Counting System" })
      .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
  };

  const handleCounting = async (msg, syncMode = false) => {
    if (!syncMode && msg.author.bot) return;
    if (msg.channel.id !== COUNTING_CHANNEL) return;
    if (!syncMode && msg.content.startsWith("!set_number")) {
      if (msg.author.id !== "1151971830983311441") return;
      const args = msg.content.split(" ");
      const newNum = parseInt(args[1]);
      if (isNaN(newNum)) return;

      await loadCounting();
      countingData.currentNumber = newNum;
      countingData.direction = newNum < 0 ? -1 : 1;
      countingData.lastUserId = null;
      await saveCounting();

      await sendKekseLog(
        "Counting Reset (Admin)",
        msg.author,
        `Die Zahl wurde manuell auf **${newNum}** gesetzt.`,
      );
      return msg.reply(`Die nächste Zahl wurde auf **${newNum}** gesetzt.`);
    }
    if (!syncMode && msg.content === "!top") {
      await loadCounting();
      const sorted = Object.entries(countingData.scoreboard || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const embed = new EmbedBuilder()
        .setTitle("🏆 Top 10 Counter")
        .setDescription(
          sorted.map(([id, s], i) => `${i + 1}. <@${id}> • ${s}`).join("\n") ||
            "Keine Daten",
        )
        .setColor("#ffffff")
        .setFooter({ text: "Kekse Clan" });

      await msg.reply({ embeds: [embed] });
      return;
    }
    const match = msg.content.trim().match(/^-?\d+/);
    if (!match) return;
    const num = parseInt(match[0]);

    if (!syncMode) await loadCounting();
    if (countingData.currentNumber === 1 && countingData.lastUserId === null) {
      if (num === 1 || num === -1) {
        countingData.direction = num;
        countingData.currentNumber = num + countingData.direction;
        
        const currentHundred = Math.floor(Math.abs(num) / 100);
        if (currentHundred > countingData.lastPufferGranted) {
          countingData.lastPufferGranted = currentHundred;
          countingData.systemPuffer = 1;
          if (!syncMode) await msg.channel.send(`🛡️ Puffer aufgeladen! Der nächste Fehler wird abgefangen.`);
        }

        countingData.lastUserId = msg.author.id;
        countingData.lastCountingTime = msg.createdTimestamp;
        countingData.lastMessageId = msg.id;
        
        await saveCounting();
        if (!syncMode) await msg.react("✅").catch(() => {});
        return;
      }
    }
    if (num !== countingData.currentNumber || msg.author.id === countingData.lastUserId) {
      const reason = num !== countingData.currentNumber
          ? `Falsche Zahl (${num} statt ${countingData.currentNumber})`
          : "Doppel-Post";

      if (countingData.systemPuffer > 0) {
        countingData.systemPuffer = 0;
        countingData.lastUserId = null;
        await saveCounting();

        if (!syncMode) {
          await msg.react("🛡️").catch(() => {});
          await sendKekseLog("Counting Puffer genutzt", msg.author, `**Grund:** ${reason}\n**Zahl bleibt bei:** ${countingData.currentNumber}`);
          return msg.reply(`🛡️ **Puffer aktiv!** Dein Fehler wurde abgefangen. Die gesuchte Zahl ist weiterhin **${countingData.currentNumber}**.`);
        }
        return;
      }

      if (!syncMode) {
        await sendKekseLog("Counting Fehler", msg.author, `**Grund:** ${reason}\n**Reset auf:** 1 / 1`);
      }

      countingData.currentNumber = 1;
      countingData.direction = 1;
      countingData.lastPufferGranted = 0;
      countingData.systemPuffer = 0;
      countingData.lastUserId = null;
      countingData.lastCountingTime = msg.createdTimestamp;
      countingData.lastMessageId = msg.id;
      
      await saveCounting();

      if (!syncMode) {
        await msg.react("❌").catch(() => {});
        const replyContent = reason === "Doppel-Post"
          ? `<@${msg.author.id}> nicht zweimal nacheinander! Zurück auf den Start (1 oder -1).`
          : `<@${msg.author.id}> hat falsch gezählt! Zurück auf den Start (1 oder -1).`;
        return msg.reply(replyContent);
      }
      return;
    }
    countingData.currentNumber = num + (countingData.direction || 1);
    
    const currentHundred = Math.floor(Math.abs(num) / 100);
    if (currentHundred > countingData.lastPufferGranted) {
      countingData.lastPufferGranted = currentHundred;
      countingData.systemPuffer = 1;
      if (!syncMode) await msg.channel.send(`🛡️ Puffer aufgeladen! Der nächste Fehler wird abgefangen.`);
    }

    countingData.lastUserId = msg.author.id;
    countingData.lastCountingTime = msg.createdTimestamp;

    const excludedUsers = [];
    if (!excludedUsers.includes(msg.author.id)) {
      countingData.scoreboard[msg.author.id] ??= 0;
      countingData.scoreboard[msg.author.id]++;
    }
    
    countingData.lastMessageId = msg.id;
    await saveCounting();

    if (!syncMode) {
      await msg.react("✅").catch(() => {});
    }
  };

  const runSync = async () => {
    console.log("Starte Counting-Synchronisation...");
    await loadCounting();
    const channel = await client.channels.fetch(COUNTING_CHANNEL).catch((err) => {
      console.error("Fehler beim Abrufen des Counting-Kanals:", err);
      return null;
    });
    if (!channel || !channel.isTextBased()) return;

    try {
      let lastId = countingData.lastMessageId;
      let totalRecovered = 0;
      
      if (!lastId) {
        const lastMsg = await channel.messages.fetch({ limit: 1 });
        countingData.lastMessageId = lastMsg.first()?.id;
        await saveCounting();
        console.log("Keine Referenz-ID gefunden. Starte ab der aktuellsten Nachricht.");
        return;
      }

      let hasMore = true;
      while (hasMore) {
        const missedMessages = await channel.messages.fetch({ after: lastId, limit: 100 });
        if (missedMessages.size === 0) {
          hasMore = false;
        } else {
          const sorted = [...missedMessages.values()].reverse();
          for (const msg of sorted) {
            await handleCounting(msg, true);
          }
          await saveCounting();
          lastId = sorted[sorted.length - 1].id;
          totalRecovered += missedMessages.size;
          if (missedMessages.size === 100) {
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      }
      console.log(`Synchronisation abgeschlossen. ${totalRecovered} Nachrichten nachgeholt.`);
    } catch (err) {
      console.error("Fehler bei der Synchronisation:", err);
    } finally {
      registerLiveListener();
    }
  };

  const registerLiveListener = () => {
    client.on(Events.MessageCreate, async (msg) => {
      await handleCounting(msg, false);
    });
    console.log("Live-Zähler aktiv. System bereit!");
  };

  if (client.isReady()) {
    runSync();
  } else {
    client.once(Events.ClientReady, runSync);
  }
}
client.once("clientReady", async () => {
  initAuditLogs(client);
  await initCounting(client);
  client.user.setPresence({
      status: "online",
    });
  console.log(`Bot start finished`)
});
client.setMaxListeners(50);
client.on("error", console.error);
client.on("warn", console.warn);
client.login(process.env.BOT_TOKEN);
console.log(`Bot was logged in`)
