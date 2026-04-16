'use client';

type AnalyticsSkeletonVariant = 'insights' | 'roi' | 'edits';

interface AnalyticsContentSkeletonProps {
  variant: AnalyticsSkeletonVariant;
}

function Bar({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-stone-200/90 ${className ?? ''}`} aria-hidden />;
}

const cardClass =
  'rounded-lg border border-(--zoya-analytics-card-border) bg-white p-4 shadow-sm md:p-6';

function InsightsSkeleton() {
  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cardClass}>
            <div className="mb-3 flex justify-between">
              <Bar className="h-8 w-8 rounded-lg" />
              <Bar className="h-3 w-14" />
            </div>
            <Bar className="mb-2 h-8 w-28" />
            <div className="flex items-center gap-2">
              <Bar className="h-3.5 w-32" />
            </div>
            <Bar className="mt-3 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className={cardClass}>
            <Bar className="mb-4 h-5 w-48" />
            <div className="flex gap-8">
              <Bar className="h-48 w-48 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 py-2">
                {[0, 1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center justify-between gap-2">
                    <Bar className="h-3 flex-1 max-w-[70%]" />
                    <Bar className="h-3 w-8 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className={cardClass}>
        <Bar className="mb-4 h-5 w-40" />
        <Bar className="h-40 w-full max-w-3xl" />
      </div>
    </>
  );
}

function ROISkeleton() {
  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cardClass}>
            <Bar className="mb-4 h-3 w-36" />
            <div className="mb-2 flex items-baseline gap-2">
              <Bar className="h-8 w-14" />
              <Bar className="h-4 w-4 rounded-full" />
              <Bar className="h-8 w-14" />
            </div>
            <Bar className="h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className={`${cardClass} min-h-[280px]`}>
            <Bar className="mb-4 h-4 w-44" />
            <Bar className="h-[220px] w-full" />
          </div>
        ))}
      </div>
      <div className={`${cardClass} mb-6 min-h-[260px]`}>
        <Bar className="mb-4 h-4 w-52" />
        <Bar className="h-[200px] w-full" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className={`${cardClass} min-h-[240px]`}>
            <Bar className="mb-4 h-4 w-40" />
            <Bar className="h-[180px] w-full" />
          </div>
        ))}
      </div>
    </>
  );
}

function EditsSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-lg border border-(--zoya-analytics-card-border) bg-white shadow-sm"
        >
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between gap-5">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Bar className="h-3 w-16" />
                  <Bar className="h-6 w-28 rounded" />
                  <Bar className="h-3 w-48 max-w-full" />
                </div>
                <Bar className="h-6 w-full max-w-2xl" />
                <Bar className="h-6 w-full max-w-xl" />
              </div>
              <div className="flex shrink-0 gap-6 pl-4">
                <div className="space-y-2 text-right">
                  <Bar className="ml-auto h-3 w-16" />
                  <Bar className="ml-auto h-7 w-12" />
                </div>
                <div className="space-y-2 text-right">
                  <Bar className="ml-auto h-3 w-16" />
                  <Bar className="ml-auto h-7 w-12" />
                </div>
                <Bar className="h-4 w-4 shrink-0 rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const labels: Record<AnalyticsSkeletonVariant, string> = {
  insights: 'Loading customer insights',
  roi: 'Loading ROI analytics',
  edits: 'Loading edits',
};

export function AnalyticsContentSkeleton({ variant }: AnalyticsContentSkeletonProps) {
  return (
    <div
      className="min-h-[min(480px,55vh)]"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={labels[variant]}
    >
      <span className="sr-only">{labels[variant]}</span>
      {variant === 'insights' ? <InsightsSkeleton /> : null}
      {variant === 'roi' ? <ROISkeleton /> : null}
      {variant === 'edits' ? <EditsSkeleton /> : null}
    </div>
  );
}
