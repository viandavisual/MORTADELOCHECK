(()=>{'use strict';
const $=id=>document.getElementById(id);
const TOTAL=222;
const key='mortadelo-check-owned-v2';
const legacyKey='mortadelo-check-owned-v1';
const soundKey='mortadelo-check-muted-v1';
const PROGRESS_MESSAGES=[
  '¡BUEN TRABAJO, AGENTE NOVATO!',
  '¡BRAVO, PEDAZO DE ESPÍA!',
  '¡LA T.I.A. TE FELICITA!',
  '¡EL SÚPER ESTÁ CONTENTO!',
  '¡CHAPEAU, SUPERAGENTE!',
  '¡SOBRESALIENTE, PEDAZO DE CRACK!'
];
let catalog=[], owned=new Set(), filter='all', query='', modalNum=null, activePane='books';
let muted=localStorage.getItem(soundKey)==='1';
let listMode='owned';
const audio=$('bso'); if(audio) audio.volume=.42;
// El efecto de adquisición es independiente del control de la banda sonora.
const checkSound=$('checkSound');
if(checkSound) checkSound.volume=1;
function playCheckSound(){
  if(!checkSound) return;
  try{
    checkSound.pause();
    checkSound.currentTime=0;
    const result=checkSound.play();
    if(result && typeof result.catch==='function') result.catch(()=>{});
  }catch(e){ /* La lista debe seguir funcionando aunque el audio esté bloqueado. */ }
}

function toast(msg){const el=$('toast'); if(!el) return; el.textContent=msg; el.classList.remove('hidden'); clearTimeout(toast._t); toast._t=setTimeout(()=>el.classList.add('hidden'),3000)}
function elText(id,txt){const el=$(id); if(el) el.textContent=txt}
function loadOwned(){
  let arr=[];
  try{
    const raw = localStorage.getItem(key) || localStorage.getItem(legacyKey) || '[]';
    const parsed = JSON.parse(raw);
    if(Array.isArray(parsed)) arr=parsed;
  }catch(e){}
  owned = new Set(arr.filter(n=>Number.isInteger(n)&&n>=1&&n<=TOTAL));
  saveOwned();
}
function saveOwned(){
  try{ localStorage.setItem(key, JSON.stringify([...owned].sort((a,b)=>a-b))); }
  catch(e){ toast('No se pudo guardar el progreso'); }
}
loadOwned();

function progressMessageFor(count){
  const idx=Math.min(5, Math.max(0, Math.floor(Math.max(count-1,0)/37)));
  return PROGRESS_MESSAGES[idx];
}

function updateCounts(){
  const count = owned.size;
  const pct = count / TOTAL * 100;
  elText('countTop', count);
  elText('countUser', count);
  elText('percentUser', pct.toFixed(1).replace('.0','') + ' % completado');
  elText('progressMessage', progressMessageFor(count));
  const pb1=$('progressBar'), pb2=$('progressUser');
  if(pb1) pb1.style.width = pct + '%';
  if(pb2) pb2.style.width = pct + '%';
  if(activePane==='list') renderList();
}
function coverSrc(item){ return 'data/' + item.portada; }
function isOwned(n){ return owned.has(n); }
function toggleOwned(n){
  const newlyOwned=!owned.has(n);
  if(newlyOwned) owned.add(n); else owned.delete(n);
  if(newlyOwned) playCheckSound();
  saveOwned();
  updateCounts();
  renderCollection();
  if(modalNum===n) updateModalButton();
  if(moviola.open && moviola.index!==null && catalog[moviola.index]?.numero===n) updateMoviolaCheck();
}

function renderCollection(){
  const grid=$('books'); if(!grid) return; grid.replaceChildren();
  const items = catalog.filter(it => {
    const passFilter = filter==='all' || (filter==='owned' ? isOwned(it.numero) : !isOwned(it.numero));
    const q = query.trim().toLocaleLowerCase('es');
    const passQuery = !q || String(it.numero).includes(q) || it.titulo.toLocaleLowerCase('es').includes(q);
    return passFilter && passQuery;
  });
  $('empty')?.classList.toggle('hidden', items.length!==0);
  const frag=document.createDocumentFragment();
  for(const item of items){
    const card=document.createElement('article'); card.className='book'+(isOwned(item.numero)?' owned':'');
    const cover=document.createElement('button'); cover.type='button'; cover.className='cover-area'; cover.title='Ver portada completa de '+item.titulo;
    const img=document.createElement('img'); img.src=coverSrc(item); img.alt='Portada '+item.numero+' '+item.titulo; img.loading='lazy'; img.decoding='async';
    const check=document.createElement('span'); check.className='check'; check.setAttribute('role','checkbox'); check.setAttribute('aria-checked', isOwned(item.numero)?'true':'false'); check.setAttribute('aria-label','Marcar ejemplar número '+item.numero); check.textContent=isOwned(item.numero)?'✓':'';
    cover.append(img, check);
    check.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); toggleOwned(item.numero); });
    cover.addEventListener('click', e=>{ if(e.target!==check) openModal(item.numero); });

    const info=document.createElement('div'); info.className='book-info';
    const no=document.createElement('span'); no.className='book-no'; no.textContent=String(item.numero).padStart(3,'0');
    const title=document.createElement('span'); title.className='book-title'; title.textContent=item.titulo;
    info.append(no,title);
    card.append(cover, info);
    frag.append(card);
  }
  grid.append(frag);
}

