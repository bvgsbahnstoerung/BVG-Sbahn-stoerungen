import dotenv from 'dotenv';

dotenv.config();

export const config = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    channelId: process.env.DISCORD_CHANNEL_ID,
    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
  },
  vbb: {
    apiKey: process.env.VBB_API_KEY,
    feedUrl: process.env.VBB_API_KEY 
      ? `https://api.vbb.de/gtfs-rt/v1/feed?apikey=${process.env.VBB_API_KEY}`
      : 'https://gtfs.mfdz.de/VBB.gtfs.rt',
  },
  filters: {
    lines: process.env.FILTER_LINES ? process.env.FILTER_LINES.split(',').map(l => l.trim()) : [],
    minDelay: parseInt(process.env.MIN_DELAY || '300', 10),
  },
  github: {
    isGithubActions: process.env.GITHUB_ACTIONS === 'true',
    stateDir: 'state',
  }
};

export function validateConfig() {
  const errors = [];

  if (!config.discord.webhookUrl && !config.discord.token) {
    errors.push('Entweder DISCORD_WEBHOOK_URL oder DISCORD_TOKEN muss gesetzt sein');
  }

  if (config.discord.token && !config.discord.channelId) {
    errors.push('DISCORD_CHANNEL_ID ist erforderlich wenn DISCORD_TOKEN verwendet wird');
  }

  if (errors.length > 0) {
    throw new Error(`Konfigurationsfehler:\n${errors.join('\n')}`);
  }
}
