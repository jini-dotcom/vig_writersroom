-- =============================================
-- Vigloo Interview Scheduler — DB Schema
-- =============================================

-- PD 테이블
create table pds (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null unique,
  team        text,
  google_refresh_token text,          -- Google OAuth refresh token
  is_active   boolean default true,
  weekly_max  int default 4,          -- 주간 최대 면접 수
  created_at  timestamptz default now()
);

-- 포지션별 PD 배정 규칙
create table position_rules (
  id            uuid primary key default gen_random_uuid(),
  position      text not null unique,  -- '드라마 작가', '프로듀서', etc.
  assign_mode   text not null default 'round_robin',
                -- 'round_robin' | 'least_load' | 'fixed'
  weekly_max    int default 3,
  created_at    timestamptz default now()
);

-- 포지션 규칙 ↔ PD 연결
create table position_rule_pds (
  rule_id  uuid references position_rules(id) on delete cascade,
  pd_id    uuid references pds(id) on delete cascade,
  primary key (rule_id, pd_id)
);

-- 지원자 테이블
create table applicants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  position    text,                   -- '드라마 작가', '프로듀서', etc.
  token       text not null unique,   -- VIG-XXXX-XXXX
  token_used  boolean default false,
  token_expires_at timestamptz default (now() + interval '72 hours'),
  status      text default 'invited', -- invited | pending | confirmed | cancelled
  created_at  timestamptz default now()
);

-- 예약 테이블
create table bookings (
  id              uuid primary key default gen_random_uuid(),
  applicant_id    uuid references applicants(id) on delete cascade,
  pd_id           uuid references pds(id),   -- 매칭 후 채워짐
  requested_start timestamptz not null,       -- 지원자가 선택한 시간
  requested_end   timestamptz not null,
  confirmed_start timestamptz,               -- 관리자 확정 후
  confirmed_end   timestamptz,
  status          text default 'pending',
                  -- pending | matched | confirmed | cancelled | rescheduled
  meet_link       text,                      -- Google Meet URL
  calendar_event_id text,                    -- PD 캘린더 이벤트 ID
  cancel_reason   text,
  include_rebook  boolean default true,
  notes           text,                      -- 관리자 메모
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- PD 가용 슬롯 캐시 (Google Calendar에서 주기적으로 동기화)
create table pd_availability (
  id        uuid primary key default gen_random_uuid(),
  pd_id     uuid references pds(id) on delete cascade,
  start_at  timestamptz not null,
  end_at    timestamptz not null,
  is_free   boolean not null,   -- false = 구글 캘린더에 일정 있음
  synced_at timestamptz default now(),
  unique (pd_id, start_at)
);

-- 알림 로그
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  -- 'booking_request' | 'match_needed' | 'confirmed' | 'cancelled' | 'rescheduled' | 'reminder'
  booking_id  uuid references bookings(id),
  recipient   text not null,   -- 'applicant' | 'pd' | 'admin'
  email_to    text,
  sent_at     timestamptz default now(),
  success     boolean default true,
  error_msg   text
);

-- =============================================
-- 핵심 VIEW: 지원자에게 노출할 가용 슬롯
-- PD 1명이라도 free = true면 노출
-- =============================================
create view available_slots as
select
  start_at,
  end_at,
  count(*) filter (where is_free = true)  as free_pd_count,
  array_agg(pd_id) filter (where is_free = true) as free_pd_ids,
  -- 지원자에게는 free_pd_count > 0 인 슬롯만 노출
  (count(*) filter (where is_free = true)) > 0 as is_available
from pd_availability
group by start_at, end_at
having (count(*) filter (where is_free = true)) > 0
order by start_at;

-- =============================================
-- RLS (Row Level Security)
-- =============================================
alter table applicants enable row level security;
alter table bookings enable row level security;
alter table pds enable row level security;

-- 지원자: 토큰으로 본인 행만 조회
create policy "applicant_token_select"
  on applicants for select
  using (token = current_setting('app.current_token', true));

-- 관리자: service_role로 전체 접근 (Edge Function에서만 사용)

-- =============================================
-- 자동 updated_at 트리거
-- =============================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bookings_updated_at
  before update on bookings
  for each row execute function set_updated_at();

-- =============================================
-- 토큰 생성 함수 (VIG-XXXX-XXXX 형식)
-- =============================================
create or replace function generate_token()
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'VIG-';
  i int;
begin
  for i in 1..4 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  result := result || '-';
  for i in 1..4 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$ language plpgsql;

-- =============================================
-- 샘플 데이터
-- =============================================
insert into pds (name, email, team, weekly_max) values
  ('김지연', 'kim.jy@vigloo.com', '드라마 개발팀', 6),
  ('박민준', 'park.mj@vigloo.com', 'IP 개발팀', 4),
  ('이수현', 'lee.sh@vigloo.com', '글로벌 콘텐츠팀', 3);

insert into position_rules (position, assign_mode, weekly_max) values
  ('드라마 작가', 'round_robin', 3),
  ('프로듀서', 'least_load', 4),
  ('조감독', 'fixed', 2);
