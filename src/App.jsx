import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

// ====== SUPABASE 클라이언트 ======
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ====== 유틸리티 함수 ======
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
const CATS = ['🥛 유제품', '🥩 육류', '🥦 채소', '🍎 과일', '🐟 수산물', '🧀 가공식품', '🥚 계란', '🍶 음료', '기타']

// ====== 공통 스타일 ======
const S = {
  app: {
    maxWidth: 430, margin: '0 auto', minHeight: '100dvh',
    background: '#f5f5f5', display: 'flex', flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif'
  },
  header: {
    background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.1)',
    padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8,
    position: 'sticky', top: 0, zIndex: 10, flexShrink: 0
  },
  content: { flex: 1, padding: 14, overflowY: 'auto', paddingBottom: 80 },
  nav: {
    background: '#fff', borderTop: '0.5px solid rgba(0,0,0,0.1)',
    display: 'flex', position: 'fixed', bottom: 0, left: '50%',
    transform: 'translateX(-50%)', width: '100%', maxWidth: 430, zIndex: 10
  },
  navBtn: {
    flex: 1, padding: '8px 0 12px', border: 'none', background: 'none',
    cursor: 'pointer', fontSize: 10, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 3, fontFamily: 'inherit'
  },
  card: {
    background: '#fff', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.1)',
    padding: '14px 16px', marginBottom: 12
  },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '0.5px solid rgba(0,0,0,0.2)', fontSize: 16,
    background: '#fff', boxSizing: 'border-box', outline: 'none',
    WebkitAppearance: 'none'
  },
  btnPrimary: {
    padding: '13px', borderRadius: 8, border: 'none', background: '#111',
    color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500,
    fontFamily: 'inherit'
  },
  btnSecondary: {
    padding: '13px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.2)',
    background: 'none', cursor: 'pointer', fontSize: 14, color: '#666',
    fontFamily: 'inherit'
  }
}

// ====== 제품 카드 ======
function PCard({ p, alertDays, onDel, onQty }) {
  const dd = getDday(p.expiryDate)
  const consumed = p.quantity === 0
  const expired = !consumed && dd < 0
  const urgent = !consumed && !expired && dd <= alertDays

  let cs, bs, bl
  if (consumed) {
    cs = { background: '#f5f5f5', border: '0.5px solid rgba(0,0,0,0.08)' }
    bs = { color: '#999', background: '#f0f0f0', border: '0.5px solid rgba(0,0,0,0.1)' }
    bl = '소진됨'
  } else if (expired) {
    cs = { background: '#FCEBEB', border: '0.5px solid #F7C1C1' }
    bs = { color: '#A32D2D', background: '#FCEBEB', border: '0.5px solid #F7C1C1' }
    bl = `만료 ${Math.abs(dd)}일 경과`
  } else if (urgent) {
    cs = { background: '#FFFDF7', border: '0.5px solid #FAC775' }
    bs = { color: '#854F0B', background: '#FAEEDA', border: '0.5px solid #FAC775' }
    bl = dd === 0 ? 'D-day' : `D-${dd}`
  } else {
    cs = { background: '#fff', border: '0.5px solid rgba(0,0,0,0.1)' }
    bs = { color: '#666', background: '#f5f5f5', border: '0.5px solid rgba(0,0,0,0.1)' }
    bl = `D-${dd}`
  }

  return (
    <div style={{ ...cs, borderRadius: 12, padding: '10px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, opacity: consumed ? 0.6 : 1 }}>
      {p.category && <span style={{ fontSize: 18, flexShrink: 0 }}>{p.category.split(' ')[0]}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 14, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: consumed ? 'line-through' : 'none' }}>{p.name}</div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{fmtDate(p.expiryDate)}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <button onClick={() => onQty(p.id, Math.max(0, p.quantity - 1))}
          style={{ width: 24, height: 24, borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.2)', background: 'none', cursor: 'pointer', fontSize: 15, color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
        <span style={{ fontSize: 13, fontWeight: 500, minWidth: 18, textAlign: 'center', color: '#111' }}>{p.quantity}</span>
        <button onClick={() => onQty(p.id, p.quantity + 1)}
          style={{ width: 24, height: 24, borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.2)', background: 'none', cursor: 'pointer', fontSize: 15, color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
      </div>
      <div style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0, ...bs }}>{bl}</div>
      <button onClick={() => onDel(p.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#ccc', flexShrink: 0, display: 'flex', fontSize: 15 }}>
        <i className="ti ti-trash" aria-hidden="true" />
      </button>
    </div>
  )
}

// ====== 홈 탭 ======
function HomeTab({ products, alertDays, onDel, onQty, onGoAdd }) {
  if (products === null) return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#aaa' }}>
      <i className="ti ti-loader-2" style={{ fontSize: 36, display: 'block', marginBottom: 12 }} aria-hidden="true" />
      <div style={{ fontSize: 14 }}>불러오는 중...</div>
    </div>
  )

  const expired = products.filter(p => p.quantity > 0 && getDday(p.expiryDate) < 0).sort((a, b) => getDday(a.expiryDate) - getDday(b.expiryDate))
  const urgent = products.filter(p => { const d = getDday(p.expiryDate); return p.quantity > 0 && d >= 0 && d <= alertDays }).sort((a, b) => getDday(a.expiryDate) - getDday(b.expiryDate))
  const good = products.filter(p => getDday(p.expiryDate) > alertDays && p.quantity > 0).sort((a, b) => getDday(a.expiryDate) - getDday(b.expiryDate))
  const consumed = products.filter(p => p.quantity === 0)
  const warn = [...expired, ...urgent]

  if (!products.length) return (
    <div style={{ textAlign: 'center', padding: '60px 16px' }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>🧊</div>
      <div style={{ fontSize: 15, fontWeight: 500, color: '#111', marginBottom: 6 }}>냉장고가 비어있어요</div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>아래 + 버튼으로 제품을 등록해보세요</div>
      <button onClick={onGoAdd} style={{ ...S.btnPrimary, padding: '11px 24px' }}>첫 제품 등록</button>
    </div>
  )

  return (
    <div>
      {warn.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#854F0B', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 13 }} aria-hidden="true" />주의 필요 ({warn.length}개)
          </div>
          {warn.map(p => <PCard key={p.id} p={p} alertDays={alertDays} onDel={onDel} onQty={onQty} />)}
        </div>
      )}
      {good.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#666', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-package" style={{ fontSize: 13 }} aria-hidden="true" />전체 목록 ({good.length}개)
          </div>
          {good.map(p => <PCard key={p.id} p={p} alertDays={alertDays} onDel={onDel} onQty={onQty} />)}
        </div>
      )}
      {consumed.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#aaa', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ti ti-checks" style={{ fontSize: 13 }} aria-hidden="true" />소진됨 ({consumed.length}개)
          </div>
          {consumed.map(p => <PCard key={p.id} p={p} alertDays={alertDays} onDel={onDel} onQty={onQty} />)}
        </div>
      )}
    </div>
  )
}

