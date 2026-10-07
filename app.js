const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const TODAY=iso(new Date());
const slug=c=>String(c).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'x';
const uid=()=>'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const pct=(a,b)=>b?(a*100/b).toFixed(1):'0.0';
const byRoll=(a,b)=>String(a.roll).localeCompare(String(b.roll),undefined,{numeric:true});
const NAV=[['dash','▦','Dashboard'],['stu','🎓','Students'],['att','✋','Attendance'],['set','⚙️','Settings']];
const PATH={st:'students',at:'attendance',cfg:'settings',tc:'teachers',sb:'subjects'};
const NAVS={dash:['▦','Dashboard'],stu:['🎓','Students'],att:['✋','Attendance'],sub:['📚','Subjects'],tch:['👩‍🏫','Teachers'],set:['⚙️','Settings'],mine:['📊','My Attendance'],db:['🗄️','Database']};
const KEY='attendease_v1';
const V={view:'dash',month:TODAY.slice(0,7),date:TODAY,cls:'',q:'',fc:'',edit:null,draft:{},dk:'',dirty:false,sub:'',dsub:'',tab:'t',dbt:'st',dbe:null};
let S={st:{},at:{},tc:{},sb:{},cfg:{college:'My College',classes:['CSE-A','CSE-B','ECE-A'],min:75}};
let db=null,arm=null,tt,ready=false;

