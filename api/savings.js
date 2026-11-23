// 금융감독원 파인(FINE) '금융상품한눈에' 적금 오픈 API를 대신 불러 주는 함수.
// 인증키는 Vercel 환경 변수 FSS_API_KEY 에 넣어 두세요 (코드에 직접 적지 마세요).
// 금감원 약관(제9조)상 받은 정보를 저장하면 안 돼서, 열 때마다 실시간으로 물어봐요. (개인 키는 하루 10,000번까지)
module.exports = async (req, res) => {
  const key = process.env.FSS_API_KEY;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!key) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).end(JSON.stringify({ ok: false, reason: 'no-key' }));
  }
  try {
    const url = 'https://finlife.fss.or.kr/finlifeapi/savingProductsSearch.json'
      + `?auth=${encodeURIComponent(key)}&topFinGrpNo=020000&pageNo=1`; // 020000 = 은행
    const r = await fetch(url);
    const data = await r.json();
    const base = data?.result?.baseList || [];
    const opts = data?.result?.optionList || [];
    const best = {};
    for (const o of opts) {
      const rate = Number(o.intr_rate2) || 0;
      if (Number(o.save_trm) !== 12) continue;            // 12개월 상품끼리 비교
      if (!best[o.fin_prdt_cd] || rate > best[o.fin_prdt_cd].max) {
        best[o.fin_prdt_cd] = { max: rate, base: Number(o.intr_rate) || 0, type: o.rsrv_type_nm || '' };
      }
    }
    const items = base
      .filter(b => best[b.fin_prdt_cd])
      .map(b => ({
        bank: b.kor_co_nm, name: b.fin_prdt_nm, join: b.join_way || '',
        rate: best[b.fin_prdt_cd].base, max: best[b.fin_prdt_cd].max, type: best[b.fin_prdt_cd].type, term: 12,
      }))
      .sort((a, b) => b.max - a.max)
      .slice(0, 5);
    if (!items.length) throw new Error('empty');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).end(JSON.stringify({ ok: true, source: '금융감독원 금융상품한눈에', items }));
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).end(JSON.stringify({ ok: false, reason: 'fetch-failed' }));
  }
};
