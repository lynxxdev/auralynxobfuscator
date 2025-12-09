const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    EmbedBuilder, 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
} = require("discord.js");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildWebhooks
    ],
    partials: [Partials.Channel]
});

const EMBED_COLOR = 0x3498db;
const ALERT_COLOR = 0xf1c40f;

const OWNER_ID = "1324502380225495077";
const LOG_CHANNEL_ID = "1448061296028155995";

const safeRoles = new Map();
const processing = new Set();

const blacklist = [
    "QG do Davizin",
    "pɪv Security",
    "Based BOT"
];

function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function loadingReply(interaction) {
    if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({
            content: "<a:lloading:1448060357800231113> Carregando...",
            ephemeral: true
        });
    }
    await delay(4000);
}

function rand(n) {
    const c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let s = "";
    for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)];
    return s;
}

function xorEncode(str, key) {
    const chunks = [];
    const size = 8192;
    for (let i = 0; i < str.length; i += size) {
        let part = [];
        const end = Math.min(i + size, str.length);
        for (let j = i; j < end; j++) {
            part.push(str.charCodeAt(j) ^ key.charCodeAt(j % key.length));
        }
        chunks.push(Buffer.from(part).toString("binary"));
    }
    return Buffer.concat(chunks.map(c => Buffer.from(c, "binary"))).toString("base64");
}

function obfuscate(script) {
    const key = rand(32);
    const vKey = rand(10);
    const vEnc = rand(10);
    const vB64 = rand(10);
    const vXor = rand(10);
    const vLS = rand(10);
    const encoded = xorEncode(script, key);

    return `
local ${vKey} = "${key}"
local ${vEnc} = "${encoded}"

pcall(function()
    local ok,dbg = pcall(function() return debug.getinfo end)
    if ok and dbg then
        debug = nil
    end
    pcall(function() hookfunction = nil end)
end)

local function ${vB64}(s)
    local map="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    s=s:gsub("[^"..map.."=]","")
    local o={}
    for i=1,#s,4 do
        local c1=map:find(s:sub(i,i),1,true); local c2=map:find(s:sub(i+1,i+1),1,true)
        local c3=map:find(s:sub(i+2,i+2),1,true); local c4=map:find(s:sub(i+3,i+3),1,true)
        c1=c1 and (c1-1) or 0; c2=c2 and (c2-1) or 0; c3=c3 and (c3-1) or 0; c4=c4 and (c4-1) or 0
        local n=c1*262144 + c2*4096 + c3*64 + c4
        local b1 = math.floor(n/65536)%256
        local b2 = math.floor(n/256)%256
        local b3 = n%256
        o[#o+1]=string.char(b1)
        if s:sub(i+2,i+2)~="=" then o[#o+1]=string.char(b2) end
        if s:sub(i+3,i+3)~="=" then o[#o+1]=string.char(b3) end
    end
    return table.concat(o)
end

local function ${vXor}(d,k)
    local o={}
    for i=1,#d do
        local kb = k:byte(((i-1)%#k)+1)
        o[i] = string.char(bit32.bxor(d:byte(i), kb))
    end
    return table.concat(o)
end

local raw = ${vXor}(${vB64}(${vEnc}), ${vKey})

local function ${vLS}(x)
    local ls = loadstring or load
    return ls(x)
end

return ${vLS}(raw)()
`;
}

client.on("ready", async () => {
    console.log("BOT ONLINE");

    await client.application.commands.set([
        new SlashCommandBuilder().setName("obf").setDescription("Vynx faz uma obfuscação LUA no privado."),
        new SlashCommandBuilder().setName("emoji").setDescription("Vynx vai converter qualquer emoji de qualquer servidor no privado."),
        new SlashCommandBuilder()
            .setName("addpermissions")
            .setDescription("Definir Cargos Autorizados")
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    ]);
});

client.on("guildCreate", async (guild) => {
    const channel = guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has("SendMessages"));
    if (!channel) return;

    channel.send({
        embeds: [
            new EmbedBuilder()
                .setColor(EMBED_COLOR)
                .setTitle("<:search:1447341251518136472> Central de Ajuda")
                .setDescription("/obf\n/emoji\n/addpermissions")
        ]
    }).catch(() => {});
});

client.on("interactionCreate", async (i) => {
    if (!i.isChatInputCommand()) return;

    if (i.commandName === "addpermissions") {
        if (!i.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return i.reply({ content: "Sem permissão.", ephemeral: true });
        }

        await loadingReply(i);

        const modal = new ModalBuilder()
            .setCustomId("rolesModal")
            .setTitle("Cargos autorizados");

        const input = new TextInputBuilder()
            .setCustomId("rolesInput")
            .setLabel("IDS dos cargos (separados por vírgula)")
            .setStyle(TextInputStyle.Paragraph);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await i.showModal(modal);
    }

    if (i.commandName === "obf") {
        await loadingReply(i);
        i.user.send("<:luaupload:1448062496421318787> Faça upload do arquivo.lua aqui.").catch(() => {});
        await i.followUp({ content: "<:sucesso:1447342675454857286> Verifique seu privado.", ephemeral: true });
    }

    if (i.commandName === "emoji") {
        await loadingReply(i);
        const btn = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("openEmojiInput")
                .setLabel("Inserir emoji")
                .setStyle(ButtonStyle.Success)
        );
        await i.followUp({ content: "<:buttonclick:1448063078284660858> Clique no botão.", components: [btn], ephemeral: true });
    }
});

