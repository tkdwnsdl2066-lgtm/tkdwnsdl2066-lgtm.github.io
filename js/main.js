let lastPlaces = [];
let currentList = [];

/* =========================
   ✅ 먹은 기록(NEW) - 로컬저장소 기반
========================= */
const HISTORY_KEY = "lb_history_v1";

const MODE_LABEL = "🍱"; // 지금은 모드 안 씀(표시용 이모지 정도만)

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

  // 같은 날 같은 place_id는 중복 저장 방지
  const exists =
    item.id && history.some((h) => h.date === item.date && h.id === item.id);
  const next = exists ? history : [item, ...history];

  saveHistory(next.slice(0, 50));
  renderHistory();
}

function renderHistory() {
  const listEl = document.getElementById("historyList");
  const statEl = document.getElementById("weeklyStats");
  if (!listEl || !statEl) return;

  const history = loadHistory();

  if (!history.length) {
    listEl.innerHTML = `<p style="margin:0; color:#666;">아직 기록이 없어요. 리스트/모달에서 <strong>먹었어요</strong>를 눌러보세요!</p>`;
    statEl.innerHTML = "";
    return;
  }

  const recent = history.slice(0, 7);
  listEl.innerHTML = recent
    .map((h) => {
      const cat = h.category ? ` · ${h.category}` : "";
      const dist = h.distance ? ` · ${h.distance}m` : "";
      const link = h.url
        ? `<a href="go.html?url=${encodeURIComponent(
            h.url
          )}" target="_blank" style="margin-left:6px;">지도</a>`
        : "";
      return `<div style="padding:6px 0; border-bottom:1px solid #eee;">
        <strong>${h.name}</strong>${cat}${dist}
        <div style="font-size:12px; color:#777; margin-top:2px;">
          ${h.date} ${link}
        </div>
      </div>`;
    })
    .join("");

  // 최근 7일 통계
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

  const top = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  statEl.innerHTML = `
    <div><strong>📊 최근 7일 통계</strong></div>
    <div style="margin-top:6px;">
      ${
        top.length
          ? top.map(([k, v]) => `• ${k}: ${v}회`).join("<br/>")
          : "• 데이터가 부족해요"
      }
    </div>
  `;
}

/* =========================
   ✅ 최근 먹은 곳 "가중치 낮추기"(B안) - NEW
   - 최근 먹은 곳은 확률을 낮추고(반복 1회)
   - 나머지는 확률을 높임(반복 3회)
========================= */
function getRecentEatenIdSet(limit = 8) {
  const history = loadHistory();
  const ids = history.map((h) => h.id).filter(Boolean);
  const unique = Array.from(new Set(ids)).slice(0, limit);
  return new Set(unique);
}

function applyRecentPenalty(places, limit = 8) {
  const recentSet = getRecentEatenIdSet(limit);
  const weighted = [];

  for (const p of places) {
    const isRecent = p.id && recentSet.has(p.id);
    const repeat = isRecent ? 1 : 3;

    for (let i = 0; i < repeat; i++) weighted.push(p);
  }

  return weighted;
}

/* =========================
   일일 이용자 수 카운터 (오전 9시 초기화)
========================= */
const COUNT_KEY = "lunchBuddyDailyCount";
const RESET_KEY = "lunchBuddyLastReset";

