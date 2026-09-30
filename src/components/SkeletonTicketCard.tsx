
export default function SkeletonTicketCard() {
  return (
    <div className="relative w-full">
      <div className="bg-muted/40 rounded-2xl border border-border/50 h-40 animate-pulse" />
      <div className="absolute inset-0 flex flex-col justify-center px-6 py-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted/60" />
            <div className="w-24 h-4 rounded bg-muted/60" />
          </div>
          <div className="w-16 h-3 rounded bg-muted/60" />
        </div>
        <div className="flex items-center justify-between mb-3">
          <div className="w-14 h-6 rounded bg-muted/60" />
          <div className="w-10 h-6 rounded-full bg-muted/60" />
          <div className="w-14 h-6 rounded bg-muted/60" />
        </div>
        <div className="flex items-center justify-center pt-2 border-t border-dashed border-border/30">
          <div className="w-16 h-4 rounded bg-muted/60" />
        </div>
      </div>
    </div>
  );
}
