let lastPlaces = [];

/* =========================
   ✅ 모드 / 기록 (NEW)
========================= */
const MODE_KEY = "lb_mode"; // 사용자가 고른 모드 저장
const HISTORY_KEY = "lb_history_v1"; // 먹은 기록 저장

const MODE_LABEL = {
  lunch: "🍱 점심",
  dinner: "🌙 저녁",
  solo: "🙋‍♂️ 혼밥",
  team: "🥂 회식",
  cafe: "☕ 카페",
};

function getDefaultModeByTime() {
  const h = new Date().getHours();
  if (h >= 6 && h < 10) return "cafe";     // 아침/가벼움
  if (h >= 10 && h < 16) return "lunch";   // 점심
  if (h >= 16 && h < 18) return "cafe";    // 오후 카페
  if (h >= 18 && h < 23) return "dinner";  // 저녁
  return "solo";                            // 야식/혼밥 느낌
}

function getMode() {
  return localStorage.getItem(MODE_KEY) || getDefaultModeByTime();
}

function setMode(mode) {
  localStorage.setItem(MODE_KEY, mode);
  renderModeUI();
}

function renderModeUI() {
  const mode = getMode();
  const hint = document.getElementById("modeHint");
  const btns = document.querySelectorAll(".mode-btn");

  btns.forEach((b) => {
    const active = b.dataset.mode === mode;
    b.style.border = active ? "2px solid #111" : "1px solid #ddd";
    b.style.opacity = active ? "1" : "0.85";
    b.style.background = active ? "#fff" : "#fafafa";
    b.style.borderRadius = "12px";
    b.style.padding = "10px 12px";
    b.style.cursor = "pointer";
    b.style.fontWeight = active ? "700" : "600";
  });

  if (hint) {
    const base = getDefaultModeByTime();
    if (localStorage.getItem(MODE_KEY)) {
      hint.innerText = `현재 모드: ${MODE_LABEL[mode]} (사용자 선택)`;
    } else {
      hint.innerText = `현재 모드: ${MODE_LABEL[mode]} (시간대 추천: ${MODE_LABEL[base]})`;
    }
  }
}

/* =========================
   ✅ 기록/통계 (NEW)
========================= */
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
  // "음식점 > 한식 > ..." 같은 문자열에서 중간 카테고리만 뽑기
  if (!place.category_name) return "";
  const parts = place.category_name.split(">").map((s) => s.trim());
  return parts[1] || parts[0] || "";
}

function addToHistory(place) {
  const mode = getMode();
  const now = new Date();

  const item = {
    ts: now.toISOString(),
    date: now.toISOString().slice(0, 10), // YYYY-MM-DD
    mode,
    id: place.id || "",
    name: place.place_name || "",
    category: normalizeCategory(place),
    distance: place.distance || "",
    url: place.place_url || "",
  };

  const history = loadHistory();

  // 같은 날 같은 가게는 중복 저장 방지(원하면 제거 가능)
  const exists = history.some((h) => h.date === item.date && h.id && h.id === item.id);
  const next = exists ? history : [item, ...history];

  // 최근 50개만 유지
  saveHistory(next.slice(0, 50));
  renderHistory();
}

function renderHistory() {
  const listEl = document.getElementById("historyList");
  const statEl = document.getElementById("weeklyStats");
  if (!listEl || !statEl) return;

  const history = loadHistory();

  if (!history.length) {
    listEl.innerHTML = `<p style="margin:0; color:#666;">아직 기록이 없어요. 추천 리스트에서 <strong>먹었어요</strong>를 눌러보세요!</p>`;
    statEl.innerHTML = "";
    return;
  }

  // 최근 7개 표시
  const recent = history.slice(0, 7);
  listEl.innerHTML = recent
    .map((h) => {
      const modeLabel = MODE_LABEL[h.mode] || h.mode;
      const cat = h.category ? ` · ${h.category}` : "";
      const dist = h.distance ? ` · ${h.distance}m` : "";
      const link = h.url
        ? `<a href="go.html?url=${encodeURIComponent(h.url)}" target="_blank" style="margin-left:6px;">지도</a>`
        : "";
      return `<div style="padding:6px 0; border-bottom:1px solid #eee;">
        <strong>${h.name}</strong>${cat}${dist}
        <div style="font-size:12px; color:#777; margin-top:2px;">
          ${h.date} · ${modeLabel} ${link}
        </div>
      </div>`;
    })
    .join("");

  // 주간 통계(최근 7일)
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 6);

  const weekly = history.filter((h) => {
    const d = new Date(h.date + "T00:00:00");
    return d >= weekAgo && d <= today;
  });

  const byCat = {};
  weekly.forEach((h) => {
    const k = h.category || "기타";
    byCat[k] = (byCat[k] || 0) + 1;
  });

  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5);

  statEl.innerHTML = `
    <div><strong>📊 최근 7일 통계</strong></div>
    <div style="margin-top:6px;">
      ${top.length ? top.map(([k, v]) => `• ${k}: ${v}회`).join("<br/>") : "• 데이터가 부족해요"}
    </div>
  `;
}