/* ---------- storage ---------- */
function saveLocal(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function loadLocal(){try{const j=JSON.parse(localStorage.getItem(KEY)||'null');if(j){S.st=j.st||{};S.at=j.at||{};S.tc=j.tc||{};S.sb=j.sb||{};Object.assign(S.cfg,j.cfg||{})}}catch(e){}}
async function wr(kind,id,data){
  if(kind==='cfg')S.cfg=data;else if(data)S[kind][id]=data;else delete S[kind][id];
  if(db){try{const r=db.doc(PATH[kind]+'/'+id);data?await r.set(data):await r.delete()}catch(e){toast('Not saved: '+(e.message||'database error'))}}
  else saveLocal();
  render();
}
function subscribe(){
  const err=e=>toast('Sync problem: '+(e.message||e.code));
  db.collection('students').onSnapshot(s=>{S.st={};s.docs.forEach(d=>S.st[d.id]={...d.data(),id:d.id});soft()},err);
  db.collection('attendance').onSnapshot(s=>{S.at={};s.docs.forEach(d=>S.at[d.id]=d.data());soft()},err);
  db.collection('teachers').onSnapshot(s=>{S.tc={};s.docs.forEach(d=>S.tc[d.id]={...d.data(),id:d.id});ready=true;soft()},err);
  db.collection('subjects').onSnapshot(s=>{S.sb={};s.docs.forEach(d=>S.sb[d.id]={...d.data(),id:d.id});soft()},err);
  db.doc('settings/main').onSnapshot(d=>{if(d.exists)Object.assign(S.cfg,d.data());soft()},err);
}

/* ---------- stats ---------- */
function monthStats(m,sub){
  const days={},per={},ps={},sc=SC();let P=0,A=0;
  for(const k in S.at){
    const d=S.at[k];if(!d.date||!d.date.startsWith(m)||(sub&&d.sub!==sub)||(sc&&!sc.has(d.sub)))continue;
    for(const sid in d.rec||{}){
      if(!S.st[sid])continue;
      const day=days[d.date]=days[d.date]||{p:0,a:0},pp=per[sid]=per[sid]||{p:0,a:0};
      const sx=(ps[sid]=ps[sid]||{}),y=sx[d.sub||'']=sx[d.sub||'']||{p:0,a:0};
      if(d.rec[sid]==='P'){P++;day.p++;pp.p++;y.p++}else{A++;day.a++;pp.a++;y.a++}
    }
  }
  return{days,per,ps,P,A};
}
const stuIn=c=>Object.values(S.st).filter(s=>s.cls===c).sort(byRoll);

/* ---------- views ---------- */
const card=(i,l,v)=>`<div class="stat"><i>${i}</i><div><b>${l}</b><span>${v}</span></div></div>`;

function chart(days){
  const ks=Object.keys(days).sort();
  if(!ks.length)return '<p class="empty">No attendance recorded for this month yet.</p>';
  const W=640,H=250,L=34,B=28,T=10,pw=W-L-8,ph=H-B-T;
  const top=Math.ceil(Math.max(4,...ks.map(k=>Math.max(days[k].p,days[k].a)))/4)*4;
  let g='';
  for(let i=0;i<=4;i++){const y=T+ph-ph*i/4;g+=`<line x1="${L}" x2="${W-8}" y1="${y}" y2="${y}" class="gl"/><text x="${L-6}" y="${y+4}" text-anchor="end">${top*i/4}</text>`}
  const gw=pw/ks.length,bw=Math.min(28,gw*.36);
  ks.forEach((k,i)=>{
    const x=L+gw*i+gw/2,d=days[k],hp=ph*d.p/top,ha=ph*d.a/top;
    g+=`<rect x="${x-bw-1}" y="${T+ph-hp}" width="${bw}" height="${hp}" fill="var(--blue)"/><rect x="${x+1}" y="${T+ph-ha}" width="${bw}" height="${ha}" fill="var(--teal)"/><text x="${x}" y="${H-8}" text-anchor="middle">${+k.slice(8)}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="chart">${g}</svg>`;
}
function donut(P,A){
  const T=P+A,r=70,c=2*Math.PI*r,len=T?c*P/T:0;
  return `<svg viewBox="0 0 200 200" class="donut"><circle cx="100" cy="100" r="${r}" fill="none" stroke="${T?'var(--teal)':'var(--bd)'}" stroke-width="22"/><circle cx="100" cy="100" r="${r}" fill="none" stroke="var(--blue)" stroke-width="22" stroke-dasharray="${len} ${c}" transform="rotate(-90 100 100)"/><text x="100" y="108" text-anchor="middle">${T?pct(P,T)+'%':'—'}</text></svg>`;
}
function pDash(){
  const {days,per,P,A}=monthStats(V.month,V.dsub),T=P+A;
  const low=Object.values(S.st).map(s=>({s,p:per[s.id]||{p:0,a:0}})).filter(x=>x.p.p+x.p.a>0&&x.p.p*100/(x.p.p+x.p.a)<S.cfg.min);
  const lowHtml=!Object.keys(per).length?'<p class="empty">No attendance recorded for this month yet.</p>':!low.length?'<p class="empty">Everyone is above the minimum. 🎉</p>':
    `<div class="tw"><table><thead><tr><th>Roll</th><th>Name</th><th>Class</th><th>Present / Total</th><th>%</th></tr></thead><tbody>${low.sort((a,b)=>byRoll(a.s,b.s)).map(({s,p})=>`<tr><td>${esc(s.roll)}</td><td>${esc(s.name)}</td><td>${esc(s.cls)}</td><td>${p.p} / ${p.p+p.a}</td><td><span class="pill bad">${pct(p.p,p.p+p.a)}%</span></td></tr>`).join('')}</tbody></table></div>`;
  return `<div class="head"><h1>Dashboard</h1><div class="row"><select id="dsub"><option value="">All subjects</option>${mySubs().map(b=>`<option value="${esc(b.id)}" ${b.id===V.dsub?'selected':''}>${esc(b.name)} (${esc(b.cls)})</option>`).join('')}</select><input type="month" id="month" value="${V.month}"><button class="btn" data-act="xpdf">⬇ PDF</button><button class="btn" data-act="xlsx">⬇ Excel</button><button class="btn" data-act="export">⬇ Export CSV</button></div></div>
  <div class="stats">${card('🎓','Total Students',Object.keys(S.st).length)}${card('📈','Total Present',pct(P,T)+'%')}${card('📉','Total Absent',pct(A,T)+'%')}</div>
  <div class="grid"><section class="card"><h2>Attendance</h2>${chart(days)}<div class="leg"><i class="b"></i>Total Present <i class="t"></i>Total Absent</div></section>
  <section class="card"><h2>Monthly Attendance</h2>${donut(P,A)}</section></div>
  <section class="card"><h2>Below ${S.cfg.min}% attendance</h2>${lowHtml}</section>`;
}

function stuRows(){
  const all=Object.values(S.st);
  if(!all.length)return '<tr><td colspan="6" class="empty">No students yet. Add one above, or <a href="#" data-act="sample">load sample students</a>.</td></tr>';
  const q=V.q.toLowerCase(),per=monthStats('').per;
  const rows=all.filter(s=>(!V.fc||s.cls===V.fc)&&(!q||(s.name+' '+s.roll).toLowerCase().includes(q))).sort(byRoll);
  return rows.map(s=>{
    const p=per[s.id]||{p:0,a:0},t=p.p+p.a,x=pct(p.p,t);
    return `<tr><td>${esc(s.roll)}</td><td>${esc(s.name)}</td><td>${esc(s.cls)}</td><td>${esc(s.phone)}</td><td>${t?`<span class="pill ${+x<S.cfg.min?'bad':'ok'}">${x}%</span>`:'–'}</td><td class="act"><button class="btn sm" data-edit="${esc(s.id)}">Edit</button><button class="btn sm dng" data-del="st:${esc(s.id)}">Delete</button></td></tr>`;
  }).join('')||'<tr><td colspan="6" class="empty">No matching students.</td></tr>';
}
function pStu(){
  const e=V.edit?S.st[V.edit]:null,cl=S.cfg.classes;
  const opt=(c,sel)=>`<option ${c===sel?'selected':''}>${esc(c)}</option>`;
  return `<div class="head"><h1>Students</h1></div>
  <section class="card"><h2>${e?'Edit student':'Add student'}</h2><div class="form">
    <input id="f-roll" placeholder="Roll / Reg. no." value="${esc(e&&e.roll)}"><input id="f-name" placeholder="Full name" value="${esc(e&&e.name)}">
    <select id="f-cls">${cl.map(c=>opt(c,e&&e.cls)).join('')}</select><input id="f-ph" placeholder="Phone (optional)" value="${esc(e&&e.phone)}"><input id="f-pw" type="password" placeholder="${e?'New password (blank = keep)':'Password (blank = roll no.)'}">
        <button class="btn pri" data-act="saveStu">${e?'Update':'Add'}</button>${e?'<button class="btn" data-act="cancelEdit">Cancel</button><button class="btn" data-act="resetStu">Reset password to roll no.</button>':''}
  </div></section>
  <section class="card"><div class="row sp" style="margin-bottom:12px"><h2 style="margin:0">All students</h2><div class="row"><input id="q" placeholder="Search name or roll…" value="${esc(V.q)}"><select id="fc"><option value="">All classes</option>${cl.map(c=>opt(c,V.fc)).join('')}</select></div></div>
  <div class="tw"><table><thead><tr><th>Roll</th><th>Name</th><th>Class</th><th>Phone</th><th>Attendance</th><th></th></tr></thead><tbody id="stuBody">${stuRows()}</tbody></table></div></section>`;
}

function ensureDraft(){
  const cl=S.cfg.classes;if(!cl.includes(V.cls))V.cls=cl[0];
  const subs=subsOf(V.cls);if(!subs.some(b=>b.id===V.sub))V.sub=subs[0]?subs[0].id:'';
  const k=V.sub?V.date+'_'+slug(V.cls)+'_'+V.sub:'';
  if(V.dk===k&&V.dirty)return;
  if(V.dk!==k)V.dirty=false;
  V.dk=k;const saved=(S.at[k]&&S.at[k].rec)||{};V.draft={};
  stuIn(V.cls).forEach(s=>V.draft[s.id]=saved[s.id]||'P');
}
function pAtt(){
  ensureDraft();
  const L=stuIn(V.cls),saved=!!S.at[V.dk],p=L.filter(s=>V.draft[s.id]!=='A').length;
  const rows=L.map(s=>{const d=V.draft[s.id]||'P';return `<tr><td>${esc(s.roll)}</td><td>${esc(s.name)}</td><td><div class="tg"><button class="p ${d==='P'?'on':''}" data-m="${esc(s.id)}" data-v="P">Present</button><button class="a ${d==='A'?'on':''}" data-m="${esc(s.id)}" data-v="A">Absent</button></div></td></tr>`}).join('');
  return `<div class="head"><h1>Attendance</h1><div class="row"><input type="date" id="adate" value="${V.date}" max="${TODAY}"><select id="asub">${subsOf(V.cls).map(b=>`<option value="${esc(b.id)}" ${b.id===V.sub?'selected':''}>${esc(b.name)}</option>`).join('')}</select><select id="acls">${S.cfg.classes.map(c=>`<option ${c===V.cls?'selected':''}>${esc(c)}</option>`).join('')}</select></div></div>
  <section class="card"><div class="row sp" style="margin-bottom:12px"><h2 style="margin:0">${esc(V.cls)} · ${esc(subName(V.sub))} · ${V.date} ${saved&&!V.dirty?'<span class="pill ok">Saved</span>':''}</h2><div class="row"><button class="btn" data-act="allP">All present</button><button class="btn" data-act="allA">All absent</button></div></div>
  ${!V.sub?'<p class="empty">Add a subject for this class in the Subjects tab first.</p>':L.length?`<div class="tw"><table><thead><tr><th>Roll</th><th>Name</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>
  <div class="row sp foot"><span>Present <b>${p}</b> · Absent <b>${L.length-p}</b> of ${L.length}</span><button class="btn pri" data-act="saveAtt">Save attendance</button></div>`:'<p class="empty">No students in this class yet. Add students first.</p>'}</section>`;
}

function pSet(){
  const c=S.cfg;
  return `<div class="head"><h1>Settings</h1></div>
  <section class="card"><div class="form col">
    <label>College name<input id="s-name" value="${esc(c.college)}"></label>
    <label>Classes / sections (comma separated)<input id="s-cls" value="${esc(c.classes.join(', '))}"></label>
    <label>Minimum attendance required (%)<input id="s-min" type="number" min="1" max="100" value="${c.min}"></label>
    <div class="row"><button class="btn pri" data-act="saveCfg">Save settings</button></div>
  </div></section>
  ${pwCard()}<section class="card"><h2>Data</h2><p class="mut">${db?'Data is stored in this page’s shared database, so everyone you share it with sees the same records.':'Data is stored only in this browser (no shared database is available in this view).'}</p>
  <button class="btn" data-act="export">⬇ Export month report (CSV)</button></section>`;
}

const isAdm=()=>{const u=me();return !!u&&u.k==='t'&&u.role==='admin'};
const mySubs=()=>{const u=me();return Object.values(S.sb).filter(b=>!u||u.k==='s'||isAdm()||b.tid===u.id)};
const SC=()=>{const u=me();return !u||u.k==='s'||isAdm()?null:new Set(mySubs().map(b=>b.id))};
const tOpts=sel=>Object.values(S.tc).map(t=>`<option value="${esc(t.id)}" ${t.id===sel?'selected':''}>${esc(t.name)}</option>`).join('');
const tsel=b=>isAdm()?`<select data-re="${esc(b.id)}"><option value="">Unassigned</option>${tOpts(b.tid)}</select>`:esc(S.tc[b.tid]?S.tc[b.tid].name:'');
async function dl(name,blob){
  try{const d=window.claude&&await claude.use('downloads');if(d){await d.save({filename:name,data:blob});return}}
  catch(e){if(e&&e.code==='declined')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),4000);
}
function repData(){
  const subs=mySubs().filter(b=>!V.dsub||b.id===V.dsub).sort((a,b)=>a.cls.localeCompare(b.cls)||a.name.localeCompare(b.name));
  const hdr=['Roll No','Name','Class','Subject','Present','Absent','Total','%'],rows=[];
  subs.forEach(b=>{const per=monthStats(V.month,b.id).per;stuIn(b.cls).forEach(s=>{const p=per[s.id]||{p:0,a:0},t=p.p+p.a;rows.push([s.roll,s.name,s.cls,b.name,p.p,p.a,t,t?+pct(p.p,t):0])})});
  return{hdr,rows,title:S.cfg.college+' - Attendance '+V.month+(V.dsub?' - '+subName(V.dsub):'')};
}
function pDb(){
  const T={st:'Students',tc:'Teachers',sb:'Subjects',at:'Attendance'},t=V.dbt,R=S[t];
  const cnt=(d,v)=>Object.values(d.rec||{}).filter(x=>x===v).length;
  const lbl=d=>t==='at'?`${esc(d.date)} · ${esc(d.cls)} · ${esc(subName(d.sub))} · ${cnt(d,'P')}P / ${cnt(d,'A')}A`:t==='st'?`${esc(d.roll)} · ${esc(d.name)} · ${esc(d.cls)}`:t==='tc'?`${esc(d.name)} · ${esc(d.login)} · ${esc(d.role)}`:`${esc(d.name)} · ${esc(d.cls)} · ${esc(S.tc[d.tid]?S.tc[d.tid].name:'unassigned')}`;
  const ed=V.dbe&&R[V.dbe]?`<section class="card"><h2>Editing record ${esc(V.dbe)}</h2><textarea id="j-txt" rows="14" style="width:100%;font:13px monospace;padding:10px;border:1px solid var(--bd);border-radius:8px;background:var(--card);color:var(--tx)">${esc(JSON.stringify(R[V.dbe],null,2))}</textarea><div class="row" style="margin-top:10px"><button class="btn pri" data-act="saveJson">Save changes</button><button class="btn" data-act="cancelJson">Cancel</button></div></section>`:'';
  return `<div class="head"><h1>Database</h1><div class="tabs">${Object.keys(T).map(k=>`<button class="btn ${k===t?'on':''}" data-dbt="${k}">${T[k]} (${Object.keys(S[k]).length})</button>`).join('')}</div></div>${ed}
  <section class="card"><div class="tw"><table><thead><tr><th>Record</th><th></th></tr></thead><tbody>${Object.keys(R).sort().map(i=>`<tr><td>${lbl(R[i])}</td><td class="act"><button class="btn sm" data-dbe="${esc(i)}">Edit</button><button class="btn sm dng" data-del="${t}:${esc(i)}">Delete</button></td></tr>`).join('')||'<tr><td colspan="2" class="empty">No records.</td></tr>'}</tbody></table></div></section>`;
}
const subsOf=c=>mySubs().filter(b=>b.cls===c).sort((a,b)=>a.name.localeCompare(b.name));
const subName=i=>S.sb[i]?S.sb[i].name:'General';
let SESS=null;try{SESS=JSON.parse(sessionStorage.getItem('ae_sess')||'null')}catch(e){}
function setSess(v){SESS=v;try{v?sessionStorage.setItem('ae_sess',JSON.stringify(v)):sessionStorage.removeItem('ae_sess')}catch(e){}}
const me=()=>{const r=SESS&&(SESS.k==='t'?S.tc:S.st)[SESS.id];return r?{...r,k:SESS.k}:null};
const sha=async(p,s)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s+p)))].map(b=>b.toString(16).padStart(2,'0')).join('');
const mkPw=async p=>{const salt=uid();return{salt,hash:await sha(p,salt)}};
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.closest('#gate')&&ready&&!me())Object.keys(S.tc).length?act.login():act.setup()});

