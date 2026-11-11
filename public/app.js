let kind = "chat";
const tabs = document.querySelectorAll(".tab");
const promptBox = document.querySelector("#prompt");
const result = document.querySelector("#result");
tabs.forEach(tab => tab.addEventListener("click", () => {
  tabs.forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  kind = tab.dataset.kind;
  promptBox.placeholder = kind === "drawing" ? "Describe the picture you’d like Pessiai to create..." : "Type your question or idea here...";
  document.querySelector("#hint").textContent = kind === "drawing" ? "Describe the scene, style, colors, and details. ✎" : "Be curious. Be specific. ✨";
}));
document.querySelector("#requestForm").addEventListener("submit", async e => {
  e.preventDefault();
  const button = e.submitter;
  button.disabled = true;
  try {
    const response = await fetch("/api/requests", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:promptBox.value,kind})});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Something went wrong.");
    result.classList.remove("hidden");
    result.innerHTML = `<strong>Sent successfully ✨</strong><p>Your request is now in the Pessiai inbox.</p><p>Request code: <span class="request-code">${data.id}</span></p><p class="muted">Save this code, then check your reply below.</p><div class="check-row"><input id="checkCode" placeholder="Paste your request code"><button class="outline" id="checkReply">Check reply</button></div><div id="replyOutput"></div>`;
    document.querySelector("#checkReply").addEventListener("click", checkReply);
    promptBox.value = "";
    result.scrollIntoView({behavior:"smooth",block:"center"});
  } catch(err) { result.classList.remove("hidden"); result.textContent = err.message; }
  finally { button.disabled = false; }
});
async function checkReply() {
  const code = document.querySelector("#checkCode").value.trim();
  const out = document.querySelector("#replyOutput");
  if (!code) { out.textContent = "Enter your request code."; return; }
  out.textContent = "Checking...";
  try {
    const r = await fetch("/api/requests/" + encodeURIComponent(code));
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    if (d.status !== "answered") { out.textContent = "Pessiai is still preparing a response. Check again later."; return; }
    out.innerHTML = "";
    if (d.response) { const p = document.createElement("p"); p.textContent = d.response; out.appendChild(p); }
    if (d.image) { const img = document.createElement("img"); img.src = d.image; img.alt = "Pessiai drawing"; out.appendChild(img); }
  } catch(e) { out.textContent = e.message || "Could not check that code."; }
}