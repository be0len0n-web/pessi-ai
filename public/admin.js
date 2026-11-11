const $ = s => document.querySelector(s);
let selectedId = null;
let requests = [];
const loginPanel = $("#loginPanel"), dashboard = $("#dashboard"), editor = $("#editor");
async function api(url, options={}) {
  const r = await fetch(url, {headers:{"Content-Type":"application/json"}, ...options});
  const d = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(d.error || "Request failed.");
  return d;
}
async function boot() {
  const d = await api("/api/admin/me");
  if (d.authenticated) showDashboard();
}
function showDashboard() {
  loginPanel.classList.add("hidden"); dashboard.classList.remove("hidden"); loadRequests();
}
$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault(); $("#loginError").textContent = "";
  try { await api("/api/admin/login",{method:"POST",body:JSON.stringify({password:$("#password").value})}); showDashboard(); }
  catch(err) { $("#loginError").textContent = err.message; }
});
$("#logout").addEventListener("click", async () => { await api("/api/admin/logout",{method:"POST"}); location.reload(); });
async function loadRequests() {
  try {
    requests = await api("/api/admin/requests");
    const list = $("#requestList"); list.innerHTML = "";
    if (!requests.length) { list.innerHTML = '<div class="empty">No requests yet. New prompts will appear here.</div>'; return; }
    requests.forEach(item => {
      const card = document.createElement("div"); card.className = "request-card";
      const info = document.createElement("div");
      const meta = document.createElement("div"); meta.className = "request-meta"; meta.textContent = `${item.kind.toUpperCase()} · ${new Date(item.createdAt).toLocaleString()} · ${item.status}`;
      const p = document.createElement("p"); p.textContent = item.prompt;
      info.append(meta,p);
      const btn = document.createElement("button"); btn.className = "send"; btn.textContent = item.status === "answered" ? "Edit reply" : "Answer";
      btn.addEventListener("click",()=>openEditor(item));
      card.append(info,btn); list.append(card);
    });
  } catch(e) { $("#requestList").textContent = e.message; }
}
function openEditor(item) {
  selectedId = item.id; $("#selectedPrompt").textContent = item.prompt;
  $("#response").value = item.response || ""; $("#saveStatus").textContent = "";
  clearCanvas(); editor.classList.remove("hidden"); editor.scrollIntoView({behavior:"smooth"});
}
$("#closeEditor").addEventListener("click",()=>editor.classList.add("hidden"));
const canvas = $("#drawing"), ctx = canvas.getContext("2d");
let drawing = false, hasInk = false;
function clearCanvas() { ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);hasInk=false; }
clearCanvas();
function point(e) { const r=canvas.getBoundingClientRect(); return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}; }
canvas.addEventListener("pointerdown",e=>{drawing=true;canvas.setPointerCapture(e.pointerId);const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);});
canvas.addEventListener("pointermove",e=>{if(!drawing)return;const p=point(e);ctx.strokeStyle=$("#penColor").value;ctx.lineWidth=Number($("#penSize").value)*canvas.width/canvas.clientWidth;ctx.lineCap="round";ctx.lineJoin="round";ctx.lineTo(p.x,p.y);ctx.stroke();hasInk=true;});
canvas.addEventListener("pointerup",()=>drawing=false);
canvas.addEventListener("pointercancel",()=>drawing=false);
$("#clearCanvas").addEventListener("click",clearCanvas);
$("#saveReply").addEventListener("click",async()=>{
  if(!selectedId)return;
  const response=$("#response").value.trim();
  const image=hasInk?canvas.toDataURL("image/png"):"";
  $("#saveReply").disabled=true;$("#saveStatus").textContent="Publishing...";
  try {
    await api(`/api/admin/requests/${selectedId}/reply`,{method:"POST",body:JSON.stringify({response,image})});
    $("#saveStatus").textContent="Published successfully.";await loadRequests();
  } catch(e) { $("#saveStatus").textContent=e.message; }
  finally { $("#saveReply").disabled=false; }
});
boot().catch(()=>{});
