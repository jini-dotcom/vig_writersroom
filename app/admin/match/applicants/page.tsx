'use client'
// app/admin/applicants/page.tsx
// 관리자 지원자 목록 — 토큰 링크 복사

import { useState, useEffect } from 'react'

interface Applicant {
  id: string
  name: string
  email: string
  phone: string | null
  position: string | null
  token: string
  status: string
  token_expires_at: string
  created_at: string
}

const STATUS_LABEL: Record<string, string> = {
  invited:   '초대됨',
  pending:   '예약 대기',
  confirmed: '배정 완료',
  cancelled: '취소',
}

const STATUS_COLOR: Record<string, string> = {
  invited:   '#6B7280',
  pending:   '#B45309',
  confirmed: '#065F46',
  cancelled: '#991B1B',
}

export default function ApplicantsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [loading, setLoading]       = useState(true)
  const [copied, setCopied]         = useState<string | null>(null)
  const [search, setSearch]         = useState('')

  useEffect(() => { fetchApplicants() }, [])

  async function fetchApplicants() {
    const res  = await fetch('/api/applicants')
    const data = await res.json()
    setApplicants(data.applicants ?? [])
    setLoading(false)
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/book?token=${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  function copyToken(token: string) {
    navigator.clipboard.writeText(token)
    setCopied(token + '_token')
    setTimeout(() => setCopied(null), 2000)
  }

  const filtered = applicants.filter(a =>
    a.name.includes(search) || a.email.includes(search) || (a.phone ?? '').includes(search)
  )

  if (loading) return <p style={{ padding: '2rem', color: '#6B7280' }}>불러오는 중...</p>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>지원자 관리</h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>총 {applicants.length}명</p>
        </div>
        <button onClick={fetchApplicants} style={{ fontSize: 13, padding: '6px 14px' }}>
          새로고침
        </button>
      </div>

      <input
        type="text"
        placeholder="이름, 이메일, 전화번호 검색"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', fontSize: 13, marginBottom: '1rem', padding: '8px 12px' }}
      />

      {filtered.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#6B7280', padding: '3rem 0' }}>지원자가 없습니다</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(a => (
            <div key={a.id} style={{
              border: '0.5px solid #E5E7EB',
              borderRadius: 12,
              padding: '14px 16px',
              background: '#fff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: '#EEEDFE', color: '#3C3489',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 500, flexShrink: 0,
                  }}>
                    {a.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>{a.email}</div>
                  </div>
                </div>
                <span style={{
                  fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 500,
                  background: STATUS_COLOR[a.status] + '18',
                  color: STATUS_COLOR[a.status],
                }}>
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
              </div>

              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <span style={{
                  fontFamily: 'monospace', fontSize: 12,
                  background: '#F3F4F6', padding: '3px 10px', borderRadius: 6,
                  color: '#374151',
                }}>
                  {a.token}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => copyToken(a.token)}
                    style={{ fontSize: 12, padding: '4px 10px' }}
                  >
                    {copied === a.token + '_token' ? '✓ 복사됨' : '토큰 복사'}
                  </button>
                  <button
                    onClick={() => copyLink(a.token)}
                    style={{
                      fontSize: 12, padding: '4px 12px',
                      background: '#1D9E75', color: '#fff',
                      border: 'none', borderRadius: 6, cursor: 'pointer',
                    }}
                  >
                    {copied === a.token ? '✓ 링크 복사됨' : '예약 링크 복사'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
