export default function DonePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4 text-2xl">🕐</div>
        <h1 className="text-lg font-medium mb-2">희망 시간이 접수되었습니다</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          담당자가 PD 일정을 확인 후<br />최적 시간으로 확정 이메일을 보내드립니다.
        </p>
        <p className="text-xs text-gray-400">문의: writers@vigloo.com</p>
      </div>
    </div>
  )
}
