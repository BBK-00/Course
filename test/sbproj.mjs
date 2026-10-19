import { zip } from '../src/xlsx.js';

/* Scratch 3 блок құрастырғыш: тізбек пен ішкі блоктар */
let n = 0;
export function project({ cut = [], costumes = 2, sounds = 1, seed = 'a' } = {}) {
  const blocks = {}, id = () => seed + (++n);
  const add = (opcode, o = {}) => { const k = id(); blocks[k] = { opcode, next: null, parent: null, inputs: o.inputs || {}, fields: o.fields || {}, topLevel: !!o.top, shadow: false }; return k; };
  const chain = ids => { ids.forEach((k, i) => { if (ids[i + 1]) { blocks[k].next = ids[i + 1]; blocks[ids[i + 1]].parent = k; } }); return ids[0]; };
  const lit = (v, t = 4) => [1, [t, String(v)]];
  const sub = k => [2, k];
  const on = c => !cut.includes(c);
  const sprite = (name, extra = {}) => ({ isStage: false, name, blocks, costumes: new Array(extra.costumes || 1).fill({}), sounds: new Array(extra.sounds || 0).fill({}) });
  const keyScript = (key, op, field, v) => { const m = add(op, { inputs: { [field]: lit(v) } }); const h = add('event_whenkeypressed', { fields: { KEY_OPTION: [key, null] }, top: true }); chain([h, m]); };
  if (on('keys')) { keyScript('up arrow', 'motion_changeyby', 'DY', 10); keyScript('down arrow', 'motion_changeyby', 'DY', -10); keyScript('left arrow', 'motion_changexby', 'DX', -10); keyScript('right arrow', 'motion_changexby', 'DX', 10); }
  if (on('obst')) {
    const up = chain([add('motion_changeyby', { inputs: { DY: lit(10) } }), add('control_wait', { inputs: { DURATION: lit(0.05) } }), add('looks_nextcostume')]);
    const dn = chain([add('motion_changeyby', { inputs: { DY: lit(-10) } }), add('control_wait', { inputs: { DURATION: lit(0.05) } }), add('looks_nextcostume')]);
    const r1 = add('control_repeat', { inputs: { TIMES: lit(20), SUBSTACK: sub(up) } }), r2 = add('control_repeat', { inputs: { TIMES: lit(20), SUBSTACK: sub(dn) } });
    const fo = add('control_forever', { inputs: { SUBSTACK: sub(chain([r1, r2])) } });
    chain([add('event_whenflagclicked', { top: true }), add('motion_gotoxy', { inputs: { X: lit(0), Y: lit(-100) } }), fo]);
  }
  if (on('until')) {
    const loop = (menu, msg) => {
      const mn = add('sensing_touchingobjectmenu', { fields: { TOUCHINGOBJECTMENU: [menu, null] } });
      const tc = add('sensing_touchingobject', { inputs: { TOUCHINGOBJECTMENU: [1, mn] } });
      const body = chain([add('control_wait', { inputs: { DURATION: lit(0.1) } })]);
      const ru = add('control_repeat_until', { inputs: { CONDITION: sub(tc), SUBSTACK: sub(body) } });
      chain([add('event_whenflagclicked', { top: true }), ru, add('looks_sayforsecs', { inputs: { MESSAGE: lit(msg, 10), SECS: lit(1) } }), add('sound_playuntildone'), add('control_stop', { fields: { STOP_OPTION: ['all', null] } })]);
    };
    loop('Мәре', 'Жеңдің!'); loop('Кедергі', 'Қайта байқап көр!');
  }
  return { targets: [{ isStage: true, name: 'Stage', blocks: {}, costumes: [{}], sounds: [] }, sprite('Ойыншы', { costumes }), sprite('Кедергі', { costumes, sounds }), sprite('Мәре')] };
}
export const sb3 = pj => zip({ 'project.json': JSON.stringify(pj) });
