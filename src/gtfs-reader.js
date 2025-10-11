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
          cause: alert.cause,
          effect: alert.effect,
          activePeriod: alert.activePeriod,
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
}
