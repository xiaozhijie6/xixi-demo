
/* ============ PERF runtime helpers ============ */
const $ = (id) => document.getElementById(id);
const $$ = (sel, root=document) => root.querySelectorAll(sel);
const timers = new Set();
function later(fn, ms){
  const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
  timers.add(id);
  return id;
}
function clearTimers(){
  timers.forEach(clearTimeout);
  timers.clear();
}
const els = {
  get qnav(){ return this._qnav || (this._qnav = $('quicknav')); },
  get tabbar(){ return this._tabbar || (this._tabbar = $('tabbar')); },
  get pgHead(){ return this._pgHead || (this._pgHead = $('pgHead')); },
  get pgTitle(){ return this._pgTitle || (this._pgTitle = $('pgTitle')); },
  get pgBack(){ return this._pgBack || (this._pgBack = $('pgBack')); },
  get chatTop(){ return this._chatTop || (this._chatTop = $('chatTop')); },
  get chatInputBar(){ return this._chatInputBar || (this._chatInputBar = $('chatInputBar')); },
  get orbPet(){ return this._orbPet || (this._orbPet = $('orbPet')); },
  get bookbar(){ return this._bookbar || (this._bookbar = $('bookbar')); },
  get statusbar(){ return this._statusbar || (this._statusbar = document.querySelector('.statusbar')); },
  get chatBody(){ return this._chatBody || (this._chatBody = $('chatBody')); },
  get quickActs(){ return this._quickActs || (this._quickActs = $('quickActs')); },
  get chatInput(){ return this._chatInput || (this._chatInput = $('chatInput')); },
  get orbEyes(){ return this._orbEyes || (this._orbEyes = $('orbEyes')); },
  get toast(){ return this._toast || (this._toast = $('toast')); },
  get chatCards(){ return this._chatCards || (this._chatCards = $('chatCards')); },
};
document.addEventListener('visibilitychange', () => {
  document.documentElement.classList.toggle('page-hidden', document.hidden);
});

/* ============ 路由 ============ */
const SCREENS=[['s-launch','启动页'],['s-onboard','问卷页'],['s-summary','汇总页'],['s-home','首页'],['s-chat','AI树洞'],['s-prediag','预诊断'],
  ['s-report','诊断报告'],['s-consultants','咨询师列表'],['s-cdetail','咨询师详情'],
  ['s-sleep','失眠专区'],['s-content','每日成长'],['s-me','我的'],['s-moodcal','心情月历']];
const qnav=document.getElementById('quicknav');
SCREENS.forEach(([id,name])=>{
  const b=document.createElement('button');b.textContent=name;
  b.onclick=()=>{if(id==='s-onboard')initOnboard();go(id);};
  b.dataset.s=id;qnav.appendChild(b);
});
/* 顶栏 scroll edge：内容滚到栏下时才淡入分隔线 */
$$('.screen').forEach(s=>{
  let ticking=false;
  s.addEventListener('scroll',()=>{
    if(ticking)return;
    ticking=true;
    requestAnimationFrame(()=>{
      ticking=false;
      const over=s.scrollTop>8;
      if(s.id==='s-chat')els.chatTop.classList.toggle('scrolled',over);
      else if(PG_HEAD[s.id])els.pgHead.classList.toggle('scrolled',over);
    });
  },{passive:true});
});
const TAB_SCREENS=['s-home','s-content','s-consultants','s-me'];
/* 子页面共享顶栏配置：标题 / 返回目标 / 深色 */
const PG_HEAD={'s-prediag':['AI 预诊断','s-chat'], 's-report':['预诊断完成','s-home'],
  's-consultants':['真人咨询','s-home'], 's-cdetail':['咨询师详情','s-consultants'],
  's-sleep':['失眠关怀专区','s-home',1], 's-content':['每日成长','s-home'], 's-me':['我的','s-home'], 's-moodcal':['心情月历','s-home']};
