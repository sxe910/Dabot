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
    GatewayIntentBits.GuildMessageReactions
    ]
});

const SONG_MESSAGES = [
    'Jaučiuosi kaip glitchas, kuris pats save pataiso peiliu',
    'Bloga diena? Ne, blogas gyvenimas. Man patinka.',
    'Šiandien mano vibeas – viduramžių maro daktaras su airpods',
    'Esu 3 Red Bull ir 1 egzistencinė krizė',
    'Nuotaika: įžeisiu tave meiliai ir tu dar padėkosi',
    'Šiandien noriu kažką nors papjauti',
    'All hail Benjamin Youngin Irony',
    'man viskas gerai, o jums turbūt nebebus',
    'Šiandien mano diena',
    'Sigma boss music',
];

const REPLACEMENT_GIF_URL = 'https://tenor.com/view/he-made-a-statement-statement-dog-clowned-trash-opinion-your-opinion-gif-15033044919438935088';
const USER_ID = '398953007053537281';
const EMOJIS = ['👀', '💀', '😭'];
const IMAGE_CHANNEL_ID = process.env.IMAGE_CHANNEL_ID;
const SONG_CHANNEL_ID = process.env.SONG_CHANNEL_ID;
const TAGS = ['rainbow_six_siege'];
const ARCHIVE_CHANNEL_ID = process.env.ARCHIVE_CHANNEL_ID;
const ARCHIVE_EMOJI = '🔥';
const ARCHIVE_THRESHOLD = 4;
const archivedMessages = new Set(); // track already archived messages

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
        body: `grant_type=refresh_token&refresh_token=${process.env.SPOTIFY_REFRESH_TOKEN}`,
    });
    const data = await res.json();
    console.log('Spotify token response:', JSON.stringify(data));
    if (!data.access_token) {
        console.error('Failed to get Spotify token:', data);
        spotifyToken = null;
        spotifyTokenExpiry = 0;
        return null;
    }
    spotifyToken = data.access_token;
    spotifyTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return spotifyToken;
}

async function getPlaylistTracks(token) {
    let tracks = [];
    let offset = 0;
    const limit = 100;

    // First find the playlist via /me/playlists
    const playlistsRes = await fetch(`https://api.spotify.com/v1/me/playlists?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const playlistsData = await playlistsRes.json();
    const playlist = playlistsData.items?.find(p => p.id === process.env.SPOTIFY_PLAYLIST_ID);
    
    if (!playlist) {
        console.error('Playlist not found in user playlists');
        return [];
    }

    // Use the items href directly from the playlist object
    while (true) {
        const url = `${playlist.items.href}?limit=${limit}&offset=${offset}`;
        console.log('Fetching tracks from:', url);
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        console.log('Spotify response status:', res.status, 'items:', data.items?.length, 'error:', data.error);
        if (!data.items || data.items.length === 0) break;
        tracks = tracks.concat(data.items.filter(item => item && item.track));
        if (data.items.length < limit) break;
        offset += limit;
    }
    return tracks;
}

async function postRandomSong() {
    try {
        const channel = await client.channels.fetch(SONG_CHANNEL_ID);
        if (!channel || !channel.isTextBased()) {
            console.error('Song channel not found or not text-based.');
            return;
        }
        const token = await getSpotifyToken();
        const validItems = await getPlaylistTracks(token);
        if (validItems.length === 0) {
            console.log('No valid tracks found in playlist.');
            return;
        }
        const item = validItems[Math.floor(Math.random() * validItems.length)];
        const track = item.track;
        const trackUrl = track.external_urls.spotify;
        const trackName = track.name;
        const artist = track.artists.map(a => a.name).join(', ');
        const randomMessage = SONG_MESSAGES[Math.floor(Math.random() * SONG_MESSAGES.length)];
        await channel.send(`${randomMessage}\n🎵 **${trackName}** by **${artist}**\n${trackUrl}`);
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

    postRandomSong();
    setInterval(postRandomSong, 24 * 60 * 60 * 1000);
});

// --- Gif replacement ---
async function maybeReplaceWithGif(message) {
    if (Math.random() > 0.001) return false;
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

    if (message.content.startsWith('!goon')) {
        const args = message.content.slice('!goon'.length).trim().split(/\s+/).filter(Boolean);
        const tags = args.length > 0 ? args : TAGS;
        await postImageToChannel(tags);
        return;
    }

    const replaced = await maybeReplaceWithGif(message);
    if (replaced) return;

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

client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.partial) {
        try { await reaction.fetch(); } catch (err) { return; }
    }
    if (reaction.emoji.name !== ARCHIVE_EMOJI) return;
    if (reaction.count < ARCHIVE_THRESHOLD) return;
    if (archivedMessages.has(reaction.message.id)) return;

    try {
        const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
        const archiveChannel = await client.channels.fetch(ARCHIVE_CHANNEL_ID);
        if (!archiveChannel || !archiveChannel.isTextBased()) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .setDescription(message.content || '')
            .setTimestamp(message.createdAt)
            .setFooter({ text: `🔥 ${reaction.count} | #${message.channel.name}` })
            .setColor(0xFF4500);

        if (message.attachments.size > 0) {
            embed.setImage(message.attachments.first().url);
        }

        await archiveChannel.send({ embeds: [embed] });
        archivedMessages.add(message.id);
        console.log(`Archived message ${message.id} from ${message.author.tag}`);
    } catch (err) {
        console.error('Failed to archive message:', err);
    }
});

client.login(process.env.DISCORD_TOKEN);
