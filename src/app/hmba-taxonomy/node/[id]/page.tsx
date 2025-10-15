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

          {/* Metadata Section */}
          <div className="px-6 py-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Metadata</h3>
            
            {nodeData.meta && Object.keys(nodeData.meta).length > 0 ? (
              <div className="grid gap-4">
                {Object.entries(nodeData.meta).map(([key, value]) => (
                  <div key={key} className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-100 last:border-b-0">
                    <div className="w-full sm:w-1/3 mb-2 sm:mb-0">
                      <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                        {key}
                      </span>
                    </div>
                    <div className="w-full sm:w-2/3">
                      <span className="text-gray-900">
                        {value !== null && value !== undefined ? String(value) : 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500">No metadata available for this node</p>
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