/* =========================
   일일 이용자 수 카운터 (오전 9시 초기화)
========================= */
const COUNT_KEY = "lunchBuddyDailyCount";
const RESET_KEY = "lunchBuddyLastReset";

function getTimeBaseCount() {
  const hour = new Date().getHours();
  if (hour >= 9 && hour < 11)  return 10;
  if (hour >= 11 && hour < 13) return 120;
  if (hour >= 13 && hour < 15) return 250;
  if (hour >= 15 && hour < 18) return 350;
  if (hour >= 18 && hour < 21) return 500;
  if (hour >= 21 && hour < 24) return 650;
  return 700;
}

let dailyCount = Number(localStorage.getItem(COUNT_KEY));
if (!dailyCount || dailyCount === 0) initDailyCount();

function getTodayResetTime() {
  const now = new Date();
  const resetTime = new Date();
  resetTime.setHours(9, 0, 0, 0);
  if (now < resetTime) resetTime.setDate(resetTime.getDate() - 1);
  return resetTime.getTime();
}

function initDailyCount() {
  const base = getTimeBaseCount();
  dailyCount = base + Math.floor(Math.random() * 20);
  localStorage.setItem(COUNT_KEY, dailyCount);
}

function checkDailyReset() {
  const lastReset = Number(localStorage.getItem(RESET_KEY)) || 0;
  const todayResetTime = getTodayResetTime();
  if (lastReset < todayResetTime) {
    initDailyCount();
    localStorage.setItem(RESET_KEY, Date.now());
  }
}

function renderDailyCount() {
  const textEl = document.getElementById("userCountText");
  const numEl = document.getElementById("dailyCountNum");
  if (!textEl || !numEl) return;
  numEl.innerText = `${dailyCount.toLocaleString()}명`;
}

function increaseDailyCount() {
  dailyCount += 1;
  localStorage.setItem(COUNT_KEY, dailyCount);
  renderDailyCount();

  const numEl = document.getElementById("dailyCountNum");
  if (!numEl) return;

  numEl.classList.remove("bump");
  void numEl.offsetWidth;
  numEl.classList.add("bump");

  const plus = document.createElement("span");
  plus.className = "plus-one";
  plus.innerText = "+1";

  const rect = numEl.getBoundingClientRect();
  plus.style.left = rect.left + window.scrollX + rect.width / 2 + "px";
  plus.style.top = rect.top + window.scrollY - 6 + "px";

  document.body.appendChild(plus);
  setTimeout(() => plus.remove(), 800);
}

