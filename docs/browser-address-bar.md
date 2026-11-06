# Optional browser address/search bar

The editable URL/search input and orange Go button appear automatically while Admin
mode is on. Unlock Admin mode using `/admin <password>` in the chat composer; use
`/admin off` to hide them again. Users can enter an `https://` URL to open another
website or a search query to find one.

Outside Admin mode, `components/surfaces/ExtensionSurface.tsx` renders a read-only
page title in their place. Home, Back, Forward, and Refresh remain available.
The input implementation lives in `components/BrowserAddressBar.tsx`.

To show the input and Go button even outside Admin mode, add this to `.env.local`:

```env
NEXT_PUBLIC_SHOW_ADDRESS_BAR=true
```

Restart the development server, or rebuild for production. This public flag is evaluated
at build time by Next.js. Remove the flag (or set it to `false`) to show the bar only in Admin mode.

The underlying store search/load actions and `/open` and `/search` chat commands are
unchanged. Browser tests that exercise the editable address bar can unlock Admin
mode or run against a server built with this flag enabled.