const pwCard=()=>`<section class="card"><h2>Change my password</h2><div class="form col"><input id="c-old" type="password" placeholder="Current password"><input id="c-new" type="password" placeholder="New password (4+ characters)"><input id="c-new2" type="password" placeholder="Confirm new password"><div class="row"><button class="btn pri" data-act="chPw">Change password</button></div></div></section>`;
function pGate(){
  const b=h=>`<section class="card login"><h1 style="font-size:22px;margin-bottom:14px">🎓 AttendEase</h1>${h}</section>`;
  if(!ready)return b('<p class="mut">Loading…</p>');
  if(!Object.keys(S.tc).length)return b('<h2>First-time setup: create the admin</h2><div class="form"><input id="a-name" placeholder="Your name"><input id="a-id" placeholder="Login ID"><input id="a-pw" type="password" placeholder="Password (4+ characters)"><button class="btn pri" data-act="setup">Create admin</button></div>');
  const t=V.tab==='t';
  return b(`<div class="tabs"><button class="btn ${t?'on':''}" data-tab="t">Teacher</button><button class="btn ${t?'':'on'}" data-tab="s">Student</button></div><div class="form"><input id="l-id" placeholder="${t?'Teacher login ID':'Roll number'}"><input id="l-pw" type="password" placeholder="Password"><button class="btn pri" data-act="login">Sign in</button></div>${t?'':'<p class="mut">Default password is your roll number.</p>'}`);
}
function pSub(){
  const L=mySubs().sort((a,b)=>a.cls.localeCompare(b.cls)||a.name.localeCompare(b.name));
  return `<div class="head"><h1>Subjects</h1></div>
  <section class="card"><h2>Add subject</h2><div class="form"><input id="b-name" placeholder="Subject name (e.g. Data Structures)"><select id="b-cls">${S.cfg.classes.map(c=>`<option>${esc(c)}</option>`).join('')}</select>${isAdm()?`<select id="b-tid">${tOpts()}</select>`:''}<button class="btn pri" data-act="saveSub">Add subject</button></div></section>
  <section class="card"><h2>All subjects</h2><div class="tw"><table><thead><tr><th>Subject</th><th>Class</th><th>Teacher</th><th></th></tr></thead><tbody>${L.map(b=>`<tr><td>${esc(b.name)}</td><td>${esc(b.cls)}</td><td>${tsel(b)}</td><td class="act"><button class="btn sm dng" data-del="sb:${esc(b.id)}">Delete</button></td></tr>`).join('')||'<tr><td colspan="4" class="empty">No subjects yet.</td></tr>'}</tbody></table></div></section>`;
}
function pTch(){
  const u=me();
  return `<div class="head"><h1>Teachers</h1></div>
  <section class="card"><h2>Add teacher login</h2><div class="form"><input id="t-name" placeholder="Full name"><input id="t-id" placeholder="Login ID"><input id="t-pw" type="password" placeholder="Password"><select id="t-role"><option value="teacher">Teacher</option><option value="admin">Admin</option></select><button class="btn pri" data-act="saveTch">Add</button></div></section>
  <section class="card"><h2>Reset a teacher’s password</h2><div class="form"><select id="r-t">${Object.values(S.tc).map(t=>`<option value="${esc(t.id)}">${esc(t.name)} (${esc(t.login)})</option>`).join('')}</select><input id="r-pw" type="password" placeholder="New password (4+ characters)"><button class="btn pri" data-act="resetTch">Reset password</button></div></section>
  <section class="card"><div class="tw"><table><thead><tr><th>Name</th><th>Login ID</th><th>Role</th><th></th></tr></thead><tbody>${Object.values(S.tc).map(t=>`<tr><td>${esc(t.name)}</td><td>${esc(t.login)}</td><td>${esc(t.role)}</td><td class="act">${t.id===u.id?'(you)':`<button class="btn sm dng" data-del="tc:${esc(t.id)}">Delete</button>`}</td></tr>`).join('')}</tbody></table></div></section>`;
}
function pMine(){
  const u=me(),mm=monthStats(V.month).ps[u.id]||{},al=monthStats('').ps[u.id]||{};
  const ids=[...new Set([...subsOf(u.cls).map(b=>b.id),...Object.keys(al)])];
  const P=ids.reduce((n,i)=>n+(mm[i]?mm[i].p:0),0),A=ids.reduce((n,i)=>n+(mm[i]?mm[i].a:0),0);
  const rows=ids.map(i=>{const m=mm[i]||{p:0,a:0},a=al[i]||{p:0,a:0},t=a.p+a.a,x=pct(a.p,t);
    return `<tr><td>${esc(subName(i))}</td><td>${m.p} / ${m.p+m.a}</td><td>${a.p} / ${t}</td><td>${t?`<span class="pill ${+x<S.cfg.min?'bad':'ok'}">${x}%</span>`:'–'}</td></tr>`}).join('');
  return `<div class="head"><h1>My Attendance</h1><input type="month" id="month" value="${V.month}"></div>
    <div class="stats">${card('🎓','Class',esc(u.cls))}${card('📈','Present (month)',pct(P,P+A)+'%')}${card('📉','Absent (month)',pct(A,P+A)+'%')}</div>
  <section class="card"><h2>Subject-wise attendance</h2><div class="tw"><table><thead><tr><th>Subject</th><th>This month</th><th>All time</th><th>%</th></tr></thead><tbody>${rows||'<tr><td colspan="4" class="empty">No subjects or records yet.</td></tr>'}</tbody></table></div><p class="mut">Minimum required: ${S.cfg.min}%</p></section>${pwCard()}`;
}
function render(){
  const u=me();$('.app').hidden=!u;$('#gate').hidden=!!u;
  if(!u){$('#gate').innerHTML=pGate();return}
  const adm=u.k==='t'&&u.role==='admin',nav=u.k==='s'?['mine']:['dash','stu','att','sub',...(adm?['tch','db']:[]),'set'];
  if(!nav.includes(V.view))V.view=nav[0];
  $('#who').textContent=u.name+(u.k==='s'?' (Student)':adm?' (Admin)':' (Teacher)');
  $('#nav').innerHTML=nav.map(k=>`<button class="${V.view===k?'on':''}" data-go="${k}"><span>${NAVS[k][0]}</span>${NAVS[k][1]}</button>`).join('');
  $('#college').textContent=S.cfg.college;
  $('#mode').textContent=db?'☁ Shared database':'💾 Saved in this browser';
  $('#main').innerHTML=({dash:pDash,stu:pStu,att:pAtt,sub:pSub,tch:pTch,set:pSet,mine:pMine,db:pDb})[V.view]();
}
function soft(){const a=document.activeElement;if(a&&/INPUT|SELECT|TEXTAREA/.test(a.tagName)&&a.closest('#main,#gate'))return;render()}
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2800)}