function modalIndex(){ return catalog.findIndex(x=>x.numero===modalNum); }
function openModal(n){
  const item = catalog.find(x=>x.numero===n); if(!item) return;
  modalNum=n;
  elText('modalNumber', String(n).padStart(3,'0'));
  elText('modalTitle', item.titulo);
  const img=$('modalCover'); if(img){ img.src=coverSrc(item); img.alt='Portada de '+item.titulo; }
  updateModalButton();
  $('modal')?.classList.remove('hidden');
  document.body.style.overflow='hidden';
}
function updateModalButton(){ const b=$('modalToggle'); if(!b) return; b.textContent=isOwned(modalNum)?'✓':'○'; b.classList.toggle('owned', isOwned(modalNum)); }
function closeModal(){ $('modal')?.classList.add('hidden'); document.body.style.overflow=''; modalNum=null; }
function stepModal(dir){
  const idx=modalIndex(); if(idx<0) return;
  const next=(idx+dir+catalog.length)%catalog.length;
  openModal(catalog[next].numero);
}
$('closeModal')?.addEventListener('click', closeModal);
$('modalShade')?.addEventListener('click', closeModal);
$('modalToggle')?.addEventListener('click', ()=>{ if(modalNum!==null) toggleOwned(modalNum); });
$('modalPrev')?.addEventListener('click', ()=>stepModal(-1));
$('modalNext')?.addEventListener('click', ()=>stepModal(1));

function setActiveNav(id){
  ['navBooks','navUser','navList'].forEach(n=>$(n)?.classList.toggle('active', n===id));
}
function showPane(which){
  if(which!=='user' && $('episodesPanel')?.open){ $('episodesPanel').open=false; document.body.classList.remove('mc-episodes-open'); }
  if(!$('modal')?.classList.contains('hidden')) closeModal();
  if(moviola.open) closeMoviola();
  activePane=which;
  document.body.classList.toggle('mc-progress-active', which==='user');
  $('collectionPane')?.classList.toggle('hidden', which!=='books');
  $('userPane')?.classList.toggle('hidden', which!=='user');
  $('listPane')?.classList.toggle('hidden', which!=='list');
  setActiveNav(which==='books'?'navBooks':which==='user'?'navUser':'navList');
  if(which==='list') renderList();
  window.scrollTo({top:0, behavior:'auto'});
}
$('navBooks')?.addEventListener('click', ()=>showPane('books'));
$('navUser')?.addEventListener('click', ()=>showPane('user'));
$('navList')?.addEventListener('click', ()=>showPane('list'));
function syncChromeDimensions(){const nav=document.querySelector('.bottom'),header=document.querySelector('.top');if(nav)document.documentElement.style.setProperty('--mc-footer-height',nav.getBoundingClientRect().height+'px');if(header)document.documentElement.style.setProperty('--mc-header-height',header.getBoundingClientRect().height+'px')}
window.addEventListener('resize', syncChromeDimensions);window.addEventListener('orientationchange', syncChromeDimensions);if('ResizeObserver' in window){const obs=new ResizeObserver(syncChromeDimensions);obs.observe(document.querySelector('.bottom'));obs.observe(document.querySelector('.top'))}syncChromeDimensions();
$('search')?.addEventListener('input', e=>{ query=e.target.value||''; renderCollection(); });
$('filters')?.addEventListener('click', e=>{
  const btn=e.target.closest('button[data-filter]'); if(!btn) return;
  filter=btn.dataset.filter;
  [...$('filters').querySelectorAll('button')].forEach(b=>b.classList.toggle('selected', b===btn));
  renderCollection();
});

