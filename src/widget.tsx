// Perfect Markdown Widget - With Full Markdown Support
var widgetAPI = figma.widget;

var lightTheme = {
  textPrimary: '#1a1a1a',
  textSecondary: '#333333',
  textMuted: '#666666',
  background: '#ffffff',
  backgroundCode: '#f6f8fa',
  backgroundTableHeader: '#f6f8fa',
  backgroundTableRow: '#ffffff',
  backgroundTableRowAlt: '#f9fafb',
  border: '#d0d7de',
  link: '#0969da',
  checkboxBg: '#ffffff',
  checkboxBorder: '#d0d7de',
  checkboxChecked: '#0969da',
};

var darkTheme = {
  textPrimary: '#f0f0f0',
  textSecondary: '#e0e0e0',
  textMuted: '#a0a0a0',
  background: '#1e1e1e',
  backgroundCode: '#2d2d2d',
  backgroundTableHeader: '#2d2d2d',
  backgroundTableRow: '#1e1e1e',
  backgroundTableRowAlt: '#252525',
  border: '#404040',
  link: '#58a6ff',
  checkboxBg: '#2d2d2d',
  checkboxBorder: '#404040',
  checkboxChecked: '#58a6ff',
};

var DEFAULT_MD = '# Perfect Markdown\n\nThis is **Perfect Markdown** - a Figma widget with full Markdown support!\n\n## Features\n\n- Visual tables\n- Checkboxes\n- Nested lists\n- Clickable links\n- Color swatches (e.g. #1a4cb3)\n\n## Table Example\n\n| Feature | Status |\n|---------|--------|\n| Tables | ✅ |\n| Checkboxes | ✅ |\n| Links | ✅ |\n\n## Color Tokens\n\n| Token | Hex Value |\n|-------|----------|\n| primary | #1a4cb3 |\n| error | #ba1b1b |\n| surface | #e3e6eb |\n\n## Task List\n\n- [x] Implement tables\n- [x] Add checkbox support\n- [ ] Add more features\n\n## Links\n\nVisit [Figma Community](https://figma.com/community) for more widgets.\n\n---\n\nClick Edit to modify.';

var WIDTH_CYCLE = [400, 600, 800, 1200];

function parseMarkdown(md) {
  var blocks = [];
  var lines = md.split('\n');
  var i = 0;
  
  while (i < lines.length) {
    var line = lines[i];
    
    if (line.trim() === '') {
      i++;
      continue;
    }
    
    // HR
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push({ t: 'hr' });
      i++;
      continue;
    }
    
    // Heading
    var hm = line.match(/^(#{1,6})\s+(.*)$/);
    if (hm) {
      blocks.push({ t: 'h', d: hm[1].length, x: hm[2] });
      i++;
      continue;
    }
    
    // Code block
    if (line.trim().indexOf('```') === 0) {
      var lang = line.trim().slice(3).trim();
      var codeLines = [];
      i++;
      while (i < lines.length && lines[i].trim().indexOf('```') !== 0) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ t: 'code', lang: lang, x: codeLines.join('\n') });
      i++;
      continue;
    }
    
    // Image: ![alt](url)
    var imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imgMatch) {
      blocks.push({ t: 'img', alt: imgMatch[1], url: imgMatch[2] });
      i++;
      continue;
    }
    
    // Table - check if current line has | and next line is separator
    if (line.indexOf('|') !== -1 && i + 1 < lines.length) {
      var nextLine = lines[i + 1];
      if (/^\|?[\s-:|]+\|?$/.test(nextLine) && nextLine.indexOf('-') !== -1) {
        // Parse table
        var headerCells = parseTableRow(line);
        i += 2; // Skip header and separator
        var rows = [];
        while (i < lines.length && lines[i].indexOf('|') !== -1 && lines[i].trim() !== '') {
          rows.push(parseTableRow(lines[i]));
          i++;
        }
        blocks.push({ t: 'table', header: headerCells, rows: rows });
        continue;
      }
    }
    
    // Checkbox list item: - [ ] or - [x]
    var cbMatch = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (cbMatch) {
      var indent = cbMatch[1].length;
      var checked = cbMatch[2].toLowerCase() === 'x';
      blocks.push({ t: 'cb', x: cbMatch[3], checked: checked, indent: indent });
      i++;
      continue;
    }
    
    // List item with indentation support
    var lm = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (lm) {
      var listIndent = lm[1].length;
      var level = Math.floor(listIndent / 2);
      blocks.push({ t: 'li', x: lm[2], level: level });
      i++;
      continue;
    }
    
    // Numbered list item
    var numMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (numMatch) {
      var numIndent = numMatch[1].length;
      var numLevel = Math.floor(numIndent / 2);
      blocks.push({ t: 'ol', x: numMatch[3], num: numMatch[2], level: numLevel });
      i++;
      continue;
    }
    
    // Paragraph (may contain inline links)
    blocks.push({ t: 'p', x: line });
    i++;
  }
  
  return blocks;
}

