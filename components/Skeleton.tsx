export default function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#E5E7EB] dark:bg-[#242424] rounded-md ${className}`} />
}
