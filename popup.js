const LAST_DOMAIN_KEY = "last_focused_domain";

function saveLastFocused(domain) {
  chrome.storage.local.set({ [LAST_DOMAIN_KEY]: domain });
}

function getLastFocused() {
  return chrome.storage.local
    .get(LAST_DOMAIN_KEY)
    .then((res) => res[LAST_DOMAIN_KEY]);
}

function groupTabsByDomain(tabs) {
  const g = {};
  tabs.forEach((tab) => {
    try {
      const d = new URL(tab.url).hostname;
      (g[d] = g[d] || []).push(tab);
    } catch {}
  });
  return g;
}

async function renderUI() {
  const tabs = await new Promise((res) => chrome.tabs.query({}, res));
  const groups = groupTabsByDomain(tabs);
  let arr = Object.entries(groups);

  arr = arr.filter(
    ([d, tabs]) =>
      d.toLowerCase().includes(searchInput.value.toLowerCase()) ||
      tabs.some(
        (t) =>
          (t.title &&
            t.title.toLowerCase().includes(searchInput.value.toLowerCase())) ||
          (t.url &&
            t.url.toLowerCase().includes(searchInput.value.toLowerCase()))
      )
  );
  arr.sort((a, b) => b[1].length - a[1].length);

  container.innerHTML = "";
  const lastFocused = await getLastFocused();
  arr.forEach(([domain, tabs]) => {
    const row = document.createElement("div");
    row.className = "domain-row";

    const header = document.createElement("div");
    header.className = "domain-header";
    const fav = document.createElement("img");
    fav.className = "domain-header-favicon";
    fav.src = tabs[0].favIconUrl || "./icons/fallback-favicon.png";
    header.innerHTML = `<span class="domain-header-content">${fav.outerHTML} ${domain} (${tabs.length})</span>`;
    if (domain === lastFocused) header.classList.add("active");

    const list = document.createElement("div");
    list.className = "tabs-list";

    tabs.forEach((tab) => {
      const tr = document.createElement("div");
      tr.className = "tab-row";
      if (tab.active) {
        tr.classList.add("active-tab");
      }
      const info = document.createElement("div");
      info.className = "tab-info";
      const fav = document.createElement("img");
      fav.className = "tab-favicon";
      fav.src = tab.favIconUrl || "./icons/fallback-favicon.png";
      const ttl = document.createElement("span");
      ttl.className = "tab-title";
      ttl.textContent = tab.title || tab.url;
      info.append(fav, ttl);
      info.onclick = () => chrome.tabs.update(tab.id, { active: true });
      const cb = document.createElement("button");
      cb.className = "close-tab";
      cb.textContent = "X";
      cb.onclick = () => chrome.tabs.remove(tab.id, renderUI);
      tr.append(info, cb);
      list.appendChild(tr);
    });

    header.onclick = () => {
      const vis = list.style.display === "block";
      document
        .querySelectorAll(".tabs-list")
        .forEach((el) => (el.style.display = "none"));
      if (!vis) list.style.display = "block";
      saveLastFocused(domain);
    };

    row.append(header, list);
    container.appendChild(row);
  });
}

let container, searchInput;
document.addEventListener("DOMContentLoaded", () => {
  container = document.getElementById("tabs-container");
  searchInput = document.getElementById("search");
  searchInput.oninput = renderUI;
  renderUI();
});
