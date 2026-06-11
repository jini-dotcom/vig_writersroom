// app/api/bookings/route.ts
// POST /api/bookings        — 지원자 예약 요청 (pending 생성)
// app/api/match/route.ts 에서 관리자 매칭 확정 처리

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

// -----------------------------------------------
// POST: 지원자 예약 요청
// body: { token, start_at, end_at }
// -----------------------------------------------
export async function POST(req: NextRequest) {
 const { token, requested_slots } = await req.json()

if (!token || !requested_slots || requested_slots.length === 0) {
  return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
}

const start_at = requested_slots[0].start_at
const end_at = requested_slots[0].end_at

  const supabase = createClient()

  // 1. 토큰으로 지원자 확인
  const { data: applicant } = await supabase
    .from('applicants')
    .select('id, name, email, position, status, token_expires_at')
    .eq('token', token)
    .single()

  if (!applicant) {
    return NextResponse.json({ error: '유효하지 않은 토큰' }, { status: 403 })
  }
  if (applicant.status === 'confirmed') {
    return NextResponse.json({ error: '이미 예약 완료' }, { status: 400 })
  }
  if (new Date(applicant.token_expires_at) < new Date()) {
    return NextResponse.json({ error: '토큰 만료' }, { status: 403 })
  }

  // 2. 선택한 시간에 아직 가능한 PD가 있는지 재확인 (race condition 방지)
  const { data: freeSlots } = await supabase
    .from('pd_availability')
    .select('pd_id')
    .eq('start_at', start_at)
    .eq('is_free', true)

  if (!freeSlots || freeSlots.length === 0) {
    return NextResponse.json(
      { error: '방금 다른 지원자가 선택했습니다. 다른 시간을 선택해주세요' },
      { status: 409 }
    )
  }

  // 3. booking 생성 (status: pending, pd_id는 비워둠)
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      applicant_id: applicant.id,
      requested_start: start_at,
      requested_end: end_at,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 4. 지원자 상태 업데이트
  await supabase
    .from('applicants')
    .update({ status: 'pending' })
    .eq('id', applicant.id)

  // 5. 관리자에게 알림 이메일
  await sendEmail({
    to: process.env.ADMIN_EMAIL!,
    subject: `[Vigloo] 매칭 필요 — ${applicant.name} (${applicant.position})`,
    template: 'admin_match_needed',
    data: {
      applicantName: applicant.name,
      position: applicant.position,
      requestedTime: new Date(start_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      matchUrl: `${process.env.NEXT_PUBLIC_URL}/admin/match`,
    },
  })

  // 6. 지원자에게 접수 확인 이메일
  await sendEmail({
    to: applicant.email,
    subject: '[Vigloo] 면접 예약 요청이 접수되었습니다',
    template: 'applicant_pending',
    data: {
      applicantName: applicant.name,
      requestedTime: new Date(start_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    },
  })

  return NextResponse.json({ bookingId: booking.id, status: 'pending' })
}
