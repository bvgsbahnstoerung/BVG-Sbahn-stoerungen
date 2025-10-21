import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import fetch from 'node-fetch';
import { config } from './config.js';

export class GTFSReader {
  constructor(stateManager) {
    this.stateManager = stateManager;
  }

  async fetchFeed() {
    try {
      const response = await fetch(config.vbb.feedUrl, {
        headers: {
          'Accept': 'application/x-protobuf'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
        new Uint8Array(buffer)
      );

      return feed;
    } catch (error) {
      console.error('Fehler beim Abrufen des GTFS-RT Feeds:', error);
      throw error;
    }
  }

  parseAlerts(feed) {
    const alerts = [];

    for (const entity of feed.entity) {
      if (entity.alert) {
        const alert = entity.alert;
        
        const alertData = {
          id: entity.id,
          headerText: this.extractText(alert.headerText),
          descriptionText: this.extractText(alert.descriptionText),
          url: this.extractUrl(alert.url),
          cause: alert.cause,
          causeName: this.getCauseName(alert.cause),
          effect: alert.effect,
          effectName: this.getEffectName(alert.effect),
          activePeriod: this.parseActivePeriods(alert.activePeriod),
          informedEntity: alert.informedEntity || []
        };

        if (this.shouldIncludeAlert(alertData)) {
          alerts.push(alertData);
        }
      }
    }

    return alerts;
  }

  parseTripUpdates(feed) {
    const updates = [];

    for (const entity of feed.entity) {
      if (entity.tripUpdate) {
        const tripUpdate = entity.tripUpdate;
        const trip = tripUpdate.trip;
        
        for (const stopTimeUpdate of tripUpdate.stopTimeUpdate || []) {
          const delay = stopTimeUpdate.arrival?.delay || stopTimeUpdate.departure?.delay;
          
          if (delay && Math.abs(delay) >= config.filters.minDelay) {
            const updateData = {
              id: `${trip.tripId}_${stopTimeUpdate.stopId}`,
              tripId: trip.tripId,
              routeId: trip.routeId,
              startDate: trip.startDate,
              stopId: stopTimeUpdate.stopId,
              stopSequence: stopTimeUpdate.stopSequence,
              delay: delay,
              scheduleRelationship: stopTimeUpdate.scheduleRelationship
            };

            if (this.shouldIncludeUpdate(updateData)) {
              updates.push(updateData);
            }
          }
        }
      }
    }

    return updates;
  }

  parseActivePeriods(activePeriods) {
    if (!activePeriods || activePeriods.length === 0) {
      return [];
    }

    return activePeriods.map(period => ({
      start: period.start ? new Date(period.start.toNumber() * 1000) : null,
      end: period.end ? new Date(period.end.toNumber() * 1000) : null
    }));
  }

  extractText(translatedString) {
    if (!translatedString || !translatedString.translation) {
      return '';
    }
    
    const deTranslation = translatedString.translation.find(t => t.language === 'de');
    if (deTranslation) {
      return deTranslation.text;
    }

    return translatedString.translation[0]?.text || '';
  }

  extractUrl(urlField) {
    if (!urlField || !urlField.translation) {
      return null;
    }
    
    const deUrl = urlField.translation.find(t => t.language === 'de');
    if (deUrl) {
      return deUrl.text;
    }

    return urlField.translation[0]?.text || null;
  }

  getCauseName(cause) {
    const causes = {
      1: 'Unbekannter Grund',
      2: 'Sonstiger Grund',
      3: 'Technisches Problem',
      4: 'Streik',
      5: 'Demonstration',
      6: 'Unfall',
      7: 'Feiertag',
      8: 'Wetter',
      9: 'Wartung',
      10: 'Bauarbeiten',
      11: 'Polizeieinsatz',
      12: 'Medizinischer Notfall'
    };
    return causes[cause] || 'Unbekannt';
  }

  getEffectName(effect) {
    const effects = {
      1: 'Kein Service',
      2: 'Reduzierter Service',
      3: 'Erhebliche Verspätungen',
      4: 'Umleitung',
      5: 'Zusätzlicher Service',
      6: 'Geänderter Service',
      7: 'Haltestelle verlegt',
      8: 'Haltestelle geschlossen',
      9: 'Keine Auswirkung',
      10: 'Barrierefreiheit eingeschränkt'
    };
    return effects[effect] || 'Unbekannt';
  }

  shouldIncludeAlert(alert) {
    if (config.filters.lines.length === 0) {
      return true;
    }

    return alert.informedEntity.some(entity => 
      entity.routeId && config.filters.lines.includes(entity.routeId)
    );
  }

  shouldIncludeUpdate(update) {
    if (config.filters.lines.length === 0) {
      return true;
    }

    return update.routeId && config.filters.lines.includes(update.routeId);
  }

  getNewAlerts(currentAlerts) {
    const newAlerts = [];
    
    for (const alert of currentAlerts) {
      if (!this.stateManager.hasAlert(alert.id)) {
        newAlerts.push(alert);
        this.stateManager.addAlert(alert.id, alert);
      }
    }

    return newAlerts;
  }

  getNewUpdates(currentUpdates) {
    const newUpdates = [];
    
    for (const update of currentUpdates) {
      if (!this.stateManager.hasUpdate(update.id, update.delay)) {
        newUpdates.push(update);
        this.stateManager.addUpdate(update.id, update);
      }
    }

    return newUpdates;
  }

  formatDelay(seconds) {
    const minutes = Math.floor(Math.abs(seconds) / 60);
    const sign = seconds >= 0 ? '+' : '-';
    return `${sign}${minutes} Min`;
  }

  formatDate(date) {
    if (!date) return 'Unbekannt';
    
    const options = {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return date.toLocaleString('de-DE', options);
  }
}
