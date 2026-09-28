const API_BASE = "http://localhost:5000/api";

// Mesmo endpoint de autenticação usado pela plataforma Nota de Saída.
const AUTH_URL = "http://10.245.207.70:99/authenticator/login";
const AUTH_CHANNEL = "RAO";
const SESSION_KEY = "kbSession";

const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");

let currentSession = null;

// --- Sessão (chrome.storage.session: apaga-se ao fechar o browser) ---
// A palavra-passe nunca é guardada; só o utilizador (e o token, se a API devolver um).
// Se a permissão "storage" ainda não estiver ativa (extensão não recarregada depois de
// atualizar o manifest.json), usa memória: o login funciona, mas perde-se ao fechar o painel.
const sessionStore =
  typeof chrome !== "undefined" && chrome.storage && chrome.storage.session
    ? chrome.storage.session
    : null;
let memorySession = null;

if (!sessionStore) {
  console.warn(
    'chrome.storage indisponível: recarrega a extensão em chrome://extensions (botão ⟳) para ativar a permissão "storage".'
  );
}

async function getSession() {
  if (!sessionStore) return memorySession;
  const stored = await sessionStore.get(SESSION_KEY);
  return stored[SESSION_KEY] || null;
}

async function saveSession(session) {
  memorySession = session;
  if (sessionStore) await sessionStore.set({ [SESSION_KEY]: session });
}

async function clearSession() {
  memorySession = null;
  if (sessionStore) await sessionStore.remove(SESSION_KEY);
}

// --- Login ---
const loginUsername = document.getElementById("login-username");
const loginPassword = document.getElementById("login-password");
const loginSubmit = document.getElementById("login-submit");
const loginError = document.getElementById("login-error");

function extractToken(body) {
  if (!body || typeof body !== "object") return null;
  const data = body.data && typeof body.data === "object" ? body.data : {};
  const candidates = [
    body.token, body.accessToken, body.access_token, body.jwt,
    data.token, data.accessToken, data.access_token,
  ];
  return candidates.find((t) => typeof t === "string" && t) || null;
}

function extractErrorMessage(body) {
  if (!body || typeof body !== "object") return null;
  const msg = body.message || body.error || body.description || body.errorMessage;
  return typeof msg === "string" && msg ? msg : null;
}

async function authenticate(username, password) {
  let res;
  try {
    res = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        channel: AUTH_CHANNEL,
        traceId: crypto.randomUUID(),
      }),
    });
  } catch (e) {
    throw new Error(
      "Não foi possível contactar o servidor de autenticação. Verifica se estás ligado à rede/VPN do banco."
    );
  }

  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    // resposta sem JSON - tratamos só pelo código HTTP
  }

  const failedInBody = body && typeof body === "object" && body.success === false;
  if (!res.ok || failedInBody) {
    const fallback =
      res.status === 401 || res.status === 403
        ? "Credenciais inválidas."
        : `Falha no login (HTTP ${res.status}).`;
    throw new Error(extractErrorMessage(body) || fallback);
  }

  return { username, token: extractToken(body), loggedInAt: Date.now() };
}

async function handleLogin() {
  const username = loginUsername.value.trim();
  const password = loginPassword.value;

  loginError.textContent = "";
  if (!username || !password) {
    loginError.textContent = "Preenche o número e a palavra-passe.";
    return;
  }

  loginSubmit.disabled = true;
  loginSubmit.textContent = "A entrar...";
  try {
    const session = await authenticate(username, password);
    await saveSession(session);
    loginPassword.value = "";
    enterApp(session);
  } catch (e) {
    loginError.textContent = e.message;
  } finally {
    loginPassword.value = "";
    loginSubmit.disabled = false;
    loginSubmit.textContent = "Entrar";
  }
}

loginSubmit.addEventListener("click", handleLogin);
[loginUsername, loginPassword].forEach((input) =>
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleLogin();
  })
);

function enterApp(session) {
  currentSession = session;
  document.getElementById("menu-user").textContent = `👤 ${session.username}`;
  loginView.hidden = true;
  appView.hidden = false;
  activateTab("chat");
  checkStatus();
}

