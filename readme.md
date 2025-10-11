# VBB GTFS-RT Discord Bot (GitHub Actions)

Ein Discord-Bot, der über GitHub Actions läuft und Echtzeit-Updates vom VBB GTFS-RT Feed in Discord postet.

## Features

- 🚇 Echtzeit-Updates zu Verspätungen und Ausfällen
- 🔄 Läuft alle 5 Minuten via GitHub Actions
- 📊 Filterung nach Linien und Verkehrsmitteln
- 💬 Discord-Embed-Nachrichten mit Farbcodierung
- 🔒 Verhindert doppelte Nachrichten durch State-Management
- ☁️ Keine Server nötig - läuft komplett auf GitHub

## Setup

### 1. Repository erstellen

1. Erstelle ein neues GitHub Repository
2. Lade alle Dateien hoch

### 2. Discord Bot erstellen

1. Gehe zu [Discord Developer Portal](https://discord.com/developers/applications)
2. Erstelle eine neue Application
3. Gehe zu "Bot" und erstelle einen Bot
4. Kopiere den Token
5. Aktiviere "Message Content Intent"
6. Erstelle einen Webhook für deinen Channel:
   - Gehe zu deinem Discord-Server
   - Channel Settings → Integrations → Webhooks → New Webhook
   - Kopiere die Webhook URL

### 3. GitHub Secrets konfigurieren

Gehe zu deinem Repository → Settings → Secrets and variables → Actions

Füge folgende Secrets hinzu:

- `DISCORD_TOKEN` - Dein Discord Bot Token
- `DISCORD_CHANNEL_ID` - Die ID deines Discord Channels
- `DISCORD_WEBHOOK_URL` - Die Webhook URL (optional, aber empfohlen)
- `VBB_API_KEY` - VBB API Key (optional)

### 4. GitHub Actions aktivieren

1. Gehe zu Actions Tab in deinem Repository
2. Aktiviere Workflows
3. Der Bot läuft jetzt automatisch alle 5 Minuten!

## Konfiguration

### Weitere Optionen als Secrets:

- `UPDATE_INTERVAL_MINUTES` - Intervall in Minuten (Standard: 5)
- `FILTER_LINES` - Kommagetrennte Liste (z.B. "U1,U2,S1")
- `MIN_DELAY` - Minimale Verspätung in Sekunden (Standard: 300)

## Wie es funktioniert

1. GitHub Actions startet alle 5 Minuten den Bot
2. Der Bot lädt den letzten State aus GitHub
3. Neue Updates werden geprüft und gepostet
4. Der State wird gespeichert um Duplikate zu verhindern
5. Der Bot beendet sich automatisch

## Manueller Trigger

Du kannst den Bot auch manuell starten:

1. Gehe zu Actions → VBB Discord Bot
2. Klicke auf "Run workflow"

## Lizenz

MIT
