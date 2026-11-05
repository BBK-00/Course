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
    { id: 'P8', n: 8, title: 'if–else және elif', path: '/python/08-if-else-elif', min: 60, tasks: 3, att: 0, py: true }] }
];
const taskMeta = {
  P4: { 1:{title:'Жылдам есептер',max:15,min:7}, 2:{title:'Есепті кодқа айналдыр',max:30,min:22}, 3:{title:'Өрнекті Python-да жаз',max:20,min:15}, 4:{title:'Қорытынды тест',max:10,min:5}, 5:{title:'Үй жұмысы',max:25} },
  P7: { 1:{title:'Шағын есептер',max:20},2:{title:'Практикалық есептер',max:40},3:{title:'Қатені тап',max:20},4:{title:'Тест',max:20} },
  P8: { 1:{title:'Код есептері',max:30},2:{title:'Жұптық сандық',max:25},3:{title:'Тест',max:20} }
};
const topicQuestions={P4:['/ және // амалдарының айырмашылығы қандай?','input() қандай типті мән береді және оны санға қалай айналдырамыз?','Жақша мен дәреже өрнектің орындалу ретіне қалай әсер етеді?'],P7:['if блогы қашан орындалады?','Python-да шегініс пен қос нүкте не үшін қажет?','Салыстырудағы == және мән берудегі = айырмасы қандай?'],P8:['if–else және elif қандай жағдайда қолданылады?','Бірнеше elif шарты ақиқат болса, қай тармақ орындалады?','Шарттардың реті нәтижеге қалай әсер етеді?']};
window.TeacherLessons = { subjects: SUBJ, tasks: taskMeta, questions: topicQuestions };
})();
