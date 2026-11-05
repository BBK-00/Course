/* Есеп суреттері: шартты көрсететін қысқа анимациялы SVG (сызылады, белгілер бірінен соң бірі шығады). PyFig.make(түрі) → SVG элементі.
   Түрлері: rect-area, rect-perim, minus, share, clock. Анимация CSS арқылы (py-work.css, .pf-*); қозғалысты азайту параметрі ескеріледі. */
(function(){
'use strict';
const NS = 'http://www.w3.org/2000/svg';
const sv = (t, a, k) => { const e = document.createElementNS(NS, t); for (const n in a) e.setAttribute(n, a[n]); (k || []).forEach(c => e.append(c)); return e; };
const tx = (x, y, s, cls, d) => { const e = sv('text', { x, y, class:'pf-t ' + (cls || ''), 'text-anchor':'middle', style:'--d:' + (d || 0) + 's' }); e.textContent = s; return e; };

const KINDS = {
  'rect-area': () => [
    sv('rect', { x:70, y:22, width:180, height:84, rx:4, class:'pf-fill pf-fade', style:'--d:1.1s' }),
    sv('rect', { x:70, y:22, width:180, height:84, rx:4, class:'pf-line pf-draw', pathLength:1 }),
    tx(160, 124, 'a', 'pf-lab', 1.0), tx(264, 69, 'b', 'pf-lab', 1.4), tx(160, 71, 'S = ?', 'pf-q', 1.9)
  ],
  'rect-perim': () => [
    sv('rect', { x:70, y:22, width:180, height:84, rx:4, class:'pf-fill pf-fade', style:'--d:.6s' }),
    sv('rect', { x:70, y:22, width:180, height:84, rx:4, class:'pf-line pf-draw', pathLength:1 }),
    sv('rect', { x:62, y:14, width:196, height:100, rx:8, class:'pf-walk' }),
    tx(160, 128, 'a', 'pf-lab', 1.0), tx(272, 69, 'b', 'pf-lab', 1.4), tx(160, 71, 'P = ?', 'pf-q', 1.9)
  ],
  'minus': () => [
    sv('rect', { x:30, y:48, width:260, height:34, rx:6, class:'pf-fill pf-fade', style:'--d:.2s' }),
    sv('rect', { x:30, y:48, width:260, height:34, rx:6, class:'pf-line pf-draw', pathLength:1 }),
    sv('rect', { x:198, y:48, width:92, height:34, rx:6, class:'pf-cut pf-grow', style:'--d:1.2s' }),
    tx(160, 38, 'a', 'pf-lab', .8), tx(244, 70, 'b', 'pf-lab on-dark', 1.5), tx(114, 70, '?', 'pf-q', 2.1),
    sv('path', { d:'M30 92 q0 8 8 8 h60 q8 0 8 -8', class:'pf-brace pf-fade', style:'--d:1.9s' }), tx(76, 118, 'қалғаны', 'pf-cap', 2.1)
  ],
  'share': () => {
    const k = [];
    [0, 1, 2, 3].forEach(i => { const x = 40 + i * 62; k.push(sv('rect', { x, y:86, width:52, height:34, rx:6, class:'pf-box pf-fade', style:'--d:' + (1 + i * .25) + 's' }), tx(x + 26, 109, '?', 'pf-q', 1.2 + i * .25), sv('path', { d:'M160 52 L' + (x + 26) + ' 84', class:'pf-arrow pf-fade', style:'--d:' + (.9 + i * .25) + 's' })); });
    return [sv('rect', { x:60, y:12, width:200, height:34, rx:6, class:'pf-fill pf-fade', style:'--d:.1s' }), sv('rect', { x:60, y:12, width:200, height:34, rx:6, class:'pf-line pf-draw', pathLength:1 }), tx(160, 35, 'n', 'pf-lab', .6), ...k, tx(160, 142, 'k бала', 'pf-cap', 2.2)];
  },
  'clock': () => [
    sv('circle', { cx:100, cy:76, r:46, class:'pf-fill pf-fade', style:'--d:.1s' }),
    sv('circle', { cx:100, cy:76, r:46, class:'pf-line pf-draw', pathLength:1 }),
    sv('line', { x1:100, y1:76, x2:100, y2:42, class:'pf-hand' }), sv('circle', { cx:100, cy:76, r:3.5, class:'pf-dot' }),
    tx(100, 26, 'N сек', 'pf-lab', .8), sv('path', { d:'M160 76 H206', class:'pf-arrow pf-fade', style:'--d:1.2s' }),
    tx(262, 70, '? мин', 'pf-q', 1.6), tx(262, 98, '? сек', 'pf-q', 2.0)
  ]
};

window.PyFig = {
  make(kind){
    const f = KINDS[kind]; if (!f) return null;
    const svg = sv('svg', { viewBox:'0 0 320 150', class:'pf-svg', role:'img', 'aria-label':'Есептің суреті' }, f());
    const box = document.createElement('div'); box.className = 'pf-box-wrap'; box.append(svg);
    const again = document.createElement('button'); again.type = 'button'; again.className = 'pf-again'; again.textContent = '↺'; again.title = 'Анимацияны қайта көрсету'; again.setAttribute('aria-label', 'Анимацияны қайта көрсету');
    again.addEventListener('click', () => { const old = box.querySelector('svg'), c = old.cloneNode(true); old.replaceWith(c); });
    box.append(again);
    return box;
  }
};
})();