function go(id){
  if(go._cur===id)return;
  const prev=go._cur;
  go._cur=id;
  /* leaving chat/prediag: cancel pending script timers to avoid ghost work */
  if(prev==='s-chat'||prev==='s-prediag'||prev==='s-launch'){
    clearTimers();
    if(prev==='s-chat')chatBusy=false;
    if(prev==='s-prediag')pdRunning=false;
  }
  $$('.screen').forEach(s=>s.classList.remove('active'));
  const t=$(id);
  if(!t)return;
  /* only force reflow when enter animation classes matter */
  if(id==='s-home'||id==='s-launch')void t.offsetWidth;
  t.classList.add('active');
  t.scrollTop=id==='s-chat'?t.scrollHeight:0;
  const ph=els.pgHead;
  if(PG_HEAD[id]){
    ph.classList.add('on');
    ph.classList.toggle('dark',!!PG_HEAD[id][2]);
    els.pgTitle.textContent=PG_HEAD[id][0];
    els.pgBack.onclick=()=>go(PG_HEAD[id][1]);
  }else{
    ph.classList.remove('on');
  }
  ph.classList.remove('scrolled');
  els.chatTop.classList.remove('scrolled');
  const onTab=TAB_SCREENS.includes(id);
  const onChat=id==='s-chat';
  els.tabbar.classList.toggle('on',onTab);
  els.chatInputBar.classList.toggle('on',onChat);
  els.chatTop.classList.toggle('on',onChat);
  els.orbPet.classList.toggle('on',onChat);
  if(!onChat)els.orbPet.classList.remove('peek');
  els.bookbar.classList.toggle('on',id==='s-cdetail');
  $$('#tabbar .tab').forEach(tb=>tb.classList.toggle('on',tb.dataset.t===id));
  $$('#quicknav button').forEach(b=>b.classList.toggle('on',b.dataset.s===id));
  els.statusbar.classList.toggle('dark',id==='s-sleep');
  closePay();closeCrisis();
  if(onChat)resetCards();
  if(id==='s-prediag')startPrediag();
}
go._cur=null;
/* ============ 启动页 → 问卷(v4流程版) → 汇总/首页 路由 ============ */
const OB_KEY='xixi_onboard_v2';
const OB_STEPS=[
  {type:'multi',max:3,label:'当前困扰 · 多选，最多 3 项',title:'最近，哪些事让你想找人说说？',sub:'选最接近的就好，之后可改。',
   skip:'暂时不想说',note:'我在听。',
   opts:['伴侣沟通不顺','婚姻出现变化','对关系感到不安','家庭/亲子压力','情绪起伏大','工作生活压力大','失眠、想太多','孤独、没人理解','想更了解自己','只是想说说话']},
  {type:'multi',max:2,label:'陪伴偏好 · 多选，最多 2 项',title:'你希望西西怎么陪你？',sub:'没有标准答案，我会边聊边调。',
   skip:'还不确定，先聊聊',note:'慢慢来。',
   opts:['先听我说完','帮我把事理清楚','帮我看见真实感受','一起想想怎么办','提醒我注意安全与边界','需要时联系真人咨询师','还不确定，先聊聊']},
  {type:'single',label:'关系阶段 · 单选，可跳过',title:'你目前大致处在哪个阶段？',sub:'只用来更好理解你，不会替你做关系决定。',
   skip:'暂时不想说',note:'谢谢你愿意说。',
   opts:['单身 / 暂无稳定关系','恋爱 / 稳定交往','已婚 / 共同生活','分居、离婚或关系变动中','情况比较复杂','暂时不想说']},
  {type:'single',label:'当前情绪 · 单选',title:'此刻感受更接近？',sub:'选最接近的一项即可。',
   skip:'说不清楚',note:'辛苦了。',
   opts:['比较平静','有些委屈','焦虑不安','生气烦躁','疲惫无力','难过想哭','感到绝望','说不清楚']},
  {type:'name',label:'怎么称呼 · 可选',title:'我可以怎么叫你？',sub:'不用真名，只用于陪伴称呼。',
   skip:'暂时不设置',note:'很高兴认识你。'},
];
const OB_FX=['wipe','blinds','zoom','peel'];   // 离开第 k 步时的转场
const obMs=t=>new Promise(r=>setTimeout(r,t));
let obCur=0,obBusy=false,obPage=null,obSel=new Set(),obName='',twToken=0;
const obAnswers={};
let obEnv,obEnvWrap,obEvNote,obStage,obFx,obCta,obCnt,obMaxLab,obMetaLab,obSkipBtn,obStepNo,obWm,obBackBtn;
/* ================= 页面渲染 ================= */
function typewrite(el,text,speed,token){
  el.innerHTML='<span id="tw"></span><span class="caret"></span>';
  const tw=el.querySelector('#tw');let i=0;
  (function tick(){
    if(token!==twToken)return;
    if(i<text.length){tw.textContent+=text[i++];setTimeout(tick,speed)}
  })();
}
function buildObPage(idx){
  const st=OB_STEPS[idx], p=document.createElement('div');
  p.className='ob-page e'+(idx+1);
  let titleHTML;
  if(idx===0){
    titleHTML=[...st.title].map((c,k)=>`<span class="ch"><i style="--d:${k*32}">${c}</i></span>`).join('');
  }else if(idx===2){
    titleHTML=`${st.title}<span class="bar"></span>`;
  }else titleHTML=st.title;
  let body='';
  if(st.type==='name'){
    body=`<div class="namewrap">
      <div class="namerow"><input id="obNm" placeholder="写一个喜欢的称呼" maxlength="8"><button id="obNmGo">›</button></div>
      <button class="chip" id="obQuick"><svg viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>用昵称「小美」</button>
    </div>`;
  }else{
    body=`<div class="ob-list">`+st.opts.map((o,k)=>`
      <div class="ob-row" style="--i:${k}" data-k="${k}">
        <span class="no">${String(k+1).padStart(2,'0')}</span><span class="nm">${o}</span>
        <svg class="box" viewBox="0 0 21 21"><rect class="fill" x="1" y="1" width="19" height="19" rx="3"/><rect x="1" y="1" width="19" height="19" rx="3"/><path class="tick" d="M6 10.5l3.2 3.2L15.5 7"/></svg>
      </div>`).join('')+`</div>`;
  }
  p.innerHTML=`<div class="kicker">${st.label}</div><h1 id="obTtl">${titleHTML}</h1><div class="sub">${st.sub}</div><div class="rule"></div>${body}`;
  return p;
}
function bindObPage(p,idx){
  const st=OB_STEPS[idx];
  if(idx===3){ /* 打字机标题 */
    const t=++twToken;
    typewrite(p.querySelector('#obTtl'),st.title,85,t);
  }
  if(st.type==='name'){
    const inp=p.querySelector('#obNm'), chip=p.querySelector('#obQuick');
    const setV=v=>{obName=v;refreshObFoot();};
    inp.addEventListener('input',()=>{chip.classList.remove('on');setV(inp.value.trim())});
    const commit=()=>{if(inp.value.trim())setV(inp.value.trim())};
    p.querySelector('#obNmGo').onclick=commit;
    inp.addEventListener('keydown',e=>{if(e.key==='Enter')commit()});
    chip.onclick=()=>{const on=chip.classList.toggle('on');inp.value=on?'小美':'';setV(on?'小美':'');envOpen()};
    return;
  }
  p.querySelectorAll('.ob-row').forEach(r=>{
    r.onclick=()=>{
      const k=+r.dataset.k;
      if(st.type==='single'){
        if(obBusy)return;
        p.querySelectorAll('.ob-row.on').forEach(x=>x.classList.remove('on'));
        r.classList.add('on');obSel=new Set([k]);obAnswers[obCur]=[st.opts[k]];
        refreshObFoot();envFlutter();
        /* 选「感到绝望」→ 先安全确认，不直接进下一步 */
        if(st.opts[k]==='感到绝望'){
          obBusy=true;
          setTimeout(()=>{obBusy=false;document.getElementById('obSafe').classList.add('on')},520);
          return;
        }
        obBusy=true;setTimeout(()=>{obBusy=false;obGoNext()},620);
        return;
      }
      if(obSel.has(k)){obSel.delete(k);r.classList.remove('on')}
      else{
        if(obSel.size>=st.max){r.classList.remove('shake');void r.offsetWidth;r.classList.add('shake');return}
        obSel.add(k);r.classList.add('on');envOpen();
      }
      obAnswers[obCur]=[...obSel].map(i=>st.opts[i]);
      refreshObFoot();
    };
  });
}
function refreshObFoot(){
  const st=OB_STEPS[obCur];
  obCnt.textContent=obSel.size;obCnt.classList.remove('tickpop');void obCnt.offsetWidth;obCnt.classList.add('tickpop');
  if(st.type==='multi')obCta.classList.toggle('dis',obSel.size===0);
  else if(st.type==='name')obCta.classList.toggle('dis',!obName);
}
function updateObChrome(){
  const st=OB_STEPS[obCur], no='0'+(obCur+1);
  obStepNo.textContent=no;
  obStepNo.animate([{transform:'rotateX(88deg)',opacity:.3},{transform:'none',opacity:1}],{duration:420,easing:'cubic-bezier(.22,.9,.32,1)'});
  obWm.textContent=no;
  obWm.animate([{opacity:0,transform:'translateY(26px)'},{opacity:1,transform:'none'}],{duration:650,easing:'ease-out'});
  obSkipBtn.textContent=st.skip;
  obMetaLab.textContent=st.type==='multi'?'CHECKED':st.type==='single'?'SINGLE CHOICE':'OPTIONAL';
  obMaxLab.textContent=st.type==='multi'?' / '+st.max:'';
  obCnt.textContent=obSel.size;
  obCta.classList.toggle('hide',st.type==='single');
  obCta.textContent=st.type==='name'?'开 启 陪 伴':'继 续';
  obEvNote.textContent=st.note;
  obBackBtn.style.visibility=obCur>0?'visible':'hidden';
}
/* ================= 信封 ================= */
function envOpen(){obEnv.classList.remove('sealed');obEnv.classList.add('open')}
function envFlutter(){obEnv.classList.remove('flutter');void obEnv.offsetWidth;obEnv.classList.add('flutter');setTimeout(()=>obEnv.classList.remove('flutter'),600)}
async function envSeal(){
  obEnv.classList.remove('open');obEnv.classList.add('sealed');
  await obMs(520);obEnv.classList.remove('sealed');
}
/* ================= 转场 ================= */
async function fxWipe(oldP,newP){
  const a=document.createElement('div');a.className='wpx';
  const b=document.createElement('div');b.className='wpx gold';
  obFx.append(a,b);
  a.animate([{transform:'translateX(-160%) skewX(-14deg)'},{transform:'translateX(260%) skewX(-14deg)'}],{duration:900,easing:'cubic-bezier(.65,0,.35,1)',fill:'forwards'});
  b.animate([{transform:'translateX(-300%) skewX(-14deg)'},{transform:'translateX(620%) skewX(-14deg)'}],{duration:900,delay:90,easing:'cubic-bezier(.65,0,.35,1)',fill:'forwards'});
  await obMs(430);obStage.appendChild(newP);bindObPage(newP,obCur);oldP.style.visibility='hidden';
  await obMs(560);oldP.remove();a.remove();b.remove();
}
async function fxBlinds(oldP,newP){
  const n=6,strips=[];
  for(let i=0;i<n;i++){
    const s=document.createElement('div');s.className='blind';
    s.style.left=(i*100/n)+'%';s.style.width=(100/n+0.3)+'%';
    obFx.appendChild(s);strips.push(s);
  }
  strips.forEach((s,i)=>s.animate([{transform:'scaleY(0)',transformOrigin:'top'},{transform:'scaleY(1)',transformOrigin:'top'}],{duration:420,delay:i*55,easing:'cubic-bezier(.6,0,.4,1)',fill:'forwards'}));
  await obMs(420+5*55+40);
  obStage.appendChild(newP);bindObPage(newP,obCur);oldP.remove();
  strips.forEach((s,i)=>s.animate([{transform:'scaleY(1)',transformOrigin:'bottom'},{transform:'scaleY(0)',transformOrigin:'bottom'}],{duration:430,delay:i*55,easing:'cubic-bezier(.6,0,.4,1)',fill:'forwards'}));
  await obMs(430+5*55+40);strips.forEach(s=>s.remove());
}
async function fxZoom(oldP,newP){
  obStage.appendChild(newP);bindObPage(newP,obCur);
  newP.animate([{opacity:0,transform:'scale(.94)',filter:'blur(5px)'},{opacity:1,transform:'none',filter:'blur(0)'}],{duration:620,delay:120,easing:'cubic-bezier(.22,.9,.32,1)',fill:'backwards'});
  const a=oldP.animate([{opacity:1,transform:'none',filter:'blur(0)'},{opacity:0,transform:'scale(1.07)',filter:'blur(7px)'}],{duration:560,easing:'cubic-bezier(.5,0,.8,.4)',fill:'forwards'});
  await a.finished;oldP.remove();
}
async function fxPeel(oldP,newP){
  obStage.appendChild(newP);bindObPage(newP,obCur);
  newP.animate([{opacity:.6},{opacity:1}],{duration:500,fill:'backwards'});
  const a=oldP.animate([
    {opacity:1,transform:'none',boxShadow:'0 0 0 rgba(90,60,70,0)'},
    {opacity:.9,transform:'translate(16%,108%) rotate(9deg)',boxShadow:'-18px -24px 40px rgba(90,60,70,.28)'},
    {opacity:0,transform:'translate(24%,130%) rotate(13deg)'}
  ],{duration:780,easing:'cubic-bezier(.45,0,.7,.4)',fill:'forwards'});
  oldP.style.zIndex=5;newP.style.zIndex=1;
  await a.finished;oldP.remove();
}
const OB_FXN={wipe:fxWipe,blinds:fxBlinds,zoom:fxZoom,peel:fxPeel};
/* ================= 流程控制 ================= */
async function obGoNext(){
  if(obBusy)return;
  if(obCur>=OB_STEPS.length-1){finishOb();return}
  obBusy=true;
  const fxName=OB_FX[obCur], oldP=obPage;
  obCur++;obSel=new Set();obName='';
  obEnv.classList.remove('open');
  updateObChrome();refreshObFoot();
  obPage=buildObPage(obCur);
  await OB_FXN[fxName](oldP,obPage);
  obPage.style.zIndex='';
  obBusy=false;
}
function obGoBack(){
  if(obBusy||obCur===0)return;
  const oldP=obPage;
  obCur--;obSel=new Set(obAnswers[obCur]?OB_STEPS[obCur].opts.map((o,i)=>obAnswers[obCur].includes(o)?i:-1).filter(i=>i>=0):[]);
  obName='';
  updateObChrome();refreshObFoot();
  obPage=buildObPage(obCur);
  fxZoom(oldP,obPage);
}
/* ================= 完成 → 汇总页 ================= */
async function finishOb(){
  if(obBusy)return;obBusy=true;
  obAnswers[4]=obName?[obName]:[];
  localStorage.setItem(OB_KEY,JSON.stringify(obAnswers));
  const wrap=document.querySelector('#s-onboard .onboard-wrap');
  obEvNote.textContent='收到啦。';obEnv.classList.add('open');
  wrap.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(-46px)'}],{duration:600,easing:'cubic-bezier(.5,0,.8,.4)',fill:'forwards'});
  await obMs(300);
  obEnvWrap.classList.add('center');await obMs(950);
  for(let k=0;k<3;k++){
    const h=document.createElement('i');h.className='miniheart';
    h.style.setProperty('--dx',(k-1)*46+'px');h.style.setProperty('--rr',(k-1)*26+'deg');
    h.style.animationDelay=(k*.18)+'s';obEnv.appendChild(h);setTimeout(()=>h.remove(),2200);
  }
  await obMs(1000);
  obEnvWrap.classList.add('fly');await obMs(820);
  obBusy=false;
  showSummary();
}
/* ================= 初始化 / 重置 ================= */
function initOnboard(){
  obEnv=document.getElementById('env');obEnvWrap=document.getElementById('envWrap');obEvNote=document.getElementById('evNote');
  obStage=document.getElementById('obStage');obFx=document.getElementById('obFx');
  obCta=document.getElementById('obCta');obCnt=document.getElementById('obCnt');obMaxLab=document.getElementById('obMaxLab');
  obMetaLab=document.getElementById('obMetaLab');obSkipBtn=document.getElementById('obSkip');
  obStepNo=document.getElementById('obStepNo');obWm=document.getElementById('obWm');obBackBtn=document.getElementById('obBack');
  /* 重置状态 */
  obCur=0;obBusy=false;obSel=new Set();obName='';twToken++;
  for(const k in obAnswers)delete obAnswers[k];
  obStage.innerHTML='';obFx.innerHTML='';
  const wrap=document.querySelector('#s-onboard .onboard-wrap');
  wrap.style.opacity='';wrap.style.transform='';
  obEnv.className='env';obEnvWrap.className='envwrap';
  document.getElementById('obSafe').classList.remove('on');
  /* 静态按钮（重复绑定无害） */
  obCta.onclick=async()=>{
    if(obBusy)return;
    const st=OB_STEPS[obCur];
    if(st.type==='multi'&&obSel.size===0){obCta.classList.remove('shake');void obCta.offsetWidth;obCta.classList.add('shake');return}
    if(st.type==='name'&&!obName){obCta.classList.remove('shake');void obCta.offsetWidth;obCta.classList.add('shake');return}
    if(st.type==='name'){obAnswers[4]=obName?[obName]:[];}
    if(st.type==='multi'){const p=envSeal();await obMs(120);obGoNext();await p}
    else obGoNext();
  };
  obSkipBtn.onclick=()=>{if(!obBusy){envFlutter();obGoNext()}};
  obBackBtn.onclick=()=>obGoBack();
  document.getElementById('obSafeOk').onclick=()=>{
    document.getElementById('obSafe').classList.remove('on');
    setTimeout(()=>obGoNext(),260);
  };
  document.getElementById('obSafeConsult').onclick=()=>{
    document.getElementById('obSafe').classList.remove('on');
    go('s-consultants');
  };
  updateObChrome();refreshObFoot();
  obPage=buildObPage(0);obStage.appendChild(obPage);bindObPage(obPage,0);
}
function startApp(){
  /* 每次进入都走完整流程：启动动画 → 问卷 → 汇总页 → 首页 */
  const launch=document.getElementById('s-launch');
  if(!launch.classList.contains('active'))return;
  launch.classList.add('exiting');
  later(()=>{
    launch.classList.remove('exiting','active');
    initOnboard();
    go('s-onboard');
  },250);   /* 与 .38s 入场淡入交叠，避免两屏之间出现空白帧 */
}
/* 页面加载后自动播放入场动画，动画结束自动进入 */
later(startApp, 2600);
/* ---- 汇总页：根据选择动态生成承接文案 ---- */
const TROUBLE_SHORT={'伴侣沟通不顺':'伴侣沟通','婚姻出现变化':'婚姻变化','对关系感到不安':'关系中的不安','家庭/亲子压力':'家庭和亲子压力','情绪起伏大':'情绪压力','工作生活压力大':'工作生活压力','失眠、想太多':'睡眠困扰','孤独、没人理解':'孤独感','想更了解自己':'自我探索','只是想说说话':'倾诉的需要'};
const MOOD_PHRASE={'比较平静':'此刻比较平静','有些委屈':'现在有些委屈','焦虑不安':'现在有些焦虑不安','生气烦躁':'现在有点烦躁','疲惫无力':'现在很疲惫','难过想哭':'现在心里难过','感到绝望':'现在正经历很难的时刻','说不清楚':'感受还有些说不清楚'};
const PREF_PHRASE={'先听我说完':'先听你说完','帮我把事理清楚':'帮你把事理清楚','帮我看见真实感受':'陪你看见真实感受','一起想想怎么办':'陪你一起想办法','提醒我注意安全与边界':'提醒你注意安全与边界','需要时联系真人咨询师':'需要时帮你联系真人咨询师','还不确定，先聊聊':'先轻松聊聊'};
const PREF_SHORT={'帮我把事理清楚':'帮你理清'};
function showSummary(){
  const troubles=obAnswers[0]||[],prefer=obAnswers[1]||[],mood=(obAnswers[3]||[])[0]||'';
  const name=(obAnswers[4]||[])[0]||'你';
  HOME_NAME=(obAnswers[4]||[])[0]||'小美';
  if(window._renderHomeBub)window._renderHomeBub();
  const t=troubles.map(x=>TROUBLE_SHORT[x]||x);
  const tTxt=t.length?('最近你主要在经历'+t.slice(0,2).join('和')+(t.length>2?'等方面的困扰':'')):'最近你想找个人说说话';
  const mTxt=mood?('，'+(MOOD_PHRASE[mood]||'现在有些'+mood)):'';
  let pTxt='；我会先按你的节奏陪你，不急着下结论';
  if(prefer.length){
    pTxt='；你希望'+(PREF_PHRASE[prefer[0]]||prefer[0])
      +(prefer[1]?('，再'+(PREF_SHORT[prefer[1]]||PREF_PHRASE[prefer[1]]||prefer[1])):'');
  }
  document.getElementById('sumTitle').textContent=name+'，我大致了解了';
  document.getElementById('sumDesc').textContent=tTxt+mTxt+pTxt+'。我们不用一次解决所有事，从你现在最想说的开始就好。';
  go('s-summary');
}
function enterApp(){
  /* 汇总页 → 首页丝滑过渡 */
  const sum=document.getElementById('s-summary');
  sum.style.transition='opacity .4s ease,transform .4s ease';
  sum.style.opacity='0';
  sum.style.transform='scale(.96)';
  later(()=>{
    sum.classList.remove('active');
    sum.style.opacity='';sum.style.transform='';sum.style.transition='';
    go('s-home');
    document.getElementById('s-home').classList.add('entering');
    document.getElementById('tabbar').classList.add('pop-in');
    later(()=>{
      document.getElementById('s-home').classList.remove('entering');
      document.getElementById('tabbar').classList.remove('pop-in');
    },800);
  },400);
}
function finishToChat(){
  /* 汇总页 → 直接进入树洞开始第一次倾诉 */
  const sum=document.getElementById('s-summary');
  sum.style.transition='opacity .4s ease,transform .4s ease';
  sum.style.opacity='0';
  sum.style.transform='scale(.96)';
  later(()=>{
    sum.classList.remove('active');
    sum.style.opacity='';sum.style.transform='';sum.style.transition='';
    go('s-chat');
  },400);
}
/* ---- 生理期关怀提醒：隐私授权开关（默认关闭，授权后首页展示） ---- */
let careOn=false;
function toggleCare(){
  careOn=!careOn;
  document.getElementById('careSwitch').classList.toggle('on',careOn);
  document.getElementById('careChip').style.display=careOn?'':'none';
  toast(careOn?'已开启生理期关怀 · 首页将显示经期提醒':'已关闭 · 首页不再显示经期信息');
}
/* ---- 聊天页浮动卡片：进入展示，首发消息原路撤回 ---- */
let cardsGone=false;
function resetCards(){
  if(cardsGone)return;
  const c=els.chatCards;
  c.classList.remove('show','retract');
  void c.offsetWidth;
  c.classList.add('show');
}
function dismissCards(){
  if(cardsGone)return;
  cardsGone=true;
  const c=els.chatCards;
  c.classList.add('retract');
  later(()=>c.classList.remove('show','retract'),900);
}
/* 桌面演示：方向键切换界面 */
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT')return;
  if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;
  const cur=SCREENS.findIndex(([sid])=>document.getElementById(sid).classList.contains('active'));
  let n=cur+(e.key==='ArrowRight'?1:-1);
  n=(n+SCREENS.length)%SCREENS.length;
  go(SCREENS[n][0]);
});
/* ============ Toast ============ */
let toastTimer;
function toast(msg){
  const t=els.toast;
  t.textContent=msg;t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=later(()=>t.classList.remove('show'),1600);
}
/* ============ AI树洞 ============ */
const chatBody=els.chatBody;
const quickActs=els.quickActs;
let chatPlayed=false,chatBusy=false;
const SCRIPT=[
  {role:'ai',text:'下午好，小美。我在这里，今天过得怎么样？慢慢说，不着急。 🌷'},
  {role:'me',text:'昨天我又翻了他手机，什么都没翻到，可我就是安心不下来'},
  {role:'ai',text:'听起来你现在很焦虑，还带着一点自我怀疑——明明没有找到什么，心却更慌了。在信任被动摇过之后，这种「不踏实」是很多人都会经历的，这不是你敏感。\n\n我好奇的是，如果用一个词形容你现在最想要的，那会是什么？',tags:['焦虑','不安']},
  {role:'me',text:'确定性吧。我不想再猜了，太累了'},
  {role:'ai',text:'我记得你提过，你们结婚十年了，孩子也8岁了。十年的感情，让你想要的是一个答案，而不是一场输赢，对吗？\n\n在摊牌之前，也许可以先想清楚一件事：你希望那次谈话，把你们带向哪里。如果想有人陪你把利弊一条条梳理清楚，我可以帮你预约擅长婚姻信任方向的咨询师。',tags:['疲惫','渴望确定'],mem:true},
];
const REPLY_POOL=[
  '嗯，我在听。这种反反复复的猜测最消耗人了——你一个人扛了这么久，真的很不容易。\n\n如果此刻只做一件让自己松一口气的小事，你会想到什么？',
  '能感觉到你说这些的时候，心里是又委屈又疲惫的。任何人在你的处境里，都会有这样的感受。\n\n我们先把「他有没有」放一放。你有多久没有好好睡过一觉、好好吃过一顿饭了？',
  '谢谢你愿意把这些说给我听。能看出来，你心里其实已经在慢慢有答案了，只是还需要一点力量去确认它。\n\n如果下周的今天，你希望自己的生活是什么样子？',
];
let replyIdx=0;
function scrollChat(){const s=document.getElementById('s-chat');s.scrollTo({top:s.scrollHeight,behavior:'smooth'});}
function plainRow(){const d=document.createElement('div');d.className='msg-row';return d;}
function aiRow(showAv){const d=document.createElement('div');d.className='msg-row';
  d.innerHTML='<div class="avatar"'+(showAv?'':' style="visibility:hidden"')+'><img src="../assets/avatar-ai.webp" alt=""></div>';return d;}
