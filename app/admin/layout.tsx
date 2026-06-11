export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{minHeight:'100vh',background:'#f9f9f9'}}>
      <nav style={{background:'#fff',borderBottom:'1px solid #e5e7eb',padding:'0 20px',display:'flex',alignItems:'center',gap:'0'}}>
        <div style={{fontSize:'14px',fontWeight:'500',padding:'14px 0',marginRight:'24px'}}>
          Vigloo Admin
        </div>
        <a href="/admin/applicants" style={{fontSize:'13px',padding:'14px 16px',color:'#444',textDecoration:'none',borderBottom:'2px solid transparent'}}>
          지원자 관리
        </a>
        <a href="/admin/match" style={{fontSize:'13px',padding:'14px 16px',color:'#444',textDecoration:'none',borderBottom:'2px solid transparent'}}>
          PD 매칭
        </a>
      </nav>
      <main>{children}</main>
    </div>
  )
}
