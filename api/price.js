// 네이버 쇼핑 검색 오픈 API로 '같은 물건'의 최저가를 찾아 주는 함수. 광고·제휴 링크가 아니에요.
// 키는 Vercel 환경 변수 NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 에 넣어 두세요 (코드에 직접 적지 마세요).
// 키가 없으면 { ok:false } 를 돌려주고, 앱은 최저가 숫자 없이 비교 링크만 보여 줘요.
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const id = process.env.NAVER_CLIENT_ID, secret = process.env.NAVER_CLIENT_SECRET;
  const q = String(req.query?.q || '').trim().slice(0, 60);
  const target = Number(req.query?.p) || 0;
  if (!id || !secret || !q) return res.status(200).end(JSON.stringify({ ok: false, reason: !q ? 'no-query' : 'no-key' }));
  try {
    const r = await fetch(`https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(q)}&display=40&sort=sim`, {
      headers: { 'X-Naver-Client-Id': id, 'X-Naver-Client-Secret': secret },
    });
    const items = (await r.json())?.items || [];
    const strip = s => String(s || '').replace(/<[^>]+>/g, '');
    const best = items
      .map(it => ({ title: strip(it.title), price: Number(it.lprice) || 0, mall: strip(it.mallName), link: it.link, type: Number(it.productType) }))
      // 새 상품(가격비교·일반)만, 그리고 목표가의 절반 아래는 케이스 같은 액세서리로 보고 빼요.
      .filter(it => it.price > 0 && it.type >= 1 && it.type <= 3 && (!target || it.price >= target * 0.5))
      .sort((a, b) => a.price - b.price)[0];
    if (!best) throw new Error('empty');
    return res.status(200).end(JSON.stringify({ ok: true, source: '네이버 쇼핑', ...best }));
  } catch (e) {
    return res.status(200).end(JSON.stringify({ ok: false, reason: 'fetch-failed' }));
  }
};