function meRow(){const d=document.createElement('div');d.className='msg-row me';return d;}
/* 同一方连续发言只显示一次头像 */
function prevIsAI(container){
  const p=container.lastElementChild;
  return p&&p.classList.contains('msg-row')&&!p.classList.contains('me');
}
function addMsg(role,text,tags,mem,animate){
  const row=role==='me'?meRow():aiRow(!prevIsAI(chatBody));
  const m=document.createElement('div');
  m.className='msg '+(role==='me'?'me':'ai');
  m.style.whiteSpace='pre-line';
  if(animate){m.style.animation='rise .45s both';}
  m.textContent=text;
  if(role==='ai'&&tags&&tags.length){
    const tg=document.createElement('div');tg.className='emo-tags';
    tags.forEach(t=>{const s=document.createElement('span');s.textContent=t;tg.appendChild(s);});
    m.appendChild(tg);
  }
  if(mem){
    const n=document.createElement('div');
    n.innerHTML='<span class="mem-note">✦ 已引用你的档案记忆</span>';
    m.appendChild(n);
  }
  row.appendChild(m);
  chatBody.appendChild(row);
  scrollChat();
  return m;
}
function addTyping(){
  const row=aiRow(!prevIsAI(chatBody));
  const t=document.createElement('div');t.className='msg ai typing';
  t.innerHTML='<i></i><i></i><i></i>';
  row.appendChild(t);chatBody.appendChild(row);scrollChat();
  return row;
}
function startChat(){
  if(chatPlayed)return;
  chatPlayed=true;chatBusy=true;
  quickActs.style.display='none';
  let i=0;
  function next(){
    if(i>=SCRIPT.length){
      chatBusy=false;
      quickActs.style.display='flex';
      quickActs.style.animation='rise .4s both';
      scrollChat();return;
    }
    const item=SCRIPT[i];
    if(item.role==='ai'){
      const tp=addTyping();
      later(()=>{
        tp.remove();
        addMsg('ai',item.text,item.tags,item.mem,true);
        i++;later(next,650);
      },900+Math.min(item.text.length*8,1400));
    }else{
      later(()=>{addMsg('me',item.text,null,null,true);i++;later(next,420);},380);
    }
  }
  next();
}
function quickSay(text,target){
  if(chatBusy)return;
  addMsg('me',text,null,null,true);
  orbHappy();
  if(target){later(()=>go(target),600);return;}
  chatBusy=true;
  const tp=addTyping();
  later(()=>{
    tp.remove();
    addMsg('ai',REPLY_POOL[replyIdx++%REPLY_POOL.length],null,null,true);
    chatBusy=false;
  },1300);
}
const CRISIS_WORDS=['想死','活不下去','不想活','自杀','家暴','打死我','割腕','轻生'];
function sendChat(){
  const inp=document.getElementById('chatInput');
  const v=inp.value.trim();
  if(!v||chatBusy)return;
  inp.value='';
  orbDx=0;orbLook(0,orbPeeking?3.5:0);
  const hadCards=!cardsGone;
  dismissCards();
  orbHappy();
  later(()=>{
    addMsg('me',v,null,null,true);
    if(CRISIS_WORDS.some(w=>v.includes(w))){triggerCrisis();return;}
    if(!chatPlayed){
      /* 首发消息后，剧本正式开始 */
      chatBusy=true;
      later(()=>{chatBusy=false;startChat();},800);
      return;
    }
    chatBusy=true;
    const tp=addTyping();
    later(()=>{
      tp.remove();
      addMsg('ai',REPLY_POOL[replyIdx++%REPLY_POOL.length],null,null,true);
      chatBusy=false;
    },1400);
  },hadCards?700:0);   /* 有卡片先等其撤回 */
}
els.chatInput.addEventListener('keydown',e=>{
  if(e.key==='Enter')sendChat();
});
/* ---- 危机干预 ---- */
function triggerCrisis(){
  chatBusy=true;
  const tp=addTyping();
  later(()=>{
    tp.remove();
    addMsg('ai','我听到你说「活不下去了」，这一定让你感到极度痛苦。当一个人经历这样的黑暗时刻，产生这些念头是创伤性的反应，这不是你的错。\n\n你现在并不孤单。我想让你知道，有很多人经历过类似的黑暗，并且走了出来。我这就为你联系专业支持。',null,null,true);
    document.getElementById('crisisMask').classList.add('show');
    document.getElementById('crisisCard').classList.add('show');
    chatBusy=false;
    later(()=>document.getElementById('calmBtn').classList.add('ok'),5000);
  },1200);
}
function closeCrisis(){
  document.getElementById('crisisMask').classList.remove('show');
  document.getElementById('crisisCard').classList.remove('show');
}
/* ============ 语音小球交互（3D 西西 · 表情同步版） ============ */
const orbPet=els.orbPet;
const orbEyes=els.orbEyes;
let orbDx=0,orbPeeking=false;
/* 微表情层：与首页同一套表情 */
const petFxs=[...orbPet.querySelectorAll('.fx')];
function petFace(n,dur){
  petFxs.forEach(i=>i.classList.toggle('on',i.classList.contains(n)||i.dataset.x===n));
  if(dur)later(()=>petFace('base'),dur);
}
let petIdle=0;
setInterval(()=>{if(go._cur!=='s-chat')return;
  petIdle++;const f=petIdle%4===0?'love':'blink';
  petFace(f);later(()=>petFace('base'),f==='love'?1500:1100);},4200);
