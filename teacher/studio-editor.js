import {FONTS, FONT_SIZES, CODE_LANGS, renderDocument, sanitizeDocument} from '../assets/studio-format.js';

function element(tag, label, className) {
  const node = document.createElement(tag);
  if (label) node.textContent = label;
  if (className) node.className = className;
  return node;
}

function button(label, title, action) {
  const node = element('button', label);
  node.type = 'button';
  node.title = title;
  node.setAttribute('aria-label', title);
  node.addEventListener('click', action);
  return node;
}

function select(label, options, value, action) {
  const node = element('select');
  node.setAttribute('aria-label', label);
  node.title = label;
  for (const [key, text] of options) node.add(new Option(text, key));
  node.value = value;
  node.addEventListener('change', () => action(node.value));
  return node;
}

function hexColor(value) {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  const match = /^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\)$/.exec(value);
  return match ? '#' + match.slice(1).map(n => Number(n).toString(16).padStart(2, '0')).join('') : '';
}

function fontSize(value) {
  const match = /^(\d+(?:\.\d+)?)(px|pt)$/.exec(value);
  return match ? Math.round(Number(match[1]) * (match[2] === 'pt' ? 4 / 3 : 1)) : 0;
}

function readDocument(root) {
  let left = 1800;
  const aliases = {b: 'strong', i: 'em', strike: 's', font: 'span', h1: 'h3', h2: 'h3', h6: 'h5', pre: 'p'};
  const discard = new Set(['script', 'style', 'iframe', 'object', 'embed', 'img', 'svg', 'input', 'form', 'meta', 'link']);
  const supported = new Set('p div span h3 h4 h5 strong em u s br ul ol li a code blockquote table thead tbody tr th td'.split(' '));
  function walk(parent, depth) {
    if (depth > 14) return [];
    const list = [];
    for (const node of parent.childNodes) {
      if (left-- <= 0) break;
      if (node.nodeType === Node.TEXT_NODE) {
        list.push(node.data);
        continue;
      }
      if (node.nodeType !== Node.ELEMENT_NODE || discard.has(node.localName)) continue;
      const name = node.localName;
      let children = walk(node, depth + 1);
      const tag = Object.hasOwn(aliases, name) ? aliases[name] : name;
      if (!supported.has(tag)) {
        list.push(...children);
        continue;
      }
      const css = node.style;
      const font = (css.fontFamily || node.getAttribute('face') || '').split(',')[0].trim().replace(/["']/g, '');
      const htmlSize = Number(node.getAttribute('size'));
      const style = {
        font: FONTS.find(value => value.toLowerCase() === font.toLowerCase()),
        size: fontSize(css.fontSize) || FONT_SIZES[htmlSize - 1],
        color: hexColor(css.color || node.getAttribute('color') || ''),
        highlight: hexColor(css.backgroundColor),
        align: css.textAlign || node.getAttribute('align'),
        line: css.lineHeight,
        indent: parseInt(css.marginInlineStart || css.marginLeft, 10)
      };
      if (css.fontWeight === 'bold' || Number(css.fontWeight) >= 600) children = [{tag: 'strong', children}];
      if (css.fontStyle === 'italic') children = [{tag: 'em', children}];
      if (css.textDecorationLine.includes('underline')) children = [{tag: 'u', children}];
      const entry = {tag, style, children};
      if (tag === 'a') entry.href = node.getAttribute('href');
      list.push(entry);
    }
    return list;
  }
  return sanitizeDocument(walk(root, 0));
}

function oldDocument(value) {
  const inline = text => {
    const nodes = [];
    const pattern = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    let end = 0;
    for (const match of text.matchAll(pattern)) {
      nodes.push(text.slice(end, match.index));
      if (match[1]) nodes.push({tag: 'strong', children: [match[1]]});
      else if (match[2]) nodes.push({tag: 'code', children: [match[2]]});
      else nodes.push({tag: 'a', href: match[4], children: [match[3]]});
      end = match.index + match[0].length;
    }
    nodes.push(text.slice(end));
    return nodes;
  };
  return String(value || '').split(/\n{2,}/).filter(Boolean).map(paragraph => {
    const lines = paragraph.split('\n');
    const bullet = /^\s*[-•]\s+/;
    const numbered = /^\s*\d+[.)]\s+/;
    const marker = lines.every(line => bullet.test(line)) ? bullet : lines.every(line => numbered.test(line)) ? numbered : null;
    if (marker) return {tag: marker === bullet ? 'ul' : 'ol', children: lines.map(line => ({tag: 'li', children: inline(line.replace(marker, ''))}))};
    return {tag: 'p', children: lines.flatMap((line, index) => [...(index ? [{tag:'br'}] : []), ...inline(line)])};
  });
}

export function richEditor(block, onChange, linkDialog) {
  const shell = element('div', '', 'st-rich');
  const toolbar = element('div', '', 'st-rich-toolbar');
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Мәтінді пішімдеу');
  const editor = element('div', '', 'st-rich-body sl-text');
  editor.contentEditable = 'true';
  editor.setAttribute('role', 'textbox');
  editor.setAttribute('aria-label', 'Сабақ мәтіні');
  editor.setAttribute('aria-multiline', 'true');
  editor.innerHTML = renderDocument(block.doc || oldDocument(block.text), {editing: true});
  let selection;
  const remember = () => {
    const current = window.getSelection();
    if (current.rangeCount && editor.contains(current.getRangeAt(0).commonAncestorContainer)) selection = current.getRangeAt(0).cloneRange();
  };
  const focus = () => {
    const saved = selection;
    editor.focus();
    if (!saved || !editor.contains(saved.commonAncestorContainer)) return;
    const current = window.getSelection();
    current.removeAllRanges();
    current.addRange(saved);
  };
  const change = () => {
    block.doc = readDocument(editor);
    remember();
    onChange();
  };
  const command = (name, value) => {
    focus();
    document.execCommand(name, false, value);
    change();
  };
  const paragraphStyle = (key, value) => {
    focus();
    const range = window.getSelection().rangeCount ? window.getSelection().getRangeAt(0) : null;
    let rows = range ? [...editor.querySelectorAll('p,div,h3,h4,h5,li,blockquote')].filter(node => range.intersectsNode(node)) : [];
    if (!rows.length) {
      document.execCommand('formatBlock', false, 'p');
      const row = window.getSelection().anchorNode?.parentElement?.closest('p');
      if (row && editor.contains(row)) rows = [row];
    }
    rows.forEach(row => { row.style[key] = value; });
    change();
  };
  for (const event of ['keyup', 'pointerup', 'focus']) editor.addEventListener(event, remember);
  editor.addEventListener('input', change);
  editor.addEventListener('click', event => {
    if (event.target.closest('a')) event.preventDefault();
  });
  editor.addEventListener('paste', event => {
    if ([...event.clipboardData.files].some(file => file.type.startsWith('image/'))) return;
    event.preventDefault();
    remember();
    const html = event.clipboardData.getData('text/html');
    if (!html) {
      command('insertText', event.clipboardData.getData('text/plain').slice(0, 8000));
      return;
    }
    const fragment = document.createElement('template');
    fragment.innerHTML = html.slice(0, 160000);
    command('insertHTML', renderDocument(readDocument(fragment.content), {editing: true}));
  });
  editor.addEventListener('drop', event => {
    if (!event.dataTransfer.files.length) {
      event.preventDefault();
      command('insertText', event.dataTransfer.getData('text/plain').slice(0, 8000));
    }
  });
  const control = (name, label, title, value) => button(label, title, () => command(name, value));
  const colors = (label, name, initial) => {
    const node = element('input');
    node.type = 'color';
    node.value = initial;
    node.title = label;
    node.setAttribute('aria-label', label);
    node.addEventListener('change', () => command(name, node.value));
    return node;
  };
  const more = element('div', '', 'st-rich-more');
  more.hidden = true;
  const expand = button('⋯', 'Қосымша пішімдеу', () => {
    more.hidden = !more.hidden;
    expand.setAttribute('aria-expanded', String(!more.hidden));
  });
  expand.setAttribute('aria-expanded', 'false');
  toolbar.append(
    select('Қаріп', [['', 'Қаріп'], ...FONTS.map(name => [name, name])], '', value => {
      if (value) command('fontName', value);
      toolbar.querySelector('[aria-label="Қаріп"]').value = '';
    }),
    select('Қаріп өлшемі', [['', 'Өлшем'], ...FONT_SIZES.map((size, index) => [String(index + 1), size + ' px'])], '', value => {
      if (value) command('fontSize', value);
      toolbar.querySelector('[aria-label="Қаріп өлшемі"]').value = '';
    }),
    control('bold', 'B', 'Қалың'), control('italic', 'I', 'Көлбеу'), control('underline', 'U', 'Асты сызылған'),
    button('🔗', 'Сілтеме қосу', () => linkDialog(url => command('createLink', url))),
    expand
  );
  more.append(
    select('Тақырып деңгейі', [['p', 'Абзац'], ['h3', 'Тақырып'], ['h4', 'Кіші тақырып']], 'p', value => command('formatBlock', value)),
    colors('Мәтін түсі', 'foreColor', '#172033'), colors('Ерекшелеу түсі', 'hiliteColor', '#fff1bc'),
    control('insertUnorderedList', '•', 'Маркерлі тізім'), control('insertOrderedList', '1.', 'Нөмірленген тізім'),
    select('Туралау', [['justifyLeft','Солға'], ['justifyCenter','Ортаға'], ['justifyRight','Оңға'], ['justifyFull','Екі жаққа']], 'justifyLeft', value => command(value)),
    select('Жол аралығы', [['1.2','1.2'], ['1.5','1.5'], ['1.7','1.7'], ['2','2']], '1.7', value => paragraphStyle('lineHeight', value)),
    select('Шегініс', [['0','Шегініссіз'], ['24','24 px'], ['48','48 px'], ['72','72 px'], ['96','96 px']], '0', value => paragraphStyle('marginInlineStart', value + 'px')),
    button('T', 'Жай мәтін ретінде қою', async () => {
      try { command('insertText', (await navigator.clipboard.readText()).slice(0, 8000)); }
      catch { focus(); }
    }),
    control('removeFormat', 'Tx', 'Таңдалған мәтіннің пішімін тазарту'),
    control('undo', '↶', 'Мәтін өзгерісін қайтару'), control('redo', '↷', 'Мәтін өзгерісін қайталау')
  );
  for (const bar of [toolbar, more]) {
    bar.addEventListener('pointerdown', event => {
      remember();
      if (event.target.closest('button')) event.preventDefault();
    });
  }
  shell.append(toolbar, more, editor);
  return shell;
}

export function codeEditor(block, onChange, run, {fixedLanguage = false} = {}) {
  const shell = element('div', '', 'st-code-editor');
  const canvas = element('div');
  const editor = window.CodeEditor.create(canvas, {
    lang: block.lang || 'python',
    value: block.code || '',
    allowPaste: true,
    onChange: value => {
      if (block.code === value) return;
      block.code = value;
      onChange();
    }
  });
  const output = element('pre', '', 'st-console');
  output.hidden = true;
  output.setAttribute('aria-live', 'polite');
  const input = element('input', '', 'st-field');
  input.placeholder = 'Мән енгізіп, Enter басыңыз';
  input.setAttribute('aria-label', 'Консольге енгізу');
  input.maxLength = 150;
  input.hidden = true;
  const stdin = element('textarea', '', 'st-field st-code-stdin');
  stdin.placeholder = 'Сынақ мәндерін жеке жолдарға жазыңыз';
  stdin.setAttribute('aria-label', 'Сынақ енгізуі');
  stdin.rows = 2;
  stdin.maxLength = 2000;
  stdin.hidden = (block.lang || 'python') === 'python';
  const names = {python: 'Python', javascript: 'JavaScript', cpp: 'C++', java: 'Java', c: 'C'};
  const lang = select('Бағдарламалау тілі', CODE_LANGS.map(key => [key, names[key]]), block.lang || 'python', value => {
    block.lang = value;
    editor.setLang(value);
    stdin.hidden = value === 'python';
    onChange();
  });
  let inputs = [], code = '', language = 'python';
  const execute = async () => {
    runButton.disabled = true;
    input.hidden = true;
    output.hidden = false;
    output.textContent = 'Орындалып жатыр…';
    const result = await run({code, language, inputs});
    runButton.disabled = false;
    if (!result.ok) {
      output.textContent = result.error === 'unavailable' ? 'Орындау қызметі уақытша қолжетімсіз. Қайта көріңіз.' : 'Кодты орындау мүмкін болмады.';
      return;
    }
    const {stdout, stderr, need} = result.run;
    output.textContent = stdout + (stderr ? '\n' + stderr : '') || (need ? 'Бағдарлама мән күтіп тұр.' : 'Бағдарлама аяқталды. Шығыс бос.');
    if (need && inputs.length < 16) {
      input.hidden = false;
      input.value = '';
      input.focus();
    }
  };
  const runButton = button('▶ Орындау', 'Кодты орындау', () => {
    code = editor.getValue().trimEnd();
    if (!code.trim()) {
      output.hidden = false;
      output.textContent = 'Алдымен код жазыңыз.';
      return;
    }
    language = lang.value;
    inputs = language === 'python' ? [] : stdin.value.split('\n');
    execute();
  });
  runButton.className = 'st-btn st-primary';
  const copy = button('Көшіру', 'Кодты көшіру', async () => {
    try { await navigator.clipboard.writeText(editor.getValue()); copy.textContent = 'Көшірілді'; }
    catch { editor.focus(); editor.ta.select(); }
  });
  copy.className = 'st-btn';
  input.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || runButton.disabled) return;
    event.preventDefault();
    inputs.push(input.value);
    execute();
  });
  const bar = element('div', '', 'st-code-toolbar');
  bar.append(fixedLanguage ? element('b', 'Python') : lang, copy, runButton);
  shell.append(bar, canvas, stdin, output, input);
  return shell;
}
