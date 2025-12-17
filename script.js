
/* Kế hoạch VN – tick checklist (localStorage) */
const KEY = "vn-trip-planner-v1";

function slugify(s){
  return (s||"").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
}

function loadState(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return {done:{}, notes:""};
    const st = JSON.parse(raw);
    return {done: st.done||{}, notes: st.notes||""};
  }catch(e){
    return {done:{}, notes:""};
  }
}

function saveState(state){
  localStorage.setItem(KEY, JSON.stringify(state));
}

const state = loadState();

function itemId(text){
  return "i_" + slugify(text);
}

function tagFor(cat){
  const map = {
    food:"Ăn uống",
    play:"Vui chơi",
    self:"Làm đẹp",
    shop:"Mua sắm",
    photo:"Chụp hình",
    event:"Sự kiện",
    life:"Việc cần làm"
  };
  return map[cat] || "Khác";
}

function mapsLink(placeText){
  const q = encodeURIComponent(placeText);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function render(){
  document.getElementById("tripTitle").textContent = window.TRIP_DATA.tripTitle || "Kế hoạch Việt Nam";

  // Notes
  const notesEl = document.getElementById("notes");
  notesEl.value = state.notes || "";
  notesEl.addEventListener("input", () => {
    state.notes = notesEl.value;
    saveState(state);
  });
  document.getElementById("btnClearNotes").addEventListener("click", () => {
    state.notes = "";
    notesEl.value = "";
    saveState(state);
  });

  renderDays();
  renderLists("Ăn uống");
  wireTabs();
  wireTools();
  updateProgress();
}

function renderDays(){
  const host = document.getElementById("days");
  host.innerHTML = "";

  const q = (document.getElementById("q").value || "").trim().toLowerCase();
  const cat = document.getElementById("filterCat").value;

  window.TRIP_DATA.days.forEach((d, idx) => {
    // Build a searchable string
    const allTexts = [];
    d.blocks.forEach(b => b.items.forEach(it => allTexts.push(it.text, it.place||"")));
    const hay = (d.title+" "+allTexts.join(" ")).toLowerCase();

    const catMatch = (cat==="all") ? true : d.blocks.some(b => b.items.some(it => it.cat===cat));
    const qMatch = q ? hay.includes(q) : true;

    if(!catMatch || !qMatch) return;

    const el = document.createElement("div");
    el.className = "day";
    const dateObj = new Date(d.date + "T00:00:00");
    const dd = String(dateObj.getDate()).padStart(2,"0");
    const mm = String(dateObj.getMonth()+1).padStart(2,"0");

    el.innerHTML = `
      <div class="day__head">
        <div>
          <div class="badge">${d.dow} • ${dd}/${mm}</div>
          <h3>${d.title || ("Ngày " + (idx+1))}</h3>
          <div class="meta">${(d.areas||[]).map(a => `📍 ${escapeHtml(a)}`).join(" • ")}</div>
        </div>
      </div>
    `;

    d.blocks.forEach((b) => {
      const block = document.createElement("div");
      block.className = "block";
      block.innerHTML = `
        <div class="block__title">
          <strong>${escapeHtml(b.label)}</strong>
          <span>${escapeHtml(b.time)}</span>
        </div>
      `;

      const itemsWrap = document.createElement("div");
      itemsWrap.className = "items";

      b.items.forEach((it) => {
        if(cat!=="all" && it.cat!==cat) return;
        if(q){
          const hay2 = (it.text+" "+(it.place||"")).toLowerCase();
          if(!hay2.includes(q)) return;
        }

        const id = itemId(it.text);
        const done = !!state.done[id];

        const row = document.createElement("label");
        row.className = "item" + (done ? " done" : "");
        const place = (it.place||"").trim();
        const placeHTML = place
          ? `<a class="link" href="${mapsLink(place)}" target="_blank" rel="noopener">📌 ${escapeHtml(place)}</a>`
          : "";

        row.innerHTML = `
          <input type="checkbox" ${done ? "checked" : ""} data-id="${id}">
          <div class="item__body">
            <div class="item__text">
              <span>${escapeHtml(it.text)}</span>
              <span class="tag tag--${it.cat}">${tagFor(it.cat)}</span>
            </div>
            <div class="muted" style="margin-top:6px">${placeHTML}</div>
          </div>
        `;

        row.querySelector("input").addEventListener("change", (e) => {
          state.done[id] = e.target.checked;
          saveState(state);
          renderDays();      // re-render to apply strike-through
          updateProgress();  // update sidebar progress
          syncListCheckboxes();
        });

        itemsWrap.appendChild(row);
      });

      block.appendChild(itemsWrap);
      el.appendChild(block);
    });

    host.appendChild(el);
  });
}

function renderLists(activeTab){
  const host = document.getElementById("lists");
  host.innerHTML = "";

  const qList = (document.getElementById("qList").value || "").trim().toLowerCase();

  Object.entries(window.TRIP_DATA.lists).forEach(([groupName, arr]) => {
    const g = document.createElement("div");
    g.className = "group" + (groupName===activeTab ? " group--active" : "");
    g.dataset.group = groupName;

    const title = document.createElement("div");
    title.className = "group__title";
    title.textContent = groupName;

    const itemsWrap = document.createElement("div");
    itemsWrap.className = "group__items";

    (arr||[]).forEach(text => {
      if(qList && !text.toLowerCase().includes(qList)) return;

      const id = itemId(text);
      const done = !!state.done[id];

      const row = document.createElement("label");
      row.className = "item" + (done ? " done" : "");
      row.innerHTML = `
        <input type="checkbox" ${done ? "checked" : ""} data-id="${id}">
        <div class="item__body">
          <div class="item__text"><span>${escapeHtml(text)}</span></div>
        </div>
      `;
      row.querySelector("input").addEventListener("change", (e) => {
        state.done[id] = e.target.checked;
        saveState(state);
        updateProgress();
        renderDays();
        renderLists(getActiveTab());
      });

      itemsWrap.appendChild(row);
    });

    g.appendChild(title);
    g.appendChild(itemsWrap);
    host.appendChild(g);
  });

  updateProgress();
}

function getActiveTab(){
  const t = document.querySelector(".tab--active");
  return t ? t.dataset.tab : "Ăn uống";
}

function wireTabs(){
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(b => b.classList.remove("tab--active"));
      btn.classList.add("tab--active");
      renderLists(btn.dataset.tab);
    });
  });
}

