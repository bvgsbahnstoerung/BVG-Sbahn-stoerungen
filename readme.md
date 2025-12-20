BVG/VBB HAFAS Discord Bot
Dieser Bot ruft automatisch Verkehrsmeldungen von der BVG/VBB HAFAS API ab und sendet neue Meldungen an einen Discord-Kanal.
Features

🚇 Automatisches Abrufen von BVG/VBB Störungsmeldungen
💬 Versand an Discord via Webhook
🔄 Speichert bereits gesendete Meldungen (keine Duplikate)
⏰ Läuft automatisch alle 15 Minuten via GitHub Actions
🎨 Farbcodierte Discord Embeds nach Meldungstyp

Setup
1. Repository erstellen

Erstelle ein neues GitHub Repository
Lade folgende Dateien hoch:

bot.py (Hauptprogramm)
.github/workflows/hafas-bot.yml (Workflow)
requirements.txt (Dependencies)
README.md (diese Datei)
sent_messages.json (erstelle eine leere Datei mit {"sent_ids": []})



2. Discord Webhook erstellen

Gehe in deinen Discord Server
Rechtsklick auf den gewünschten Kanal → Kanal bearbeiten
Gehe zu Integrationen → Webhooks
Klicke auf Neuer Webhook
Gib dem Webhook einen Namen (z.B. "BVG Bot")
Kopiere die Webhook-URL

3. GitHub Secret konfigurieren

Gehe in dein GitHub Repository
Klicke auf Settings → Secrets and variables → Actions
Klicke auf New repository secret
Name: DISCORD_WEBHOOK_URL
Value: Füge deine Discord Webhook-URL ein
Klicke auf Add secret

4. Workflow Permissions setzen

Gehe zu Settings → Actions → General
Scrolle zu Workflow permissions
Wähle Read and write permissions
Aktiviere Allow GitHub Actions to create and approve pull requests
Klicke auf Save

5. Bot starten
Der Bot läuft automatisch alle 15 Minuten. Du kannst ihn auch manuell starten:

Gehe zu Actions
Wähle den Workflow BVG HAFAS Discord Bot
Klicke auf Run workflow

Dateistruktur
.
├── .github/
│   └── workflows/
│       └── hafas-bot.yml
├── bot.py
├── requirements.txt
├── sent_messages.json
└── README.md
Wie funktioniert es?

GitHub Actions führt den Bot alle 15 Minuten aus
Der Bot ruft aktuelle Meldungen von der BVG HAFAS API ab
Jede Meldung wird mit bereits gesendeten verglichen
Neue Meldungen werden als Discord Embed gesendet
Die Liste der gesendeten Meldungen wird in sent_messages.json gespeichert
Die Änderungen werden automatisch ins Repository committed

Anpassungen
Interval ändern
Bearbeite .github/workflows/hafas-bot.yml und ändere die Cron-Expression:
yamlschedule:
  - cron: '*/15 * * * *'  # Alle 15 Minuten
  # - cron: '0 * * * *'   # Jede Stunde
  # - cron: '0 */2 * * *' # Alle 2 Stunden
API-Endpoint anpassen
Wenn du andere Daten abrufen möchtest, kannst du in bot.py die URL ändern:
pythonurl = "https://v6.bvg.transport.rest/journeys/remarks"
Weitere Endpoints findest du in der BVG HAFAS API Dokumentation.
Troubleshooting
Bot sendet keine Nachrichten

Überprüfe, ob der Workflow läuft (Actions Tab)
Prüfe die Logs im Actions Tab
Stelle sicher, dass DISCORD_WEBHOOK_URL korrekt gesetzt ist

"Permission denied" Fehler

Stelle sicher, dass Workflow Permissions auf "Read and write" gesetzt sind

Duplikate werden gesendet

Prüfe, ob sent_messages.json korrekt committed wird
Stelle sicher, dass die Datei nicht von .gitignore ausgeschlossen ist

Lizenz
MIT License - Du kannst diesen Code frei verwenden und anpassen.
