// app.js
// ===============================
// Configurações
// ===============================
const WHATSAPP_NUMBER = "5511947098778"; 
const WEB3FORMS_KEY = "f5f6054b-3b6d-47ef-bf1f-3921351ff0bb"; // <-- PEGUE SUA CHAVE EM web3forms.com

// ===============================
// Helpers
// ===============================
const $ = (sel) => document.querySelector(sel);

function onlyDigits(s) {
  return (s || "").toString().replace(/\D/g, "");
}

function moneyBR(n) {
  const v = Number(n || 0);
  return v.toLocaleString("pt-BR");
}

function getQueryParam(key) {
  try {
    return new URLSearchParams(location.search).get(key) || "";
  } catch {
    return "";
  }
}

function normalizeStr(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// ===============================
// WhatsApp + Lead (E-mail)
// ===============================
function buildMessage(data) {
  const lines = [
    "Olá! Quero simular um consórcio 👇",
    "",
    `• Nome: ${data.nome}`,
    `• WhatsApp: ${data.whatsapp}`,
    data.email ? `• E-mail: ${data.email}` : null,
    `• Tipo: ${data.tipo}`,
    `• Crédito: R$ ${moneyBR(data.credito)}`,
    data.parcela ? `• Parcela ideal: R$ ${data.parcela}` : null,
    data.uf ? `• UF: ${data.uf}` : null,
    data.cidade ? `• Município: ${data.cidade}` : null,
    data.horario ? `• Melhor horário: ${data.horario}` : null,
  ].filter(Boolean);

  return lines.join("\n");
}

function openWhatsApp(message) {
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// Nova função postLead integrada com E-mail
async function postLead(data) {
  const emailPayload = {
    access_key: WEB3FORMS_KEY,
    subject: `NOVO LEAD: ${data.nome} (${data.tipo})`,
    from_name: "Simulador Adriana Consórcio",
    ...data,
    credito_formatado: `R$ ${moneyBR(data.credito)}`,
    utm_source: getQueryParam("utm_source"),
    page_url: location.href,
    enviado_em: new Date().toLocaleString("pt-BR")
  };

  try {
    await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(emailPayload),
    });
  } catch (e) {
    console.warn("Falha ao enviar e-mail, seguindo para WhatsApp:", e);
  }
}

// ===============================
// Carrosséis (Planos e Hero)
// ===============================
function initPlansCarousel() {
  const track = document.getElementById("plansTrack");
  const prevBtn = document.getElementById("plansPrev");
  const nextBtn = document.getElementById("plansNext");

  if (!track || !prevBtn || !nextBtn) return;

  const VISIBLE = 4;
  const originals = Array.from(track.children);
  const originalCount = originals.length;

  if (originalCount <= VISIBLE) return;

  if (track.dataset.infiniteReady !== "1") {
    const headClones = originals.slice(0, VISIBLE).map((n) => n.cloneNode(true));
    const tailClones = originals.slice(-VISIBLE).map((n) => n.cloneNode(true));
    tailClones.forEach((n) => track.insertBefore(n, track.firstChild));
    headClones.forEach((n) => track.appendChild(n));
    track.dataset.infiniteReady = "1";
  }

  let index = VISIBLE;
  let cardStep = 0;
  let isAnimating = false;

  const getGap = () => {
    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap || "0");
    return isNaN(gap) ? 0 : gap;
  };

  const recalc = () => {
    const anyCard = track.querySelector(".miniCard");
    if (!anyCard) return;
    const gap = getGap();
    const w = anyCard.getBoundingClientRect().width;
    cardStep = w + gap;
    track.style.transition = "none";
    track.style.transform = `translateX(${-index * cardStep}px)`;
    track.offsetHeight;
    track.style.transition = "transform .45s ease";
  };

  const goTo = (newIndex) => {
    if (isAnimating) return;
    if (!cardStep) recalc();
    isAnimating = true;
    index = newIndex;
    track.style.transform = `translateX(${-index * cardStep}px)`;
  };

  if (prevBtn.dataset.bound !== "1") {
    prevBtn.addEventListener("click", () => goTo(index - 1));
    prevBtn.dataset.bound = "1";
  }
  if (nextBtn.dataset.bound !== "1") {
    nextBtn.addEventListener("click", () => goTo(index + 1));
    nextBtn.dataset.bound = "1";
  }

  track.addEventListener("transitionend", () => {
    isAnimating = false;
    if (index >= originalCount + VISIBLE) {
      index = VISIBLE;
      track.style.transition = "none";
      track.style.transform = `translateX(${-index * cardStep}px)`;
    }
    if (index < VISIBLE) {
      index = originalCount + VISIBLE - 1;
      track.style.transition = "none";
      track.style.transform = `translateX(${-index * cardStep}px)`;
    }
  });

  recalc();
  window.addEventListener("resize", recalc);
}

