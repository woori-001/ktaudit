// 워크라인 → KT 정산검수툴 연동 북마클릿 (원본 소스)
// workline.html 이 이 파일을 읽어 javascript: 링크로 만들어 줍니다.
// 워크라인 CSP(script-src 'self') 때문에 외부 스크립트를 불러올 수 없어 전체 코드를 북마클릿에 넣습니다.
// 흐름: 워크라인 "엑셀저장"과 같은 API로 파일 생성 요청 → 완료 대기 → 1회 다운로드 → 검수툴 창으로 postMessage
(() => {
  const TOOL = 'https://woori-001.github.io/ktaudit/';
  const TOOL_ORIGIN = 'https://woori-001.github.io';
  const KT_IDX = '724';
  if (location.hostname !== 'workline.kr') { alert('워크라인(workline.kr)에 로그인한 화면에서 눌러주세요.'); return; }
  if (document.getElementById('kta-ov')) return;

  const pad = n => String(n).padStart(2, '0');
  const fmt = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dow = (today.getDay() + 6) % 7;
  const lastMon = new Date(today); lastMon.setDate(today.getDate() - dow - 7);
  const lastSun = new Date(lastMon); lastSun.setDate(lastMon.getDate() + 6);

  const ov = document.createElement('div');
  ov.id = 'kta-ov';
  ov.setAttribute('style', 'position:fixed;top:72px;right:24px;z-index:2147483647;width:330px;background:#fff;border:1px solid #d0d5dd;border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.18);font:13px/1.5 -apple-system,"Malgun Gothic",sans-serif;color:#1d2433;padding:16px');
  const inp = 'width:100%;box-sizing:border-box;height:32px;border:1px solid #d0d5dd;border-radius:6px;padding:0 8px;font-size:13px;margin-top:4px';
  ov.innerHTML =
    '<div style="display:flex;align-items:center;margin-bottom:12px"><b style="font-size:14px;color:#E1362B">KT 정산검수툴로 보내기</b><button id="kta-x" style="margin-left:auto;border:0;background:none;font-size:18px;cursor:pointer;color:#888">×</button></div>' +
    '<label style="display:block;margin-bottom:8px">조회 기준<select id="kta-dc" style="' + inp + '"><option value="2">개통일</option><option value="1">접수일</option><option value="4">정산예정</option><option value="5">정산완료</option><option value="6">정산예정(미완료)</option></select></label>' +
    '<div style="display:flex;gap:6px;margin-bottom:8px"><label style="flex:1">시작<input id="kta-f" type="date" style="' + inp + '"></label><label style="flex:1">끝<input id="kta-t" type="date" style="' + inp + '"></label></div>' +
    '<label style="display:flex;align-items:center;gap:6px;margin-bottom:12px"><input id="kta-kt" type="checkbox" checked> KT만 받기 (권장)</label>' +
    '<button id="kta-go" style="width:100%;height:36px;border:0;border-radius:8px;background:#E1362B;color:#fff;font-weight:700;font-size:13px;cursor:pointer">검수툴로 보내기</button>' +
    '<div id="kta-st" style="margin-top:10px;font-size:12px;color:#555;min-height:18px;white-space:pre-wrap"></div>';
  document.body.appendChild(ov);
  const $ = id => ov.querySelector('#' + id);
  $('kta-f').value = fmt(lastMon); $('kta-t').value = fmt(lastSun);
  const st = (t, err) => { const e = $('kta-st'); e.textContent = t; e.style.color = err ? '#E1362B' : '#555'; };
  let busy = false;
  $('kta-x').onclick = () => { if (!busy) ov.remove(); };

  $('kta-go').onclick = async () => {
    if (busy) return;
    const dc = $('kta-dc').value, f = $('kta-f').value, t = $('kta-t').value, kt = $('kta-kt').checked;
    if (!f || !t || f > t) { st('기간을 확인해 주세요.', true); return; }
    // 팝업 차단을 피하려고 클릭 직후 검수툴 창부터 엽니다
    const win = window.open(TOOL, 'ktaudit');
    if (!win) { st('팝업이 차단됐어요. 주소창 오른쪽에서 workline.kr 팝업을 허용한 뒤 다시 눌러주세요.', true); return; }
    busy = true; $('kta-go').disabled = true; $('kta-go').style.opacity = '.6';
    const label = $('kta-dc').selectedOptions[0].textContent + ' ' + f + '~' + t + (kt ? ' (KT)' : '');
    let ready = false, acked = false;
    const onMsg = e => { if (e.origin !== TOOL_ORIGIN || !e.data) return; if (e.data.type === 'ktaudit-ready') ready = true; if (e.data.type === 'ktaudit-ack') acked = true; };
    window.addEventListener('message', onMsg);
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    try {
      const q = new URLSearchParams({ dateChk: dc, dateFrom: f, dateTo: t });
      if (kt) q.set('articleIdx1', KT_IDX);
      st('파일 생성 요청 중…');
      const r = await fetch('/api/exact/calc/export?' + q, { credentials: 'include' });
      if (!r.ok) {
        let m = 'HTTP ' + r.status;
        if (r.status === 413) m = '조회 건수가 너무 많아요. 기간을 줄여 주세요.';
        else if (r.status === 401 || r.status === 403) m = '워크라인 로그인이 필요해요.';
        else { try { const j = await r.json(); if (j && j.error) m = j.error; } catch (_) {} }
        throw new Error(m);
      }
      let job = (await r.json()).job;
      if (!job || !job.jobId) throw new Error('워크라인이 작업 번호를 주지 않았어요.');
      const t0 = Date.now();
      while (job.status !== 'done') {
        if (job.status === 'error' || job.status === 'failed' || job.status === 'canceled') throw new Error(job.error || '파일 생성 실패');
        if (Date.now() - t0 > 10 * 60 * 1000) throw new Error('10분이 지나도 파일이 완성되지 않았어요.');
        st('파일 생성 중… ' + (job.queueAhead ? '대기 ' + job.queueAhead + '건 · ' : '') + (job.doneRows || 0).toLocaleString() + ' / ' + (job.rowCount || 0).toLocaleString() + '행');
        await sleep(1000);
        const pr = await fetch('/api/orders/export-jobs/' + job.jobId, { credentials: 'include' });
        if (pr.ok) job = (await pr.json()).job || job;
      }
      st('파일 받는 중… (' + (job.rowCount || 0).toLocaleString() + '행)');
      const dr = await fetch('/api/orders/export-jobs/' + job.jobId + '/download', { credentials: 'include' });
      if (!dr.ok) throw new Error('파일을 받지 못했어요 (HTTP ' + dr.status + ')');
      const buf = await dr.arrayBuffer();
      const msg = { type: 'ktaudit-file', id: 'wl-' + job.jobId, name: job.fileName || '전체정산관리.xlsx', label, buf };
      st('검수툴로 보내는 중…');
      const t1 = Date.now();
      while (!acked) {
        if (win.closed) throw new Error('검수툴 창이 닫혔어요. 다시 눌러주세요.');
        if (Date.now() - t1 > 60000) throw new Error('검수툴 창이 응답하지 않아요. 검수툴 페이지를 새로 고친 뒤 다시 눌러주세요.');
        if (ready || Date.now() - t1 > 3000) win.postMessage(msg, TOOL_ORIGIN);
        await sleep(700);
      }
      st('✓ ' + (job.rowCount || 0).toLocaleString() + '행을 검수툴로 보냈어요.');
      try { win.focus(); } catch (_) {}
      setTimeout(() => ov.remove(), 2500);
    } catch (e) {
      st('⚠ ' + (e.message || e), true);
    } finally {
      window.removeEventListener('message', onMsg);
      busy = false; $('kta-go').disabled = false; $('kta-go').style.opacity = '1';
    }
  };
})();
