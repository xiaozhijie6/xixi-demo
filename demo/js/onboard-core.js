/* ============ 问卷共享内核：数据 + 交互逻辑（v2/v3/v4 共用） ============ */
const $=id=>document.getElementById(id);
const $$=(s,r=document)=>r.querySelectorAll(s);
const OB_KEY='xixi_onboard_v2';
let ob={name:'',troubles:[],prefer:[],relation:'',mood:''};
let cur=0;
/* ---- 图标库 ---- */
const ICONS={
  chat:'<path d="M4 5h16v11H9l-5 4V5z"/>',
  broken:'<path d="M12 21s-7-4.4-9.2-9C1.4 9 3.2 5.5 6.6 5.5c2 0 3.8 1.1 5.4 3 1.6-1.9 3.4-3 5.4-3 3.4 0 5.2 3.5 3.8 6.5C19 16.6 12 21 12 21z"/><path d="M12 8l-1.5 3.5h3L12 15"/>',
  shield:'<path d="M12 3l7 4v5c0 4.4-3 8.2-7 9-4-.8-7-4.6-7-9V7l7-4z"/>',
  home:'<path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  wave:'<path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/>',
  work:'<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
  moon:'<path d="M20 13.5A8.5 8.5 0 0 1 10.5 4 8.5 8.5 0 1 0 20 13.5z"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="M15 9l-2 5-4 1 2-5z"/>',
  coffee:'<path d="M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z"/><path d="M16 9h2a2.5 2.5 0 0 1 0 5h-2M7.5 4v1.5M11.5 4v1.5"/>',
  ear:'<path d="M7 11a5 5 0 0 1 10 0c0 3.5-3 3.5-3 6.5a2.5 2.5 0 0 1-5 0"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11M4 6h.5M4 12h.5M4 18h.5"/>',
  eye:'<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
  bulb:'<path d="M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.5 10.8c.9.8 1.5 1.4 1.5 2.2h4c0-.8.6-1.4 1.5-2.2A6 6 0 0 0 12 3z"/>',
  phone:'<path d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.1.9-1.1 1.8M12 17h.01"/>',
  heart:'<path d="M12 21s-7-4.4-9.2-9C1.4 9 3.2 5.5 6.6 5.5c2 0 3.8 1.1 5.4 3 1.6-1.9 3.4-3 5.4-3 3.4 0 5.2 3.5 3.8 6.5C19 16.6 12 21 12 21z"/>',
  rings:'<circle cx="9" cy="13" r="5.5"/><circle cx="15" cy="11" r="5.5"/>',
  split:'<path d="M12 4v16M12 12l-4-3M12 12l4 3"/>',
  shuffle:'<path d="M4 7h4l8 10h4M20 17l-2-2M20 17l-2 2M4 17h4l2.5-3M13.5 10l2.5-3h4M20 7l-2-2M20 7l-2 2"/>',
  quiet:'<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  calm:'<path d="M3 15c2 2.5 4 2.5 6 0s4-2.5 6 0 4 2.5 6 0M3 10c2 2.5 4 2.5 6 0s4-2.5 6 0 4 2.5 6 0"/>',
  tear:'<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  bolt:'<path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/>',
  fire:'<path d="M12 3c1.2 3-3.5 5-3.5 9.5a5.5 5.5 0 0 0 11 0C19.5 9 15 7 12 3z"/>',
  battery:'<rect x="3" y="8" width="15" height="8" rx="2"/><path d="M18 11h3v2h-3M6.5 11v2"/>',
  rain:'<path d="M7 15a4 4 0 1 1 .8-7.9A5 5 0 0 1 17 8.6 3.5 3.5 0 0 1 16.5 15H7z"/><path d="M8 18l-1 2.5M13 18l-1 2.5M18 18l-1 2.5"/>',
  down:'<circle cx="12" cy="12" r="9"/><path d="M8 15.5c1-1.5 2.5-2.5 4-2.5s3 1 4 2.5M9 9.5h.01M15 9.5h.01"/>',
  fog:'<path d="M4 10h16M6 14h12M9 18h6"/>',
  sparkle:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/>',
};
/* ---- 步骤数据 ---- */
const STEPS=[
  {key:'troubles',type:'multi',max:3,
   label:'当前困扰 · 最多 3 项',title:'最近，心里装着哪些事？',sub:'选最接近的就好，之后随时能改。',
   skip:'暂时不想说',
   opts:[['伴侣沟通不顺','chat'],['婚姻出现变化','broken'],['对关系感到不安','shield'],['家庭/亲子压力','home'],['情绪起伏大','wave'],['工作生活压力','work'],['失眠、想太多','moon'],['孤独、没人理解','user'],['想更了解自己','compass'],['只是想说说话','coffee']]},
  {key:'prefer',type:'multi',max:2,
   label:'陪伴偏好 · 最多 2 项',title:'你希望西西怎么陪你？',sub:'没有标准答案，我会边聊边调。',
   skip:'还不确定，先聊聊',
   opts:[['先听我说完','ear'],['帮我把事理清楚','list'],['帮我看见真实感受','eye'],['一起想想怎么办','bulb'],['提醒我注意安全与边界','shield'],['需要时联系真人咨询师','phone'],['还不确定，先聊聊','help']]},
  {key:'relation',type:'single',cols:1,
   label:'关系阶段 · 可跳过',title:'你目前大致处在哪个阶段？',sub:'只用来理解你，不替你做决定。',
   skip:'暂时不想说',
   opts:[['单身 / 暂无稳定关系','user'],['恋爱 / 稳定交往','heart'],['已婚 / 共同生活','home'],['分居、离婚或关系变动中','split'],['情况比较复杂','shuffle'],['暂时不想说','quiet']]},
  {key:'mood',type:'single',
   label:'当前情绪 · 单选',title:'此刻的你，更接近哪一种？',sub:'凭直觉选就好。',
   skip:'说不清楚',
   opts:[['比较平静','calm'],['有些委屈','tear'],['焦虑不安','bolt'],['生气烦躁','fire'],['疲惫无力','battery'],['难过想哭','rain'],['感到绝望','down'],['说不清楚','fog']]},
  {key:'name',type:'name',
   label:'怎么称呼 · 可选',title:'我可以怎么叫你？',sub:'不用真名，以后就这么叫你。',
   skip:'暂时不设置'},
];
const ic=n=>'<svg viewBox="0 0 24 24">'+ICONS[n]+'</svg>';
/* ---- 步骤控制 ---- */
function go(n){
  if(n>=STEPS.length){finish();return;}
  $$('.step').forEach((s,i)=>{
    s.classList.remove('active','prev');
    if(i===n)s.classList.add('active');
    else if(i<n)s.classList.add('prev');
  });
  cur=n;
  $$('#dots span').forEach((d,i)=>d.classList.toggle('on',i===n));
  $('back').style.visibility=n>0?'visible':'hidden';
  $('skip').style.visibility='visible';
  $('skip').textContent=STEPS[n].skip||'跳过';
  $('foot').style.visibility='visible';
  $('sum').classList.remove('active');
}
function bindTop(){
  $('back').onclick=()=>{if(cur>0)go(cur-1);};
  $('skip').onclick=()=>{
    const st=STEPS[cur];
    if(st.type==='multi')ob[st.key]=[];
    else ob[st.key]='';
    go(cur+1);
  };
}
/* ---- 选项 ---- */
function tap(btn,si,k){
  const st=STEPS[si],txt=st.opts[k][0];
  if(st.type==='multi'){
    const sel=ob[st.key],idx=sel.indexOf(txt);
    if(idx>=0){sel.splice(idx,1);btn.classList.remove('on');}
    else{
      if(sel.length>=st.max){toast('最多选 '+st.max+' 项，可先取消一项');return;}
      sel.push(txt);btn.classList.add('on');
    }
    const nb=$('next'+si);
    nb.disabled=sel.length===0;
    nb.textContent=sel.length?('继续 · 已选 '+sel.length+'/'+st.max):'继续';
  }else{
    ob[st.key]=txt;
    $$('.card',btn.parentElement).forEach(c=>c.classList.remove('on'));
    btn.classList.add('on');
    if(txt==='感到绝望'){setTimeout(triggerSafety,340);return;}
    setTimeout(()=>go(cur+1),320);
  }
}
/* ---- 称呼 ---- */
function setName(v){
  ob.name=v;
  const q=$('nameQuick');if(q)q.classList.add('on');
  setTimeout(finish,280);
}
function customName(){
  const v=$('customName').value.trim();
  if(!v){toast('请输入一个称呼');return;}
  ob.name=v;setTimeout(finish,200);
}
/* ---- 安全确认 ---- */
function triggerSafety(){$('safetyMask').classList.add('show');$('safetyCard').classList.add('show');}
function closeSafety(){$('safetyMask').classList.remove('show');$('safetyCard').classList.remove('show');}
function safetyContinue(){closeSafety();setTimeout(()=>go(cur+1),300);}
function safetyToConsult(){closeSafety();localStorage.setItem(OB_KEY,JSON.stringify(ob));goApp('consultants');}
/* ---- 汇总文案 ---- */
const TROUBLE_SHORT={'伴侣沟通不顺':'伴侣沟通','婚姻出现变化':'婚姻变化','对关系感到不安':'关系中的不安','家庭/亲子压力':'家庭和亲子压力','情绪起伏大':'情绪压力','工作生活压力':'工作生活压力','失眠、想太多':'睡眠困扰','孤独、没人理解':'孤独感','想更了解自己':'自我探索','只是想说说话':'倾诉的需要'};
const MOOD_PHRASE={'比较平静':'此刻比较平静','有些委屈':'现在有些委屈','焦虑不安':'现在有些焦虑不安','生气烦躁':'现在有点烦躁','疲惫无力':'现在很疲惫','难过想哭':'现在心里难过','感到绝望':'现在正经历很难的时刻','说不清楚':'感受还有些说不清楚'};
const PREF_PHRASE={'先听我说完':'先听你说完','帮我把事理清楚':'帮你把事理清楚','帮我看见真实感受':'陪你看见真实感受','一起想想怎么办':'陪你一起想办法','提醒我注意安全与边界':'提醒你注意安全与边界','需要时联系真人咨询师':'需要时帮你联系真人咨询师','还不确定，先聊聊':'先轻松聊聊'};
const PREF_SHORT={'帮我把事理清楚':'帮你理清'};
function finish(){
  localStorage.setItem(OB_KEY,JSON.stringify(ob));
  const name=ob.name||'你';
  const t=ob.troubles.map(x=>TROUBLE_SHORT[x]||x);
  const tTxt=t.length?('你最近在经历'+t.slice(0,2).join('和')+(t.length>2?'等方面的困扰':'的困扰')):'你只是想找个人说说话';
  const mTxt=ob.mood?('，'+(MOOD_PHRASE[ob.mood]||'现在有些'+ob.mood)):'';
  let pTxt='；我会先按你的节奏陪你，不急着下结论';
  if(ob.prefer.length){
    pTxt='；你希望'+(PREF_PHRASE[ob.prefer[0]]||ob.prefer[0])
      +(ob.prefer[1]?('，再'+(PREF_SHORT[ob.prefer[1]]||PREF_PHRASE[ob.prefer[1]]||ob.prefer[1])):'');
  }
  $('sumTitle').textContent=name+'，我记住了';
  $('sumDesc').textContent=tTxt+mTxt+pTxt+'。不用一次解决所有事，从你最想说的开始就好。';
  $$('.step').forEach(s=>s.classList.remove('active','prev'));
  $('foot').style.visibility='hidden';
  $('back').style.visibility='hidden';
  $('skip').style.visibility='hidden';
  $('sum').classList.add('active');
}
function goApp(target){
  /* 与主 Demo 衔接：跳回 index.html 对应界面 */
  location.href='index.html#'+target;
}
/* ---- Toast ---- */
let toastTimer;
function toast(msg){
  const t=$('toast');
  t.textContent=msg;t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),2200);
}
document.addEventListener('DOMContentLoaded',bindTop);
if(document.readyState!=='loading')bindTop();