function initHeroCarousel() {
  const track = document.getElementById("heroTrack");
  const prev = document.getElementById("heroPrev");
  const next = document.getElementById("heroNext");
  const dotsWrap = document.getElementById("heroDots");

  if (!track || !prev || !next || !dotsWrap) return;
  const viewport = track.closest(".heroViewport");
  const slides = Array.from(track.querySelectorAll(".heroSlide"));
  const count = slides.length;
  if (!viewport || count <= 1) return;

  dotsWrap.innerHTML = "";
  const dots = slides.map((_, i) => {
    const b = document.createElement("button");
    b.className = "heroDot";
    b.addEventListener("click", () => goTo(i));
    dotsWrap.appendChild(b);
    return b;
  });

  let index = 0;
  let timer = null;

  function apply() {
    const w = viewport.getBoundingClientRect().width;
    track.style.transform = `translateX(${-index * w}px)`;
    dots.forEach((d, i) => d.classList.toggle("isActive", i === index));
  }

  function goTo(i) { index = (i + count) % count; apply(); }
  function startAuto() { timer = setInterval(() => goTo(index + 1), 4500); }
  function stopAuto() { clearInterval(timer); timer = null; }

  prev.addEventListener("click", () => { stopAuto(); goTo(index - 1); startAuto(); });
  next.addEventListener("click", () => { stopAuto(); goTo(index + 1); startAuto(); });

  apply();
  startAuto();
}

// ===============================
// IBGE: UFs e Municípios
// ===============================
async function initIBGELocalidades() {
  const ufSel = document.getElementById("uf");
  const cityInput = document.getElementById("cidade");
  const dl = document.getElementById("municipiosList");
  if (!ufSel || !cityInput || !dl) return;

  const cacheNorm = new Map();

  async function loadUFs() {
    const r = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome");
    return r.json();
  }

  async function loadMunicipios(ufSigla) {
    const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufSigla}/municipios?orderBy=nome`);
    const data = await r.json();
    cacheNorm.set(ufSigla, data.map(m => ({ name: m.nome, norm: normalizeStr(m.nome) })));
  }

  try {
    const ufs = await loadUFs();
    ufs.forEach(uf => {
      const opt = document.createElement("option");
      opt.value = uf.sigla;
      opt.textContent = `${uf.nome} (${uf.sigla})`;
      ufSel.appendChild(opt);
    });
  } catch (e) { console.warn("Erro IBGE"); }

  ufSel.addEventListener("change", async () => {
    cityInput.value = "";
    if (!ufSel.value) return;
    cityInput.placeholder = "Carregando...";
    await loadMunicipios(ufSel.value);
    cityInput.disabled = false;
    cityInput.placeholder = "Digite sua cidade...";
    
    dl.innerHTML = "";
    cacheNorm.get(ufSel.value).forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.name;
      dl.appendChild(opt);
    });
  });
}

// ===============================
// Inicialização principal
// ===============================
function init() {
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const credito = $("#credito");
  const creditoLabel = $("#creditoLabel");
  if (credito && creditoLabel) {
    credito.addEventListener("input", () => creditoLabel.textContent = moneyBR(credito.value));
    creditoLabel.textContent = moneyBR(credito.value);
  }

  // Links de planos
  document.querySelectorAll("[data-tipo]").forEach(a => {
    a.addEventListener("click", () => {
      const sel = document.querySelector('select[name="tipo"]');
      if (sel) sel.value = a.getAttribute("data-tipo");
    });
  });

  // Botões WhatsApp genéricos
  [$("#ctaWhats"), $("#waFloat")].forEach(btn => {
    if (btn) btn.addEventListener("click", (e) => {
      e.preventDefault();
      openWhatsApp("Olá! Quero falar com um especialista em consórcio.");
    });
  });

  initIBGELocalidades();
  initHeroCarousel();
  initPlansCarousel();

  // Submit do formulário com envio duplo (E-mail + WhatsApp)
  const form = $("#leadForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;

      const fd = new FormData(form);
      const data = {
        nome: fd.get("nome"),
        whatsapp: fd.get("whatsapp"),
        email: fd.get("email"),
        tipo: fd.get("tipo"),
        credito: Number(fd.get("credito")),
        parcela: fd.get("parcela"),
        horario: fd.get("horario"),
        lgpd: fd.get("lgpd") === "on",
        uf: fd.get("uf"),
        cidade: fd.get("cidade"),
      };

      if (!data.lgpd || !data.nome || !data.whatsapp) {
        alert("Preencha os campos obrigatórios.");
        return;
      }

      // Inicia processo de envio
      btn.disabled = true;
      btn.textContent = "Enviando simulação...";

      await postLead(data); // Envia e-mail
      
      btn.disabled = false;
      btn.textContent = originalText;
      
      openWhatsApp(buildMessage(data)); // Abre WhatsApp
    });
  }
}

init();