function orbLook(dx,dy){if(orbEyes)orbEyes.style.transform=`translate(${dx}px,${dy}px)`;}
const chatInp=els.chatInput;
chatInp.addEventListener('focus',()=>{
  orbPeeking=true;
  orbPet.classList.add('peek');
  orbLook(orbDx,3.5);
});
chatInp.addEventListener('blur',()=>{
  orbPeeking=false;
  if(!chatInp.value){orbPet.classList.remove('peek');orbLook(0,0);}
});
chatInp.addEventListener('input',()=>{
  /* 眼睛跟着文字长度往右挪，像盯着光标看 */
  orbDx=Math.min(11,chatInp.value.length*0.85);
  orbLook(orbDx,orbPeeking?3.5:0);
});
/* AI 正在回复时，抬头看消息区 */
const orbMo=new MutationObserver(()=>{
  if(go._cur!=='s-chat')return;
  if(els.chatBody.querySelector('.typing'))orbLook(0,-3);
  else orbLook(orbDx,orbPeeking?3.5:0);
});
orbMo.observe(els.chatBody,{childList:true,subtree:false});
/* 发送成功：开心跳一下 + 爱心脸 */
function orbHappy(){
  orbPet.classList.remove('wiggle');
  orbPet.classList.add('happy');
  petFace('love',1300);
  later(()=>orbPet.classList.remove('happy'),750);
}
/* 戳一戳：左右摇摆 + 惊讶脸 + 语音入口提示 */
function orbPoke(){
  orbPet.classList.remove('happy');
  orbPet.classList.add('wiggle');
  petFace('wow',1200);
  later(()=>orbPet.classList.remove('wiggle'),550);
  toast('按住我说话 · 语音倾诉演示');
}
/* ============ AI预诊断 ============ */
const PD=[
  {q:'在为你匹配最合适的咨询师之前，我想先了解几个关键信息，这样能让你的咨询更高效。\n\n你们目前的婚姻状态是怎样的？',opts:['正在冷战','刚发现出轨迹象','已经分居','其他情况']},
  {q:'谢谢你愿意告诉我这些。这件事大概发生多久了？',opts:['一周内','一个月内','半年以内','已经超过半年']},
  {q:'嗯，我明白了。那你现在最困扰、最想解决的问题是什么？',opts:['信任崩塌走不出来','情绪内耗很严重','担心影响孩子','不知道该不该继续']},
  {q:'好的。你希望通过这次咨询，达到什么样的目标？',opts:['修复这段关系','看清方向再做决定','先让自己情绪稳定','学会保护自己和孩子']},
  {q:'最后一个问题——之前有没有尝试过其他方式来解决？',opts:['自己看书调整过','找朋友倾诉过','做过心理咨询','还没有尝试过']},
];
let pdStep=0,pdRunning=false;
const pdBody=document.getElementById('pdBody');
const pdOpts=document.getElementById('pdOpts');
function pdMsg(role,text){
  const row=role==='me'?meRow():aiRow(!prevIsAI(pdBody));
  const m=document.createElement('div');
  m.className='msg '+(role==='me'?'me':'ai');
  m.style.whiteSpace='pre-line';
  m.style.animation='rise .45s both';
  m.textContent=text;
  row.appendChild(m);pdBody.appendChild(row);
  const s=document.getElementById('s-prediag');s.scrollTo({top:s.scrollHeight,behavior:'smooth'});
}
function pdTyping(cb,delay){
  const row=aiRow(!prevIsAI(pdBody));
  const t=document.createElement('div');t.className='msg ai typing';t.innerHTML='<i></i><i></i><i></i>';
  row.appendChild(t);pdBody.appendChild(row);
  later(()=>{row.remove();cb();},delay||850);
}
function pdRenderOpts(){
  pdOpts.innerHTML='';
  PD[pdStep].opts.forEach(o=>{
    const b=document.createElement('button');b.textContent=o;
    b.onclick=()=>pdAnswer(o);
    pdOpts.appendChild(b);
  });
  pdOpts.style.animation='rise .4s both';
}
function pdProgress(){
  document.querySelectorAll('#pdProgress i').forEach((el,i)=>
    el.classList.toggle('on',i<=pdStep));
}
function pdAnswer(text){
  if(pdRunning)return;pdRunning=true;
  pdMsg('me',text);
  pdOpts.innerHTML='';
  pdStep++;pdProgress();
  if(pdStep>=PD.length){
    document.getElementById('pdGen').style.display='block';
    document.getElementById('pdGen').style.animation='rise .5s both';
    const s=document.getElementById('s-prediag');s.scrollTo({top:s.scrollHeight,behavior:'smooth'});
    later(()=>go('s-report'),2300);
    return;
  }
  pdTyping(()=>{pdMsg('ai',PD[pdStep].q);pdRenderOpts();pdRunning=false;});
}
function startPrediag(){
  pdBody.innerHTML='';pdOpts.innerHTML='';
  document.getElementById('pdGen').style.display='none';
  pdStep=0;pdRunning=true;pdProgress();
  pdTyping(()=>{pdMsg('ai',PD[0].q);pdRenderOpts();pdRunning=false;},700);
}
/* ============ 咨询师详情 / 支付 ============ */
let pickedSlot='';
function pickSlot(el){
  document.querySelectorAll('#slots .slot').forEach(s=>s.classList.remove('on'));
  el.classList.add('on');pickedSlot=el.textContent;
}
function openPay(){
  document.getElementById('paySlot').textContent=pickedSlot||'明天 10:00（默认）';
  document.getElementById('payForm').style.display='block';
  document.getElementById('paySucc').style.display='none';
  document.getElementById('payMask').classList.add('show');
  document.getElementById('paySheet').classList.add('show');
}
function closePay(){
  document.getElementById('payMask').classList.remove('show');
  document.getElementById('paySheet').classList.remove('show');
}
function doPay(){
  document.getElementById('payForm').style.display='none';
  document.getElementById('paySucc').style.display='block';
  later(()=>{closePay();toast('已跳转企业微信 · 演示结束');},2100);
}
/* ============ 失眠专区 ============ */
function playMock(el){
  document.querySelectorAll('.sleep-item .pl').forEach(p=>p.classList.remove('playing'));
  el.classList.add('playing');
  toast('音频播放 · 演示版');
}
/* boot: sync router with HTML .active */
go._cur = document.querySelector('.screen.active')?.id || 's-launch';


