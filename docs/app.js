(() => {
  "use strict";

  const SLIDES = window.DECK.slides;
  const TOTAL = SLIDES.length;
  const FONT_SIZES = [18, 20, 22, 24, 27, 30, 34];
  const NAV_LOCK_MS = 350;   // ignore a second nav tap this soon after the first
  const TAP_MAX_MOVE = 10;   // px a finger may drift and still count as a tap
  const TAP_MAX_MS = 800;    // presses longer than this are not taps

  const $ = (id) => document.getElementById(id);
  const big = (n) => `thumbs/${String(n).padStart(3, "0")}.jpg`;
  const small = (n) => `thumbs/sm/${String(n).padStart(3, "0")}.jpg`;

  // ---- storage (never let it break the app) ----
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem("hn." + key); return v === null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem("hn." + key, JSON.stringify(value)); } catch { /* private mode */ }
    },
  };

  const state = {
    index: 0,
    font: store.get("font", 3),
    theme: store.get("theme", "dark"),
    preview: store.get("preview", "large"),
    wake: store.get("wake", "on"),
  };
  // Restore by slide id first (survives a rebuild), then by number.
  const savedId = store.get("slideId", null);
  const byId = SLIDES.findIndex((s) => s.id === savedId);
  state.index = byId >= 0 ? byId : Math.min(Math.max(store.get("slide", 1) - 1, 0), TOTAL - 1);

  // ---- tap detection: a tap is a short press that did not move ----
  function onTap(el, fn) {
    let start = null;
    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      start = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    });
    el.addEventListener("pointermove", (e) => {
      if (!start || e.pointerId !== start.id) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_MAX_MOVE) start = null;
    });
    el.addEventListener("pointercancel", () => { start = null; });
    el.addEventListener("pointerleave", () => { start = null; });
    el.addEventListener("pointerup", (e) => {
      const s = start;
      start = null;
      if (!s || e.pointerId !== s.id) return;
      if (performance.now() - s.t > TAP_MAX_MS) return;
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > TAP_MAX_MOVE) return;
      fn(e);
    });
    // Keyboard / assistive activation still works.
    el.addEventListener("click", (e) => { if (e.detail === 0) fn(e); });
  }

  // ---- rendering ----
  const els = {
    cur: $("cur"), total: $("total"), section: $("section"), counter: $("counter"),
    thumb: $("thumb"), preview: $("preview"), nextThumb: $("nextThumb"), nextLabel: $("nextLabel"),
    notes: $("notes"), scroll: $("notesScroll"), after: $("after"), afterLabel: $("afterLabel"),
    afterThumb: $("afterThumb"), prev: $("prev"), next: $("next"),
  };
  els.total.textContent = TOTAL;

  function render() {
    const s = SLIDES[state.index];
    const nxt = SLIDES[state.index + 1];
    els.cur.textContent = s.n;
    els.section.textContent = s.section;
    els.thumb.src = big(s.n);
    els.thumb.alt = `Slide ${s.n}`;
    if (s.notes) {
      els.notes.textContent = s.notes;
      els.notes.classList.remove("empty");
    } else {
      els.notes.textContent = "No notes for this slide.";
      els.notes.classList.add("empty");
    }
    if (nxt) {
      els.afterLabel.textContent = `Next: slide ${nxt.n}`;
      els.afterThumb.src = small(nxt.n);
      els.afterThumb.hidden = false;
      els.nextLabel.textContent = `Next · ${nxt.n}`;
      els.nextThumb.src = small(nxt.n);
      els.nextThumb.style.visibility = "";
    } else {
      els.afterLabel.textContent = "Last slide.";
      els.afterThumb.hidden = true;
      els.nextLabel.textContent = "Last slide";
      els.nextThumb.style.visibility = "hidden";
    }
    els.prev.disabled = state.index === 0;
    els.next.disabled = state.index === TOTAL - 1;
    els.scroll.scrollTop = 0;
    document.title = `${s.n}/${TOTAL} · hopecore notes`;
    store.set("slideId", s.id);
    store.set("slide", s.n);
    // Warm the neighbours so the next tap is instant.
    [state.index + 1, state.index - 1].forEach((i) => {
      if (SLIDES[i]) new Image().src = big(SLIDES[i].n);
    });
  }

  let lastNav = 0;
  function go(index, { guard = false } = {}) {
    if (guard) {
      const now = performance.now();
      if (now - lastNav < NAV_LOCK_MS) return;
      lastNav = now;
    }
    const target = Math.min(Math.max(index, 0), TOTAL - 1);
    if (target === state.index) return;
    state.index = target;
    render();
    els.counter.classList.add("flash");
    setTimeout(() => els.counter.classList.remove("flash"), 300);
  }

  onTap(els.prev, () => go(state.index - 1, { guard: true }));
  onTap(els.next, () => go(state.index + 1, { guard: true }));

  // ---- sheets ----
  let openSheet = null;
  function show(sheet) {
    if (openSheet) hide();
    openSheet = sheet;
    sheet.hidden = false;
  }
  function hide() {
    if (!openSheet) return;
    openSheet.hidden = true;
    if (openSheet === $("jump")) $("jumpInput").blur();
    openSheet = null;
  }
  document.querySelectorAll("[data-close]").forEach((b) => onTap(b, hide));
  // Tapping the dimmed backdrop closes a bottom sheet.
  document.querySelectorAll(".sheet").forEach((sheet) => {
    onTap(sheet, (e) => { if (e.target === sheet) hide(); });
  });

  // ---- overview grid ----
  const gridBody = $("gridBody");
  (function buildGrid() {
    let row = null, section = null;
    for (const s of SLIDES) {
      if (s.section !== section) {
        section = s.section;
        const h = document.createElement("div");
        h.className = "grid-section";
        h.textContent = section;
        gridBody.appendChild(h);
        row = document.createElement("div");
        row.className = "grid-row";
        gridBody.appendChild(row);
      }
      const tile = document.createElement("button");
      tile.className = "tile";
      tile.dataset.index = s.n - 1;
      tile.setAttribute("aria-label", `Slide ${s.n}`);
      const img = document.createElement("img");
      img.decoding = "async";
      img.src = small(s.n);
      img.alt = "";
      const label = document.createElement("span");
      label.className = "label";
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = s.n;
      label.appendChild(badge);
      if (!s.notes) {
        const nn = document.createElement("span");
        nn.className = "nonote";
        nn.textContent = "no notes";
        label.appendChild(nn);
      }
      tile.append(img, label);
      onTap(tile, () => { go(s.n - 1); hide(); });
      row.appendChild(tile);
    }
  })();

  onTap($("openGrid"), () => {
    gridBody.querySelectorAll(".tile.current").forEach((t) => t.classList.remove("current"));
    const cur = gridBody.querySelector(`.tile[data-index="${state.index}"]`);
    cur.classList.add("current");
    show($("grid"));
    cur.scrollIntoView({ block: "center" });
  });

  // ---- jump to number ----
  const jumpInput = $("jumpInput");
  const jumpHint = $("jumpHint");
  const jumpThumb = $("jumpThumb");
  function jumpTarget() {
    const n = parseInt(jumpInput.value, 10);
    return Number.isInteger(n) && n >= 1 && n <= TOTAL ? n : null;
  }
  function updateJump() {
    jumpInput.value = jumpInput.value.replace(/\D/g, "");
    const n = jumpTarget();
    if (n) {
      jumpHint.textContent = SLIDES[n - 1].section;
      jumpThumb.src = small(n);
    } else {
      jumpHint.textContent = jumpInput.value ? `Enter 1–${TOTAL}` : `Now on ${state.index + 1}. Enter 1–${TOTAL}`;
      jumpThumb.removeAttribute("src");
    }
    $("jumpGo").disabled = !n;
  }
  jumpInput.addEventListener("input", updateJump);
  document.querySelectorAll("[data-step]").forEach((b) => {
    onTap(b, () => {
      const base = jumpTarget() || state.index + 1;
      jumpInput.value = Math.min(Math.max(base + Number(b.dataset.step), 1), TOTAL);
      updateJump();
    });
  });
  $("jumpForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const n = jumpTarget();
    if (!n) return;
    go(n - 1);
    hide();
  });
  onTap(els.counter, () => {
    jumpInput.value = "";
    updateJump();
    show($("jump"));
    jumpInput.focus();
  });

  // ---- settings ----
  function applySettings() {
    document.documentElement.style.setProperty("--notes-size", FONT_SIZES[state.font] + "px");
    $("fontVal").textContent = FONT_SIZES[state.font];
    $("fontDown").disabled = state.font === 0;
    $("fontUp").disabled = state.font === FONT_SIZES.length - 1;
    document.documentElement.dataset.theme = state.theme;
    const dark = state.theme === "dark" ||
      (state.theme === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.querySelector('meta[name="theme-color"]').content = dark ? "#000000" : "#fffdf9";
    els.preview.classList.toggle("small", state.preview === "small");
    for (const [attr, val] of [["theme-opt", state.theme], ["preview-opt", state.preview], ["wake-opt", state.wake]]) {
      document.querySelectorAll(`[data-${attr}]`).forEach((b) => b.classList.toggle("on", b.dataset[camel(attr)] === val));
    }
  }
  const camel = (s) => s.replace(/-(\w)/g, (_, c) => c.toUpperCase());

  onTap($("fontDown"), () => { state.font = Math.max(0, state.font - 1); store.set("font", state.font); applySettings(); });
  onTap($("fontUp"), () => { state.font = Math.min(FONT_SIZES.length - 1, state.font + 1); store.set("font", state.font); applySettings(); });
  document.querySelectorAll("[data-theme-opt]").forEach((b) => onTap(b, () => {
    state.theme = b.dataset.themeOpt; store.set("theme", state.theme); applySettings();
  }));
  document.querySelectorAll("[data-preview-opt]").forEach((b) => onTap(b, () => {
    state.preview = b.dataset.previewOpt; store.set("preview", state.preview); applySettings();
  }));
  document.querySelectorAll("[data-wake-opt]").forEach((b) => onTap(b, () => {
    state.wake = b.dataset.wakeOpt; store.set("wake", state.wake); applySettings(); syncWake();
  }));
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applySettings);
  onTap($("openSettings"), () => { show($("settings")); checkOffline(); });

  // ---- keep the screen on ----
  let wakeLock = null;
  async function syncWake() {
    const note = $("wakeNote");
    if (!("wakeLock" in navigator)) {
      note.textContent = "Not supported here. Set iPhone Settings › Display & Brightness › Auto-Lock to Never.";
      return;
    }
    if (state.wake === "on" && document.visibilityState === "visible") {
      try {
        if (!wakeLock || wakeLock.released) wakeLock = await navigator.wakeLock.request("screen");
        note.textContent = "Screen will stay on while this app is open.";
      } catch {
        note.textContent = "Couldn't keep the screen on. Set Auto-Lock to Never as a backup.";
      }
    } else if (wakeLock) {
      wakeLock.release().catch(() => {});
      wakeLock = null;
      note.textContent = "";
    }
  }
  document.addEventListener("visibilitychange", syncWake);
  // iOS only grants the lock after a user gesture, so retry on the first touches.
  document.addEventListener("pointerup", () => { if (state.wake === "on" && (!wakeLock || wakeLock.released)) syncWake(); });

  // ---- offline readiness ----
  async function checkOffline() {
    const out = $("offline");
    out.classList.remove("ok");
    if (!("serviceWorker" in navigator) || !window.caches) {
      out.textContent = "Offline mode unavailable (open via https).";
      return;
    }
    try {
      const keys = (await caches.keys()).filter((k) => k.startsWith("notes-"));
      if (!keys.length) { out.textContent = "Downloading for offline use…"; return; }
      const cache = await caches.open(keys[keys.length - 1]);
      const urls = (await cache.keys()).map((r) => new URL(r.url).pathname);
      const bigCount = urls.filter((u) => /\/thumbs\/\d{3}\.jpg$/.test(u)).length;
      const smallCount = urls.filter((u) => /\/thumbs\/sm\/\d{3}\.jpg$/.test(u)).length;
      const hasData = urls.some((u) => u.endsWith("/slides.js"));
      if (bigCount === TOTAL && smallCount === TOTAL && hasData) {
        out.textContent = `Ready offline ✓ ${TOTAL}/${TOTAL} slides and notes saved on this phone. Built ${window.DECK.built}.`;
        out.classList.add("ok");
      } else {
        out.textContent = `Saving for offline… ${Math.min(bigCount, smallCount)}/${TOTAL} slides.`;
      }
    } catch {
      out.textContent = "Couldn't check offline storage.";
    }
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  }

  // Desktop testing convenience: arrow keys.
  document.addEventListener("keydown", (e) => {
    if (openSheet) { if (e.key === "Escape") hide(); return; }
    if (e.key === "ArrowRight" || e.key === "PageDown") go(state.index + 1, { guard: true });
    if (e.key === "ArrowLeft" || e.key === "PageUp") go(state.index - 1, { guard: true });
  });

  applySettings();
  render();
  syncWake();
})();
