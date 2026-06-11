# Vigloo Interview Scheduler

Next.js 14 + Supabase + Google Calendar API 기반 면접 스케줄링 시스템

## 핵심 로직
- PD 중 1명이라도 가능한 시간 → 지원자에게 노출 (PD 이름 숨김)
- 지원자가 시간 선택 → `pending` 상태로 저장
- 관리자가 해당 시간에 가능한 PD 목록 보고 최종 매칭
- 확정 시 지원자 이메일 + PD 구글 캘린더 자동 등록

## 기술 스택
- **Frontend**: Next.js 14 (App Router), Tailwind CSS
- **Backend**: Supabase (DB + Auth + Edge Functions)
- **Calendar**: Google Calendar API (OAuth 2.0)
- **Email**: Resend (또는 SendGrid)
- **배포**: Vercel

## 디렉토리 구조
```
vigloo-scheduler/
├── app/
│   ├── (applicant)/         # 지원자 페이지 (토큰 인증)
│   │   ├── book/page.tsx    # 시간 선택
│   │   └── done/page.tsx    # 접수 완료
│   ├── admin/               # 관리자 페이지 (Supabase Auth)
│   │   ├── dashboard/
│   │   ├── match/page.tsx   # PD 매칭
│   │   ├── slots/page.tsx   # 슬롯 현황
│   │   └── applicants/
│   └── api/
│       ├── slots/route.ts        # 가용 슬롯 조회
│       ├── bookings/route.ts     # 예약 요청/확정
│       ├── match/route.ts        # PD 매칭 확정
│       ├── calendar/route.ts     # Google Calendar 동기화
│       └── email/route.ts        # 이메일 발송
├── lib/
│   ├── supabase.ts
│   ├── google-calendar.ts
│   └── email.ts
└── supabase/
    └── migrations/
        └── 001_init.sql
```
