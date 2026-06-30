# Perfect Markdown

Figma Widget for rendering Markdown with full support for tables, code blocks, and more.

## Features

- ✅ **Tables** - Full visual table rendering with headers, borders, and alternating row colors
- ✅ **Code Blocks** - Syntax highlighting for JavaScript, Python, and more
- ✅ **Lists** - Ordered, unordered, nested lists, and task checkboxes
- ✅ **Headings** - H1-H6 with proper sizing and weights
- ✅ **Text Formatting** - Bold, italic, inline code, strikethrough, links
- ✅ **Blockquotes** - Styled quote blocks
- ✅ **Horizontal Rules** - Section dividers
- ✅ **Light/Dark Themes** - Switchable color themes
- ✅ **Adjustable Width** - Small (400px), Medium (600px), Large (800px), Full (1200px), or custom

## Installation

### Development

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the widget:
   ```bash
   npm run build
   ```
4. In Figma Desktop, go to **Plugins > Development > Import plugin from manifest...**
5. Select the `manifest.json` file from this project

### Watch Mode

For development with auto-rebuild:
```bash
npm run watch
```

## Usage

1. In Figma, right-click on the canvas
2. Select **Widgets > Perfect Markdown**
3. The widget will appear with sample content
4. Click **"Edit content"** in the toolbar to modify the Markdown
5. Use the **width toggle** (↔️ icon) to cycle through size presets
6. Right-click the widget for more options (theme, font size, custom width)

## Toolbar

- **Edit content** - Opens a modal to edit the Markdown content
- **Width toggle** - Cycles through Small → Medium → Large → Full

## Property Menu (Right-click)

- **Edit Markdown** - Same as toolbar edit button
- **Width** - Select preset or enter custom width (300-1600px)
- **Theme** - Switch between Light and Dark modes
- **Font Size** - Small, Medium, or Large

## Project Structure

```
perfect-markdown/
├── manifest.json              # Figma Widget manifest
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── src/
│   ├── widget.tsx             # Main widget entry
│   ├── types.ts               # TypeScript types
│   ├── components/
│   │   ├── MarkdownRenderer.tsx
│   │   ├── Heading.tsx
│   │   ├── Paragraph.tsx
│   │   ├── Table.tsx
│   │   ├── CodeBlock.tsx
│   │   ├── List.tsx
│   │   ├── Blockquote.tsx
│   │   ├── HorizontalRule.tsx
│   │   ├── Image.tsx
│   │   └── FormattedText.tsx
│   ├── parser/
│   │   └── markdown.ts        # Markdown parser (using marked.js)
│   └── styles/
│       └── theme.ts           # Theme colors and text styles
└── dist/
    └── widget.js              # Built widget
```

## Tech Stack

- **Figma Widget API** - For creating the interactive widget
- **marked.js** - Markdown parsing (GFM support)
- **esbuild** - Fast bundling
- **TypeScript** - Type safety

## Layer Naming Convention

Generated layers follow an HTML-like naming convention:
- `H1: Title text...`
- `H2: Section heading...`
- `P: Paragraph content...`
- `UL: List content...`
- `OL: Ordered list...`
- `TABLE: Table header...`
- `PRE: code`
- `HR`
- `BLOCKQUOTE: Quote text...`

## Contributing — text wrapping checklist

When adding a new block kind or new inline element type:

1. **Default path: render the entire block as one `<Text>` with `<Span>` children.** Use the `inlineToSpans(...)` helper at the top of `src/widget.tsx` and wrap the `<Text>` with `width: 'fill-parent'`. A single Text node wraps natively, so long CJK strings (no spaces) and mixed inline formatting both work.
2. **Color-swatch fallback only when needed.** `inlineToSpans` returns `null` when the block contains a color swatch (an AutoLayout that can't live inside a Text). In that case, fall back to a horizontal `AutoLayout` with `wrap: true` and apply `withFill(props, isSingle)` to every Text child so the single-child case still wraps.
3. **Manually verify with `examples/wrap-regression.md`** at widget widths 400 / 600 / 800 — every long CJK line must wrap inside the widget. Test both single-inline and mixed-inline (bold + italic + code) paragraphs.

Why the Span path matters: Figma's `wrap: true` AutoLayout only breaks **between children**, never inside a single `Text` node. A horizontal AutoLayout of multiple `Text` children silently overflows when one child becomes long — a bug that hit paragraphs, headings, list items and checkboxes on CJK input.

## License

MIT

