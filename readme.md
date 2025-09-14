# 🚇 BVG & S-Bahn Discord Störungsmelder

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## 🚀 1-Klick Deployment mit Render

### Automatisches Deployment:
1. Klicke auf "Deploy to Render" Button oben
2. Verbinde dein GitHub Repository
3. Setze die Environment Variable: `DISCORD_WEBHOOK_URL`
4. Klicke "Deploy" - Fertig! 🎉

### Manuelles Deployment:

#### 1. Render Account erstellen
- Gehe zu https://render.com
- Registriere dich mit GitHub Account

#### 2. Web Service erstellen
- Dashboard → "New" → "Web Service"
- Repository auswählen: `BVG-Sbahn-stoerungen`
- Name: `bvg-sbahn-discord-bot`

#### 3. Build Einstellungen:
```
Runtime: Python 3
Build Command: pip install -r requirements.txt
Start Command: python bot.py
```

#### 4. Environment Variables setzen:
```
DISCORD_WEBHOOK_URL = https://discord.com/api/webhooks/DEINE_ID/DEIN_TOKEN
CHECK_INTERVAL = 300
LOG_LEVEL = INFO
```

#### 5. Deploy!
- Klicke "Create Web Service"
- Automatisches Deployment startet
- Bot läuft in wenigen Minuten! ✅

## 🎛️ Render Dashboard Features

### Logs anzeigen:
- Render Dashboard → Dein Service → "Logs"
- Live-Logs der Bot-Aktivität

### Service neustarten:
- Dashboard → "Manual Deploy"
- Oder automatisch bei Git Push

### Environment Variables ändern:
- Dashboard → "Environment" → Variables bearbeiten
- Service wird automatisch neugestartet

## 📊 Monitoring

### Health Checks:
- Render prüft automatisch `/health` Endpoint
- Service wird bei Problemen automatisch neugestartet

### Alerts:
- E-Mail Benachrichtigungen bei Service-Problemen
- Discord Webhook für Status-Updates

## 💰 Kosten

### Free Tier (0€/Monat):
- ✅ Perfekt für diesen Bot
- ✅ 750 Stunden/Monat
- ✅ Automatische SSL
- ✅ GitHub Integration
- ⚠️ Service "schläft" nach 15 Min Inaktivität

### Starter Tier (7$/Monat):
- ✅ 24/7 Uptime (kein Schlafen)
- ✅ Mehr Ressourcen
- ✅ Erweiterte Monitoring

**Empfehlung:** Starte mit Free Tier - perfekt für Störungsmelder!

## 🔧 Troubleshooting

### Bot startet nicht?
1. Logs prüfen: Dashboard → "Logs"
2. Environment Variables prüfen
3. Manual Deploy versuchen

### Keine Discord Nachrichten?
1. Webhook URL korrekt?
2. Discord Channel Permissions?
3. Logs auf Fehler prüfen

### Service "schläft" (Free Tier)?
- Normal bei Free Tier nach 15 Min Inaktivität
- Bot startet bei nächster Störung automatisch
- Für 24/7: Upgrade zu Starter Tier

## 🎯 Render vs. Andere Plattformen

| Feature | Render | Railway | Heroku |
|---------|--------|---------|--------|
| Free Tier | ✅ 750h | ✅ 500h | ❌ Kostenpflichtig |
| GitHub Auto-Deploy | ✅ | ✅ | ✅ |
| Deutschland Server | ✅ Frankfurt | ❌ | ❌ |
| SSL | ✅ | ✅ | ✅ |
| Log Retention | 7 Tage | 7 Tage | 1 Tag |

## 📞 Support

### Render Support:
- Dokumentation: https://render.com/docs
- Community: https://community.render.com
- E-Mail Support (Paid Plans)

### Bot Support:
- GitHub Issues: Erstelle Issue in Repository
- Logs: Render Dashboard → "Logs"

---

## 🚀 Quick Start (5 Minuten)

1. **Fork Repository** auf GitHub
2. **Render Account** erstellen
3. **Web Service** verbinden
4. **Environment Variable** setzen:
   ```
   DISCORD_WEBHOOK_URL=deine_webhook_url
   ```
5. **Deploy** klicken ✅

**Das war's! Dein Bot läuft in der Cloud!** 🎉
