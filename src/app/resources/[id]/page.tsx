"use client";
import {useState, useEffect} from 'react';
import {useParams} from 'next/navigation';
import {Loader2, AlertCircle, ArrowLeft, ExternalLink, Calendar, User, FileText, Tag as TagIcon, Award, MapPin, MessageSquare, Network, Database, BookOpen, Activity, Flag, Link as LinkIcon, Package} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/src/app/components/ui/card";
import { Button } from "@/src/app/components/ui/button";
import { Badge } from "@/src/app/components/ui/badge";
import { getValue, formatDate } from "@/src/app/components/detail/helpers";
import { ProvenanceTimeline } from "@/src/app/components/detail/ProvenanceTimeline";
import { ProvenancePanel } from "@/src/app/components/detail/ProvenancePanel";

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

    const name = getValue(item.name);
    const category = getValue(item.category);
    const type = getValue(item.type);
    const description = Array.isArray(getValue(item.description)) ? getValue(item.description) as string[] : [getValue(item.description) as string];
    const judgeScore = Array.isArray(getValue(item.judge_score)) ? getValue(item.judge_score) as string[] : [getValue(item.judge_score) as string];
    const target = Array.isArray(getValue(item.target)) ? getValue(item.target) as string[] : [getValue(item.target) as string];
    const specificTarget = Array.isArray(getValue(item.specific_target)) ? getValue(item.specific_target) as string[] : [getValue(item.specific_target) as string];
    const url = Array.isArray(getValue(item.url)) ? getValue(item.url) as string[] : [getValue(item.url) as string];
    // Handle mapped_target_concept array
    const mappedTargetConcept = item.mapped_target_concept && Array.isArray(item.mapped_target_concept) && item.mapped_target_concept.length > 0
        ? item.mapped_target_concept[0]
        : null;
    const mappedTargetLabel = mappedTargetConcept?.label;
    const mappedTargetId = mappedTargetConcept?.id;
    const ontology = mappedTargetConcept?.ontology;
    
    // Handle mapped_specific_target_concept array
    const mappedSpecificTargetConcept = item.mapped_specific_target_concept && Array.isArray(item.mapped_specific_target_concept) && item.mapped_specific_target_concept.length > 0
        ? item.mapped_specific_target_concept[0]?.mapped_target_concept
        : null;
    const mappedSpecificTargetLabel = mappedSpecificTargetConcept?.label;
    const mappedSpecificTargetId = mappedSpecificTargetConcept?.id;
    const specificTargetOntology = mappedSpecificTargetConcept?.ontology;
    
    // Handle mentions object
    const mentions = item.mentions || {};
    const datasets = Array.isArray(mentions.datasets) ? mentions.datasets : [];
    const papers = Array.isArray(mentions.papers) ? mentions.papers : [];
    const tools = Array.isArray(mentions.tools) ? mentions.tools : [];
    const contributedBy = getValue(item.contributed_by);
    const createdAt = formatDate(getValue(item.created_at) as string);
    const updatedAt = formatDate(getValue(item.updated_at) as string);
    const processedAt = formatDate(getValue(item.processedAt) as string);

    const tabs = [
        { id: "overview", label: "Overview", icon: Network },
        { id: "details", label: "Details", icon: Database },
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
                        {/* Resource Information */}
                        {renderCard(
                            "Resource Information",
                            Package,
                            name ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="rounded-lg border bg-card p-4">
                                        <div className="text-xs font-medium text-muted-foreground mb-1.5">Name</div>
                                        <div className="text-sm font-semibold text-foreground">{Array.isArray(name) ? name[0] : name}</div>
                                    </div>
                                    {category && (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-1.5">Category</div>
                                            <Badge variant="secondary" className="text-xs mt-1">
                                                {Array.isArray(category) ? category[0] : category}
                                            </Badge>
                                        </div>
                                    )}
                                    {type && (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-1.5">Type</div>
                                            <Badge variant="secondary" className="text-xs mt-1">
                                                {Array.isArray(type) ? type[0] : type}
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
                                </div>
                            ) : null
                        )}

                        {/* Description */}
                        {renderCard(
                            "Description",
                            MessageSquare,
                            description[0] ? (
                                <div className="rounded-lg border bg-card p-4">
                                    <p className="text-sm leading-relaxed text-foreground">{description[0]}</p>
                                </div>
                            ) : null
                        )}
                    </div>
                )}

                {activeTab === "details" && (
                    <div className="space-y-8">
                        {/* Target Information */}
                        {renderCard(
                            "Target Information",
                            MapPin,
                            (target[0] || specificTarget[0] || mappedTargetLabel || mappedSpecificTargetLabel) ? (
                                <div className="space-y-3">
                                    {target[0] && (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-1.5">Target</div>
                                            <div className="text-sm text-foreground">{target[0]}</div>
                                        </div>
                                    )}
                                    {specificTarget[0] && (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-1.5">Specific Target</div>
                                            <div className="text-sm text-foreground">{specificTarget[0]}</div>
                                        </div>
                                    )}
                                    {mappedTargetLabel && (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-1.5">Mapped Target</div>
                                            <div className="text-sm text-foreground">{mappedTargetLabel}</div>
                                            {mappedTargetId && (
                                                <div className="text-xs text-muted-foreground mt-1 break-all">{mappedTargetId}</div>
                                            )}
                                            {ontology && (
                                                <Badge variant="outline" className="text-xs mt-1">
                                                    {ontology}
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                    {mappedSpecificTargetLabel && (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-1.5">Mapped Specific Target</div>
                                            <div className="text-sm text-foreground">{mappedSpecificTargetLabel}</div>
                                            {mappedSpecificTargetId && (
                                                <div className="text-xs text-muted-foreground mt-1 break-all">{mappedSpecificTargetId}</div>
                                            )}
                                            {specificTargetOntology && (
                                                <Badge variant="outline" className="text-xs mt-1">
                                                    {specificTargetOntology}
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : null
                        )}

                        {/* Mentions */}
                        {renderCard(
                            "Mentions",
                            Database,
                            (datasets.length > 0 || papers.length > 0 || tools.length > 0) ? (
                                <div className="space-y-4">
                                    {datasets.length > 0 && (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-2">Datasets</div>
                                            <ul className="space-y-1">
                                                {datasets.map((ds: string, idx: number) => (
                                                    <li key={idx} className="text-sm text-foreground">• {ds}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {papers.length > 0 && (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-2">Papers</div>
                                            <ul className="space-y-1">
                                                {papers.map((paper: string, idx: number) => (
                                                    <li key={idx} className="text-sm text-foreground">• {paper}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {tools.length > 0 && (
                                        <div className="rounded-lg border bg-card p-4">
                                            <div className="text-xs font-medium text-muted-foreground mb-2">Tools</div>
                                            <ul className="space-y-1">
                                                {tools.map((tool: string, idx: number) => (
                                                    <li key={idx} className="text-sm text-foreground">• {tool}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ) : null
                        )}

                        {/* URL */}
                        {renderCard(
                            "URL",
                            LinkIcon,
                            url[0] ? (
                                <div className="rounded-lg border bg-card p-4">
                                    <a
                                        href={url[0]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-primary hover:underline flex items-center gap-1.5"
                                    >
                                        {url[0]}
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
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

export default function ResourceDetailPage({ params }: { params: { id: string } }) {
    const { id } = useParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDetail = async () => {
            setLoading(true);
            setError(null);

            try {
                const decodedId = decodeURIComponent(id as string);
                const endpoint = process.env.NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT;
                if (!endpoint) {
                    throw new Error('NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT environment variable is not set');
                }
                
                const url = new URL('/api/resources/withouttoken', window.location.origin);
                url.searchParams.set('endpoint', endpoint);
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
                    let rawData;
                    if (result.data && !Array.isArray(result.data)) {
                        rawData = result.data;
                    } else if (Array.isArray(result.data) && result.data.length > 0) {
                        rawData = result.data[0];
                    } else {
                        throw new Error('Resource not found');
                    }
                    
                    // Extract resource data from nested structure
                    const resourceData = rawData?.judged_structured_information?.judge_resource?.["1"]?.[0];
                    if (!resourceData) {
                        throw new Error('Resource data not found in nested structure');
                    }
                    
                    // Merge resource data with top-level fields
                    const extractedData = {
                        _id: rawData._id,
                        name: resourceData.name,
                        description: resourceData.description,
                        type: resourceData.type,
                        category: resourceData.category,
                        target: resourceData.target,
                        specific_target: resourceData.specific_target,
                        mapped_target_concept: resourceData.mapped_target_concept,
                        mapped_specific_target_concept: resourceData.mapped_specific_target_concept,
                        url: resourceData.url,
                        judge_score: resourceData.judge_score,
                        mentions: resourceData.mentions,
                        documentName: rawData.documentName,
                        contributed_by: rawData.contributed_by,
                        created_at: rawData.created_at,
                        updated_at: rawData.updated_at,
                        processedAt: rawData.processedAt,
                        history: rawData.history,
                        version: rawData.version
                    };
                    
                    setData(extractedData);
                } else {
                    throw new Error(result.error || 'Invalid response format');
                }
            } catch (e) {
                const err = e as Error;
                console.error("Resource Detail: Error fetching:", err);
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
                    <p className="text-gray-600">Loading resource details...</p>
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
                            <p className="text-red-700">{error || 'Resource not found'}</p>
                        </div>
                    </div>
                </div>
                <Link 
                    href="/resources"
                    className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Resources List
                </Link>
            </div>
        );
    }

    const name = getValue(data.name);
    const description = Array.isArray(getValue(data.description)) ? getValue(data.description) as string[] : [getValue(data.description) as string];
    const displayDescription = description[0] || (Array.isArray(name) ? name[0] : name);
    const url = Array.isArray(getValue(data.url)) ? getValue(data.url) as string[] : [getValue(data.url) as string];

    return (
        <div className="kb-page-margin">
            <div className="fix-left-margin max-w-[1600px]">
                {/* Back Button */}
                <div className="mb-6">
                    <Link 
                        href="/resources"
                        className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 font-medium transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Resources List
                    </Link>
                </div>

                {/* Header Section */}
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                        {Array.isArray(name) ? name[0] : name}
                    </h1>
                    <div className="p-4 rounded-lg border bg-muted/30">
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            {displayDescription}
                        </p>
                    </div>
                </div>

                {/* Layout */}
                <div className="space-y-6">
                    {/* Top row: Tabbed details and related concepts */}
                    <div className="grid gap-8 lg:grid-cols-[2fr_1fr] max-w-full">
                        {/* Tabbed Details Section */}
                        <div className="min-w-0">
                            <EnhancedDetailsSection item={data} />
                        </div>

                        {/* Related Concepts */}
                        <aside className="lg:sticky lg:top-6 lg:self-start min-w-0">
                            <Card>
                                <CardHeader>
                                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Related Resources
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm text-muted-foreground py-2">No related resources</div>
                                </CardContent>
                            </Card>
                        </aside>
                    </div>

                    {/* Provenance section - Full Width */}
                    {data.history && Array.isArray(data.history) && data.history.length > 0 && (
                        <div className="space-y-4">
                            <ProvenanceTimeline history={data.history} />
                            <ProvenancePanel history={data.history} entityType="resource" />
                        </div>
                    )}

                    {/* Footer */}
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

