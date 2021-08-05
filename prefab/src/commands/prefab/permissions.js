//@ts-check

const Command = require('../../util/command');

const permissions = {
    'a': 'ADMINISTRATOR',
    'b': 'CREATE_INSTANT_INVITE',
    'c': 'KICK_MEMBERS',
    'd': 'BAN_MEMBERS',
    'e': 'ADMINISTRATOR',
    'f': 'MANAGE_CHANNELS',
    'g': 'MANAGE_GUILD',
    'h': 'ADD_REACTIONS',
    'i': 'VIEW_AUDIT_LOG',
    'j': 'PRIORITY_SPEAKER',
    'k': 'STREAM',
    'l': 'VIEW_CHANNEL',
    'm': 'SEND_MESSAGES',
    'n': 'SEND_TTS_MESSAGES',
    'o': 'MANAGE_MESSAGES',
    'p': 'EMBED_LINKS',
    'q': 'ATTACH_FILES',
    'r': 'READ_MESSAGE_HISTORY',
    's': 'MENTION_EVERYONE',
    't': 'USE_EXTERNAL_EMOJIS',
    'u': 'VIEW_GUILD_INSIGHTS',
    'v': 'CONNECT',
    'w': 'SPEAK',
    'x': 'MUTE_MEMBERS',
    'y': 'DEAFEN_MEMBERS',
    'z': 'MOVE_MEMBERS',
    '0': 'USE_VAD',
    '1': 'CHANGE_NICKNAME',
    '2': 'MANAGE_NICKNAMES',
    '3': 'MANAGE_ROLES',
    '4': 'MANAGE_WEBHOOKS',
    '5': 'MANAGE_EMOJIS',
};
const permsRegEx = /^[0-5a-zA-Z]{1,31}$/;

module.exports = class PermissionsCommand extends Command {
    constructor (client) {
        super(client, {
            name: "permissions",
            category: "Utility",
            ownerOnly: true,
            args: [
                {
                    type: 'SOMETHING',
                    prompt: 'Please specify a command.',
                    id: 'command'
                }
            ],
            clientPerms: ['SEND_MESSAGES', 'EMBED_LINKS', 'ADD_REACTIONS']
        });
    }

    /**
     * @param {object} p
     * @param {import('../../util/client')} p.client
     * @param {import('discord.js').Message} p.message
     * @param {string[]} p.args 
     * @param {Object.<string, *>} p.flags
     */
    async execute ({ client, message, args, flags }) {
        const command = client.commands.get(flags.command.toLowerCase());
        if (!command) return message.channel.send(`${message.author.username}, that command doesn't exist.`);

        const guildInfo = await client.guildInfo.get(message.guild.id);
        let commandPerms = guildInfo.prefab.commandPerms;;

        const embed = (await client.utils.CustomEmbed({ userID: message.author.id }))
            .setTimestamp()
            .setTitle(`Command permissions for: ${command.name}`)
            .setFooter('React with 🔁 to override the permissions.');

        if (!commandPerms || !commandPerms[command.name]) {
            if (command.perms && command.perms.length !== 0) embed.setDescription('\`' + command.perms.join('\`, \`') + '\`');
            else embed.setDescription('You don\'t need any permissions to run this command.');
        } else {
            embed.setDescription('\`' + commandPerms[command.name].join('\`, \`') + '\`');
        }

        await this.setCooldown(message);
        const msg = await message.channel.send({ embeds: [embed] });
        await msg.react('🔁');

        const filter = (reaction, user) => {
            return reaction.emoji.name === '🔁' && user.id === message.author.id;
        };
        const collector = msg.createReactionCollector({ filter, time: 30000, max: 1 });

        collector.on('end', async (collected) => {
            if (collected.size === 0) return message.channel.send(`${message.author.username}, sorry, if you want to change the permissions, run the command again and react in time.`);

            let text = "";

            const a = Object.entries(permissions);

            for (let i = 0; i < a.length; i++) {
                text += `\`${a[i][0]}\` - \`${a[i][1]}\`\n`;
            }

            text += 'Reply with the permissions that you want users to have in order to use this command, ';
            text += 'e.g.: \`cd2\` If you want them to have the permissions to kick members, ban members and manage roles in order to use this command.\n';
            text += 'Reply with \`clear\` to reset permissions.';

            embed
                .setFooter('')
                .setDescription(text);

            message.channel.send({ embeds: [embed] });

            const perms = await client.utils.getReply(message);
            if (!perms) return message.channel.send(`${message.author.username}, sorry, time is up!`)

            const update = {}
            if (perms.content.toLowerCase() === 'clear') {
                await client.guildInfo.findByIdAndUpdate(message.guild.id, { $unset: { [`prefab.commandPerms.${command.name}`]: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true });
            } else {
                if (!permsRegEx.test(perms.content)) return message.channel.send(`${message.author.username}, sorry, that isn't a valid permission string.`);

                const permsArray = []
                for (var i = 0; i < perms.content.length; i++) {
                    if (permsArray.includes(permissions[perms.content[i]])) continue;
                    permsArray.push(permissions[perms.content[i]]);
                }

                update[`prefab.commandPerms.${command.name}`] = permsArray;
                await client.guildInfo.findByIdAndUpdate(message.guild.id, { $set: update }, { new: true, upsert: true, setDefaultsOnInsert: true });
            }

            message.channel.send(`${message.author.username}, the permissions for ${command.name} have been overwritten.`);
        })
    }
}