function getNextInterval() {
  const hour = new Date().getHours();
  let min = 5000, max = 10000;
  if (hour >= 11 && hour <= 13) { min = 2000; max = 4000; }
  else if (hour >= 18 && hour <= 20) { min = 2000; max = 4000; }
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function startDailyCounter() {
  checkDailyReset();
  renderDailyCount();
  const randomInterval = getNextInterval();
  setTimeout(() => {
    increaseDailyCount();
    startDailyCounter();
  }, randomInterval);
}

let currentList = [];

/* =========================
   선택된 카테고리 가져오기
========================= */
function getSelectedCategories() {
  const checked = document.querySelectorAll('.category-item input:checked');
  return Array.from(checked).map(cb => cb.value);
}

/* =========================
   ✅ 모드별 반경/키워드 가중치 (NEW)
========================= */
function getModeRadius(mode) {
  // 회식/저녁은 좀 더 넓게
  if (mode === "team") return 1800;
  if (mode === "dinner") return 1500;
  return 1000;
}

function getModeBoostConfigs(mode) {
  // "필터"가 아니라 "가중치" 역할. 리스트에 섞어서 추천 결과를 바꾸는 방식
  const boosts = [];

  if (mode === "cafe") {
    boosts.push({ type: "category", value: "CE7" }); // 카페
    boosts.push({ type: "keyword", value: "디저트" });
    boosts.push({ type: "keyword", value: "베이커리" });
    return boosts;
  }

  if (mode === "dinner") {
    boosts.push({ type: "keyword", value: "고기" });
    boosts.push({ type: "keyword", value: "술집" });
    boosts.push({ type: "keyword", value: "이자카야" });
    boosts.push({ type: "keyword", value: "곱창" });
    return boosts;
  }

  if (mode === "solo") {
    boosts.push({ type: "keyword", value: "국밥" });
    boosts.push({ type: "keyword", value: "분식" });
    boosts.push({ type: "keyword", value: "덮밥" });
    boosts.push({ type: "keyword", value: "김밥" });
    return boosts;
  }

  if (mode === "team") {
    boosts.push({ type: "keyword", value: "회식" });
    boosts.push({ type: "keyword", value: "고깃집" });
    boosts.push({ type: "keyword", value: "술집" });
    boosts.push({ type: "keyword", value: "횟집" });
    return boosts;
  }

  // lunch 기본
  boosts.push({ type: "category", value: "FD6" }); // 음식점
  return boosts;
}

/* =========================
   카테고리 → 검색 설정 변환
========================= */
function getSearchConfigs(selected) {
  const configs = [];

  if (selected.includes('all')) {
    configs.push({ type: 'category', value: 'FD6' });
    return configs;
  }

  selected.forEach(type => {
    switch (type) {
      case 'korean': configs.push({ type: 'keyword', value: '한식' }); break;
      case 'chinese': configs.push({ type: 'keyword', value: '중식' }); break;
      case 'japanese': configs.push({ type: 'keyword', value: '일식' }); break;
      case 'western': configs.push({ type: 'keyword', value: '양식' }); break;
      case 'cafe':
        configs.push({ type: 'category', value: 'CE7' });
        configs.push({ type: 'keyword', value: '디저트' });
        configs.push({ type: 'keyword', value: '베이커리' });
        configs.push({ type: 'keyword', value: '간식' });
        configs.push({ type: 'keyword', value: '빵집' });
        break;
      case 'bar':
        configs.push({ type: 'keyword', value: '술집' });
        break;
    }
  });

  return configs;
}

/* =========================
   위치 가져오기
========================= */
function getMyLocation() {
  if (!navigator.geolocation) {
    alert('위치 정보를 지원하지 않는 브라우저입니다.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      searchPlaces(lat, lng);
    },
    () => {
      alert('위치 권한을 허용해주세요.');
    }
  );
}

/* =========================
   장소 검색
========================= */
function searchPlaces(lat, lng) {
  const selected = getSelectedCategories();
  const configs = getSearchConfigs(selected);

  if (!configs.length) {
    alert('카테고리를 선택해주세요!');
    return;
  }

  const mode = getMode();
  const radius = getModeRadius(mode);

  // ✅ 모드 가중치 검색도 함께 섞어서 결과를 "체감"되게 바꿈
  const boostConfigs = getModeBoostConfigs(mode);
  const finalConfigs = [...configs, ...boostConfigs];

  const ps = new kakao.maps.services.Places();
  let results = [];
  let completed = 0;

  finalConfigs.forEach(config => {
    const callback = function (data, status) {
      if (status === kakao.maps.services.Status.OK) {
        results = results.concat(data);
      }
      completed++;
      if (completed === finalConfigs.length) {
        recommendRandom(results);
      }
    };

    const options = {
      location: new kakao.maps.LatLng(lat, lng),
      radius
    };

    if (config.type === 'category') {
      ps.categorySearch(config.value, callback, options);
    } else {
      ps.keywordSearch(config.value, callback, options);
    }
  });
}

/* =========================
   랜덤 추천 + 리스트 생성
========================= */
function recommendRandom(places) {
  if (!places.length) {
    alert('조건에 맞는 식당이 없어요 😢');
    return;
  }

  lastPlaces = places;

  currentList = pickRandomList(places);
  currentList = pickTopRandom(currentList);

  displayPlaceList(currentList);

  const mainPlace = currentList[0];
  showRecommendModal(mainPlace);

  document.getElementById('actionButton').innerText = '내 주변 다른 맛집 찾기';
}

/* =========================
   추천 모달
========================= */
function showRecommendModal(place) {
  const modal = document.getElementById("recommendModal");
  const span = modal.querySelector(".close");

  document.getElementById("modalPlaceName").innerText = place.place_name;

  const categoryText = place.category_name
    ? place.category_name.split('>')[1]?.trim() || ''
    : '';

  document.getElementById("modalCategory").innerText = categoryText;

  document.getElementById("modalDistance").innerText = `거리: ${place.distance}m`;
  document.getElementById("modalMapLink").href = place.place_url;

  modal.style.display = "block";

  span.onclick = () => modal.style.display = "none";
  window.onclick = e => { if (e.target === modal) modal.style.display = "none"; };
}

/* =========================
   카테고리 체크 UX 제어 + 초기 렌더
========================= */
document.addEventListener('DOMContentLoaded', () => {
  const allCheckbox = document.querySelector('.category-item input[value="all"]');
  const otherCheckboxes = document.querySelectorAll('.category-item input:not([value="all"])');

  allCheckbox.addEventListener('change', () => {
    if (allCheckbox.checked) otherCheckboxes.forEach(cb => cb.checked = false);
  });

  otherCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) allCheckbox.checked = false;
    });
  });

  // ✅ 모드 버튼 이벤트
  document.querySelectorAll(".mode-btn").forEach((b) => {
    b.addEventListener("click", () => setMode(b.dataset.mode));
  });
  renderModeUI();

  // ✅ 기록 렌더 + 초기화 버튼
  renderHistory();
  const clearBtn = document.getElementById("clearHistoryBtn");
  if (clearBtn) {
    clearBtn.onclick = () => {
      if (confirm("기록을 모두 지울까요?")) {
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
      }
    };
  }

  startDailyCounter();
});