function getTimeBaseCount() {
  const hour = new Date().getHours();
  if (hour >= 9 && hour < 11) return 10;
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
  let min = 5000;
  let max = 10000;

  if (hour >= 11 && hour <= 13) {
    min = 2000;
    max = 4000;
  } else if (hour >= 18 && hour <= 20) {
    min = 2000;
    max = 4000;
  }

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

/* =========================
   선택된 카테고리 가져오기
========================= */
function getSelectedCategories() {
  const checked = document.querySelectorAll(".category-item input:checked");
  return Array.from(checked).map((cb) => cb.value);
}

/* =========================
   카테고리 → 검색 설정 변환
========================= */
function getSearchConfigs(selected) {
  const configs = [];

  if (selected.includes("all")) {
    configs.push({ type: "category", value: "FD6" });
    return configs;
  }

  selected.forEach((type) => {
    switch (type) {
      case "korean":
        configs.push({ type: "keyword", value: "한식" });
        break;
      case "chinese":
        configs.push({ type: "keyword", value: "중식" });
        break;
      case "japanese":
        configs.push({ type: "keyword", value: "일식" });
        break;
      case "western":
        configs.push({ type: "keyword", value: "양식" });
        break;
      case "cafe":
        configs.push({ type: "category", value: "CE7" });
        configs.push({ type: "keyword", value: "디저트" });
        configs.push({ type: "keyword", value: "베이커리" });
        configs.push({ type: "keyword", value: "간식" });
        configs.push({ type: "keyword", value: "빵집" });
        break;
      case "bar":
        configs.push({ type: "keyword", value: "술집" });
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
    alert("위치 정보를 지원하지 않는 브라우저입니다.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      searchPlaces(lat, lng);
    },
    () => {
      alert("위치 권한을 허용해주세요.");
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
    alert("카테고리를 선택해주세요!");
    return;
  }

  const ps = new kakao.maps.services.Places();
  let results = [];
  let completed = 0;

  configs.forEach((config) => {
    const callback = function (data, status) {
      if (status === kakao.maps.services.Status.OK) {
        results = results.concat(data);
      }

      completed++;
      if (completed === configs.length) {
        recommendRandom(results);
      }
    };

    const options = {
      location: new kakao.maps.LatLng(lat, lng),
      radius: 1000,
    };

    if (config.type === "category") {
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
    alert("조건에 맞는 식당이 없어요 😢");
    return;
  }

  lastPlaces = places;

  // ✅ B안: 최근 먹은 곳 확률 낮추기
  const weightedPlaces = applyRecentPenalty(places, 8);

  currentList = pickRandomList(weightedPlaces);
  currentList = pickTopRandom(currentList);

  displayPlaceList(currentList);

  const mainPlace = currentList[0];
  showRecommendModal(mainPlace);

  const btn = document.getElementById("actionButton");
  if (btn) btn.innerText = "내 주변 다른 맛집 찾기";
}

/* =========================
   추천 모달
========================= */
function showRecommendModal(place) {
  const modal = document.getElementById("recommendModal");
  if (!modal) return;

  const span = modal.querySelector(".close");

  const nameEl = document.getElementById("modalPlaceName");
  const catEl = document.getElementById("modalCategory");
  const distEl = document.getElementById("modalDistance");
  const linkEl = document.getElementById("modalMapLink");
  const eatEl = document.getElementById("modalEatBtn"); // ✅ index.html에 추가한 버튼

  if (nameEl) nameEl.innerText = place.place_name;

  const categoryText = place.category_name
    ? place.category_name.split(">")[1]?.trim() || ""
    : "";

  if (catEl) catEl.innerText = categoryText;
  if (distEl) distEl.innerText = `거리: ${place.distance}m`;
  if (linkEl) linkEl.href = place.place_url;

  // ✅ 모달에서 "먹었어요" 기록
  if (eatEl) {
    eatEl.onclick = () => {
      addToHistory(place);
      alert("기록했어요! 📝 (아래 최근 기록에서 확인 가능)");
    };
  }

  modal.style.display = "block";

  if (span) span.onclick = () => (modal.style.display = "none");
  window.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };
}

/* =========================
   유틸 함수
========================= */
function pickRandomList(places) {
  const shuffled = [...places].sort(() => Math.random() - 0.5);
  const count = Math.floor(Math.random() * 11) + 10; // 10~20
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function pickTopRandom(list) {
  const randomPlace = list[Math.floor(Math.random() * list.length)];
  return [randomPlace, ...list.filter((p) => p.id !== randomPlace.id)];
}

function displayPlaceList(places) {
  const resultDiv = document.getElementById("result");
  if (!resultDiv) return;

  resultDiv.innerHTML = "";

  places.forEach((place, index) => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.cursor = "pointer";

    const categoryText = place.category_name
      ? place.category_name.split(">")[1]?.trim() || ""
      : "";

    card.innerHTML = `
      <h2>${index === 0 ? "⭐ " : ""}${place.place_name} (${categoryText})</h2>
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

    // 버튼 클릭은 카드 클릭 막기
    const eatBtn = card.querySelector(".eat-btn");
    if (eatBtn) {
      eatBtn.onclick = (e) => {
        e.stopPropagation();
        addToHistory(place);
        alert("기록했어요! 📝 (아래 최근 기록에서 확인 가능)");
      };
    }

    const mapBtn = card.querySelector(".map-btn");
    if (mapBtn) {
      mapBtn.onclick = (e) => {
        e.stopPropagation();
        window.open(place.place_url, "_blank");
      };
    }

    resultDiv.appendChild(card);
  });
}

/* =========================
   카카오 공유 (기존 유지)
========================= */
function shareKakao(isResult = false) {
  console.log("🔥 shareKakao 호출됨 / isResult =", isResult);

  let title = "Lunch Buddy 🍱";
  let description =
    "오늘 점심 뭐 먹지? 고민될 때 딱!\n내 주변 맛집을 랜덤으로 추천해줘요.";
  let imageUrl = "https://tkdwnsdl2066-lgtm.github.io/og-image2.png";

  let cardLink = "https://tkdwnsdl2066-lgtm.github.io/guide";
  let buttonLink = "https://tkdwnsdl2066-lgtm.github.io/guide";
  let buttonTitle = "런치 버디 열기";

  if (isResult && currentList.length > 0) {
    const place = currentList[0];

    title = "오늘 점심 고민 끝!? 🍽️";
    description = `${place.place_name} · ${place.distance}m`;

    cardLink = "https://tkdwnsdl2066-lgtm.github.io/guide";
    buttonLink =
      "https://tkdwnsdl2066-lgtm.github.io/go.html?url=" +
      encodeURIComponent(place.place_url);
    buttonTitle = "지도앱에서 보기";
  }

  Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title,
      description,
      imageUrl,
      link: { mobileWebUrl: cardLink, webUrl: cardLink },
    },
    buttons: [
      {
        title: buttonTitle,
        link: { mobileWebUrl: buttonLink, webUrl: buttonLink },
      },
    ],
  });
}

/* =========================
   DOMContentLoaded: 이벤트 바인딩 (안전)
========================= */
document.addEventListener("DOMContentLoaded", () => {
  // 카테고리 UX 제어
  const allCheckbox = document.querySelector(
    '.category-item input[value="all"]'
  );
  const otherCheckboxes = document.querySelectorAll(
    '.category-item input:not([value="all"])'
  );

  if (allCheckbox) {
    allCheckbox.addEventListener("change", () => {
      if (allCheckbox.checked)
        otherCheckboxes.forEach((cb) => (cb.checked = false));
    });
  }

  otherCheckboxes.forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked && allCheckbox) allCheckbox.checked = false;
    });
  });

  // 기록 렌더 & 초기화
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

  // 다시 추천 버튼
  const retryBtn = document.getElementById("retryButton");
  if (retryBtn) {
    retryBtn.onclick = () => {
      if (!lastPlaces.length) return;

      // ✅ 다시 추천도 B안 적용
      const weightedPlaces = applyRecentPenalty(lastPlaces, 8);

      currentList = pickRandomList(weightedPlaces);
      currentList = pickTopRandom(currentList);
      displayPlaceList(currentList);
      showRecommendModal(currentList[0]);
    };
  }

  // 버디 패널 토글
  const openBuddyBtn = document.getElementById("openBuddyBtn");
  if (openBuddyBtn) {
    openBuddyBtn.onclick = () => {
      const panel = document.getElementById("buddyPanel");
      if (panel) panel.classList.toggle("hidden");
    };
  }

  // 지정 위치 검색
  const buddySearchBtn = document.getElementById("buddySearchBtn");
  if (buddySearchBtn) {
    buddySearchBtn.onclick = () => {
      const input = document.getElementById("buddyLocationInput");
      const keyword = (input?.value || "").trim();

      if (!keyword) {
        alert("위치를 입력해주세요!");
        return;
      }

      const ps = new kakao.maps.services.Places();
      ps.keywordSearch(keyword, function (data, status) {
        if (status !== kakao.maps.services.Status.OK || !data.length) {
          alert("해당 위치를 찾을 수 없어요 😢");
          return;
        }

        const lat = data[0].y;
        const lng = data[0].x;
        searchPlaces(lat, lng);
      });
    };
  }

  // 카운터 시작
  startDailyCounter();
});