/* ---------- actions ---------- */
async function exportCSV(){
  const {per}=monthStats(V.month);
  const rows=[['Roll No','Name','Class','Present','Absent','Total','Percentage']];
  Object.values(S.st).sort(byRoll).forEach(s=>{const p=per[s.id]||{p:0,a:0},t=p.p+p.a;rows.push([s.roll,s.name,s.cls,p.p,p.a,t,t?pct(p.p,t):''])});
  const csv=rows.map(r=>r.map(c=>{c=String(c);if(/^[=+\-@]/.test(c))c="'"+c;return '"'+c.replace(/"/g,'""')+'"'}).join(',')).join('\n');
  await dl(`attendance-${V.month}.csv`,new Blob([csv],{type:'text/csv'}));
}
function setAll(v){stuIn(V.cls).forEach(s=>V.draft[s.id]=v);V.dirty=true;render()}
const act={
  async saveStu(){
    const roll=$('#f-roll').value.trim(),name=$('#f-name').value.trim(),cls=$('#f-cls').value,phone=$('#f-ph').value.trim();
    if(!roll||!name)return toast('Roll number and name are required');
    if(Object.values(S.st).some(s=>s.roll===roll&&s.id!==V.edit))return toast('That roll number already exists');
    const id=V.edit||uid();V.edit=null;
    const o=S.st[id]||{},pw=$('#f-pw').value,r={id,roll,name,cls,phone,...(o.hash?{hash:o.hash,salt:o.salt}:{})};
    if(pw)Object.assign(r,await mkPw(pw));
    await wr('st',id,r);toast('Student saved');
  },
  cancelEdit(){V.edit=null;render()},
  async sample(){
    const n=['Aarav Kumar','Priya Sharma','Rohan Singh','Neha Verma','Aman Jha','Sneha Mishra'];
    for(let i=0;i<n.length;i++){const id=uid();await wr('st',id,{id,roll:'CS'+(101+i),name:n[i],cls:S.cfg.classes[0],phone:''})}
  },
  allP(){setAll('P')},allA(){setAll('A')},
  async saveAtt(){
    const L=stuIn(V.cls);if(!L.length||!V.sub)return;
    const rec={};L.forEach(s=>rec[s.id]=V.draft[s.id]==='A'?'A':'P');
    V.dirty=false;await wr('at',V.dk,{date:V.date,cls:V.cls,sub:V.sub,by:me().name,rec});toast('Attendance saved');
  },
  async saveCfg(){
    const classes=[...new Set($('#s-cls').value.split(',').map(x=>x.trim()).filter(Boolean))];
    if(!classes.length)return toast('Add at least one class');
    const min=Math.min(100,Math.max(1,parseInt($('#s-min').value)||75));
    await wr('cfg','main',{college:$('#s-name').value.trim()||'My College',classes,min});toast('Settings saved');
  },
  async setup(){
    const name=$('#a-name').value.trim(),login=$('#a-id').value.trim(),pw=$('#a-pw').value;
    if(!name||!login||pw.length<4)return toast('Enter name, ID and a password (4+ characters)');
    const id=uid();setSess({k:'t',id});V.view='dash';
    await wr('tc',id,{id,name,login,role:'admin',...await mkPw(pw)});
  },
  async login(){
    const t=V.tab==='t',id=$('#l-id').value.trim().toLowerCase(),pw=$('#l-pw').value;
    const r=Object.values(t?S.tc:S.st).find(x=>String(t?x.login:x.roll).toLowerCase()===id);
    const ok=r&&(r.hash?await sha(pw,r.salt)===r.hash:!t&&pw===String(r.roll));
    if(!ok)return toast('Wrong ID or password');
    setSess({k:t?'t':'s',id:r.id});V.view=t?'dash':'mine';render();
  },
  async chPw(){
    const u=me(),cur=$('#c-old').value,n1=$('#c-new').value,n2=$('#c-new2').value;
    if(n1.length<4)return toast('New password must be 4+ characters');
    if(n1!==n2)return toast('New passwords do not match');
    const ok=u.hash?await sha(cur,u.salt)===u.hash:u.k==='s'&&cur===String(u.roll);
    if(!ok)return toast('Current password is wrong');
    const kind=u.k==='t'?'tc':'st';
    await wr(kind,u.id,{...S[kind][u.id],...await mkPw(n1)});toast('Password changed');
  },
  async resetTch(){
    const id=$('#r-t').value,pw=$('#r-pw').value;
    if(!S.tc[id])return;
    if(pw.length<4)return toast('New password must be 4+ characters');
    await wr('tc',id,{...S.tc[id],...await mkPw(pw)});toast('Password reset');
  },
  async resetStu(){
    const id=V.edit,o={...S.st[id]};delete o.hash;delete o.salt;V.edit=null;
    await wr('st',id,o);toast('Password reset to the roll number');
  },
  async xpdf(){
    const r=repData();if(!r.rows.length)return toast('Nothing to export yet');
    if(!window.jspdf)return toast('PDF library could not load');
    const doc=new jspdf.jsPDF();doc.setFontSize(13);doc.text(r.title,14,14);
    doc.autoTable({head:[r.hdr],body:r.rows,startY:20,styles:{fontSize:9}});
    await dl('attendance-'+V.month+'.pdf',new Blob([doc.output('arraybuffer')],{type:'application/pdf'}));
  },
  async xlsx(){
    const r=repData();if(!r.rows.length)return toast('Nothing to export yet');
    if(!window.XLSX)return toast('Excel library could not load');
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([r.hdr,...r.rows]),'Attendance');
    await dl('attendance-'+V.month+'.xlsx',new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  },
  async saveJson(){
    let o;try{o=JSON.parse($('#j-txt').value)}catch(e){return toast('Invalid JSON: '+e.message)}
    if(!o||typeof o!=='object'||Array.isArray(o))return toast('Record must be a JSON object');
    const t=V.dbt,id=V.dbe;if(t!=='at')o.id=id;V.dbe=null;await wr(t,id,o);toast('Record saved');
  },  cancelJson(){V.dbe=null;render()},
  logout(){setSess(null);render()},
  async saveSub(){
    const name=$('#b-name').value.trim(),cls=$('#b-cls').value;
    if(!name)return toast('Enter a subject name');
    if(Object.values(S.sb).some(b=>b.cls===cls&&b.name.toLowerCase()===name.toLowerCase()))return toast('Subject already exists for this class');
    const id=uid();await wr('sb',id,{id,name,cls,tid:isAdm()?$('#b-tid').value:me().id});toast('Subject added');
  },
  async saveTch(){
    const name=$('#t-name').value.trim(),login=$('#t-id').value.trim(),pw=$('#t-pw').value,role=$('#t-role').value;
    if(!name||!login||pw.length<4)return toast('Name, login ID and a 4+ character password are required');
    if(Object.values(S.tc).some(t=>t.login.toLowerCase()===login.toLowerCase()))return toast('That login ID is taken');
    const id=uid();await wr('tc',id,{id,name,login,role,...await mkPw(pw)});toast('Teacher added');
  },
  export:exportCSV
};

document.addEventListener('click',async e=>{
  const t=e.target.closest('[data-go],[data-act],[data-edit],[data-del],[data-m],[data-tab],[data-dbt],[data-dbe]');if(!t)return;
  const d=t.dataset;
  if(d.act==='sample')e.preventDefault();
  if(d.dbt){V.dbt=d.dbt;V.dbe=null;render()}
  else if(d.dbe){V.dbe=d.dbe;render()}
  else if(d.tab){V.tab=d.tab;render()}
  else if(d.go){V.view=d.go;V.edit=null;render()}
  else if(d.m){V.draft[d.m]=d.v;V.dirty=true;render()}
  else if(d.edit){V.edit=d.edit;render()}
  else if(d.del){
    if(arm===d.del){arm=null;const[k,i]=d.del.split(':');if(k==='tc'&&i===me().id)return toast('You cannot delete your own login');await wr(k,i,null)}
    else{arm=d.del;t.textContent='Sure?';setTimeout(()=>{if(arm===d.del){arm=null;t.textContent='Delete'}},3000)}
  }
  else if(act[d.act])act[d.act]();
});
document.addEventListener('change',e=>{
  const i=e.target.id,v=e.target.value;
  if(i==='month'&&v){V.month=v;render()}
  else if(i==='adate'&&v){V.date=v;render()}
  else if(i==='acls'){V.cls=v;render()}
  else if(i==='asub'){V.sub=v;render()}
  else if(i==='dsub'){V.dsub=v;render()}
  else if(e.target.dataset.re){const b=S.sb[e.target.dataset.re];if(b)wr('sb',b.id,{...b,tid:v})}
  else if(i==='fc'){V.fc=v;$('#stuBody').innerHTML=stuRows()}
});
document.addEventListener('input',e=>{if(e.target.id==='q'){V.q=e.target.value;$('#stuBody').innerHTML=stuRows()}});

/* ---------- start ---------- */
loadLocal();if(!window.claude)ready=true;render();
(async()=>{
  try{
    if(!window.claude)return;
    const d=await claude.use('db');if(!d){ready=true;render();return}
    db=d;subscribe();render();setTimeout(()=>{ready=true;render()},6000);
  }catch(e){}
})();