# Previous interactive Find / Guide examples

Snapshot taken immediately before replacing the playground examples with the supplied Find PNG and Guide GIF.

## Saved files

- `LibraryShelf.tsx.txt`: complete previous library shelf, including the Cold War Find example, Amazon Guide example, steps, and Try buttons.
- `ExampleAnswer.tsx.txt`: previous agent-answer component with evidence hover previews and click-to-open overlays.
- `playground-examples.spec.ts.txt`: corresponding tests.

The original evidence assets are intentionally retained at:

- `public/examples/cold-war-berlin-wall-evidence.png`
- `public/examples/amazon-oranges-cart-evidence.png`

## Restore

From the repository root:

```bash
cp docs/archive/playground-interactive-examples/LibraryShelf.tsx.txt components/LibraryShelf.tsx
cp docs/archive/playground-interactive-examples/ExampleAnswer.tsx.txt components/ExampleAnswer.tsx
cp docs/archive/playground-interactive-examples/playground-examples.spec.ts.txt e2e/playground-examples.spec.ts
```

These commands restore whole files. If other changes have since been made, copy only the example sections instead. The archived files use `.txt` so Next.js/TypeScript will not compile their old relative imports.