client.on("interactionCreate", async (i) => {
    if (!i.isModalSubmit()) return;
    if (i.customId !== "rolesModal") return;

    const ids = i.fields.getTextInputValue("rolesInput").split(",").map(x => x.trim());
    safeRoles.set(i.guildId, ids);

    await i.reply({
        embeds: [
            new EmbedBuilder()
                .setColor(EMBED_COLOR)
                .setTitle("<:aviso:1447341146949943446> Atualizado")
                .setDescription(ids.map(id => `<@&${id}>`).join("\n"))
        ]
    });
});

client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;
    if (msg.channel.type !== 1) return;
    if (!msg.attachments.first()) return;
    if (processing.has(msg.author.id)) return;

    processing.add(msg.author.id);

    try {
        await msg.reply("<a:lloading:1448060357800231113> Carregando...");
        await delay(4000);

        const file = msg.attachments.first();
        if (!file.name.endsWith(".lua")) return;

        const lua = await fetch(file.url).then(r => r.text());
        const obf = obfuscate(lua);

        const out = new AttachmentBuilder(Buffer.from(obf), { name: "obfuscated.lua" });
        await msg.reply({ content: "<:sucesso:1447342675454857286> Concluído.", files: [out] });

        const logCh = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
        if (logCh) {
            const original = new AttachmentBuilder(Buffer.from(lua), { name: "original.lua" });
            const obfuscated = new AttachmentBuilder(Buffer.from(obf), { name: "obfuscated.lua" });

            await logCh.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(EMBED_COLOR)
                        .setTitle("📜 Novo script")
                        .setThumbnail(msg.author.displayAvatarURL())
                        .setDescription(`Usuário: ${msg.author.tag}`)
                ],
                files: [original, obfuscated]
            });
        }
    } finally {
        processing.delete(msg.author.id);
    }
});

client.on("interactionCreate", async (i) => {
    if (!i.isButton()) return;

    if (i.customId === "openEmojiInput") {
        const modal = new ModalBuilder()
            .setCustomId("emojiModal")
            .setTitle("Emoji");

        const input = new TextInputBuilder()
            .setCustomId("emojiInput")
            .setLabel("Cole o emoji")
            .setStyle(TextInputStyle.Short);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await i.showModal(modal);
    }

    if (i.customId.startsWith("kick_")) {
        await i.reply("<a:lloading:1448060357800231113> Executando...");
        await delay(4000);

        const id = i.customId.replace("kick_", "");
        const member = await i.guild.members.fetch(id).catch(() => null);

        if (member) {
            await member.kick("Kick via painel");
            await i.followUp("<:sucesso:1447342675454857286> Kick concluído.");
        } else {
            await i.followUp("<:erro:1447342534937542757> Usuário não encontrado.");
        }
    }
});

client.on("interactionCreate", async (i) => {
    if (!i.isModalSubmit()) return;
    if (i.customId !== "emojiModal") return;

    await i.reply("<a:lloading:1448060357800231113> Processando...");
    await delay(4000);

    const text = i.fields.getTextInputValue("emojiInput");
    const match = text.match(/<:.+:(\d+)>/);

    if (!match) return i.followUp({ content: "<:erro:1447342534937542757> Emoji inválido/não existe.", ephemeral: true });

    const id = match[1];
    const url = `https://cdn.discordapp.com/emojis/${id}.png?size=4096`;

    await i.followUp({ content: "<:sucesso:1447342675454857286> O conteúdo foi enviado no seu privado.", ephemeral: true });
    i.user.send({ files: [url] }).catch(() => {});
});

client.on("guildMemberAdd", async (member) => {
    if (blacklist.includes(member.user.username)) {
        member.kick("Bot/webhook blacklist").catch(() => {});
        return;
    }

    if (member.user.bot) {
        const owner = await member.guild.fetchOwner();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`kick_${member.id}`)
                .setLabel("Kickar")
                .setStyle(ButtonStyle.Danger)
        );

        owner.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle("🚨 Bot adicionado")
                    .setDescription(`Nome: ${member.user.tag}\nID: ${member.id}`)
                    .setColor("Red")
            ],
            components: [row]
        }).catch(() => {});
    }
});

client.on("guildAuditLogEntryCreate", async (entry, guild) => {
    if (entry.action !== 50) return;

    const executor = entry.executor;
    const webhook = entry.target;
    const owner = await guild.fetchOwner();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`kick_${executor.id}`)
            .setLabel("Kickar")
            .setStyle(ButtonStyle.Danger)
    );

    owner.send({
        embeds: [
            new EmbedBuilder()
                .setTitle("🚨 Webhook criado")
                .setDescription(`Nome: ${webhook.name}\nID: ${webhook.id}\nPor: ${executor.tag}`)
                .setColor("Red")
        ],
        components: [row]
    }).catch(() => {});
});

const token = process.env.TOKEN
client.login(token)