async function tryMusic(){ if(muted) return; try{ await audio.play(); }catch(e){ toast('Pulsa ♫ para activar la música'); } updateSoundBtn(); }
function updateSoundBtn(){ const st=$('soundState'); if(st) st.textContent = muted ? 'OFF' : 'ON'; const btn=$('soundBtn'); btn?.setAttribute('aria-pressed', String(!muted)); btn?.classList.toggle('is-muted', muted); btn?.setAttribute('title', muted ? 'Activar música' : 'Silenciar música'); btn?.setAttribute('aria-label', muted ? 'Activar música' : 'Silenciar música'); }
$('soundBtn')?.addEventListener('click', async()=>{ muted=!muted; localStorage.setItem(soundKey, muted?'1':'0'); if(muted){ audio.pause(); } else { await tryMusic(); } updateSoundBtn(); });
$('enterBtn')?.addEventListener('click', ()=>{ $('welcome')?.classList.add('hidden'); $('shell')?.classList.remove('hidden'); showPane('books'); tryMusic(); });
updateSoundBtn();

// CAPÍTULOS: reproductor de la playlist proporcionada y listado de referencia de la serie.
const episodesTitles=[
 'El sulfato atómico', 'El caso de los gamberros', 'Magín, el mago',
 'La máquina de copiar gente', 'En busca del antídoto', 'El contrabando',
 'Los cacharros majaretas', 'La gallina de los huevos de oro', 'La elasticina',
 'Casos aéreos', 'El otro yo del profesor Bacterio', 'El caso de Billy el Horrendo',
 'Los inventos del profesor Bacterio', 'El caso de los diamantes', 'El caso de los sobornos',
 'Testigo de cargo', 'Misión de perros', 'El balón catastrófico',
 'Los superhéroes del profesor Bacterio', 'El caso de los secuestradores',
 'El caso de la estatua de la Libertad', 'Safari callejero', 'Hay un traidor en la T.I.A.',
 'La venganza de Ten-Go-Pis', 'La brigada bichera', 'El ansia de poder'
];
const episodesPanel=$('episodesPanel');
const episodesList=$('episodesList');
if(episodesList){
  for(const title of episodesTitles){
    const li=document.createElement('li'); li.textContent=title; episodesList.append(li);
  }
}
if(episodesPanel){
 episodesPanel.addEventListener('toggle',()=>{
  const open=episodesPanel.open;
  document.body.classList.toggle('mc-episodes-open',open && activePane==='user');
  const mount=$('episodesVideoMount');
  if(!mount) return;
  mount.replaceChildren();
  if(open){
   const frame=document.createElement('iframe');
   frame.src='https://www.youtube-nocookie.com/embed/videoseries?list=PLmdLOXt-r6Y_Qa1SXtnTxyg8sPMTQoOem&rel=0';
   frame.title='Mortadelo y Filemón - Lista de reproducción de 26 capítulos';
   frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
   frame.allowFullscreen=true;
   frame.referrerPolicy='strict-origin-when-cross-origin';
   frame.loading='lazy';
   mount.append(frame);
  }
 });
}

