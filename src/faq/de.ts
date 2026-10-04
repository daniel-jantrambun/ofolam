import type { FaqDoc } from "./en";

export const faqDe: FaqDoc = {
  title: "Häufige Fragen",
  intro: "Wie Ofolam mit deinen Daten umgeht und wie du deine Bilder veröffentlichst.",
  back: "Zurück zur App",
  sections: [
    {
      heading: "Deine Daten",
      items: [
        {
          q: "Was speichert Ofolam über mich?",
          a: [
            "Deine Strava-Athleten-ID, deinen Vornamen und dein Land sowie die Tokens, die Strava uns zum Lesen deiner Aktivitäten gibt, verschlüsselt. Auch die Vorlagen, die du speicherst, werden aufbewahrt.",
            "Es gibt keine Analyse-Tools, keine Werbung und kein Tracking.",
          ],
        },
        {
          q: "Wie lange werden meine Daten aufbewahrt?",
          a: [
            "Solange du eine aktive Sitzung hast. Wenn du dich aus deiner letzten Sitzung abmeldest, werden dein Datensatz, deine Tokens und deine Vorlagen sofort gelöscht.",
            "Eine Sitzung, die 90 Tage lang nicht genutzt wurde, wird automatisch gelöscht, und mit ihr dein Datensatz, sobald keine Sitzung mehr übrig ist. Wenn du Ofolam den Zugriff bei Strava entziehst, wird dein Datensatz gelöscht, sobald die App das bemerkt.",
          ],
        },
        {
          q: "Werden meine Aktivitäten gespeichert?",
          a: [
            "Sie werden von Strava abgerufen, wenn du die App nutzt, und dann zwischengespeichert, um die Limits von Strava einzuhalten: 5 Minuten für die Liste, bis zu 24 Stunden für eine einzelne Aktivität. Dein Gerät behält ebenfalls eine Kopie, damit die App sofort startet.",
            "„Von Strava aktualisieren“ im Menü umgeht beide Zwischenspeicher.",
          ],
        },
        {
          q: "Werden meine Fotos und Videos irgendwo hochgeladen?",
          a: [
            "Nein. Das Bild wird in deinem Browser gezeichnet: Fotos und Videos verlassen dein Gerät nie.",
            "Nur der Hintergrund „Karte“ ruft einen externen Dienst auf (Stadia Maps). Er erhält den Bereich deiner Strecke und deine IP-Adresse, wie jede Online-Karte.",
          ],
        },
        {
          q: "Wie lösche ich alles?",
          a: [
            "Melde dich ab. Wenn es deine letzte Sitzung ist, wird alles auf einmal gelöscht. Du kannst den Zugriff auch in deinen Strava-Einstellungen (Meine Apps) entziehen oder an {email} schreiben.",
          ],
        },
      ],
    },
    {
      heading: "Veröffentlichen",
      items: [
        {
          q: "Wie poste ich in meine Instagram-Story?",
          a: [
            "Wähle das Format Story 9:16, tippe auf Teilen und dann auf Instagram. Am Computer lädst du das Bild herunter und schickst es an dein Handy.",
            "Aktiviere den sichtbaren Bereich bei Instagram, damit deine Texte nicht unter der Instagram-Oberfläche verschwinden.",
          ],
        },
        {
          q: "Wofür ist der Hintergrund „Sticker“ gedacht?",
          a: [
            "Er exportiert die Karte mit transparentem Hintergrund. Kopiere sie und füge sie im Story-Editor von Instagram über einem Foto oder Video ein. So behältst du die Werkzeuge von Instagram für das Foto darunter.",
          ],
        },
        {
          q: "Wie erstelle ich ein Karussell?",
          a: [
            "Wähle den Hintergrund „Bild“ und füge Bilder hinzu, bis zu 10: Fotos, eine Karte oder eine einfarbige helle oder dunkle Fläche. Dieselben Texte und dieselbe Strecke werden auf jedes gezeichnet. Ziehe die Miniaturen, um ihre Reihenfolge zu ändern.",
            "Mit den Pfeilen unter der Vorschau wechselst du von einem Bild zum nächsten und prüfst, ob die Texte überall gut lesbar sind. Jedes Bild behält seine eigenen Einstellungen (Ausschnitt bei einem Foto, Stil bei einer Karte, Farbe bei einer einfarbigen Fläche); Texte und Strecke bleiben auf allen an derselben Stelle. Verschiebst du ein Element, verschiebt es sich also überall.",
            "Danach sendet Teilen alle Bilder auf einmal, und Instagram bietet sie als einen einzigen Beitrag an. „Bilder herunterladen“ im Menü speichert sie alle, der Reihe nach nummeriert.",
          ],
        },
        {
          q: "Welches Format für welchen Zweck?",
          a: [
            "Story 9:16 für Storys und Reels. Beitrag 4:5 für den Instagram-Feed und Karussells. Quadrat 1:1 passt überall. Querformat 16:9 für X, Facebook oder einen Blog.",
          ],
        },
        {
          q: "Kann ich ein Video veröffentlichen?",
          a: [
            "Ja. Wähle den Hintergrund „Video“, suche einen Ausschnitt von höchstens 60 Sekunden aus und tippe auf Video erstellen. Das Video wird auf deinem Gerät kodiert; danach kannst du es teilen oder herunterladen.",
          ],
        },
        {
          q: "Kann ich verbergen, wo ich wohne?",
          a: [
            "Ja. Wähle die Strecke aus und nutze „Start und Ziel ausblenden“: Die gewählte Distanz wird an beiden Enden der Strecke entfernt.",
          ],
        },
      ],
    },
    {
      heading: "Die App",
      items: [
        {
          q: "Wie installiere ich Ofolam auf meinem Handy?",
          a: [
            "Ofolam wird direkt aus dem Browser installiert, ohne App-Store: Nutze „App installieren“ im Menü. Auf dem iPhone öffnest du die Seite in Safari, tippst auf Teilen und dann auf „Zum Home-Bildschirm“.",
          ],
        },
        {
          q: "Eine neue Aktivität wird nicht angezeigt. Was kann ich tun?",
          a: [
            "Die Liste wird 5 Minuten zwischengespeichert. „Von Strava aktualisieren“ im Menü lädt sie sofort neu.",
          ],
        },
        {
          q: "Was sind Vorlagen?",
          a: [
            "Eine Vorlage ist ein Layout: welche Elemente zu sehen sind, wo und in welchem Stil. Sie ändert nie deinen Hintergrund oder dein Format.",
            "Mit „Aktuelles Layout als Vorlage speichern“ kannst du bis zu 20 eigene Vorlagen speichern.",
          ],
        },
        {
          q: "Ist Ofolam kostenlos?",
          coffee: "Wenn es dir gefällt, kannst du das Projekt unterstützen:",
          a: [
            "Ja, kostenlos und ohne Werbung. Es ist ein unabhängiges Projekt und steht in keiner Verbindung zu Strava.",
          ],
        },
      ],
    },
  ],
};