function wireTools(){
  document.getElementById("q").addEventListener("input", () => renderDays());
  document.getElementById("filterCat").addEventListener("change", () => renderDays());
  document.getElementById("qList").addEventListener("input", () => renderLists(getActiveTab()));

  document.getElementById("btnReset").addEventListener("click", () => {
    if(!confirm("Reset toàn bộ tick? (ghi chú vẫn giữ)")) return;
    state.done = {};
    saveState(state);
    renderDays();
    renderLists(getActiveTab());
    updateProgress();
  });

  // Export
  document.getElementById("btnExport").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tien-do-vn-trip.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // Import
  const file = document.getElementById("importFile");
  file.addEventListener("change", async () => {
    const f = file.files?.[0];
    if(!f) return;
    try{
      const txt = await f.text();
      const imported = JSON.parse(txt);
      state.done = imported.done || {};
      state.notes = imported.notes || "";
      saveState(state);
      document.getElementById("notes").value = state.notes;
      renderDays();
      renderLists(getActiveTab());
      updateProgress();
      alert("Nhập tiến độ xong!");
    }catch(e){
      alert("File không hợp lệ :(");
    }finally{
      file.value = "";
    }
  });
}

function syncListCheckboxes(){
  document.querySelectorAll('#lists input[type="checkbox"]').forEach(cb => {
    const id = cb.getAttribute("data-id");
    cb.checked = !!state.done[id];
    cb.closest(".item")?.classList.toggle("done", cb.checked);
  });
}

function updateProgress(){
  // Only count items from the global lists
  let total = 0, done = 0;
  Object.values(window.TRIP_DATA.lists).forEach(arr => {
    (arr||[]).forEach(text => {
      total += 1;
      if(state.done[itemId(text)]) done += 1;
    });
  });

  const pct = total ? Math.round((done/total)*100) : 0;
  document.getElementById("progressBar").style.width = pct + "%";
  document.getElementById("progressText").textContent = `Đã tick: ${done}/${total} (${pct}%)`;
}

function escapeHtml(s){
  return String(s||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

render();
