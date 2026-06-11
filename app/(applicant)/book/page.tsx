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
  const [selectedSlots, setSelectedSlots] = useState<any[]>([]) // 복수 선택
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

  // 날짜별 그룹핑
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

  function toggleSlot(slot: any) {
    const exists = selectedSlots.find(s => s.start_at === slot.start_at)
    if (exists) {
      setSelectedSlots(selectedSlots.filter(s => s.start_at !== slot.start_at))
    } else {
      setSelectedSlots([...selectedSlots, slot])
    }
  }

  function isSelected(slot: any) {
    return !!selectedSlots.find(s => s.start_at === slot.start_at)
  }

  async function handleSubmit() {
    if (selectedSlots.length === 0) return
    setSubmitting(true)
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ token, requested_slots: selectedSlots }),
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
          가능한 시간을 모두 선택해주세요. 담당 PD 일정 확인 후 확정 안내드립니다.
        </div>

        {error && <div style={{background:'#fef2f2',color:'#991b1b',padding:'10px 14px',borderRadius:'8px',fontSize:'13px',marginBottom:'12px'}}>{error}</div>}

        {slots.length === 0 && !error && (
          <div style={{textAlign:'center',color:'#aaa',fontSize:'13px',padding:'40px 0'}}>현재 예약 가능한 시간이 없습니다.</div>
        )}

        {/* 날짜 탭 */}
        {dates.length > 0 && (
          <div style={{marginBottom:'16px'}}>
            <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'12px'}}>
              {dates.map(date => {
                const checkedCount = slotsByDate[date].filter(s => isSelected(s)).length
                return (
                  <button key={date} onClick={() => setSelectedDate(selectedDate === date ? '' : date)}
                    style={{
                      fontSize:'12px', padding:'6px 12px', borderRadius:'20px', cursor:'pointer',
                      border:`1px solid ${selectedDate===date?'#10b981':'#e5e7eb'}`,
                      background: selectedDate===date ? '#f0fdf4' : '#fff',
                      color: selectedDate===date ? '#065f46' : '#444',
                      fontWeight: checkedCount > 0 ? 500 : 400,
                    }}>
                    {new Date(slotsByDate[date][0].start_at).toLocaleDateString('ko-KR', {
                      timeZone:'Asia/Seoul', month:'numeric', day:'numeric', weekday:'short'
                    })}
                    {checkedCount > 0 && <span style={{marginLeft:'4px',color:'#10b981'}}>({checkedCount})</span>}
                  </button>
                )
              })}
            </div>

            {/* 선택된 날짜의 시간 목록 */}
            {selectedDate && (
              <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                {slotsByDate[selectedDate].map((slot:any) => {
                  const t = new Date(slot.start_at).toLocaleTimeString('ko-KR', {
                    timeZone:'Asia/Seoul', hour:'2-digit', minute:'2-digit'
                  })
                  const sel = isSelected(slot)
                  return (
                    <button key={slot.start_at} onClick={() => toggleSlot(slot)}
                      style={{
                        fontSize:'13px', padding:'7px 14px', borderRadius:'8px', cursor:'pointer',
                        border:`1px solid ${sel?'#10b981':'#e5e7eb'}`,
                        background: sel ? '#f0fdf4' : '#fff',
                        color: sel ? '#065f46' : '#444',
                      }}>
                      {sel && '✓ '}{t}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* 선택된 슬롯 요약 */}
        {selectedSlots.length > 0 && (
          <div style={{background:'#f0fdf4',borderRadius:'8px',padding:'10px 14px',marginBottom:'12px'}}>
            <div style={{fontSize:'12px',color:'#065f46',marginBottom:'6px',fontWeight:500}}>
              선택된 희망 시간 {selectedSlots.length}개
            </div>
            {selectedSlots
              .sort((a,b) => a.start_at.localeCompare(b.start_at))
              .map(slot => (
                <div key={slot.start_at} style={{fontSize:'12px',color:'#065f46',display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
                  <span>{new Date(slot.start_at).toLocaleString('ko-KR', {timeZone:'Asia/Seoul', month:'numeric', day:'numeric', weekday:'short', hour:'2-digit', minute:'2-digit'})}</span>
                  <span style={{cursor:'pointer',color:'#aaa'}} onClick={() => toggleSlot(slot)}>✕</span>
                </div>
              ))}
          </div>
        )}

        {/* 제출 */}
        <div style={{background:'#f3f4f6',borderRadius:'8px',padding:'12px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:'13px',color:'#666'}}>
            {selectedSlots.length > 0 ? `${selectedSlots.length}개 시간 선택됨` : '시간을 선택해주세요'}
          </span>
          <button onClick={handleSubmit} disabled={selectedSlots.length === 0 || submitting}
            style={{background:'#111',color:'#fff',border:'none',borderRadius:'8px',padding:'8px 16px',fontSize:'13px',cursor:'pointer',opacity:(selectedSlots.length===0||submitting)?0.4:1}}>
            {submitting ? '처리 중...' : '예약 요청'}
          </button>
        </div>
      </div>
    </div>
  )
}
