"use client";

import { Entity } from "@/src/app/ner/types";

interface EntityDetailModalProps {
    selectedEntity: {
        type: string;
        entity: Entity;
    } | null;
    onClose: () => void;
}

export default function EntityDetailModal({ selectedEntity, onClose }: EntityDetailModalProps) {
    if (!selectedEntity) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Entity Details</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Entity Type</p>
                        <p className="text-base">{selectedEntity.type}</p>
                    </div>
                    {selectedEntity.entity.entityType && (
                        <div>
                            <p className="text-sm font-medium text-gray-500">Classification</p>
                            <p className="text-base">{selectedEntity.entity.entityType}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-sm font-medium text-gray-500">Current Text</p>
                        <p className="text-base font-medium">{selectedEntity.entity.correction || selectedEntity.entity.text}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Original Text</p>
                        <p className="text-base">{selectedEntity.entity.originalText || selectedEntity.entity.text}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Confidence</p>
                        <p className="text-base">{(selectedEntity.entity.confidence * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Status</p>
                        <p className="text-base">
                            {selectedEntity.entity.feedback === 'up' ? (
                                <span className="text-green-600">Approved</span>
                            ) : selectedEntity.entity.feedback === 'down' ? (
                                <span className="text-red-600">Pending Review</span>
                            ) : (
                                <span className="text-gray-600">Not Reviewed</span>
                            )}
                            {selectedEntity.entity.corrected && (
                                <span className="ml-2 text-yellow-600">(Corrected)</span>
                            )}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Contributed By</p>
                        <p className="text-base">{selectedEntity.entity.contributedBy || "Anonymous"}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Submitted At</p>
                        <p className="text-base">{selectedEntity.entity.submittedAt ? new Date(selectedEntity.entity.submittedAt).toLocaleString() : "Unknown"}</p>
                    </div>
                </div>

                {/* Sentence Context */}
                {selectedEntity.entity.sentence && (
                    <div className="mb-4">
                        <p className="text-sm font-medium text-gray-500 mb-2">Sentence Context</p>
                        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded">
                            <p dangerouslySetInnerHTML={{
                                __html: selectedEntity.entity.sentence.replace(
                                    selectedEntity.entity.text,
                                    `<span class="${(selectedEntity.entity.correction || selectedEntity.entity.corrected) ? 'bg-yellow-300 dark:bg-yellow-700' : 'bg-yellow-200 dark:bg-yellow-600'} px-1 rounded font-medium">${selectedEntity.entity.correction || selectedEntity.entity.text}</span>`
                                )
                            }} />
                        </div>
                    </div>
                )}

                {/* Correction History */}
                <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Change History</p>
                    {selectedEntity.entity.correctionHistory && selectedEntity.entity.correctionHistory.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Change Type</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Original</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Changed To</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Changed By</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {selectedEntity.entity.correctionHistory.map((history, idx) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                                {history.changeType === 'text' ? 'Text Correction' :
                                                 history.changeType === 'type' ? 'Type Change' :
                                                 'Text & Type Change'}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                                {history.changeType === 'text' || history.changeType === 'both' ?
                                                    history.originalText :
                                                    history.changeType === 'type' ?
                                                        history.originalType : ''}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                                {history.changeType === 'text' || history.changeType === 'both' ?
                                                    history.correctedText :
                                                    history.changeType === 'type' ?
                                                        history.newType : ''}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{history.correctedBy}</td>
                                            <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{new Date(history.correctedAt).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No correction history available</p>
                    )}
                </div>
            </div>
        </div>
    );
}
