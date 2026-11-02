# PageGuide interactive demo

An anonymous, static demonstration of PageGuide's **Find** and **Guide** features, run on a local, fictional replica of an arXiv abstract page. The replicated listing is *“PageGuide: Browser extension to assist users in navigating a webpage and locating information”* (arXiv:2604.23772, cs.HC) — the paper that introduces PageGuide — so the demo runs a model of PageGuide on the page that describes it. No analytics, cookies, external fonts, or live network calls appear unless you opt into live mode. All sandbox content and links are local and fictional; the real arXiv is never opened.

## Features

- **Find:** ask about the paper in your own words and jump to the highlighted supporting passage in the abstract (e.g. “How much did verification accuracy improve?” → the 65%→77% sentence).
- **Guide:** ask “Where can I find the code?” and follow on-page highlights, one step at a time, to open the sidebar’s “Code, Data, Media” panel and reach the repository link. You click each control; nothing is opened or downloaded.
- **Optional live OpenAI Find and Guide:** structured model responses produce source highlights and step-by-step guidance on the same arXiv sandbox. No model-generated code or HTML is executed. Target IDs are allowlisted and scoped to the sandbox.
- Two keyboard-operable feature tabs, responsive layout, reduced-motion support, and accessible form labels.

This is **not the extension**. It cannot inspect arbitrary websites or other tabs. Offline/scripted and live experiences are clearly labeled. No real accounts, purchases, downloads, or setting changes are made.

## Run on this server

No build or runtime Node dependencies are required:

```sh
cd /home/thang/pageguide-demo
python3 -m http.server 8080 --bind 127.0.0.1
```

Or use `npm start`. Leave this process running. Binding to loopback prevents exposing your development directory directly to the network.

### View from your own computer

On **your local computer**, open a terminal and create an SSH tunnel:

```sh
ssh -N -L 8080:127.0.0.1:8080 thang@YOUR_SERVER
```

Use the same hostname/address and SSH options you normally use for this server. Keep the tunnel running, then open **http://localhost:8080** in your local browser.

If your local port 8080 is occupied:

```sh
ssh -N -L 8888:127.0.0.1:8080 thang@YOUR_SERVER
```

Then visit http://localhost:8888. With VS Code Remote SSH, forwarding server port 8080 through the Ports panel is another option.

## Live OpenAI mode

1. Open **Want real AI? Connect your OpenAI key** below the playground.
2. Enter a dedicated, limited-use API key, choose a supported model (default `gpt-4.1-mini`), and consent to sending demo content and prompts to OpenAI.
3. Click **Enable live mode**, choose **Find** or **Guide**, and ask a question.
4. Click **Disconnect** or reload the tab to forget the key.

The initial connection does not make a request. The key is verified on the first question. API failures are displayed; the site does not silently replace live failures with scripted answers.

Requests use OpenAI's Chat Completions endpoint with strict JSON Schema output. API usage is billed to the key owner. API access, billing, model availability, provider policies, and browser network restrictions may affect requests. Allow up to 45 seconds before a timeout.

**Security and privacy:**

- Never put an API key in source code, a GitHub secret injected into JS, a URL, or the repository. Static GitHub Pages cannot conceal a shared application secret.
- The demo keeps a manually entered key only in JavaScript memory, not browser storage. It clears the password field after connection. No application-level prompt or key logging is implemented.
- In live mode the key is sent only as authorization to `api.openai.com`; the user's prompt and fictional sandbox content are sent to OpenAI. The surrounding page, browser history, and other tabs are not included.
- An in-browser key is still accessible to browser developer tools, privileged extensions, and any compromised same-origin code. Use only a restricted, short-lived demo key and revoke it afterward.
- This is bring-your-own-key functionality, not a secure shared-key production architecture. To offer free live AI to all visitors using an operator-owned key, add a separate authenticated/rate-limited backend. That cannot be implemented securely with only public HTML/CSS/JS on GitHub Pages.
- The site has no app analytics. Hosting providers and OpenAI may still process normal request metadata under their own policies. “Anonymous” refers to the site's presentation and lack of sign-in/tracking, not a guarantee of network anonymity. The repository owner is still visible in a GitHub Pages URL.

## Deploy to GitHub Pages

The workflow in `.github/workflows/pages.yml` runs browser tests and publishes only `index.html`, `styles.css`, `app.js`, and `assets/`. Development files, dependencies, and tests are not deployed.

1. Push to `main` (or `master`).
2. In the repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Open **Actions → Deploy static demo to GitHub Pages**. If the first run failed because Pages was not enabled, rerun it or use **Run workflow**.
4. Open the URL from the successful deployment.

For this repository the expected URL is **https://pageguide.github.io/pageguide-demo/**. Asset paths are relative so project subdirectories work. A custom neutral domain is needed if the hosting URL itself must not reveal the repository owner.

The website is plain HTML/CSS/JS; npm is only used for development tests.

## Tests

```sh
npm ci
npx playwright install --with-deps chromium
npm test
```

Tests cover desktop and mobile Find/Guide/Hide, optional previews, privacy in simulation, keyboard tabs, responsive layout, OpenAI requests and errors, and validation of unsafe model output. OpenAI calls are **mocked**: the suite does not need or spend a real API key. Verify an actual provider response manually with your own key before a live presentation.

## Files

- `index.html`: page content and playground shell
- `styles.css`: responsive site and sandbox styles
- `app.js`: scripted interactions, sandbox controls, and optional OpenAI integration
- `assets/mark.svg`: local demo mark
- `tests/demo.spec.js`: Playwright browser tests
- `.github/workflows/pages.yml`: test and deployment pipeline
