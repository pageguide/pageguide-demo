# Optional browser address/search bar

The editable URL/search input and orange Go button are hidden by default, not deleted.
Their complete implementation is retained in `components/BrowserAddressBar.tsx`.
`components/surfaces/ExtensionSurface.tsx` renders a read-only page title in its place.
Home, Back, Forward, and Refresh remain available.

To restore the input and Go button, add this to `.env.local`:

```env
NEXT_PUBLIC_SHOW_ADDRESS_BAR=true
```

Restart the development server, or rebuild for production. This public flag is evaluated
at build time by Next.js. Remove the flag (or set it to `false`) to hide the bar again.

The underlying store search/load actions and `/open` and `/search` chat commands are
unchanged. Browser tests that exercise the editable address bar should be run against
a server built with this flag enabled.
