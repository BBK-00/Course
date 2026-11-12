/* Structured rich text shared by the editor and the published lesson. */
export const FONTS = ['Arial', 'Georgia', 'Verdana', 'Times New Roman', 'Consolas'];
export const FONT_SIZES = [12, 14, 16, 18, 22, 28, 36];
export const CODE_LANGS = ['python', 'javascript', 'cpp', 'java', 'c'];
const TAGS = new Set('p div span h3 h4 h5 strong em u s br ul ol li a code blockquote table thead tbody tr th td'.split(' '));
const ALIGN = new Set(['left', 'center', 'right', 'justify']);
const LINE_HEIGHTS = new Set(['1.2', '1.5', '1.7', '2']);
const HEX = /^#[0-9a-f]{6}$/i;
const HTML = {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'};
const escape = value => String(value).replace(/[&<>"']/g, char => HTML[char]);

function safeLink(value) {
  try {
    const url = new URL(String(value).slice(0, 1200));
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
  } catch {}
  return '';
}

function cleanStyle(input) {
  const style = {};
  if (!input || typeof input !== 'object') return style;
  if (FONTS.includes(input.font)) style.font = input.font;
  const size = Number(input.size);
  if (Number.isInteger(size) && size >= 10 && size <= 48) style.size = size;
  if (HEX.test(input.color)) style.color = input.color;
  if (HEX.test(input.highlight)) style.highlight = input.highlight;
  if (ALIGN.has(input.align)) style.align = input.align;
  if (LINE_HEIGHTS.has(input.line)) style.line = input.line;
  if ([24, 48, 72, 96].includes(input.indent)) style.indent = input.indent;
  return style;
}

export function sanitizeDocument(input) {
  let textLeft = 8000, nodesLeft = 1400;
  function walk(value, depth) {
    if (!Array.isArray(value) || depth > 14) return [];
    const output = [];
    for (const node of value) {
      if (nodesLeft-- <= 0 || textLeft <= 0) break;
      if (typeof node === 'string') {
        const text = node.slice(0, textLeft);
        textLeft -= text.length;
        if (text) output.push(text);
        continue;
      }
      if (!node || !TAGS.has(node.tag)) continue;
      const clean = {tag: node.tag};
      const style = cleanStyle(node.style);
      if (Object.keys(style).length) clean.style = style;
      if (node.tag === 'a') {
        const href = safeLink(node.href);
        if (href) clean.href = href;
        else clean.tag = 'span';
      }
      if (node.tag !== 'br') clean.children = walk(node.children, depth + 1);
      output.push(clean);
    }
    return output;
  }
  return walk(input, 0);
}

export function documentText(document) {
  return (Array.isArray(document) ? document : []).map(node =>
    typeof node === 'string' ? node : documentText(node?.children)).join('');
}

export function renderDocument(input, {editing = false} = {}) {
  function render(nodes) {
    return nodes.map(node => {
      if (typeof node === 'string') return escape(node);
      if (node.tag === 'br') return '<br>';
      const style = node.style || {}, declarations = [];
      if (style.font) declarations.push('font-family:' + style.font);
      if (style.size) declarations.push('font-size:' + style.size + 'px');
      if (style.color) declarations.push('color:' + style.color);
      if (style.highlight) declarations.push('background-color:' + style.highlight);
      if (style.align) declarations.push('text-align:' + style.align);
      if (style.line) declarations.push('line-height:' + style.line);
      if (style.indent) declarations.push('margin-inline-start:' + style.indent + 'px');
      const css = declarations.length ? ' style="' + escape(declarations.join(';')) + '"' : '';
      const link = node.href ? ' href="' + escape(node.href) + '"' + (editing ? '' : ' target="_blank" rel="noopener noreferrer"') : '';
      return '<' + node.tag + css + link + '>' + render(node.children || []) + '</' + node.tag + '>';
    }).join('');
  }
  return render(sanitizeDocument(input));
}

export const IMAGE_CROPS = {original: 'auto', wide: '16 / 9', square: '1', portrait: '3 / 4'};
export function mediaLayout(block) {
  const layout = {width: 100, align: 'center', crop: 'original', x: 50, y: 50};
  const width = Number(block.width);
  if (Number.isFinite(width) && width >= 25 && width <= 100) layout.width = Math.round(width);
  if (['left', 'center', 'right'].includes(block.align)) layout.align = block.align;
  if (Object.hasOwn(IMAGE_CROPS, block.crop)) layout.crop = block.crop;
  for (const axis of ['x', 'y']) {
    const position = Number(block[axis]);
    if (Number.isFinite(position) && position >= 0 && position <= 100) layout[axis] = Math.round(position);
  }
  return layout;
}

export function mediaStyle(block) {
  const {width, align} = mediaLayout(block);
  const margins = {left: '0 auto 0 0', center: '0 auto', right: '0 0 0 auto'};
  return 'width:' + width + '%;margin:' + margins[align];
}

export function photoStyle(block) {
  const {crop, x, y} = mediaLayout(block);
  if (crop === 'original') return '';
  return 'width:100%;aspect-ratio:' + IMAGE_CROPS[crop] + ';object-fit:cover;object-position:' + x + '% ' + y + '%';
}
