/**
 * FAQ content. `{email}` is replaced at render time with VITE_CONTACT_EMAIL.
 * Answers are plain paragraphs, no HTML. Keep the facts in sync with the privacy policy.
 */
export type FaqItem = {
  q: string;
  a: string[];
  /** Extra sentence leading to the "Buy me a coffee" link, shown only when VITE_COFFEE_URL is set. */
  coffee?: string;
};
export type FaqSection = { heading: string; items: FaqItem[] };
export type FaqDoc = { title: string; intro: string; back: string; sections: FaqSection[] };

export const faqEn: FaqDoc = {
  title: "Frequently asked questions",
  intro: "How Ofolam handles your data, and how to publish what you make with it.",
  back: "Back to the app",
  sections: [
    {
      heading: "Your data",
      items: [
        {
          q: "What does Ofolam store about me?",
          a: [
            "Your Strava athlete id, first name and country, and the tokens Strava gives us to read your activities, encrypted. The templates you save are stored too.",
            "There is no analytics, no advertising and no tracking.",
          ],
        },
        {
          q: "How long is my data kept?",
          a: [
            "As long as you have an active session. Signing out of your last session immediately deletes your record, your tokens and your templates.",
            "A session left unused for 90 days is deleted automatically, and your record goes with it once no session remains. If you revoke Ofolam's access on Strava, your record is deleted the next time the app notices it.",
          ],
        },
        {
          q: "Are my activities stored?",
          a: [
            "They are fetched from Strava when you use the app, then cached to stay within Strava's limits: 5 minutes for the list, up to 24 hours for an activity. Your device also keeps a copy so the app opens instantly.",
            '"Refresh from Strava" in the menu skips both caches.',
          ],
        },
        {
          q: "Are my photos and videos uploaded?",
          a: [
            "No. The picture is drawn in your browser: photos and videos never leave your device.",
            "Only the map background calls an outside service (Stadia Maps), which receives the area of your route and your IP address, like any online map.",
          ],
        },
        {
          q: "How do I delete everything?",
          a: [
            "Sign out. When it is your last session, everything is deleted at once. You can also revoke access from your Strava settings (My Apps), or write to {email}.",
          ],
        },
      ],
    },
    {
      heading: "Publishing",
      items: [
        {
          q: "How do I post to my Instagram story?",
          a: [
            "Pick the Story 9:16 format, tap Share and choose Instagram. On a computer, download the image and send it to your phone.",
            "Turn on the Instagram safe zone to keep your texts clear of Instagram's own interface.",
          ],
        },
        {
          q: "What is the Sticker background for?",
          a: [
            "It exports the card with a transparent background. Copy it, then paste it over a photo or a video in Instagram's story editor. You keep Instagram's own tools for the photo underneath.",
          ],
        },
        {
          q: "How do I make a carousel?",
          a: [
            "Choose the Image background, then add images, up to 10: photos, a map, or a plain light or dark color. The same texts and route are drawn on each one. Drag the thumbnails to change their order.",
            "Use the arrows under the preview to go through them and check how the texts read on each one. Every image keeps its own settings (framing for a photo, style for a map, color for a plain one); texts and route keep the same place on all of them, so moving an element moves it everywhere.",
            'Share then sends all the images at once, and Instagram offers them as a single post. "Download images" in the menu saves them all, numbered in order.',
          ],
        },
        {
          q: "Which format for which use?",
          a: [
            "Story 9:16 for stories and reels. Post 4:5 for the Instagram feed and carousels. Square 1:1 works everywhere. Landscape 16:9 for X, Facebook or a blog.",
          ],
        },
        {
          q: "Can I publish a video?",
          a: [
            "Yes. Choose the Video background, pick a clip of up to 60 seconds, then tap Create video. The video is encoded on your device; you can then share or download it.",
          ],
        },
        {
          q: "Can I hide where I live?",
          a: [
            'Yes. Select the route, then use "Hide start and end": the distance you choose is removed at both ends of the route.',
          ],
        },
      ],
    },
    {
      heading: "The app",
      items: [
        {
          q: "How do I install Ofolam on my phone?",
          a: [
            'Ofolam installs from the browser, without a store: use "Install the app" in the menu. On iPhone, open the site in Safari, tap Share, then "Add to Home Screen".',
          ],
        },
        {
          q: "A new activity does not show up. What can I do?",
          a: ['The list is cached for 5 minutes. "Refresh from Strava" in the menu reloads it right away.'],
        },
        {
          q: "What are templates?",
          a: [
            "A template is a layout: which elements are shown, where, and in which style. It never changes your background or your format.",
            'You can save up to 20 templates of your own with "Save the current look as a template".',
          ],
        },
        {
          q: "I spotted a mistake in a translation. What can I do?",
          a: [
            "Thank you for telling us! Send an email to {email} with the wrong text and the language, and we will fix it.",
            "If you feel brave, you can fix it yourself: the texts live in the src/i18n and src/faq folders of the project on GitHub (daniel-jantrambun/ofolam). Open a pull request and we will merge it.",
          ],
        },
        {
          q: "I would like a new feature or another stat. What can I do?",
          a: [
            "Send an email to {email} describing what you would like (a stat, a layout, a format…) and how you would use it. Every request is read, and the most useful ones make it into the app.",
            "If you feel brave, you can build it yourself: the code is open source on GitHub (daniel-jantrambun/ofolam). Open a pull request and we will review it.",
          ],
        },
        {
          q: "Is Ofolam free?",
          coffee: "If you like it, you can support the project:",
          a: ["Yes, free and without ads. It is an independent project, not affiliated with Strava."],
        },
      ],
    },
  ],
};
