# OpenCV

A free CV builder with a live preview, nine templates, and editable PDF exports. No account, paywall, or watermark.

Build a CV from scratch, explore an example, or upload an existing OpenCV PDF or JSON file to keep editing. Run the entire application in a single Docker container.

[GitHub repository](https://github.com/Tomasneto404/OpenCV) · [Docker Hub](https://hub.docker.com/r/tomasneto26/opencv) · [Deployment guide](DEPLOY.md)

> This project is a CV builder and is not affiliated with the OpenCV computer vision library.

## Screenshots

### Landing page

Choose a template, start a new CV, or upload an existing one.

![OpenCV landing page in English, with create and upload actions](docs/screenshots/landing.png)

### Editor and live preview

Edit each section, change the design, and preview your CV alongside the form.

![OpenCV desktop editor showing a sample CV and its live preview](docs/screenshots/editor.png)

<details>
<summary>Dark mode and mobile preview</summary>

### Dark mode

![OpenCV desktop editor in dark mode](docs/screenshots/editor-dark.png)

### Mobile preview

<p align="center">
  <img src="docs/screenshots/mobile-preview.png" alt="OpenCV mobile preview displaying the sample CV" width="320" />
</p>

</details>

Screenshots show the running application in English using the built-in sample CV.

## Quick start with Docker

Download [compose.yaml](compose.yaml) into a directory on your server, then run:

```sh
docker compose up -d --wait
```

Open **http://localhost:8080**.

The compose file pulls `tomasneto26/opencv:latest` from Docker Hub. One Node.js container serves both the interface and the API. No database, keys, or persistent volumes are required.

To use the current version explicitly:

```sh
IMAGE_TAG=0.1.0 docker compose up -d --wait
```

Set `WEB_PORT` to change the published port. For example:

```sh
WEB_PORT=80 docker compose up -d --wait
```

To build the image from your local checkout:

```sh
docker compose -f docker-compose.yml up -d --build --wait
```

Images are published for `linux/amd64` and `linux/arm64`, tagged with `latest`, the version from `package.json`, and the full commit SHA. See [DEPLOY.md](DEPLOY.md) for deployment and migration instructions.

## Local development

Requires **Node.js 22.12 or later** and npm.

```sh
npm run install:all
npm run dev
```

- Application: http://localhost:5173
- API health check: http://localhost:3001/health
- Press `Ctrl+C` to stop both processes.

An `.env` file is optional. See [.env.example](.env.example) to configure ports, PDF concurrency, and proxy settings. Vite reads the root `.env` and forwards `/api` to the local API. If you change `PORT`, update the proxy target in [client/vite.config.ts](client/vite.config.ts) as well.

## Features

- **Nine templates:** Modern, Classic, Minimal, Creative, Executive, Compact, Studio, Technical, and Academic.
- **Live preview:** independently scrollable pages alongside the editor, with a dedicated mobile preview.
- **Personalization:** accent colors, profile photos, light and dark themes, and a responsive layout.
- **Five interface languages:** Portuguese, English, Spanish, French, and German.
- **Complete CV sections:** personal details, summary, experience, education, skills, languages, projects, and certificates.
- **Free PDF exports:** direct downloads without accounts, checkout, watermarks, or email delivery.
- **Upload and resume:** import OpenCV PDFs or editable JSON files from the landing page or editor, with confirmation before replacing a draft.
- **Local drafts:** automatic browser storage, JSON backups, undo/redo, and a reset action with confirmation.
- **PDF certificates:** up to 10 MB per file and 50 MB in total, with optional framing and every page preserved.

Drafts are stored in your browser's `localStorage`. If saving fails, the editor displays a warning so you can download an editable JSON backup. Imported data is validated before it reaches the editor.

## Data and editable PDFs

The API processes CVs in memory without storing drafts or generated PDFs on disk. The application has no payment, email, sales notification, or analytics integrations.

Every exported PDF includes an **`opencv.json` attachment** containing the editable CV data. It is neither encrypted nor signed: you can reimport it into any OpenCV installation, without keys or access to the server that created it. Anyone who receives the PDF can also read its embedded data.

PDFs from other applications that do not contain OpenCV's editable data cannot be imported. You can also save and import a standalone JSON backup.

Older PDFs with encrypted `cveaver.dat` or `opencv.dat` attachments must be opened in the previous version to save a JSON backup. Import that JSON into the current version. Drafts and preferences saved under the previous application name are still recognized in the same browser.

The HTML preview and PDF export use different renderers, so pagination may vary. Check the exported PDF before sharing it. Compact reduces spacing rather than cutting content to force a single page.

## Tests and validation

```sh
npm run build                   # Client build and TypeScript checks
npm test                        # Validation, portability, templates, and PDF round trips
npx playwright install chromium # Install the browser before the first E2E run
npm run test:e2e                 # Desktop and mobile browser tests
```

Unit tests cover all nine templates, long CVs, editing after reimport, reading PDFs in a separate process without keys, multipage certificates, and rejection of invalid data.

Browser tests start development servers when needed. They cover JSON/PDF upload, invalid files, replacement and cancellation, draft persistence, reset and undo, long-preview scrolling, and the developer Easter egg.

To test a running Docker deployment:

```sh
E2E_BASE_URL=http://localhost:8080 npm run test:e2e
```

[GitHub Actions](https://github.com/Tomasneto404/OpenCV/actions) runs the browser tests against the actual Docker container. Images are published to `tomasneto26/opencv` only after the build, type checks, tests, and secret scan pass.

## API

The application uses the `/api` prefix in production and through the Vite development proxy. The standalone development API also accepts the same routes without that prefix.

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | Service health |
| POST | `/api/pdf` | Accepts `{ cv }` and returns a PDF |
| POST | `/api/decode-pdf` | Accepts an `application/pdf` body and returns validated CV data |

The API limits request rates and concurrent PDF generation. The request body limit is 80 MB to accommodate base64-encoded attachments.

## Project structure

| Path | Purpose |
| --- | --- |
| `client/` | React, TypeScript, Vite, Tailwind, the editor, and HTML preview |
| `server/` | Express API, static interface hosting, PDF generation, and import |
| `shared/` | CV types and validation shared by the client and server |
| `tests/e2e/` | Playwright desktop and mobile tests |
| `docs/screenshots/` | Screenshots used in this README |
| `Dockerfile` | Builds the interface and packages the single application container |
| `compose.yaml` | Production deployment using Docker Hub images |
| `docker-compose.yml` | Local container builds |

## Credits

Developed with care by [Tomás Neto](https://github.com/Tomasneto404).

Enter the Konami code outside a text field to reveal the developer Easter egg: **↑ ↑ ↓ ↓ ← → ← → B A**.

## License

© 2026 Tomás Neto. All rights reserved.
