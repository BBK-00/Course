import { zip } from '../src/xlsx.js';

const NEEDS = { 1: ['img', 'vid'], 2: ['aud'], 3: ['img'], 4: ['aud'], 5: ['img'], 6: ['img'], 7: ['aud'], 8: ['img'], 9: ['img', 'aud'], 10: ['img'] };
const FILE = { img: 'image', aud: 'audio', vid: 'video' }, EXT = { img: 'jpg', aud: 'mp3', vid: 'mp4' }, BIG = 'x'.repeat(3000);

export function pptx({ author = 'Абдолла Жангүл', cut = [], noReveal = [], slides = 10, tiny = false } = {}) {
  const f = {};
  f['ppt/presentation.xml'] = '<p:presentation xmlns:p="p"><p:sldIdLst>' + Array.from({ length: slides }, (_, i) => '<p:sldId id="' + (256 + i) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</p:sldIdLst></p:presentation>';
  f['ppt/_rels/presentation.xml.rels'] = '<Relationships>' + Array.from({ length: slides }, (_, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://x/slide" Target="slides/slide' + (i + 1) + '.xml"/>').join('') + '</Relationships>';
  for (let n = 1; n <= slides; n++) {
    const t = (n === 1 ? author + '. ' : '') + n + '-сұрақ: бұл не? Дұрыс жауабын тап.';
    f['ppt/slides/slide' + n + '.xml'] = '<p:sld><p:cSld><p:spTree><a:p><a:r><a:t>' + t + '</a:t></a:r></a:p></p:spTree></p:cSld>' + (noReveal.includes(n) ? '' : '<p:timing><p:cTn nodeType="clickEffect"/></p:timing>') + '</p:sld>';
    const kinds = NEEDS[n].filter(k => !cut.includes(n + k)), rels = kinds.map((k, i) => { const nm = FILE[k] + n + '.' + EXT[k]; f['ppt/media/' + nm] = tiny ? 'x' : BIG + n; return '<Relationship Id="r' + i + '" Type="http://x/' + FILE[k] + '" Target="../media/' + nm + '"/>'; });
    f['ppt/slides/_rels/slide' + n + '.xml.rels'] = '<Relationships>' + rels.join('') + '</Relationships>';
  }
  return zip(f).buffer;
}
