
(function(){
  const units = window.ENGLISH_KING_UNITS || {};
  const unitId = window.UNIT_ID;
  if(!unitId) return;
  const unit = units[unitId];
  if(!unit) return;

  const items = unit.items;
  let mode = 'study';
  let studyIndex = 0;
  let quizOrder = [];
  let quizPos = 0;
  let quizResults = []; // true/false by quiz order
  let quizFinished = false;
  let chestRewards = [];
  let openedChests = [];
  let audioUnlocked = false;
  const audioCache = {};
  function sfx(name){ const a = window.AdventureAudio; if(a && a[name]) a[name](); }

  const els = {
    unitTitle: document.getElementById('unitTitle'),
    unitSub: document.getElementById('unitSub'),
    studyModeBtn: document.getElementById('studyModeBtn'),
    quizModeBtn: document.getElementById('quizModeBtn'),
    globalStatus: document.getElementById('globalStatus'),
    studySection: document.getElementById('studySection'),
    quizSection: document.getElementById('quizSection'),
    studyBadge: document.getElementById('studyBadge'),
    studyCn: document.getElementById('studyCn'),
    studyEn: document.getElementById('studyEn'),
    studyNote: document.getElementById('studyNote'),
    studyTableBody: document.getElementById('studyTableBody'),
    quizHint: document.getElementById('quizHint'),
    quizCn: document.getElementById('quizCn'),
    quizNo: document.getElementById('quizNo'),
    quizInput: document.getElementById('quizInput'),
    quizMessage: document.getElementById('quizMessage'),
    answeredCount: document.getElementById('answeredCount'),
    correctCount: document.getElementById('correctCount'),
    accuracy: document.getElementById('accuracy'),
    keyCount: document.getElementById('keyCount'),
    stageCount: document.getElementById('stageCount'),
    keyBar: document.getElementById('keyBar'),
    quizProgress: document.getElementById('quizProgress'),
    treasurePanel: document.getElementById('treasurePanel'),
    treasureStatus: document.getElementById('treasureStatus'),
    chestGrid: document.getElementById('chestGrid'),
    rewardLog: document.getElementById('rewardLog'),
    rewardLogItems: document.getElementById('rewardLogItems'),
    remainingKeys: document.getElementById('remainingKeys'),
    startQuizBtn: document.getElementById('startQuizBtn'),
    nextQuizBtn: document.getElementById('nextQuizBtn'),
    unlockAudioBtn: document.getElementById('unlockAudioBtn'),
  };

  function normalize(s){
    return (s || '').toString().trim().toLowerCase()
      .replace(/[’‘`]/g,"'")
      .replace(/\s+/g,' ')
      .replace(/\s*-\s*/g,'-');
  }
  function stripForQuery(english){
    let q = english.toLowerCase();
    q = q.replace(/\(.*?\)/g,'').replace(/~/g,'').trim();
    q = q.replace(/^doctor\s*$/,'doctor');
    q = q.replace(/^dr\.?$/,'doctor');
    q = q.replace(/^mr\.?$/,'mr');
    q = q.replace(/^mrs\.?$/,'mrs');
    q = q.replace(/^a\.m\.?$/,'am');
    q = q.replace(/^p\.m\.?$/,'pm');
    q = q.replace(/^r\.o\.c\.?$/,'roc');
    q = q.replace(/^e-mail$/,'email');
    q = q.replace(/^ok$/,'ok');
    q = q.replace(/[.,]/g,'').trim();
    return q;
  }
  function shuffle(arr){
    const copied = arr.slice();
    for(let i=copied.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [copied[i],copied[j]]=[copied[j],copied[i]];
    }
    return copied;
  }
  function currentQuizItem(){
    if(!quizOrder.length) return null;
    const idx = quizOrder[quizPos];
    return items[idx];
  }
  function correctCount(){
    return quizResults.filter(Boolean).length;
  }
  function answeredCount(){
    return quizResults.length;
  }
  function accuracy(){
    const answered = answeredCount();
    return answered ? Math.round((correctCount()/answered)*100) : 0;
  }
  function keysEarned(){
    return Math.floor(correctCount()/5);
  }
  function keysRemaining(){
    return Math.max(0, keysEarned() - openedChests.length);
  }

  function setStatus(text){
    els.globalStatus.textContent = text;
  }
  function showMessage(text, ok){
    els.quizMessage.style.display = 'block';
    els.quizMessage.className = 'message ' + (ok ? 'ok' : 'no');
    els.quizMessage.textContent = text;
  }
  function clearMessage(){
    els.quizMessage.style.display = 'none';
    els.quizMessage.className = 'message';
    els.quizMessage.textContent = '';
  }

  async function unlockAudio(){
    audioUnlocked = true;
    try{
      if(window.speechSynthesis){
        const utt = new SpeechSynthesisUtterance('hello');
        utt.lang = 'en-US';
        utt.volume = 0.01;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utt);
      }
    }catch(e){}
    const adv = window.AdventureAudio; if(adv && adv.activateAdventureAudio){ adv.activateAdventureAudio(true); }
    els.unlockAudioBtn.textContent = '語音 / 音樂已啟用';
  }

  function speak(text){
    try{
      if(!window.speechSynthesis){ return; }
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = 'en-US';
      utt.rate = 0.9;
      utt.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utt);
    }catch(e){}
  }

  async function playAudio(english){
    if(!audioUnlocked){ await unlockAudio(); }
    const query = stripForQuery(english);
    const cacheKey = query || english;
    try{
      if(audioCache[cacheKey]){
        const audio = new Audio(audioCache[cacheKey]);
        await audio.play();
        return;
      }
      const res = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(query));
      if(!res.ok) throw new Error('no-audio');
      const data = await res.json();
      let url = '';
      if(Array.isArray(data)){
        for(const entry of data){
          if(Array.isArray(entry.phonetics)){
            for(const ph of entry.phonetics){
              if(ph && ph.audio){
                url = ph.audio.startsWith('//') ? ('https:' + ph.audio) : ph.audio;
                if(url) break;
              }
            }
          }
          if(url) break;
        }
      }
      if(!url) throw new Error('no-audio');
      audioCache[cacheKey] = url;
      const audio = new Audio(url);
      await audio.play();
    }catch(e){
      speak(query || english);
    }
  }


function ensureTreasureModal(){
  if(document.getElementById('bigTreasureModal')) return;
  const modal = document.createElement('div');
  modal.id = 'bigTreasureModal';
  modal.className = 'big-treasure-modal hidden';
  modal.innerHTML = `
    <div class="big-treasure-backdrop" data-close-modal="1"></div>
    <div class="big-treasure-card">
      <div class="big-treasure-burst"></div>
      <div class="big-treasure-icon">💎🏆💎</div>
      <div class="big-treasure-title">找到大寶藏！</div>
      <div class="big-treasure-sub" id="bigTreasureText">你今天的冒險收穫滿滿。</div>
      <div class="big-treasure-stars">✨ ✨ ✨ ✨ ✨</div>
      <div class="nav-row center-row">
        <button class="btn btn-primary" id="closeTreasureModalBtn" type="button">太棒了</button>
        <a class="link-btn btn-purple" href="index.html">回首頁</a>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e)=>{
    if(e.target.closest('[data-close-modal="1"]') || e.target.id === 'closeTreasureModalBtn'){
      modal.classList.add('hidden');
    }
  });
}

function showBigTreasure(){
  ensureTreasureModal();
  const modal = document.getElementById('bigTreasureModal');
  const text = document.getElementById('bigTreasureText');
  if(text){
    text.textContent = `本次共開出 ${openedChests.length} 個寶箱，得到：${openedChests.map(idx => chestRewards[idx]).join('、')}。`;
  }
  if(modal){
    modal.classList.remove('hidden');
    modal.classList.remove('treasure-pop');
    void modal.offsetWidth;
    modal.classList.add('treasure-pop');
  }
  sfx('playTreasure');
}

  function renderStudyCard(){
    const item = items[studyIndex];
    els.studyBadge.textContent = `${unit.title} • 第 ${studyIndex+1} / ${items.length} 個`;
    els.studyCn.textContent = item.chinese;
    els.studyEn.textContent = item.english;
    els.studyNote.textContent = `編號 ${item.no} • 依照順序學習`;
    document.getElementById('studyPrevBtn').disabled = studyIndex === 0;
    document.getElementById('studyNextBtn').disabled = studyIndex === items.length-1;
  }

  function renderStudyTable(){
    els.studyTableBody.innerHTML = items.map((item, idx) => `
      <tr>
        <td><strong>${item.no}</strong></td>
        <td><strong>${item.english}</strong></td>
        <td>${item.chinese}</td>
        <td>
          <button class="btn btn-primary small-audio" data-action="jump-study" data-index="${idx}">看</button>
        </td>
        <td>
          <button class="btn btn-secondary small-audio" data-action="audio-study" data-index="${idx}">🔊</button>
        </td>
      </tr>
    `).join('');
  }

  function renderKeyBar(){
    const keys = keysEarned();
    els.keyBar.innerHTML = '';
    for(let i=0;i<5;i++){
      const div = document.createElement('div');
      div.className = 'key-slot' + (i < keys ? ' on' : '');
      div.innerHTML = `${i < keys ? '🔑' : '🗝️'}<br>第 ${i+1} 把`;
      els.keyBar.appendChild(div);
    }
  }

  function renderQuiz(){
    const answered = answeredCount();
    const correct = correctCount();
    els.answeredCount.textContent = answered;
    els.correctCount.textContent = correct;
    els.accuracy.textContent = accuracy() + '%';
    els.keyCount.textContent = keysEarned();
    els.stageCount.textContent = `${Math.min(5, Math.floor(answered/5)+1)} / 5`;
    renderKeyBar();

    if(!quizOrder.length){
      els.quizNo.textContent = '-';
      els.quizCn.textContent = '按「開始考試」';
      els.quizHint.textContent = '每累積答對 5 題，可以開 1 個寶箱。25 題完成後進入寶箱區。';
      els.quizProgress.textContent = '目前還沒有開始測驗。';
      els.nextQuizBtn.disabled = true;
      return;
    }

    if(quizFinished){
      els.quizNo.textContent = '完成';
      els.quizCn.textContent = '本單元測驗已完成';
      els.quizHint.textContent = `你共答對 ${correct} 題，因此得到 ${keysEarned()} 把金鑰匙。`;
      els.quizProgress.textContent = `25 / 25 完成。現在可開 ${keysRemaining()} 個寶箱。`;
      els.nextQuizBtn.disabled = true;
      els.treasurePanel.classList.remove('hidden');
      renderChests();
      return;
    }

    const item = currentQuizItem();
    els.quizNo.textContent = item ? item.no : '-';
    els.quizCn.textContent = item ? item.chinese : '';
    els.quizHint.textContent = `目前第 ${quizPos+1} / ${items.length} 題 • 題目每次開始都會重新亂數。`;
    els.quizProgress.textContent = `已答 ${answered} 題；累積答對 ${correct} 題。每答對 5 題，可開 1 個寶箱。`;
    els.nextQuizBtn.disabled = quizResults[quizPos] == null;
  }

  function startQuiz(){
    quizOrder = shuffle(items.map((_, idx) => idx));
    quizPos = 0;
    quizResults = new Array(items.length).fill(null);
    quizFinished = false;
    chestRewards = shuffle(['3C 5分鐘','3C 5分鐘','3C 5分鐘','3C 10分鐘','3C 10分鐘']);
    openedChests = [];
    els.treasurePanel.classList.add('hidden');
    sfx('playRestart');
    els.quizInput.value = '';
    clearMessage();
    switchMode('quiz');
    renderQuiz();
    setStatus(`已開始 ${unit.title} 的亂數考試。考試區不顯示單字表；每答對 5 題可開 1 個寶箱。`);
    els.quizInput.focus();
  }

  function goNextQuiz(){
    if(!quizOrder.length) return;
    if(quizResults[quizPos] == null){
      showMessage('請先送出這一題。', false);
      return;
    }
    if(quizPos >= items.length - 1){
      quizFinished = true;
      renderQuiz();
      setStatus(`已完成 ${unit.title} 的 25 題測驗。你目前可開 ${keysRemaining()} 個寶箱。`);
      return;
    }
    quizPos += 1;
    els.quizInput.value = '';
    clearMessage();
    renderQuiz();
    els.quizInput.focus();
  }

  function checkAnswer(){
    if(!quizOrder.length){
      showMessage('請先按「開始考試」。', false);
      return;
    }
    if(quizFinished) return;
    if(quizResults[quizPos] != null){
      showMessage('這一題已經作答，請前往下一題。', false);
      return;
    }
    const input = normalize(els.quizInput.value);
    if(!input){
      showMessage('請先輸入答案。', false);
      return;
    }
    const item = currentQuizItem();
    const ok = item.accepted.map(normalize).includes(input);
    quizResults[quizPos] = ok;
    if(ok){
      const prevKeys = Math.floor((correctCount()-1)/5);
      const nowKeys = keysEarned();
      let msg = `答對了！正確答案是 ${item.english}`;
      sfx('playCorrect');
      if(nowKeys > prevKeys){
        msg += `。恭喜拿到第 ${nowKeys} 把金鑰匙。`;
        sfx('playKey');
      }
      showMessage(msg, true);
    }else{
      sfx('playWrong');
      showMessage(`這題答錯了。正確答案是 ${item.english}`, false);
    }
    renderQuiz();
  }

  function renderChests(){
    els.remainingKeys.textContent = keysRemaining();
    if(keysRemaining() > 0){
      els.treasureStatus.textContent = `你目前還有 ${keysRemaining()} 把金鑰匙。`;
    }else{
      els.treasureStatus.textContent = `你目前沒有可用金鑰匙。`;
    }
    els.chestGrid.innerHTML = chestRewards.map((reward, idx) => {
      const opened = openedChests.includes(idx);
      return `
        <div class="chest">
          <div class="icon">${opened ? '🎁' : '🧰'}</div>
          <div class="title">寶箱 ${idx+1}</div>
          ${opened ? `<div class="reward">${reward}</div>` : `<button class="btn btn-secondary" data-action="open-chest" data-index="${idx}" ${keysRemaining()<=0 ? 'disabled' : ''}>打開</button>`}
        </div>
      `;
    }).join('');
    renderRewardLog();
  }

  function renderRewardLog(){
    if(!openedChests.length){
      els.rewardLog.classList.add('hidden');
      els.rewardLogItems.innerHTML = '';
      return;
    }
    els.rewardLog.classList.remove('hidden');
    els.rewardLogItems.innerHTML = openedChests.map(idx => `<div>• 寶箱 ${idx+1}：${chestRewards[idx]}</div>`).join('');
  }

  function openChest(index){
    if(!quizFinished){
      els.treasureStatus.textContent = '請先完成 25 題測驗。';
      return;
    }
    if(openedChests.includes(index)){
      els.treasureStatus.textContent = `寶箱 ${index+1} 已經開過了。`;
      return;
    }
    if(keysRemaining() <= 0){
      els.treasureStatus.textContent = '沒有可用的金鑰匙了。';
      return;
    }
    openedChests.push(index);
    const chestEl = els.chestGrid.children[index];
    if(chestEl){ chestEl.classList.add('opening'); setTimeout(()=>{ chestEl.classList.add('opened'); }, 220); }
    sfx('playTreasure');
    els.treasureStatus.textContent = `寶箱 ${index+1} 開出了：${chestRewards[index]}`;
    renderChests();
    if(keysRemaining() === 0){
      setTimeout(showBigTreasure, 180);
    }
  }

  function switchMode(nextMode){
    mode = nextMode;
    const isStudy = nextMode === 'study';
    els.studyModeBtn.classList.toggle('active', isStudy);
    els.quizModeBtn.classList.toggle('active', !isStudy);
    els.studySection.classList.toggle('hidden', !isStudy);
    els.quizSection.classList.toggle('hidden', isStudy);
    sfx('playMode');
    if(isStudy){
      setStatus(`${unit.title} 目前在學習模式。單字按照原順序學習，右側單字表可直接點選與播放發音。`);
    }else{
      setStatus(`${unit.title} 目前在考試模式。考試時不顯示單字表，可隨時再切回學習模式。`);
    }
  }

  function init(){
    els.unitTitle.textContent = `${unit.title}`;
    els.unitSub.textContent = `編號 ${unit.range} • iPhone / iPad 友善版 • 學習與考試分開`;
    ensureTreasureModal();
    renderStudyCard();
    renderStudyTable();
    renderQuiz();
    switchMode('study');

    document.getElementById('studyPrevBtn').addEventListener('click', ()=>{
      if(studyIndex>0){ studyIndex -= 1; renderStudyCard(); }
    });
    document.getElementById('studyNextBtn').addEventListener('click', ()=>{
      if(studyIndex<items.length-1){ studyIndex += 1; renderStudyCard(); }
    });
    document.getElementById('studyAudioBtn').addEventListener('click', ()=> playAudio(items[studyIndex].english));
    document.getElementById('studyStartBtn').addEventListener('click', ()=> switchMode('study'));
    els.studyModeBtn.addEventListener('click', ()=> switchMode('study'));
    els.quizModeBtn.addEventListener('click', ()=> switchMode('quiz'));
    els.startQuizBtn.addEventListener('click', startQuiz);
    els.nextQuizBtn.addEventListener('click', goNextQuiz);
    document.getElementById('submitQuizBtn').addEventListener('click', checkAnswer);
    document.getElementById('restartQuizBtn').addEventListener('click', startQuiz);
    els.unlockAudioBtn.addEventListener('click', unlockAudio);
    document.getElementById('testAudioBtn').addEventListener('click', ()=>playAudio(items[studyIndex].english));
    els.quizInput.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter') checkAnswer();
    });
    els.studyTableBody.addEventListener('click', (e)=>{
      const btn = e.target.closest('button');
      if(!btn) return;
      const idx = Number(btn.dataset.index);
      const action = btn.dataset.action;
      if(action === 'jump-study'){
        studyIndex = idx;
        renderStudyCard();
        switchMode('study');
        window.scrollTo({top:0,behavior:'smooth'});
      }else if(action === 'audio-study'){
        playAudio(items[idx].english);
      }
    });
    els.chestGrid.addEventListener('click', (e)=>{
      const btn = e.target.closest('button[data-action="open-chest"]');
      if(!btn) return;
      openChest(Number(btn.dataset.index));
    });
  }

  window.EnglishKingUnitPage = {
    playAudio,
    startQuiz,
    switchMode
  };
  document.addEventListener('DOMContentLoaded', init);
})();
