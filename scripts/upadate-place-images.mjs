import fs from "node:fs";
import path from "node:path";

const REST_KEY = process.env.KAKAO_REST_API_KEY;
if (!REST_KEY) {
  console.error("❌ Missing env: KAKAO_REST_API_KEY");
  process.exit(1);
}

const ROOT = process.cwd();
const SEED_PATH = path.join(ROOT, "data", "seed_places.json");
const OUT_PATH = path.join(ROOT, "data", "place_images.json");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalize(s = "") {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[()［\]【】\[\]{}]/g, "")
    .trim();
}

// key는 "식당명|지역" (프론트에서도 동일 로직 사용)
function makeKey(name, area) {
  return `${normalize(name)}|${normalize(area)}`;
}

// Daum 이미지 검색 호출
async function searchImage(query) {
  const url =
    "https://dapi.kakao.com/v2/search/image?sort=accuracy&size=10&query=" +
    encodeURIComponent(query);

  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${REST_KEY}` },
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${t}`);
  }

  const json = await res.json();
  return json?.documents || [];
}

// “세련/정확”을 위해 대충 이런 것들 제외(로고/아이콘/지도/배너 등)
function pickBest(docs) {
  const badSite = /(위키|wikipedia|나무위키|namu|pinterest)/i;
  const badUrl = /(logo|icon|map|banner|poster|emblem|sign|메뉴판)/i;

  const candidates = docs
    .filter((d) => d?.thumbnail_url && d?.image_url)
    .filter((d) => !badSite.test(d.display_sitename || ""))
    .filter((d) => !badUrl.test(d.image_url || ""))
    .filter((d) => (d.width || 0) >= 300 && (d.height || 0) >= 200);

  // 가장 큰 이미지 우선(대충 면적 기준)
  candidates.sort(
    (a, b) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0)
  );

  return candidates[0] || null;
}

async function main() {
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf-8"));

  const out = {
    updated_at: new Date().toISOString(),
    images: {},
  };

  for (const item of seed) {
    const name = item?.name?.trim();
    const area = (item?.area || "").trim();
    if (!name) continue;

    const key = makeKey(name, area);
    const query = area ? `${name} ${area} 음식점` : `${name} 음식점`;

    try {
      const docs = await searchImage(query);
      const best = pickBest(docs);

      if (best) {
        out.images[key] = {
          name,
          area,
          query,
          // 프론트에서는 thumbnail_url 쓰고,
          // 모달 크게 볼 땐 image_url 써도 됨
          thumbnail_url: best.thumbnail_url,
          image_url: best.image_url,
          site: best.display_sitename || "",
        };
        console.log("✅", query, "=>", best.display_sitename);
      } else {
        console.log("⚠️ No good image:", query);
      }
    } catch (e) {
      console.log("❌ Error:", query, e.message);
    }

    // 호출 제한 대비(너무 빡세게 돌리면 안 좋아서)
    await sleep(250);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), "utf-8");
  console.log("✅ wrote", OUT_PATH);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
