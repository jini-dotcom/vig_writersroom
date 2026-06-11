'use client'
// app/admin/match/page.tsx
// 관리자 PD 매칭 화면

import { useState, useEffect } from 'react'

interface PdOption {
  id: string
  name: string
  email: string
  team: string
  weeklyCount: number
}

interface PendingBooking {
  bookingId: string
  requestedStart: string
  requestedEnd: string
  applicant: { id: string; name: string; email: string; position: string }
  availablePds: PdOption[]
  recommendedPdId: string | null
  assignMode: string
}

type MatchState = 'idle' | 'assigning' | 'done'

export default function MatchPage() {
  const [bookings, setBookings] = useState<PendingBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [selections, setSelections] = useState<Record<string, string>>({})  // bookingId → pdId
  const [states, setStates] = useState<Record<string, MatchState>>({})

  useEffect(() => { fetchPending() }, [])

  async function fetchPending() {
    const res = await fetch('/api/match')
    const data = await res.json()
    setBookings(data.bookings ?? [])
    // 추천 PD 자동 선택
    const initial: Record<string, string> = {}
    for (const b of data.bookings ?? []) {
      if (b.recommendedPdId) initial[b.bookingId] = b.recommendedPdId
    }
    setSelections(initial)
    setLoading(false)
  }

  async function handleAssign(bookingId: string) {
    const pdId = selections[bookingId]
    if (!pdId) return

    setStates((s) => ({ ...s, [bookingId]: 'assigning' }))

    const res = await fetch('/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, pdId }),
    })

    if (res.ok) {
      setStates((s) => ({ ...s, [bookingId]: 'done' }))
    } else {
      const data = await res.json()
      alert(data.error)
      setStates((s) => ({ ...s, [bookingId]: 'idle' }))
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'long', day: 'numeric', weekday: 'short',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const pending = bookings.filter((b) => states[b.bookingId] !== 'done')
  const allDone = bookings.length > 0 && pending.length === 0

  if (loading) return <div className="p-8 text-gray-400 text-sm">불러오는 중...</div>

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium">PD 매칭</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {pending.length > 0 ? `${pending.length}건 매칭 대기 중` : '모든 예약 매칭 완료'}
          </p>
        </div>
        <button onClick={fetchPending} className="text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
          새로고침
        </button>
      </div>

      {allDone && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-3xl mb-3">✓</div>
          <div className="text-sm">모든 예약이 매칭되었습니다</div>
          <div className="text-xs mt-1">지원자에게 확정 이메일이 발송되었습니다</div>
        </div>
      )}

      {/* 매칭 카드 목록 */}
      <div className="space-y-4">
        {bookings.map((booking) => {
          const isDone = states[booking.bookingId] === 'done'
          const isAssigning = states[booking.bookingId] === 'assigning'

          return (
            <div
              key={booking.bookingId}
              className={`border rounded-xl p-4 transition-opacity ${
                isDone ? 'opacity-40 pointer-events-none' : 'border-gray-200 bg-white'
              }`}
            >
              {/* 지원자 정보 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-medium">
                    {booking.applicant.name[0]}
                  </div>
                  <div>
                    <span className="text-sm font-medium">{booking.applicant.name}</span>
                    <span className="ml-2 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                      {booking.applicant.position}
                    </span>
                  </div>
                </div>
                {isDone ? (
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">배정 완료</span>
                ) : (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">매칭 대기</span>
                )}
              </div>

              <div className="text-xs text-gray-500 mb-3">
                요청 시간: {formatTime(booking.requestedStart)}
              </div>

              {/* 가능한 PD 목록 */}
              {!isDone && (
                <>
                  <div className="text-xs text-gray-400 mb-2">
                    가능한 PD {booking.availablePds.length}명
                    {booking.assignMode !== 'manual' && ' · 부하 최소 우선 추천'}
                  </div>
                  <div className="space-y-1.5 mb-3">
                    {booking.availablePds.map((pd) => {
                      const isChosen = selections[booking.bookingId] === pd.id
                      const isRecommended = booking.recommendedPdId === pd.id
                      return (
                        <button
                          key={pd.id}
                          onClick={() =>
                            setSelections((s) => ({ ...s, [booking.bookingId]: pd.id }))
                          }
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all ${
                            isChosen
                              ? 'border-emerald-400 bg-emerald-50'
                              : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                            {pd.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm font-medium ${isChosen ? 'text-emerald-800' : 'text-gray-800'}`}>
                              {pd.name}
                            </span>
                            <span className="text-xs text-gray-400 ml-1.5">{pd.team}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">이번 주 {pd.weeklyCount}건</span>
                            {isRecommended && (
                              <span className="text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">추천</span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* 배정 확정 버튼 */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      {selections[booking.bookingId]
                        ? `${booking.availablePds.find((p) => p.id === selections[booking.bookingId])?.name} 선택됨`
                        : 'PD를 선택하세요'}
                    </span>
                    <button
                      onClick={() => handleAssign(booking.bookingId)}
                      disabled={!selections[booking.bookingId] || isAssigning}
                      className="px-4 py-1.5 bg-gray-900 text-white text-xs rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors"
                    >
                      {isAssigning ? '처리 중...' : '배정 확정'}
                    </button>
                  </div>
                </>
              )}

              {isDone && (
                <div className="text-xs text-emerald-600 flex items-center gap-1.5">
                  ✓ {booking.availablePds.find((p) => p.id === selections[booking.bookingId])?.name ?? 'PD'} 배정 완료 · 확정 이메일 발송됨
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
