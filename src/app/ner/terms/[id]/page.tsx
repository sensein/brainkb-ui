"use client";
import {useState, useEffect} from 'react';
import {useParams} from 'next/navigation';
import {Loader2, AlertCircle, ArrowLeft, ExternalLink, Calendar, User, FileText, Tag as TagIcon, Award, MapPin, MessageSquare, Network, Database, BookOpen, Activity, Flag} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/src/app/components/ui/card";
import { Button } from "@/src/app/components/ui/button";
import { Badge } from "@/src/app/components/ui/badge";

// Helper function to get array value (first element if array, otherwise the value itself)
const getValue = (field: any): string | string[] => {
    if (Array.isArray(field)) {
        return field.length > 0 ? field.map(String) : [];
    }
    return field ? String(field) : '';
};

// Helper function to format date
const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
    } catch {
        return dateString;
    }
};

function ProvenanceTimeline({ history }: { history: any[] }) {
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

function ProvenancePanel({ history }: { history: any[] }) {
    const sortedVersions = history ? [...history].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ) : [];

    const [selectedId, setSelectedId] = useState<number>(0);
    const selected = sortedVersions[selectedId];

    if (!history || sortedVersions.length === 0) return null;

    return (
        <div className="rounded-xl border p-3">
            <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-muted-foreground">Version</label>
                <select
                    className="rounded-md border px-2 py-1 text-sm min-w-[200px]"
                    value={selectedId}
                    onChange={(e) => setSelectedId(Number(e.target.value))}
                >
                    {sortedVersions.map((v, idx) => (
                        <option key={idx} value={idx}>
                            v{idx + 1} — {formatDate(v.timestamp)}
                        </option>
                    ))}
                </select>
            </div>

            {selected && (
                <div className="mt-3 rounded-lg border bg-muted/30 p-2">
                    <div className="mb-1 text-xs text-muted-foreground">
                        Changes in <strong>v{sortedVersions.indexOf(selected) + 1}</strong>
                        {selected.updated_fields?.contributed_by && (
                            <> by <span className="font-medium">{getValue(selected.updated_fields.contributed_by)}</span></>
                        )}
                        , {formatDate(selected.timestamp)}
                    </div>
                    {selected.updated_fields && (
                        <ul className="space-y-1 text-sm">
                            {Object.entries(selected.updated_fields).map(([key, value]: [string, any]) => {
                                if (key === 'contributed_by' || key === 'documentName' || key === 'processedAt') return null;
                                
                                // Helper to render value properly
                                const renderValue = (val: any): React.ReactNode => {
                                    if (val === null || val === undefined) return <span className="text-xs text-muted-foreground">null</span>;
                                    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
                                        return <span className="text-xs text-muted-foreground">{String(val)}</span>;
                                    }
                                    if (Array.isArray(val)) {
                                        return (
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {val.map((v, i) => (
                                                    <div key={i}>{renderValue(v)}</div>
                                                ))}
                                            </div>
                                        );
                                    }
                                    if (typeof val === 'object') {
                                        // For nested objects, show a summary or skip complex nested structures
                                        if (key === 'judged_structured_information' || key === 'entity' || key === 'label') {
                                            return <span className="text-xs text-muted-foreground italic">Entity information updated</span>;
                                        }
                                        // For other objects, show a generic message
                                        return <span className="text-xs text-muted-foreground italic">Object (see details)</span>;
                                    }
                                    return <span className="text-xs text-muted-foreground">{String(val)}</span>;
                                };
                                
                                return (
                                    <li key={key} className="flex items-start gap-2">
                                        <span className="mt-0.5 inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                                        <div>
                                            <span className="font-medium">{key}</span>
                                            <div className="text-xs text-muted-foreground ml-2 mt-1">
                                                {renderValue(value)}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

function EnhancedDetailsSection({ item }: { item: any }) {
    const [activeTab, setActiveTab] = useState<string>("overview");

    const renderCard = (title: string, icon: any, content: React.ReactNode) => {
        const Icon = icon;
        const hasData = content !== null;

        return (
            <div className="space-y-3">
                <h3 className="text-base font-semibold flex items-center gap-2 text-foreground">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {title}
                </h3>
                {hasData ? (
                    <div className="space-y-2">
                        {content}
                    </div>
                ) : (
                    <div className="flex items-center justify-center py-6 text-muted-foreground rounded-lg border border-dashed">
                        <div className="text-center">
                            <Icon className="h-6 w-6 mx-auto mb-2 opacity-50" />
                            <p className="text-xs">No information available</p>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const entity = getValue(item.entity);
    const label = getValue(item.label);
    const paperTitle = Array.isArray(getValue(item.paper_title)) ? getValue(item.paper_title) as string[] : [getValue(item.paper_title) as string];
    const doi = Array.isArray(getValue(item.doi)) ? getValue(item.doi) as string[] : [getValue(item.doi) as string];
    const paperLocation = Array.isArray(getValue(item.paper_location)) ? getValue(item.paper_location) as string[] : [getValue(item.paper_location) as string];
    const judgeScore = Array.isArray(getValue(item.judge_score)) ? getValue(item.judge_score) as string[] : [getValue(item.judge_score) as string];
    const sentence = Array.isArray(getValue(item.sentence)) ? getValue(item.sentence) as string[] : [getValue(item.sentence) as string];
    const remarks = Array.isArray(getValue(item.remarks)) ? getValue(item.remarks) as string[] : [getValue(item.remarks) as string];
    const ontologyId = getValue(item.ontology_id);
    const ontologyLabel = getValue(item.ontology_label);
    const documentName = getValue(item.documentName);
    const start = Array.isArray(getValue(item.start)) ? getValue(item.start) as string[] : [getValue(item.start) as string];
    const end = Array.isArray(getValue(item.end)) ? getValue(item.end) as string[] : [getValue(item.end) as string];
    const contributedBy = getValue(item.contributed_by);
    const createdAt = formatDate(getValue(item.created_at) as string);
    const updatedAt = formatDate(getValue(item.updated_at) as string);
    const processedAt = formatDate(getValue(item.processedAt) as string);

    const tabs = [
        { id: "overview", label: "Overview", icon: Network },
        { id: "references", label: "References", icon: Database },
        { id: "context", label: "Context", icon: BookOpen },
        { id: "metadata", label: "Metadata", icon: Activity },
    ];

    return (
        <Card className="overflow-hidden p-0">
            {/* Tab Navigation */}
            <div className="flex border-b bg-muted/30">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all ${
                                isActive
                                    ? "border-b-2 border-primary text-primary bg-background"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            }`}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <CardContent className="p-6">
                {activeTab === "overview" && (
                    <div className="space-y-8">
                        {/* Entity Information */}
                        {renderCard(
                            "Entity Information",
                            Network,
                            entity ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="text-xs font-medium text-muted-foreground mb-1.5">Entity</div>
                                        <div className="text-sm font-semibold text-foreground">{Array.isArray(entity) ? entity[0] : entity}</div>
                                    </div>
                                    {label && (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-1.5">Label</div>
                                            <Badge variant="secondary" className="text-xs mt-1">
                                                {Array.isArray(label) ? label[0] : label}
                                            </Badge>
                                        </div>
                                    )}
                                    {judgeScore[0] && (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-1.5">Judge Score</div>
                                            <Badge variant="default" className="text-xs mt-1">
                                                {judgeScore[0]}
                                            </Badge>
                                        </div>
                                    )}
                                    {ontologyId && (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-1.5">Ontology ID</div>
                                            <div className="text-sm break-all text-foreground">{Array.isArray(ontologyId) ? ontologyId[0] : ontologyId}</div>
                                        </div>
                                    )}
                                    {ontologyLabel && (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-1.5">Ontology Label</div>
                                            <div className="text-sm text-foreground">{Array.isArray(ontologyLabel) ? ontologyLabel[0] : ontologyLabel}</div>
                                        </div>
                                    )}
                                </div>
                            ) : null
                        )}

                        {/* Remarks */}
                        {renderCard(
                            "Remarks",
                            TagIcon,
                            remarks[0] ? (
                                <div className="flex flex-wrap gap-2">
                                    {remarks.map((remark, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs px-2.5 py-1">
                                            {remark}
                                        </Badge>
                                    ))}
                                </div>
                            ) : null
                        )}
                    </div>
                )}

                {activeTab === "references" && (
                    <div className="space-y-8">
                        {/* Paper Information */}
                        {renderCard(
                            "Paper Information",
                            FileText,
                            paperTitle[0] || documentName ? (
                                <div className="space-y-3">
                                    {paperTitle[0] && (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-1.5">Paper Title</div>
                                            <div className="text-sm text-foreground leading-relaxed">{paperTitle[0]}</div>
                                        </div>
                                    )}
                                    {documentName && (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-1.5">Document Name</div>
                                            <div className="text-sm text-foreground">{Array.isArray(documentName) ? documentName[0] : documentName}</div>
                                        </div>
                                    )}
                                    {doi[0] && (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-1.5">DOI</div>
                                            <a
                                                href={`https://doi.org/${doi[0]}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-primary hover:underline flex items-center gap-1.5 mt-1"
                                            >
                                                {doi[0]}
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        </div>
                                    )}
                                    {paperLocation[0] && (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-1.5">Paper Location</div>
                                            <div className="text-sm text-foreground">{paperLocation[0]}</div>
                                        </div>
                                    )}
                                </div>
                            ) : null
                        )}
                    </div>
                )}

                {activeTab === "context" && (
                    <div className="space-y-8">
                        {/* Sentence */}
                        {renderCard(
                            "Sentence",
                            MessageSquare,
                            sentence[0] ? (
                                <div className="rounded-lg border bg-card p-4">
                                    <p className="text-sm leading-relaxed text-foreground">{sentence[0]}</p>
                                </div>
                            ) : null
                        )}

                        {/* Position Information */}
                        {renderCard(
                            "Position",
                            MapPin,
                            (start[0] || end[0]) ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {start[0] && (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-1.5">Start</div>
                                            <div className="text-sm text-foreground">{start[0]}</div>
                                        </div>
                                    )}
                                    {end[0] && (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-1.5">End</div>
                                            <div className="text-sm text-foreground">{end[0]}</div>
                                        </div>
                                    )}
                                </div>
                            ) : null
                        )}
                    </div>
                )}

                {activeTab === "metadata" && (
                    <div className="space-y-8">
                        {/* Contributor Information */}
                        {renderCard(
                            "Contributor",
                            User,
                            contributedBy ? (
                                <div className="rounded-lg border bg-card p-4">
                                    <div className="text-sm text-foreground">{Array.isArray(contributedBy) ? contributedBy[0] : contributedBy}</div>
                                </div>
                            ) : null
                        )}

                        {/* Dates */}
                        {renderCard(
                            "Timestamps",
                            Calendar,
                            (createdAt || updatedAt || processedAt) ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {createdAt && (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-1.5">Created At</div>
                                            <div className="text-sm text-foreground">{createdAt}</div>
                                        </div>
                                    )}
                                    {updatedAt && (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-1.5">Updated At</div>
                                            <div className="text-sm text-foreground">{updatedAt}</div>
                                        </div>
                                    )}
                                    {processedAt && (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-1.5">Processed At</div>
                                            <div className="text-sm text-foreground">{processedAt}</div>
                                        </div>
                                    )}
                                </div>
                            ) : null
                        )}

                        {/* Version */}
                        {item.version && renderCard(
                            "Version",
                            Activity,
                            <div className="rounded-lg border bg-card p-4">
                                <div className="text-sm text-foreground">{item.version}</div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

interface NERDetailPageProps {
    params: {
        id: string;
    };
}

export default function NERDetailPage({ params }: NERDetailPageProps) {
    const { id } = useParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDetail = async () => {
            setLoading(true);
            setError(null);

            try {
                // Fetch specific item by ID
                const decodedId = decodeURIComponent(id as string);
                const url = new URL('/api/ner', window.location.origin);
                url.searchParams.set('id', decodedId);

                const response = await fetch(url.toString(), {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                    throw new Error(errorData.error || `API returned ${response.status}`);
                }

                const result = await response.json();

                if (result.success) {
                    // If data is a single object, use it directly
                    if (result.data && !Array.isArray(result.data)) {
                        setData(result.data);
                    } else if (Array.isArray(result.data) && result.data.length > 0) {
                        setData(result.data[0]);
                    } else {
                        throw new Error('NER entity not found');
                    }
                } else {
                    throw new Error(result.error || 'Invalid response format');
                }
            } catch (e) {
                const err = e as Error;
                console.error("NER Detail: Error fetching:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchDetail();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="kb-page-margin">
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-12 h-12 text-sky-500 animate-spin mb-4" />
                    <p className="text-gray-600">Loading NER entity details...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="kb-page-margin">
                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 mb-6">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                        <div>
                            <h3 className="text-lg font-semibold text-red-800">Error Loading Data</h3>
                            <p className="text-red-700">{error || 'NER entity not found'}</p>
                        </div>
                    </div>
                </div>
                <Link 
                    href="/ner"
                    className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to NER List
                </Link>
            </div>
        );
    }

    const entity = getValue(data.entity);
    const label = getValue(data.label);
    const paperTitle = Array.isArray(getValue(data.paper_title)) ? getValue(data.paper_title) as string[] : [getValue(data.paper_title) as string];
    const doi = Array.isArray(getValue(data.doi)) ? getValue(data.doi) as string[] : [getValue(data.doi) as string];
    const description = paperTitle[0] || (Array.isArray(entity) ? entity[0] : entity);

    return (
        <div className="kb-page-margin">
            <div className="fix-left-margin max-w-[1600px]">
                {/* Back Button */}
                <div className="mb-6">
                    <Link 
                        href="/ner"
                        className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 font-medium transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to NER List
                    </Link>
                </div>

                {/* Header Section - matching DialogHeader */}
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                        {Array.isArray(entity) ? entity[0] : entity}
                    </h1>
                    <div className="p-4 rounded-lg border bg-muted/30">
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            {description}
                        </p>
                    </div>
                </div>

            {/* Layout: Enhanced with better width utilization - matching resources popup */}
            <div className="space-y-6">
                {/* Top row: Tabbed details and related concepts */}
                <div className="grid gap-8 lg:grid-cols-[2fr_1fr] max-w-full">
                    {/* Tabbed Details Section */}
                    <div className="min-w-0">
                        <EnhancedDetailsSection item={data} />
                    </div>

                    {/* Related Concepts - Empty for now, can be populated later */}
                    <aside className="lg:sticky lg:top-6 lg:self-start min-w-0">
                        <Card>
                            <CardHeader>
                                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Related Entities
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-muted-foreground py-2">No related entities</div>
                            </CardContent>
                        </Card>
                    </aside>
                </div>

                {/* Provenance section - Full Width */}
                {data.history && Array.isArray(data.history) && data.history.length > 0 && (
                    <div className="space-y-4">
                        <ProvenanceTimeline history={data.history} />
                        <ProvenancePanel history={data.history} />
                    </div>
                )}

                {/* Footer - matching DialogFooter */}
                <div className="mt-8 flex w-full items-center justify-between pt-6 border-t">
                    <div className="text-xs text-muted-foreground">
                        {/* left empty intentionally */}
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                        >
                            <Flag className="h-4 w-4" /> Suggest correction
                        </Button>

                    </div>
                </div>
            </div>
            </div>
        </div>
    );
}
