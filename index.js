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
            const guild = await client.guilds.fetch(process.env.GUILD_ID);
            await guild.members.fetch(); 

        const now = new Date();
            cconst lithuaniaHour = new Date(
  now.toLocaleString("en-US", { timeZone: "Europe/Vilnius" })
).getHours();

        const isBetweenMidnightAnd6AM = lithuaniaHour >= 0 && lithuaniaHour < 6;

        if (!isBetweenMidnightAnd6AM) return;

          for (const member of guild.members.cache.values()) {
    if (!member.voice.channel) continue; 
    if (member.isCommunicationDisabled()) continue; 

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

