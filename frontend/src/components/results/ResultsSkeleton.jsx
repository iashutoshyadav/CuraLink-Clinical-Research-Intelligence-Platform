import React from 'react';

function SkeletonBar({ width = '100%', height = 12 }) {
  return (
    <div
      className="rounded"
      style={{ width, height, background: '#ececec', animation: 'skeletonPulse 1.4s ease-in-out infinite' }}
    />
  );
}

export default function ResultsSkeleton() {
  return (
    <>
      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
      `}</style>

      <div className="space-y-3 pt-2">
        {}
        <div className="flex gap-2 pb-1">
          {[88, 110, 96, 72].map((w, i) => (
            <div key={i} className="rounded-lg" style={{ width: w, height: 28, background: '#ececec', animation: 'skeletonPulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>

        {}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: '#f9fafb', border: '1px solid #f0f0f0' }}>
          <SkeletonBar width="55%" height={16} />
          <div className="space-y-2 pt-1">
            <SkeletonBar width="92%" />
            <SkeletonBar width="78%" />
            <SkeletonBar width="86%" />
          </div>

          <div className="pt-2 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl p-3 space-y-2" style={{ background: '#ffffff', border: '1px solid #f0f0f0' }}>
                <SkeletonBar width="45%" height={13} />
                <SkeletonBar width="88%" />
                <SkeletonBar width="70%" />
              </div>
            ))}
          </div>
        </div>

        {}
        <div className="flex gap-3">
          {[64, 80, 72].map((w, i) => (
            <SkeletonBar key={i} width={w} height={24} />
          ))}
        </div>
      </div>
    </>
  );
}
