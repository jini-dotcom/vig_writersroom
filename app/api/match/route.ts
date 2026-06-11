// app/api/match/route.ts
// 관리자가 PD를 선택해서 면접 확정하는 핵심 API
// GET  — 매칭 대기 목록 + 각 예약의 가능한 PD 목록 반환
// POST — PD 배정 확정, 캘린더 등록, 이메일 발송

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { createCalendarEvent } from '@/lib/google-calendar'
import { sendEmail } from '@/lib/email'

// -----------------------------------------------
// GET: 매칭 대기 목록 조회
// 각 pending 예약에 대해 해당 시간에 가능한 PD + 추천 PD 반환
// -----------------------------------------------
export async function GET() {
  const supabase = createClient()

  // 1. pending 상태 예약 전체 조회
  const { data: pendingBookings } = await supabase
    .from('bookings')
    .select(`
      id, requested_start, requested_end, status,
      applicants (id, name, email, position)
    `)
    .eq('status', 'pending')
    .order('requested_start')

  if (!pendingBookings?.length) {
    return NextResponse.json({ bookings: [] })
  }

  // 2. 각 예약마다 해당 시간에 가능한 PD 조회
  const result = await Promise.all(
    pendingBookings.map(async (booking) => {
      const applicant = booking.applicants as any

      // 해당 시간에 is_free인 PD 목록
      const { data: freeSlots } = await supabase
        .from('pd_availability')
        .select('pd_id, pds(id, name, email, team)')
        .eq('start_at', booking.requested_start)
        .eq('is_free', true)

      const availablePds = (freeSlots ?? []).map((s: any) => s.pds)

      // 포지션 규칙 조회
      const { data: rule } = await supabase
        .from('position_rules')
        .select('id, assign_mode, position_rule_pds(pd_id)')
        .eq('position', applicant?.position ?? '')
        .single()

      // 포지션 규칙에 해당하는 PD 중 가능한 PD만 필터
      const rulePdIds = rule?.position_rule_pds?.map((r: any) => r.pd_id) ?? []
      const eligiblePds = rulePdIds.length > 0
        ? availablePds.filter((pd: any) => rulePdIds.includes(pd.id))
        : availablePds  // 규칙 없으면 전체

      // 이번 주 각 PD 면접 수 조회 (부하 계산)
      const weekStart = getWeekStart(new Date(booking.requested_start))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const { data: weeklyBookings } = await supabase
        .from('bookings')
        .select('pd_id')
        .in('status', ['confirmed', 'matched'])
        .gte('confirmed_start', weekStart.toISOString())
        .lt('confirmed_start', weekEnd.toISOString())

      const loadMap = new Map<string, number>()
      for (const b of weeklyBookings ?? []) {
        if (b.pd_id) loadMap.set(b.pd_id, (loadMap.get(b.pd_id) ?? 0) + 1)
      }

      // PD에 현재 부하 정보 추가
      const pdsWithLoad = eligiblePds.map((pd: any) => ({
        ...pd,
        weeklyCount: loadMap.get(pd.id) ?? 0,
      }))

      // 추천 PD 결정
      let recommendedPdId: string | null = null
      if (rule?.assign_mode === 'least_load' && pdsWithLoad.length > 0) {
        // 부하 최소 PD 추천
        recommendedPdId = pdsWithLoad.sort((a: any, b: any) => a.weeklyCount - b.weeklyCount)[0].id
      } else if (rule?.assign_mode === 'round_robin' && pdsWithLoad.length > 0) {
        // 이번 주 가장 적게 배정된 PD 추천
        recommendedPdId = pdsWithLoad.sort((a: any, b: any) => a.weeklyCount - b.weeklyCount)[0].id
      }

      return {
        bookingId: booking.id,
        requestedStart: booking.requested_start,
        requestedEnd: booking.requested_end,
        applicant,
        availablePds: pdsWithLoad,
        recommendedPdId,
        assignMode: rule?.assign_mode ?? 'manual',
      }
    })
  )

  return NextResponse.json({ bookings: result })
}

// -----------------------------------------------
// POST: PD 배정 확정
// body: { bookingId, pdId }
// -----------------------------------------------
export async function POST(req: NextRequest) {
  const { bookingId, pdId } = await req.json()

  if (!bookingId || !pdId) {
    return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
  }

  const supabase = createClient()

  // 1. booking + applicant + PD 정보 조회
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, applicants(name, email, position)')
    .eq('id', bookingId)
    .single()

  if (!booking) return NextResponse.json({ error: '예약 없음' }, { status: 404 })
  if (booking.status !== 'pending') {
    return NextResponse.json({ error: '이미 처리된 예약입니다' }, { status: 400 })
  }

  const { data: pd } = await supabase
    .from('pds')
    .select('name, email, google_refresh_token')
    .eq('id', pdId)
    .single()

  if (!pd) return NextResponse.json({ error: 'PD 없음' }, { status: 404 })

  const applicant = booking.applicants as any

  // 2. 구글 캘린더에 일정 등록 + Meet 링크 생성
  let meetLink = ''
  let calendarEventId = ''

  if (pd.google_refresh_token) {
    try {
      const event = await createCalendarEvent({
        pdRefreshToken: pd.google_refresh_token,
        applicantName: applicant.name,
        applicantEmail: applicant.email,
        pdEmail: pd.email,
        start: new Date(booking.requested_start),
        end: new Date(booking.requested_end),
      })
      meetLink = event.meetLink
      calendarEventId = event.eventId
    } catch (e) {
      console.error('Calendar event creation failed:', e)
      // 캘린더 실패해도 예약은 진행 (Meet 링크만 없음)
    }
  }

  // 3. 해당 PD 슬롯을 예약됨으로 표시 (다른 지원자에게 미노출)
  await supabase
    .from('pd_availability')
    .update({ is_free: false })
    .eq('pd_id', pdId)
    .eq('start_at', booking.requested_start)

  // 4. booking 확정 업데이트
  await supabase
    .from('bookings')
    .update({
      pd_id: pdId,
      status: 'confirmed',
      confirmed_start: booking.requested_start,
      confirmed_end: booking.requested_end,
      meet_link: meetLink,
      calendar_event_id: calendarEventId,
    })
    .eq('id', bookingId)

  // 5. 지원자 상태 업데이트
  await supabase
    .from('applicants')
    .update({ status: 'confirmed' })
    .eq('id', booking.applicant_id)

  // 6. 지원자에게 확정 이메일 발송
  const confirmedTime = new Date(booking.requested_start).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'long', hour: '2-digit', minute: '2-digit',
  })

  await sendEmail({
    to: applicant.email,
    subject: `[Vigloo] 면접 예약 확정 — ${confirmedTime}`,
    template: 'applicant_confirmed',
    data: {
      applicantName: applicant.name,
      confirmedTime,
      pdName: pd.name,
      meetLink: meetLink || '별도 안내 예정',
      manageUrl: `${process.env.NEXT_PUBLIC_URL}/manage?booking=${bookingId}`,
    },
  })

  // 7. PD에게도 알림
  await sendEmail({
    to: pd.email,
    subject: `[Vigloo] 면접 일정 배정 — ${applicant.name} (${confirmedTime})`,
    template: 'pd_assigned',
    data: {
      pdName: pd.name,
      applicantName: applicant.name,
      position: applicant.position,
      confirmedTime,
      meetLink: meetLink || '캘린더 확인',
    },
  })

  return NextResponse.json({ success: true, meetLink })
}

function getWeekStart(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  d.setHours(0, 0, 0, 0)
  return d
}
