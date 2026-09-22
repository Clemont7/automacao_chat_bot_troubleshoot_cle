const API_BASE = "http://localhost:5000/api";

// --- Navegação entre abas ---
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

// --- Healthcheck do backend ---
async function checkStatus() {
  const dot = document.getElementById("status-dot");
  const text = document.getElementById("status-text");
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (res.ok) {
      dot.className = "online";
      text.textContent = "Servidor conectado";
      return;
    }
    throw new Error("bad status");
  } catch (e) {
    dot.className = "offline";
    text.textContent = "Servidor offline (corre o Flask em localhost:5000)";
  }
}
checkStatus();

// --- Chat ---
const chatWindow = document.getElementById("chat-window");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");

function appendMessage(text, sender) {
  const div = document.createElement("div");
  div.className = `msg ${sender}`;
  div.textContent = text;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function sendChatMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  appendMessage(message, "user");
  chatInput.value = "";

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    appendMessage(data.reply, "bot");
  } catch (e) {
    appendMessage("Erro ao contactar o servidor. Verifica se o Flask está a correr.", "bot");
  }
}

chatSend.addEventListener("click", sendChatMessage);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChatMessage();
});

// --- Pesquisa ---
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const searchResults = document.getElementById("search-results");

async function runSearch() {
  const q = searchInput.value.trim();
  searchResults.innerHTML = "";
  if (!q) return;

  try {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();

    if (data.length === 0) {
      searchResults.innerHTML = "<p>Nenhum resultado encontrado.</p>";
      return;
    }

    data.forEach((item) => {
      const div = document.createElement("div");
      div.className = "result-item";
      div.innerHTML = `
        <div class="title">${item.title}</div>
        <div><strong>Descrição:</strong> ${item.description}</div>
        <div><strong>Solução:</strong> ${item.solution}</div>
        <div><em>${item.source_system}</em></div>
      `;
      searchResults.appendChild(div);
    });
  } catch (e) {
    searchResults.innerHTML = "<p>Erro ao contactar o servidor.</p>";
  }
}

searchBtn.addEventListener("click", runSearch);
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runSearch();
});

// --- Novo incidente ---
const newSubmit = document.getElementById("new-submit");
const newFeedback = document.getElementById("new-feedback");

newSubmit.addEventListener("click", async () => {
  const payload = {
    title: document.getElementById("new-title").value.trim(),
    description: document.getElementById("new-description").value.trim(),
    solution: document.getElementById("new-solution").value.trim(),
    source_system: document.getElementById("new-source").value.trim() || "Manual",
    tags: document.getElementById("new-tags").value.trim(),
  };

  if (!payload.title || !payload.description || !payload.solution) {
    newFeedback.textContent = "Preenche pelo menos título, descrição e solução.";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/incidents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (res.ok) {
      newFeedback.textContent = "Incidente guardado com sucesso!";
      document.getElementById("new-title").value = "";
      document.getElementById("new-description").value = "";
      document.getElementById("new-solution").value = "";
      document.getElementById("new-source").value = "";
      document.getElementById("new-tags").value = "";
    } else {
      newFeedback.textContent = data.error || "Erro ao guardar incidente.";
    }
  } catch (e) {
    newFeedback.textContent = "Erro ao contactar o servidor.";
  }
});