// MOVIOLA v5.6: PUSH horizontal. Por defecto sale por la derecha y entra por la izquierda.
const moviola={open:false,index:null,timer:null,crossTimer:null,holdMs:3000,pushMs:1000,epoch:0,paused:false,transitioning:false};
const moviolaEl=$('moviola');
let currentImg=$('moviolaCurrent'),nextImg=$('moviolaNext');
const coverWarmCache=new Map();
function clearMoviolaTimers(){clearTimeout(moviola.timer);clearTimeout(moviola.crossTimer);moviola.timer=null;moviola.crossTimer=null}
function updateMoviolaCheck(){
 if(moviola.index===null)return;
 const n=catalog[moviola.index].numero,btn=$('moviolaCheck');
 btn.textContent=isOwned(n)?'✓':'○';btn.classList.toggle('owned',isOwned(n));btn.setAttribute('aria-pressed',String(isOwned(n)));
}
function updateMoviolaInfo(){
 if(moviola.index===null)return;
 const item=catalog[moviola.index];
 elText('moviolaNumber',String(item.numero).padStart(3,'0'));
 elText('moviolaTitle',item.titulo);
 elText('moviolaProgress',(moviola.index+1)+' / '+catalog.length);
 updateMoviolaCheck();
}
function preloadCover(index){
 const src=coverSrc(catalog[(index+catalog.length)%catalog.length]);
 if(coverWarmCache.has(src))return coverWarmCache.get(src);
 const promise=new Promise((resolve,reject)=>{
  const im=new Image();
  im.onload=()=>{if(im.decode)im.decode().then(()=>resolve(src),()=>resolve(src));else resolve(src)};
  im.onerror=()=>reject(new Error('No pudo cargarse '+src));im.src=src;
 });
 coverWarmCache.set(src,promise);promise.catch(()=>coverWarmCache.delete(src));
 if(coverWarmCache.size>8)coverWarmCache.delete(coverWarmCache.keys().next().value);
 return promise;
}
// MOVIOLA v5.8 — Animación directa de las dos imágenes. Nunca reanimamos la saliente.
// Al finalizar se oculta el panel viejo ANTES de retirar las animaciones.
function resetPushState(){
  for(const img of [currentImg,nextImg]){
    img.getAnimations().forEach(anim=>anim.cancel());
    img.style.transform='';
  }
  moviolaEl.classList.remove('pushing','push-reverse','push-committing');
  currentImg.className='moviola-img current';
  nextImg.className='moviola-img next';
  currentImg.style.setProperty('visibility','visible','important');
  nextImg.style.setProperty('visibility','hidden','important');
}
function setMoviolaCurrent(index){
  if(!catalog.length)return;
  clearMoviolaTimers();const token=++moviola.epoch;
  const target=(index+catalog.length)%catalog.length,item=catalog[target];
  preloadCover(target).then(()=>{
    if(!moviola.open||token!==moviola.epoch)return;
    resetPushState();
    currentImg.src=coverSrc(item);currentImg.alt='Portada '+item.numero+' '+item.titulo;
    nextImg.removeAttribute('src');moviola.index=target;moviola.transitioning=false;updateMoviolaInfo();
    preloadCover(target+1).catch(()=>{});
    if(!moviola.paused)scheduleMoviola();
  }).catch(()=>{if(token===moviola.epoch)toast('No se pudo cargar esta portada')});
}
function scheduleMoviola(){
  clearMoviolaTimers();
  if(moviola.open&&!moviola.paused&&!moviola.transitioning)
    moviola.timer=setTimeout(()=>pushTo(moviola.index+1,1),moviola.holdMs);
}
async function pushTo(index,direction=1){
  if(!moviola.open||moviola.index===null||moviola.transitioning)return;
  clearMoviolaTimers();const token=++moviola.epoch;
  const nextIndex=(index+catalog.length)%catalog.length,item=catalog[nextIndex];
  moviola.transitioning=true;
  try{await preloadCover(nextIndex)}catch(e){
    if(token===moviola.epoch){moviola.transitioning=false;scheduleMoviola()}return;
  }
  if(!moviola.open||token!==moviola.epoch)return;
  nextImg.src=coverSrc(item);nextImg.alt='Portada '+item.numero+' '+item.titulo;
  try{if(nextImg.decode)await nextImg.decode()}catch(e){}
  if(!moviola.open||token!==moviola.epoch)return;

  const out=direction<0?-100:100;
  currentImg.style.setProperty('visibility','visible','important');
  nextImg.style.setProperty('visibility','visible','important');
  const duration=moviola.pushMs;
  const opts={duration,easing:'cubic-bezier(.33,0,.67,1)',fill:'forwards'};
  const leaving=currentImg.animate([
    {transform:'translateX(0%)'},
    {transform:`translateX(${out}%)`}
  ],opts);
  const arriving=nextImg.animate([
    {transform:`translateX(${-out}%)`},
    {transform:'translateX(0%)'}
  ],opts);
  moviola.activeAnimations=[leaving,arriving];
  try{await Promise.all([leaving.finished,arriving.finished])}catch(e){return}
  if(!moviola.open||token!==moviola.epoch)return;

  // La portada vieja ya ha salido de pantalla: ocultarla antes de cancelar el PUSH.
  const old=currentImg;
  old.style.setProperty('visibility','hidden','important');
  arriving.cancel(); // nueva portada sigue en 0%, sin animación ni desplazamiento residual
  leaving.cancel(); // la antigua está oculta, no puede volver a cruzar la pantalla
  currentImg=nextImg;nextImg=old;
  currentImg.className='moviola-img current';
  nextImg.className='moviola-img next';
  currentImg.style.setProperty('visibility','visible','important');
  nextImg.style.setProperty('visibility','hidden','important');
  nextImg.removeAttribute('src');
  moviola.activeAnimations=[];
  moviola.index=nextIndex;moviola.transitioning=false;updateMoviolaInfo();
  preloadCover(nextIndex+1).catch(()=>{});
  if(!moviola.paused)scheduleMoviola();
}
function openMoviola(startIndex=0){
 if(!catalog.length)return;
 moviola.open=true;moviola.paused=false;moviola.transitioning=false;moviola.index=null;
 moviolaEl.classList.remove('hidden','pushing','push-reverse');
 $('moviolaBtn')?.classList.add('is-active');$('moviolaBtn')?.setAttribute('aria-pressed','true');
 document.body.style.overflow='hidden';
 setMoviolaCurrent(startIndex);
}
function closeMoviola(){
 moviola.open=false;moviola.index=null;moviola.paused=false;moviola.transitioning=false;++moviola.epoch;clearMoviolaTimers();
 moviolaEl.classList.add('hidden');resetPushState();
 $('moviolaBtn')?.classList.remove('is-active');$('moviolaBtn')?.setAttribute('aria-pressed','false');
 document.body.style.overflow='';
}
function moviolaStep(dir){
 if(!moviola.open||moviola.index===null)return;
 if(moviola.transitioning)return;
 pushTo(moviola.index+dir,dir);
}
$('moviolaBtn')?.addEventListener('click',()=>openMoviola(0));
$('moviolaClose')?.addEventListener('click',closeMoviola);
$('moviolaPrev')?.addEventListener('click',()=>moviolaStep(-1));
$('moviolaNextBtn')?.addEventListener('click',()=>moviolaStep(1));
$('moviolaCheck')?.addEventListener('click',()=>{if(moviola.index!==null)toggleOwned(catalog[moviola.index].numero)});
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){ if(!$('installOverlay').classList.contains('hidden'))closeInstallHelp(); else if(!$('exportPreview').classList.contains('hidden'))closeExportPreview(); else if(moviola.open) closeMoviola(); else closeModal(); }
  if(moviola.open){
    if(e.key==='ArrowLeft'){ e.preventDefault(); moviolaStep(-1); }
    else if(e.key==='ArrowRight'){ e.preventDefault(); moviolaStep(1); }
    else if(e.key===' '){ e.preventDefault(); moviola.paused=!moviola.paused; if(moviola.paused){clearMoviolaTimers();toast('Moviola en pausa')}else if(!moviola.transitioning){scheduleMoviola()} }
  } else if(!$('modal')?.classList.contains('hidden')){
    if(e.key==='ArrowLeft'){ e.preventDefault(); stepModal(-1); }
    else if(e.key==='ArrowRight'){ e.preventDefault(); stepModal(1); }
  }
});

