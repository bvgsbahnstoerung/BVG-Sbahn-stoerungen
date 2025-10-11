import fs from 'fs/promises';
import path from 'path';
import { config } from './config.js';

export class StateManager {
  constructor() {
    this.stateFile = path.join(config.github.stateDir, 'bot-state.json');
    this.state = {
      lastAlerts: {},
      lastUpdates: {},
      lastRun: null,
    };
  }

  async load() {
    try {
      await fs.mkdir(config.github.stateDir, { recursive: true });
      
      const data = await fs.readFile(this.stateFile, 'utf8');
      this.state = JSON.parse(data);
      console.log(`✅ State geladen: ${Object.keys(this.state.lastAlerts).length} alerts, ${Object.keys(this.state.lastUpdates).length} updates`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('ℹ️  Kein vorheriger State gefunden, starte frisch');
      } else {
        console.error('⚠️  Fehler beim Laden des States:', error);
      }
    }
  }

  async save() {
    try {
      await fs.mkdir(config.github.stateDir, { recursive: true });
      
      this.state.lastRun = new Date().toISOString();
      
      await fs.writeFile(
        this.stateFile,
        JSON.stringify(this.state, null, 2),
        'utf8'
      );
      console.log('✅ State gespeichert');
    } catch (error) {
      console.error('⚠️  Fehler beim Speichern des States:', error);
    }
  }

  hasAlert(alertId) {
    return alertId in this.state.lastAlerts;
  }

  addAlert(alertId, alertData) {
    this.state.lastAlerts[alertId] = {
      timestamp: Date.now(),
      headerText: alertData.headerText,
    };
  }

  hasUpdate(updateId, delay) {
    const lastUpdate = this.state.lastUpdates[updateId];
    if (!lastUpdate) return false;
    
    // Nur als neu betrachten wenn sich die Verspätung geändert hat
    return lastUpdate.delay === delay;
  }

  addUpdate(updateId, updateData) {
    this.state.lastUpdates[updateId] = {
      timestamp: Date.now(),
      delay: updateData.delay,
      routeId: updateData.routeId,
    };
  }

  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 Stunden

    // Entferne alte Alerts
    let removedAlerts = 0;
    for (const [id, data] of Object.entries(this.state.lastAlerts)) {
      if (now - data.timestamp > maxAge) {
        delete this.state.lastAlerts[id];
        removedAlerts++;
      }
    }

    // Entferne alte Updates
    let removedUpdates = 0;
    for (const [id, data] of Object.entries(this.state.lastUpdates)) {
      if (now - data.timestamp > maxAge) {
        delete this.state.lastUpdates[id];
        removedUpdates++;
      }
    }

    if (removedAlerts > 0 || removedUpdates > 0) {
      console.log(`🧹 Cleanup: ${removedAlerts} alerts und ${removedUpdates} updates entfernt`);
    }
  }

  getStats() {
    return {
      totalAlerts: Object.keys(this.state.lastAlerts).length,
      totalUpdates: Object.keys(this.state.lastUpdates).length,
      lastRun: this.state.lastRun,
    };
  }
}
