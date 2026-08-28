export function Pastille({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
      {n > 9 ? '9+' : n}
    </span>
  )
}
