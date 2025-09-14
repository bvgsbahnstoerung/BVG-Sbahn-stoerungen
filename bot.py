#!/usr/bin/env python3
"""
🚇 BVG & S-Bahn Discord Störungsmelder Bot
Überwacht BVG- und S-Bahn-Störungen und sendet Discord-Benachrichtigungen

Author: Your Name
Version: 1.0.0
"""

import requests
import json
import time
import logging
from datetime import datetime
from bs4 import BeautifulSoup
import hashlib
import os
from typing import Dict, Set, List, Tuple
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class TransportDisruptionBot:
    """
    Bot zur Überwachung von BVG- und S-Bahn-Störungen mit Discord-Integration
    """
    
    def __init__(self, discord_webhook_url: str):
        """
        Initialisiert den Bot mit Discord Webhook URL
        
        Args:
            discord_webhook_url: Discord Webhook URL für Benachrichtigungen
        """
        self.discord_webhook_url = discord_webhook_url
        self.bvg_url = "https://www.bvg.de/de/verbindungen/stoerungsmeldungen"
        self.sbahn_url = "https://sbahn.berlin/fahren/bauen-stoerung/"
        
        # Setup logging
        log_level = os.getenv('LOG_LEVEL', 'INFO')
        logging.basicConfig(
            level=getattr(logging, log_level),
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('data/bot.log'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
        # Speichert bekannte Störungen (Hash -> Störungsinfo)
        self.known_disruptions = {}
        self.data_file = "data/disruptions_cache.json"
        
        # Erstelle data Ordner falls nicht vorhanden
        os.makedirs("data", exist_ok=True)
        
        # Lade vorherige Störungen falls vorhanden
        self.load_known_disruptions()
        
        self.logger.info("🤖 Bot erfolgreich initialisiert")
    
    def load_known_disruptions(self):
        """Lädt bekannte Störungen aus einer JSON-Datei"""
        try:
            if os.path.exists(self.data_file):
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    self.known_disruptions = json.load(f)
                self.logger.info(f"📁 Geladene bekannte Störungen: {len(self.known_disruptions)}")
            else:
                self.logger.info("📁 Keine vorherigen Störungen gefunden - starte mit leerem Cache")
        except Exception as e:
            self.logger.error(f"❌ Fehler beim Laden der Störungen: {e}")
            self.known_disruptions = {}
    
    def save_known_disruptions(self):
        """Speichert bekannte Störungen in eine JSON-Datei"""
        try:
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(self.known_disruptions, f, ensure_ascii=False, indent=2)
            self.logger.debug("💾 Störungen erfolgreich gespeichert")
        except Exception as e:
            self.logger.error(f"❌ Fehler beim Speichern der Störungen: {e}")
    
    def create_disruption_hash(self, title: str, description: str, transport_type: str) -> str:
        """Erstellt einen einzigartigen Hash für eine Störung"""
        content = f"{transport_type}:{title}:{description[:100]}"  # Nur erste 100 Zeichen für Hash
        return hashlib.md5(content.encode('utf-8')).hexdigest()
    
    def get_bvg_disruptions(self) -> List[Dict]:
        """Holt Störungen von der BVG Website"""
        disruptions = []
        try:
            self.logger.debug("🔍 Überprüfe BVG Störungen...")
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            
            response = requests.get(self.bvg_url, headers=headers, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Verschiedene Selektoren ausprobieren
            selectors = [
                '[class*="stoerung" i]',
                '[class*="disruption" i]', 
                '[class*="alert" i]',
                '[class*="notice" i]',
                '[class*="message" i]',
                '.content-item',
                '.news-item',
                'article'
            ]
            
            disruption_elements = []
            for selector in selectors:
                elements = soup.select(selector)
                if elements:
                    disruption_elements.extend(elements)
                    break
            
            for element in disruption_elements:
                title_elem = element.find(['h1', 'h2', 'h3', 'h4', 'h5', 'strong', '.title'])
                if title_elem:
                    title = title_elem.get_text().strip()
                    # Hole den gesamten Text des Elements
                    full_text = element.get_text().strip()
                    # Entferne den Titel aus der Beschreibung
                    description = full_text.replace(title, '').strip()
                    
                    # Filtere leere oder sehr kurze Meldungen und irrelevante Inhalte
                    if (len(title) > 10 and len(description) > 20 and 
                        not any(skip_word in title.lower() for skip_word in ['cookie', 'datenschutz', 'impressum', 'navigation'])):
                        
                        disruptions.append({
                            'title': title[:200],  # Titel begrenzen
                            'description': description[:400],  # Beschreibung begrenzen
                            'transport_type': 'BVG',
                            'timestamp': datetime.now().isoformat(),
                            'url': self.bvg_url
                        })
            
            self.logger.info(f"🚌 BVG Störungen gefunden: {len(disruptions)}")
            
        except Exception as e:
            self.logger.error(f"❌ Fehler beim Abrufen der BVG Störungen: {e}")
            
        return disruptions
    
    def get_sbahn_disruptions(self) -> List[Dict]:
        """Holt Störungen von der S-Bahn Website"""
        disruptions = []
        try:
            self.logger.debug("🔍 Überprüfe S-Bahn Störungen...")
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            
            response = requests.get(self.sbahn_url, headers=headers, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Verschiedene Selektoren für S-Bahn
            selectors = [
                '[class*="stoerung" i]',
                '[class*="disruption" i]',
                '[class*="baustelle" i]',
                '[class*="construction" i]',
                '[class*="alert" i]',
                '[class*="message" i]',
                '.content-item',
                '.news-item', 
                'article'
            ]
            
            disruption_elements = []
            for selector in selectors:
                elements = soup.select(selector)
                if elements:
                    disruption_elements.extend(elements)
                    break
            
            for element in disruption_elements:
                title_elem = element.find(['h1', 'h2', 'h3', 'h4', 'h5', 'strong', '.title'])
                if title_elem:
                    title = title_elem.get_text().strip()
                    full_text = element.get_text().strip()
                    description = full_text.replace(title, '').strip()
                    
                    # Filtere leere oder sehr kurze Meldungen und irrelevante Inhalte
                    if (len(title) > 10 and len(description) > 20 and 
                        not any(skip_word in title.lower() for skip_word in ['cookie', 'datenschutz', 'impressum', 'navigation'])):
                        
                        disruptions.append({
                            'title': title[:200],
                            'description': description[:400],
                            'transport_type': 'S-Bahn Berlin',
                            'timestamp': datetime.now().isoformat(),
                            'url': self.sbahn_url
                        })
            
            self.logger.info(f"🚊 S-Bahn Störungen gefunden: {len(disruptions)}")
            
        except Exception as e:
            self.logger.error(f"❌ Fehler beim Abrufen der S-Bahn Störungen: {e}")
            
        return disruptions
    
    def send_discord_notification(self, message: str, color: int = 0xff0000):
        """Sendet eine Benachrichtigung an Discord"""
        try:
            embed = {
                "title": "🚇 Berlin ÖPNV Störungsmelder",
                "description": message,
                "color": color,
                "timestamp": datetime.now().isoformat(),
                "footer": {
                    "text": "BVG & S-Bahn Störungsmelder • Made with ❤️"
                },
                "thumbnail": {
                    "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/BVG_logo.svg/200px-BVG_logo.svg.png"
                }
            }
            
            payload = {
                "embeds": [embed]
            }
            
            response = requests.post(self.discord_webhook_url, json=payload, timeout=10)
            response.raise_for_status()
            self.logger.info("✅ Discord Benachrichtigung erfolgreich gesendet")
            
        except Exception as e:
            self.logger.error(f"❌ Fehler beim Senden der Discord Nachricht: {e}")
    
    def process_disruptions(self, disruptions: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
        """
        Verarbeitet Störungen und identifiziert neue und behobene
        
        Returns:
            Tuple von (neue_störungen, behobene_störungen)
        """
        current_hashes = set()
        new_disruptions = []
        
        # Verarbeite aktuelle Störungen
        for disruption in disruptions:
            disruption_hash = self.create_disruption_hash(
                disruption['title'], 
                disruption['description'], 
                disruption['transport_type']
            )
            current_hashes.add(disruption_hash)
            
            # Prüfe ob das eine neue Störung ist
            if disruption_hash not in self.known_disruptions:
                new_disruptions.append(disruption)
                self.known_disruptions[disruption_hash] = disruption
                self.logger.debug(f"🆕 Neue Störung erkannt: {disruption['title'][:50]}...")
        
        # Finde behobene Störungen
        resolved_disruptions = []
        for known_hash, known_disruption in list(self.known_disruptions.items()):
            if known_hash not in current_hashes:
                resolved_disruptions.append(known_disruption)
                # Entferne behobene Störung aus bekannten Störungen
                del self.known_disruptions[known_hash]
                self.logger.debug(f"✅ Störung behoben: {known_disruption['title'][:50]}...")
        
        return new_disruptions, resolved_disruptions
    
    def check_disruptions(self):
        """Überprüft beide Websites auf Störungen und sendet Benachrichtigungen"""
        self.logger.info(f"🔄 Störungsüberprüfung gestartet: {datetime.now().strftime('%H:%M:%S')}")
        
        try:
            # Sammle alle Störungen
            all_disruptions = []
            all_disruptions.extend(self.get_bvg_disruptions())
            all_disruptions.extend(self.get_sbahn_disruptions())
            
            # Verarbeite Störungen
            new_disruptions, resolved_disruptions = self.process_disruptions(all_disruptions)
            
            # Sende Benachrichtigungen für neue Störungen
            for disruption in new_disruptions:
                message = f"**🚨 NEUE STÖRUNG - {disruption['transport_type']}**\n\n"
                message += f"**📍 Titel:** {disruption['title']}\n\n"
                message += f"**📝 Beschreibung:** {disruption['description']}\n\n"
                message += f"**🕐 Erkannt um:** {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}\n\n"
                message += f"**🔗 Quelle:** {disruption['url']}"
                
                self.send_discord_notification(message, color=0xff4444)  # Rot für neue Störungen
                time.sleep(2)  # Pause zwischen Nachrichten
            
            # Sende Benachrichtigungen für behobene Störungen
            for disruption in resolved_disruptions:
                message = f"**✅ STÖRUNG BEHOBEN - {disruption['transport_type']}**\n\n"
                message += f"**📍 Titel:** {disruption['title']}\n\n"
                message += f"**📝 Ursprüngliche Beschreibung:** {disruption['description']}\n\n"
                message += f"**🕐 Behoben um:** {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}"
                
                self.send_discord_notification(message, color=0x44ff44)  # Grün für behobene Störungen
                time.sleep(2)
            
            # Speichere aktuellen Zustand
            self.save_known_disruptions()
            
            # Status-Log
            total_current = len(all_disruptions)
            total_known = len(self.known_disruptions)
            
            self.logger.info(
                f"📊 Überprüfung abgeschlossen - "
                f"Aktuelle: {total_current}, "
                f"Bekannte: {total_known}, "
                f"Neue: {len(new_disruptions)}, "
                f"Behoben: {len(resolved_disruptions)}"
            )
            
        except Exception as e:
            self.logger.error(f"❌ Fehler bei Störungsüberprüfung: {e}")
    
    def run_continuous(self, check_interval: int = 300):
        """
        Läuft kontinuierlich und überprüft alle check_interval Sekunden
        
        Args:
            check_interval: Intervall in Sekunden zwischen Überprüfungen (Standard: 5 Minuten)
        """
        self.logger.info(f"🚀 Bot gestartet! Überprüfung alle {check_interval//60} Minuten")
        self.logger.info("💡 Drücke Ctrl+C zum Beenden")
        
        try:
            while True:
                self.check_disruptions()
                
                next_check = datetime.now()
                next_check = next_check.replace(second=0, microsecond=0)
                next_check = next_check.replace(minute=next_check.minute + (check_interval//60))
                
                self.logger.info(f"⏰ Nächste Überprüfung um: {next_check.strftime('%H:%M')} Uhr")
                time.sleep(check_interval)
                
        except KeyboardInterrupt:
            self.logger.info("🛑 Bot manuell gestoppt")
        except Exception as e:
            self.logger.error(f"💥 Unerwarteter Fehler: {e}")
            # Warte kurz und starte neu
            time.sleep(30)
            self.logger.info("🔄 Versuche Neustart...")
            self.run_continuous(check_interval)


def print_banner():
    """Zeigt einen schönen Banner beim Start"""
    banner = """
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║   🚇 BVG & S-BAHN DISCORD STÖRUNGSMELDER 🚇                 ║
    ║                                                              ║
    ║   📍 Überwacht: BVG & S-Bahn Berlin                        ║
    ║   📱 Benachrichtigt: Discord                                ║
    ║   🔄 Status: Ready to Monitor                               ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
    """
    print(banner)


def print_banner():
    """Zeigt einen schönen Banner beim Start"""
    banner = """
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║   🚇 BVG & S-BAHN DISCORD STÖRUNGSMELDER 🚇                 ║
    ║                                                              ║
    ║   📍 Überwacht: BVG & S-Bahn Berlin                        ║
    ║   📱 Benachrichtigt: Discord                                ║
    ║   ☁️  Läuft auf: Render.com                                 ║
    ║   🔄 Status: Ready to Monitor                               ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
    """
    print(banner)


def start_bot():
    """Startet den Bot in separatem Thread"""
    global bot_instance
    
    DISCORD_WEBHOOK_URL = os.getenv('DISCORD_WEBHOOK_URL')
    CHECK_INTERVAL = int(os.getenv('CHECK_INTERVAL', '300'))
    
    if not DISCORD_WEBHOOK_URL:
        print("❌ FEHLER: DISCORD_WEBHOOK_URL Environment Variable ist nicht gesetzt!")
        return None
    
    try:
        # Bot erstellen und starten
        bot_instance = TransportDisruptionBot(DISCORD_WEBHOOK_URL)
        
        # Einmalige Überprüfung für Test
        print("🧪 Führe initialen Testlauf durch...")
        bot_instance.check_disruptions()
        print("✅ Testlauf abgeschlossen!")
        
        # Kontinuierlicher Betrieb im Thread
        bot_thread = bot_instance.run_continuous(check_interval=CHECK_INTERVAL)
        return bot_thread
        
    except Exception as e:
        print(f"💥 Kritischer Fehler beim Starten des Bots: {e}")
        return None


def main():
    """Hauptfunktion - Render Entry Point"""
    print_banner()
    
    # Port für Render
    PORT = int(os.getenv('PORT', 10000))
    
    # Bot in separatem Thread starten
    bot_thread = start_bot()
    
    if bot_thread:
        print(f"🌐 Flask Server startet auf Port {PORT}")
        print("🔄 Bot läuft im Hintergrund")
        
        # Flask Server für Health Checks starten
        app.run(
            host='0.0.0.0',
            port=PORT,
            debug=False,
            threaded=True
        )
    else:
        print("❌ Bot konnte nicht gestartet werden!")
        # Starte trotzdem Flask für Health Checks
        app.run(host='0.0.0.0', port=PORT, debug=False)


if __name__ == "__main__":
    main()
