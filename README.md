# hopecore notes

An offline speaker-notes viewer for the iPhone, for the 83-slide **hopecore** keynote. It only shows notes. It does not connect to or control the presentation.

- `docs/` is the app that goes on GitHub Pages: `index.html`, `app.css`, `app.js`, the generated `slides.js`, `sw.js`, `thumbs/` and `icons/`.
- `build/` holds the build: `build.py` drives it, `pdf.swift` renders the thumbnails, `icon.swift` draws the app icon, and `sw.template.js` is the service-worker template.
- `source/` holds the deck inputs and is not committed: `deck.json` and `slides/*.html` from the hopecore Slides artifact, and `hopecore.pdf`.

## Where the content comes from

- **Notes:** copied character for character from the `<aside>` on each slide of the hopecore Slides artifact. They are never rewritten.
- **Thumbnails:** one per page, rendered from the exported PDF.
- **Check:** the build compares the visible text of every artifact slide with the PDF page of the same number. It stops if the slide count or any slide's text differs, so notes can't drift onto the wrong slide.

## Install on your iPhone (do this once, on Wi-Fi)

1. Open the GitHub Pages URL in **Safari**. It has to be Safari: other browsers can't install it.
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Open **Notes** from the Home Screen. Wait about 10 seconds while it saves everything (about 10 MB).
4. Tap **Aa**. At the bottom you should see **"Ready offline ✓ 83/83 slides and notes saved on this phone. Built …"**. If it still says "Saving…", close Settings and open it again after a few seconds.

## Test it offline before the talk

1. Turn on **Airplane Mode** and turn Wi-Fi off.
2. Swipe the Notes app away in the app switcher to fully close it.
3. Open it again from the Home Screen. It should reopen on the slide you were last on.
4. Tap ▦ and scroll the whole overview. All 83 thumbnails should be there.
5. Tap the slide number, type `83`, and tap **Go**. Check the last slide.

## On stage

- **Next** (big, right) and **‹ Prev** (left) are the only ways to change slides. Swipes never change slides, and a second tap within about a third of a second is ignored, so a double tap can't skip a slide. If your finger moves while pressing, it counts as a scroll, not a tap.
- **Scroll the notes** freely: only the notes area moves.
- **Lost your place?** Tap ▦ for the overview, which opens centred on your current slide with section headings. Or tap the big slide number and type the slide you need. The −10, −1, +1 and +10 buttons adjust the number, and a preview shows the slide before you tap **Go**.
- **Aa** opens Settings: text size (18–34), theme (Dark, Light or Auto), slide preview (Large, or "+ Next" to show the next slide beside the current one), and keep screen on.
- **Keep screen on** uses the iOS Wake Lock, which needs iOS 18.4 or later. As a backup, set **Settings › Display & Brightness › Auto-Lock › Never** for the talk.
- Your slide, text size and theme are saved after every change, so the app reopens where you left off.

## Updating after you edit the deck

1. Export a new PDF and save it to `~/Downloads/Hopecore decks/PDF/hopecore.pdf`.
2. Ask Claude to re-download the artifact's `project/deck.json` and `project/slides/*.html` into `source/` and copy the PDF into `source/`. Or do it yourself.
3. Run:

   ```bash
   python3 build/build.py
   ```

4. Commit and push `docs/`. On the phone, open the app once while online, then close and reopen it. Settings will show the new "Built …" time.

## Testing locally

```bash
python3 -m http.server 8765 --directory docs
```

Open http://localhost:8765. The left and right arrow keys also change slides on a desktop.
