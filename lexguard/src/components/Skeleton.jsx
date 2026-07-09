// Lightweight shimmer placeholders shown while first-load data is in flight.
// `.sk` (shimmer gradient) is defined in index.css.

export function Skeleton({ w, h = 14, r = 8, style }) {
  return <div className="sk" style={{ width: w, height: h, borderRadius: r, ...style }} />
}

// A card-sized block for stat / panel placeholders.
export function SkeletonCard({ h = 96, style }) {
  return <div className="sk sk-card" style={{ height: h, ...style }} />
}

// Dashboard-shaped skeleton: mirrors the real layout (tracker bar → hero ring +
// KPI grid → chart panel) so the first paint doesn't jump when data lands.
export function DashboardSkeleton() {
  return (
    <div className="view" aria-busy="true" aria-label="กำลังโหลดข้อมูล">
      <SkeletonCard h={64} style={{ marginBottom: 16 }} />
      <SkeletonCard h={72} style={{ marginBottom: 16 }} />
      <div className="dash-hero" style={{ marginTop: 16 }}>
        <SkeletonCard h={260} />
        <div className="hero-kpis">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} h={120} />)}
        </div>
      </div>
      <SkeletonCard h={220} style={{ marginTop: 36 }} />
    </div>
  )
}
