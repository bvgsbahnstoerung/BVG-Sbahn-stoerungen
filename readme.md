# 🚇 BVG & S-Bahn Discord Störungsmelder

Ein automatischer Bot, der BVG- und S-Bahn-Störungen überwacht und Discord-Benachrichtigungen sendet.

## ✨ Features

- 🔍 Überwacht BVG-Störungsmeldungen
- 🚊 Überwacht S-Bahn-Störungen und Bauarbeiten  
- 📱 Discord-Benachrichtigungen für neue Störungen
- ✅ Benachrichtigungen wenn Störungen behoben sind
- 🔄 Kontinuierliche Überwachung
- 💾 Persistente Datenspeicherung
- 🐳 Docker-Support

## 🚀 Quick Start

### 1. Repository klonen
```bash
git clone https://github.com/DEIN_USERNAME/bvg-sbahn-discord-bot.git
cd bvg-sbahn-discord-bot
```

### 2. Environment-Variablen setzen
```bash
cp .env.example .env
# Bearbeite .env und füge deine Discord Webhook URL ein
```

### 3. Mit Docker starten
```bash
docker-compose up -d
```

### 4. Logs anzeigen
```bash
docker-compose logs -f
```

## 📋 Manuelle Installation

### Voraussetzungen
- Python 3.11+
- pip

### Installation
```bash
pip install -r requirements.txt
python bot.py
```

## ⚙️ Konfiguration

### Discord Webhook erstellen
1. Gehe zu deinem Discord Server
2. Server-Einstellungen → Integrationen
3. "Webhook erstellen" → Kanal wählen
4. Webhook-URL kopieren und in `.env` einfügen

### Environment-Variablen
- `DISCORD_WEBHOOK_URL`: Discord Webhook URL (erforderlich)
- `CHECK_INTERVAL`: Überprüfungsintervall in Sekunden (Standard: 300)
- `LOG_LEVEL`: Log-Level (DEBUG, INFO, WARNING, ERROR)

## 🔧 Deployment-Optionen

### GitHub Actions (Automatisch)
1. Füge Server-Secrets hinzu:
   - `HOST`: Server IP/Domain
   - `USERNAME`: SSH Username
   - `SSH_KEY`: Private SSH Key
2. Push zu `main` Branch triggert automatisches Deployment

### Manuelles Server-Deployment
```bash
# Auf dem Server
git clone https://github.com/DEIN_USERNAME/bvg-sbahn-discord-bot.git /opt/bvg-bot
cd /opt/bvg-bot
cp .env.example .env
# .env bearbeiten
docker-compose up -d
```

### Railway/Render Deployment
1. Verbinde GitHub Repository
2. Setze Environment Variable: `DISCORD_WEBHOOK_URL`
3. Deploy automatisch bei Git Push

## 📊 Überwachung

### Logs anzeigen
```bash
docker-compose logs -f
```

### Bot Status prüfen
```bash
docker-compose ps
```

### Neustart
```bash
docker-compose restart
```

## 🛠️ Entwicklung

### Lokale Entwicklung
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python bot.py
```

### Tests ausführen
```bash
python -m pytest tests/
```

## 📝 Changelog

### v1.0.0
- Initiale Version
- BVG und S-Bahn Überwachung
- Discord Benachrichtigungen
- Docker Support

## 🤝 Beitragen

1. Fork das Repository
2. Erstelle einen Feature Branch (`git checkout -b feature/amazing-feature`)
3. Commit deine Änderungen (`git commit -m 'Add amazing feature'`)
4. Push zum Branch (`git push origin feature/amazing-feature`)
5. Öffne einen Pull Request

## 📄 Lizenz

Dieses Projekt ist unter der MIT Lizenz lizensiert - siehe [LICENSE](LICENSE) Datei für Details.

## ⚠️ Disclaimer

Dieser Bot ist inoffiziell und nicht mit BVG oder S-Bahn Berlin verbunden.