// ====== 등록 탭 ======
function AddTab({ onAdd, onCancel }) {
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', quantity: 1, expiryDate: '', category: '' })
  const vRef = useRef(null)
  const stRef = useRef(null)
  const rfRef = useRef(null)

  const stop = () => {
    if (rfRef.current) cancelAnimationFrame(rfRef.current)
    if (stRef.current) { stRef.current.getTracks().forEach(t => t.stop()); stRef.current = null }
    setScanning(false)
  }
  useEffect(() => () => stop(), [])

  const startScan = async () => {
    if (!('BarcodeDetector' in window)) {
      alert('바코드 스캔은 크롬(안드로이드) 또는 사파리(iOS 17+)에서 지원됩니다.\n수동으로 입력해주세요.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      stRef.current = stream
      setScanning(true)
      setTimeout(async () => {
        if (!vRef.current) return
        vRef.current.srcObject = stream
        await vRef.current.play()
        const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'upc_a'] })
        const scan = async () => {
          if (!vRef.current || !stRef.current) return
          try {
            const codes = await det.detect(vRef.current)
            if (codes.length > 0) {
              const bc = codes[0].rawValue
              stop(); setLoading(true)
              try {
                const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${bc}?fields=product_name,product_name_ko,categories_tags`)
                const d = await r.json()
                if (d.status === 1) {
                  const pr = d.product
                  setForm(f => ({ ...f, name: pr.product_name_ko || pr.product_name || `바코드: ${bc}`, category: catFromTags(pr.categories_tags) }))
                } else {
                  setForm(f => ({ ...f, name: `바코드: ${bc}` }))
                }
              } catch { setForm(f => ({ ...f, name: `바코드: ${bc}` })) }
              setLoading(false); return
            }
          } catch { }
          rfRef.current = requestAnimationFrame(scan)
        }
        rfRef.current = requestAnimationFrame(scan)
      }, 100)
    } catch { alert('카메라 접근 권한을 허용해주세요.') }
  }

  const catFromTags = (tags = []) => {
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

  const submit = () => {
    if (!form.name.trim()) { alert('제품명을 입력해주세요'); return }
    if (!form.expiryDate) { alert('유통기한을 입력해주세요'); return }
    onAdd({ ...form, name: form.name.trim(), quantity: Math.max(1, parseInt(form.quantity) || 1) })
  }

  if (scanning) return (
    <div>
      <div style={{ borderRadius: 12, overflow: 'hidden', background: '#000', height: 260, marginBottom: 14, position: 'relative' }}>
        <video ref={vRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ width: '65%', height: 100, border: '2.5px solid rgba(255,255,255,0.85)', borderRadius: 8, boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }} />
        </div>
        <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>바코드를 네모 안에 맞춰주세요</div>
      </div>
      <button onClick={stop} style={{ ...S.btnSecondary, width: '100%' }}>취소</button>
    </div>
  )

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 500, color: '#111', marginBottom: 2 }}>제품 등록</div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>냉장고에 넣은 제품을 등록해주세요</div>

      <button onClick={startScan}
        style={{ width: '100%', padding: '14px', borderRadius: 12, border: '1.5px dashed rgba(0,0,0,0.2)', background: '#f9f9f9', cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, boxSizing: 'border-box' }}>
        <i className="ti ti-scan" style={{ fontSize: 28, color: '#185FA5', flexShrink: 0 }} aria-hidden="true" />
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>바코드 스캔</div>
          <div style={{ fontSize: 11, color: '#888' }}>카메라로 스캔 → 제품명 자동 입력</div>
        </div>
      </button>

      {loading && <div style={{ textAlign: 'center', fontSize: 12, color: '#888', marginBottom: 12, padding: 8 }}>제품 정보를 불러오는 중...</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>제품명 *</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="예: 우유, 된장, 삼겹살" style={S.input} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>수량</label>
            <input type="number" value={form.quantity} min="1"
              onChange={e => setForm({ ...form, quantity: e.target.value })} style={S.input} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>카테고리</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              style={{ ...S.input, height: 42 }}>
              <option value="">선택 안함</option>
              {CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>유통기한 *</label>
          <input type="date" value={form.expiryDate}
            onChange={e => setForm({ ...form, expiryDate: e.target.value })} style={S.input} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
        <button onClick={onCancel} style={{ ...S.btnSecondary, flex: 1 }}>취소</button>
        <button onClick={submit} style={{ ...S.btnPrimary, flex: 2 }}>등록하기</button>
      </div>
    </div>
  )
}

// ====== 설정 탭 ======
function SettingsTab({ alertDays, onAlertChange, householdId }) {
  const [copied, setCopied] = useState(false)
  const shareLink = `${window.location.origin}?h=${householdId}`

  const copy = () => {
    navigator.clipboard.writeText(shareLink)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) })
      .catch(() => alert(shareLink))
  }

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 500, color: '#111', marginBottom: 14 }}>설정</div>

      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#111', marginBottom: 2 }}>유통기한 임박 알림 기준</div>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 14 }}>이 기간 이내 제품에 경고 표시됩니다</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <input type="range" min="1" max="14" step="1" value={alertDays}
            onChange={e => onAlertChange(Number(e.target.value))}
            style={{ flex: 1, accentColor: '#111', height: 4 }} />
          <span style={{ fontSize: 16, fontWeight: 500, color: '#111', minWidth: 46, textAlign: 'right' }}>{alertDays}일 전</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#bbb', marginTop: 5 }}>
          <span>1일</span><span>7일</span><span>14일</span>
        </div>
      </div>

      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#111', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="ti ti-users" style={{ fontSize: 15 }} aria-hidden="true" />가족 초대 링크
        </div>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>
          이 링크를 가족에게 공유하면 실시간으로 같은 냉장고를 함께 관리합니다
        </div>
        <div style={{ background: '#f5f5f5', borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#555', marginBottom: 12, wordBreak: 'break-all', border: '0.5px solid rgba(0,0,0,0.1)', lineHeight: 1.5 }}>
          {shareLink}
        </div>
        <button onClick={copy}
          style={{ width: '100%', padding: '11px', borderRadius: 8, border: '0.5px solid rgba(0,0,0,0.2)', background: copied ? '#EAF3DE' : 'none', cursor: 'pointer', color: copied ? '#3B6D11' : '#111', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: 'inherit', fontWeight: copied ? 500 : 400 }}>
          <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} style={{ fontSize: 16 }} aria-hidden="true" />
          {copied ? '링크 복사됨!' : '링크 복사하기'}
        </button>
      </div>

      <div style={{ background: '#f5f5f5', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>우리 집 코드</div>
          <div style={{ fontSize: 22, fontWeight: 500, color: '#111', letterSpacing: 4 }}>#{householdId}</div>
        </div>
        <i className="ti ti-home" style={{ fontSize: 34, color: '#ccc' }} aria-hidden="true" />
      </div>

      <div style={{ background: '#E6F1FB', borderRadius: 10, padding: '12px 14px', border: '0.5px solid #B5D4F4' }}>
        <div style={{ fontSize: 12, color: '#185FA5', lineHeight: 1.7 }}>
          <i className="ti ti-device-mobile" style={{ fontSize: 13, marginRight: 4 }} aria-hidden="true" />
          <strong>홈 화면에 추가하기:</strong><br />
          아이폰: 사파리 → 공유 → 홈 화면에 추가<br />
          갤럭시: 크롬 → 메뉴 → 홈 화면에 추가
        </div>
      </div>
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

  useEffect(() => { init() }, [])

  const init = async () => {
    try {
      const params = new URLSearchParams(window.location.search)
      const urlCode = params.get('h')
      const savedCode = localStorage.getItem('householdId')
      const code = urlCode || savedCode || genCode()

      // 가구 생성 또는 확인
      const { data: existing } = await supabase
        .from('households').select('id').eq('id', code).maybeSingle()

      if (!existing) {
        await supabase.from('households').insert({ id: code })
      }

      localStorage.setItem('householdId', code)
      setHouseholdId(code)

      // 저장된 알림 기준일 불러오기
      const savedDays = localStorage.getItem(`alertDays_${code}`)
      if (savedDays) setAlertDays(Number(savedDays))

      await fetchProducts(code)
    } catch (e) {
      console.error(e)
      setAppError('서버 연결에 실패했습니다.\nVercel 환경변수(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)를 확인해주세요.')
    }
  }

  const fetchProducts = async (hid) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('household_id', hid)
      .order('expiry_date', { ascending: true })

    if (!error && data) {
      setProducts(data.map(p => ({ ...p, expiryDate: p.expiry_date, addedAt: p.added_at })))
    } else {
      setProducts([])
    }
  }

  // 실시간 동기화
  useEffect(() => {
    if (!householdId) return
    const ch = supabase.channel(`products:${householdId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'products',
        filter: `household_id=eq.${householdId}`
      }, () => fetchProducts(householdId))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [householdId])

  const addProduct = async (p) => {
    const row = {
      id: genId(), household_id: householdId,
      name: p.name, quantity: p.quantity,
      expiry_date: p.expiryDate, category: p.category
    }
    const { error } = await supabase.from('products').insert(row)
    if (!error) {
      setProducts(prev => [...(prev || []), { ...row, expiryDate: p.expiryDate, addedAt: new Date().toISOString() }])
    }
    setTab('home')
  }

  const deleteProduct = async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) setProducts(prev => prev.filter(p => p.id !== id))
  }

  const updateQty = async (id, quantity) => {
    if (quantity < 0) return
    const { error } = await supabase.from('products')
      .update({ quantity, updated_at: new Date().toISOString() }).eq('id', id)
    if (!error) setProducts(prev => prev.map(p => p.id === id ? { ...p, quantity } : p))
  }

  const updateAlertDays = (d) => {
    setAlertDays(d)
    localStorage.setItem(`alertDays_${householdId}`, d)
  }

  const TABS = [
    { id: 'home', icon: 'ti-home', lbl: '홈' },
    { id: 'add', icon: 'ti-plus', lbl: '등록' },
    { id: 'settings', icon: 'ti-settings', lbl: '설정' }
  ]

  if (appError) return (
    <div style={{ ...S.app, alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 44, marginBottom: 16 }}>⚠️</div>
      <div style={{ fontSize: 14, color: '#A32D2D', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{appError}</div>
    </div>
  )

  return (
    <div style={S.app}>
      {/* 헤더 */}
      <div style={S.header}>
        <span style={{ fontSize: 20 }}>🧊</span>
        <span style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>우리집 냉장고</span>
        <div style={{ marginLeft: 'auto', fontSize: 10, color: '#999', background: '#f0f0f0', padding: '2px 9px', borderRadius: 20, border: '0.5px solid rgba(0,0,0,0.1)', letterSpacing: 1.5, fontWeight: 500 }}>
          #{householdId}
        </div>
      </div>

      {/* 콘텐츠 */}
      <div style={S.content}>
        {tab === 'home' && <HomeTab products={products} alertDays={alertDays} onDel={deleteProduct} onQty={updateQty} onGoAdd={() => setTab('add')} />}
        {tab === 'add' && <AddTab onAdd={addProduct} onCancel={() => setTab('home')} />}
        {tab === 'settings' && <SettingsTab alertDays={alertDays} onAlertChange={updateAlertDays} householdId={householdId} />}
      </div>

      {/* 하단 탭 바 */}
      <div style={S.nav}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ ...S.navBtn, color: tab === t.id ? '#111' : '#bbb', borderTop: tab === t.id ? '2px solid #111' : '2px solid transparent', marginTop: -1 }}>
            <i className={`ti ${t.icon}`} style={{ fontSize: 22 }} aria-hidden="true" />
            {t.lbl}
          </button>
        ))}
      </div>
    </div>
  )
}
