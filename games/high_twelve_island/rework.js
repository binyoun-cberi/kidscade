(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const body = document.body;
  const workCol = $(".work-col");
  const tabs = $(".tabs", workCol || document);
  const panel = $("#panel");
  const ocean = $(".ocean");
  const canvas = $("#islandCanvas");
  if (!workCol || !tabs || !panel || !ocean || !canvas) return;

  let drawerOpen = false;
  let activeSite = null;

  function openDrawer() {
    drawerOpen = true;
    body.classList.add("management-open");
    workCol.setAttribute("aria-hidden", "false");
  }
  function closeDrawer() {
    drawerOpen = false;
    body.classList.remove("management-open");
    workCol.setAttribute("aria-hidden", "true");
  }

  tabs.classList.add("management-dock");
  body.appendChild(tabs);

  const drawerHead = document.createElement("div");
  drawerHead.className = "drawer-head";
  drawerHead.innerHTML = '<div><span class="drawer-kicker">마을 운영</span><strong id="drawerTitle">현장 관리</strong></div><button class="drawer-close" type="button" aria-label="관리 창 닫기">×</button>';
  workCol.insertBefore(drawerHead, panel);
  $(".drawer-close", drawerHead).addEventListener("click", closeDrawer);

  const scrim = document.createElement("button");
  scrim.type = "button";
  scrim.className = "drawer-scrim";
  scrim.setAttribute("aria-label", "관리 창 닫기");
  scrim.addEventListener("click", closeDrawer);
  body.appendChild(scrim);

  const managerButton = document.createElement("button");
  managerButton.type = "button";
  managerButton.id = "manageToggle";
  managerButton.className = "iconbtn manage-toggle";
  managerButton.textContent = "☰";
  managerButton.setAttribute("aria-label", "마을 운영 열기");
  managerButton.addEventListener("click", () => drawerOpen ? closeDrawer() : openDrawer());
  $(".controls")?.appendChild(managerButton);

  const fx = document.createElement("div");
  fx.className = "weather-fx";
  fx.setAttribute("aria-hidden", "true");
  ocean.appendChild(fx);

  const hotspots = document.createElement("div");
  hotspots.className = "world-hotspots";
  hotspots.setAttribute("aria-label", "섬 현장 바로가기");
  hotspots.innerHTML =
    '<button class="world-hotspot farm-site" type="button" data-site="gather"><span>🌾</span><small>농장</small></button>' +
    '<button class="world-hotspot wood-site" type="button" data-site="wood"><span>🌲</span><small>벌목지</small></button>' +
    '<button class="world-hotspot build-site" type="button" data-tab-target="build"><span>🏗️</span><small>건설</small></button>' +
    '<button class="world-hotspot people-site" type="button" data-tab-target="residents"><span>💬</span><small>주민</small></button>';
  ocean.appendChild(hotspots);

  const siteControl = document.createElement("div");
  siteControl.className = "site-control hidden";
  siteControl.innerHTML =
    '<button class="site-close" type="button" aria-label="현장 조작 닫기">×</button>' +
    '<div class="site-label"></div>' +
    '<div class="site-step"><button type="button" data-site-delta="-1">−</button><b>0명</b><button type="button" data-site-delta="1">+</button></div>' +
    '<small class="site-help">지도에서 바로 인원을 배치합니다.</small>';
  ocean.appendChild(siteControl);

  const workTab = $('.tab[data-tab="work"]', tabs);
  function ensureWorkPanel() {
    if (!workTab) return;
    if (!workTab.classList.contains("active")) workTab.click();
  }
  function jobControl(job, delta) {
    ensureWorkPanel();
    const button = panel.querySelector('button[data-job="' + job + '"][data-delta="' + delta + '"]');
    return button || null;
  }
  function readJob(job) {
    ensureWorkPanel();
    const button = panel.querySelector('button[data-job="' + job + '"]');
    const amount = button?.parentElement?.querySelector("b")?.textContent?.trim() || "0";
    return amount;
  }
  function syncSiteControl() {
    if (!activeSite) return;
    const meta = activeSite === "gather"
      ? { icon: "🌾", name: "식량 생산" }
      : { icon: "🌲", name: "물자 수집" };
    $(".site-label", siteControl).textContent = meta.icon + " " + meta.name;
    $(".site-step b", siteControl).textContent = readJob(activeSite) + "명";
    [-1, 1].forEach(delta => {
      const source = jobControl(activeSite, delta);
      const target = siteControl.querySelector('[data-site-delta="' + delta + '"]');
      target.disabled = !source || source.disabled;
    });
  }
  function openSite(site, x, y) {
    activeSite = site;
    siteControl.classList.remove("hidden");
    const rect = ocean.getBoundingClientRect();
    const left = Math.max(90, Math.min(rect.width - 90, x - rect.left));
    const top = Math.max(70, Math.min(rect.height - 80, y - rect.top));
    siteControl.style.left = left + "px";
    siteControl.style.top = top + "px";
    syncSiteControl();
  }
  $(".site-close", siteControl).addEventListener("click", () => {
    activeSite = null;
    siteControl.classList.add("hidden");
  });
  $$("[data-site-delta]", siteControl).forEach(btn => btn.addEventListener("click", () => {
    if (!activeSite) return;
    const delta = Number(btn.dataset.siteDelta);
    const source = jobControl(activeSite, delta);
    if (source && !source.disabled) source.click();
    requestAnimationFrame(syncSiteControl);
  }));

  function selectTab(name, open = true) {
    const tab = $('.tab[data-tab="' + name + '"]', tabs);
    if (!tab) return;
    tab.click();
    if (open) openDrawer();
    const titles = { work: "일꾼 배치", build: "건설", law: "규칙과 결정", residents: "주민", log: "기록" };
    $("#drawerTitle").textContent = titles[name] || "마을 운영";
  }

  const stats = $("#stats");
  stats?.addEventListener("click", event => {
    const button = event.target.closest("[data-open-tab]");
    if (!button) return;
    activeSite = null;
    siteControl.classList.add("hidden");
    selectTab(button.dataset.openTab, true);
  });

  $$(".tab", tabs).forEach(tab => {
    const iconOnly = tab.textContent.trim().split(/\s+/)[0];
    tab.dataset.shortLabel = iconOnly;
    tab.addEventListener("click", event => {
      if (event.isTrusted) openDrawer();
      const name = tab.dataset.tab;
      const titles = { work: "일꾼 배치", build: "건설", law: "규칙과 결정", residents: "주민", log: "기록" };
      $("#drawerTitle").textContent = titles[name] || "마을 운영";
    });
  });

  hotspots.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.site) {
      const r = button.getBoundingClientRect();
      closeDrawer();
      openSite(button.dataset.site, r.left + r.width / 2, r.top + r.height / 2);
      return;
    }
    if (button.dataset.tabTarget) selectTab(button.dataset.tabTarget, true);
  });

  function canvasPoint(event) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - r.left) / r.width * 720,
      y: (event.clientY - r.top) / r.height * 420
    };
  }
  canvas.addEventListener("click", event => {
    const p = canvasPoint(event);
    if ((p.x >= 105 && p.x <= 260 && p.y >= 165 && p.y <= 305)) {
      openSite("gather", event.clientX, event.clientY);
    } else if ((p.x <= 245 && p.y <= 165) || (p.x >= 540 && p.y <= 200)) {
      openSite("wood", event.clientX, event.clientY);
    } else if (p.x >= 275 && p.x <= 590 && p.y >= 70 && p.y <= 325) {
      selectTab("build", true);
    }
  });

  const panelObserver = new MutationObserver(() => {
    if (activeSite) requestAnimationFrame(syncSiteControl);
  });
  panelObserver.observe(panel, { childList: true, subtree: true });

  function disasterIcon(text) {
    if (/아동|어린이|아이/.test(text)) return "🧒⚒️";
    if (/폭염/.test(text)) return "☀️🥵";
    if (/홍수/.test(text)) return "🌊🏚️";
    if (/황사/.test(text)) return "🌫️😷";
    if (/전염병|감염/.test(text)) return "🦠🛏️";
    if (/한파|추위|난방/.test(text)) return "❄️🔥";
    if (/파업|노동|강제/.test(text)) return "⚒️✊";
    if (/식량|배급/.test(text)) return "🍞⚖️";
    if (/주거|집/.test(text)) return "🏚️👥";
    return "🏝️⚠️";
  }
  function syncEventScene() {
    const modal = $("#modal");
    if (!modal) return;
    const visible = !modal.classList.contains("hidden");
    body.classList.toggle("event-open", visible);
    let scene = $(".event-scene", modal);
    if (!visible) {
      scene?.remove();
      return;
    }
    const title = $("#modalTitle")?.textContent || "";
    const bodyText = $("#modalBody")?.textContent || "";
    if (!scene) {
      scene = document.createElement("div");
      scene.className = "event-scene";
      const speaker = $("#speaker");
      speaker?.after(scene);
    }
    scene.innerHTML = '<span aria-hidden="true">' + disasterIcon(title + " " + bodyText) + '</span><small>지금 이 선택이 섬의 모습과 주민 생활을 바꿉니다.</small>';
  }
  const modal = $("#modal");
  if (modal) new MutationObserver(syncEventScene).observe(modal, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  syncEventScene();

  const crisis = $("#crisisStrip");
  const syncCrisis = () => {
    const active = !crisis?.classList.contains("hidden");
    body.classList.toggle("crisis-visible", !!active);
  };
  if (crisis) new MutationObserver(syncCrisis).observe(crisis, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  syncCrisis();

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      if (!siteControl.classList.contains("hidden")) {
        activeSite = null;
        siteControl.classList.add("hidden");
      } else if (drawerOpen) closeDrawer();
    }
  });

  workCol.setAttribute("aria-hidden", "true");
  closeDrawer();
})();