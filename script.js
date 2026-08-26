let selectedBanks=new Set(['AF']);
let currentIndex=0,activeQuestions=[],responses=[],timerId=null,remainingSeconds=null,startedAt=null;
const $=id=>document.getElementById(id);
const screens=['startScreen','quizScreen','resultsScreen','reviewScreen'];
const bankOrder=['AF','PP','SP','CARS','M'];
const bankLabels={AF:'Airframe',PP:'Powerplant',SP:'Standard Practice',CARS:'CARs',M:'AME-M Practice'};

function show(id){screens.forEach(x=>$(x).classList.toggle('hidden',x!==id));}
function shuffle(a){const c=[...a];for(let i=c.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[c[i],c[j]]=[c[j],c[i]];}return c;}
function esc(s){const d=document.createElement('div');d.textContent=s??'';return d.innerHTML;}
function fmtPct(c,t){return t?`${Math.round(c/t*100)}%`:'—';}
function questionKey(q){return String(q.question||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function uniqueAcrossBanks(banks){const seen=new Set(),out=[];for(const bank of banks){for(const q of questionBanks[bank]){const k=questionKey(q);if(!seen.has(k)){seen.add(k);out.push(q);}}}return out;}

function populateCounts(){
  for(const bank of bankOrder){const el=$('count'+bank);if(el)el.textContent=`${questionBanks[bank].length.toLocaleString()} questions`;}
  updateSelectionUI();
}

function updateSelectionUI(){
  document.querySelectorAll('.exam-pick').forEach(b=>{
    const on=selectedBanks.has(b.dataset.exam);b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));
  });
  const names=bankOrder.filter(b=>selectedBanks.has(b)).map(b=>bankLabels[b]);
  $('selectedSummary').textContent=names.length?`${names.join(' + ')} selected`:'Select at least one test';
  $('startBtn').disabled=!names.length;
  const chosen=bankOrder.filter(b=>selectedBanks.has(b));
  const available=uniqueAcrossBanks(chosen).length;
  const allOpt=[...$('questionCount').options].find(o=>o.value==='all');
  if(allOpt)allOpt.textContent=`All available (${available.toLocaleString()})`;
  const note=$('selectionNote');
  if(!names.length){note.className='selection-note warning';note.textContent='Select at least one test bank to start.';return;}
  note.className='selection-note';
  note.textContent=names.length===1?`The quiz will draw from ${names[0]} only.`:`Mixed tests are balanced across the selected banks as evenly as the available question counts allow.`;
  localStorage.setItem('ameSelectedBanks',JSON.stringify([...selectedBanks]));
}

document.querySelectorAll('.exam-pick').forEach(b=>b.addEventListener('click',()=>{
  const bank=b.dataset.exam;if(selectedBanks.has(bank))selectedBanks.delete(bank);else selectedBanks.add(bank);updateSelectionUI();
}));

function allocateBalanced(total,banks){
  const pools={};banks.forEach(b=>pools[b]=$('shuffleQuestions').checked?shuffle(questionBanks[b]):[...questionBanks[b]]);
  const picked=[],seen=new Set();let active=[...banks];
  while(picked.length<total&&active.length){
    const next=[];
    for(const b of active){
      let chosen=null;
      while(pools[b].length&&!chosen){const q=pools[b].shift(),k=questionKey(q);if(!seen.has(k)){seen.add(k);chosen=q;}}
      if(chosen)picked.push(chosen);
      if(pools[b].length)next.push(b);
      if(picked.length>=total)break;
    }
    active=next;
  }
  return $('shuffleQuestions').checked?shuffle(picked):picked;
}

function buildPool(){
  const banks=bankOrder.filter(b=>selectedBanks.has(b));if(!banks.length)return [];
  const uniqueAvailable=uniqueAcrossBanks(banks),available=uniqueAvailable.length,countValue=$('questionCount').value;
  let questions=countValue==='all'?uniqueAvailable:allocateBalanced(Math.min(Number(countValue),available),banks);
  if(countValue==='all'&&$('shuffleQuestions').checked)questions=shuffle(questions);
  return questions.map(q=>{let options=q.options.map((text,i)=>({text,correct:i===q.answer}));if($('shuffleAnswers').checked)options=shuffle(options);return {...q,options:options.map(x=>x.text),answer:options.findIndex(x=>x.correct)};});
}

function startQuiz(){
  if(!selectedBanks.size)return;clearInterval(timerId);activeQuestions=buildPool();if(!activeQuestions.length)return;
  responses=activeQuestions.map(()=>null);currentIndex=0;startedAt=Date.now();const t=$('timerSetting').value;remainingSeconds=t==='off'?null:Number(t)*60;
  if(remainingSeconds!==null){timerId=setInterval(()=>{remainingSeconds--;drawTimer();if(remainingSeconds<=0){clearInterval(timerId);finish(true);}},1000);}
  saveSettings();show('quizScreen');render();window.scrollTo({top:0,behavior:'auto'});
}

