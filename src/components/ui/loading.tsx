export function Loading({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center min-h-[200px] ${className ?? ''}`}>
      <div className="loader" />
    </div>
  )
}
