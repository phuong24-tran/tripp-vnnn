
/* Checklist theo chủ đề – tick + note + thêm item nhanh (localStorage) */
const KEY = "vn-topic-planner-v1";

function slugify(s){
  return (s||"").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
}
function itemId(text){ return "i_" + slugify(text); }

function loadState(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return {done:{}, notes:"", extra:{}}; // extra: sectionId -> [items]
    const st = JSON.parse(raw);
    return {done: st.done||{}, notes: st.notes||"", extra: st.extra||{}};
  }catch(e){
    return {done:{}, notes:"", extra:{}};
  }
}
function saveState(){ localStorage.setItem(KEY, JSON.stringify(state)); }

const state = loadState();

function escapeHtml(s){
  return String(s||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function getAllSections(){
  const base = window.APP_DATA.sections || [];
  // merge extra
  return base.map(sec => {
    const extras = (state.extra?.[sec.id] || []);
    const merged = [...sec.items, ...extras].filter(Boolean);
    // de-dupe merged (case-insensitive)
    const seen = new Set();
    const uniq = [];
    merged.forEach(t => {
      const k = (t||"").trim().toLowerCase();
      if(!k || seen.has(k)) return;
      seen.add(k);
      uniq.push(t.trim());
    });
    return {...sec, items: uniq};
  });
}

function render(){
  document.getElementById("title").textContent = window.APP_DATA.title || "Checklist theo chủ đề";

  // notes
  const notes = document.getElementById("notes");
  notes.value = state.notes || "";
  notes.addEventListener("input", () => { state.notes = notes.value; saveState(); });
  document.getElementById("btnClearNotes").addEventListener("click", () => {
    state.notes = ""; notes.value = ""; saveState();
  });

  // filter dropdown
  const filter = document.getElementById("filterSection");
  const newItemSection = document.getElementById("newItemSection");
  const sections = getAllSections();
  // fill filter options once
  filter.innerHTML = `<option value="all">Tất cả chủ đề</option>` + sections.map(s => `<option value="${s.id}">${s.emoji} ${s.name}</option>`).join("");
  newItemSection.innerHTML = sections.map(s => `<option value="${s.id}">${s.emoji} ${s.name}</option>`).join("");

  // search / filter listeners
  document.getElementById("q").addEventListener("input", renderSections);
  filter.addEventListener("change", renderSections);

  // add item
  document.getElementById("btnAdd").addEventListener("click", addItemQuick);

  // export/import/reset
  wireTools();

  renderSections();
  updateProgress();
}

function renderSections(){
  const host = document.getElementById("sections");
  host.innerHTML = "";

  const q = (document.getElementById("q").value || "").trim().toLowerCase();
  const filterId = document.getElementById("filterSection").value;

  const sections = getAllSections();

  sections.forEach(sec => {
    if(filterId !== "all" && sec.id !== filterId) return;

    // filter items by search
    const items = (sec.items||[]).filter(t => !q || t.toLowerCase().includes(q));

    // if searching and section has no match, hide it
    if(q && items.length === 0) return;

    const doneCount = items.reduce((acc,t)=> acc + (state.done[itemId(t)] ? 1 : 0), 0);

    const d = document.createElement("details");
    d.className = "section";
    d.open = !q; // open by default when not searching
    d.innerHTML = `
      <summary class="section__sum">
        <div class="section__left">
          <div class="section__emoji">${escapeHtml(sec.emoji||"")}</div>
          <div>
            <div class="section__title">${escapeHtml(sec.name)}</div>
            <div class="section__hint">${escapeHtml(sec.hint||"")}</div>
          </div>
        </div>
        <div class="section__meta">
          <div class="pill">${doneCount}/${items.length} đã tick</div>
          <div class="pill">${items.length} mục</div>
        </div>
      </summary>
    `;

    const list = document.createElement("div");
    list.className = "items";

    items.forEach(text => {
      const id = itemId(text);
      const done = !!state.done[id];

      const row = document.createElement("div");
      row.className = "item" + (done ? " done" : "");
      row.innerHTML = `
        <label style="display:flex; gap:10px; align-items:flex-start; flex:1; cursor:pointer">
          <input type="checkbox" ${done ? "checked" : ""} data-id="${id}">
          <div class="item__body">
            <div class="item__text">${escapeHtml(text)}</div>
          </div>
        </label>
        <div class="rowTools">
          <button class="iconBtn" title="Copy" data-copy="${escapeHtml(text)}">Copy</button>
          <button class="iconBtn iconBtn--danger" title="Xoá khỏi list (nếu là item bạn tự thêm)" data-del="${id}" data-sec="${sec.id}">Xoá</button>
        </div>
      `;

      row.querySelector('input').addEventListener("change", (e) => {
        state.done[id] = e.target.checked;
        saveState();
        renderSections();
        updateProgress();
      });

      row.querySelector('[data-copy]').addEventListener("click", async () => {
        try{
          await navigator.clipboard.writeText(text);
          toast("Đã copy!");
        }catch(e){
          toast("Copy không được trên trình duyệt này :(");
        }
      });

      row.querySelector('[data-del]').addEventListener("click", () => {
        removeExtraItem(sec.id, text);
      });

      list.appendChild(row);
    });

    d.appendChild(list);
    host.appendChild(d);
  });
}

function updateProgress(){
  const sections = getAllSections();
  let total = 0, done = 0;
  sections.forEach(sec => {
    (sec.items||[]).forEach(t => { total++; if(state.done[itemId(t)]) done++; });
  });
  const pct = total ? Math.round((done/total)*100) : 0;
  document.getElementById("progressBar").style.width = pct + "%";
  document.getElementById("progressText").textContent = `Tổng tiến độ: ${done}/${total} (${pct}%)`;
}

function addItemQuick(){
  const txtEl = document.getElementById("newItem");
  const secEl = document.getElementById("newItemSection");
  const text = (txtEl.value || "").trim();
  const secId = secEl.value;

  if(!text){ toast("Bạn chưa nhập item 😭"); return; }

  state.extra = state.extra || {};
  state.extra[secId] = state.extra[secId] || [];

  // de-dupe vs existing
  const sections = getAllSections();
  const sec = sections.find(s => s.id === secId);
  const exists = (sec?.items || []).some(t => t.trim().toLowerCase() === text.toLowerCase());
  if(exists){ toast("Item này đã có rồi nha"); txtEl.value=""; return; }

  state.extra[secId].push(text);
  saveState();
  txtEl.value = "";
  renderSections();
  updateProgress();
  toast("Đã thêm!");
}

function removeExtraItem(secId, text){
  // only remove from extra; base data stays
  const extras = state.extra?.[secId] || [];
  const idx = extras.findIndex(t => (t||"").trim().toLowerCase() === (text||"").trim().toLowerCase());
  if(idx === -1){
    toast("Item gốc không xoá (chỉ xoá được item bạn tự thêm)");
    return;
  }
  extras.splice(idx,1);
  state.extra[secId] = extras;

  // also clear done if set
  delete state.done[itemId(text)];
  saveState();
  renderSections();
  updateProgress();
  toast("Đã xoá!");
}

function wireTools(){
  document.getElementById("btnReset").addEventListener("click", () => {
    if(!confirm("Reset toàn bộ tick? (note + item tự thêm vẫn giữ)")) return;
    state.done = {};
    saveState();
    renderSections();
    updateProgress();
  });

  document.getElementById("btnExport").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tien-do-vn-topic.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  const file = document.getElementById("importFile");
  file.addEventListener("change", async () => {
    const f = file.files?.[0];
    if(!f) return;
    try{
      const txt = await f.text();
      const imported = JSON.parse(txt);
      state.done = imported.done || {};
      state.notes = imported.notes || "";
      state.extra = imported.extra || {};
      saveState();
      document.getElementById("notes").value = state.notes;
      renderSections();
      updateProgress();
      toast("Nhập tiến độ xong!");
    }catch(e){
      toast("File không hợp lệ :(");
    }finally{
      file.value = "";
    }
  });
}

function toast(msg){
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.position = "fixed";
  t.style.left = "50%";
  t.style.bottom = "22px";
  t.style.transform = "translateX(-50%)";
  t.style.background = "rgba(16,26,46,.92)";
  t.style.border = "1px solid rgba(255,255,255,.14)";
  t.style.color = "#e7eefc";
  t.style.padding = "10px 12px";
  t.style.borderRadius = "14px";
  t.style.boxShadow = "0 10px 30px rgba(0,0,0,.35)";
  t.style.zIndex = "999";
  document.body.appendChild(t);
  setTimeout(()=>{ t.style.opacity="0"; t.style.transition="opacity .25s"; }, 1200);
  setTimeout(()=>{ t.remove(); }, 1600);
}

render();
