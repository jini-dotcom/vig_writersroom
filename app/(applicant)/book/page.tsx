'use client'
// app/(applicant)/book/page.tsx
// 지원자 면접 시간 선택 페이지

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

interface Slot {
  start_at: string
  end_at: string
}

interface ApplicantInfo {
  name: string
  position: string
}

export default function BookPage() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') ?? ''

  const [applicant, setApplicant] = useState<ApplicantInfo | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [selected, setSelected] = useState<Slot | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setError('접속 토큰이 없습니다. 이메일의 링크를 다시 확인해주세요.'); setLoading(false); return }
    fetchSlots()
  }, [token])

  async function fetchSlots() {
    setLoading(true)
    try {
      const res = await fetch(`/api/slots?token=${token}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setApplicant(data.applicant)
      setSlots(data.slots)
    } catch {
      setError('슬롯을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (!selected) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, start_at: selected.start_at, end_at: selected.end_at }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409) {
          // 다른 사람이 방금 선택 — 슬롯 새로고침
          setError(data.error)
          setSelected(null)
          fetchSlots()
        } else {
          setError(data.error)
        }
        return
      }
      router.push('/done')
    } catch {
      setError('예약 요청 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  function formatSlot(slot: Slot) {
    const start = new Date(slot.start_at)
    const end = new Date(slot.end_at)
    const date = start.toLocaleDateString('ko-KR', {
      timeZone: 'Asia/Seoul', weekday: 'long', month: 'long', day: 'numeric',
    })
    const startTime = start.toLocaleTimeString('ko-KR', {
      timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit',
    })
    const endTime = end.toLocaleTimeString('ko-KR', {
      timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit',
    })
    return { date, time: `${startTime} — ${endTime}` }
  }

  // 날짜별 그룹핑
  const grouped = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    const { date } = formatSlot(slot)
    if (!acc[date]) acc[date] = []
    acc[date].push(slot)
    return acc
  }, {})

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500 text-sm">가용 시간을 불러오는 중...</div>
    </div>
  )

  if (error && !slots.length) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-white border border-gray-200 rounded-xl p-6 text-center">
        <div className="text-red-500 text-sm mb-4">{error}</div>
        <p className="text-gray-500 text-xs">문의: writers@vigloo.com</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <div className="text-sm text-gray-400 mb-1">Vigloo Writers' Room 2기</div>
          <h1 className="text-xl font-medium text-gray-900">면접 시간 선택</h1>
          {applicant && (
            <p className="text-sm text-gray-500 mt-1">
              {applicant.name}님 · {applicant.position}
            </p>
          )}
        </div>

        {/* 안내 */}
        <div className="bg-emerald-50 text-emerald-800 text-sm rounded-lg px-4 py-3 mb-6 leading-relaxed">
          가능한 시간대를 하나 선택해주세요. 담당 PD는 예약 확정 후 이메일로 안내드립니다.
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {/* 슬롯 목록 */}
        {Object.entries(grouped).map(([date, daySlots]) => (
          <div key={date} className="mb-6">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              {date}
            </div>
            <div className="space-y-2">
              {daySlots.map((slot) => {
                const { time } = formatSlot(slot)
                const isSelected = selected?.start_at === slot.start_at
                return (
                  <button
                    key={slot.start_at}
                    onClick={() => setSelected(slot)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`text-sm font-medium ${isSelected ? 'text-emerald-800' : 'text-gray-900'}`}>
                      {time}
                    </span>
                    <span className={`text-xs ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {isSelected ? '✓ 선택됨' : '예약 가능'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {slots.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            현재 예약 가능한 시간이 없습니다.<br />
            담당자에게 문의해주세요.
          </div>
        )}

        {/* 하단 확정 버튼 */}
        <div className="sticky bottom-6 mt-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <span className="text-sm text-gray-500">
              {selected ? formatSlot(selected).time : '시간을 선택해주세요'}
            </span>
            <button
              onClick={handleSubmit}
              disabled={!selected || submitting}
              className="px-5 py-2 bg-gray-900 text-white text-sm rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
            >
              {submitting ? '처리 중...' : '예약 요청'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
