/* Evidence-based teaching signals; percentages refer only to submitted answers. */
(function(){
  function insights(data){
    const items=(data.allItems||data.items||[]).filter(i=>i.sent>0).map(i=>({
      ...i,unresolved:i.unresolved??Math.round(i.sent*(1-(i.firstPass||0)/100)),
      firstCorrect:i.firstCorrect??Math.round(i.sent*(i.firstPass||0)/100),corrected:i.corrected||0
    }));
    const hard=items.filter(i=>i.unresolved>0).sort((a,b)=>b.unresolved-a.unresolved||b.unresolved/b.sent-a.unresolved/a.sent||a.id-b.id);
    const alerts=hard.filter(i=>i.sent>=Math.max(3,Math.ceil((data.present||0)*.5))&&i.unresolved>=2&&i.unresolved/i.sent>=.4);
    return {items,hard,alerts,first:items.reduce((n,i)=>n+i.firstCorrect,0),fixed:items.reduce((n,i)=>n+i.corrected,0),wrong:items.reduce((n,i)=>n+i.unresolved,0),answers:items.reduce((n,i)=>n+i.sent,0)};
  }
  function render(host,data,{h,btn,people,showItems}){
    const report=insights(data),title=i=>(i.label||i.task+'.'+i.index)+' · '+i.title;
    const root=h('div',{class:'visual-analysis'});
    const metrics=h('div',{class:'va-metrics'});
    for(const [label,value,note]of [['Қатысқан',data.present||0,'студент'],['Жауап берген',(data.students||[]).length,'студент'],['Қате түзеткен',(data.students||[]).filter(s=>s.fixed>0).length,'студент'],['Тексерілген',report.answers,'жауап']])metrics.append(h('div',{},[h('span',{text:label}),h('strong',{text:value}),h('small',{text:note})]));
    root.append(metrics);
    const top=report.alerts[0];
    const alert=h('section',{class:'va-alert '+(top?'warn':'calm'),'aria-label':'Оқытушыға қысқа қорытынды'});
    alert.append(h('span',{class:'va-alert-icon',text:top?'!':'✓','aria-hidden':'true'}));
    const copy=h('div');
    if(top){
      copy.append(h('b',{text:top.unresolved/top.sent>=.5?'Назар аударыңыз · қайта түсіндіріңіз':'Назар аударыңыз · бірге талдаңыз'}),h('p',{text:title(top)+' — жауап берген '+top.sent+' студенттің '+top.unresolved+'-і әлі толық шығара алмады.'}),h('small',{text:top.skills?.[0]?.tip||'Осы есептің шығару жолын бір мысалмен қайта көрсетіп, ұқсас қысқа есеп беріңіз.'}));
      alert.append(copy,btn('Қиналғандар · '+top.unresolved,()=>people(top.id),'sm'));
    }else{
      copy.append(h('b',{text:report.hard.length?'Жеке қателерді қарап шығыңыз':report.answers?'Тапсырылған жауаптарда қате қалмады':'Алғашқы жауаптарды күтіп тұрмыз'}),h('p',{text:report.hard.length?'Жеке қателер төменде көрсетілген. Жауап көбейген сайын қорытынды нақтыланады.':report.answers?'Қалған студенттердің жауаптарын күтіңіз немесе келесі тапсырмаға өтіңіз.':'Студенттер жауап жібергенде қиын есептер мен қысқа ұсыныс осы жерде шығады.'}));alert.append(copy);
    }
    root.append(alert);
    const grid=h('div',{class:'va-grid'}),chart=h('section',{class:'card va-chart'},[h('div',{class:'row'},[h('h2',{text:'Қай есептен қиналды?'}),h('span',{class:'sp'}),btn('Барлық есептер',showItems,'sm')]),h('p',{class:'sub',text:'Алғашқы жауап → қатені түзету → қазіргі нәтиже. Әр жолда сол есепке жауап берген студенттер ғана есептеледі.'})]);
    const ranked=report.hard.length?report.hard:report.items;
    ranked.slice(0,5).forEach(i=>{
      const row=h('div',{class:'va-item'}),head=h('div',{class:'va-item-head'},[h('b',{text:title(i)}),h('span',{text:i.unresolved+'/'+i.sent+' қате қалды'})]);
      const bar=h('div',{class:'va-stack',role:'img','aria-label':i.firstCorrect+' бірден дұрыс, '+i.corrected+' түзетті, '+i.unresolved+' қате қалды'});
      for(const [n,cls]of [[i.firstCorrect,'first'],[i.corrected,'fixed'],[i.unresolved,'wrong']])if(n)bar.append(h('span',{class:cls,style:'width:'+(n/i.sent*100)+'%'}));
      row.append(head,bar,h('div',{class:'va-item-foot'},[h('small',{text:'Қатысқан '+(data.present||0)+' студенттің '+i.sent+'-і жіберді'}),i.unresolved?btn('Кімдер?',()=>people(i.id),'sm'):'']));chart.append(row);
    });
    if(!ranked.length)chart.append(h('div',{class:'analysis-empty',text:'Әзірге жауап жоқ.'}));
    const legend=h('div',{class:'va-legend'},[['first','Бірден дұрыс'],['fixed','Түзетті'],['wrong','Қате қалды']].map(([cls,text])=>h('span',{},[h('i',{class:cls}),text])));chart.append(legend);
    const summary=h('section',{class:'card va-chart'},[h('h2',{text:'Жауаптардың жалпы көрінісі'}),h('p',{class:'sub',text:'Есептер бойынша жауап саны. Бір студент бірнеше жауап бере алады.'})]);
    const pct=report.answers?report.first/report.answers*100:0,fixPct=report.answers?report.fixed/report.answers*100:0;
    const ring=h('div',{class:'va-ring',role:'img','aria-label':report.first+' бірден дұрыс, '+report.fixed+' түзетілді, '+report.wrong+' қате қалды',style:report.answers?'background:conic-gradient(#319581 0 '+pct+'%,#5c83e8 '+pct+'% '+(pct+fixPct)+'%,#edab57 '+(pct+fixPct)+'% 100%)':''},h('div',{},[h('strong',{text:report.answers||'—'}),h('small',{text:'жауап'})]));
    summary.append(h('div',{class:'va-ring-row'},[ring,h('div',{class:'va-totals'},[['first',report.first,'Бірден дұрыс'],['fixed',report.fixed,'Кейін түзетілді'],['wrong',report.wrong,'Қате қалды']].map(([cls,n,label])=>h('div',{},[h('i',{class:cls}),h('b',{text:n}),h('span',{text:label})])))]));
    if(data.ops?.length){
      summary.append(h('h3',{class:'va-small-title',text:(data.ops.length===7?'7 амал':'Концепттер')+' · алғашқы жауаптардың дұрыстығы'}));
      const ops=h('div',{class:'va-ops'});
      data.ops.forEach(o=>{const col=h('div',{title:o.name+' · '+(o.answers?o.correct+'/'+o.answers+' дұрыс':'әлі жауап жоқ')},[h('small',{text:o.answers?o.pct+'%':'—'}),h('div',{class:'va-op-track'},h('i',{style:'height:'+(o.pct||0)+'%;background:'+(o.pct>=75?'#319581':o.pct>=50?'#5c83e8':'#edab57')})),h('b',{text:o.sym})]);ops.append(col);});summary.append(ops);
    }
    grid.append(chart,summary);root.append(grid);
    if(data.tasks?.length){
      const per=h('section',{class:'va-tasks','aria-label':'Тапсырмалар бойынша талдау'},[h('h2',{text:'Тапсырмалар бойынша'}),h('p',{class:'sub',text:'Әр тапсырманың орташа баллы және есептері: бірден дұрыс, кейін түзетілген, қате қалған.'})]);
      const cards=h('div',{class:'va-task-grid'});
      data.tasks.forEach(t=>{
        const list=report.items.filter(i=>i.task===t.n),tone=t.pct===null?'':t.pct>=75?'good':t.pct>=50?'mid':'low';
        const card=h('article',{class:'card va-task'},[h('div',{class:'va-task-head'},[h('span',{class:'va-task-n',text:t.n}),h('b',{text:t.title}),h('span',{class:'sp'}),h('strong',{class:'va-task-pct '+tone,text:t.pct===null?'—':t.pct+'%'})]),
          h('div',{class:'va-task-bar',role:'img','aria-label':'Орташа балл '+(t.avg??'—')+' / '+t.max},h('i',{class:tone,style:'width:'+(t.pct||0)+'%'})),
          h('small',{class:'va-task-sub',text:t.sent?'Орташа '+t.avg+' / '+t.max+' балл · жіберген '+t.sent+' студент'+(t.fixed?' · қатесін түзеткен '+t.fixed:''):'Әзірге жауап жоқ'})]);
        list.forEach(i=>{const row=h('div',{class:'va-item'}),stack=h('div',{class:'va-stack',role:'img','aria-label':i.firstCorrect+' бірден дұрыс, '+i.corrected+' түзетті, '+i.unresolved+' қате қалды'});
          for(const [n,cls]of [[i.firstCorrect,'first'],[i.corrected,'fixed'],[i.unresolved,'wrong']])if(n)stack.append(h('span',{class:cls,style:'width:'+(n/i.sent*100)+'%'}));
          row.append(h('div',{class:'va-item-head'},[h('b',{text:title(i)}),h('span',{text:i.firstCorrect+i.corrected+'/'+i.sent+' дұрыс'})]),stack);card.append(row);});
        cards.append(card);
      });
      per.append(cards,legend.cloneNode?legend.cloneNode(true):legend);root.append(per);
    }

    const extra=report.alerts.slice(1,3);
    if(extra.length)root.append(h('details',{class:'va-more'},[h('summary',{text:'Тағы '+extra.length+' есепке назар аударыңыз'}),...extra.map(i=>h('div',{class:'va-extra'},[h('span',{text:title(i)+' · '+i.unresolved+'/'+i.sent+' студент қиналды'}),btn('Кімдер?',()=>people(i.id),'sm')]))]));
    host.append(root);
  }
  window.TeacherAnalysis={insights,render};
})();