// Parse inline elements (links, bold, italic, code, strikethrough, color)
function parseInlineElements(text) {
  var elements = [];
  var remaining = text;
  
  while (remaining.length > 0) {
    // Bold + Italic ***text***
    var boldItalicMatch = remaining.match(/^\*\*\*(.+?)\*\*\*/);
    if (boldItalicMatch) {
      elements.push({ t: 'bolditalic', x: boldItalicMatch[1] });
      remaining = remaining.slice(boldItalicMatch[0].length);
      continue;
    }
    
    // Bold **text** or __text__
    var boldMatch = remaining.match(/^\*\*(.+?)\*\*/) || remaining.match(/^__(.+?)__/);
    if (boldMatch) {
      elements.push({ t: 'bold', x: boldMatch[1] });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }
    
    // Italic *text* or _text_
    var italicMatch = remaining.match(/^\*([^*]+?)\*/) || remaining.match(/^_([^_]+?)_/);
    if (italicMatch) {
      elements.push({ t: 'italic', x: italicMatch[1] });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }
    
    // Strikethrough ~~text~~
    var strikeMatch = remaining.match(/^~~(.+?)~~/);
    if (strikeMatch) {
      elements.push({ t: 'strike', x: strikeMatch[1] });
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }
    
    // Inline code `text` — if content is a hex color, emit as color instead
    var codeMatch = remaining.match(/^`([^`]+?)`/);
    if (codeMatch) {
      var codeContent = codeMatch[1];
      var codeColorMatch = codeContent.match(/^(#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))$/);
      if (codeColorMatch) {
        elements.push({ t: 'color', x: codeColorMatch[1], color: normalizeHexColor(codeColorMatch[1]) });
      } else {
        elements.push({ t: 'code', x: codeContent });
      }
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }
    
    // Link [text](url)
    var linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      elements.push({ t: 'link', x: linkMatch[1], url: linkMatch[2] });
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }
    
    // Hex color code #RRGGBBAA, #RRGGBB, or #RGB (check longer patterns first)
    var colorMatch = remaining.match(/^(#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))(?![0-9a-fA-F])/);
    if (colorMatch) {
      elements.push({ t: 'color', x: colorMatch[1], color: normalizeHexColor(colorMatch[1]) });
      remaining = remaining.slice(colorMatch[0].length);
      continue;
    }
    
    // Regular character - collect until next special char or color
    var nextSpecial = remaining.search(/[\*_~`\[#]/);
    if (nextSpecial === -1) {
      elements.push({ t: 'text', x: remaining });
      break;
    } else if (nextSpecial === 0) {
      // Single special char that didn't match patterns
      elements.push({ t: 'text', x: remaining.charAt(0) });
      remaining = remaining.slice(1);
    } else {
      elements.push({ t: 'text', x: remaining.slice(0, nextSpecial) });
      remaining = remaining.slice(nextSpecial);
    }
  }
  
  return elements;
}

