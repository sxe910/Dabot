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



client.on("voiceStateUpdate", async (oldState, newState) => {

    if (!newState.channel) return;

    const member = newState.member;
    if (!member) return;

    

    const now = new Date();
const hour = now.getHours();

const isAfterMidnight = hour >= 0 && hour < 6;

if (isAfterMidnight) return;

if (member.communicationDisabledUntil) return;

try {
    await member.timeout(
      10 * 60 * 1000, 
      'In voice channel after midnight'
    );
} catch (err){
    console.error('Failed to timeout member:', err);
}

});

client.login(process.env.DISCORD_TOKEN);