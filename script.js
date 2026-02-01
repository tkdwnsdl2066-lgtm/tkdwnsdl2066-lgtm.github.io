console.log('kakao services:', kakao.maps.services);

function getMyLocation() {
    console.log("버튼 클릭됨");

    if (!navigator.geolocation) {
        alert("위치 정보를 지원하지 않는 브라우저입니다.");
        return;
    }

    const statusEl = document.getElementById("status");
    statusEl.innerText = "📡 위치 가져오는 중...";

    navigator.geolocation.getCurrentPosition(
        (position) => {
            console.log("위치 성공", position.coords);

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            kakao.maps.load(() => {
                if (!kakao.maps.services) {
                    alert("카카오 장소 서비스가 로드되지 않았습니다.");
                    return;
                }
                searchRestaurants(lat, lng);
            });
        },
        (error) => {
            console.log("위치 실패", error);
            alert("위치 권한을 허용해주세요.");
        }
    );
}

function searchRestaurants(lat, lng) {
    const ps = new kakao.maps.services.Places();
    const location = new kakao.maps.LatLng(lat, lng);

    ps.categorySearch(
        'FD6', // 음식점
        function (data, status) {
            if (status !== kakao.maps.services.Status.OK) {
                alert('검색 실패');
                return;
            }

            if (data.length === 0) {
                alert("주변 음식점이 없습니다.");
                return;
            }

            // 리스트 섞기
            const shuffled = data.sort(() => Math.random() - 0.5);

            // 랜덤 추천 하나 선택
            const random = shuffled[Math.floor(Math.random() * shuffled.length)];

            // 추천 음식점은 마지막에 넣기
            const listWithoutRandom = shuffled.filter(p => p.id !== random.id);
            listWithoutRandom.push(random);

            displayPlaceList(listWithoutRandom, random);
        },
        {
            location: location,
            radius: 500,
            size: 15
        }
    );
}

// 전체 음식점 리스트 표시 + 마지막 카드에 추천
function displayPlaceList(places, randomPlace) {
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "";

    places.forEach((place) => {
        const card = document.createElement("div");
        card.className = "card";
        card.style.cursor = "pointer";

        let categoryText = place.category_name ? `(${place.category_name.split('>')[1].trim()})` : "";

        card.innerHTML = `
            <h2>${place.place_name} ${categoryText}</h2>
            <p>거리: ${place.distance}m</p>
        `;

        card.addEventListener("click", () => {
            window.open(place.place_url, "_blank");
        });

        resultDiv.appendChild(card);
    });

    // 추천 식당 모달 띄우기
    showRecommendModal(randomPlace);

    // ✅ 여기서 버튼 변경
    changeToBackButton();
}

// 추천 식당 모달 관련
function showRecommendModal(place) {
    const modal = document.getElementById("recommendModal");
    const span = modal.querySelector(".close");

    document.getElementById("modalPlaceName").innerText = place.place_name;
    const categoryText = place.category_name ? place.category_name.split('>')[1].trim() : '';
    document.getElementById("modalCategory").innerText = categoryText;
    document.getElementById("modalDistance").innerText = `거리: ${place.distance}m`;
    const link = document.getElementById("modalMapLink");
    link.href = place.place_url;

    modal.style.display = "block";

    // 닫기 버튼
    span.onclick = function() {
        modal.style.display = "none";
    }

    // 모달 밖 클릭하면 닫기
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

function changeToBackButton() {
    const btn = document.getElementById("actionButton");
    btn.innerText = "처음으로 돌아가기";
    btn.onclick = () => {
        window.location.href = "/guide.html";
    };
}

document.getElementById("modalCategory").innerText =
  `${categoryText} · 영업 여부는 카카오맵에서 확인`;

// 영업 가능성 높은 식당만 필터링
const filtered = data.filter(place => {
    return (
        place.phone &&               // 전화번호 있음
        place.place_url &&           // 카카오 장소 페이지 있음
        place.category_name &&       // 카테고리 명확
        place.distance               // 거리 정보 있음
    );
});

if (filtered.length === 0) {
    alert("현재 영업 중인 식당을 찾기 어렵습니다.");
    return;
}

// 리스트 섞기
const shuffled = filtered.sort(() => Math.random() - 0.5);

// 랜덤 추천
const random = shuffled[Math.floor(Math.random() * shuffled.length)];

function getSelectedCategories() {
  const checked = document.querySelectorAll(
    '.category-item input:checked'
  );

  return Array.from(checked).map(cb => cb.value);
}

function getSearchConfigs(selected) {
  const configs = [];

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
        configs.push({ type: 'category', value: 'CE7', keyword: '카페' });
        break;
      case 'bar':
        configs.push({ type: 'category', value: 'CE7' });
        break;
    }
  });

  return configs;
}

function getMyLocation() {
  if (!navigator.geolocation) {
    alert('위치 정보를 지원하지 않는 브라우저입니다.');
    return;
  }

  navigator.geolocation.getCurrentPosition(position => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    searchPlaces(lat, lng);
  });
}

function searchPlaces(lat, lng) {
  const selected = getSelectedCategories();
  const configs = getSearchConfigs(selected);

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

    if (config.type === 'category') {
      ps.categorySearch(
        config.value,
        callback,
        {
          location: new kakao.maps.LatLng(lat, lng),
          radius: 1000
        }
      );
    } else {
      ps.keywordSearch(
        config.value,
        callback,
        {
          location: new kakao.maps.LatLng(lat, lng),
          radius: 1000
        }
      );
    }
  });
}

function recommendRandom(places) {
  if (!places.length) {
    alert('조건에 맞는 식당이 없어요 😢');
    return;
  }

  const randomPlace =
    places[Math.floor(Math.random() * places.length)];

  showRecommendModal(randomPlace);
  changeToBackButton();
}
