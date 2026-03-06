export default function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-5 w-5 border-2',
    md: 'h-8 w-8 border-[3px]',
    lg: 'h-12 w-12 border-4',
  }

  return (
    <div
      className={`animate-spin rounded-full border-primary/30 border-t-primary ${sizes[size] || sizes.md} ${className}`}
    />
  )
}

export function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center bg-bg">
      <Spinner size="lg" />
    </div>
  )
}