// MI LISTADO (tercera sección)
function listItems(){
  return catalog.filter(item => listMode==='owned' ? isOwned(item.numero) : !isOwned(item.numero)).map(item=>item.numero);
}
function renderList(){
  const nums=listItems();
  $('listOwned')?.classList.toggle('active', listMode==='owned');
  $('listMissing')?.classList.toggle('active', listMode==='missing');
  elText('listCounter', nums.length + '/222');
  elText('listDescription', listMode==='owned' ? 'Ejemplares que tengo' : 'Ejemplares que me faltan');
  const box=$('listNumbers'); if(!box) return; box.replaceChildren();
  box.classList.toggle('missing', listMode==='missing');
  $('listPane')?.querySelector('.list-page')?.setAttribute('data-mode', listMode);
  if(!nums.length){ const p=document.createElement('p'); p.className='list-empty'; p.textContent=listMode==='owned'?'Todavía no has marcado ningún ejemplar.':'¡No te falta ninguno!'; box.append(p); return; }
  const frag=document.createDocumentFragment();
  nums.forEach(n=>{ const s=document.createElement('button'); s.type='button'; s.className='number-bubble'; s.textContent=String(n); s.setAttribute('aria-label','Abrir ejemplar '+n); s.addEventListener('click',()=>{showPane('books');openModal(n)}); frag.append(s); });
  box.append(frag);
}
$('listOwned')?.addEventListener('click', ()=>{ listMode='owned'; renderList(); });
$('listMissing')?.addEventListener('click', ()=>{ listMode='missing'; renderList(); });

