import { VBBDiscordBot } from './bot.js';
import { validateConfig } from './config.js';

async function main() {
  console.log('🚀 Starte VBB GTFS-RT Discord Bot (GitHub Actions Mode)...');

  try {
    validateConfig();
    console.log('✅ Konfiguration validiert');

    const bot = new VBBDiscordBot();
    await bot.runOnce();
    
    console.log('✅ Bot-Durchlauf abgeschlossen');
    process.exit(0);

  } catch (error) {
    console.error('❌ Fataler Fehler:', error);
    process.exit(1);
  }
}

main();
