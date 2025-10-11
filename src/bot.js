import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';
import { config } from './config.js';
import { GTFSReader } from './gtfs-reader.js';
import { StateManager } from './state-manager.js';

export class VBBDiscordBot {
  constructor() {
    this.stateManager = new StateManager();
    this.gtfsReader = new GTFSReader(this.stateManager);
    this.useWebhook = !!config.discord.webhookUrl;
  }

  async runOnce() {
    console.log('📥 Lade gespeicherten State...');
    await this.stateManager.load();
    
    console.log('🧹 Führe Cleanup durch...');
    this.stateManager.cleanup();

    console.log('📡 Rufe VBB Feed ab...');
    const feed = await this.gtfsReader.fetchFeed();
    
    const alerts = this.gtfsReader.parseAlerts(feed);
    const newAlerts = this.gtfsReader.getNewAlerts(alerts);
    console.log(`🔔 Gefunden: ${alerts.length} alerts (${newAlerts.length} neu)`);

    const tripUpdates = this.gtfsReader.parseTripUpdates(feed);
    const newUpdates = this.gtfsReader.getNewUpdates(tripUpdates);
    console.log(`🚇 Gefunden: ${tripUpdates.length} updates (${newUpdates.length} neu)`);

    if (newAlerts.length > 0 || newUpdates.length > 0) {
      if (this.useWebhook) {
        await this.sendViaWebhook(newAlerts, newUpdates);
      } else {
        await this.sendViaBot(newAlerts, newUpdates);
      }
      console.log(`✅ ${newAlerts.length} alerts und ${newUpdates.length} updates gesendet`);
    } else {
      console.log('ℹ️  Keine neuen Updates zum Senden');
    }

    console.log('💾 Speichere State...');
    await this.stateManager.save();

    const stats = this.stateManager.getStats();
    console.log(`📊 State: ${stats.totalAlerts} alerts, ${stats.totalUpdates} updates gespeichert`);
  }

  async sendViaWebhook(alerts, updates) {
    const embeds = [];

    for (const alert of alerts) {
      embeds.push(this.createAlertEmbed(alert));
    }

    for (const update of updates) {
      embeds.push(this.createUpdateEmbed(update));
    }

    // Discord erlaubt max 10 embeds pro Message
    for (let i = 0; i < embeds.length; i += 10) {
      const batch = embeds.slice(i, i + 10);
      
      await fetch(config.discord.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: batch })
      });

      // Rate limiting vermeiden
      if (i + 10 < embeds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async sendViaBot(alerts, updates) {
    const client = new Client({
      intents: [GatewayIntentBits.Guilds]
    });

    await client.login(config.discord.token);
    
    const channel = await client.channels.fetch(config.discord.channelId);

    for (const alert of alerts) {
      await channel.send({ embeds: [this.createAlertEmbed(alert)] });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    for (const update of updates) {
      await channel.send({ embeds: [this.createUpdateEmbed(update)] });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await client.destroy();
  }

  createAlertEmbed(alert) {
    const color = this.getAlertColor(alert.effect);
    
    const embed = {
      color: parseInt(color.replace('#', ''), 16),
      title: `⚠️ ${alert.headerText}`,
      description: alert.descriptionText || 'Keine Details verfügbar',
      timestamp: new Date().toISOString(),
      fields: []
    };

    if (alert.informedEntity.length > 0) {
      const routes = alert.informedEntity
        .filter(e => e.routeId)
        .map(e => e.routeId)
        .join(', ');
      
      if (routes) {
        embed.fields.push({
          name: 'Betroffene Linien',
          value: routes,
          inline: false
        });
      }
    }

    return embed;
  }

  createUpdateEmbed(update) {
    const delayText = this.gtfsReader.formatDelay(update.delay);
    const color = update.delay > 0 ? '#FF9800' : '#4CAF50';

    return {
      color: parseInt(color.replace('#', ''), 16),
      title: `🚇 Verspätung auf Linie ${update.routeId || 'Unbekannt'}`,
      fields: [
        {
          name: 'Verspätung',
          value: delayText,
          inline: true
        },
        {
          name: 'Haltestelle',
          value: update.stopId,
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };
  }

  getAlertColor(effect) {
    const effectColors = {
      1: '#FF0000',
      2: '#FF9800',
      3: '#FFC107',
      4: '#2196F3',
      5: '#9C27B0',
      6: '#795548',
      7: '#F44336',
      8: '#000000',
    };

    return effectColors[effect] || '#808080';
  }
}
