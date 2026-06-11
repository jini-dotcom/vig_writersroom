// lib/google-calendar.ts
// Google Calendar API 연동 — PD 가용 시간 조회 + 일정 등록

import { google } from 'googleapis'
import { createClient } from './supabase'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

// -----------------------------------------------
// OAuth: 관리자가 PD 캘린더 권한 부여할 때 사용
// -----------------------------------------------
export function getAuthUrl(pdId: string) {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    state: pdId,  // 콜백에서 어느 PD인지 식별
    prompt: 'consent',
  })
}

export async function saveRefreshToken(pdId: string, code: string) {
  const { tokens } = await oauth2Client.getToken(code)
  const supabase = createClient()
  await supabase
    .from('pds')
    .update({ google_refresh_token: tokens.refresh_token })
    .eq('id', pdId)
  return tokens
}

// -----------------------------------------------
// PD 가용 시간 조회 (Free/Busy API)
// -----------------------------------------------
export async function syncPdAvailability(
  pdId: string,
  refreshToken: string,
  weekStart: Date
) {
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  // Google Free/Busy API: 언제 바쁜지 조회
  const freeBusy = await calendar.freebusy.query({
    requestBody: {
      timeMin: weekStart.toISOString(),
      timeMax: weekEnd.toISOString(),
      items: [{ id: 'primary' }],
    },
  })

  const busySlots = freeBusy.data.calendars?.primary?.busy ?? []

  // 30분 단위 슬롯 생성 (10:00~12:00, 14:00~17:00)
  const slots = generateSlots(weekStart)
  const supabase = createClient()

  const rows = slots.map((slot) => {
    const isBusy = busySlots.some(
      (busy) =>
        new Date(busy.start!) < slot.end &&
        new Date(busy.end!) > slot.start
    )
    return {
      pd_id: pdId,
      start_at: slot.start.toISOString(),
      end_at: slot.end.toISOString(),
      is_free: !isBusy,
      synced_at: new Date().toISOString(),
    }
  })

  // upsert: 이미 있으면 갱신
  await supabase
    .from('pd_availability')
    .upsert(rows, { onConflict: 'pd_id,start_at' })

  return rows
}

// -----------------------------------------------
// 모든 PD 일괄 동기화 (cron으로 매일 실행)
// -----------------------------------------------
export async function syncAllPds(weekStart: Date) {
  const supabase = createClient()
  const { data: pds } = await supabase
    .from('pds')
    .select('id, google_refresh_token')
    .eq('is_active', true)
    .not('google_refresh_token', 'is', null)

  if (!pds) return

  await Promise.all(
    pds.map((pd) => syncPdAvailability(pd.id, pd.google_refresh_token!, weekStart))
  )
}

// -----------------------------------------------
// 면접 확정 시 PD 구글 캘린더에 일정 등록
// -----------------------------------------------
export async function createCalendarEvent({
  pdRefreshToken,
  applicantName,
  applicantEmail,
  pdEmail,
  start,
  end,
  meetLink,
}: {
  pdRefreshToken: string
  applicantName: string
  applicantEmail: string
  pdEmail: string
  start: Date
  end: Date
  meetLink?: string
}) {
  oauth2Client.setCredentials({ refresh_token: pdRefreshToken })
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const event = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    requestBody: {
      summary: `[Vigloo 면접] ${applicantName}`,
      description: `Writers' Room 2기 면접\n지원자: ${applicantName} (${applicantEmail})`,
      start: { dateTime: start.toISOString(), timeZone: 'Asia/Seoul' },
      end: { dateTime: end.toISOString(), timeZone: 'Asia/Seoul' },
      attendees: [
        { email: pdEmail },
        { email: applicantEmail },
      ],
      conferenceData: meetLink
        ? undefined
        : { createRequest: { requestId: `vigloo-${Date.now()}` } },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 10 },
        ],
      },
    },
  })

  return {
    eventId: event.data.id!,
    meetLink:
      meetLink ??
      event.data.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')
        ?.uri ??
      '',
  }
}

// -----------------------------------------------
// 30분 단위 슬롯 생성 헬퍼
// -----------------------------------------------
function generateSlots(weekStart: Date) {
  const slots: { start: Date; end: Date }[] = []
  const interviewHours = [
    [10, 0], [10, 30],
    [11, 0], [11, 30],
    [14, 0], [14, 30],
    [15, 0], [15, 30],
  ]

  for (let day = 0; day < 5; day++) {  // 월~금
    for (const [h, m] of interviewHours) {
      const start = new Date(weekStart)
      start.setDate(start.getDate() + day)
      start.setHours(h, m, 0, 0)
      const end = new Date(start)
      end.setMinutes(end.getMinutes() + 30)
      slots.push({ start, end })
    }
  }

  return slots
}
