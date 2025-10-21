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
      embeds.push(this.createDetailedAlertEmbed(alert));
    }

    for (const update of updates) {
      embeds.push(this.createUpdateEmbed(update));
    }

    for (let i = 0; i < embeds.length; i += 10) {
      const batch = embeds.slice(i, i + 10);
      
      await fetch(config.discord.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: batch })
      });

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
      await channel.send({ embeds: [this.createDetailedAlertEmbed(alert)] });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    for (const update of updates) {
      await channel.send({ embeds: [this.createUpdateEmbed(update)] });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await client.destroy();
  }

  createDetailedAlertEmbed(alert) {
    const color = this.getAlertColor(alert.effect, alert.cause);
    const icon = this.getAlertIcon(alert.cause);
    
    const embed = {
      color: parseInt(color.replace('#', ''), 16),
      title: `${icon} ${alert.headerText}`,
      description: alert.descriptionText || 'Keine weiteren Details verfügbar',
      timestamp: new Date().toISOString(),
      fields: []
    };

    // Grund und Auswirkung
    embed.fields.push({
      name: '📋 Grund',
      value: alert.causeName,
      inline: true
    });

    embed.fields.push({
      name: '⚡ Auswirkung',
      value: alert.effectName,
      inline: true
    });

    // Zeitraum
    if (alert.activePeriod && alert.activePeriod.length > 0) {
      const period = alert.activePeriod[0];
      let timeText = '';
      
      if (period.start && period.end) {
        timeText = `Von ${this.gtfsReader.formatDate(period.start)}\nBis ${this.gtfsReader.formatDate(period.end)}`;
      } else if (period.start) {
        timeText = `Ab ${this.gtfsReader.formatDate(period.start)}`;
      } else if (period.end) {
        timeText = `Bis ${this.gtfsReader.formatDate(period.end)}`;
      }
      
      if (timeText) {
        embed.fields.push({
          name: '📅 Zeitraum',
          value: timeText,
          inline: false
        });
      }
    }

    // Betroffene Linien
    if (alert.informedEntity.length > 0) {
      const routes = alert.informedEntity
        .filter(e => e.routeId)
        .map(e => this.formatRouteName(e.routeId))
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 10);
      
      if (routes.length > 0) {
        embed.fields.push({
          name: '🚇 Betroffene Linien',
          value: routes.join(', ') + (alert.informedEntity.filter(e => e.routeId).length > 10 ? ' ...' : ''),
          inline: false
        });
      }

      // Betroffene Haltestellen
      const stops = alert.informedEntity
        .filter(e => e.stopId)
        .map(e => this.formatStopName(e.stopId))
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 5);
      
      if (stops.length > 0) {
        const stopCount = alert.informedEntity.filter(e => e.stopId).length;
        embed.fields.push({
          name: '🚉 Betroffene Haltestellen',
          value: stops.join(', ') + (stopCount > 5 ? ` und ${stopCount - 5} weitere` : ''),
          inline: false
        });
      }

      // Richtung (wenn vorhanden)
      const directions = alert.informedEntity
        .filter(e => e.trip && e.trip.directionId !== undefined)
        .map(e => e.trip.directionId === 0 ? 'Richtung 1' : 'Richtung 2')
        .filter((v, i, a) => a.indexOf(v) === i);
      
      if (directions.length > 0) {
        embed.fields.push({
          name: '➡️ Richtung',
          value: directions.join(', '),
          inline: true
        });
      }
    }

    // Link (wenn vorhanden)
    if (alert.url) {
      embed.fields.push({
        name: '🔗 Weitere Informationen',
        value: `[Hier klicken](${alert.url})`,
        inline: false
      });
    }

    return embed;
  }

  createUpdateEmbed(update) {
    const delayText = this.gtfsReader.formatDelay(update.delay);
    const color = update.delay > 0 ? '#FF9800' : '#4CAF50';
    const icon = this.getTransportIcon(update.routeId);

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
        text: 'VBB Echtzeit-Daten'
      },
      timestamp: new Date().toISOString()
    };
  }

  getAlertIcon(cause) {
    const icons = {
      4: '✊',   // Streik
      5: '📢',   // Demonstration
      6: '🚨',   // Unfall
      7: '🎄',   // Feiertag
      8: '🌧️',   // Wetter
      9: '🔧',   // Wartung
      10: '🏗️',  // Bauarbeiten
      11: '👮',  // Polizeieinsatz
      12: '🚑',  // Medizinischer Notfall
    };
    return icons[cause] || '⚠️';
  }

  getAlertColor(effect, cause) {
    // Bauarbeiten = Orange
    if (cause === 10) return '#FF9800';
    
    const effectColors = {
      1: '#FF0000',  // Kein Service
      2: '#FF9800',  // Reduzierter Service
      3: '#FFC107',  // Erhebliche Verspätungen
      4: '#2196F3',  // Umleitung
      5: '#9C27B0',  // Zusätzlicher Service
      6: '#795548',  // Geänderter Service
      7: '#F44336',  // Haltestelle verlegt
      8: '#E91E63',  // Haltestelle geschlossen
    };

    return effectColors[effect] || '#808080';
  }

  formatRouteName(routeId) {
    if (!routeId) return 'Unbekannt';
    
    const match = routeId.match(/[_]?([A-Z0-9]+)$/);
    if (match) {
      const name = match[1];
      
      if (/^[US]\d+/.test(name)) {
        return name.replace(/^([US])(\d+)/, '$1 $2');
      }
      
      return name;
    }
    
    return routeId;
  }

  formatStopName(stopId) {
    if (!stopId) return 'Unbekannt';
    
    const match = stopId.match(/de:11000:(\d+)/);
    if (match) {
      const stationId = match[1];
      
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
      
      return `Station ${stationId.slice(-4)}`;
    }
    
    const parts = stopId.split(':');
    return parts[parts.length - 2] || stopId;
  }

  getTransportIcon(routeId) {
    if (!routeId) return '🚇';
    
    const route = this.formatRouteName(routeId);
    
    if (route.startsWith('U ')) return '🚇';
    if (route.startsWith('S ')) return '🚊';
    if (route.startsWith('RE') || route.startsWith('RB')) return '🚆';
    if (route.match(/^\d+$/)) return '🚌';
    if (route.startsWith('M')) return '🚊';
    if (route.startsWith('X')) return '🚌';
    
    return '🚇';
  }
}
