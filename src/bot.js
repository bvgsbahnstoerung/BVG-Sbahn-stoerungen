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
        .map(e => this.formatRouteName(e.routeId))
        .filter((v, i, a) => a.indexOf(v) === i) // Duplikate entfernen
        .join(', ');
      
      if (routes) {
        embed.fields.push({
          name: '🚇 Betroffene Linien',
          value: routes,
          inline: false
        });
      }

      // Betroffene Haltestellen
      const stops = alert.informedEntity
        .filter(e => e.stopId)
        .map(e => this.formatStopName(e.stopId))
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 5); // Max 5 Stationen
      
      if (stops.length > 0) {
        embed.fields.push({
          name: '🚉 Betroffene Haltestellen',
          value: stops.join(', ') + (alert.informedEntity.filter(e => e.stopId).length > 5 ? ' ...' : ''),
          inline: false
        });
      }
    }

    return embed;
  }

  createUpdateEmbed(update) {
    const delayText = this.gtfsReader.formatDelay(update.delay);
    const color = update.delay > 0 ? '#FF9800' : '#4CAF50';
    const icon = this.getTransportIcon(update.routeId);

    // Formatierte Namen
    const routeName = this.formatRouteName(update.routeId);
    const stopName = this.formatStopName(update.stopId);

    return {
      color: parseInt(color.replace('#', ''), 16),
      title: `${icon} Verspätung auf Linie ${routeName}`,
      fields: [
        {
          name: '⏱️ Verspätung',
          value: delayText,
          inline: true
        },
        {
          name: '🚉 Haltestelle',
          value: stopName,
          inline: true
        }
      ],
      footer: {
        text: update.tripId ? `Fahrt ${update.tripId.slice(0, 15)}...` : 'VBB Echtzeit'
      },
      timestamp: new Date().toISOString()
    };
  }

  formatRouteName(routeId) {
    if (!routeId) return 'Unbekannt';
    
    // Entferne VBB-interne Präfixe
    // Beispiele: "17440_900" -> "900", "17529_U6" -> "U6"
    const match = routeId.match(/[_]?([A-Z0-9]+)$/);
    if (match) {
      const name = match[1];
      
      // Füge Leerzeichen bei U/S-Bahn ein: "U6" -> "U 6"
      if (/^[US]\d+/.test(name)) {
        return name.replace(/^([US])(\d+)/, '$1 $2');
      }
      
      return name;
    }
    
    return routeId;
  }

  formatStopName(stopId) {
    if (!stopId) return 'Unbekannt';
    
    // VBB Stop-ID Format: de:11000:900120004::5
    // Extrahiere die Stations-ID (900120004)
    const match = stopId.match(/de:11000:(\d+)/);
    if (match) {
      const stationId = match[1];
      
      // Bekannte Stationen-Mapping (Beispiele)
      const knownStations = {
        '900120004': 'S+U Alexanderplatz',
        '900100001': 'S+U Zoologischer Garten',
        '900003201': 'U Kottbusser Tor',
        '900120003': 'S Hackescher Markt',
        '900017104': 'S+U Hauptbahnhof',
        '900024106': 'U Mehringdamm',
        '900007102': 'U Schloßstraße',
        '900014101': 'S Ostkreuz',
        '900110001': 'U Spichernstraße',
      };
      
      if (knownStations[stationId]) {
        return knownStations[stationId];
      }
      
      // Fallback: Zeige verkürzte ID
      return `Station ${stationId.slice(-4)}`;
    }
    
    // Wenn Format nicht erkannt, zeige letzten Teil
    const parts = stopId.split(':');
    return parts[parts.length - 2] || stopId;
  }

  getTransportIcon(routeId) {
    if (!routeId) return '🚇';
    
    const route = this.formatRouteName(routeId);
    
    if (route.startsWith('U ')) return '🚇'; // U-Bahn
    if (route.startsWith('S ')) return '🚊'; // S-Bahn
    if (route.startsWith('RE') || route.startsWith('RB')) return '🚆'; // Regional
    if (route.match(/^\d+$/)) return '🚌'; // Bus (nur Zahlen)
    if (route.startsWith('M')) return '🚊'; // Metro Tram
    if (route.startsWith('X')) return '🚌'; // Express Bus
    
    return '🚇'; // Default
  }

  getAlertColor(effect) {
    const effectColors = {
      1: '#FF0000', // NO_SERVICE
      2: '#FF9800', // REDUCED_SERVICE
      3: '#FFC107', // SIGNIFICANT_DELAYS
      4: '#2196F3', // DETOUR
      5: '#9C27B0', // ADDITIONAL_SERVICE
      6: '#795548', // MODIFIED_SERVICE
      7: '#F44336', // STOP_MOVED
      8: '#000000', // NO_EFFECT
    };

    return effectColors[effect] || '#808080';
  }
}