const rrect=(ctx,x,y,w,h,r)=>{ ctx.beginPath(); if(ctx.roundRect){ ctx.roundRect(x,y,w,h,r); } else { ctx.rect(x,y,w,h);} };
function paintText(ctx, txt, x, y, font, color, align='left'){ ctx.font=font; ctx.fillStyle=color; ctx.textAlign=align; ctx.fillText(txt, x, y); }
async function loadImg(src){
  return new Promise(resolve=>{
    const im = new Image();
    im.onload = ()=>resolve(im);
    im.onerror = ()=>resolve(null);
    im.src = src;
  });
}
function canvasToBlob(canvas){
  return new Promise(resolve=>{
    if(canvas.toBlob){
      canvas.toBlob(blob=>resolve(blob),'image/png',1);
    } else {
      fetch(canvas.toDataURL('image/png')).then(r=>r.blob()).then(resolve).catch(()=>resolve(null));
    }
  });
}
async function makeListCanvas(){
  const nums=listItems();
  const has=listMode==='owned';
  const cols=6;
  const rows=Math.max(1, Math.ceil(nums.length/cols));
  const rowH=62;
  const w=1080;
  const headerH=300;
  const titleY=350;
  const toolbarY=430;
  const toolbarH=86;
  const gridTop=560;
  const bubbleW=120, bubbleH=42, gapX=18, gapY=14;
  const numbersHeight=Math.max(185, rows*rowH + 48);
  const footerH=54;
  const h=Math.max(1280, gridTop + numbersHeight + 42 + footerH);
  const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
  const c=cv.getContext('2d');
  c.fillStyle='#fff6df'; c.fillRect(0,0,w,h);

  c.fillStyle='#f5c846'; c.fillRect(0,0,w,headerH);
  const avatar=await loadImg(window.MC_EXPORT_IMAGES?.avatar || 'assets/avatar.png');
  if(avatar){
    c.save(); c.beginPath(); c.arc(145,145,98,0,Math.PI*2); c.clip(); c.drawImage(avatar,47,47,196,196); c.restore();
    c.lineWidth=7; c.strokeStyle='#24170e'; c.beginPath(); c.arc(145,145,100,0,Math.PI*2); c.stroke();
  }
  const logo=await loadImg(window.MC_EXPORT_IMAGES?.logo || 'assets/mortadelo-check-logo.png');
  if(logo){
    const maxW=740, maxH=210; const ratio=Math.min(maxW/logo.width, maxH/logo.height); const dw=logo.width*ratio, dh=logo.height*ratio;
    c.drawImage(logo, 290, 44, dw, dh);
  }
  paintText(c, 'MI LISTADO', w/2, titleY, '900 48px Arial', '#24190e', 'center');
  paintText(c, 'OLÉ! · 222 EJEMPLARES', w/2, titleY+38, '900 22px Arial', '#8a6236', 'center');

  c.fillStyle=has?'#2d9b45':'#fffdf7'; rrect(c, 38, toolbarY, 240, 74, 36); c.fill(); c.lineWidth=4; c.strokeStyle='#1d140d'; c.stroke();
  paintText(c,'TENGO',158,toolbarY+47,'900 33px Arial',has?'#fff':'#24190e','center');

  c.fillStyle=!has?'#c94a34':'#fffdf7'; rrect(c, 292, toolbarY, 240, 74, 36); c.fill(); c.lineWidth=4; c.strokeStyle='#1d140d'; c.stroke();
  paintText(c,'FALTAN',412,toolbarY+47,'900 33px Arial',!has?'#fff':'#24190e','center');

  c.fillStyle='#fffdfa'; rrect(c, 800, toolbarY-8, 245, toolbarH, 24); c.fill(); c.lineWidth=4; c.strokeStyle='#1d140d'; c.stroke();
  paintText(c, nums.length + '/222', 922, toolbarY+37, '900 40px Arial', '#24190e', 'center');
  paintText(c, has ? 'Ejemplares que tengo' : 'Ejemplares que me faltan', 922, toolbarY+64, '900 18px Arial', '#7f6139', 'center');

  c.fillStyle='#fffdfa'; rrect(c, 42, gridTop, w-84, numbersHeight, 28); c.fill(); c.lineWidth=3; c.strokeStyle='#ebd8b3'; c.stroke();

  if(nums.length){
    const totalW=cols*bubbleW+(cols-1)*gapX;
    const startX=(w-totalW)/2, y=gridTop+28;
    nums.forEach((n,idx)=>{
      const col=idx%cols, row=Math.floor(idx/cols); const x=startX + col*(bubbleW+gapX), yy=y + row*(bubbleH+gapY);
      c.fillStyle = has ? '#2d9b45' : '#c94a34'; rrect(c,x,yy,bubbleW,bubbleH,21); c.fill();
      c.lineWidth=3; c.strokeStyle='#1d140d'; c.stroke();
      paintText(c, String(n), x+bubbleW/2, yy+28, '900 24px Arial', '#ffffff', 'center');
    });
  } else {
    paintText(c, has ? 'Todavía no has marcado ningún ejemplar.' : '¡No te falta ninguno!', w/2, gridTop+96, '900 30px Arial', '#6b5a42', 'center');
  }

  c.fillStyle='#24170e'; c.fillRect(0,h-footerH,w,footerH);
  const stamp=new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date()).replace(',', ' ·');
  const footerLine='MORTADELO CHECK · '+stamp+' · MODO: '+(has?'TENGO':'FALTAN');
  paintText(c, footerLine, w/2, h-18, '900 22px Arial', '#fff6df', 'center');
  return cv;
}

