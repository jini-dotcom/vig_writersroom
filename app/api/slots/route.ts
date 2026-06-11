// updated
// app/api/slots/route.ts// app/api/slots/route.ts
// 지원자에게 노출할 가용 슬롯 조회
// 핵심 규칙: PD 1명이라도 free = true면 노출, PD 정보는 숨김

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const weekStart = req.nextUrl.searchParams.get('week') // ISO date string

  if (!token) {
    return NextResponse.json({ error: '토큰이 필요합니다' }, { status: 401 })
  }

  const supabase = createClient()

  // 1. 토큰 유효성 검증
  const { data: applicant, error: tokenErr } = await supabase
    .from('applicants')
    .select('id, name, position, status, token_expires_at, token_used')
    .eq('token', token)
    .single()

  if (tokenErr || !applicant) {
    return NextResponse.json({ error: '유효하지 않은 토큰입니다' }, { status: 403 })
  }
  if (new Date(applicant.token_expires_at) < new Date()) {
    return NextResponse.json({ error: '토큰이 만료되었습니다. 담당자에게 문의하세요' }, { status: 403 })
  }
  if (applicant.status === 'confirmed') {
    return NextResponse.json({ error: '이미 예약이 완료되었습니다' }, { status: 400 })
  }

  // 2. 해당 주의 슬롯 조회
  const start = weekStart ? new Date(weekStart) : getThisMonday()
const end = new Date(start)
end.setDate(end.getDate() + 30) // 한 달치

  // available_slots view 사용: 1명 이상 free인 슬롯만 반환
  // 지원자에게는 start_at, end_at만 노출 (free_pd_ids 등 내부 정보 제외)
  const { data: slots, error } = await supabase
    .from('pd_availability')
    .select('start_at, end_at, pd_id, is_free')
    .gte('start_at', start.toISOString())
    .lt('start_at', end.toISOString())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 슬롯별로 그룹핑: 1명이라도 free면 노출
  const slotMap = new Map<string, { start_at: string; end_at: string; available: boolean }>()

  for (const row of slots ?? []) {
    const key = row.start_at
    if (!slotMap.has(key)) {
      slotMap.set(key, { start_at: row.start_at, end_at: row.end_at, available: false })
    }
    if (row.is_free) {
      slotMap.get(key)!.available = true
    }
  }

  // available = true인 슬롯만, PD 정보 없이 반환
  const availableSlots = Array.from(slotMap.values())
    .filter((s) => s.available)
    .map((s) => ({ start_at: s.start_at, end_at: s.end_at }))
    .sort((a, b) => a.start_at.localeCompare(b.start_at))

  return NextResponse.json({
    applicant: { name: applicant.name, position: applicant.position },
    slots: availableSlots,
  })
}

function getThisMonday() {
  const now = new Date()
  // 오늘 날짜 기준 00:00 KST
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  kst.setUTCHours(0, 0, 0, 0)
  // UTC로 변환
  return new Date(kst.getTime() - 9 * 60 * 60 * 1000)
}
