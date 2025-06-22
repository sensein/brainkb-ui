"use client";

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    onPreviousPage: () => void;
    onNextPage: () => void;
}

export default function PaginationControls({
    currentPage,
    totalPages,
    onPreviousPage,
    onNextPage
}: PaginationControlsProps) {
    return (
        <div className="flex justify-center mt-6 space-x-2">
            <button
                onClick={onPreviousPage}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded ${
                    currentPage === 1 
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
            >
                Previous
            </button>
            <span className="px-3 py-1 text-gray-600">
                Page {currentPage} of {totalPages}
            </span>
            <button
                onClick={onNextPage}
                disabled={currentPage >= totalPages}
                className={`px-3 py-1 rounded ${
                    currentPage >= totalPages
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
            >
                Next
            </button>
        </div>
    );
}
