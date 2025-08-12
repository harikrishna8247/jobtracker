
(function(){
  const KEY_PREFIX = 'jt_day_';
  const targetInput = document.getElementById('targetInput');
  const saveTargetBtn = document.getElementById('saveTargetBtn');
  const datePicker = document.getElementById('datePicker');
  const themeSelect = document.getElementById('themeSelect');
  const companyInput = document.getElementById('companyInput');
  const roleInput = document.getElementById('roleInput');
  const linkInput = document.getElementById('linkInput');
  const addBtn = document.getElementById('addBtn');
  const appliedCount = document.getElementById('appliedCount');
  const remainingCount = document.getElementById('remainingCount');
  const progressFill = document.getElementById('progressFill');
  const progressLabel = document.getElementById('progressLabel');
  const rows = document.getElementById('rows');
  const emptyState = document.getElementById('emptyState');
  const exportBtn = document.getElementById('exportBtn');
  const exportMonthBtn = document.getElementById('exportMonthBtn');
  const clearDayBtn = document.getElementById('clearDayBtn');
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');
  const searchAllDates = document.getElementById('searchAllDates');
  const resultsSection = document.getElementById('searchResults');
  const resultsBody = document.getElementById('resultsBody');
  const hideResultsBtn = document.getElementById('hideResultsBtn');

  function today(){
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth()+1).padStart(2,'0');
    const d = String(now.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`; // local YYYY-MM-DD
  }
  function currentDate(){ return datePicker.value; }
  function loadDay(dateStr){ try { return JSON.parse(localStorage.getItem(KEY_PREFIX+dateStr)||'[]'); } catch { return []; } }
  function saveDay(dateStr, data){ localStorage.setItem(KEY_PREFIX+dateStr, JSON.stringify(data)); }
  function timeStr(d){ return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }
  function csvEscape(s){ const needs=/[",\n]/.test(s||''); const out=(s||'').replace(/"/g,'""'); return needs?`"${out}"`:out; }

  function render(){
    const list=loadDay(currentDate());
    rows.innerHTML='';
    if(!list.length){ emptyState.style.display='block'; } else { emptyState.style.display='none'; }
    let applied=0;
    list.forEach((item, idx)=>{
      if(item.status==='applied') applied++;
      const tr=document.createElement('tr');
      tr.innerHTML=`
        <td>${item.status}</td>
        <td>${item.company}</td>
        <td>${item.role||''}</td>
        <td>${item.link?'<a href="'+item.link+'" target="_blank" rel="noopener">Open</a>':''}</td>
        <td>${timeStr(new Date(item.ts))}</td>
        <td>
          <div class="action-group">
            <button class="btn ghost" data-act="toggle">Toggle</button>
            <button class="btn ghost" data-act="delete">Delete</button>
          </div>
        </td>`;
      tr.querySelector('[data-act="toggle"]').onclick=()=>{ item.status=item.status==='applied'?'saved':'applied'; saveDay(currentDate(), list); render(); };
      tr.querySelector('[data-act="delete"]').onclick=()=>{ list.splice(idx,1); saveDay(currentDate(), list); render(); };
      rows.appendChild(tr);
    });
    const target=parseInt(localStorage.getItem('jt_target')||targetInput.value||50);
    appliedCount.textContent=applied;
    remainingCount.textContent=Math.max(target-applied,0);
    const pct=Math.min(100, Math.round((applied/Math.max(1,target))*100));
    progressFill.style.width=pct+'%'; progressLabel.textContent=pct+'%';
  }

  addBtn.onclick=()=>{
    const company=companyInput.value.trim(); if(!company) return;
    const role=roleInput.value.trim(); const link=linkInput.value.trim();
    const list=loadDay(currentDate());
    list.unshift({company, role, link, status:'applied', ts:new Date().toISOString()});
    saveDay(currentDate(), list);
    companyInput.value=''; roleInput.value=''; linkInput.value='';
    render();
  };

  [companyInput, roleInput, linkInput].forEach(el => el.addEventListener('keydown', e=>{ if(e.key==='Enter') addBtn.click(); }));

  saveTargetBtn.onclick=()=>{ localStorage.setItem('jt_target', targetInput.value); render(); };

  exportBtn.onclick=()=>{
    const dateStr=currentDate(); const items=loadDay(dateStr); if(!items.length) return alert('No data for this day');
    const lines=[['Company','Role','Link','Status','Date','Time','Timestamp'].join(',')];
    items.forEach(x=>{ const d=new Date(x.ts); lines.push([csvEscape(x.company),csvEscape(x.role),csvEscape(x.link),csvEscape(x.status),dateStr,timeStr(d),x.ts].join(',')); });
    const blob=new Blob([lines.join('\n')],{type:'text/csv'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`job-tracker_${dateStr}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  exportMonthBtn.onclick=()=>{
    const dateStr=currentDate(); const [year,month]=dateStr.split('-');
    const re=new RegExp('^'+KEY_PREFIX+year+'-'+month+'-\\d{2}$'); const all=[];
    Object.keys(localStorage).forEach(k=>{ if(re.test(k)){ const day=k.slice(KEY_PREFIX.length); loadDay(day).forEach(x=>all.push({...x,_date:day})); } });
    if(!all.length) return alert('No data for this month');
    all.sort((a,b)=> new Date(a.ts)-new Date(b.ts));
    const lines=[['Company','Role','Link','Status','Date','Time','Timestamp'].join(',')];
    all.forEach(x=>{ const d=new Date(x.ts); lines.push([csvEscape(x.company),csvEscape(x.role),csvEscape(x.link),csvEscape(x.status),x._date,timeStr(d),x.ts].join(',')); });
    const blob=new Blob([lines.join('\n')],{type:'text/csv'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`job-tracker_${year}-${month}_all.csv`; a.click(); URL.revokeObjectURL(url);
  };

  clearDayBtn.onclick=()=>{ if(confirm('Clear this day?')){ localStorage.removeItem(KEY_PREFIX+currentDate()); render(); } };

  searchBtn.onclick=()=>{
    const term=(searchInput.value||'').trim().toLowerCase(); if(!term) return;
    resultsBody.innerHTML='';
    let matches=[];
    if(searchAllDates.checked){
      Object.keys(localStorage).forEach(k=>{
        if(k.startsWith(KEY_PREFIX)){
          const day=k.slice(KEY_PREFIX.length);
          loadDay(day).forEach(x=>{ if((x.company||'').toLowerCase().includes(term)){ matches.push({...x,_date:day}); } });
        }
      });
    }else{
      loadDay(currentDate()).forEach(x=>{ if((x.company||'').toLowerCase().includes(term)){ matches.push({...x,_date:currentDate()}); } });
    }
    resultsSection.style.display='block';
    if(!matches.length){ resultsBody.innerHTML='<tr><td colspan="7">No matches found</td></tr>'; return; }
    matches.sort((a,b)=> new Date(b.ts)-new Date(a.ts));
    matches.forEach(m=>{
      const d=new Date(m.ts);
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${m._date}</td><td>${m.company}</td><td>${m.role||''}</td><td>${m.link?'<a href="'+m.link+'" target="_blank">Open</a>':''}</td><td>${m.status}</td><td>${timeStr(d)}</td><td><button class="btn ghost">Open day</button></td>`;
      tr.querySelector('button').onclick=()=>{ datePicker.value=m._date; render(); window.scrollTo({top:0, behavior:'smooth'}); };
      resultsBody.appendChild(tr);
    });
  };

  hideResultsBtn.onclick=()=>{ resultsSection.style.display='none'; };

  // Theme (only mono for now, kept for extensibility)
  themeSelect.addEventListener('change', ()=>{});

  
  // Auto-rollover to the new day if the tab stays open past midnight (local time)
  let _lastDayKey = today();
  setInterval(()=>{
    const t = today();
    if (t !== _lastDayKey) {
      _lastDayKey = t;
      // Only auto-advance if the user hasn't manually set a different date
      if (!datePicker.value || datePicker.value === '' || datePicker.value < t || datePicker.value === _lastDayKey) {
        datePicker.value = t;
        render();
      }
    }
  }, 60*1000); // check every minute

  // Init
  datePicker.value=today();
  const savedTarget=localStorage.getItem('jt_target'); if(savedTarget) targetInput.value=savedTarget;
  render();
})();