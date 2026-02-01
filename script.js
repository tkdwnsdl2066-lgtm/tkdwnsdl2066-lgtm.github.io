let lastPlaces = [];
let currentList = [];

console.log('kakao services:', kakao.maps.services);

/* =========================
   선택된 카테고리 가져오기
========================= */
function getSelectedCategories() {
  const checked = document.querySelectorAll(
    '.category-item input:checked'
  );

  return Array.from(checked).map(cb => cb.value);
}

/* =========================
   카테고리 → 검색 설정 변환
========================= */
function getSearchConfigs(selected) {
  const configs = [];

  // 전체 선택
  if (selected.includes('all')) {
    configs.push({ type: 'category', value: 'FD6' });
    return configs;
  }

  selected.forEach(type => {
    switch (type) {
      case 'korean':
        configs.push({ type: 'keyword', value: '한식' });
        break;
      case 'chinese':
        configs.push({ type: 'keyword', value: '중식' });
        break;
      case 'japanese':
        configs.push({ type: 'keyword', value: '일식' });
        break;
      case 'western':
        configs.push({ type: 'keyword', value: '양식' });
        break;
      case 'cafe':
        configs.push({ type: 'category', value: 'CE7' });
        break;
      case 'bar':
        configs.push({ type: 'category', value: 'CE7' });
        break;
    }
  });

  return configs;
}

/* =========================
   위치 가져오기 (버튼 클릭)
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

  const ps = new kakao.maps.services.Places();
  let results = [];
  let completed = 0;

  configs.forEach(config => {
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
      radius: 1000
    };

    if (config.type === 'category') {
      ps.categorySearch(config.value, callback, options);
    } else {
      ps.keywordSearch(config.value, callback, options);
    }
  });
}

/* =========================
   랜덤 추천
========================= */
function recommendRandom(places) {
  if (!places.length) {
    alert('조건에 맞는 식당이 없어요 😢');
    return;
  }

  lastPlaces = places;

  // 🔥 랜덤 10~20개 리스트 생성
  currentList = pickRandomList(places);

  // 리스트 표시
  displayPlaceList(currentList);

  // 리스트 중 1곳 랜덤 추천
  const randomPlace =
    currentList[Math.floor(Math.random() * currentList.length)];

  showRecommendModal(randomPlace);
}

/* =========================
   추천 모달 표시
========================= */
function showRecommendModal(place) {
  const modal = document.getElementById("recommendModal");
  const span = modal.querySelector(".close");

  document.getElementById("modalPlaceName").innerText =
    place.place_name;

  const categoryText = place.category_name
    ? place.category_name.split('>')[1]?.trim() || ''
    : '';

  document.getElementById("modalCategory").innerText =
    `${categoryText} · 영업 여부는 카카오맵에서 확인`;

  document.getElementById("modalDistance").innerText =
    `거리: ${place.distance}m`;

  const link = document.getElementById("modalMapLink");
  link.href = place.place_url;

  modal.style.display = "block";

  span.onclick = () => modal.style.display = "none";
  window.onclick = e => {
    if (e.target === modal) modal.style.display = "none";
  };
}

/* =========================
   카테고리 체크 UX 제어
========================= */
document.addEventListener('DOMContentLoaded', () => {
  const allCheckbox = document.querySelector(
    '.category-item input[value="all"]'
  );

  const otherCheckboxes = document.querySelectorAll(
    '.category-item input:not([value="all"])'
  );

  // 전체 클릭 시 → 나머지 해제
  allCheckbox.addEventListener('change', () => {
    if (allCheckbox.checked) {
      otherCheckboxes.forEach(cb => cb.checked = false);
    }
  });

  // 다른 카테고리 클릭 시 → 전체 해제
  otherCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        allCheckbox.checked = false;
      }
    });
  });
});

document.getElementById('retryButton').onclick = () => {
  if (!lastPlaces.length) return;

  // 🔥 전체 결과 기준으로 다시 10~20개 생성
  currentList = pickRandomList(lastPlaces);

  // 리스트 다시 표시
  displayPlaceList(currentList);

  // 새 리스트 중 랜덤 추천
  const randomPlace =
    currentList[Math.floor(Math.random() * currentList.length)];

  showRecommendModal(randomPlace);
};

function pickRandomList(places) {
  const shuffled = [...places].sort(() => Math.random() - 0.5);

  const count = Math.floor(Math.random() * 11) + 10; // 10~20
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function displayPlaceList(places) {
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "";

  places.forEach(place => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.cursor = "pointer";

    const categoryText = place.category_name
      ? place.category_name.split('>')[1]?.trim() || ''
      : '';

    card.innerHTML = `
      <h2>${place.place_name} (${categoryText})</h2>
      <p>거리: ${place.distance}m</p>
    `;

    card.onclick = () => {
      window.open(place.place_url, "_blank");
    };

    resultDiv.appendChild(card);
  });
}
