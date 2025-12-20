import requests
import json
import os
from datetime import datetime
from typing import Set, Dict, List

class HafasDiscordBot:
    def __init__(self, discord_webhook_url: str, state_file: str = "sent_messages.json"):
        self.discord_webhook_url = discord_webhook_url
        self.state_file = state_file
        self.sent_ids: Set[str] = self.load_state()
        
    def load_state(self) -> Set[str]:
        """Lädt bereits gesendete Nachrichten-IDs aus der Datei"""
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, 'r') as f:
                    data = json.load(f)
                    return set(data.get('sent_ids', []))
            except Exception as e:
                print(f"Fehler beim Laden des Status: {e}")
        return set()
    
    def save_state(self):
        """Speichert gesendete Nachrichten-IDs in die Datei"""
        try:
            with open(self.state_file, 'w') as f:
                json.dump({'sent_ids': list(self.sent_ids)}, f)
        except Exception as e:
            print(f"Fehler beim Speichern des Status: {e}")
    
    def fetch_hafas_messages(self) -> List[Dict]:
        """Ruft Störungsmeldungen von der BVG HAFAS API ab"""
        url = "https://v6.bvg.transport.rest/journeys/remarks"
        
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            remarks = response.json()
            return remarks if isinstance(remarks, list) else []
        except Exception as e:
            print(f"Fehler beim Abrufen der HAFAS-Daten: {e}")
            return []
    
    def create_discord_embed(self, message: Dict) -> Dict:
        """Erstellt ein Discord Embed aus einer HAFAS-Nachricht"""
        embed = {
            "title": message.get('summary', 'Verkehrsmeldung'),
            "description": message.get('text', 'Keine Details verfügbar'),
            "color": self.get_color_for_type(message.get('type')),
            "timestamp": datetime.utcnow().isoformat(),
            "footer": {
                "text": "BVG/VBB HAFAS"
            }
        }
        
        # Füge betroffene Linien hinzu
        if 'products' in message:
            products = message['products']
            product_names = [p.get('name', '') for p in products if isinstance(p, dict)]
            if product_names:
                embed["fields"] = [{
                    "name": "Betroffene Linien",
                    "value": ", ".join(product_names),
                    "inline": False
                }]
        
        return embed
    
    def get_color_for_type(self, msg_type: str) -> int:
        """Gibt eine Farbe basierend auf dem Nachrichtentyp zurück"""
        colors = {
            'warning': 0xFF9900,  # Orange
            'status': 0x0099FF,   # Blau
            'hint': 0x00FF00,     # Grün
        }
        return colors.get(msg_type, 0xFF0000)  # Standard: Rot
    
    def send_to_discord(self, message: Dict):
        """Sendet eine Nachricht an Discord"""
        embed = self.create_discord_embed(message)
        payload = {
            "embeds": [embed]
        }
        
        try:
            response = requests.post(
                self.discord_webhook_url,
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            print(f"Nachricht gesendet: {message.get('id')}")
        except Exception as e:
            print(f"Fehler beim Senden an Discord: {e}")
    
    def generate_message_id(self, message: Dict) -> str:
        """Generiert eine eindeutige ID für eine Nachricht"""
        # Verwende vorhandene ID oder erstelle eine aus summary + text
        if 'id' in message:
            return str(message['id'])
        
        summary = message.get('summary', '')
        text = message.get('text', '')
        return f"{hash(summary + text)}"
    
    def run(self):
        """Hauptfunktion: Ruft Meldungen ab und sendet neue an Discord"""
        print(f"Starte Bot um {datetime.now()}")
        
        messages = self.fetch_hafas_messages()
        print(f"{len(messages)} Meldungen abgerufen")
        
        new_count = 0
        for msg in messages:
            msg_id = self.generate_message_id(msg)
            
            if msg_id not in self.sent_ids:
                self.send_to_discord(msg)
                self.sent_ids.add(msg_id)
                new_count += 1
        
        if new_count > 0:
            self.save_state()
            print(f"{new_count} neue Meldungen gesendet")
        else:
            print("Keine neuen Meldungen")

if __name__ == "__main__":
    # Discord Webhook URL aus Umgebungsvariable
    webhook_url = os.getenv("DISCORD_WEBHOOK_URL")
    
    if not webhook_url:
        print("Fehler: DISCORD_WEBHOOK_URL Umgebungsvariable nicht gesetzt!")
        exit(1)
    
    bot = HafasDiscordBot(webhook_url)
    bot.run()