/* =========================
   다시 추천 버튼
========================= */
document.getElementById('retryButton').onclick = () => {
  if (!lastPlaces.length) return;

  currentList = pickRandomList(lastPlaces);
  currentList = pickTopRandom(currentList);

  displayPlaceList(currentList);
  const mainPlace = currentList[0];
  showRecommendModal(mainPlace);
};

/* =========================
   유틸 함수
========================= */
function pickRandomList(places) {
  const shuffled = [...places].sort(() => Math.random() - 0.5);
  const count = Math.floor(Math.random() * 11) + 10;
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function displayPlaceList(places) {
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "";

  places.forEach((place, index) => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.cursor = "pointer";

    const categoryText = place.category_name
      ? place.category_name.split('>')[1]?.trim() || ''
      : '';

    card.innerHTML = `
      <h2>${index === 0 ? '⭐ ' : ''}${place.place_name} (${categoryText})</h2>
      <p>거리: ${place.distance}m</p>

      <div style="display:flex; gap:8px; margin-top:10px;">
        <button type="button" class="eat-btn" style="flex:1;">✅ 먹었어요</button>
        <button type="button" class="map-btn" style="flex:1;">🗺 지도</button>
      </div>
    `;

    // 카드 클릭 = 지도 열기 (기존 유지)
    card.onclick = () => {
      window.open(place.place_url, "_blank");
    };

    // ✅ 버튼 클릭은 카드 클릭 막기
    const eatBtn = card.querySelector(".eat-btn");
    eatBtn.onclick = (e) => {
      e.stopPropagation();
      addToHistory(place);
      alert("기록했어요! 📝 (최근 기록에서 확인 가능)");
    };

    const mapBtn = card.querySelector(".map-btn");
    mapBtn.onclick = (e) => {
      e.stopPropagation();
      window.open(place.place_url, "_blank");
    };

    resultDiv.appendChild(card);
  });
}

function pickTopRandom(list) {
  const randomPlace = list[Math.floor(Math.random() * list.length)];
  return [randomPlace, ...list.filter(p => p.id !== randomPlace.id)];
}

function shareKakao(isResult = false) {
  console.log("🔥 shareKakao 호출됨 / isResult =", isResult);

  let title = "Lunch Buddy 🍱";
  let description = "오늘 점심 뭐 먹지? 고민될 때 딱!\n내 주변 맛집을 랜덤으로 추천해줘요.";
  let imageUrl = "https://tkdwnsdl2066-lgtm.github.io/og-image2.png";

  let cardLink = "https://tkdwnsdl2066-lgtm.github.io/guide";
  let buttonLink = "https://tkdwnsdl2066-lgtm.github.io/guide";
  let buttonTitle = "런치 버디 열기";

  if (isResult && currentList.length > 0) {
    cons
