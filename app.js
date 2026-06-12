import {SlashCommandBuilder, REST, AuditLogEvent, Client} from "discord.js";
import "dotenv/config";
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
client.once("clientReady", async () => {
  client.user.setPresence({
      status: "online",
    });
  console.log(`Bot start finished`)
});
client.setMaxListeners(50);
client.on("error", console.error);
client.on("warn", console.warn);
client.login(process.env.BOT_TOKEN);
console.log(`Bot was logged in as ${client.user.tag}`)
