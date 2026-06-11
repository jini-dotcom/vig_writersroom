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
  const [selectedSlots, setSelectedSlots] = useState<any[]>([])
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

  // 슬롯 있는 날짜 Set
  const availableDates = new Set(
    slots.map(s => new Date(s.start_at).toLocaleDateString('ko-KR', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
    }))
  )

  // 날짜별 슬롯 맵
  const slotsByDate: Record<string, any[]> = {}
  for (const slot of slots) {
    const key = new Date(slot.start_at).toLocaleDateString('ko-KR', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
    })
    if (!slotsByDate[key]) slotsByDate[key] = []
    slotsByDate[key].push(slot)
  }

  function toggleSlot(slot: any) {
    const exists = selectedSlots.find(s => s.start_at === slot.start_at)
    if (exists) setSelectedSlots(selectedSlots.filter(s => s.start_at !== slot.start_at))
    else setSelectedSlots([...selectedSlots, slot])
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

  // 달력 렌더링 (6월 고정)
  const year = 2026
  const month = 5 // 0-indexed
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weeks: (number | null)[][] = []
  let week: (number | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d)
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length > 0) weeks.push([...week, ...Array(7 - week.length).fill(null)])

function getDateKey(day: number) {
  const d = new Date(year, month, day)
  return d.toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
  })
}

  function getSelectedCount(day: number) {
    return (slotsByDate[getDateKey(day)] ?? []).filter(s => isSelected(s)).length
  }

  if (loading) return <div style={{padding:'40px',textAlign:'center',color:'#888'}}>불러오는 중...</div>

  return (
    <div style={{minHeight:'100vh',background:'#f9f9f9',padding:'32px 16px'}}>
      <div style={{maxWidth:'480px',margin:'0 auto'}}>
        <div style={{marginBottom:'20px'}}>
          <div style={{fontSize:'13px',color:'#888',marginBottom:'4px'}}>Vigloo Writers Room 2기</div>
          <h1 style={{fontSize:'20px',fontWeight:'500'}}>면접 시간 선택</h1>
          {applicant && <p style={{fontSize:'13px',color:'#888',marginTop:'4px'}}>{applicant.name}님 · {applicant.position}</p>}
        </div>

        <div style={{background:'#f0fdf8',borderRadius:'8px',padding:'10px 14px',fontSize:'12px',color:'#065f46',marginBottom:'20px'}}>
          가능한 날짜를 클릭해서 희망 시간을 선택해주세요. 여러 시간 선택 가능해요.
        </div>

        {error && <div style={{background:'#fef2f2',color:'#991b1b',padding:'10px 14px',borderRadius:'8px',fontSize:'13px',marginBottom:'12px'}}>{error}</div>}

        {/* 달력 */}
        <div style={{background:'#fff',borderRadius:'12px',padding:'16px',border:'1px solid #e5e7eb',marginBottom:'16px'}}>
          <div style={{textAlign:'center',fontWeight:'500',fontSize:'15px',marginBottom:'12px'}}>2026년 6월</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'2px',marginBottom:'6px'}}>
            {['일','월','화','수','목','금','토'].map(d => (
              <div key={d} style={{textAlign:'center',fontSize:'11px',color:'#aaa',padding:'4px 0'}}>{d}</div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'2px',marginBottom:'2px'}}>
              {week.map((day, di) => {
                if (!day) return <div key={di} />
                const key = getDateKey(day)
                const hasSlots = availableDates.has(key)
                const isSelected2 = selectedDate === key
                const selCount = getSelectedCount(day)
                const isPast = new Date(year, month, day) < new Date(new Date().toDateString())
                return (
                  <div key={di}
                    onClick={() => hasSlots && !isPast && setSelectedDate(isSelected2 ? '' : key)}
                    style={{
                      textAlign:'center', padding:'6px 2px', borderRadius:'8px', cursor: hasSlots && !isPast ? 'pointer' : 'default',
                      background: isSelected2 ? '#f0fdf4' : 'transparent',
                      border: isSelected2 ? '1px solid #10b981' : '1px solid transparent',
                      opacity: isPast ? 0.3 : 1,
                      position: 'relative',
                    }}>
                    <div style={{
                      fontSize:'13px', fontWeight: hasSlots && !isPast ? 500 : 400,
                      color: (di === 0 || di === 6) ? '#ccc' : hasSlots && !isPast ? '#111' : '#ccc',
                    }}>{day}</div>
                    {selCount > 0 && (
                      <div style={{width:'6px',height:'6px',background:'#10b981',borderRadius:'50%',margin:'2px auto 0'}} />
                    )}
                    {hasSlots && !isPast && selCount === 0 && (
                      <div style={{width:'4px',height:'4px',background:'#d1fae5',borderRadius:'50%',margin:'2px auto 0'}} />
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* 선택된 날짜의 시간 */}
        {selectedDate && slotsByDate[selectedDate] && (
          <div style={{background:'#fff',borderRadius:'12px',padding:'16px',border:'1px solid #e5e7eb',marginBottom:'16px'}}>
            <div style={{fontSize:'13px',fontWeight:'500',marginBottom:'10px',color:'#065f46'}}>
              {selectedDate} 가능한 시간
            </div>
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
          </div>
        )}

        {/* 선택 요약 */}
        {selectedSlots.length > 0 && (
          <div style={{background:'#f0fdf4',borderRadius:'8px',padding:'10px 14px',marginBottom:'12px'}}>
            <div style={{fontSize:'12px',color:'#065f46',marginBottom:'6px',fontWeight:500}}>
              선택된 희망 시간 {selectedSlots.length}개
            </div>
            {selectedSlots
              .sort((a,b) => a.start_at.localeCompare(b.start_at))
              .map(slot => (
                <div key={slot.start_at} style={{fontSize:'12px',color:'#065f46',display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
                  <span>{new Date(slot.start_at).toLocaleString('ko-KR', {timeZone:'Asia/Seoul',month:'numeric',day:'numeric',weekday:'short',hour:'2-digit',minute:'2-digit'})}</span>
                  <span style={{cursor:'pointer',color:'#aaa'}} onClick={() => toggleSlot(slot)}>✕</span>
                </div>
              ))}
          </div>
        )}

        {/* 제출 */}
        <div style={{background:'#f3f4f6',borderRadius:'8px',padding:'12px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:'13px',color:'#666'}}>
            {selectedSlots.length > 0 ? `${selectedSlots.length}개 시간 선택됨` : '날짜를 선택해주세요'}
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
