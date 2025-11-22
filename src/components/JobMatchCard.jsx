"use client";
import { useMemo } from 'react';

export default function JobMatchCard({ jdFileName, matchResult, loading, error }) {
  const percent = useMemo(() => {
    const v = Number(matchResult?.match ?? 0);
    if (Number.isNaN(v)) return 0;
    return Math.max(0, Math.min(100, Math.round(v)));
  }, [matchResult]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Job Match</h3>
        {jdFileName && <span className="text-xs text-slate-500">{jdFileName}</span>}
      </div>

      {loading && (
        <p className="text-slate-500 mt-3 text-sm">Analyzing match…</p>
      )}

      {error && (
        <p className="text-red-600 mt-3 text-sm">{error}</p>
      )}

      {!loading && !error && matchResult && (
        <div className="mt-3 space-y-4">
          <div>
            <div className="text-3xl font-bold">{percent}%</div>
            <div className="text-slate-500 text-sm">Overall Match</div>
          </div>

          {Array.isArray(matchResult.strengths) && matchResult.strengths.length > 0 && (
            <div>
              <div className="font-medium">Strengths</div>
              <ul className="list-disc ml-5 text-sm text-slate-700 mt-1 space-y-1">
                {matchResult.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(matchResult.gaps) && matchResult.gaps.length > 0 && (
            <div>
              <div className="font-medium">Gaps</div>
              <ul className="list-disc ml-5 text-sm text-slate-700 mt-1 space-y-1">
                {matchResult.gaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}

          {matchResult.insights && (
            <div>
              <div className="font-medium">Insights</div>
              <p className="text-sm text-slate-700 mt-1">{matchResult.insights}</p>
            </div>
          )}
        </div>
      )}

      {!loading && !error && !matchResult && (
        <p className="text-slate-500 mt-3 text-sm">Upload a job description to see the match analysis.</p>
      )}
    </div>
  );
}
