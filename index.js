import dotenv from 'dotenv'
dotenv.config()

import { Client, GatewayIntentBits, EmbedBuilder} from 'discord.js';

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
const USER_ID = '398953007053537281';
const EMOJIS = ['👀', '💀', '😭'];
const IMAGE_CHANNEL_ID = process.env.IMAGE_CHANNEL_ID;
const SONG_CHANNEL_ID = process.env.SONG_CHANNEL_ID; // <-- add this to your .env
const TAGS = ['rainbow_six_siege'];

// --- Spotify ---
let spotifyToken = null;
let spotifyTokenExpiry = 0;

async function getSpotifyToken() {
    if (spotifyToken && Date.now() < spotifyTokenExpiry) return spotifyToken;
    const creds = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${creds}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });
    const data = await res.json();
    spotifyToken = data.access_token;
    spotifyTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return spotifyToken;
}

async function postRandomSong() {
    try {
        const channel = await client.channels.fetch(SONG_CHANNEL_ID);
        if (!channel || !channel.isTextBased()) {
            console.error('Song channel not found or not text-based.');
            return;
        }

        const token = await getSpotifyToken();

        // Fetch playlist tracks (max 100)
        const res = await fetch(`https://api.spotify.com/v1/playlists/${process.env.SPOTIFY_PLAYLIST_ID}/tracks?limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (!data.items || data.items.length === 0) {
            console.log('No tracks found in playlist.');
            return;
        }

        // Pick a random track
        const item = data.items[Math.floor(Math.random() * data.items.length)];
        const track = item.track;
        if (!track) {
            console.log('Track was null, skipping.');
            return;
        }

        const trackUrl = track.external_urls.spotify;
        const trackName = track.name;
        const artist = track.artists.map(a => a.name).join(', ');

        await channel.send(`🎵 **${trackName}** by **${artist}**\n${trackUrl}`);
        console.log(`Posted song: ${trackName} by ${artist}`);
    } catch (err) {
        console.error('Failed to post song:', err);
    }
}

// --- Rule34 fetch ---
async function fetchImageByTags(tags) {
    const tagString = tags.join('+');
    console.log(`Fetching from Rule34 with tags: ${tagString}`);
    try {
        const url = `https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=100&tags=${tagString}&api_key=${process.env.RULE34_API_KEY}&user_id=${process.env.RULE34_USER_ID}`;
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

// --- Ready ---
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

    // VC midnight scan — every 1 minute
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
                    await member.timeout(6 * 60 * 60 * 1000, 'In voice channel after midnight');
                    console.log(`Timed out ${member.user.tag}`);
                } catch (err) {
                    console.error('Failed to timeout member:', err);
                }
            }
        } catch (err) {
            console.error('Error in VC scan loop:', err);
        }
    }, 60 * 1000);

    // Post a random song every 24 hours
    postRandomSong(); // post once on startup
    setInterval(postRandomSong, 24 * 60 * 60 * 1000);
});

// --- Gif replacement ---
async function maybeReplaceWithGif(message) {
    if (Math.random() > 0.001) return;
    try {
        const author = message.author.tag;
        await message.delete();
        await message.channel.send(`${author} dalbajobas ${REPLACEMENT_GIF_URL}`);
        console.log(`Replaced message from ${author} with gif`);
        return true;
    } catch (err) {
        console.error('Failed to replace message with gif:', err);
    }
    return false;
}

// --- Messages ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // !goon command
    if (message.content.startsWith('!goon')) {
        const args = message.content.slice('!goon'.length).trim().split(/\s+/).filter(Boolean);
        const tags = args.length > 0 ? args : TAGS;
        await postImageToChannel(tags);
        return;
    }

    // 1/1000 chance to replace with gif
    const replaced = await maybeReplaceWithGif(message);
    if (replaced) return; // message deleted, stop here

    // 1/100 chance to react
    if (Math.random() < 0.01) {
        const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
        try {
            await message.react(emoji);
            console.log(`Reacted to message from ${message.author.tag}`);
        } catch (err) {
            console.error('Failed to react:', err);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
