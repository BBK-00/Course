/* Shared teacher-facing catalog. Add a subject or lesson here. Historical grading remains on the server. */
(function(){
'use strict';
const SUBJ = [
  { id: 'sm', name: 'Сандық әдістер', ico: '∑', topics: [
    { id: '6', n: 6, title: 'Гаусс–Зейдель әдісі', path: '/sandyq-adister/06-gauss-seidel', min: 30, tasks: 3, att: 40, ai: true },
    { id: '7', n: 7, title: 'Функцияны аппроксимациялау', path: '/sandyq-adister/07-approksimaciya', min: 35, tasks: 3, att: 40, ai: true }] },
  { id: 'akt', name: 'АКТ', ico: '💻', topics: [
    { id: 'A2', n: 2, title: 'Компьютер архитектурасы', path: '/akt/02-kompyuter', min: 60, tasks: 4, att: 30 },
    { id: '10', n: 10, title: 'Excel: сілтеме түрлері', path: '/akt/10-silteme-turleri', min: 60, tasks: 3, att: 40 },
    { id: 'A13', n: 13, title: 'Мультимедиа: куиз-презентация', path: '/akt/13-multimedia', min: 50, tasks: 3, att: 30 }] },
  { id: 'sb', name: 'Scratch', ico: '🎮', topics: [
    { id: 'S7', n: 7, title: 'Циклдер: «Кедергіден өт»', path: '/scratch/07-ciklder', min: 50, tasks: 3, att: 40 }] },
  { id: 'py', name: 'Python', ico: '🐍', topics: [
    { id: 'P4', n: 4, title: 'Арифметикалық операторлар', path: '/python/04-arifmetika', min: 50, tasks: 5, tl: [1, 2, 3, 4, 5], att: 0, py: true },
    { id: 'P7', n: 7, title: 'if шарты операторы', path: '/python/07-if-operatory', min: 60, tasks: 4, att: 0, py: true },
    { id: 'P8', n: 8, title: 'if–else және elif', path: '/python/08-if-else-elif', min: 60, tasks: 3, att: 0, py: true },
    { id: 'P9', n: 9, title: 'Құрамды шарттар: and, or, not', path: '/python/09-kuramdy-shart', min: 54, tasks: 5, tl: [1, 2, 3, 4, 5], att: 0, py: true },
    { id: 'P10', n: 10, title: 'Кірістірілген шарттар', path: '/python/10-kiristirilgen-shart', min: 54, tasks: 5, tl: [1, 2, 3, 4, 5], att: 0, py: true },
    { id: 'P12', n: 12, title: 'for циклі және range()', path: '/python/12-for-range', min: 60, tasks: 4, att: 0, py: true }] }
];
const taskMeta = {
  P4: { 1:{title:'Жылдам есептер',max:15,min:7}, 2:{title:'Есепті кодқа айналдыр',max:30,min:22}, 3:{title:'Өрнекті Python-да жаз',max:20,min:15}, 4:{title:'Қорытынды тест',max:10,min:5}, 5:{title:'Үй жұмысы',max:25} },
  P7: { 1:{title:'Шағын есептер',max:20},2:{title:'Практикалық есептер',max:40},3:{title:'Қатені тап',max:20},4:{title:'Тест',max:20} },
  P9: { 1:{title:'Үлгі бойынша есеп',max:25,min:20,desc:'3 код есебі'},2:{title:'Қатені түзет',max:20,min:12,desc:'4 қателі код'},3:{title:'Қызық: төреші',max:20,min:15,desc:'1 қызық есеп'},4:{title:'Қорытынды тест',max:10,min:7,desc:'5 сұрақ'},5:{title:'Үй жұмысы',max:25} },
  P10: { 1:{title:'Үлгі бойынша есеп',max:25,min:20,desc:'3 код есебі'},2:{title:'Қатені түзет',max:20,min:12,desc:'4 қателі код'},3:{title:'Қызық: квест',max:20,min:15,desc:'1 қызық есеп'},4:{title:'Қорытынды тест',max:10,min:7,desc:'5 сұрақ'},5:{title:'Үй жұмысы',max:25} },
  P12: { 1:{title:'Қарапайым есептер',max:20,min:15,desc:'5 есеп'},2:{title:'Математикалық есептер',max:30,min:20,desc:'3 есеп'},3:{title:'Цикл және шарт',max:30,min:15,desc:'2 есеп'},4:{title:'Аралас тест',max:20,min:10,desc:'10 сұрақ'} },
  P8: { 1:{title:'Код есептері',max:30},2:{title:'Жұптық сандық',max:25},3:{title:'Тест',max:20} }
};
const topicQuestions={P9:['and, or, not қашан ақиқат болады?','a == 1 or 2 деген жазу неге қате?','Шарттардың орындалу реті қандай?'],P10:['else қай if-ке жатады?','Кірістірілген шарт қашан тексеріледі?','Кірістірілген шартты and арқылы қалай жазамыз?'],P4:['/ және // амалдарының айырмашылығы қандай?','input() қандай типті мән береді және оны санға қалай айналдырамыз?','Жақша мен дәреже өрнектің орындалу ретіне қалай әсер етеді?'],P7:['if блогы қашан орындалады?','Python-да шегініс пен қос нүкте не үшін қажет?','Салыстырудағы == және мән берудегі = айырмасы қандай?'],P8:['if–else және elif қандай жағдайда қолданылады?','Бірнеше elif шарты ақиқат болса, қай тармақ орындалады?','Шарттардың реті нәтижеге қалай әсер етеді?']};
window.TeacherLessons = { subjects: SUBJ, tasks: taskMeta, questions: topicQuestions };
topicQuestions.P12 = ['range(1, 6) қандай сандар береді және неге?', 'Санауышқа 1, қосындыға i қосудың айырмасы қандай?', 'if циклдің ішінде тұрса, шарт қашан тексеріледі?'];
})();
