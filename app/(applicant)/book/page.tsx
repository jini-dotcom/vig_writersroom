'use client'
import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function BookPage() {
  return (
    <Suspense fallback={<div style={{padding:'40px',textAlign:'center',color:'#888'}}>불러오는 중...</div>}>
      <BookContent />
    </Suspense>
  )
}

function BookContent() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') ?? ''

  const [applicant, setApplicant] = useState<any>(null)
  const [slots, setSlots] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setError('접속 토큰이 없습니다.'); setLoading(false); return }
    fetch(`/api/slots?token=${token}`)
      .then(r => r.json())
      .then(data => { setApplicant(data.applicant); setSlots(data.slots || []) })
      .catch(() => setError('불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit() {
    if (!selected) return
    setSubmitting(true)
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ token, requested_slots: [selected] }),
    })
    if (res.ok) router.push('/done')
    else { const d = await res.json(); setError(d.error) }
    setSubmitting(false)
  }

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:'#888'}}>불러오는 중...</div>

  return (
    <div style={{minHeight:'100vh',background:'#f9f9f9',padding:'32px 16px'}}>
      <div style={{maxWidth:'440px',margin:'0 auto'}}>
        <div style={{marginBottom:'20px'}}>
          <div style={{fontSize:'13px',color:'#888',marginBottom:'4px'}}>Vigloo Writers Room 2기</div>
          <h1 style={{fontSize:'20px',fontWeight:'500'}}>면접 시간 선택</h1>
          {applicant && <p style={{fontSize:'13px',color:'#888',marginTop:'4px'}}>{applicant.name}님 · {applicant.position}</p>}
        </div>
        <div style={{background:'#f0fdf8',borderRadius:'8px',padding:'10px 14px',fontSize:'12px',color:'#065f46',marginBottom:'20px'}}>
          가능한 시간대를 선택해주세요. 담당 PD는 확정 후 이메일로 안내드립니다.
        </div>
        {error && <div style={{background:'#fef2f2',color:'#991b1b',padding:'10px 14px',borderRadius:'8px',fontSize:'13px',marginBottom:'12px'}}>{error}</div>}
        {slots.length === 0 && !error && <div style={{textAlign:'center',color:'#aaa',fontSize:'13px',padding:'40px 0'}}>현재 예약 가능한 시간이 없습니다.</div>}
        {slots.map((slot: any) => {
          const start = new Date(slot.start_at)
          const isSel = selected?.start_at === slot.start_at
          return (
            <div key={slot.start_at} onClick={() => setSelected(slot)}
              style={{border:`1px solid ${isSel?'#10b981':'#e5e7eb'}`,borderRadius:'8px',padding:'12px 14px',marginBottom:'8px',cursor:'pointer',background:isSel?'#f0fdf4':'#fff',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:'14px',fontWeight:'500'}}>{start.toLocaleDateString('ko-KR',{weekday:'long',month:'long',day:'numeric'})}</div>
                <div style={{fontSize:'12px',color:'#888',marginTop:'2px'}}>{start.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</div>
              </div>
              <span style={{fontSize:'12px',color:isSel?'#059669':'#888'}}>{isSel?'✓ 선택됨':'예약 가능'}</span>
            </div>
          )
        })}
        <div style={{background:'#f3f4f6',borderRadius:'8px',padding:'12px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'8px'}}>
          <span style={{fontSize:'13px',color:'#666'}}>{selected?new Date(selected.start_at).toLocaleString('ko-KR'):'시간을 선택해주세요'}</span>
          <button onClick={handleSubmit} disabled={!selected||submitting}
            style={{background:'#111',color:'#fff',border:'none',borderRadius:'8px',padding:'8px 16px',fontSize:'13px',cursor:'pointer',opacity:(!selected||submitting)?0.4:1}}>
            {submitting?'처리 중...':'예약 요청'}
          </button>
        </div>
      </div>
    </div>
  )
}
