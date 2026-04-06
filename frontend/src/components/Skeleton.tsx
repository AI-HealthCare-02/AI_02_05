export function SkeletonBox({ className }: { className?: string }) {
  return <div className={`bg-gray-200 rounded-xl animate-pulse ${className}`} />;
}

export function ScheduleSkeleton() {
  return (
    <div className="space-y-4">
      {/* 통계 스켈레톤 */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-3 text-center">
            <SkeletonBox className="h-7 w-12 mx-auto mb-1" />
            <SkeletonBox className="h-3 w-10 mx-auto" />
          </div>
        ))}
      </div>

      {/* 처방전 그룹 스켈레톤 */}
      {[1, 2].map((g) => (
        <div key={g} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <SkeletonBox className="w-1.5 h-1.5 rounded-full" />
            <SkeletonBox className="h-3 w-28" />
            <SkeletonBox className="h-3 w-16" />
          </div>
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                <div className="flex items-center gap-2">
                  <SkeletonBox className="w-5 h-5 rounded-full" />
                  <SkeletonBox className="h-4 w-16" />
                  <SkeletonBox className="h-3 w-10" />
                </div>
                <SkeletonBox className="h-7 w-20 rounded-full" />
              </div>
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center gap-3 px-4 py-3 border-t border-gray-50">
                  <SkeletonBox className="w-5 h-5 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <SkeletonBox className="h-4 w-32" />
                    <SkeletonBox className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"} items-end gap-2`}>
          {i % 2 !== 0 && <SkeletonBox className="w-7 h-7 rounded-full flex-shrink-0" />}
          <SkeletonBox className={`h-12 rounded-2xl ${i % 2 === 0 ? "w-48" : "w-56"}`} />
        </div>
      ))}
    </div>
  );
}
