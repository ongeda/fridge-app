import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ====== 유틸 ======
const genId = () => (window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 11))
const genCode = () => {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join('')
}
const getDday = (s) => {
  const t = new Date(); t.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(s) - t) / 86400000)
}
const fmtDate = (s) => s ? s.replace(/-/g, '.') : ''
const urlB64ToUint8 = (b64) => {
  const pad = '='.repeat((4 - b64.length % 4) % 4)
  const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)))
}

const CATS = ['🥛 유제품', '🥩 육류', '🥦 채소', '🍎 과일', '🐟 수산물', '🧀 가공식품', '🥚 계란', '🍶 음료', '기타']
const REMAIN_PRESETS = [
  { label: '새 제품', value: 100 },
  { label: '3/4', value: 75 },
  { label: '절반', value: 50 },
  { label: '1/4', value: 25 },
  { label: '거의 없음', value: 10 },
]

// ====== 공통 스타일 ======
const S = {
  app: { maxWidth: 430, margin: '0 auto', minHeight: '100dvh', background: '#f5f5f5', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif' },
  header: { background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.1)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 },
  content: { flex: 1, padding: 14, overflowY: 'auto', paddingBottom: 80 },
  nav: { background: '#fff', borderTop: '0.5px solid rgba(0,0,0,0.1)', display: 'flex', position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, zIndex: 10 },
  navBtn: { flex: 1, padding: '8px 0 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontFamily: 'inherit' },
  card: { background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.1)', padding: '14px 16px', marginBottom: 12 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.2)', fontSize: 16, background: '#fff', boxSizing: 'border-box', outline: 'none' },
  btnPrimary: { padding: '13px', borderRadius: 8, border: 'none', background: '#111', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'inherit' },
  btnSecondary: { padding: '13px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.2)', background: 'none', cursor: 'pointer', fontSize: 14, color: '#666', fontFamily: 'inherit' },
}

// 잔량 색상
const remainColor = (r) => {
  if (r === 0) return { bar: '#ccc', text: '#999' }
  if (r <= 25) return { bar: '#F7C1C1', text: '#A32D2D' }
  if (r <= 50) return { bar: '#FAC775', text: '#854F0B' }
  return { bar: '#C0DD97', text: '#3B6D11' }
}

