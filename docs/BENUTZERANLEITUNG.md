# Carwash CRM — Vollständige Benutzeranleitung

Diese Anleitung beschreibt Schritt für Schritt, was **Kunden**, **Mitarbeiter** und **Inhaber** in der Anwendung tun und wo sie was anklicken.

---

## Inhaltsverzeichnis

1. [Überblick: Wer nutzt was?](#1-überblick-wer-nutzt-was)
2. [Kunde: Online-Termin buchen](#2-kunde-online-termin-buchen)
3. [Kunde: Termin stornieren](#3-kunde-termin-stornieren)
4. [Mitarbeiter: Anmeldung und Kalender](#4-mitarbeiter-anmeldung-und-kalender)
5. [Mitarbeiter: Termin als erledigt / stornieren](#5-mitarbeiter-termin-als-erledigt--stornieren)
6. [Mitarbeiter: Walk-In-Termin anlegen](#6-mitarbeiter-walk-in-termin-anlegen)
7. [Mitarbeiter: Arbeitszeit](#7-mitarbeiter-arbeitszeit)
8. [Inhaber: Anmeldung und Menü](#8-inhaber-anmeldung-und-menü)
9. [Inhaber: Dashboard](#9-inhaber-dashboard)
10. [Inhaber: Services](#10-inhaber-services)
11. [Inhaber: Mitarbeiter](#11-inhaber-mitarbeiter)
12. [Inhaber: Termine](#12-inhaber-termine)
13. [Inhaber: Kunden](#13-inhaber-kunden)
14. [Inhaber: Einstellungen](#14-inhaber-einstellungen)
15. [Passwort ändern (Inhaber)](#15-passwort-ändern-inhaber)
16. [Abmelden](#16-abmelden)

---

## 1. Überblick: Wer nutzt was?

| Rolle        | URL (Beispiel)        | Anmeldung        | Was kann die Person? |
|-------------|------------------------|------------------|-----------------------|
| **Kunde**   | Startseite der Website | Keine            | Termin buchen, per Link stornieren |
| **Mitarbeiter** | `/worker` bzw. nach Login | Benutzername + Passwort (vom Inhaber angelegt) | Kalender sehen, „Erledigt“/„Stornieren“, Walk-In anlegen, Arbeitszeit erfassen |
| **Inhaber** | `/owner` bzw. nach Login | **owner** + Passwort (beim ersten Start aus Umgebungsvariable) | Alles: Dashboard, Services, Mitarbeiter, Termine, Kunden, Einstellungen, Passwort ändern |

- **Kunden** öffnen die öffentliche Startseite (z. B. `https://ihre-domain.de/`).
- **Mitarbeiter** und **Inhaber** gehen zu **Login** (z. B. `https://ihre-domain.de/login`), geben Benutzername und Passwort ein und werden automatisch in ihre jeweilige Ansicht weitergeleitet.

---

## 2. Kunde: Online-Termin buchen

**Wo:** Startseite der Carwash-Website (ohne Anmeldung).

**Ablauf:**

1. **Schritt 1 — Service wählen**  
   - Liste der angebotenen Services (z. B. CAR SPA®, CAR SOFT, …) mit Preis und Dauer.  
   - **Aktion:** Einen Service anklicken, dann auf **Weiter** (oder den nächsten Schritt) klicken.

2. **Schritt 2 — Datum wählen**  
   - Kalender bzw. Datumsauswahl.  
   - **Aktion:** Ein **zukünftiges** Datum wählen (vergangene Tage sind nicht buchbar).  
   - **Weiter** klicken.

3. **Schritt 3 — Uhrzeit wählen**  
   - Es werden nur **verfügbare Zeitslots** angezeigt:  
     - An diesem Tag nur Zeiten **nach der aktuellen Uhrzeit** (z. B. wenn es 12:00 ist, erscheinen keine Slots vor 12:00).  
     - Bereits gebuchte Slots erscheinen nicht.  
   - **Aktion:** Einen angezeigten Slot anklicken (z. B. 14:00), dann **Weiter**.

4. **Schritt 4 — Kontaktdaten**  
   - Felder: **Name**, **Telefon**, **E-Mail** (alle Pflichtfelder).  
   - Optional: Checkbox  
     *„Ich möchte Informationen zu Aktionen und Angeboten per E-Mail erhalten. Ich kann meine Einwilligung jederzeit widerrufen.“*  
     - Nicht ankreuzen = keine Werbung; Ankreuzen = Einwilligung für Marketing-E-Mails (DSGVO-konform).  
   - **Aktion:** Alles ausfüllen, ggf. Checkbox setzen, dann **Weiter zur Bestätigung**.

5. **Schritt 5 — Bestätigung**  
   - Zusammenfassung: Service, Datum, Uhrzeit, Kontaktdaten.  
   - **Aktion:** Auf **Termin buchen** (oder **Bestätigen**) klicken.

6. **Ergebnis**  
   - Weiterleitung auf eine **Erfolgsseite** mit Bestätigung.  
   - An die angegebene E-Mail-Adresse wird eine **Bestätigungs-E-Mail** geschickt (wenn E-Mail im System konfiguriert ist).  
   - In der E-Mail steht ein Link **„Termin stornieren“** — siehe Abschnitt 3.

**Hinweis:** Buchen ist auch ohne Marketing-Einwilligung möglich. Die Einwilligung ist freiwillig.

---

## 3. Kunde: Termin stornieren

**Wo:** Nur über den Link in der **Bestätigungs-E-Mail**.

**Ablauf:**

1. E-Mail nach der Buchung öffnen.
2. Auf den Link **„Termin stornieren“** (oder ähnlich) klicken.  
   - Der Link führt z. B. zu: `https://ihre-domain.de/cancel/XXXXX` (XXXXX = Token).
3. Die Seite bestätigt die **Stornierung** („Termin storniert“ o. Ä.).
4. Optional: Eine Storno-E-Mail wird an die hinterlegte Adresse geschickt.

Es gibt **keine** Stornierung über die öffentliche Buchungsseite ohne diesen Link — nur mit dem persönlichen Link aus der E-Mail.

---

## 4. Mitarbeiter: Anmeldung und Kalender

**URL:** Zuerst zur **Login-Seite** gehen (z. B. `https://ihre-domain.de/login`).

**Anmeldung:**

1. **Benutzername** eingeben (vom Inhaber angelegt, z. B. `max`).
2. **Passwort** eingeben (vom Inhaber mitgeteilt).
3. Auf **Anmelden** (oder **Login**) klicken.

Nach erfolgreicher Anmeldung erscheint die **Mitarbeiter-Ansicht** mit:

- **Seitenleiste (links):**
  - **Kalender** — führt zur Wochenübersicht der Termine.
  - **Arbeitszeit** — Erfassen von Arbeitsbeginn/-ende und Liste der Zeiten.
- **Abmelden** unten in der Seitenleiste.

**Kalender (Hauptansicht):**

- Oben: **Pfeile (← / →)** für vorherige/nächste Woche, **Heute** springt zur aktuellen Woche.
- Für jeden Wochentag werden **Termine** in Blöcken angezeigt:
  - **Geplant** — noch nicht erledigte Buchungen (mit Buttons „Erledigt“ und „Stornieren“).
  - **Erledigt** — bereits abgeschlossene Termine (nur Anzeige).
- Darunter: Bereich **„Termin anlegen“** (Walk-In) — siehe Abschnitt 6.

---

## 5. Mitarbeiter: Termin als erledigt / stornieren

**Wo:** In der **Kalender-Ansicht** („Kalender“ in der linken Menüleiste), unter dem jeweiligen Tag bei den **geplanten** Terminen.

**Termin als erledigt markieren:**

1. Beim gewünschten Termin im Block **„Geplant“** auf **Erledigt** klicken.
2. Bestätigungsdialog: **„Termin als erledigt markieren?“** → **OK** (oder Bestätigen).
3. Der Termin wechselt in den Block **„Erledigt“** und kann dort nicht mehr geändert werden.

Es öffnet sich **kein** zusätzliches Formular und **keine** Zahlungsmaske — nur diese eine Schaltfläche.

**Termin stornieren:**

1. Beim Termin (in „Geplant“) auf **Stornieren** klicken.
2. Bestätigung: **„Termin wirklich stornieren?“** → **OK**.
3. Der Termin gilt als storniert und erscheint nicht mehr als buchbarer Slot.

---

## 6. Mitarbeiter: Walk-In-Termin anlegen

**Wo:** In der **Kalender-Ansicht** unten im Bereich **„Termin anlegen“**.

**Variante A — Slot im Kalender wählen:**

1. **Datum** oben im Datumsfeld ggf. anpassen.
2. **Service** im Dropdown wählen (z. B. „CAR SPA® · 30 Min“).
3. Einen **Zeitslot** in der angezeigten Slot-Liste anklicken.  
   - Es öffnet sich ein **Modal** „Manuellen Termin anlegen“.
4. **Kundenname** eintragen (z. B. „Walk-In Kunde“ oder echter Name).
5. Auf **Anlegen** klicken.  
   - Der Termin erscheint im Kalender am gewählten Tag.

**Variante B — Datum/Uhrzeit von Hand eingeben:**

1. Auf **„Datum/Uhrzeit eingeben (ohne Kalender)“** klicken.
2. Im Modal:
   - **Datum** (TT.MM.JJJJ) wählen.
   - **Uhrzeit** (HH:mm) eingeben.
   - **Service** auswählen.
   - **Kundenname** eintragen.
3. **Anlegen** klicken.

Die so angelegten Termine haben die **Quelle „Mitarbeiter“** (Walk-In) und erscheinen wie Online-Buchungen im Kalender; sie können ebenfalls mit **Erledigt** oder **Stornieren** bearbeitet werden.

---

## 7. Mitarbeiter: Arbeitszeit

**Wo:** In der linken Menüleiste auf **Arbeitszeit** klicken.

**Funktionen:**

- **Arbeitsbeginn:** Button **„Arbeitsbeginn“** (oder ähnlich) klicken → Start der Schicht wird erfasst.
- **Arbeitsende:** Button **„Arbeitsende“** klicken → Ende der Schicht wird erfasst (ggf. Pausenminuten angeben, wenn angeboten).
- **Liste:** Tabelle mit erfassten Einträgen (Datum, Start, Ende, Pause, Stunden).  
  - **Monat wechseln:** Pfeile „←“ / „→“ für Vormonat/Nachmonat.

Nur der **eingeloggte Mitarbeiter** sieht seine eigenen Arbeitszeiten. Eine nachträgliche Bearbeitung der Einträge ist in der Standardversion nicht vorgesehen.

---

## 8. Inhaber: Anmeldung und Menü

**URL:** Zuerst **Login** (z. B. `https://ihre-domain.de/login`).

**Anmeldung:**

1. **Benutzername:** `owner` (fest vorgegeben).
2. **Passwort:** Das beim **ersten Einrichten** der Anwendung gesetzte Passwort (z. B. aus der Umgebungsvariable `OWNER_INITIAL_PASSWORD` oder vom Administrator mitgeteilt).
3. **Anmelden** klicken.

Nach dem Login erscheint die **Inhaber-Ansicht** mit der **linken Menüleiste**:

| Menüpunkt   | Bedeutung |
|------------|-----------|
| **Dashboard**   | Übersicht: Umsatz, erledigte Termine, Kennzahlen, Grafiken. |
| **Services**    | Dienstleistungen anlegen, bearbeiten, löschen. |
| **Mitarbeiter** | Mitarbeiter-Konten anlegen, bearbeiten, löschen. |
| **Termine**     | Alle Buchungen im Wochenkalender, Stornieren. |
| **Kunden**      | Kundenliste (gruppiert nach E-Mail), Marketing-Filter, CSV-Export. |
| **Einstellungen** | Öffnungszeiten, Arbeitstage, **Passwort ändern**. |

Unten in der Leiste: **Abmelden**.

**Hinweis:** Der Menüpunkt „Arbeitszeit“ existiert für den Inhaber **nicht** — nur für Mitarbeiter.

---

## 9. Inhaber: Dashboard

**Wo:** Nach dem Login standardmäßig, oder über **Dashboard** in der linken Leiste.

**Inhalt:**

- **Karten mit Kennzahlen**, z. B.:
  - Umsatz heute
  - Umsatz diesen Monat
  - Ø Einnahmen pro Termin
  - Erledigte Termine (Anzahl)
  - Alle Termine (gesamt)
  - Stornoquote (in %)
- **Grafiken:**
  - Umsatz nach Mitarbeiter (Balken)
  - Umsatz nach Quelle (Website, Mitarbeiter, Telefon) (Kreisdiagramm)
- **Beliebtester Service** — meist gebuchter Service.

Alle Werte beziehen sich auf **abgeschlossene** Buchungen (Status „erledigt“). Es sind keine weiteren Aktionen nötig — reine Übersicht.

---

## 10. Inhaber: Services

**Wo:** **Services** in der linken Menüleiste.

**Anzeige:** Tabelle mit allen Services (Name, Preis, Dauer, Beschreibung).

**Neuen Service anlegen:**

1. Auf **„+ Service erstellen“** (oder ähnlich) klicken.
2. Im Modal/dialog:
   - **Name** (z. B. „CAR SPA®“)
   - **Preis** (in Euro, z. B. 24)
   - **Dauer** in Minuten (z. B. 30)
   - **Beschreibung** (optional)
3. **Erstellen** / **Speichern** klicken.

**Service bearbeiten:**

- Beim jeweiligen Service auf **Bearbeiten** (oder Stift-Icon) klicken.
- Felder anpassen und speichern.

**Service löschen:**

- Auf **Löschen** klicken und im Dialog bestätigen.

Diese Services erscheinen auf der **öffentlichen Buchungsseite** und bei der **Mitarbeiter-Walk-In-Buchung**.

---

## 11. Inhaber: Mitarbeiter

**Wo:** **Mitarbeiter** in der linken Menüleiste.

**Anzeige:** Liste der Mitarbeiter (Benutzername, ggf. weitere Felder).

**Mitarbeiter anlegen:**

1. **„Mitarbeiter erstellen“** (oder „+ Mitarbeiter“) klicken.
2. **Benutzername** eingeben (z. B. `max`).
3. **Passwort** vergeben (mind. 6 Zeichen) und dem Mitarbeiter **sicher mitteilen**.
4. Speichern.  
   - Der neue Mitarbeiter kann sich ab sofort unter **Login** mit diesem Benutzernamen und Passwort anmelden und sieht die **Mitarbeiter-Ansicht** (Kalender, Arbeitszeit).

**Mitarbeiter bearbeiten:**

- Beim Eintrag **Bearbeiten** klicken → Benutzername und/oder Passwort ändern → speichern.

**Mitarbeiter löschen:**

- **Löschen** klicken und bestätigen. Der Mitarbeiter kann sich danach nicht mehr anmelden.

---

## 12. Inhaber: Termine

**Wo:** **Termine** in der linken Menüleiste.

**Inhalt:**

- **Wochenkalender:** Oben **←** / **→** für Vorwoche/Nachwoche, **Heute** für aktuelle Woche.
- **Filter „Mitarbeiter“:** Dropdown „Alle“ oder einen bestimmten Mitarbeiter wählen → nur dessen Buchungen anzeigen (wenn die Buchung einem Mitarbeiter zugeordnet ist).
- **Pro Tag:** Karten mit allen **nicht stornierten** Terminen:
  - Uhrzeit, Kundenname, Service, Telefon/E-Mail
  - Button **Stornieren**

**Stornieren (Inhaber):**

- Beim Termin auf **Stornieren** klicken und im Dialog bestätigen. Der Termin wird storniert; bei hinterlegter E-Mail und konfigurierter Mail kann eine Storno-E-Mail versendet werden.

---

## 13. Inhaber: Kunden

**Wo:** **Kunden** in der linken Menüleiste.

**Anzeige:** Tabelle mit Kunden (gruppiert nach E-Mail):

- Name (letzter genutzter Name)
- E-Mail
- Telefon (letzte Angabe)
- Termine (Anzahl)
- Marketing (Ja/Nein — ob mindestens eine Buchung mit Marketing-Einwilligung)
- Letzter Termin (Datum)

**Filter:**

- **„Nur mit Marketing-Zustimmung“** (Checkbox): Wenn aktiviert, werden nur Kunden angezeigt, die bei mindestens einer Buchung die Marketing-Checkbox angekreuzt haben.

**CSV-Export:**

1. Auf **Export CSV** klicken.
2. Es wird eine Datei **marketing_contacts.csv** heruntergeladen.
3. Inhalt: Nur Kunden **mit** Marketing-Einwilligung, Spalten **name** und **email** (z. B. für Newsletter-Versand in einem anderen Tool).

Die CRM-Anwendung **versendet keine Newsletter** selbst — sie speichert nur die Einwilligung und stellt die Liste zum Export bereit.

---

## 14. Inhaber: Einstellungen

**Wo:** **Einstellungen** in der linken Menüleiste.

**Bereich „Öffnungszeiten“:**

- **Arbeitsbeginn** — Uhrzeit (z. B. 07:30), ab der Slots auf der Buchungsseite und im Kalender möglich sind.
- **Arbeitsende** — Uhrzeit (z. B. 18:00), bis zu der Slots angeboten werden.
- **Arbeitstage** — Checkboxen Mo–So; angehakt = Tag ist buchbar.
- **Speichern** klicken → Einstellungen werden übernommen.

Diese Werte steuern, **welche Wochentage und welche Uhrzeiten** Kunden und Mitarbeiter bei der Buchung sehen.

**Bereich „Passwort ändern“:** Siehe Abschnitt 15.

---

## 15. Passwort ändern (Inhaber)

**Wo:** **Einstellungen** → ganz unten im Block **„Passwort ändern“**.

**Schritte:**

1. **Aktuelles Passwort** eingeben (das Passwort, mit dem Sie gerade angemeldet sind).
2. **Neues Passwort** eingeben (mindestens 6 Zeichen).
3. **Neues Passwort bestätigen** — exakt dasselbe noch einmal eingeben.
4. Auf **Passwort ändern** klicken.

Bei Erfolg erscheint eine Meldung (z. B. „Passwort geändert.“). Bei falschem aktuellem Passwort oder zu kurzem neuen Passwort erscheint eine Fehlermeldung.

**Empfehlung:** Nach dem **ersten Login** (mit dem vom System/Administrator gesetzten Startpasswort) das Passwort hier ändern und sicher aufbewahren.

**Hinweis:** Mitarbeiter-Passwörter werden unter **Mitarbeiter** → Bearbeiten des jeweiligen Mitarbeiters geändert, nicht in den Einstellungen.

---

## 16. Abmelden

**Wo:** In der **linken Seitenleiste** unten: Button **Abmelden**.

**Aktion:** Einmal klicken → Sie werden ausgeloggt und zur **Login-Seite** weitergeleitet. Der nächste Zugriff erfordert wieder Benutzername und Passwort.

---

## Kurz-Übersicht: Wichtige Wege

| Ziel | Wo klicken / was tun |
|------|----------------------|
| **Kunde: Termin buchen** | Startseite → Service → Datum → Uhrzeit → Kontaktdaten → Bestätigen. |
| **Kunde: Stornieren** | Link „Termin stornieren“ in der Bestätigungs-E-Mail. |
| **Mitarbeiter: einloggen** | Login → Benutzername + Passwort (vom Inhaber) → Anmelden. |
| **Mitarbeiter: Termin erledigt** | Kalender → beim Termin **Erledigt** → bestätigen. |
| **Mitarbeiter: Stornieren** | Kalender → beim Termin **Stornieren** → bestätigen. |
| **Mitarbeiter: Walk-In** | Kalender → unten „Termin anlegen“ → Slot oder Datum/Zeit + Name → Anlegen. |
| **Mitarbeiter: Arbeitszeit** | Menü **Arbeitszeit** → Arbeitsbeginn / Arbeitsende; Liste ggf. bearbeiten. |
| **Inhaber: einloggen** | Login → **owner** + Passwort → Anmelden. |
| **Inhaber: Passwort ändern** | Einstellungen → Block „Passwort ändern“ → aktuell, neu, bestätigen → Passwort ändern. |
| **Inhaber: Öffnungszeiten** | Einstellungen → Arbeitsbeginn/Ende, Arbeitstage → Speichern. |
| **Inhaber: Kunden-Liste CSV** | Kunden → optional „Nur mit Marketing-Zustimmung“ → **Export CSV**. |
| **Abmelden** | Seitenleiste unten → **Abmelden**. |

---

*Stand: Anleitung basiert auf der aktuellen Carwash-CRM-Oberfläche. Bei Abweichungen in Ihrer Installation (z. B. andere URLs oder Bezeichnungen) die konkreten Menüpunkte und Buttons vor Ort verwenden.*
