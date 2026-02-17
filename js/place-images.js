let PLACE_IMAGE_MAP = null;

function normalize(s = "") {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[()［\]【】\[\]{}]/g, "")
    .trim();
}

// seed & action에서 만든 key 규칙과 동일
function makeKey(name, area) {
  return `${normalize(name)}|${normalize(area)}`;
}

export async function loadPlaceImages() {
  if (PLACE_IMAGE_MAP) return PLACE_IMAGE_MAP;
  try {
    const res = await fetch("./data/place_images.json", { cache: "no-store" });
    PLACE_IMAGE_MAP = await res.json();
  } catch (e) {
    PLACE_IMAGE_MAP = { images: {} };
  }
  return PLACE_IMAGE_MAP;
}

export function getPlaceImage(place) {
  // place 객체 구조가 조금 달라도 안전하게 처리
  const name = place?.place_name || place?.name || "";
  const area =
    place?.region_3depth_name ||
    place?.road_address_name ||
    place?.address_name ||
    "";

  const key = makeKey(name, area);

  const hit = PLACE_IMAGE_MAP?.images?.[key];
  if (!hit) return null;

  return {
    thumb: hit.thumbnail_url,
    full: hit.image_url,
    site: hit.site,
  };
}
