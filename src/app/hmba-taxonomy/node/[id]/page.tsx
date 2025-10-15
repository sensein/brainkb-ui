'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type NodeMeta = Record<string, string | number | boolean | null | undefined>;

interface NodeData {
  name: string;
  meta?: NodeMeta;
  nodeColor?: string;
}

export default function NodeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [nodeData, setNodeData] = useState<NodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNodeData = async () => {
      try {
        setLoading(true);
        
        // Get the node ID from URL params
        const nodeId = params.id as string;
        
        if (!nodeId) {
          setError('No node ID provided');
          return;
        }

        // For now, we'll decode the data from the URL parameter
        // In a real app, you might fetch this from an API
        try {
          const decodedData = JSON.parse(decodeURIComponent(nodeId));
          setNodeData(decodedData);
        } catch (parseError) {
          setError('Invalid node data');
        }
      } catch (err) {
        setError('Failed to load node data');
        console.error('Error loading node data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNodeData();
  }, [params.id]);

  const handleBackClick = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading node details...</p>
        </div>
      </div>
    );
  }

  if (error || !nodeData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error</p>
            <p>{error || 'Node not found'}</p>
          </div>
          <button
            onClick={handleBackClick}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={handleBackClick}
                className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                title="Go back"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Node Details</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          {/* Node Name Section */}
          <div className="px-6 py-8 border-b border-gray-200">
            <div className="flex items-center">
              <div 
                className="w-8 h-8 rounded-full mr-4 flex-shrink-0"
                style={{ backgroundColor: nodeData.nodeColor || 'lightgray' }}
              ></div>
              <h2 className="text-3xl font-bold text-gray-900">{nodeData.name}</h2>
            </div>
          </div>

          {/* Node Information Section */}
          <div className="px-6 py-8 space-y-8">
            {/* Accession ID */}
            {nodeData.accession_id && (
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  <a 
                    href="https://brain-bican.github.io/models/accession_id/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline"
                    style={{ color: '#00416a' }}
                    onMouseEnter={(e) => e.target.style.color = '#005a8a'}
                    onMouseLeave={(e) => e.target.style.color = '#00416a'}
                  >
                    Accession ID:
                  </a> <span className="font-mono">{nodeData.accession_id}</span>
                </p>
              </div>
            )}

            {/* Parent */}
            {nodeData.parent && (
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  <span style={{ color: '#00416a' }}>Parent:</span> <span className="font-medium">{nodeData.parent}</span>
                </p>
              </div>
            )}

            {/* Abbreviations */}
            {nodeData.abbreviations && Array.isArray(nodeData.abbreviations) && nodeData.abbreviations.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-3">
                  <a 
                    href="https://brain-bican.github.io/models/has_abbreviation/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline"
                    style={{ color: '#00416a' }}
                    onMouseEnter={(e) => e.target.style.color = '#005a8a'}
                    onMouseLeave={(e) => e.target.style.color = '#00416a'}
                  >
                    Abbreviations:
                  </a>
                </h4>
                <div className="space-y-4">
                  {nodeData.abbreviations.map((abbr: any, index: number) => (
                    <div key={index} className="space-y-1">
                      <p className="font-bold text-gray-900">{abbr.term}</p>
                      {abbr.denotes && abbr.denotes.length > 0 && (
                        <p className="text-sm text-gray-600">
                          <a 
                            href="https://brain-bican.github.io/models/denotes_parcellation_term/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="underline"
                            style={{ color: '#00416a' }}
                            onMouseEnter={(e) => e.target.style.color = '#005a8a'}
                            onMouseLeave={(e) => e.target.style.color = '#00416a'}
                          >
                            Denotes:
                          </a>{' '}
                          {abbr.denotes.map((denote: string, idx: number) => {
                            const isUrl = denote.startsWith('http');
                            return (
                              <span key={idx}>
                                {isUrl ? (
                                  <a 
                                    href={denote} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline"
                                  >
                                    {denote.split('/').pop()}
                                  </a>
                                ) : (
                                  denote
                                )}
                                {idx < abbr.denotes.length - 1 && ', '}
                              </span>
                            );
                          })}
                        </p>
                      )}
                      {abbr.meaning && (
                        <p className="text-sm text-gray-600">
                          <a 
                            href="https://brain-bican.github.io/models/meaning/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="underline"
                            style={{ color: '#00416a' }}
                            onMouseEnter={(e) => e.target.style.color = '#005a8a'}
                            onMouseLeave={(e) => e.target.style.color = '#00416a'}
                          >
                            Meaning:
                          </a> {abbr.meaning}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Belongs to Set */}
            {nodeData.belongs_to_set && (
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  <span style={{ color: '#00416a' }}>Belongs to Set:</span> <span className="font-mono">{nodeData.belongs_to_set}</span>
                </p>
              </div>
            )}
          </div>

          {/* Actions Section */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
            <div className="flex justify-end">
              <button
                onClick={handleBackClick}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Back to Taxonomy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
