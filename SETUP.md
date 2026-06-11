# Vigloo Interview Scheduler — 설치 가이드

## 1. 환경변수 설정 (.env.local)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # 서버 전용, 절대 클라이언트 노출 금지

# Google OAuth (Calendar)
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
GOOGLE_REDIRECT_URI=https://your-domain.com/api/calendar/callback

# Resend (이메일)
RESEND_API_KEY=re_xxxx

# 앱
NEXT_PUBLIC_URL=https://your-domain.com
ADMIN_EMAIL=admin@vigloo.com
```

## 2. 패키지 설치

```bash
npm install next@14 react react-dom
npm install @supabase/supabase-js
npm install googleapis
npm install resend
npm install -D typescript @types/node @types/react tailwindcss
```

## 3. Supabase 설정

1. supabase.com에서 프로젝트 생성
2. SQL Editor에서 `supabase/migrations/001_init.sql` 실행
3. Authentication > URL Configuration에서 Site URL 설정

## 4. Google Cloud 설정

1. console.cloud.google.com > APIs & Services > Credentials
2. OAuth 2.0 Client ID 생성
3. 승인된 리디렉션 URI 추가: `https://your-domain.com/api/calendar/callback`
4. Google Calendar API 활성화

## 5. PD Google Calendar 연동 (관리자가 한 번만)

각 PD별로 아래 URL 접속하여 권한 부여:
```
/api/calendar/auth?pdId=<PD_UUID>
```

## 6. 슬롯 자동 동기화 (Cron)

Vercel Cron 또는 Supabase pg_cron으로 매일 오전 7시 실행:
```
POST /api/calendar/sync
```

## 7. 배포

```bash
npx vercel --prod
```

## 주요 URL 구조

| URL | 설명 |
|-----|------|
| `/book?token=VIG-XXXX-XXXX` | 지원자 예약 페이지 |
| `/done` | 예약 접수 완료 |
| `/admin/match` | 관리자 PD 매칭 |
| `/admin/applicants` | 지원자 관리 + 토큰 발급 |
| `/admin/slots` | 슬롯 현황 |
| `/api/slots` | 가용 슬롯 조회 API |
| `/api/bookings` | 예약 요청 API |
| `/api/match` | PD 매칭 확정 API |
| `/api/calendar/auth` | Google OAuth 시작 |
| `/api/calendar/callback` | Google OAuth 콜백 |
| `/api/calendar/sync` | 슬롯 동기화 (Cron) |
