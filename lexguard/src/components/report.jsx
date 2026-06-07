// Builds a printable audit report into #print-report, then App calls window.print()
export function buildReport({ laws, stats, catName }){
  const el = document.getElementById('print-report')
  if(!el) return
  const today = new Date().toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'})
  const byCat = {}
  laws.forEach(l=>{ (byCat[l.cat]=byCat[l.cat]||[]).push(l) })
  const catRows = Object.keys(byCat).sort().map(c=>{
    let r=0,m=0; byCat[c].forEach(l=>l.reqs.forEach(x=>{r++;if(x.status==='met')m++}))
    const p=r?Math.round(m/r*100):100
    return `<tr><td>${c} — ${catName[c]||''}</td><td style="text-align:center">${byCat[c].length}</td><td style="text-align:center">${r}</td><td style="text-align:center">${m}</td><td style="text-align:center">${r-m}</td><td style="text-align:center;font-weight:700">${p}%</td></tr>`
  }).join('')
  const ncRows = laws.filter(l=>l.status==='bad').flatMap(l=>
    l.reqs.filter(r=>r.status==='unmet').map(r=>
      `<tr><td>${l.code}</td><td>${l.name}</td><td>${r.text}</td><td>${r.note||'-'}</td></tr>`)
  ).join('') || `<tr><td colspan="4" style="text-align:center;color:#2a7">ไม่มีข้อกำหนดที่ยังไม่สอดคล้อง</td></tr>`

  el.innerHTML = `
    <div style="font-family:'Anuphan',sans-serif;color:#16201d;padding:24px;max-width:900px;margin:0 auto">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0071e3;padding-bottom:14px;margin-bottom:20px">
        <div>
          <h1 style="font-size:22px;color:#0071e3;margin:0">รายงานความสอดคล้องด้านกฎหมาย SHE</h1>
          <div style="font-size:13px;color:#555;margin-top:4px">บริษัท จัสเทล เน็ทเวิร์ค จำกัด · เอกสารอ้างอิง F-259 Rev.1</div>
          <div style="font-size:12px;color:#888;margin-top:2px">รอบการประเมิน: รอบที่ 1 (ม.ค.–มี.ค.) ปี 2569 · พิมพ์เมื่อ ${today}</div>
        </div>
        <div style="text-align:center;border:2px solid #0071e3;border-radius:12px;padding:10px 16px">
          <div style="font-size:30px;font-weight:700;color:#0071e3">${stats.pct}%</div>
          <div style="font-size:11px;color:#666">ความสอดคล้องรวม</div>
        </div>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:20px">
        ${[['กฎหมายทั้งหมด',stats.total+' ฉบับ'],['ข้อกำหนดทั้งหมด',stats.req+' ข้อ'],['สอดคล้อง (C)',stats.met+' ข้อ'],['ยังไม่สอดคล้อง (NC)',stats.nc+' ข้อ']]
          .map(([k,v])=>`<div style="flex:1;border:1px solid #ddd;border-radius:10px;padding:12px"><div style="font-size:11px;color:#888">${k}</div><div style="font-size:20px;font-weight:700">${v}</div></div>`).join('')}
      </div>
      <h2 style="font-size:15px;color:#0071e3;margin:0 0 8px">สรุปความสอดคล้องรายหมวด</h2>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:22px">
        <thead><tr style="background:#eaf4ee">
          <th style="text-align:left;padding:8px;border:1px solid #cde">หมวดกฎหมาย</th><th style="padding:8px;border:1px solid #cde">จำนวน</th>
          <th style="padding:8px;border:1px solid #cde">ข้อกำหนด</th><th style="padding:8px;border:1px solid #cde">C</th>
          <th style="padding:8px;border:1px solid #cde">NC</th><th style="padding:8px;border:1px solid #cde">%</th>
        </tr></thead><tbody>${catRows}</tbody>
      </table>
      <h2 style="font-size:15px;color:#c4271d;margin:0 0 8px">รายการที่ยังไม่สอดคล้อง (NC) และแผนการแก้ไข</h2>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:24px">
        <thead><tr style="background:#fbe6e3">
          <th style="text-align:left;padding:8px;border:1px solid #edc">รหัส</th><th style="text-align:left;padding:8px;border:1px solid #edc">กฎหมาย</th>
          <th style="text-align:left;padding:8px;border:1px solid #edc">ข้อกำหนด</th><th style="text-align:left;padding:8px;border:1px solid #edc">หมายเหตุ / แผนแก้ไข</th>
        </tr></thead><tbody>${ncRows}</tbody>
      </table>
      <div style="display:flex;justify-content:space-between;margin-top:50px;font-size:12px;color:#444">
        <div style="text-align:center"><div style="border-top:1px solid #888;width:200px;padding-top:6px">ผู้จัดทำ (จป. วิชาชีพ)</div></div>
        <div style="text-align:center"><div style="border-top:1px solid #888;width:200px;padding-top:6px">ผู้อนุมัติ</div></div>
      </div>
    </div>`
}
