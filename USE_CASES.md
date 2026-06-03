# 🍳 Dein smarter Sous-Chef: Der Miele MCP-Server für KI-Agenten

Stell dir vor, du sitzt im Wohnzimmer oder bist unterwegs und chattest mit deiner bevorzugten KI (wie Claude). Du fragst dich, ob die Wäsche schon fertig ist oder was du mit den Resten im Kühlschrank kochen könntest – und die KI weiß nicht nur die Antwort, sondern schaut für dich direkt nach, schaltet den Ofen vor oder holt dir ein Live-Bild vom Braten!

Genau das ermöglicht dieser **Miele MCP-Server**. Er fungiert als unsichtbarer Dolmetscher zwischen deiner Künstlichen Intelligenz und deinen Miele-Hausgeräten.

---

## 🌟 Was kann die KI dank des Servers?

Wenn du den Server mit deiner KI verbindest (z. B. in Claude Desktop), erlernt die KI völlig neue "Fähigkeiten" (Tools). Sie kann dann in Echtzeit auf deine Miele-Geräte zugreifen. 

Hier sind ein paar greifbare Beispiele, was du deine KI fragen oder für dich erledigen lassen kannst:

### 1. 🔍 Geräte-Inventur & Statusabfragen
Die KI kann alle deine verbundenen Geräte auflisten und deren Zustand überprüfen.
* **Du fragst:** *"Claude, welche meiner Miele-Geräte laufen gerade?"*
* **Die KI tut:** Sie ruft das Tool `list_devices` auf, sieht z.B. dass der Backofen (H7860BP) und die Waschmaschine (WCR890) online sind. Dann nutzt sie `get_device_state`, um dir zu antworten: *"Die Waschmaschine läuft gerade im Programm 'Baumwolle' und ist in 24 Minuten fertig. Der Backofen ist im Standby."*

### 2. 📸 Live-Bilder aus dem Backofen (FoodView)
Hat dein Backofen eine integrierte Kamera? Die KI kann einen Blick riskieren!
* **Du fragst:** *"Schau mal in den Ofen. Ist die Kruste vom Braten schon knusprig genug?"*
* **Die KI tut:** Sie nutzt `get_device_camera`, lädt das aktuellste Bild aus dem Garraum herunter, analysiert das Bild direkt im Chat und antwortet: *"Der Braten sieht schon hervorragend aus! Die Kruste hat eine schöne goldbraune Farbe. Ich würde empfehlen, ihn in 10 Minuten herauszunehmen."*

### 3. 🎮 Fernsteuerung & Aktionen (Smart Home Magic)
Die KI kann (sofern du es erlaubst und das Gerät es unterstützt) Aktionen ausführen.
* **Du fragst:** *"Ich komme in 30 Minuten nach Hause. Kannst du den Backofen schon mal auf 200°C Ober-/Unterhitze vorheizen?"*
* **Die KI tut:** Sie nutzt `put_device_action`, um den Ofen einzuschalten und die Temperatur zu setzen. Sie bestätigt dir: *"Erledigt! Der Ofen heizt jetzt auf 200°C auf."*

### 4. 🍽️ KI-Rezeptplanung mit direkter Ausführung
Da die KI Zugriff auf die verfügbaren Programme deiner Geräte hat, wird sie zum ultimativen Küchenhelfer.
* **Du fragst:** *"Ich habe Lachs und Spargel. Wie bereite ich das am besten in meinem Miele-Dampfgarer zu?"*
* **Die KI tut:** Sie prüft mit `get_device_programs`, welche Gar-Programme dein spezifisches Modell unterstützt. Dann erstellt sie dir ein Rezept und fragt: *"Soll ich das Programm 'Dampfgaren' für 15 Minuten bei 85°C direkt an den Dampfgarer senden?"*

---

## 🛠️ Welche Tools stehen der KI genau zur Verfügung?

Technisch gesehen rüstet der Server deine KI mit folgenden Werkzeugen aus:

* `list_devices` - Findet alle Geräte und deren IDs (Waschmaschine, Ofen, Kaffeevollautomat etc.).
* `get_device_state` - Liest Temperaturen, Restlaufzeiten, Status (An/Aus/Tür offen) und Fehlercodes aus.
* `get_device_programs` - Zeigt der KI, welche Programme ein Gerät beherrscht (z.B. Espresso, Intensiv 75°C, Heißluft Plus).
* `get_device_actions` - Fragt ab, was man *jetzt gerade* mit dem Gerät tun darf (z.B. Starten, Stoppen, Licht anmachen).
* `put_device_action` - Sendet Befehle an das Gerät (Gerät einschalten, Programm starten, Licht steuern).
* `get_device_camera` - Holt hochauflösende Kamerabilder direkt aus dem Garraum (für kompatible Backöfen).
* `start_device_program` - Startet ein bestimmtes Gar- oder Waschprogramm direkt auf dem Gerät.
* `get_all_filling_levels` - Prüft die Füllstände aller kompatiblen Geräte auf einmal (z. B. Salz, Klarspüler, Waschmittel).
* `get_device_filling_levels` - Zeigt den genauen Füllstand der Betriebsmittel für ein bestimmtes Gerät.
* `get_failure_details` - Liefert detaillierte Informationen zu Fehlermeldungen des Geräts bei Störungen.

## 🔒 Sicherheit & Privatsphäre

* **OAuth-Autorisierung:** Der Server greift über die offizielle *Miele 3rd Party API* auf deine Geräte zu. Du loggst dich einmalig sicher über Miele ein.
* **Automatisches Token-Refreshing:** Der Server kümmert sich im Hintergrund unsichtbar darum, dass die Verbindung dauerhaft bestehen bleibt.
* **Lokale Kontrolle:** Der Server läuft auf deinem eigenen System (192.168.1.251) und gibt seine Daten nur an die von dir autorisierte KI weiter.

---

**Fazit:** Mit diesem Server machst du deine KI zum intelligenten Butler, der nicht nur Ratschläge gibt, sondern die Realität deines Zuhauses wahrnimmt und mit ihr interagiert!
