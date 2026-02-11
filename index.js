import dotenv from 'dotenv'
dotenv.config()

import { Client, GatewayIntentBits} from 'discord.js';

const client = new Client({
    intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    ]
});



client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

        setInterval(async () => {
        try {
            const guild = await client.guilds.fetch(GUILD_ID);
            await guild.members.fetch(); 

        const hour = new Date().getHours();
        const isBetweenMidnightAnd6AM = hour >= 0 && hour < 6;

        if (!isBetweenMidnightAnd6AM) return;

          for (const member of guild.members.cache.values()) {
    if (!member.voice.channel) continue; 
    if (member.communicationDisabledUntil) continue; 

    try {
        await member.timeout(
            6 * 60 * 60 * 1000, 
            'In voice channel after midnight'
        );
        console.log(`Timed out ${member.user.tag}`);
    } catch (err) {
        console.error('Failed to timeout member:', err);
    }
}
        } catch (err) {
            console.error('Error in VC scan loop:', err);
        }
    }, 60 * 1000); // every 1 minute
});

client.login(process.env.DISCORD_TOKEN);
