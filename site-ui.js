
(function(){
  const storageKeyTheme = 'ek_theme';
  const storageKeyBgm = 'ek_bgm';
  const storageKeySfx = 'ek_sfx';
  const themeNames = ['sunny','forest','ocean','candy'];
  const themeLabels = {
    sunny:'🌞 冒險暖陽',
    forest:'🌲 森林探險',
    ocean:'🌊 海洋尋寶',
    candy:'🦄 糖果勇者'
  };

  let audioCtx = null;
  let bgmTimer = null;
  let melodyStep = 0;
  let bgmOn = localStorage.getItem(storageKeyBgm) === '1';
  let sfxOn = localStorage.getItem(storageKeySfx) !== '0';
  let currentTheme = localStorage.getItem(storageKeyTheme) || 'sunny';
  if(!themeNames.includes(currentTheme)) currentTheme = 'sunny';

  const melody = [
    [392,523.25],[440],[493.88],[523.25,659.25],[587.33],[523.25],[493.88],[440],
    [392,523.25],[440],[493.88],[659.25],[587.33],[523.25],[493.88],[392]
  ];
  const bass = [196,196,220,220,246.94,246.94,220,196,174.61,174.61,196,196,220,220,196,164.81];

  function ensureAudio(){
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return null;
    if(!audioCtx) audioCtx = new Ctx();
    if(audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, opts={}){
    if(!sfxOn && !opts.force) return;
    const ctx = ensureAudio();
    if(!ctx) return;
    const now = ctx.currentTime + (opts.delay || 0);
    const dur = opts.duration || 0.18;
    const type = opts.type || 'triangle';
    const volume = opts.volume ?? 0.03;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function chord(freqs, opts={}){ (freqs||[]).forEach((f,i)=>tone(f,{...opts, delay:(opts.delay||0)+i*0.005})); }

  function playClick(){ chord([523.25,659.25], {duration:0.07, volume:0.018, type:'triangle'}); }
  function playMode(){ chord([392,523.25], {duration:0.12, volume:0.022}); }
  function playCorrect(){ chord([523.25,659.25,783.99], {duration:0.18, volume:0.028}); tone(1046.5,{delay:0.08,duration:0.15,volume:0.03}); }
  function playWrong(){ tone(220,{duration:0.16,volume:0.025,type:'sawtooth'}); tone(196,{delay:0.06,duration:0.18,volume:0.022,type:'square'}); }
  function playKey(){ chord([659.25,783.99,1046.5], {duration:0.22, volume:0.03}); }
  function playTreasure(){ chord([523.25,659.25,783.99], {duration:0.18, volume:0.03}); chord([587.33,783.99,1174.66], {delay:0.12,duration:0.24,volume:0.032}); }
  function playRestart(){ chord([392,349.23,329.63], {duration:0.12, volume:0.022}); }

  function bgmTick(){
    if(!bgmOn) return;
    const ctx = ensureAudio();
    if(!ctx) return;
    const lead = melody[melodyStep % melody.length];
    const low = bass[melodyStep % bass.length];
    chord(Array.isArray(lead)?lead:[lead], {duration:0.33, volume:0.014, type:'triangle', force:true});
    tone(low,{duration:0.28, volume:0.009, type:'sine', force:true});
    melodyStep += 1;
  }

  function startBgm(){
    bgmOn = true;
    localStorage.setItem(storageKeyBgm,'1');
    ensureAudio();
    stopBgm();
    bgmTimer = setInterval(bgmTick, 420);
    bgmTick();
    syncDock();
  }
  function stopBgm(){
    bgmOn = false;
    localStorage.setItem(storageKeyBgm,'0');
    if(bgmTimer){ clearInterval(bgmTimer); bgmTimer = null; }
    syncDock();
  }
  function toggleBgm(){
    if(bgmOn){ stopBgm(); }
    else { startBgm(); }
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

  function dockHtml(){
    return `
      <div class="adventure-dock-title">冒險控制台</div>
      <div class="adventure-dock-actions">
        <button class="dock-btn" data-dock="theme">${themeLabels[currentTheme] || '🎨 主題'}</button>
        <button class="dock-btn" data-dock="bgm">${bgmOn ? '🎵 關閉背景音' : '🎵 開啟背景音'}</button>
        <button class="dock-btn" data-dock="sfx">${sfxOn ? '🔊 音效：開' : '🔇 音效：關'}</button>
      </div>
      <div class="adventure-dock-note">iPhone / iPad 需先點一次按鈕，背景音才會開始播放。</div>
    `;
  }

  function syncDock(){
    const dock = document.getElementById('adventureDock');
    if(dock) dock.innerHTML = dockHtml();
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
      ensureAudio();
      if(action === 'theme') cycleTheme();
      if(action === 'bgm') toggleBgm();
      if(action === 'sfx') toggleSfx();
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
      const target = e.target.closest('button, a.unit-tile, a.big-group-btn, a.link-btn');
      if(!target) return;
      playClick();
    }, {capture:true});
  }

  function init(){
    applyTheme(currentTheme);
    createDock();
    decorateHero();
    attachGlobalClickSound();
    document.addEventListener('pointerdown', ()=>ensureAudio(), {once:true});
    if(bgmOn){
      // wait for first user action in iOS, but keep setting
      document.addEventListener('pointerdown', ()=>{ if(localStorage.getItem(storageKeyBgm)==='1') startBgm(); }, {once:true});
    }
  }

  window.AdventureAudio = {
    unlock: ensureAudio,
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
  };

  document.addEventListener('DOMContentLoaded', init);
})();
