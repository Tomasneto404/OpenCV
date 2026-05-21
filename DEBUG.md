# Debugging CVeaver

Practical guide for poking at the app when something looks wrong.

## Running locally

```bash
# Node 22 (via nvm)
source ~/.nvm/nvm.sh && nvm use 22

# One-shot install of all workspaces
npm run install:all

# Start both client (:5173) and server (:3001), with auto-reload
npm run dev
```

## Client-side debug logs

Off by default. To enable in DevTools:

```js
localStorage.setItem('cveaver:debug', '1')
location.reload()
```

To turn off:

```js
localStorage.removeItem('cveaver:debug')
```

The logger lives in `client/src/utils/log.ts` — `debugLogger(tag)` returns
`log/warn/error`. Errors always emit; `log`/`warn` only when the flag is on.

## Server logs

`server/index.js` already logs key events tagged like `[support]`, `[sign]`.
The data directory (`server/data/`) holds:

- `cvs.json` — submitted CVs awaiting Stripe confirmation
- `complaints.json` — incoming support complaints

Both are plain JSON; safe to `cat`.

## Inspect a generated PDF

The CV JSON is stored as a PDF attachment named `cveaver.json` inside the file.
Quick extract from the command line:

```bash
# macOS / Linux: read attachments via pdf-lib in node
node -e "
const fs = require('node:fs');
import('pdf-lib').then(async ({ PDFDocument, PDFDict, PDFName, PDFArray, PDFHexString, PDFString, PDFRawStream, decodePDFRawStream }) => {
  const bytes = fs.readFileSync(process.argv[1]);
  const doc = await PDFDocument.load(bytes);
  const names = doc.catalog.lookup(PDFName.of('Names'), PDFDict);
  const ef = names.lookup(PDFName.of('EmbeddedFiles'), PDFDict);
  const arr = ef.lookup(PDFName.of('Names'), PDFArray);
  for (let i = 0; i < arr.size(); i += 2) {
    const name = arr.get(i);
    const str = name instanceof PDFHexString ? name.decodeText() : name instanceof PDFString ? name.decodeText() : String(name);
    if (str !== 'cveaver.json') continue;
    const spec = arr.lookup(i + 1, PDFDict);
    const efd = spec.lookup(PDFName.of('EF'), PDFDict);
    const ref = efd.get(PDFName.of('F'));
    const stream = ref instanceof PDFRawStream ? ref : efd.context.lookup(ref);
    console.log(new TextDecoder().decode(decodePDFRawStream(stream).decode()));
  }
});
" path/to/cv.pdf | jq .
```

In Adobe Reader / Preview (macOS), the attachment panel shows the same file.

## Verify a signature manually

```bash
curl -s -X POST http://localhost:3001/verify-pdf \
  -H 'Content-Type: application/json' \
  -d "$(node -e "
    const p = require('./server/data/cvs.json');
    const cv = Object.values(p)[0];
    delete cv.savedAt;
    process.stdout.write(JSON.stringify({ cv, signature: null }));
  ")"
```

Expect `{"valid": false, "reason": "unsigned"}` for an unsigned check.

## Common gotchas

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| `import.meta.env.DEV` shows `false` in dev | dev was started with `vite preview` instead of `vite` | use `npm run dev` |
| PDF download works in dev but signature is missing | Stripe webhook didn't fire | confirm `STRIPE_SECRET_KEY` is set; signing only happens after `verify-session` returns `paid: true` |
| `localStorage` quota exceeded | photo + certificates pushed CV over ~5 MB | reduce certificate count / size |
| New language locale flagged red by TS | a key was added in `pt.ts` and not translated | translate it in `en.ts`/`es.ts`/`fr.ts`/`de.ts` |
| Certificates skipped during PDF gen | source PDFs are encrypted/corrupt | check browser console for `[CVeaver] Skipping cert "…"` warnings |
| Light mode looks like dark mode | localStorage has stale `cveaver:theme=dark` | run `localStorage.removeItem('cveaver:theme'); location.reload()` |
| `text-white/X` unreadable in light | a new utility class was used in a component but isn't in the light-mode bridges in `index.css` | add the missing rule to the `[data-theme="light"]` overrides block |

## Project layout (quick)

```
client/src/
  components/        — React surfaces (Landing, Builder, Paid, Support, FAQ, Terms, Toast, LanguageSwitcher)
  components/Form/   — One file per CV section (Personal, Experience, …, Certificates)
  pdf/templates/     — @react-pdf renderers, one per template
  templates/         — On-screen previews, one per template
  i18n/              — pt/en/es/fr/de dictionaries + provider
  utils/             — Pure helpers (photo, certificate, format, completion, log, pdf, pdfEnhance, loadConfig, download)
  state/useCV.ts     — Undo/redo + localStorage persistence
  App.tsx            — Top-level router + Stripe return handler
server/
  index.js           — Express + Stripe + endpoints
  sign.js            — Ed25519 keypair + canonical sign/verify
  keys/              — On-disk keypair (gitignored)
  data/              — JSON store (gitignored)
```