let exportState=null;
function closeExportPreview(){
 $('exportPreview').classList.add('hidden');
 document.body.style.overflow='';
}
$('exportClose').addEventListener('click',closeExportPreview);
$('exportPreview').addEventListener('click',e=>{if(e.target===$('exportPreview'))closeExportPreview()});
function directDownload(dataUrl,name){
 const link=document.createElement('a');
 link.href=dataUrl; link.download=name;
 link.style.display='none'; document.body.appendChild(link);
 link.click(); link.remove();
}
$('exportDownload').addEventListener('click',()=>{
 if(!exportState) return;
 directDownload(exportState.dataUrl,exportState.name);
 toast('PNG descargado o preparado para guardar');
});
$('saveListPng').addEventListener('click',async()=>{
 const btn=$('saveListPng');const before=btn.textContent;
 btn.disabled=true;btn.textContent='PREPARANDO IMAGEN…';
 try{
  const mode=listMode;
  const canvas=await makeListCanvas();
  const dataUrl=canvas.toDataURL('image/png');
  if(!dataUrl.startsWith('data:image/png'))throw Error('La imagen PNG no se pudo generar');
  exportState={dataUrl,name:'MORTADELO_CHECK_'+(mode==='owned'?'TENGO':'FALTAN')+'.png'};
  const preview=$('exportPreviewImage'); preview.src=dataUrl;
  $('exportPreview').classList.remove('hidden');
  document.body.style.overflow='hidden';
 }catch(err){console.error('Error exportando imagen:',err);toast('No se pudo generar el PNG. Comprueba la consola.');}
 finally{btn.disabled=false;btn.textContent=before}
});

// INSTALACIÓN PWA: botón visible sin cuentas ni pasos técnicos.
let deferredInstallPrompt=null;
let installInProgress=false;
// Android: descarga de la APK firmada; otros sistemas: instalación PWA habitual.
// En Android WebView ya estamos dentro de la APK: no ofrecemos reinstalarla.
const mcUserAgent=navigator.userAgent||'';
const mcIsAndroid=/Android/i.test(mcUserAgent);
const mcIsWebView=mcIsAndroid && (/; wv[);]/i.test(mcUserAgent) || /\bVersion\/4\.0.*Chrome\//i.test(mcUserAgent));
const mcApkUrl=new URL('./downloads/MORTADELO_CHECK.apk',document.baseURI).href;
const installedNow=()=>window.matchMedia('(display-mode: standalone)').matches ||
                         window.matchMedia('(display-mode: minimal-ui)').matches ||
                         !!window.navigator.standalone;
