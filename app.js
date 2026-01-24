
// app.js
// ===============================
// Configurações
// ===============================
const WHATSAPP_NUMBER = "5511947098778"; // <-- TROQUE AQUI (55 + DDD + número)
const LEAD_WEBHOOK_URL = "";            // <-- opcional: endpoint para salvar leads

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

// Remove acentos e normaliza para busca (ex: "Sao" => "São")
function normalizeStr(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// ===============================
// WhatsApp + Lead
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

async function postLead(data) {
  if (!LEAD_WEBHOOK_URL) return;

  try {
    await fetch(LEAD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        utm_source: getQueryParam("utm_source"),
        utm_medium: getQueryParam("utm_medium"),
        utm_campaign: getQueryParam("utm_campaign"),
        page_url: location.href,
        created_at: new Date().toISOString(),
      }),
    });
  } catch (e) {
    // Não bloqueia o WhatsApp se falhar salvar
    console.warn("Falha ao enviar lead para webhook:", e);
  }
}

// ===============================
// Carrossel "Nossos Planos" (infinito, 4 cards visíveis)
// Requer HTML:
// - #plansTrack, #plansPrev, #plansNext
// - track contém .miniCard
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

  // Evita duplicar clones se init for chamado mais de uma vez
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

  // Bind 1x
  if (prevBtn.dataset.bound !== "1") {
    prevBtn.addEventListener("click", () => goTo(index - 1));
    prevBtn.dataset.bound = "1";
  }
  if (nextBtn.dataset.bound !== "1") {
    nextBtn.addEventListener("click", () => goTo(index + 1));
    nextBtn.dataset.bound = "1";
  }

  if (track.dataset.transitionBound !== "1") {
    track.addEventListener("transitionend", () => {
      isAnimating = false;

      if (index >= originalCount + VISIBLE) {
        index = VISIBLE;
        track.style.transition = "none";
        track.style.transform = `translateX(${-index * cardStep}px)`;
        track.offsetHeight;
        track.style.transition = "transform .45s ease";
      }

      if (index < VISIBLE) {
        index = originalCount + VISIBLE - 1;
        track.style.transition = "none";
        track.style.transform = `translateX(${-index * cardStep}px)`;
        track.offsetHeight;
        track.style.transition = "transform .45s ease";
      }
    });
    track.dataset.transitionBound = "1";
  }

  recalc();

  if (!window.__plansCarouselResizeBound) {
    window.addEventListener("resize", recalc);
    window.__plansCarouselResizeBound = true;
  }
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

  if (track.dataset.ready === "1") return;
  track.dataset.ready = "1";

  // dots
  dotsWrap.innerHTML = "";
  const dots = slides.map((_, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "heroDot";
    b.setAttribute("aria-label", `Ir para slide ${i + 1}`);
    b.addEventListener("click", () => {
      stopAuto();
      goTo(i);
      startAuto();
    });
    dotsWrap.appendChild(b);
    return b;
  });

  let index = 0;
  let w = 0;
  let timer = null;

  function setActiveDot() {
    dots.forEach((d, i) => d.classList.toggle("isActive", i === index));
  }

  function measure() {
    w = viewport.getBoundingClientRect().width;
    if (!w) w = viewport.clientWidth || 0;
  }

  function apply(noAnim = false) {
    if (!w) measure();
    if (noAnim) track.style.transition = "none";
    track.style.transform = `translateX(${-index * w}px)`;
    if (noAnim) {
      track.offsetHeight;
      track.style.transition = "transform .45s ease";
    }
    setActiveDot();
  }

  function goTo(i) {
    index = (i + count) % count;
    apply(false);
  }

  function nextSlide() { goTo(index + 1); }
  function prevSlide() { goTo(index - 1); }

  prev.addEventListener("click", () => {
    stopAuto();
    prevSlide();
    startAuto();
  });

  next.addEventListener("click", () => {
    stopAuto();
    nextSlide();
    startAuto();
  });

  function startAuto() {
    if (timer) return;
    timer = setInterval(nextSlide, 4500);
  }

  function stopAuto() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  const wrapper = track.closest(".heroCarousel");
  if (wrapper) {
    wrapper.addEventListener("mouseenter", stopAuto);
    wrapper.addEventListener("mouseleave", startAuto);
  }

  // Espera todas as imagens carregarem 1x (evita medir w=0 em alguns layouts)
  let loaded = 0;
  slides.forEach((img) => {
    if (img.complete) {
      loaded++;
    } else {
      img.addEventListener("load", () => {
        loaded++;
        if (loaded === count) {
          measure();
          apply(true);
        }
      }, { once: true });
      img.addEventListener("error", () => {
        loaded++;
      }, { once: true });
    }
  });

  // init
  measure();
  apply(true);
  startAuto();

  window.addEventListener("resize", () => {
    const oldW = w;
    measure();
    if (w && w !== oldW) apply(true);
  });
}


