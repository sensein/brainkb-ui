"use client";

interface ProvenanceTimelineProps {
    history: any[];
}

export function ProvenanceTimeline({ history }: ProvenanceTimelineProps) {
    if (!history || history.length === 0) return null;
    
    const versions = [...history].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const shouldShowAll = versions.length <= 4;
    const displayVersions = shouldShowAll
        ? versions
        : [
            versions[0],
            ...versions.slice(1, -1).filter((_, i) => i % 2 === 0),
            versions[versions.length - 1]
        ];

    const svgWidth = Math.max(400, displayVersions.length * 120);
    const lineWidth = svgWidth - 80;

    return (
        <div className="w-full rounded-xl border p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                History
            </div>
            <div className="mt-3">
                <svg viewBox={`0 0 ${svgWidth} 80`} className="w-full">
                    <line x1="40" y1="35" x2={lineWidth + 40} y2="35" stroke="#c4b5fd" strokeWidth="3" strokeLinecap="round" />
                    {displayVersions.map((v, i) => {
                        const x = 40 + (i * (lineWidth / Math.max(displayVersions.length - 1, 1)));
                        const isCurrent = i === displayVersions.length - 1;
                        const isFirst = i === 0;
                        const isLast = i === displayVersions.length - 1;
                        const showLabel = isFirst || isLast || isCurrent || shouldShowAll;

                        return (
                            <g key={i}>
                                <circle cx={x} cy={35} r={isCurrent ? 10 : 7} fill={isCurrent ? "#7c3aed" : "#a78bfa"} />
                                {showLabel && (
                                    <text x={x} y={60} fontSize="9" textAnchor="middle" fill="#6b7280" className="font-medium">
                                        v{versions.indexOf(v) + 1}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}