function updateInstallButton(){
 const btn=$('installBtn');if(!btn)return;
 const done=mcIsWebView || (!mcIsAndroid && installedNow());
 btn.disabled=done;
 btn.classList.toggle('is-installed',done);
 btn.innerHTML=done?'<span aria-hidden="true">✓</span> INSTALADA':mcIsAndroid?'<span aria-hidden="true">⬇</span> INSTALAR APK':'<span aria-hidden="true">⬇</span> INSTALAR';
 btn.setAttribute('aria-label',done?'Aplicación ya instalada':mcIsAndroid?'Descargar APK para Android':'Instalar MORTADELO CHECK');
}
function downloadMortadeloApk(){
 // Una navegación directa, disparada por el toque, evita perder la activación
 // del usuario en navegadores que bloquean las descargas iniciadas después de await.
 const a=document.createElement('a');
 a.href=mcApkUrl;
 a.download='MORTADELO_CHECK.apk';
 a.rel='noopener';
 a.style.display='none';
 document.body.appendChild(a);
 a.click();
 a.remove();
}
window.addEventListener('beforeinstallprompt',event=>{
 event.preventDefault();
 deferredInstallPrompt=event;
 updateInstallButton();
});
window.addEventListener('appinstalled',()=>{
 deferredInstallPrompt=null;
 updateInstallButton();
 closeInstallHelp();
 toast('MORTADELO CHECK instalada');
});
function closeInstallHelp(){
 $('installOverlay').classList.add('hidden');
 document.body.style.overflow='';
}
function showInstallHelp(){
 const ua=navigator.userAgent||'';
 const isIOS=/iPhone|iPad|iPod/i.test(ua)||(/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1);
 const android=/Android/i.test(ua);
 const safari=/Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
 let msg='';
 if(location.protocol==='file:'){
   msg='Para instalarla, abre MORTADELO CHECK desde su dirección publicada en GitHub Pages (https://). Desde un archivo abierto con doble clic puedes usarla, pero no instalarla como aplicación.';
 } else if(installedNow()){
   msg='¡Ya estás utilizando MORTADELO CHECK como aplicación instalada!';
 } else if(isIOS){
   msg=safari
     ? 'Pulsa el botón Compartir del navegador (el cuadrado con una flecha) y elige «Añadir a pantalla de inicio». Después pulsa «Añadir».'
     : 'Abre este mismo enlace en Safari. Allí pulsa Compartir y después «Añadir a pantalla de inicio».';
 } else if(android){
   msg='Abre el menú ⋮ del navegador y selecciona «Instalar aplicación» o «Añadir a pantalla de inicio». Después confirma.';
 } else {
   msg='En Chrome o Edge, abre el menú ⋮ y selecciona «Instalar MORTADELO CHECK» o «Instalar aplicación». También puede aparecer un icono de instalación a la derecha de la dirección web.';
 }
 $('installInstructions').textContent=msg;
 $('installOverlay').classList.remove('hidden');
 document.body.style.overflow='hidden';
}
$('installBtn').addEventListener('click',async()=>{
 if(mcIsWebView || (!mcIsAndroid && installedNow())){updateInstallButton();return;}
 if(mcIsAndroid){
   if(location.protocol==='file:'){
     $('installInstructions').textContent='Abre primero MORTADELO CHECK desde su web publicada para descargar la aplicación Android.';
     $('installOverlay').classList.remove('hidden');
     return;
   }
   downloadMortadeloApk();
   return;
 }
 if(deferredInstallPrompt && !installInProgress){
   installInProgress=true;
   try{
     const prompt=deferredInstallPrompt;
     deferredInstallPrompt=null;
     await prompt.prompt();
     const choice=await prompt.userChoice;
     if(choice?.outcome==='accepted')toast('Instalación solicitada');
     else showInstallHelp();
   }catch(err){console.warn('Instalación nativa no disponible:',err);showInstallHelp();}
   finally{installInProgress=false;updateInstallButton();}
 }else showInstallHelp();
});
$('installClose').addEventListener('click',closeInstallHelp);
$('installAction').addEventListener('click',closeInstallHelp);
$('installOverlay').addEventListener('click',event=>{if(event.target===$('installOverlay'))closeInstallHelp()});
window.matchMedia('(display-mode: standalone)').addEventListener?.('change',updateInstallButton);
updateInstallButton();

Promise.resolve(window.MORTADELO_CATALOG).then(data=>{
  catalog=data.registros||[];
  if(catalog.length!==TOTAL || new Set(catalog.map(x=>x.numero)).size!==TOTAL) throw new Error('Catálogo incompleto');
  updateCounts(); renderCollection(); renderList();
}).catch(err=>{ console.error(err); $('books').textContent='No se ha podido cargar el catálogo.'; toast('Error cargando catálogo'); });
if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost')) navigator.serviceWorker.register('./sw.js').catch(console.warn);
})();
