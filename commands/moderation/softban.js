const Command = require('../../structures/Command');
const { RichEmbed } = require('discord.js');
const { stripIndents } = require('common-tags');

module.exports = class SoftbanCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'softban',
            aliases: ['softbanne'],
            group: 'moderation',
            memberName: 'softban',
            description: 'Kicks a user and deletes their messages, and logs the softban to the mod logs.',
            guildOnly: true,
            clientPermissions: ['BAN_MEMBERS'],
            userPermissions: ['KICK_MEMBERS'],
            args: [
                {
                    key: 'member',
                    prompt: 'What member do you want to softban?',
                    type: 'member'
                },
                {
                    key: 'reason',
                    prompt: 'What do you want to set the reason as?',
                    type: 'string',
                    validate: (reason) => {
                        if (reason.length < 140) return true;
                        else return 'Reason must be under 140 characters.';
                    }
                }
            ]
        });
    }

    async run(msg, args) {
        const modlogs = msg.guild.channels.filter((c) => {
            const topic = c.topic || '';
            if (topic.includes('<modlog>')) return true;
            else return false;
        }).first() || msg.guild.channels.find('name', 'mod-log');
        const { member, reason } = args;
        if (!member.bannable) return msg.say('This member is not bannable. Perhaps they have a higher role than me?');
        await msg.say(`Are you sure you want to softban ${member.user.tag} (${member.id})?`);
        const msgs = await msg.channel.awaitMessages((res) => res.author.id === msg.author.id, {
            max: 1,
            time: 30000
        });
        if (!msgs.size || !['y', 'yes'].includes(msgs.first().content.toLowerCase())) return msg.say('Aborting.');
        try {
            await member.send(stripIndents`
                You were softbanned from ${msg.guild.name}!
                Reason: ${reason}
            `);
        } catch (err) {
            await msg.say('Failed to Send DM.');
        }
        await member.ban({
            days: 7,
            reason: `${msg.author.tag}: ${reason} (Softban)`
        });
        await msg.guild.unban(member.user, 'Softban');
        await msg.say(`Successfully softbanned ${member.user.tag}.`);
        if (!modlogs || !modlogs.permissionsFor(this.client.user).has('SEND_MESSAGES')) {
            return msg.say('Could not log the softban to the mod logs.');
        } else if (modlogs.permissionsFor(this.client.user).has('EMBED_LINKS')) {
            const embed = new RichEmbed()
                .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
                .setColor(0xFF4500)
                .setTimestamp()
                .setDescription(stripIndents`
                    **Member:** ${member.user.tag} (${member.id})
                    **Action:** Softban
                    **Reason:** ${reason}
                `);
            return modlogs.send({ embed });
        } else {
            return modlogs.send(stripIndents`
                **Member:** ${member.user.tag} (${member.id})
                **Action:** Softban
                **Reason:** ${reason}
                **Moderator:** ${msg.author.tag}
            `);
        }
    }
};
