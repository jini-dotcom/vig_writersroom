// app/api/applicants/route.ts
// GET /api/applicants — 관리자용 지원자 전체 목록

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('applicants')
    .select('id, name, email, phone, position, token, status, token_expires_at, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ applicants: data })
}
