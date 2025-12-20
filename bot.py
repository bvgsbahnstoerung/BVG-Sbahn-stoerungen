import requests
import json
import os
from datetime import datetime
from typing import Set, Dict, List

class HafasDiscordBot:
    def __init__(self, discord_webhook_url: str, state_file: str = "sent_messages.json"):
        self.discord_webhook_url = discord_webhook_url
        self.state_file = state_file
        self.state = self.load_state()
        
    def load_state(self) -> Dict:
        """Lädt bereits gesendete Nachrichten und aktive Störungen aus der Datei"""
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, 'r') as f:
                    data = json.load(f)
                    # Migriere altes Format zu neuem Format
                    if 'sent_ids' in data and 'active_disruptions' not in data:
                        return {
                            'sent_ids': set(data.get('sent_ids', [])),
                            'active_disruptions': {}
                        }
                    return {
                        'sent_ids': set(data.get('sent_ids', [])),
                        'active_disruptions': data.get('active_disruptions', {})
                    }
            except Exception as e:
                print(f"Fehler beim Laden des Status: {e}")
        return {'sent_ids': set(), 'active_disruptions': {}}
    
    def save_state(self):
        """Speichert gesendete Nachrichten-IDs und aktive Störungen in die Datei"""
        try:
            with open(self.state_file, 'w') as f:
                json.dump({
                    'sent_ids': list(self.state['sent_ids']),
                    'active_disruptions': self.state['active_disruptions']
                }, f, indent=2)
        except Exception as e:
            print(f"Fehler beim Speichern des Status: {e}")
    
    def fetch_hafas_messages(self) -> List[Dict]:
        """Ruft Störungsmeldungen von der BVG HAFAS API ab"""
        # Liste von APIs zum Ausprobieren
        apis = [
            "https://v6.bvg.transport.rest/journeys/remarks",
            "https://v5.vbb.transport.rest/journeys/remarks",
            "https://v6.vbb.transport.rest/journeys/remarks"
        ]
        
        for i, url in enumerate(apis):
            try:
                print(f"Versuche API {i+1}/{len(apis)}: {url}")
                response = requests.get(url, timeout=15)
                response.raise_for_status()
                remarks = response.json()
                
                if isinstance(remarks, list) and len(remarks) > 0:
                    print(f"✓ Erfolgreich! {len(remarks)} Meldungen gefunden")
                    return remarks
                elif isinstance(remarks, list):
                    print(f"✓ API antwortet, aber keine Meldungen vorhanden")
                    return []
                    
            except requests.exceptions.Timeout:
                print(f"✗ Timeout bei API {i+1}")
            except requests.exceptions.HTTPError as e:
                print(f"✗ HTTP Fehler bei API {i+1}: {e.response.status_code}")
            except Exception as e:
                print(f"✗ Fehler bei API {i+1}: {type(e).__name__}")
        
        print("Alle APIs fehlgeschlagen - keine Meldungen verfügbar")
        return []
    
    def create_discord_embed(self, message: Dict, resolved: bool = False) -> Dict:
        """Erstellt ein Discord Embed aus einer HAFAS-Nachricht"""
        if resolved:
            embed = {
                "title": "✅ Störung behoben",
                "description": message.get('summary', 'Verkehrsmeldung'),
                "color": 0x00FF00,  # Grün
                "timestamp": datetime.utcnow().isoformat(),
                "footer": {
                    "text": "BVG/VBB HAFAS"
                }
            }
            
            # Füge ursprüngliche Details hinzu
            if message.get('text'):
                embed["fields"] = [{
                    "name": "Details",
                    "value": message.get('text', 'Keine Details verfügbar'),
                    "inline": False
                }]
        else:
            embed = {
                "title": "⚠️ " + message.get('summary', 'Verkehrsmeldung'),
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
                if resolved:
                    if 'fields' not in embed:
                        embed["fields"] = []
                    embed["fields"].append({
                        "name": "Betroffene Linien",
                        "value": ", ".join(product_names),
                        "inline": False
                    })
                else:
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
    
    def send_to_discord(self, message: Dict, resolved: bool = False):
        """Sendet eine Nachricht an Discord"""
        embed = self.create_discord_embed(message, resolved)
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
            status = "behoben" if resolved else "gesendet"
            print(f"Nachricht {status}: {message.get('id')}")
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
    
    def check_resolved_disruptions(self, current_message_ids: Set[str]):
        """Prüft, welche Störungen nicht mehr aktiv sind"""
        active_disruptions = self.state['active_disruptions']
        resolved_ids = []
        
        for msg_id, msg_data in active_disruptions.items():
            if msg_id not in current_message_ids:
                # Störung wurde behoben
                resolved_ids.append(msg_id)
                self.send_to_discord(msg_data, resolved=True)
        
        # Entferne behobene Störungen aus active_disruptions
        for msg_id in resolved_ids:
            del active_disruptions[msg_id]
        
        return len(resolved_ids)
    
    def run(self):
        """Hauptfunktion: Ruft Meldungen ab und sendet neue an Discord"""
        print(f"Starte Bot um {datetime.now()}")
        
        messages = self.fetch_hafas_messages()
        print(f"{len(messages)} Meldungen abgerufen")
        
        current_message_ids = set()
        new_count = 0
        
        # Verarbeite alle aktuellen Meldungen
        for msg in messages:
            msg_id = self.generate_message_id(msg)
            current_message_ids.add(msg_id)
            
            # Prüfe ob es eine neue Meldung ist
            if msg_id not in self.state['sent_ids']:
                self.send_to_discord(msg, resolved=False)
                self.state['sent_ids'].add(msg_id)
                new_count += 1
            
            # Speichere/aktualisiere in active_disruptions
            self.state['active_disruptions'][msg_id] = {
                'id': msg_id,
                'summary': msg.get('summary', ''),
                'text': msg.get('text', ''),
                'type': msg.get('type', ''),
                'products': msg.get('products', [])
            }
        
        # Prüfe auf behobene Störungen
        resolved_count = self.check_resolved_disruptions(current_message_ids)
        
        # Speichere Status
        self.save_state()
        
        # Ausgabe
        if new_count > 0:
            print(f"{new_count} neue Meldungen gesendet")
        if resolved_count > 0:
            print(f"{resolved_count} Störungen als behoben gemeldet")
        if new_count == 0 and resolved_count == 0:
            print("Keine Änderungen")

if __name__ == "__main__":
    # Discord Webhook URL aus Umgebungsvariable
    webhook_url = os.getenv("DISCORD_WEBHOOK_URL")
    
    if not webhook_url:
        print("Fehler: DISCORD_WEBHOOK_URL Umgebungsvariable nicht gesetzt!")
        exit(1)
    
    bot = HafasDiscordBot(webhook_url)
    bot.run()