function drawTimer(){
  if(!startedAt){$('timerText').textContent='—';return;}
  if(remainingSeconds===null){const s=Math.floor((Date.now()-startedAt)/1000),m=Math.floor(s/60),sec=s%60;$('timerText').textContent=`${m}:${String(sec).padStart(2,'0')}`;}
  else{const secTotal=Math.max(0,remainingSeconds),m=Math.floor(secTotal/60),sec=secTotal%60;$('timerText').textContent=`${m}:${String(sec).padStart(2,'0')}`;}
}

function stats(){
  const done=responses.filter(x=>x!==null).length,correct=responses.filter(x=>x&&x.correct).length,total=activeQuestions.length;
  $('answeredText').textContent=`${done} / ${total}`;$('scoreText').textContent=$('quizMode').value==='exam'?`${done} answered`:`${correct} / ${done}`;$('accuracyText').textContent=$('quizMode').value==='exam'?'Hidden':done?fmtPct(correct,done):'—';
}

function renderMedia(q){
  const media=$('questionMedia');media.innerHTML='';const imgs=q.image?(Array.isArray(q.image)?q.image:[q.image]):[];
  if(!imgs.length){media.classList.add('hidden');return;}imgs.forEach(src=>{const img=document.createElement('img');img.src=src;img.alt='Question reference figure';img.loading='lazy';media.appendChild(img);});media.classList.remove('hidden');
}

function render(){
  const q=activeQuestions[currentIndex],r=responses[currentIndex],total=activeQuestions.length;
  $('progressText').textContent=`${currentIndex+1} / ${total}`;$('progressFill').style.width=`${(currentIndex+1)/total*100}%`;$('questionNumber').textContent=`${bankMeta[q.bank]?.short||q.bank} • ${q.id}`;$('questionTopic').textContent=q.topic||q.section;$('questionText').textContent=q.question;renderMedia(q);stats();drawTimer();
  const box=$('options');box.innerHTML='';q.options.forEach((text,i)=>{const b=document.createElement('button');b.type='button';b.className='option';b.innerHTML=`<span class="letter">${String.fromCharCode(65+i)}.</span><span>${esc(text)}</span>`;if(r){if($('quizMode').value==='practice'){b.disabled=true;if(i===q.answer)b.classList.add('reveal');if(i===r.choice)b.classList.add(r.correct?'correct':'wrong');}else if(i===r.choice)b.classList.add('selected');}b.onclick=()=>answer(i);box.appendChild(b);});
  const fb=$('feedback');fb.className='feedback hidden';fb.innerHTML='';if(r&&$('quizMode').value==='practice')feedback(q,r);$('prevBtn').disabled=currentIndex===0;$('nextBtn').textContent=currentIndex===total-1?'Finish Quiz':'Next Question';
}

function answer(i){const q=activeQuestions[currentIndex],mode=$('quizMode').value;if(responses[currentIndex]&&mode==='practice')return;responses[currentIndex]={choice:i,correct:i===q.answer};render();}
function feedback(q,r){const fb=$('feedback');fb.className=`feedback ${r.correct?'correct':'incorrect'}`;const answerLine=r.correct?'Good job!':`Correct answer: ${String.fromCharCode(65+q.answer)}. ${esc(q.options[q.answer])}`;fb.innerHTML=`<strong>${r.correct?'✓ Correct':'✗ Incorrect'}</strong><div>${answerLine}</div><div style="margin-top:8px"><strong>Explanation:</strong> ${esc(q.explanation||q.options[q.answer])}</div><div class="source-note">Source set: ${esc(q.source||'Practice bank')}</div>`;}
function move(dir){if(dir>0&&currentIndex===activeQuestions.length-1){finish(false);return;}currentIndex=Math.max(0,Math.min(activeQuestions.length-1,currentIndex+dir));const y=window.scrollY;render();requestAnimationFrame(()=>window.scrollTo({top:y,behavior:'auto'}));}

function finish(timeout=false){
  clearInterval(timerId);const done=responses.filter(Boolean).length,correct=responses.filter(x=>x&&x.correct).length,total=activeQuestions.length,pct=Math.round(correct/total*100);show('resultsScreen');$('finalScore').textContent=`${correct} / ${total} (${pct}%)`;$('resultMessage').textContent=timeout?`Time expired. You answered ${done} of ${total} questions.`:pct>=80?'Strong result. Review missed questions and keep rotating through the selected subjects.':pct>=70?'Good progress. Review missed topics before another attempt.':'Use the review and subject breakdown to identify weak areas, then repeat a smaller focused set.';
  $('breakdown').innerHTML=bankOrder.map(bank=>{const idx=activeQuestions.map((q,i)=>q.bank===bank?i:-1).filter(i=>i>=0);if(!idx.length)return '';const answered=idx.filter(i=>responses[i]).length,c=idx.filter(i=>responses[i]&&responses[i].correct).length;return `<div class="break-item"><span>${bankLabels[bank]}</span><strong>${c} / ${idx.length} (${fmtPct(c,idx.length)})</strong><small>${answered} answered</small></div>`;}).join('');renderTopicBreakdown();$('reviewBtn').disabled=!responses.some(x=>x&&!x.correct);window.scrollTo({top:0,behavior:'auto'});
}

