let lastPlaces = [];
let currentList = [];

const SEARCH_RADIUS_M = 2000;
const MAX_PAGES = 45;

const SHOWN_KEY = "lb_shown_v1";

function loadShownIds() {
  try {
    return JSON.parse(localStorage.getItem(SHOWN_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveShownIds(ids) {
  localStorage.setItem(SHOWN_KEY, JSON.stringify(ids.slice(0, 300)));
}
function addShown(placeId) {
  if (!placeId) return;
  const prev = loadShownIds();
  if (prev[0] === placeId) return;
  const next = [placeId, ...prev.filter((id) => id !== placeId)];
  saveShownIds(next);
}
function filterOutShown(places, limit = 200) { // ⭐ 200으로 증가
  const shown = new Set(loadShownIds().slice(0, limit));
  const filtered = places.filter((p) => !shown.has(p.id));
  return filtered.length ? filtered : places;
}

const HISTORY_KEY = "lb_history_v1";

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveHistory(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}
function normalizeCategory(place) {
  if (!place.category_name) return "";
  const parts = place.category_name.split(">").map((s) => s.trim());
  return parts[1] || parts[0] || "";
}
function addToHistory(place) {
  const now = new Date();
  const item = {
    ts: now.toISOString(),
    date: now.toISOString().slice(0, 10),
    id: place.id || "",
    name: place.place_name || "",
    category: normalizeCategory(place),
    distance: place.distance || "",
    url: place.place_url || "",
  };

  const history = loadHistory();
  const exists =
    item.id && history.some((h) => h.date === item.date && h.id === item.id);

  const next = exists ? history : [item, ...history];

  saveHistory(next.slice(0, 50));
  renderHistory();
}

function getRecentEatenIdSet(limit = 8) {
  const history = loadHistory();
  const ids = history.map((h) => h.id).filter(Boolean);
  const unique = Array.from(new Set(ids)).slice(0, limit);
  return new Set(unique);
}

function applyRecentPenalty(places, limit = 8) {
  const recentSet = getRecentEatenIdSet(limit);
  return places.map((p) => ({
    place: p,
    weight: p.id && recentSet.has(p.id) ? 1 : 3,
  }));
}

function weightedSampleUnique(weighted, count) {
  const pool = weighted.slice();
  const picked = [];

  while (pool.length && picked.length < count) {
    const total = pool.reduce((sum, x) => sum + (x.weight || 1), 0);
    let r = Math.random() * total;

    let idx = 0;
    for (; idx < pool.length; idx++) {
      r -= (pool[idx].weight || 1);
      if (r <= 0) break;
    }

    const chosen = pool.splice(Math.min(idx, pool.length - 1), 1)[0];
    if (chosen?.place) picked.push(chosen.place);
  }

  return picked;
}

function searchAllPages(ps, searchFn) {
  return new Promise((resolve) => {
    const all = [];
    const seen = new Set();
    let pageCount = 0;

    const cb = (data, status, pagination) => {
      if (status === kakao.maps.services.Status.OK && Array.isArray(data)) {
        for (const p of data) {
          if (p?.id && !seen.has(p.id)) {
            seen.add(p.id);
            all.push(p);
          }
        }
      }

      if (pagination && pagination.hasNextPage && pageCount < MAX_PAGES) {
        pageCount++;
        pagination.nextPage();
        return;
      }

      resolve(all);
    };

    searchFn(cb);
  });
}

async function searchPlaces(lat, lng) {
  const selected = getSelectedCategories();
  const configs = getSearchConfigs(selected);

  if (!configs.length) {
    alert("카테고리를 선택해주세요!");
    return;
  }

  const ps = new kakao.maps.services.Places();
  const options = {
    location: new kakao.maps.LatLng(lat, lng),
    radius: SEARCH_RADIUS_M,
  };

  const tasks = configs.map((config) => {
    if (config.type === "category") {
      return searchAllPages(ps, (cb) =>
        ps.categorySearch(config.value, cb, options)
      );
    }
    return searchAllPages(ps, (cb) =>
      ps.keywordSearch(config.value, cb, options)
    );
  });

  const lists = await Promise.all(tasks);
  const merged = lists.flat();

  const seen = new Set();
  const unique = [];

  for (const p of merged) {
    if (p?.id && !seen.has(p.id)) {
      seen.add(p.id);
      unique.push(p);
    }
  }

  console.log("✅ 후보 식당 수:", unique.length); // ⭐ 후보 풀 확인

  recommendRandom(unique);
}

function recommendRandom(places) {
  if (!places.length) {
    alert("조건에 맞는 식당이 없어요 😢");
    return;
  }

  lastPlaces = places;

  const notShownFirst = filterOutShown(places, 200);

  const weighted = applyRecentPenalty(notShownFirst, 8);

  currentList = weightedSampleUnique(
    weighted,
    Math.min(Math.floor(Math.random() * 11) + 10, weighted.length)
  );

  const mainPlace =
    currentList[Math.floor(Math.random() * currentList.length)];

  currentList = [
    mainPlace,
    ...currentList.filter((p) => p.id !== mainPlace.id),
  ];

  displayPlaceList(currentList);
  showRecommendModal(mainPlace);
  addShown(mainPlace?.id);

  const btn = document.getElementById("actionButton");
  if (btn) btn.innerText = "내 주변 다른 맛집 찾기";
}

function pickTopRandom(list) {
  if (!list.length) return list;
  const randomPlace = list[Math.floor(Math.random() * list.length)];
  return [randomPlace, ...list.filter((p) => p.id !== randomPlace.id)];
}