async function logout() {
  await clearSession();
  currentSession = null;
  chatWindow.replaceChildren();
  searchResults.replaceChildren();
  searchInput.value = "";
  chatInput.value = "";
  queueList.replaceChildren();
  closeMenu();
  appView.hidden = true;
  loginView.hidden = false;
  loginUsername.value = "";
  loginError.textContent = "";
  loginUsername.focus();
}

document.getElementById("logout-btn").addEventListener("click", logout);

// --- Menu (hamburger) ---
const menuToggle = document.getElementById("menu-toggle");
const tabsMenu = document.getElementById("tabs-menu");

function closeMenu() {
  tabsMenu.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
}

menuToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = tabsMenu.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

document.addEventListener("click", (e) => {
  if (!tabsMenu.contains(e.target) && e.target !== menuToggle) {
    closeMenu();
  }
});

// --- Navegação entre secções ---
function activateTab(name) {
  document.querySelectorAll(".tab-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === name)
  );
  document.querySelectorAll(".tab-content").forEach((c) =>
    c.classList.toggle("active", c.id === `tab-${name}`)
  );
  if (name === "queue") loadQueue();
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    activateTab(btn.dataset.tab);
    closeMenu();
  });
});

// --- Healthcheck do backend ---
async function checkStatus() {
  const dot = document.getElementById("status-dot");
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (res.ok) {
      dot.className = "online";
      dot.title = "Servidor conectado";
      return;
    }
    throw new Error("bad status");
  } catch (e) {
    dot.className = "offline";
    dot.title = "Servidor offline (corre o Flask em localhost:5000)";
  }
}

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

// --- Minha Fila ---
const queueList = document.getElementById("queue-list");
const queueBanner = document.getElementById("queue-banner");

const PRIORITY_CLASS = {
  "crítica": "critical",
  "alta": "high",
  "média": "medium",
  "baixa": "low",
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function renderTicket(t) {
  const priorityKey = PRIORITY_CLASS[String(t.priority || "").toLowerCase()] || "low";
  const card = el("div", `ticket priority-${priorityKey}`);

  const head = el("div", "ticket-head");
  head.appendChild(el("span", "ticket-id", t.ticket_id));
  head.appendChild(el("span", "ticket-status", t.status || "—"));
  card.appendChild(head);

  card.appendChild(el("div", "ticket-title", t.title));
  if (t.description) card.appendChild(el("div", "ticket-desc", t.description));

  const created = t.created_at ? String(t.created_at).slice(0, 16) : "";
  const meta = [`Prioridade: ${t.priority || "—"}`, t.source_system, created]
    .filter(Boolean)
    .join(" · ");
  card.appendChild(el("div", "ticket-meta", meta));
  return card;
}

async function loadQueue() {
  if (!currentSession) return;

  queueBanner.hidden = true;
  queueList.replaceChildren(el("div", "queue-note", "A carregar..."));

  try {
    const res = await fetch(
      `${API_BASE}/my-queue?user=${encodeURIComponent(currentSession.username)}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.is_demo) {
      queueBanner.textContent =
        "Dados de exemplo: a ligação ao Remedy ainda não está configurada.";
      queueBanner.hidden = false;
    }

    if (!data.tickets.length) {
      queueList.replaceChildren(el("div", "queue-note", "Não tens tickets atribuídos. 🎉"));
      return;
    }
    queueList.replaceChildren(...data.tickets.map(renderTicket));
  } catch (e) {
    queueList.replaceChildren(
      el("div", "queue-note", "Erro ao carregar a fila. Verifica se o Flask está a correr.")
    );
  }
}

document.getElementById("queue-refresh").addEventListener("click", loadQueue);

// --- Arranque: mostra login ou app conforme haja sessão ---
(async function init() {
  const session = await getSession();
  if (session) {
    enterApp(session);
  } else {
    loginView.hidden = false;
    loginUsername.focus();
  }
})();