function renderTopicBreakdown(){const groups={};activeQuestions.forEach((q,i)=>{const k=`${bankLabels[q.bank]} — ${q.topic||'General'}`;(groups[k]??=[]).push(i);});const rows=Object.entries(groups).map(([name,idx])=>{const c=idx.filter(i=>responses[i]&&responses[i].correct).length;return {name,c,total:idx.length,pct:Math.round(c/idx.length*100)};}).sort((a,b)=>a.pct-b.pct||b.total-a.total);$('topicBreakdown').innerHTML=rows.length?`<h3>Topic Breakdown</h3>${rows.map(x=>`<div class="topic-row"><span>${esc(x.name)}</span><span>${x.c}/${x.total} • ${x.pct}%</span></div>`).join('')}`:'';}
function review(){const items=activeQuestions.map((q,i)=>({q,r:responses[i]})).filter(x=>x.r&&!x.r.correct);$('reviewList').innerHTML=items.map(({q,r})=>`<div class="review-item"><div class="question-meta"><span>${bankMeta[q.bank]?.short||q.bank} • ${q.id}</span><span class="topic-pill">${esc(q.topic||'General')}</span></div><h3>${esc(q.question)}</h3>${q.image?`<div class="question-media">${(Array.isArray(q.image)?q.image:[q.image]).map(src=>`<img src="${esc(src)}" alt="Question reference figure">`).join('')}</div>`:''}<div class="review-answer">Your answer: ${String.fromCharCode(65+r.choice)}. ${esc(q.options[r.choice])}</div><div class="review-answer"><b>Correct: ${String.fromCharCode(65+q.answer)}. ${esc(q.options[q.answer])}</b></div><div class="review-answer">${esc(q.explanation||'')}</div><div class="review-source">Source set: ${esc(q.source||'Practice bank')}</div></div>`).join('')||'<p>No incorrect answered questions to review.</p>';show('reviewScreen');window.scrollTo({top:0,behavior:'auto'});}
function home(){clearInterval(timerId);show('startScreen');updateSelectionUI();window.scrollTo({top:0,behavior:'auto'});}
function saveSettings(){['questionCount','quizMode','timerSetting'].forEach(id=>localStorage.setItem('ame_'+id,$(id).value));localStorage.setItem('ame_shuffleQuestions',$('shuffleQuestions').checked?'1':'0');localStorage.setItem('ame_shuffleAnswers',$('shuffleAnswers').checked?'1':'0');}
function restoreSettings(){try{const saved=JSON.parse(localStorage.getItem('ameSelectedBanks')||'null');if(Array.isArray(saved)){selectedBanks=new Set(saved.filter(x=>bankOrder.includes(x)));}}catch(e){}['questionCount','quizMode','timerSetting'].forEach(id=>{const v=localStorage.getItem('ame_'+id);if(v&&[...$(id).options].some(o=>o.value===v))$(id).value=v;});if(localStorage.getItem('ame_shuffleQuestions')!==null)$('shuffleQuestions').checked=localStorage.getItem('ame_shuffleQuestions')==='1';if(localStorage.getItem('ame_shuffleAnswers')!==null)$('shuffleAnswers').checked=localStorage.getItem('ame_shuffleAnswers')==='1';}
$('startBtn').onclick=startQuiz;$('nextBtn').onclick=()=>move(1);$('prevBtn').onclick=()=>move(-1);$('restartBtn').onclick=startQuiz;$('settingsBtn').onclick=home;$('homeTop').onclick=home;$('restartTop').onclick=()=>{if(!$('quizScreen').classList.contains('hidden')||!$('resultsScreen').classList.contains('hidden'))startQuiz();};$('reviewBtn').onclick=review;$('reviewBack').onclick=()=>show('resultsScreen');$('questionCount').onchange=saveSettings;$('quizMode').onchange=saveSettings;$('timerSetting').onchange=saveSettings;$('shuffleQuestions').onchange=saveSettings;$('shuffleAnswers').onchange=saveSettings;setInterval(()=>{if(!$('quizScreen').classList.contains('hidden')&&remainingSeconds===null)drawTimer();},1000);restoreSettings();populateCounts();
