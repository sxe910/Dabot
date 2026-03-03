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

const USER_ID = '398953007053537281'
const EMOJIS = ['👀', '💀', '😭'];  


client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

        setInterval(async () => {
            console.log('VC scan tick', new Date().toISOString());
        try {
            const guild = await client.guilds.fetch(process.env.GUILD_ID);
            await guild.members.fetch(); 
            
            

        const lithuaniaHour = Number(
  new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric',
    hour12: false,
    timeZone: 'Europe/Vilnius',
  }).format(new Date())
);
            
        const isBetweenMidnightAnd6AM = lithuaniaHour >= 0 && lithuaniaHour < 6;
            console.log('LT hour:', lithuaniaHour, 'allowed:', isBetweenMidnightAnd6AM);

        if (!isBetweenMidnightAnd6AM) return;

          for (const member of guild.members.cache.values()) {
if (!member.voice.channelId) continue;
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

client.on('messageCreate', async (message) =>{
    if (message.author.id !== USER_ID) return;
    if (message.author.bot) return;

      const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

    try{
        await message.react(emoji);
        console.log('Reacted to message from ${message.author.tag}');
    
    } catch (err){
        console.error('Failed to react:', err);
    }
});

client.login(process.env.DISCORD_TOKEN);