// Normalize hex color to full 6-digit format for Figma
function normalizeHexColor(hex) {
  var h = hex.slice(1); // Remove #
  if (h.length === 3) {
    // Convert #RGB to #RRGGBB
    return '#' + h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  if (h.length === 8) {
    // #RRGGBBAA - just use RRGGBB part for fill color
    return '#' + h.slice(0, 6);
  }
  return hex;
}

// Create color swatch element with the color code text
function createColorSwatch(h, AutoLayout, Rectangle, Text, key, colorHex, displayText, theme, fontSize) {
  var fs = fontSize || 14;
  return h(AutoLayout, {
    key: key,
    direction: 'horizontal',
    spacing: 4,
    verticalAlignItems: 'center',
  },
    h(Rectangle, {
      width: fs - 2,
      height: fs - 2,
      fill: colorHex,
      cornerRadius: 2,
      stroke: theme.border,
      strokeWidth: 1,
    }),
    h(Text, {
      fontSize: fs,
      fontFamily: 'Source Code Pro',
      fill: theme.textSecondary,
    }, displayText)
  );
}

function parseTableRow(line) {
  var trimmed = line.trim();
  if (trimmed.charAt(0) === '|') trimmed = trimmed.slice(1);
  if (trimmed.charAt(trimmed.length - 1) === '|') trimmed = trimmed.slice(0, -1);
  var cells = trimmed.split('|');
  var result = [];
  for (var i = 0; i < cells.length; i++) {
    result.push(cells[i].trim());
  }
  return result;
}

function PerfectMarkdown() {
  var useSyncedState = widgetAPI.useSyncedState;
  var usePropertyMenu = widgetAPI.usePropertyMenu;
  var AutoLayout = widgetAPI.AutoLayout;
  var Text = widgetAPI.Text;
  var Rectangle = widgetAPI.Rectangle;
  var h = widgetAPI.h;

  var mdState = useSyncedState('md', DEFAULT_MD);
  var md = mdState[0];
  var setMd = mdState[1];

  var chromeState = useSyncedState('chrome', true);
  var showChrome = chromeState[0];
  var setShowChrome = chromeState[1];

  var wState = useSyncedState('w', 600);
  var w = wState[0];
  var setW = wState[1];

  var tState = useSyncedState('t', 'light');
  var tn = tState[0];
  var setT = tState[1];

  var theme = tn === 'light' ? lightTheme : darkTheme;
  var cw = w - 40;

  // Cycle width function
  function cycleWidth() {
    var currentIdx = -1;
    for (var i = 0; i < WIDTH_CYCLE.length; i++) {
      if (WIDTH_CYCLE[i] === w) {
        currentIdx = i;
        break;
      }
    }
    var nextIdx = (currentIdx + 1) % WIDTH_CYCLE.length;
    setW(WIDTH_CYCLE[nextIdx]);
  }

  // Get width label
  function getWidthLabel() {
    if (w === 400) return 'S';
    if (w === 600) return 'M';
    if (w === 800) return 'L';
    if (w === 1200) return 'XL';
    return w + '';
  }

  usePropertyMenu(
    [
      { itemType: 'action', propertyName: 'edit', tooltip: 'Edit Markdown' },
      { itemType: 'action', propertyName: 'toggleChrome', tooltip: showChrome ? 'Hide toolbar' : 'Show toolbar' },
      { itemType: 'separator' },
      { itemType: 'action', propertyName: 'cycleWidth', tooltip: '↔ ' + getWidthLabel() },
      {
        itemType: 'dropdown',
        propertyName: 'width',
        tooltip: 'Width',
        selectedOption: String(w),
        options: [
          { option: '400', label: 'Small' },
          { option: '600', label: 'Medium' },
          { option: '800', label: 'Large' },
          { option: '1200', label: 'Full' },
        ],
      },
      {
        itemType: 'dropdown',
        propertyName: 'theme',
        tooltip: 'Theme',
        selectedOption: tn,
        options: [
          { option: 'light', label: 'Light' },
          { option: 'dark', label: 'Dark' },
        ],
      },
    ],
    function(ev) {
      if (ev.propertyName === 'edit') {
        return new Promise(function(resolve) {
          var esc = md.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          figma.showUI('<html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;padding:16px;height:100vh;display:flex;flex-direction:column;background:#f5f5f5}textarea{flex:1;width:100%;padding:12px;border:1px solid #ccc;border-radius:8px;font-family:monospace;font-size:13px;resize:none}button{margin-top:12px;padding:10px 20px;background:#0066ff;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px}</style></head><body><textarea id="e">' + esc + '</textarea><button onclick="parent.postMessage({pluginMessage:{t:\'s\',v:document.getElementById(\'e\').value}},\'*\')">Save</button></body></html>', { width: 500, height: 400 });
          figma.ui.onmessage = function(msg) {
            if (msg.t === 's') setMd(msg.v);
            figma.closePlugin();
            resolve();
          };
        });
      }
      if (ev.propertyName === 'toggleChrome') {
        setShowChrome(!showChrome);
      }
      if (ev.propertyName === 'cycleWidth') {
        cycleWidth();
      }
      if (ev.propertyName === 'width') {
        setW(parseInt(ev.propertyValue, 10));
      }
      if (ev.propertyName === 'theme') {
        setT(ev.propertyValue);
      }
    }
  );

  var blocks = parseMarkdown(md);
  var children = [];

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    
    if (b.t === 'h') {
      var fs = 32 - (b.d - 1) * 4;
      var hInlineEls = parseInlineElements(b.x);
      var hChildren = [];
      for (var hi = 0; hi < hInlineEls.length; hi++) {
        var hEl = hInlineEls[hi];
        if (hEl.t === 'code') {
          hChildren.push(h(Text, { key: 'hc' + hi, fontSize: fs - 2, fontFamily: 'Source Code Pro', fontWeight: 700, fill: theme.textPrimary }, hEl.x));
        } else if (hEl.t === 'link') {
          hChildren.push(h(Text, { key: 'hl' + hi, fontSize: fs, fontWeight: 700, fill: theme.link, textDecoration: 'underline', onClick: (function(url) { return function() { return new Promise(function(resolve) { figma.openExternal(url); resolve(); }); }; })(hEl.url) }, hEl.x));
        } else if (hEl.t === 'color') {
          hChildren.push(createColorSwatch(h, AutoLayout, Rectangle, Text, 'hcol' + hi, hEl.color, hEl.x, theme, fs));
        } else {
          hChildren.push(h(Text, { key: 'ht' + hi, fontSize: fs, fontWeight: 700, fill: theme.textPrimary }, hEl.x));
        }
      }
      children.push(
        h(AutoLayout, { key: 'h' + i, width: cw, padding: { top: 12, bottom: 8 }, direction: 'horizontal', wrap: true, verticalAlignItems: 'center' }, hChildren)
      );
    }
    
    if (b.t === 'p') {
      // Parse inline elements for links, bold, italic, etc.
      var inlineEls = parseInlineElements(b.x);
      var pChildren = [];
      for (var pi = 0; pi < inlineEls.length; pi++) {
        var el = inlineEls[pi];
        if (el.t === 'link') {
          pChildren.push(
            h(Text, {
              key: 'pl' + pi,
              fontSize: 14,
              fill: theme.link,
              textDecoration: 'underline',
              onClick: (function(url) {
                return function() {
                  return new Promise(function(resolve) {
                    figma.openExternal(url);
                    resolve();
                  });
                };
              })(el.url),
            }, el.x)
          );
        } else if (el.t === 'bold') {
          pChildren.push(
            h(Text, { key: 'pb' + pi, fontSize: 14, fontWeight: 700, fill: theme.textSecondary }, el.x)
          );
        } else if (el.t === 'italic') {
          pChildren.push(
            h(Text, { key: 'pi' + pi, fontSize: 14, italic: true, fill: theme.textSecondary }, el.x)
          );
        } else if (el.t === 'bolditalic') {
          pChildren.push(
            h(Text, { key: 'pbi' + pi, fontSize: 14, fontWeight: 700, italic: true, fill: theme.textSecondary }, el.x)
          );
        } else if (el.t === 'strike') {
          pChildren.push(
            h(Text, { key: 'ps' + pi, fontSize: 14, textDecoration: 'strikethrough', fill: theme.textMuted }, el.x)
          );
        } else if (el.t === 'code') {
          pChildren.push(
            h(Text, { key: 'pc' + pi, fontSize: 13, fontFamily: 'Source Code Pro', fill: theme.textSecondary }, el.x)
          );
        } else if (el.t === 'color') {
          pChildren.push(createColorSwatch(h, AutoLayout, Rectangle, Text, 'pcol' + pi, el.color, el.x, theme, 14));
        } else {
          pChildren.push(
            h(Text, { key: 'pt' + pi, fontSize: 14, fill: theme.textSecondary }, el.x)
          );
        }
      }
      children.push(
        h(AutoLayout, { key: 'p' + i, direction: 'horizontal', width: cw, padding: { bottom: 8 }, wrap: true, verticalAlignItems: 'center' }, pChildren)
      );
    }
    
    if (b.t === 'li') {
      var leftPad = (b.level || 0) * 16;
      var liInlineEls = parseInlineElements(b.x);
      var liChildren = [];
      for (var li = 0; li < liInlineEls.length; li++) {
        var liEl = liInlineEls[li];
        if (liEl.t === 'bold') {
          liChildren.push(h(Text, { key: 'lib' + li, fontSize: 14, fontWeight: 700, fill: theme.textSecondary }, liEl.x));
        } else if (liEl.t === 'italic') {
          liChildren.push(h(Text, { key: 'lii' + li, fontSize: 14, italic: true, fill: theme.textSecondary }, liEl.x));
        } else if (liEl.t === 'bolditalic') {
          liChildren.push(h(Text, { key: 'libi' + li, fontSize: 14, fontWeight: 700, italic: true, fill: theme.textSecondary }, liEl.x));
        } else if (liEl.t === 'code') {
          liChildren.push(h(Text, { key: 'lic' + li, fontSize: 13, fontFamily: 'Source Code Pro', fill: theme.textSecondary }, liEl.x));
        } else if (liEl.t === 'link') {
          liChildren.push(h(Text, { key: 'lil' + li, fontSize: 14, fill: theme.link, textDecoration: 'underline', onClick: (function(url) { return function() { return new Promise(function(resolve) { figma.openExternal(url); resolve(); }); }; })(liEl.url) }, liEl.x));
        } else if (liEl.t === 'strike') {
          liChildren.push(h(Text, { key: 'lis' + li, fontSize: 14, textDecoration: 'strikethrough', fill: theme.textMuted }, liEl.x));
        } else if (liEl.t === 'color') {
          liChildren.push(createColorSwatch(h, AutoLayout, Rectangle, Text, 'licol' + li, liEl.color, liEl.x, theme, 14));
        } else {
          liChildren.push(h(Text, { key: 'lit' + li, fontSize: 14, fill: theme.textSecondary }, liEl.x));
        }
      }
      children.push(
        h(AutoLayout, { key: 'l' + i, direction: 'horizontal', width: cw, spacing: 8, padding: { bottom: 4, left: leftPad }, verticalAlignItems: 'center' },
          h(Text, { fontSize: 14, fill: theme.textMuted }, '•'),
          h(AutoLayout, { direction: 'horizontal', width: cw - 20 - leftPad, wrap: true, verticalAlignItems: 'center' }, liChildren)
        )
      );
    }
    
    // Numbered list
    if (b.t === 'ol') {
      var olLeftPad = (b.level || 0) * 16;
      var olInlineEls = parseInlineElements(b.x);
      var olChildren = [];
      for (var oli = 0; oli < olInlineEls.length; oli++) {
        var olEl = olInlineEls[oli];
        if (olEl.t === 'bold') {
          olChildren.push(h(Text, { key: 'olb' + oli, fontSize: 14, fontWeight: 700, fill: theme.textSecondary }, olEl.x));
        } else if (olEl.t === 'italic') {
          olChildren.push(h(Text, { key: 'oli' + oli, fontSize: 14, italic: true, fill: theme.textSecondary }, olEl.x));
        } else if (olEl.t === 'bolditalic') {
          olChildren.push(h(Text, { key: 'olbi' + oli, fontSize: 14, fontWeight: 700, italic: true, fill: theme.textSecondary }, olEl.x));
        } else if (olEl.t === 'code') {
          olChildren.push(h(Text, { key: 'olc' + oli, fontSize: 13, fontFamily: 'Source Code Pro', fill: theme.textSecondary }, olEl.x));
        } else if (olEl.t === 'link') {
          olChildren.push(h(Text, { key: 'oll' + oli, fontSize: 14, fill: theme.link, textDecoration: 'underline', onClick: (function(url) { return function() { return new Promise(function(resolve) { figma.openExternal(url); resolve(); }); }; })(olEl.url) }, olEl.x));
        } else if (olEl.t === 'strike') {
          olChildren.push(h(Text, { key: 'ols' + oli, fontSize: 14, textDecoration: 'strikethrough', fill: theme.textMuted }, olEl.x));
        } else if (olEl.t === 'color') {
          olChildren.push(createColorSwatch(h, AutoLayout, Rectangle, Text, 'olcol' + oli, olEl.color, olEl.x, theme, 14));
        } else {
          olChildren.push(h(Text, { key: 'olt' + oli, fontSize: 14, fill: theme.textSecondary }, olEl.x));
        }
      }
      children.push(
        h(AutoLayout, { key: 'ol' + i, direction: 'horizontal', width: cw, spacing: 8, padding: { bottom: 4, left: olLeftPad }, verticalAlignItems: 'center' },
          h(Text, { fontSize: 14, fill: theme.textMuted, width: 20 }, b.num + '.'),
          h(AutoLayout, { direction: 'horizontal', width: cw - 36 - olLeftPad, wrap: true, verticalAlignItems: 'center' }, olChildren)
        )
      );
    }
    
    // Checkbox
    if (b.t === 'cb') {
      var cbLeftPad = (b.indent || 0) * 8;
      var checkboxIcon = b.checked
        ? h(AutoLayout, {
            width: 16,
            height: 16,
            fill: theme.checkboxChecked,
            cornerRadius: 3,
            horizontalAlignItems: 'center',
            verticalAlignItems: 'center',
          }, h(Text, { fontSize: 12, fill: '#fff', fontWeight: 700 }, '✓'))
        : h(AutoLayout, {
            width: 16,
            height: 16,
            fill: theme.checkboxBg,
            cornerRadius: 3,
            stroke: theme.checkboxBorder,
            strokeWidth: 1,
          });
      var cbInlineEls = parseInlineElements(b.x);
      var cbChildren = [];
      for (var cbi = 0; cbi < cbInlineEls.length; cbi++) {
        var cbEl = cbInlineEls[cbi];
        var cbTextFill = b.checked ? theme.textMuted : theme.textSecondary;
        var cbTextDeco = b.checked ? 'strikethrough' : 'none';
        if (cbEl.t === 'bold') {
          cbChildren.push(h(Text, { key: 'cbb' + cbi, fontSize: 14, fontWeight: 700, fill: cbTextFill, textDecoration: cbTextDeco }, cbEl.x));
        } else if (cbEl.t === 'italic') {
          cbChildren.push(h(Text, { key: 'cbi' + cbi, fontSize: 14, italic: true, fill: cbTextFill, textDecoration: cbTextDeco }, cbEl.x));
        } else if (cbEl.t === 'code') {
          cbChildren.push(h(Text, { key: 'cbc' + cbi, fontSize: 13, fontFamily: 'Source Code Pro', fill: cbTextFill, textDecoration: cbTextDeco }, cbEl.x));
        } else if (cbEl.t === 'link') {
          cbChildren.push(h(Text, { key: 'cbl' + cbi, fontSize: 14, fill: theme.link, textDecoration: 'underline', onClick: (function(url) { return function() { return new Promise(function(resolve) { figma.openExternal(url); resolve(); }); }; })(cbEl.url) }, cbEl.x));
        } else if (cbEl.t === 'color') {
          cbChildren.push(createColorSwatch(h, AutoLayout, Rectangle, Text, 'cbcol' + cbi, cbEl.color, cbEl.x, theme, 14));
        } else {
          cbChildren.push(h(Text, { key: 'cbt' + cbi, fontSize: 14, fill: cbTextFill, textDecoration: cbTextDeco }, cbEl.x));
        }
      }
      children.push(
        h(AutoLayout, { key: 'cb' + i, direction: 'horizontal', width: cw, spacing: 8, padding: { bottom: 4, left: cbLeftPad }, verticalAlignItems: 'center' },
          checkboxIcon,
          h(AutoLayout, { direction: 'horizontal', width: cw - 32 - cbLeftPad, wrap: true, verticalAlignItems: 'center' }, cbChildren)
        )
      );
    }
    
    // Image
    if (b.t === 'img') {
      children.push(
        h(AutoLayout, {
          key: 'img' + i,
          width: cw,
          padding: { top: 8, bottom: 16 },
          direction: 'vertical',
          spacing: 4,
        },
          h(AutoLayout, {
            width: cw,
            height: 200,
            fill: theme.backgroundCode,
            cornerRadius: 6,
            stroke: theme.border,
            strokeWidth: 1,
            horizontalAlignItems: 'center',
            verticalAlignItems: 'center',
          },
            h(Text, { fontSize: 12, fill: theme.textMuted }, '🖼 ' + (b.alt || 'Image') + ' (' + b.url + ')')
          ),
          b.alt ? h(Text, { fontSize: 12, fill: theme.textMuted, italic: true }, b.alt) : null
        )
      );
    }
    
    if (b.t === 'hr') {
      children.push(
        h(AutoLayout, { key: 'r' + i, width: cw, padding: { top: 12, bottom: 12 } },
          h(Rectangle, { width: cw, height: 1, fill: theme.border })
        )
      );
    }
    
    if (b.t === 'code') {
      var codeLines = b.x.split('\n');
      var codeChildren = [];
      for (var ci = 0; ci < codeLines.length; ci++) {
        codeChildren.push(
          h(Text, { key: 'cl' + ci, fontSize: 13, fontFamily: 'Source Code Pro', fill: theme.textSecondary, width: cw - 32 }, codeLines[ci] || ' ')
        );
      }
      children.push(
        h(AutoLayout, { key: 'c' + i, width: cw, padding: { top: 8, bottom: 16 } },
          h(AutoLayout, {
            direction: 'vertical',
            width: cw,
            padding: 16,
            fill: theme.backgroundCode,
            cornerRadius: 6,
            stroke: theme.border,
            strokeWidth: 1,
            spacing: 2,
          }, codeChildren)
        )
      );
    }
    
    // Table rendering
    if (b.t === 'table') {
      var colCount = b.header.length;
      var colWidth = Math.floor((cw - 2) / colCount);
      
      // Build header row
      var headerCells = [];
      for (var thi = 0; thi < b.header.length; thi++) {
        var thInlineEls = parseInlineElements(b.header[thi]);
        var thSingle = thInlineEls.length === 1;
        var thChildren = [];
        for (var thj = 0; thj < thInlineEls.length; thj++) {
          var thEl = thInlineEls[thj];
          var thKey = thi + '-' + thj;
          if (thEl.t === 'bold') {
            var thbP = { key: 'thb' + thKey, fontSize: 14, fontWeight: 700, fill: theme.textPrimary };
            if (thSingle) thbP.width = 'fill-parent';
            thChildren.push(h(Text, thbP, thEl.x));
          } else if (thEl.t === 'code') {
            var thcP = { key: 'thc' + thKey, fontSize: 13, fontFamily: 'Source Code Pro', fontWeight: 600, fill: theme.textPrimary };
            if (thSingle) thcP.width = 'fill-parent';
            thChildren.push(h(Text, thcP, thEl.x));
          } else if (thEl.t === 'color') {
            thChildren.push(createColorSwatch(h, AutoLayout, Rectangle, Text, 'thcol' + thKey, thEl.color, thEl.x, theme, 14));
          } else {
            var thtP = { key: 'tht' + thKey, fontSize: 14, fontWeight: 600, fill: theme.textPrimary };
            if (thSingle) thtP.width = 'fill-parent';
            thChildren.push(h(Text, thtP, thEl.x));
          }
        }
        headerCells.push(
          h(AutoLayout, {
            key: 'th' + thi,
            width: colWidth,
            height: 'fill-parent',
            padding: 10,
            stroke: theme.border,
            strokeWidth: 1,
            strokeAlign: 'inside',
            direction: 'horizontal',
            wrap: true,
            verticalAlignItems: 'center',
          }, thChildren)
        );
      }
      
      // Build data rows
      var tableRows = [];
      tableRows.push(
        h(AutoLayout, { key: 'thead', direction: 'horizontal', width: cw, fill: theme.backgroundTableHeader }, headerCells)
      );
      
      for (var ri = 0; ri < b.rows.length; ri++) {
        var rowCells = [];
        var row = b.rows[ri];
        for (var tci = 0; tci < row.length; tci++) {
          var tdInlineEls = parseInlineElements(row[tci]);
          var tdSingle = tdInlineEls.length === 1;
          var tdChildren = [];
          for (var tdj = 0; tdj < tdInlineEls.length; tdj++) {
            var tdEl = tdInlineEls[tdj];
            var tdKey = ri + '-' + tci + '-' + tdj;
            if (tdEl.t === 'bold') {
              var tdbP = { key: 'tdb' + tdKey, fontSize: 14, fontWeight: 700, fill: theme.textSecondary };
              if (tdSingle) tdbP.width = 'fill-parent';
              tdChildren.push(h(Text, tdbP, tdEl.x));
            } else if (tdEl.t === 'italic') {
              var tdiP = { key: 'tdi' + tdKey, fontSize: 14, italic: true, fill: theme.textSecondary };
              if (tdSingle) tdiP.width = 'fill-parent';
              tdChildren.push(h(Text, tdiP, tdEl.x));
            } else if (tdEl.t === 'code') {
              var tdcP = { key: 'tdc' + tdKey, fontSize: 13, fontFamily: 'Source Code Pro', fill: theme.textSecondary };
              if (tdSingle) tdcP.width = 'fill-parent';
              tdChildren.push(h(Text, tdcP, tdEl.x));
            } else if (tdEl.t === 'link') {
              var tdlP = { key: 'tdl' + tdKey, fontSize: 14, fill: theme.link, textDecoration: 'underline', onClick: (function(url) { return function() { return new Promise(function(resolve) { figma.openExternal(url); resolve(); }); }; })(tdEl.url) };
              if (tdSingle) tdlP.width = 'fill-parent';
              tdChildren.push(h(Text, tdlP, tdEl.x));
            } else if (tdEl.t === 'strike') {
              var tdsP = { key: 'tds' + tdKey, fontSize: 14, textDecoration: 'strikethrough', fill: theme.textMuted };
              if (tdSingle) tdsP.width = 'fill-parent';
              tdChildren.push(h(Text, tdsP, tdEl.x));
            } else if (tdEl.t === 'color') {
              tdChildren.push(createColorSwatch(h, AutoLayout, Rectangle, Text, 'tdcol' + tdKey, tdEl.color, tdEl.x, theme, 14));
            } else {
              var tdtP = { key: 'tdt' + tdKey, fontSize: 14, fill: theme.textSecondary };
              if (tdSingle) tdtP.width = 'fill-parent';
              tdChildren.push(h(Text, tdtP, tdEl.x));
            }
          }
          rowCells.push(
            h(AutoLayout, {
              key: 'td' + ri + '-' + tci,
              width: colWidth,
              height: 'fill-parent',
              padding: 10,
              stroke: theme.border,
              strokeWidth: 1,
              strokeAlign: 'inside',
              direction: 'horizontal',
              wrap: true,
              verticalAlignItems: 'center',
            }, tdChildren)
          );
        }
        var rowFill = ri % 2 === 0 ? theme.backgroundTableRow : theme.backgroundTableRowAlt;
        tableRows.push(
          h(AutoLayout, { key: 'tr' + ri, direction: 'horizontal', width: cw, fill: rowFill }, rowCells)
        );
      }
      
      children.push(
        h(AutoLayout, { key: 'tbl' + i, direction: 'vertical', width: cw, padding: { top: 8, bottom: 16 } },
          h(AutoLayout, {
            direction: 'vertical',
            width: cw,
            stroke: theme.border,
            strokeWidth: 1,
            cornerRadius: 6,
            overflow: 'hidden',
          }, tableRows)
        )
      );
    }
  }

  return h(AutoLayout, {
    name: 'Perfect Markdown',
    direction: 'vertical',
    width: w,
    fill: theme.background,
    cornerRadius: 8,
    effect: { type: 'drop-shadow', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 2 }, blur: 8 },
  },
    showChrome ? h(AutoLayout, {
      direction: 'horizontal',
      width: 'fill-parent',
      padding: { horizontal: 12, vertical: 8 },
      fill: '#1a1a1a',
      cornerRadius: { topLeft: 8, topRight: 8, bottomLeft: 0, bottomRight: 0 },
      verticalAlignItems: 'center',
    },
      h(AutoLayout, { width: 'fill-parent' },
        h(Text, { fontSize: 13, fontWeight: 600, fill: '#a855f7' }, 'Md '),
        h(Text, { fontSize: 13, fill: '#fff' }, 'Perfect Markdown')
      ),
      h(AutoLayout, {
        padding: { horizontal: 10, vertical: 6 },
        fill: '#333',
        cornerRadius: 4,
        hoverStyle: { fill: '#444' },
        onClick: function() {
          return new Promise(function(resolve) {
            var esc = md.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            figma.showUI('<html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;padding:16px;height:100vh;display:flex;flex-direction:column;background:#f5f5f5}textarea{flex:1;width:100%;padding:12px;border:1px solid #ccc;border-radius:8px;font-family:monospace;font-size:13px;resize:none}button{margin-top:12px;padding:10px 20px;background:#0066ff;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px}</style></head><body><textarea id="e">' + esc + '</textarea><button onclick="parent.postMessage({pluginMessage:{t:\'s\',v:document.getElementById(\'e\').value}},\'*\')">Save</button></body></html>', { width: 500, height: 400 });
            figma.ui.onmessage = function(msg) {
              if (msg.t === 's') setMd(msg.v);
              figma.closePlugin();
              resolve();
            };
          });
        },
      },
        h(Text, { fontSize: 12, fill: '#fff' }, 'Edit')
      )
    ) : null,
    h(AutoLayout, {
      direction: 'vertical',
      width: 'fill-parent',
      padding: 20,
    }, children)
  );
}

figma.widget.register(PerfectMarkdown);
