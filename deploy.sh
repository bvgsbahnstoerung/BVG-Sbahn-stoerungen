# deploy.sh
#!/bin/bash

# Deployment Script für BVG S-Bahn Discord Bot

set -e  # Exit bei Fehler

echo "🚀 Starte Deployment..."

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funktionen
print_step() {
    echo -e "${YELLOW}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check ob Docker installiert ist
if ! command -v docker &> /dev/null; then
    print_error "Docker ist nicht installiert!"
    echo "Installiere Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose ist nicht installiert!"
    echo "Installiere Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check ob .env existiert
if [ ! -f .env ]; then
    print_error ".env Datei nicht gefunden!"
    echo "Kopiere .env.example zu .env und fülle die Werte aus:"
    echo "cp .env.example .env"
    exit 1
fi

# Check ob DISCORD_WEBHOOK_URL gesetzt ist
if ! grep -q "DISCORD_WEBHOOK_URL=https" .env; then
    print_error "DISCORD_WEBHOOK_URL ist nicht korrekt in .env gesetzt!"
    echo "Bearbeite die .env Datei und füge deine Discord Webhook URL ein."
    exit 1
fi

print_step "Stoppe laufende Container..."
docker-compose down || true

print_step "Baue neues Docker Image..."
docker-compose build --no-cache

print_step "Starte Bot..."
docker-compose up -d

print_step "Warte auf Bot-Start..."
sleep 5

print_step "Zeige Container Status..."
docker-compose ps

print_step "Zeige letzte Logs..."
docker-compose logs --tail=20

print_success "Deployment erfolgreich abgeschlossen!"
echo ""
echo "📊 Nützliche Befehle:"
echo "  Logs anzeigen:    docker-compose logs -f"
echo "  Status prüfen:    docker-compose ps"
echo "  Bot neustarten:   docker-compose restart"
echo "  Bot stoppen:      docker-compose down"
echo ""
echo "🔗 Container läuft im Hintergrund und startet automatisch neu."
