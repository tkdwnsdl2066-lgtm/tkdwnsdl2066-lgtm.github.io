window.__LB_PLACE_IMAGE_MAP__ = null;

function __lbNormalize(s = "") {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[()［\]【】\[\]{}]/g, "")
    .trim();
}
function __lbMakeKey(name, area) {
  return `${__lbNormalize(name)}|${__lbNormalize(area)}`;
}

async function loadPlaceImages() {
  if (window.__LB_PLACE_IMAGE_MAP__) return window.__LB_PLACE_IMAGE_MAP__;
  try {
    const res = await fetch("./data/place_images.json", { cache: "no-store" });
    window.__LB_PLACE_IMAGE_MAP__ = await res.json();
  } catch (e) {
    window.__LB_PLACE_IMAGE_MAP__ = { images: {} };
  }
  return window.__LB_PLACE_IMAGE_MAP__;
}

function getPlaceImage(place) {
  const name = place?.place_name || place?.name || "";
  const area =
    place?.region_3depth_name ||
    place?.road_address_name ||
    place?.address_name ||
    "";

  const key = __lbMakeKey(name, area);
  const hit = window.__LB_PLACE_IMAGE_MAP__?.images?.[key];
  if (!hit) return null;

  return { thumb: hit.thumbnail_url, full: hit.image_url, site: hit.site };
}

window.LBPlaceImages = { loadPlaceImages, getPlaceImage };
