
(function(){
  const storageKeyTheme = 'ek_theme';
  const storageKeyBgm = 'ek_bgm';
  const storageKeySfx = 'ek_sfx';
  const storageKeyActivated = 'ek_audio_activated';
  const themeNames = ['sunny','forest','ocean','candy'];
  const themeLabels = {
    sunny:'🌞 冒險暖陽',
    forest:'🌲 森林探險',
    ocean:'🌊 海洋尋寶',
    candy:'🦄 糖果勇者'
  };

  let audioCtx = null;
  let masterGain = null;
  let compressor = null;
  let bgmTimer = null;
  let bgmStep = 0;
  let audioActivated = localStorage.getItem(storageKeyActivated) === '1';
  let bgmOn = localStorage.getItem(storageKeyBgm);
  bgmOn = bgmOn === null ? true : bgmOn === '1';
  let sfxOn = localStorage.getItem(storageKeySfx);
  sfxOn = sfxOn === null ? true : sfxOn !== '0';
  let currentTheme = localStorage.getItem(storageKeyTheme) || 'sunny';
  if(!themeNames.includes(currentTheme)) currentTheme = 'sunny';

  const leadPattern = [
    {notes:[523.25], bass:196.00, ms:330},
    {notes:[659.25], bass:196.00, ms:330},
    {notes:[783.99], bass:220.00, ms:300},
    {notes:[659.25,987.77], bass:220.00, ms:360},
    {notes:[587.33], bass:246.94, ms:330},
    {notes:[659.25], bass:246.94, ms:330},
    {notes:[698.46], bass:220.00, ms:300},
    {notes:[783.99], bass:196.00, ms:380},
    {notes:[659.25], bass:174.61, ms:330},
    {notes:[783.99], bass:174.61, ms:330},
    {notes:[880.00], bass:196.00, ms:300},
    {notes:[987.77], bass:196.00, ms:360},
    {notes:[783.99], bass:220.00, ms:330},
    {notes:[698.46], bass:220.00, ms:330},
    {notes:[659.25], bass:196.00, ms:330},
    {notes:[523.25,783.99], bass:164.81, ms:430}
  ];

  function ensureAudio(){
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return null;
    if(!audioCtx){
      audioCtx = new Ctx();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.92;
      compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.value = -26;
      compressor.knee.value = 16;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.002;
      compressor.release.value = 0.24;
      masterGain.connect(compressor);
      compressor.connect(audioCtx.destination);
    }
    if(audioCtx.state === 'suspended'){
      audioCtx.resume().catch(()=>{});
    }
    return audioCtx;
  }

  function tone(freq, opts={}){
    if((!sfxOn && !opts.force) || !freq) return;
    const ctx = ensureAudio();
    if(!ctx || !masterGain) return;
    const now = ctx.currentTime + (opts.delay || 0);
    const dur = opts.duration || 0.18;
    const type = opts.type || 'triangle';
    const volume = opts.volume ?? 0.05;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + dur + 0.03);
  }

  function chord(freqs, opts={}){ (freqs || []).forEach((f,i)=>tone(f,{...opts, delay:(opts.delay || 0) + i*0.004})); }
  function playClick(){ chord([523.25,659.25], {duration:0.09, volume:0.028, type:'triangle'}); }
  function playMode(){ chord([392,523.25,659.25], {duration:0.14, volume:0.032}); }
  function playCorrect(){ chord([523.25,659.25,783.99], {duration:0.22, volume:0.04}); tone(1046.5,{delay:0.10,duration:0.18,volume:0.045}); }
  function playWrong(){ tone(220,{duration:0.14,volume:0.034,type:'sawtooth'}); tone(196,{delay:0.07,duration:0.18,volume:0.03,type:'square'}); }
  function playKey(){ chord([659.25,783.99,1046.5], {duration:0.24, volume:0.042}); }
  function playTreasure(){ chord([523.25,659.25,783.99], {duration:0.18, volume:0.04}); chord([587.33,783.99,1174.66], {delay:0.14,duration:0.26,volume:0.046}); }
  function playRestart(){ chord([392,349.23,329.63], {duration:0.12, volume:0.026}); }

  function stopBgmLoop(){
    if(bgmTimer){ window.clearTimeout(bgmTimer); bgmTimer = null; }
  }

  function bgmTick(){
    if(!bgmOn || !audioActivated) return;
    const ctx = ensureAudio();
    if(!ctx) return;
    const step = leadPattern[bgmStep % leadPattern.length];
    const when = 0.03;
    chord(step.notes, {delay:when, duration:0.28, volume:0.03, type:'triangle', force:true});
    tone(step.bass, {delay:when, duration:0.24, volume:0.022, type:'sine', force:true});
    if(bgmStep % 4 === 0){
      chord([261.63,329.63], {delay:when + 0.02, duration:0.34, volume:0.012, type:'sine', force:true});
    }
    bgmStep += 1;
    stopBgmLoop();
    bgmTimer = window.setTimeout(bgmTick, step.ms);
  }

  function updateHeroButtons(){
    document.querySelectorAll('#heroUnlockBtn, .groupAudioBtn, [data-dock="activate"]').forEach(btn=>{
      if(btn.matches('[data-dock="activate"]')) return;
      btn.textContent = audioActivated ? '🎼 冒險音樂已啟動' : '🎼 啟動冒險音樂';
    });
  }

  function startBgm(){
    bgmOn = true;
    localStorage.setItem(storageKeyBgm,'1');
    if(audioActivated){
      ensureAudio();
      stopBgmLoop();
      bgmTick();
    }
    syncDock();
  }
  function stopBgm(){
    bgmOn = false;
    localStorage.setItem(storageKeyBgm,'0');
    stopBgmLoop();
    syncDock();
  }
  function toggleBgm(){
    if(bgmOn) stopBgm();
    else startBgm();
  }
  function toggleSfx(){
    sfxOn = !sfxOn;
    localStorage.setItem(storageKeySfx, sfxOn ? '1' : '0');
    if(sfxOn) playClick();
    syncDock();
  }
  function cycleTheme(){
    const idx = themeNames.indexOf(currentTheme);
    currentTheme = themeNames[(idx + 1) % themeNames.length];
    applyTheme(currentTheme);
    playMode();
  }
  function applyTheme(theme){
    currentTheme = themeNames.includes(theme) ? theme : 'sunny';
    document.body.dataset.theme = currentTheme;
    localStorage.setItem(storageKeyTheme, currentTheme);
    syncDock();
  }

  function activateAdventureAudio(forceBgm){
    audioActivated = true;
    localStorage.setItem(storageKeyActivated,'1');
    ensureAudio();
    chord([523.25,659.25,783.99], {duration:0.16, volume:0.034, force:true});
    if(forceBgm){
      bgmOn = true;
      localStorage.setItem(storageKeyBgm,'1');
    }
    if(bgmOn) startBgm();
    updateHeroButtons();
    syncDock();
  }

  function dockHtml(){
    return `
      <div class="adventure-dock-title">冒險控制台</div>
      <div class="adventure-dock-actions">
        <button class="dock-btn ${audioActivated ? 'is-on' : ''}" data-dock="activate">${audioActivated ? '🎼 冒險音樂已啟動' : '🎼 啟動冒險音樂'}</button>
        <button class="dock-btn ${bgmOn ? 'is-on' : ''}" data-dock="bgm">${bgmOn ? '🎵 背景樂：開' : '🎵 背景樂：關'}</button>
        <button class="dock-btn ${sfxOn ? 'is-on' : ''}" data-dock="sfx">${sfxOn ? '🔊 音效：開' : '🔇 音效：關'}</button>
        <button class="dock-btn" data-dock="theme">${themeLabels[currentTheme] || '🎨 主題'}</button>
      </div>
      <div class="adventure-dock-note">iPhone / iPad 先按一次「啟動冒險音樂」，背景樂通常就會乖乖播放。</div>
    `;
  }

  function syncDock(){
    const dock = document.getElementById('adventureDock');
    if(dock) dock.innerHTML = dockHtml();
    updateHeroButtons();
  }

  function createDock(){
    if(document.getElementById('adventureDock')) return;
    const dock = document.createElement('div');
    dock.id = 'adventureDock';
    dock.className = 'adventure-dock';
    dock.innerHTML = dockHtml();
    document.body.appendChild(dock);

    dock.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-dock]');
      if(!btn) return;
      const action = btn.dataset.dock;
      if(action === 'activate') activateAdventureAudio(true);
      if(action === 'theme'){ activateAdventureAudio(false); cycleTheme(); }
      if(action === 'bgm'){ activateAdventureAudio(false); toggleBgm(); }
      if(action === 'sfx'){ activateAdventureAudio(false); toggleSfx(); }
    });
  }

  function decorateHero(){
    document.querySelectorAll('.hero').forEach(hero=>{
      if(hero.querySelector('.hero-ribbon')) return;
      const ribbon = document.createElement('div');
      ribbon.className = 'hero-ribbon';
      ribbon.innerHTML = '<span>🗺️ 冒險學習地圖</span><span>🔑 集滿金鑰匙</span><span>🏆 尋找大寶藏</span>';
      hero.appendChild(ribbon);
    });
  }

  function attachGlobalClickSound(){
    document.addEventListener('click', (e)=>{
      const target = e.target.closest('button, a.unit-tile, a.big-group-btn, a.link-btn, a.map-castle, a.route-stop');
      if(!target) return;
      playClick();
    }, {capture:true});
  }

  function bindHeroAudioButtons(){
    document.querySelectorAll('#heroUnlockBtn, .groupAudioBtn').forEach(btn=>{
      btn.addEventListener('click', ()=>activateAdventureAudio(true));
    });
  }

  function init(){
    applyTheme(currentTheme);
    createDock();
    decorateHero();
    attachGlobalClickSound();
    bindHeroAudioButtons();
    document.addEventListener('pointerdown', ()=>activateAdventureAudio(false), {once:true});
    document.addEventListener('touchend', ()=>activateAdventureAudio(false), {once:true});
    window.addEventListener('pageshow', ()=>{ if(audioActivated && bgmOn) startBgm(); });
    document.addEventListener('visibilitychange', ()=>{ if(document.hidden){ stopBgmLoop(); } else if(audioActivated && bgmOn){ startBgm(); } });
    if(audioActivated && bgmOn){
      window.setTimeout(()=>startBgm(), 80);
    }
  }

  window.AdventureAudio = {
    unlock: ()=>activateAdventureAudio(false),
    activateAdventureAudio,
    playClick,
    playMode,
    playCorrect,
    playWrong,
    playKey,
    playTreasure,
    playRestart,
    toggleBgm,
    toggleSfx,
    applyTheme,
    startBgm,
    stopBgm,
    isBgmOn: ()=>bgmOn,
    isSfxOn: ()=>sfxOn,
    currentTheme: ()=>currentTheme,
    isAudioActivated: ()=>audioActivated,
  };

  document.addEventListener('DOMContentLoaded', init);
})();