// ===============================
// IBGE: UFs e Municípios (autocomplete + busca sem acento + autocorreção)
// Requer HTML:
// - <select id="uf" name="uf" required>...</select>
// - <input id="cidade" name="cidade" list="municipiosList" required />
// - <datalist id="municipiosList"></datalist>
// ===============================
async function initIBGELocalidades() {
  const ufSel = document.getElementById("uf");
  const cityInput = document.getElementById("cidade");
  const dl = document.getElementById("municipiosList");

  if (!ufSel || !cityInput || !dl) return;

  const cacheNames = new Map(); // UF -> ["São Paulo", ...]
  const cacheNorm = new Map();  // UF -> [{name, norm}, ...]

  async function loadUFs() {
    const url = "https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome";
    const r = await fetch(url);
    if (!r.ok) throw new Error(`IBGE UFs HTTP ${r.status}`);
    return r.json();
  }

  async function loadMunicipios(ufSigla) {
    if (!ufSigla) return [];
    if (cacheNames.has(ufSigla)) return cacheNames.get(ufSigla);

    const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(
      ufSigla
    )}/municipios?orderBy=nome`;

    const r = await fetch(url);
    if (!r.ok) throw new Error(`IBGE municípios HTTP ${r.status}`);
    const municipios = await r.json();

    const names = municipios.map((m) => m.nome);
    cacheNames.set(ufSigla, names);
    cacheNorm.set(
      ufSigla,
      names.map((name) => ({ name, norm: normalizeStr(name) }))
    );

    return names;
  }

  function fillDatalist(ufSigla, query = "") {
    dl.innerHTML = "";

    const q = normalizeStr(query);
    const list = cacheNorm.get(ufSigla) || [];

    const matches = [];
    for (const item of list) {
      if (!q || item.norm.includes(q)) matches.push(item);
    }

    const MAX_OPTIONS = 200;
    matches.slice(0, MAX_OPTIONS).forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.name; // com acento
      dl.appendChild(opt);
    });

    return matches;
  }

  // estado inicial
  cityInput.disabled = true;
  cityInput.placeholder = "Selecione a UF primeiro…";

  // carrega UFs
  try {
    const ufs = await loadUFs();
    for (const uf of ufs) {
      const opt = document.createElement("option");
      opt.value = uf.sigla;
      opt.textContent = `${uf.nome} (${uf.sigla})`;
      ufSel.appendChild(opt);
    }
  } catch (e) {
    console.warn("Falha ao carregar UFs (IBGE):", e);
    cityInput.disabled = false;
    cityInput.placeholder = "Digite sua cidade (UF indisponível)…";
    return;
  }

  ufSel.addEventListener("change", async () => {
    const uf = ufSel.value;

    cityInput.value = "";
    dl.innerHTML = "";

    if (!uf) {
      cityInput.disabled = true;
      cityInput.placeholder = "Selecione a UF primeiro…";
      return;
    }

    cityInput.disabled = true;
    cityInput.placeholder = "Carregando municípios…";

    try {
      await loadMunicipios(uf);
      fillDatalist(uf, "");
      cityInput.disabled = false;
      cityInput.placeholder = "Digite para buscar…";
      cityInput.focus();
    } catch (e) {
      console.warn("Falha ao carregar municípios (IBGE):", e);
      cityInput.disabled = false;
      cityInput.placeholder = "Não foi possível carregar. Digite manualmente.";
    }
  });

  // filtra sem acento + autocorreção quando houver 1 match
  cityInput.addEventListener("input", () => {
    const uf = ufSel.value;
    if (!uf || !cacheNorm.has(uf)) return;

    const raw = cityInput.value;
    const matches = fillDatalist(uf, raw);

    if (matches.length === 1) {
      cityInput.value = matches[0].name; // com acento
    }
  });

  cityInput.addEventListener("blur", () => {
    const uf = ufSel.value;
    if (!uf || !cacheNorm.has(uf)) return;

    const matches = fillDatalist(uf, cityInput.value);
    if (matches.length === 1) cityInput.value = matches[0].name;
  });

  cityInput.addEventListener("change", () => {
    const uf = ufSel.value;
    if (!uf || !cacheNorm.has(uf)) return;

    const matches = fillDatalist(uf, cityInput.value);
    if (matches.length === 1) cityInput.value = matches[0].name;
  });
}

// ===============================
// Inicialização principal
// ===============================
function init() {
  // Ano no rodapé
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Range de crédito + label
  const credito = $("#credito");
  const creditoLabel = $("#creditoLabel");
  if (credito && creditoLabel) {
    const updateCreditoLabel = () => (creditoLabel.textContent = moneyBR(credito.value));
    credito.addEventListener("input", updateCreditoLabel);
    updateCreditoLabel();
  }

  // CTA WhatsApp (botão no hero)
  const ctaWhats = $("#ctaWhats");
  if (ctaWhats) {
    ctaWhats.addEventListener("click", () => {
      openWhatsApp("Olá! Quero fazer uma simulação de consórcio. Pode me ajudar?");
    });
  }

  // Links "Simular" nos planos preenchem o tipo
  document.querySelectorAll("[data-tipo]").forEach((a) => {
    a.addEventListener("click", () => {
      const tipo = a.getAttribute("data-tipo");
      const sel = document.querySelector('select[name="tipo"]');
      if (sel && tipo) sel.value = tipo;
    });
  });

  // Botão flutuante WhatsApp
  const waFloat = $("#waFloat");
  if (waFloat) {
    waFloat.addEventListener("click", (e) => {
      e.preventDefault();
      openWhatsApp("Olá! Quero falar com um especialista em consórcio.");
    });
  }

  // IBGE: UF + Município
  initIBGELocalidades();

  // Hero carousel (1 imagem por vez)
  initHeroCarousel();

  // Carrossel de planos (4 cards visíveis, infinito)
  initPlansCarousel();

  // Submit do formulário
  const form = $("#leadForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const fd = new FormData(e.currentTarget);
      const data = {
        nome: (fd.get("nome") || "").toString().trim(),
        whatsapp: (fd.get("whatsapp") || "").toString().trim(),
        email: (fd.get("email") || "").toString().trim(),
        tipo: (fd.get("tipo") || "").toString().trim(),
        credito: Number(fd.get("credito") || 0),
        parcela: (fd.get("parcela") || "").toString().trim(),
        horario: (fd.get("horario") || "").toString().trim(),
        lgpd: fd.get("lgpd") === "on",
        uf: (fd.get("uf") || "").toString().trim(),
        cidade: (fd.get("cidade") || "").toString().trim(),
      };

      // validações mínimas
      if (!data.nome || !data.whatsapp || !data.tipo || !data.credito || !data.lgpd) {
        alert("Por favor, preencha os campos obrigatórios e aceite a política.");
        return;
      }

      // se existirem campos UF/cidade, exigir
      const ufEl = document.getElementById("uf");
      const cityEl = document.getElementById("cidade");
      if (ufEl && cityEl) {
        if (!data.uf || !data.cidade) {
          alert("Por favor, selecione a UF e informe o município.");
          return;
        }
      }

      const wppDigits = onlyDigits(data.whatsapp);
      if (wppDigits.length < 10) {
        alert("Digite um número de WhatsApp válido.");
        return;
      }

      await postLead(data);
      openWhatsApp(buildMessage(data));
    });
  }
}

init();
