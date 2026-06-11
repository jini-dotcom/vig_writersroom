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
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setError('접속 토큰이 없습니다.'); setLoading(false); return }
    fetch(`/api/slots?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setApplicant(data.applicant)
        setSlots(data.slots || [])
      })
      .catch(() => setError('불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [token])

  // 날짜별로 슬롯 그룹핑
  const slotsByDate: Record<string, any[]> = {}
  for (const slot of slots) {
    const date = new Date(slot.start_at).toLocaleDateString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    })
    if (!slotsByDate[date]) slotsByDate[date] = []
    slotsByDate[date].push(slot)
  }
  const dates = Object.keys(slotsByDate)

  function handleDateSelect(date: string) {
    setSelectedDate(date)
    setSelectedSlot(null)
  }

  async function handleSubmit() {
    if (!selectedSlot) return
    setSubmitting(true)
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ token, start_at: selectedSlot.start_at, end_at: selectedSlot.end_at }),
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

        {slots.length === 0 && !error && (
          <div style={{textAlign:'center',color:'#aaa',fontSize:'13px',padding:'40px 0'}}>현재 예약 가능한 시간이 없습니다.</div>
        )}

        {/* 날짜 선택 */}
        {dates.length > 0 && (
          <div style={{marginBottom:'16px'}}>
            <div style={{fontSize:'12px',color:'#888',marginBottom:'8px'}}>날짜 선택</div>
            <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
              {dates.map(date => (
                <div key={date} onClick={() => handleDateSelect(date)}
                  style={{
                    border:`1px solid ${selectedDate===date?'#10b981':'#e5e7eb'}`,
                    borderRadius:'8px',padding:'12px 14px',cursor:'pointer',
                    background:selectedDate===date?'#f0fdf4':'#fff',
                    display:'flex',justifyContent:'space-between',alignItems:'center'
                  }}>
                  <span style={{fontSize:'14px',fontWeight:'500'}}>{date}</span>
                  <span style={{fontSize:'12px',color:'#888'}}>{slotsByDate[date].length}개 가능</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 시간 선택 드롭다운 */}
        {selectedDate && (
          <div style={{marginBottom:'16px'}}>
            <div style={{fontSize:'12px',color:'#888',marginBottom:'8px'}}>시간 선택</div>
            <select
              value={selectedSlot?.start_at ?? ''}
              onChange={e => {
                const slot = slotsByDate[selectedDate].find((s:any) => s.start_at === e.target.value)
                setSelectedSlot(slot ?? null)
              }}
              style={{width:'100%',padding:'10px 12px',fontSize:'14px',borderRadius:'8px',border:'1px solid #e5e7eb',background:'#fff',cursor:'pointer'}}
            >
              <option value=''>시간을 선택해주세요</option>
              {slotsByDate[selectedDate].map((slot:any) => {
                const t = new Date(slot.start_at).toLocaleTimeString('ko-KR', {
                  timeZone:'Asia/Seoul', hour:'2-digit', minute:'2-digit'
                })
                return <option key={slot.start_at} value={slot.start_at}>{t}</option>
              })}
            </select>
          </div>
        )}

        {/* 확정 바 */}
        <div style={{background:'#f3f4f6',borderRadius:'8px',padding:'12px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'8px'}}>
          <span style={{fontSize:'13px',color:'#666'}}>
            {selectedSlot
              ? new Date(selectedSlot.start_at).toLocaleString('ko-KR', {timeZone:'Asia/Seoul'})
              : '시간을 선택해주세요'}
          </span>
          <button onClick={handleSubmit} disabled={!selectedSlot || submitting}
            style={{background:'#111',color:'#fff',border:'none',borderRadius:'8px',padding:'8px 16px',fontSize:'13px',cursor:'pointer',opacity:(!selectedSlot||submitting)?0.4:1}}>
            {submitting ? '처리 중...' : '예약 요청'}
          </button>
        </div>
      </div>
    </div>
  )
}
