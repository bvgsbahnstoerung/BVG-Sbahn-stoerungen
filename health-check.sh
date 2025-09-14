#!/bin/bash

# Health Check Script für den Bot

echo "🏥 Bot Health Check..."

# Check ob Container läuft
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Container läuft nicht!"
    echo "Starte Container..."
    docker-compose up -d
    exit 1
fi

# Check Logs auf Fehler
if docker-compose logs --tail=50 | grep -i "error\|exception\|failed"; then
    echo "⚠️  Fehler in den Logs gefunden!"
    echo "Letzte Logs:"
    docker-compose logs --tail=10
    exit 1
fi

# Check ob disruptions_cache.json existiert und aktuell ist
if [ -f "data/disruptions_cache.json" ]; then
    # Check ob Datei älter als 1 Stunde ist
    if [[ $(find data/disruptions_cache.json -mmin +60 -print) ]]; then
        echo "⚠️  Cache-Datei ist älter als 1 Stunde - Bot könnte nicht funktionieren"
        exit 1
    fi
fi

echo "✅ Bot läuft normal!"
exit 0