/* ============ 首页：3D 西西 · 气泡问候 · 金句分享卡 · 情绪打卡 ============ */
let HOME_NAME='小美';
const HOME_QUOTES=[
  ['我们曾如此期盼外界的认可，到最后才知道，世界是自己的，与他人毫无关系。','—— 杨绛','q1'],
  ['爱自己，是终身浪漫的开始。','—— 王尔德','q2'],
  ['温柔不是妥协，是见过风雨之后的选择。','—— 西西','q3'],
  ['你照顾了所有人，也要记得被自己照顾。','—— 西西','q4'],
  ['真正的强大，是允许自己偶尔不强大。','—— 西西','q5'],
  ['人间烟火气，最抚凡人心。','—— 汪曾祺','q6'],
  ['把日子过成自己喜欢的样子，什么时候开始都不晚。','—— 西西','q7'],
  ['愿你成为自己的太阳，无需凭借谁的光。','—— 西西','q8']
];
const HOME_POKES=['西西蹭了蹭你 ◡̈','西西绕着你转了一圈','被你戳得晃了晃','西西眨了眨眼',
  '再戳我就要飘走啦','西西听见了你的召唤','我在，一直都在'];
const HOME_MOOD_REPLY={
  '平静':'平静很好 · 今天也稳稳的',
  '委屈':'委屈就说出来 · 西西听着',
  '焦虑':'先深呼吸一下 · 我在',
  '烦躁':'烦躁倒给我 · 就不硌你了',
  '难过':'抱抱你 · 难过不用藏'
};
(function initHome(){
  const xixi=document.getElementById('homeXixi');if(!xixi)return;
  const bub=document.getElementById('bubTxt');
  const h=new Date().getHours();
  const greet=h<5?'夜深了':h<11?'早上好':h<14?'中午好':h<18?'下午好':'晚上好';
  const BUBS=[greet+'呀，{n}～','今天也辛苦啦','想我了就戳戳我','心里有事？说给我听',
    '喝口水，慢慢来','我在呢，不急','今天照顾好自己了吗','风吹过来的时候，我也在'];
  let bi=0;
  const renderBub=()=>{bub.textContent=BUBS[bi].replace('{n}',HOME_NAME);};
  window._renderHomeBub=renderBub;
  renderBub();
  setInterval(()=>{bi=(bi+1)%BUBS.length;renderBub();},5000);
  /* 金句：每日一句（按日期自动轮换，图文搭配，不可手动切换） */
  const dayOfYear=Math.floor((Date.now()-new Date(new Date().getFullYear(),0,0))/864e5);
  const qi=dayOfYear%HOME_QUOTES.length;
  const qImg=HOME_QUOTES[qi][2];
  const qt=document.getElementById('homeQTxt'),qa=document.getElementById('homeQAu');
  document.getElementById('homeBgi').src='../assets/quotes/'+qImg+'.webp';
  qt.textContent='「'+HOME_QUOTES[qi][0]+'」';
  qa.textContent=HOME_QUOTES[qi][1];
  const share=document.getElementById('homeShare');
  const openShare=()=>{
    document.getElementById('shareQ').textContent='「'+HOME_QUOTES[qi][0]+'」';
    document.getElementById('shareA').textContent=HOME_QUOTES[qi][1];
    document.getElementById('shareBgi').src='../assets/quotes/'+qImg+'.webp';
    share.classList.add('show');
  };
  document.getElementById('homeShareBtn').addEventListener('click',e=>{e.stopPropagation();openShare();});
  document.querySelector('#s-home .qrow').addEventListener('click',openShare);
  document.getElementById('shareClose').onclick=()=>share.classList.remove('show');
  document.getElementById('shareSave').onclick=()=>{share.classList.remove('show');toast('分享卡已保存（演示）');};
  share.addEventListener('click',e=>{if(e.target===share)share.classList.remove('show');});
  /* 微表情：待机眨眼/冒爱心，戳戳惊讶，打卡爱心 */
  const fxs=[...xixi.querySelectorAll('.fx')];
  const xShow=(n,dur)=>{
    fxs.forEach(i=>i.classList.toggle('on',i.classList.contains(n)||i.dataset.x===n));
    if(dur)setTimeout(()=>xShow('base'),dur);
  };
  let idleN=0;
  setInterval(()=>{
    idleN++;
    const f=idleN%4===0?'love':'blink';
    xShow(f);setTimeout(()=>xShow('base'),f==='love'?1500:1100);
  },4000);
  xixi.addEventListener('click',()=>{
    xixi.classList.remove('poke');void xixi.offsetWidth;xixi.classList.add('poke');
    xShow('wow',1300);
    toast(HOME_POKES[Math.floor(Math.random()*HOME_POKES.length)]);
  });
  /* 心情日历：emo 表情脸 + 首页紧凑卡 + 弧度月历详细页 */
  const GCM={'平静':'#DCC6C0','委屈':'#C7D0DA','焦虑':'#E4D6BC','烦躁':'#DFBCB2','难过':'#CDC2D4'};
  const FACE={
    '平静':'<circle cx="12" cy="12" r="11" fill="#DCC6C0"/><path d="M7.6 10.4q1.2-1.4 2.5 0M13.9 10.4q1.2-1.4 2.5 0" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M8.7 14.2q3.3 2.4 6.6 0" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
    '委屈':'<circle cx="12" cy="12" r="11" fill="#C7D0DA"/><path d="M7.3 9.7l2.5-1.5M16.7 9.7l-2.5-1.5" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="8.8" cy="11.8" r=".95" fill="#fff"/><circle cx="15.2" cy="11.8" r=".95" fill="#fff"/><path d="M9.4 15.9q2.6-1.9 5.2 0" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
    '焦虑':'<circle cx="12" cy="12" r="11" fill="#E4D6BC"/><circle cx="8.6" cy="10.6" r="1.25" fill="#fff"/><circle cx="15.4" cy="10.6" r="1.25" fill="#fff"/><path d="M7.6 15.2l1.4-1.3 1.5 1.3 1.5-1.3 1.5 1.3 1.4-1.3" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    '烦躁':'<circle cx="12" cy="12" r="11" fill="#DFBCB2"/><path d="M7 9.4l3 1.5M17 9.4l-3 1.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/><circle cx="9" cy="12.1" r=".95" fill="#fff"/><circle cx="15" cy="12.1" r=".95" fill="#fff"/><path d="M9 16.4q3-2.3 6 0" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>',
    '难过':'<circle cx="12" cy="12" r="11" fill="#CDC2D4"/><path d="M7.9 10.6q1.1-1.2 2.3 0M13.8 10.6q1.1-1.2 2.3 0" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M8.1 13.4c-1.1 1.5-.9 2.8.3 3.1s2.1-.8 1.3-2.2z" fill="#fff"/><path d="M10.2 17.1q2.2-1.7 4.4 0" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/>'
  };
  const faceSvg=n=>'<svg viewBox="0 0 24 24">'+FACE[n]+'</svg>';
  const gcNames=Object.keys(GCM);
  const gcNow=new Date(),gcY=gcNow.getFullYear(),gcMo=gcNow.getMonth(),gcToday=gcNow.getDate();
  const DIM=new Date(gcY,gcMo+1,0).getDate(),FIRST=(new Date(gcY,gcMo,1).getDay()+6)%7;
  const gcHist={};
  for(let d=1;d<gcToday;d++)gcHist[d]=(d*7+gcMo*3)%5;
  document.getElementById('gcDay').textContent=gcToday;
  document.getElementById('gcYM').textContent=(gcMo+1)+'月 · 星期'+'日一二三四五六'[gcNow.getDay()];
  function renderHomeGc(){
    const mi=gcHist[gcToday],n=mi!=null?gcNames[mi]:null;
    const miEl=document.getElementById('gcMi'),mlEl=document.getElementById('gcMl');
    if(n){miEl.classList.add('fxface');miEl.classList.remove('none');miEl.innerHTML=faceSvg(n);
      mlEl.textContent='今天 · '+n;}
    else{miEl.classList.remove('fxface');miEl.classList.add('none');
      miEl.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
      mlEl.textContent='还没记心情';}
  }
  function renderMcal(){
    const t=document.getElementById('mcTitle');if(!t)return;
    t.textContent=(gcMo+1)+'月 · 心情月历';
    /* 月历格 */
    let h='';
    for(let i=0;i<FIRST;i++)h+='<div class="mc-cell fut"></div>';
    for(let d=1;d<=DIM;d++){
      const mi=gcHist[d],isT=d===gcToday,fut=d>gcToday;
      h+='<div class="mc-cell'+(isT?' today':'')+(fut?' fut':'')+'">'+d
        +(mi!=null?'<i class="dot" style="--mc:'+GCM[gcNames[mi]]+'"></i>':'')+'</div>';
    }
    document.getElementById('mcGrid').innerHTML=h;
    /* 本周情绪行（表情脸） */
    const wk=document.getElementById('mcWeek');
    if(wk){
      const dow=(gcNow.getDay()+6)%7,WD=['一','二','三','四','五','六','日'];
      document.getElementById('mcWeekCap').textContent=(gcMo+1)+'月'+(gcToday-dow)+'日 – '+(gcMo+1)+'月'+(gcToday-dow+6)+'日';
      let h='';
      for(let i=0;i<7;i++){
        const d=gcToday-dow+i,fut=i>dow,mi=fut?null:gcHist[d],isT=i===dow;
        h+='<div class="mw'+(isT?' today':'')+(fut?' fut':'')+'">'
          +(fut?'<span class="fh">'+d+'</span>':faceSvg(mi!=null?gcNames[mi]:'平静'))
          +'<span class="wl">'+WD[i]+' '+d+'</span></div>';
      }
      wk.innerHTML=h;
    }
    /* 表情脸选择器 */
    const mp=document.getElementById('mcMoods');
    mp.innerHTML=gcNames.map(n=>'<button class="m ff" data-m="'+n+'">'+faceSvg(n)+'</button>').join('');
    const sel=gcHist[gcToday];
    mp.querySelectorAll('.m').forEach(x=>x.classList.toggle('on',x.dataset.m===gcNames[sel]));
  }
  renderHomeGc();renderMcal();
  /* 详细页打卡 */
  document.getElementById('mcMoods').addEventListener('click',e=>{
    const b=e.target.closest('.m');if(!b)return;
    gcHist[gcToday]=gcNames.indexOf(b.dataset.m);
    renderHomeGc();renderMcal();
    document.getElementById('homeStreak').textContent='连续记录 7 天';
    document.getElementById('mcStreak').textContent='连续记录 7 天';
    toast(HOME_MOOD_REPLY[b.dataset.m]||'打卡成功');
    xShow('love',2000);
  });
  /* 冥想 */
  document.getElementById('homeMed').addEventListener('click',()=>toast('3 分钟呼吸练习即将开始（演示）'));
})();
