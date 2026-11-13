const rooms = [
  {id:'single', name:'豪華單人房', count:11, price:1200, image:'single.jpg', description:'獨自來訪，留一間安靜的休息空間。'},
  {id:'premium-single', name:'尊榮單人房', count:1, price:1800, image:'single.jpg', description:'單人住宿的另一個選擇，從容安排校園行程。'},
  {id:'twin', name:'豪華雙床房', count:2, price:1800, image:'twin.jpg', description:'與同行的夥伴一起入住，各自好好休息。'},
  {id:'double', name:'尊榮雙人房', count:1, price:2500, image:'suite.jpg', description:'適合雙人同行，為這趟來訪留下舒適時光。'},
  {id:'suite', name:'貴賓聖心套房', count:1, price:3000, image:'suite.jpg', description:'貴賓來訪的住宿選擇，感受校園接待的心意。'}
];
const $ = selector => document.querySelector(selector);
const money = value => 'NT$ ' + value.toLocaleString('en-US');
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roomById = id => rooms.find(room => room.id === id);
function dateString(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function today() { return dateString(new Date()); }
function addDays(value, days) { const date = new Date(value+'T12:00:00'); date.setDate(date.getDate()+days); return dateString(date); }
function nights(start, end) { return Math.round((new Date(end+'T12:00:00Z') - new Date(start+'T12:00:00Z')) / 86400000); }
function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(new Date(value+'T12:00:00')) && dateString(new Date(value+'T12:00:00')) === value; }
const storageKey = 'sacred-hostel-midterm-v1';
function initialData() {
  const year = new Date().getFullYear();
  const bookings = [];
  for (let month=1; month<=12; month++) {
    rooms.forEach((room,index) => {
      const start = `${year}-${String(month).padStart(2,'0')}-${String(3+index*4).padStart(2,'0')}`;
      bookings.push({id:`DEMO-${month}-${index+1}`, guest:['陳同學（示範）','林校友（示範）','王來賓（示範）','李同學（示範）','張來賓（示範）'][index], phone:'0900-000-000', room:room.id, checkin:start, checkout:addDays(start,2+(month+index)%4), identity:'參與輔大活動者', note:'報表用虛構資料', status:'active', own:false});
    });
  }
  bookings.push({id:'DEMO-TODAY', guest:'當日入住測試', phone:'0900-000-000', room:'single', checkin:today(), checkout:addDays(today(),1), identity:'校友', note:'用來展示入住當天無法取消的規則', status:'active', own:true});
  return {bookings, notices:[
    {id:'n1', date:`${year}-11-10`, category:'住宿提醒', title:'校園來訪・住宿資訊', content:'課程公告：以校友返校來訪為情境，介紹客房與預約流程。這不是旅館實際促銷，沒有額外折扣。'},
    {id:'n2', date:`${year}-11-06`, category:'住宿提醒', title:'抵達之前，先確認您的入住時間', content:'官網所列入住時間為 15:30，退房時間為 12:00。如需提早入住或延後退房，請事先向旅館確認。'},
    {id:'n3', date:`${year}-11-01`, category:'旅館消息', title:'歡迎認識聖心學苑教學旅館', content:'這裡也是餐旅學生的實作教室。透過接待、房務與訂房練習，累積服務經驗。正式訂房請聯繫餐旅管理學系。'}
  ]};
}
let data;
try { const saved = JSON.parse(localStorage.getItem(storageKey)); data = saved && Array.isArray(saved.bookings) && Array.isArray(saved.notices) ? saved : initialData(); }
catch { data = initialData(); }
if (data.notices) {
  const notice = data.notices.find(n => n.id === 'n1' && n.title === '校園來訪・住宿方案展示');
  if (notice) { notice.title = '校園來訪・住宿資訊'; notice.category = '住宿提醒'; notice.content = '返校來訪前，歡迎先查看房型與入住須知；住宿需求請事先聯繫餐旅管理學系。'; }
}
let promotionAdded = false;
try { promotionAdded = localStorage.getItem('sacred-hostel-promotion-added') === 'true'; } catch {}
if (!promotionAdded && !data.notices.some(n => n.id === 'promotion-campus')) {
  data.notices.push({id:'promotion-campus', date:today(), category:'促銷方案', title:'校園團體住宿優惠', content:'單次訂房超過 10 間，享房費九折優惠。歡迎返校活動及校園團體提前洽詢，實際房況與費用由旅館確認。'});
  try { localStorage.setItem(storageKey, JSON.stringify(data)); localStorage.setItem('sacred-hostel-promotion-added', 'true'); } catch {}
}
function save() { try { localStorage.setItem(storageKey,JSON.stringify(data)); } catch { toast('瀏覽器無法儲存資料，本次操作僅保留至離開頁面。'); } }
function toast(message) { const el=$('#toast'); el.textContent=message; el.classList.add('visible'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('visible'),4000); }
function sortedNotices() { return [...data.notices].sort((a,b)=>b.date.localeCompare(a.date)); }
function roomOptions(selected='single') { return rooms.map(r=>`<option value="${r.id}" ${selected===r.id?'selected':''}>${r.name} · ${money(r.price)} / 晚</option>`).join(''); }
function bookingStatus(b) { if(b.status==='cancelled') return '已取消'; if(b.checkout<=today()) return '已退房'; if(b.checkin<=today()) return '入住中'; return '已預約'; }
function bookingAmount(b) { return nights(b.checkin,b.checkout)*roomById(b.room).price; }
function capacityError(roomId,start,end,exclude='') {
  const room=roomById(roomId);
  if(!room || !validDate(start) || !validDate(end)) return '請完整填寫有效的日期與房型。';
  const days=nights(start,end);
  if(days<=0) return '退房日期必須晚於入住日期。';
  if(days>31) return '請選擇 1 至 31 晚的住宿日期。';
  for(let date=start;date<end;date=addDays(date,1)) {
    const used=data.bookings.filter(b=>b.id!==exclude && b.status==='active' && b.room===roomId && b.checkin<=date && b.checkout>date).length;
    if(used>=room.count) return `${date} 的${room.name}已無空房，請改選日期或房型。`;
  }
  return '';
}
function renderHome() {
  $('#announcement-list').innerHTML=sortedNotices().map(n=>`<article class="notice-row"><time datetime="${escapeHTML(n.date)}">${escapeHTML(n.date.replaceAll('-','.'))}</time><span class="category">${escapeHTML(n.category)}</span><details><summary>${escapeHTML(n.title)}</summary><p>${escapeHTML(n.content)}</p></details></article>`).join('') || '<p class="empty">目前沒有公告。</p>';
}
function renderRooms() {
  $('#room-list').innerHTML = rooms.map(room => `<article class="room-text-row">
    <div><h3>${room.name}</h3><p>${room.description}</p><span class="small muted">全館 ${room.count} 間 · 獨立衛浴 · 空調 · 寢具與毛巾</span></div>
    <div class="room-text-price"><strong>${money(room.price)}</strong><span>每房／每晚</span><a href="reservation.html?room=${room.id}">預約此房型 →</a></div>
  </article>`).join('');
}
function renderMyBookings() {
  const bookings=data.bookings.filter(b=>b.own).reverse();
  $('#my-bookings').innerHTML=bookings.map(b=>`<article class="booking-card"><div><p>${escapeHTML(b.id)}</p><h3>${escapeHTML(roomById(b.room).name)} · ${escapeHTML(b.guest)}</h3><p>${escapeHTML(b.checkin)} → ${escapeHTML(b.checkout)} / ${nights(b.checkin,b.checkout)} 晚</p><p>${money(bookingAmount(b))}</p></div><div class="card-action"><span class="status ${b.status==='cancelled'?'cancelled':''}">${bookingStatus(b)}</span><br>${b.status==='active'&&b.checkin>today()?`<button class="text-button" data-cancel="${escapeHTML(b.id)}">取消預約</button>`:b.status==='active'&&b.checkin<=today()?'<span class="small muted">入住當天起不可取消</span>':''}</div></article>`).join('') || '<p class="empty">還沒有預約。填寫上方表單，試著建立第一筆。</p>';
  $('#my-bookings').querySelectorAll('[data-cancel]').forEach(button=>button.addEventListener('click',()=>{
    const b=data.bookings.find(b=>b.id===button.dataset.cancel);
    if(b.checkin<=today()) { toast('入住當天起無法取消。'); return; }
    if(confirm(`確定取消 ${b.id} 的預約？`)) { b.status='cancelled'; save(); renderMyBookings(); toast('預約已取消。'); }
  }));
}
function setupReservation() {
  const form = $('#booking-form');
  const selected = new URLSearchParams(location.search).get('room');
  form.elements.room.innerHTML = roomOptions(roomById(selected) ? selected : 'single');
  form.elements.checkin.min = addDays(today(), 3);
  form.elements.checkin.value = addDays(today(), 3);
  form.elements.checkout.value = addDays(today(), 4);
  let step = 1;
  let completed = false;
  function values() { return Object.fromEntries(new FormData(form)); }
  function stayError() {
    const v = values();
    return v.checkin < addDays(today(), 3) ? '請至少提前三日預約。' : capacityError(v.room, v.checkin, v.checkout);
  }
  function summary() {
    const v = values(), room = roomById(v.room), days = nights(v.checkin, v.checkout);
    form.elements.checkout.min = validDate(v.checkin) ? addDays(v.checkin, 1) : addDays(today(), 4);
    $('#summary-identity').textContent = v.identity;
    $('#summary-room').textContent = room.name;
    $('#summary-price').textContent = money(room.price);
    $('#summary-dates').textContent = validDate(v.checkin) && validDate(v.checkout) ? v.checkin.slice(5) + ' → ' + v.checkout.slice(5) : '住宿日期';
    $('#summary-nights').textContent = days > 0 && days <= 31 ? days + ' 晚' : '請確認日期';
    $('#summary-total').textContent = days > 0 && days <= 31 ? money(room.price * days) : '—';
  }
  function confirmation() {
    const v = values(), room = roomById(v.room);
    const rows = [['來訪身分', v.identity], ['入住日期', v.checkin], ['退房日期', v.checkout], ['房型', room.name], ['聯絡人', v.guest], ['聯絡電話', v.phone], ['備註', v.note.trim() || '無']];
    $('#booking-confirmation').innerHTML = '<dl>' + rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHTML(value)}</dd></div>`).join('') + `</dl><div class="receipt-total"><span>${nights(v.checkin,v.checkout)} 晚 · 預估房費</span><strong>${money(nights(v.checkin,v.checkout)*room.price)}</strong></div>`;
  }
  function goTo(nextStep, focus = true) {
    step = nextStep;
    $('#booking-error').textContent = '';
    document.querySelectorAll('[data-booking-step]').forEach(panel => panel.hidden = Number(panel.dataset.bookingStep) !== step);
    document.querySelectorAll('[data-progress]').forEach(item => {
      const number = Number(item.dataset.progress);
      if (number === step) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
      item.classList.toggle('step-done', number < step);
    });
    $('#booking-back').hidden = step === 1;
    $('#booking-next').hidden = step === 3;
    $('#booking-submit').hidden = step !== 3;
    $('#booking-next').textContent = step === 1 ? '填寫聯絡資料 →' : '核對住宿安排 →';
    if (step === 3) confirmation();
    if (focus) document.querySelector(`[data-booking-step="${step}"] h2`).focus();
  }
  function validateStep(number) {
    const panel = document.querySelector(`[data-booking-step="${number}"]`);
    for (const field of panel.querySelectorAll('input,select,textarea')) {
      if (!field.reportValidity()) return false;
    }
    const error = number === 1 ? stayError() : !form.elements.guest.value.trim() ? '請填寫聯絡人。' : '';
    $('#booking-error').textContent = error;
    return !error;
  }
  form.addEventListener('input', summary);
  $('#booking-next').addEventListener('click', () => { if (validateStep(step)) goTo(step + 1); });
  $('#booking-back').addEventListener('click', () => goTo(step - 1));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (completed) return;
    if (step < 3) { if (validateStep(step)) goTo(step + 1); return; }
    if (!validateStep(1)) { const error = $('#booking-error').textContent; goTo(1); $('#booking-error').textContent = error; return; }
    if (!validateStep(2)) { goTo(2); return; }
    const v = values();
    const booking = {...v, guest:v.guest.trim(), id:'SH-' + Date.now().toString(36).toUpperCase(), status:'active', own:true};
    data.bookings.push(booking); save(); renderMyBookings(); completed = true;
    form.hidden = true;
    $('#booking-result').hidden = false;
    $('#booking-result').innerHTML = `<strong>預約已建立</strong><p>預約編號：${escapeHTML(booking.id)}<br>${escapeHTML(roomById(booking.room).name)} / ${nights(booking.checkin,booking.checkout)} 晚 / ${money(bookingAmount(booking))}</p>`;
    $('#booking-restart').hidden = false;
    toast('預約已建立，可在下方查看。');
  });
  $('#booking-restart').addEventListener('click', () => {
    completed = false; form.hidden = false;
    form.elements.guest.value = ''; form.elements.phone.value = ''; form.elements.note.value = '';
    $('#booking-result').hidden = true; $('#booking-restart').hidden = true;
    goTo(1); summary();
  });
  summary(); renderMyBookings(); goTo(1, false);
}
function reportRows(year,month='all') {
  const result=rooms.map(r=>({...r,nights:0,revenue:0}));
  data.bookings.filter(b=>b.status==='active').forEach(b=>{
    for(let date=b.checkin;date<b.checkout;date=addDays(date,1)) {
      if(Number(date.slice(0,4))===Number(year) && (month==='all'||Number(date.slice(5,7))===Number(month))) {
        const r=result.find(r=>r.id===b.room);r.nights++;r.revenue+=r.price;
      }
    }
  });
  return result;
}
function monthlyRows(year) {
  return Array.from({length:12},(_,i)=>{const rows=reportRows(year,i+1);return {month:i+1,nights:rows.reduce((s,r)=>s+r.nights,0),revenue:rows.reduce((s,r)=>s+r.revenue,0),capacity:16*new Date(Number(year),i+1,0).getDate()};});
}
function renderReports() {
  const year=$('#report-year').value, monthly=monthlyRows(year);
  const total=monthly.reduce((s,r)=>({nights:s.nights+r.nights,revenue:s.revenue+r.revenue,capacity:s.capacity+r.capacity}),{nights:0,revenue:0,capacity:0});
  $('#report-stats').innerHTML=`<div><span>${year} 年總房晚</span><strong>${total.nights}<small>房晚</small></strong></div><div><span>年度營收</span><strong>${money(total.revenue)}</strong></div><div><span>年度入住率</span><strong>${(100*total.nights/total.capacity).toFixed(1)}<small>%</small></strong></div>`;
  const max=Math.max(1,...monthly.map(r=>r.revenue));
  $('#monthly-report').innerHTML=`<table><thead><tr><th>月份</th><th class="number">入住房晚</th><th class="number">入住率</th><th class="number">營收</th><th>營收比較</th></tr></thead><tbody>${monthly.map(r=>`<tr><td>${r.month} 月</td><td class="number">${r.nights}</td><td class="number">${(100*r.nights/r.capacity).toFixed(1)}%</td><td class="number">${money(r.revenue)}</td><td class="bar-cell"><div class="bar" aria-hidden="true"><span style="width:${100*r.revenue/max}%"></span></div></td></tr>`).join('')}</tbody></table>`;
  const month=$('#report-month').value;
  const days=month==='all'?nights(`${year}-01-01`,`${Number(year)+1}-01-01`):new Date(Number(year),Number(month),0).getDate();
  $('#room-report').innerHTML=`<table><thead><tr><th>房型</th><th class="number">客房數</th><th class="number">入住房晚</th><th class="number">入住率</th><th class="number">營收</th></tr></thead><tbody>${reportRows(year,month).map(r=>`<tr><td>${r.name}</td><td class="number">${r.count}</td><td class="number">${r.nights}</td><td class="number">${(100*r.nights/(r.count*days)).toFixed(1)}%</td><td class="number">${money(r.revenue)}</td></tr>`).join('')}</tbody></table>`;
}
function setupReports() {
  const current=new Date().getFullYear(); const years=new Set([current-1,current,current+1,...data.bookings.map(b=>Number(b.checkin.slice(0,4)))]);
  $('#report-year').innerHTML=[...years].sort().map(y=>`<option ${y===current?'selected':''}>${y}</option>`).join('');
  $('#report-month').innerHTML+=Array.from({length:12},(_,i)=>`<option value="${i+1}">${i+1} 月</option>`).join('');
  $('#report-year').addEventListener('change',renderReports);$('#report-month').addEventListener('change',renderReports);renderReports();
  $('#download-report').addEventListener('click',()=>{
    const year=$('#report-year').value;
    const csv='\uFEFF月份,入住房晚,入住率,營收\n'+monthlyRows(year).map(r=>`${year}-${String(r.month).padStart(2,'0')},${r.nights},${(100*r.nights/r.capacity).toFixed(1)}%,${r.revenue}`).join('\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const link=document.createElement('a');link.href=url;link.download=`聖心學苑-${year}-營運報表.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
}
let admin=false;
function renderAdminBookings() {
  const filter=$('#admin-filter').value;
  const bookings=[...data.bookings].reverse().filter(b=>filter==='all'||b.status===filter);
  $('#admin-bookings').innerHTML=`<table><thead><tr><th>編號 / 聯絡人</th><th>房型</th><th>入住 → 退房</th><th class="number">房費</th><th>狀態</th><th>管理</th></tr></thead><tbody>${bookings.map(b=>`<tr><td>${escapeHTML(b.id)}<br>${escapeHTML(b.guest)}<br><span class="muted">${escapeHTML(b.phone)}</span></td><td>${roomById(b.room).name}</td><td>${b.checkin}<br>→ ${b.checkout}</td><td class="number">${money(bookingAmount(b))}</td><td>${bookingStatus(b)}</td><td>${b.status==='active'?`<button class="text-button" data-edit="${escapeHTML(b.id)}">修改</button><button class="text-button" data-admin-cancel="${escapeHTML(b.id)}">取消</button>`:'—'}</td></tr>`).join('')||'<tr><td colspan="6">目前沒有符合的預約。</td></tr>'}</tbody></table>`;
  $('#admin-bookings').querySelectorAll('[data-edit]').forEach(button=>button.addEventListener('click',()=>{
    if(!admin)return;const b=data.bookings.find(b=>b.id===button.dataset.edit);const form=$('#edit-form');
    form.elements.room.innerHTML=roomOptions(b.room);
    ['id','guest','phone','room','checkin','checkout','note'].forEach(key=>form.elements[key].value=b[key]||'');
    $('#edit-error').textContent='';$('#edit-dialog').showModal();
  }));
  $('#admin-bookings').querySelectorAll('[data-admin-cancel]').forEach(button=>button.addEventListener('click',()=>{
    if(!admin)return;const b=data.bookings.find(b=>b.id===button.dataset.adminCancel);
    if(confirm(`以管理者身分取消 ${b.id}？`)) { b.status='cancelled';save();renderAdminBookings();toast('已由管理者取消預約。'); }
  }));
}
function openNotice(id='') {
  const form=$('#notice-form');form.reset();form.elements.id.value=id;form.elements.date.value=today();
  $('#notice-title').textContent=id?'修改公告':'新增公告';
  if(id){const notice=data.notices.find(n=>n.id===id);['title','date','category','content'].forEach(key=>form.elements[key].value=notice[key]);}
  $('#notice-dialog').showModal();
}
function renderAdminNotices() {
  $('#admin-notices').innerHTML=sortedNotices().map(n=>`<div class="admin-notice"><div><p>${escapeHTML(n.date)} · ${escapeHTML(n.category)}</p><strong>${escapeHTML(n.title)}</strong></div><div><button class="text-button" data-notice-edit="${escapeHTML(n.id)}">修改</button>　<button class="text-button" data-notice-delete="${escapeHTML(n.id)}">刪除</button></div></div>`).join('')||'<p class="empty">尚無公告，請新增。</p>';
  $('#admin-notices').querySelectorAll('[data-notice-edit]').forEach(b=>b.addEventListener('click',()=>{if(admin)openNotice(b.dataset.noticeEdit);}));
  $('#admin-notices').querySelectorAll('[data-notice-delete]').forEach(b=>b.addEventListener('click',()=>{
    if(admin&&confirm('確定刪除這則公告？')){data.notices=data.notices.filter(n=>n.id!==b.dataset.noticeDelete);save();renderAdminNotices();toast('公告已刪除。');}
  }));
}
function setupManagement() {
  function setAdmin(value){admin=value;try { if(value) localStorage.setItem('sacred-hostel-admin', 'true'); else localStorage.removeItem('sacred-hostel-admin'); } catch {}$('#admin-gate').hidden=value;$('#admin-workspace').hidden=!value;if(value){renderAdminBookings();renderAdminNotices();}}
  try { if (localStorage.getItem('sacred-hostel-admin') === 'true') setAdmin(true); } catch {}
  $('#admin-login-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.elements.account.value.trim() === 'aaaa' && form.elements.password.value === '123456') {
      $('#login-error').textContent = '';
      form.reset();
      setAdmin(true);
    } else {
      $('#login-error').textContent = '帳號或密碼錯誤，請重新輸入。';
    }
  });
  $('#exit-admin').addEventListener('click', () => {
    setAdmin(false);
    $('#admin-account').focus();
  });
  $('#admin-filter').addEventListener('change',renderAdminBookings);
  document.querySelectorAll('.close-dialog').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  $('#edit-form').addEventListener('submit',event=>{
    event.preventDefault();if(!admin)return;
    const values=Object.fromEntries(new FormData(event.currentTarget));const b=data.bookings.find(b=>b.id===values.id);
    const error=capacityError(values.room,values.checkin,values.checkout,b.id);
    if(error || !values.guest.trim()){$('#edit-error').textContent=error||'請填寫聯絡人。';return;}
    Object.assign(b,values,{guest:values.guest.trim()});save();$('#edit-dialog').close();renderAdminBookings();toast('預約資料已更新。');
  });
  $('#add-notice').addEventListener('click',()=>{if(admin)openNotice();});
  $('#notice-form').addEventListener('submit',event=>{
    event.preventDefault();if(!admin)return;const values=Object.fromEntries(new FormData(event.currentTarget));
    values.title=values.title.trim();values.content=values.content.trim();
    if(!values.title||!values.content||!validDate(values.date)){toast('請完整填寫標題、日期與內容。');return;}
    if(values.id){Object.assign(data.notices.find(n=>n.id===values.id),values);}else{data.notices.push({...values,id:'N-'+Date.now()});}
    save();$('#notice-dialog').close();renderAdminNotices();toast('公告已儲存，可至首頁查看。');
  });
  $('#reset-demo')?.addEventListener('click',()=>{if(admin&&confirm('確定清除自己建立的預約與修改，還原初始資料？')){data=initialData();save();renderAdminBookings();renderAdminNotices();toast('已還原示範資料。');}});
}
const page=document.body.dataset.page;
if(page==='home')renderHome();
if(page==='rooms')renderRooms();
if(page==='reservation')setupReservation();
if(page==='reports')setupReports();
if(page==='management')setupManagement();