// ====== 제품 카드 ======
function PCard({ p, alertDays, onDel, onQty, onEdit }) {
  const dd = getDday(p.expiryDate)
  const isPercent = p.quantity_type === 'percent'
  const isEmpty = isPercent ? (p.remaining ?? 100) === 0 : p.quantity === 0
  const expired = !isEmpty && dd < 0
  const urgent = !isEmpty && !expired && dd <= alertDays

  // 카드 배경/테두리
  let cs, ddStyle, ddLabel
  if (isEmpty) {
    cs = { background: '#f5f5f5', border: '0.5px solid rgba(0,0,0,0.08)' }
    ddStyle = { color: '#999', background: '#f0f0f0', border: '0.5px solid rgba(0,0,0,0.1)' }; ddLabel = '소진됨'
  } else if (expired) {
    cs = { background: '#FCEBEB', border: '0.5px solid #F7C1C1' }
    ddStyle = { color: '#A32D2D', background: '#FCEBEB', border: '0.5px solid #F7C1C1' }; ddLabel = `만료 ${Math.abs(dd)}일 경과`
  } else if (urgent) {
    cs = { background: '#FFFDF7', border: '0.5px solid #FAC775' }
    ddStyle = { color: '#854F0B', background: '#FAEEDA', border: '0.5px solid #FAC775' }; ddLabel = dd === 0 ? 'D-day' : `D-${dd}`
  } else {
    cs = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)' }
    ddStyle = { color: '#666', background: '#f5f5f5', border: '0.5px solid rgba(0,0,0,0.1)' }; ddLabel = `D-${dd}`
  }

  const remaining = p.remaining ?? 100
  const rc = remainColor(remaining)
  const storageBadge = p.storage === '냉동'
    ? { bg: '#E6EEF9', color: '#1A4D8F', label: '🧊 냉동' }
    : { bg: '#E6F1FB', color: '#185FA5', label: '❄️ 냉장' }

  return (
    <div style={{ ...cs, borderRadius: 12, padding: '10px 12px', marginBottom: 8, opacity: isEmpty ? 0.6 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* 카테고리 이모지 */}
        {p.category
          ? <span style={{ fontSize: 18, flexShrink: 0 }}>{p.category.split(' ')[0]}</span>
          : <span style={{ fontSize: 18, flexShrink: 0 }}>{p.storage === '냉동' ? '🧊' : '❄️'}</span>
        }

        {/* 이름 + 날짜 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontWeight: 500, fontSize: 14, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: isEmpty ? 'line-through' : 'none' }}>{p.name}</span>
            <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 5px', borderRadius: 20, flexShrink: 0, background: storageBadge.bg, color: storageBadge.color }}>{storageBadge.label}</span>
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{fmtDate(p.expiryDate)}</div>
        </div>

        {/* 수량 or 잔량 */}
        {isPercent ? (
          <div style={{ fontSize: 13, fontWeight: 500, color: rc.text, flexShrink: 0 }}>{remaining}%</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <button onClick={() => onQty(p.id, Math.max(0, p.quantity - 1))} style={{ width: 24, height: 24, borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.2)', background: 'none', cursor: 'pointer', fontSize: 15, color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
            <span style={{ fontSize: 13, fontWeight: 500, minWidth: 18, textAlign: 'center', color: '#111' }}>{p.quantity}</span>
            <button onClick={() => onQty(p.id, p.quantity + 1)} style={{ width: 24, height: 24, borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.2)', background: 'none', cursor: 'pointer', fontSize: 15, color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
          </div>
        )}

        {/* D-day */}
        <div style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0, ...ddStyle }}>{ddLabel}</div>

        {/* 수정 / 삭제 */}
        <button onClick={() => onEdit(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#aaa', flexShrink: 0, display: 'flex' }}>
          <i className="ti ti-pencil" style={{ fontSize: 14 }} aria-hidden="true" />
        </button>
        <button onClick={() => onDel(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#ccc', flexShrink: 0, display: 'flex' }}>
          <i className="ti ti-trash" style={{ fontSize: 14 }} aria-hidden="true" />
        </button>
      </div>

      {/* 잔량 바 */}
      {isPercent && !isEmpty && (
        <div style={{ marginTop: 8, marginLeft: 26 }}>
          <div style={{ height: 4, background: 'rgba(0,0,0,0.07)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${remaining}%`, background: rc.bar, borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ====== 홈 탭 ======
function HomeTab({ products, alertDays, onDel, onQty, onEdit, onGoAdd, onRefresh, syncing }) {
  const [storageFilter, setStorageFilter] = useState('전체')

  const filtered = products
    ? (storageFilter === '전체' ? products : products.filter(p => (p.storage ?? '냉장') === storageFilter))
    : null

  const isEmpty = (p) => (p.quantity_type === 'percent' ? (p.remaining ?? 100) === 0 : p.quantity === 0)

  const expired = filtered?.filter(p => !isEmpty(p) && getDday(p.expiryDate) < 0).sort((a, b) => getDday(a.expiryDate) - getDday(b.expiryDate)) ?? []
  const urgent = filtered?.filter(p => { const d = getDday(p.expiryDate); return !isEmpty(p) && d >= 0 && d <= alertDays }).sort((a, b) => getDday(a.expiryDate) - getDday(b.expiryDate)) ?? []
  const good = filtered?.filter(p => getDday(p.expiryDate) > alertDays && !isEmpty(p)).sort((a, b) => getDday(a.expiryDate) - getDday(b.expiryDate)) ?? []
  const consumed = filtered?.filter(isEmpty) ?? []
  const warn = [...expired, ...urgent]

  if (products === null) return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#aaa' }}>
      <i className="ti ti-loader-2" style={{ fontSize: 36, display: 'block', marginBottom: 12 }} aria-hidden="true" />
      <div style={{ fontSize: 14 }}>불러오는 중...</div>
    </div>
  )

  return (
    <div>
      {/* 냉장/냉동 필터 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {['전체', '냉장', '냉동'].map(f => (
          <button key={f} onClick={() => setStorageFilter(f)}
            style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: storageFilter === f ? 500 : 400, background: storageFilter === f ? '#111' : '#fff', color: storageFilter === f ? '#fff' : '#888', transition: 'all 0.15s' }}>
            {f === '전체' ? '전체' : f === '냉장' ? '❄️ 냉장' : '🧊 냉동'}
          </button>
        ))}
      </div>

      {!products.length ? (
        <div style={{ textAlign: 'center', padding: '50px 16px' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🧊</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#111', marginBottom: 6 }}>냉장고가 비어있어요</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>아래 + 버튼으로 제품을 등록해보세요</div>
          <button onClick={onGoAdd} style={{ ...S.btnPrimary, padding: '11px 24px' }}>첫 제품 등록</button>
        </div>
      ) : (
        <>
          {/* 동기화 상태 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 10, gap: 8 }}>
            <span style={{ fontSize: 11, color: syncing ? '#185FA5' : '#bbb', display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className={`ti ${syncing ? 'ti-loader-2' : 'ti-circle-check'}`} style={{ fontSize: 12 }} aria-hidden="true" />
              {syncing ? '동기화 중...' : '동기화됨'}
            </span>
            <button onClick={onRefresh} style={{ background: 'none', border: '0.5px solid rgba(0,0,0,0.15)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 11, color: '#666', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
              <i className="ti ti-refresh" style={{ fontSize: 12 }} aria-hidden="true" />새로고침
            </button>
          </div>

          {warn.length > 0 && <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#854F0B', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 13 }} aria-hidden="true" />주의 필요 ({warn.length}개)
            </div>
            {warn.map(p => <PCard key={p.id} p={p} alertDays={alertDays} onDel={onDel} onQty={onQty} onEdit={onEdit} />)}
          </div>}

          {good.length > 0 && <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-package" style={{ fontSize: 13 }} aria-hidden="true" />전체 목록 ({good.length}개)
            </div>
            {good.map(p => <PCard key={p.id} p={p} alertDays={alertDays} onDel={onDel} onQty={onQty} onEdit={onEdit} />)}
          </div>}

          {consumed.length > 0 && <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#aaa', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-checks" style={{ fontSize: 13 }} aria-hidden="true" />소진됨 ({consumed.length}개)
            </div>
            {consumed.map(p => <PCard key={p.id} p={p} alertDays={alertDays} onDel={onDel} onQty={onQty} onEdit={onEdit} />)}
          </div>}
        </>
      )}
    </div>
  )
}

// ====== 공용 제품 폼 (등록/수정 공통) ======
function ProductForm({ initial, onSubmit, onCancel, submitLabel, submitting, showScan = false }) {
  const [form, setForm] = useState({
    name: '',
    storage: '냉장',
    category: '',
    expiryDate: '',
    quantityType: 'count',
    quantity: 1,
    remaining: 100,
    ...initial,
  })
  const [scanning, setScanning] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const vRef = useRef(null); const stRef = useRef(null); const rfRef = useRef(null)

  const stopScan = () => {
    if (rfRef.current) cancelAnimationFrame(rfRef.current)
    if (stRef.current) { stRef.current.getTracks().forEach(t => t.stop()); stRef.current = null }
    setScanning(false)
  }
  useEffect(() => () => stopScan(), [])

  const startScan = async () => {
    if (!('BarcodeDetector' in window)) { alert('크롬(안드로이드) 또는 사파리(iOS 17+)에서 이용해주세요.'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      stRef.current = stream; setScanning(true)
      setTimeout(async () => {
        if (!vRef.current) return
        vRef.current.srcObject = stream; await vRef.current.play()
        const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'upc_a'] })
        const scan = async () => {
          if (!vRef.current || !stRef.current) return
          try {
            const codes = await det.detect(vRef.current)
            if (codes.length > 0) {
              const bc = codes[0].rawValue; stopScan(); setLookingUp(true)
              try {
                const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${bc}?fields=product_name,product_name_ko,categories_tags`)
                const d = await r.json()
                if (d.status === 1) { const pr = d.product; setForm(f => ({ ...f, name: pr.product_name_ko || pr.product_name || `바코드: ${bc}`, category: catTag(pr.categories_tags) })) }
                else { setForm(f => ({ ...f, name: `바코드: ${bc}` })) }
              } catch { setForm(f => ({ ...f, name: `바코드: ${bc}` })) }
              setLookingUp(false); return
            }
          } catch { }
          rfRef.current = requestAnimationFrame(scan)
        }
        rfRef.current = requestAnimationFrame(scan)
      }, 100)
    } catch { alert('카메라 접근 권한을 허용해주세요.') }
  }

  const catTag = (tags = []) => {
    if (!tags) return ''
    if (tags.some(t => /milk|dairy/.test(t))) return '🥛 유제품'
    if (tags.some(t => /meat|beef|pork|chicken/.test(t))) return '🥩 육류'
    if (tags.some(t => /vegetable/.test(t))) return '🥦 채소'
    if (tags.some(t => /fruit/.test(t))) return '🍎 과일'
    if (tags.some(t => /fish|seafood/.test(t))) return '🐟 수산물'
    if (tags.some(t => /egg/.test(t))) return '🥚 계란'
    if (tags.some(t => /beverage|drink/.test(t))) return '🍶 음료'
    return '🧀 가공식품'
  }

  const submit = async () => {
    if (!form.name.trim()) { alert('제품명을 입력해주세요'); return }
    if (!form.expiryDate) { alert('유통기한을 입력해주세요'); return }
    await onSubmit({ ...form, name: form.name.trim(), quantity: Math.max(0, parseInt(form.quantity) || 0) })
  }

  const rc = remainColor(form.remaining)

  if (scanning) return (
    <div>
      <div style={{ borderRadius: 12, overflow: 'hidden', background: '#000', height: 260, marginBottom: 14, position: 'relative' }}>
        <video ref={vRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: '65%', height: 100, border: '2.5px solid rgba(255,255,255,0.85)', borderRadius: 8, boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }} />
        </div>
        <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>바코드를 네모 안에 맞춰주세요</div>
      </div>
      <button onClick={stopScan} style={{ ...S.btnSecondary, width: '100%' }}>취소</button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* 바코드 스캔 (등록 시만) */}
      {showScan && (
        <button onClick={startScan} style={{ width: '100%', padding: '13px', borderRadius: 12, border: '1.5px dashed rgba(0,0,0,0.2)', background: '#f9f9f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, boxSizing: 'border-box' }}>
          <i className="ti ti-scan" style={{ fontSize: 26, color: '#185FA5', flexShrink: 0 }} aria-hidden="true" />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>바코드 스캔</div>
            <div style={{ fontSize: 11, color: '#888' }}>카메라로 스캔 → 제품명 자동 입력</div>
          </div>
        </button>
      )}
      {lookingUp && <div style={{ textAlign: 'center', fontSize: 12, color: '#888' }}>제품 정보를 불러오는 중...</div>}

      {/* 냉장 / 냉동 선택 */}
      <div>
        <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6 }}>보관 위치</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['냉장', '냉동'].map(s => (
            <button key={s} onClick={() => setForm({ ...form, storage: s })}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1.5px solid ${form.storage === s ? '#111' : 'rgba(0,0,0,0.15)'}`, background: form.storage === s ? '#111' : '#fff', color: form.storage === s ? '#fff' : '#666', cursor: 'pointer', fontSize: 14, fontWeight: form.storage === s ? 500 : 400, fontFamily: 'inherit' }}>
              {s === '냉장' ? '❄️ 냉장' : '🧊 냉동'}
            </button>
          ))}
        </div>
      </div>

      {/* 제품명 */}
      <div>
        <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>제품명 *</label>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="예: 우유, 된장, 삼겹살" style={S.input} />
      </div>

      {/* 카테고리 + 유통기한 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>카테고리</label>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ ...S.input, height: 42 }}>
            <option value="">선택 안함</option>
            {CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>유통기한 *</label>
          <input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} style={S.input} />
        </div>
      </div>

      {/* 수량 유형 토글 */}
      <div>
        <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6 }}>수량 방식</label>
        <div style={{ display: 'flex', background: '#f0f0f0', borderRadius: 8, padding: 3, gap: 3 }}>
          {[['count', '개수'], ['percent', '잔량 (%)']].map(([val, label]) => (
            <button key={val} onClick={() => setForm({ ...form, quantityType: val })}
              style={{ flex: 1, padding: '8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: form.quantityType === val ? 500 : 400, background: form.quantityType === val ? '#fff' : 'transparent', color: form.quantityType === val ? '#111' : '#888', boxShadow: form.quantityType === val ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 개수 입력 */}
      {form.quantityType === 'count' && (
        <div>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>수량</label>
          <input type="number" value={form.quantity} min="0" onChange={e => setForm({ ...form, quantity: e.target.value })} style={S.input} />
        </div>
      )}

      {/* 잔량 % 입력 */}
      {form.quantityType === 'percent' && (
        <div>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 8 }}>잔량</label>
          {/* 빠른 선택 버튼 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {REMAIN_PRESETS.map(p => (
              <button key={p.value} onClick={() => setForm({ ...form, remaining: p.value })}
                style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `1.5px solid ${form.remaining === p.value ? '#111' : 'rgba(0,0,0,0.15)'}`, background: form.remaining === p.value ? '#111' : '#fff', color: form.remaining === p.value ? '#fff' : '#666', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: form.remaining === p.value ? 500 : 400 }}>
                {p.label}
              </button>
            ))}
          </div>
          {/* 슬라이더 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input type="range" min="0" max="100" step="5" value={form.remaining}
              onChange={e => setForm({ ...form, remaining: Number(e.target.value) })}
              style={{ flex: 1, accentColor: rc.bar, height: 4 }} />
            <span style={{ fontSize: 16, fontWeight: 500, color: rc.text, minWidth: 42, textAlign: 'right' }}>{form.remaining}%</span>
          </div>
          {/* 잔량 바 미리보기 */}
          <div style={{ marginTop: 8, height: 6, background: 'rgba(0,0,0,0.07)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${form.remaining}%`, background: rc.bar, borderRadius: 3, transition: 'width 0.2s' }} />
          </div>
        </div>
      )}

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button onClick={onCancel} style={{ ...S.btnSecondary, flex: 1 }}>취소</button>
        <button onClick={submit} disabled={submitting}
          style={{ ...S.btnPrimary, flex: 2, opacity: submitting ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {submitting ? <><i className="ti ti-loader-2" style={{ fontSize: 16 }} aria-hidden="true" />저장 중...</> : submitLabel}
        </button>
      </div>
    </div>
  )
}

// ====== 등록 탭 ======
function AddTab({ onAdd }) {
  const [submitting, setSubmitting] = useState(false)
  const handleSubmit = async (form) => {
    setSubmitting(true)
    try { await onAdd(form) } finally { setSubmitting(false) }
  }
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 500, color: '#111', marginBottom: 2 }}>제품 등록</div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>냉장고에 넣은 제품을 등록해주세요</div>
      <ProductForm onSubmit={handleSubmit} onCancel={() => { }} submitLabel="등록하기" submitting={submitting} showScan={true} />
    </div>
  )
}

// ====== 설정 탭 ======
function SettingsTab({ alertDays, onAlertChange, householdId }) {
  const [copied, setCopied] = useState(false)
  const [pushStatus, setPushStatus] = useState('loading')
  const [pushLoading, setPushLoading] = useState(false)
  const shareLink = `${window.location.origin}?h=${householdId}`
  useEffect(() => { checkPush() }, [])
  const checkPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { setPushStatus('unsupported'); return }
    if (Notification.permission === 'denied') { setPushStatus('denied'); return }
    try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); setPushStatus(sub ? 'on' : 'off') } catch { setPushStatus('off') }
  }
  const enablePush = async () => {
    setPushLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setPushStatus('denied'); return }
      const reg = await navigator.serviceWorker.ready
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
      if (!vapidKey) { alert('VITE_VAPID_PUBLIC_KEY 환경변수가 설정되지 않았습니다'); return }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(vapidKey) })
      await supabase.from('push_subscriptions').insert({ household_id: householdId, subscription: sub.toJSON() })
      setPushStatus('on')
    } catch (e) { alert('알림 설정 실패: ' + e.message) } finally { setPushLoading(false) }
  }
  const disablePush = async () => {
    setPushLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const endpoint = sub.endpoint; await sub.unsubscribe()
        const { data: subs } = await supabase.from('push_subscriptions').select('id, subscription').eq('household_id', householdId)
        const match = subs?.find(s => s.subscription?.endpoint === endpoint)
        if (match) await supabase.from('push_subscriptions').delete().eq('id', match.id)
      }
      setPushStatus('off')
    } catch (e) { console.error(e) } finally { setPushLoading(false) }
  }
  const copy = () => { navigator.clipboard.writeText(shareLink).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) }).catch(() => alert(shareLink)) }
  const PushRow = () => {
    if (pushStatus === 'loading') return <div style={{ fontSize: 13, color: '#aaa' }}>알림 상태 확인 중...</div>
    if (pushStatus === 'unsupported') return <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.6 }}>이 브라우저는 푸시 알림을 지원하지 않습니다.</div>
    if (pushStatus === 'denied') return <div style={{ fontSize: 12, color: '#A32D2D', lineHeight: 1.6 }}>알림 권한이 거부되었습니다. 기기 설정에서 허용해주세요.</div>
    if (pushStatus === 'on') return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 8, height: 8, borderRadius: 4, background: '#3B6D11' }} /><span style={{ fontSize: 13, color: '#3B6D11', fontWeight: 500 }}>알림 켜짐 (매일 오전 9시)</span></div>
        <button onClick={disablePush} disabled={pushLoading} style={{ fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px' }}>{pushLoading ? '처리 중...' : '끄기'}</button>
      </div>
    )
    return <button onClick={enablePush} disabled={pushLoading} style={{ width: '100%', padding: '11px', borderRadius: 8, border: 'none', background: '#111', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: pushLoading ? 0.6 : 1 }}><i className="ti ti-bell" style={{ fontSize: 16 }} aria-hidden="true" />{pushLoading ? '설정 중...' : '이 기기에서 알림 받기'}</button>
  }
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 500, color: '#111', marginBottom: 14 }}>설정</div>
      <div style={S.card}><div style={{ fontSize: 13, fontWeight: 500, color: '#111', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}><i className="ti ti-bell" style={{ fontSize: 15 }} aria-hidden="true" />푸시 알림</div><div style={{ fontSize: 11, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>유통기한 임박 제품을 매일 오전 9시에 알려드립니다.<br />가족 각자의 폰에서 개별로 설정해주세요.</div><PushRow /></div>
      <div style={S.card}><div style={{ fontSize: 13, fontWeight: 500, color: '#111', marginBottom: 2 }}>유통기한 임박 기준</div><div style={{ fontSize: 11, color: '#888', marginBottom: 14 }}>이 기간 이내 제품에 경고 표시 및 알림을 보냅니다</div><div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><input type="range" min="1" max="14" step="1" value={alertDays} onChange={e => onAlertChange(Number(e.target.value))} style={{ flex: 1, accentColor: '#111', height: 4 }} /><span style={{ fontSize: 16, fontWeight: 500, color: '#111', minWidth: 46, textAlign: 'right' }}>{alertDays}일 전</span></div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#bbb', marginTop: 5 }}><span>1일</span><span>7일</span><span>14일</span></div></div>
      <div style={S.card}><div style={{ fontSize: 13, fontWeight: 500, color: '#111', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}><i className="ti ti-users" style={{ fontSize: 15 }} aria-hidden="true" />가족 초대 링크</div><div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>이 링크를 공유하면 실시간으로 같은 냉장고를 관리합니다</div><div style={{ background: '#f5f5f5', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#555', marginBottom: 12, wordBreak: 'break-all', border: '0.5px solid rgba(0,0,0,0.1)', lineHeight: 1.5 }}>{shareLink}</div><button onClick={copy} style={{ width: '100%', padding: '11px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.2)', background: copied ? '#EAF3DE' : 'none', cursor: 'pointer', color: copied ? '#3B6D11' : '#111', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'inherit', fontWeight: copied ? 500 : 400 }}><i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} style={{ fontSize: 16 }} aria-hidden="true" />{copied ? '링크 복사됨!' : '링크 복사하기'}</button></div>
      <div style={{ background: '#E6F1FB', borderRadius: 10, padding: '12px 14px', border: '0.5px solid #B5D4F4' }}><div style={{ fontSize: 12, color: '#185FA5', lineHeight: 1.7 }}><i className="ti ti-device-mobile" style={{ fontSize: 13, marginRight: 4 }} aria-hidden="true" /><strong>홈 화면에 추가:</strong><br />아이폰: 사파리 → 공유 → 홈 화면에 추가<br />갤럭시: 크롬 → 메뉴(⋮) → 홈 화면에 추가</div></div>
    </div>
  )
}

// ====== 메인 앱 ======
export default function App() {
  const [tab, setTab] = useState('home')
  const [products, setProducts] = useState(null)
  const [alertDays, setAlertDays] = useState(3)
  const [householdId, setHouseholdId] = useState('')
  const [appError, setAppError] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null) // 수정 중인 제품
  const hidRef = useRef('')

  const fetchProducts = useCallback(async (hid) => {
    const id = hid || hidRef.current
    if (!id) return
    setSyncing(true)
    try {
      const { data, error } = await supabase.from('products').select('*').eq('household_id', id).order('expiry_date')
      if (!error && data) setProducts(data.map(p => ({ ...p, expiryDate: p.expiry_date, addedAt: p.added_at })))
    } finally { setSyncing(false) }
  }, [])

  const init = useCallback(async () => {
    try {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('h') || localStorage.getItem('householdId') || genCode()
      const { data: existing } = await supabase.from('households').select('id').eq('id', code).maybeSingle()
      if (!existing) await supabase.from('households').insert({ id: code })
      localStorage.setItem('householdId', code)
      hidRef.current = code; setHouseholdId(code)
      const saved = localStorage.getItem(`alertDays_${code}`)
      if (saved) setAlertDays(Number(saved))
      await fetchProducts(code)
    } catch (e) { console.error(e); setAppError('서버 연결에 실패했습니다.\nVercel 환경변수를 확인해주세요.') }
  }, [fetchProducts])

  useEffect(() => { init() }, [init])

  useEffect(() => {
    if (!householdId) return
    const ch = supabase.channel('products-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        const changedHid = payload.new?.household_id || payload.old?.household_id
        if (changedHid === hidRef.current) fetchProducts(hidRef.current)
      }).subscribe()
    return () => supabase.removeChannel(ch)
  }, [householdId, fetchProducts])

  useEffect(() => {
    if (!householdId) return
    const t = setInterval(() => fetchProducts(hidRef.current), 10000)
    return () => clearInterval(t)
  }, [householdId, fetchProducts])

  useEffect(() => {
    const fn = () => { if (document.visibilityState === 'visible' && hidRef.current) fetchProducts(hidRef.current) }
    document.addEventListener('visibilitychange', fn)
    return () => document.removeEventListener('visibilitychange', fn)
  }, [fetchProducts])

  // 제품 등록
  const addProduct = async (form) => {
    const row = {
      id: genId(), household_id: hidRef.current,
      name: form.name, storage: form.storage, category: form.category,
      expiry_date: form.expiryDate,
      quantity_type: form.quantityType,
      quantity: form.quantityType === 'count' ? form.quantity : 1,
      remaining: form.quantityType === 'percent' ? form.remaining : 100,
    }
    const { error } = await supabase.from('products').insert(row)
    if (error) { alert('등록에 실패했습니다.\n오류: ' + error.message); return }
    await fetchProducts(hidRef.current)
    setTab('home')
  }

  // 제품 수정 저장
  const saveProduct = async (form) => {
    if (!editingProduct) return
    const updates = {
      name: form.name, storage: form.storage, category: form.category,
      expiry_date: form.expiryDate,
      quantity_type: form.quantityType,
      quantity: form.quantityType === 'count' ? form.quantity : editingProduct.quantity,
      remaining: form.quantityType === 'percent' ? form.remaining : 100,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('products').update(updates).eq('id', editingProduct.id)
    if (error) { alert('수정에 실패했습니다.\n오류: ' + error.message); return }
    await fetchProducts(hidRef.current)
    setEditingProduct(null)
  }

  const deleteProduct = async (id) => {
    await supabase.from('products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  const updateQty = async (id, quantity) => {
    if (quantity < 0) return
    await supabase.from('products').update({ quantity, updated_at: new Date().toISOString() }).eq('id', id)
    setProducts(prev => prev.map(p => p.id === id ? { ...p, quantity } : p))
  }

  const updateAlertDays = (d) => { setAlertDays(d); localStorage.setItem(`alertDays_${hidRef.current}`, d) }

  const TABS = [{ id: 'home', icon: 'ti-home', lbl: '홈' }, { id: 'add', icon: 'ti-plus', lbl: '등록' }, { id: 'settings', icon: 'ti-settings', lbl: '설정' }]

  if (appError) return (
    <div style={{ ...S.app, alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 44, marginBottom: 16 }}>⚠️</div>
      <div style={{ fontSize: 14, color: '#A32D2D', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{appError}</div>
    </div>
  )

  return (
    <div style={S.app}>
      <div style={S.header}>
        <span style={{ fontSize: 20 }}>🧊</span>
        <span style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>우리집 냉장고</span>
        <div style={{ marginLeft: 'auto', fontSize: 10, color: '#999', background: '#f0f0f0', padding: '2px 9px', borderRadius: 20, border: '0.5px solid rgba(0,0,0,0.1)', letterSpacing: 1.5, fontWeight: 500 }}>#{householdId}</div>
      </div>

      <div style={S.content}>
        {tab === 'home' && <HomeTab products={products} alertDays={alertDays} onDel={deleteProduct} onQty={updateQty} onEdit={setEditingProduct} onGoAdd={() => setTab('add')} onRefresh={() => fetchProducts(hidRef.current)} syncing={syncing} />}
        {tab === 'add' && <AddTab onAdd={addProduct} />}
        {tab === 'settings' && <SettingsTab alertDays={alertDays} onAlertChange={updateAlertDays} householdId={householdId} />}
      </div>

      <div style={S.nav}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ ...S.navBtn, color: tab === t.id ? '#111' : '#bbb', borderTop: tab === t.id ? '2px solid #111' : '2px solid transparent', marginTop: -1 }}>
            <i className={`ti ${t.icon}`} style={{ fontSize: 22 }} aria-hidden="true" />{t.lbl}
          </button>
        ))}
      </div>

      {/* 수정 오버레이 — 수정 버튼(✏️) 누르면 등장 */}
      {editingProduct && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#f5f5f5', overflowY: 'auto', maxWidth: 430, left: '50%', transform: 'translateX(-50%)' }}>
          <div style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.1)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 10 }}>
            <button onClick={() => setEditingProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#666', display: 'flex' }}>
              <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true" />
            </button>
            <span style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>제품 수정</span>
          </div>
          <div style={{ padding: 16 }}>
            <ProductForm
              initial={{
                name: editingProduct.name,
                storage: editingProduct.storage ?? '냉장',
                category: editingProduct.category ?? '',
                expiryDate: editingProduct.expiryDate,
                quantityType: editingProduct.quantity_type ?? 'count',
                quantity: editingProduct.quantity,
                remaining: editingProduct.remaining ?? 100,
              }}
              onSubmit={saveProduct}
              onCancel={() => setEditingProduct(null)}
              submitLabel="수정 저장"
              showScan={false}
            />
          </div>
        </div>
      )}
    </div>
  )
}
