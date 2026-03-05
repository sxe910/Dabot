import dotenv from 'dotenv'
dotenv.config()

import { Client, GatewayIntentBits} from 'discord.js';

const client = new Client({
    intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    ]
});
const REPLACEMENT_GIF_URL = 'https://tenor.com/view/he-made-a-statement-statement-dog-clowned-trash-opinion-your-opinion-gif-15033044919438935088';
const USER_ID = '398953007053537281'
const EMOJIS = ['👀', '💀', '😭'];  
const IMAGE_CHANNEL_ID = process.env.IMAGE_CHANNEL_ID 
const TAGS = ['R6', 'Rainbow Six', 'Feet']; 

async function fetchImageByTags(tags) {
    const tagString = tags.join('+');
    console.log(`Fetching from Rule34 with tags: ${tagString}`);
    try {
        const url = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=100&tags=${tagString}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Rule34 API responded with ${res.status}`);
        const posts = await res.json();
        if (!posts || posts.length === 0) {
            console.log('No posts found for tags:', tagString);
            return null;
        }
        const post = posts[Math.floor(Math.random() * posts.length)];
        return post.file_url ?? null;
    } catch (err) {
        console.error('Error fetching from Rule34:', err);
        return null;
    }
}

// --- Post image to channel ---
async function postImageToChannel(tags = TAGS) {
    try {
        const channel = await client.channels.fetch(IMAGE_CHANNEL_ID);
        if (!channel || !channel.isTextBased()) {
            console.error('Image channel not found or not text-based.');
            return;
        }
        const imageUrl = await fetchImageByTags(tags);
        if (!imageUrl) {
            console.log('No image found for the given tags.');
            return;
        }
        const embed = new EmbedBuilder()
            .setImage(imageUrl)
            .setFooter({ text: `Tags: ${tags.join(', ')}` })
            .setTimestamp();
        await channel.send({ embeds: [embed] });
        console.log(`Posted image to channel ${IMAGE_CHANNEL_ID}`);
    } catch (err) {
        console.error('Failed to post image:', err);
    }
}

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

async function maybeReplaceWithGif(message) {
    if (Math.random() > 0.01) return; // 1/100 chance
    try {
        const author = message.author.tag;
        await message.delete();
        await message.channel.send(`${author} said: ${REPLACEMENT_GIF_URL}`);
        console.log(`Replaced message from ${author} with gif`);
    } catch (err) {
        console.error('Failed to replace message with gif:', err);
    }
}

client.on('messageCreate', async (message) =>{
    if (message.author.id !== USER_ID) return;
    if (message.author.bot) return;
    await maybeReplaceWithGif(message);

      const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

    try{
        await message.react(emoji);
        console.log('Reacted to message from ${message.author.tag}');
    
    } catch (err){
        console.error('Failed to react:', err);
    }
    if (message.content.startsWith('!goon')) {
        await postImageToChannel(tags);
    }
});

client.login(process.env.DISCORD_TOKEN);










