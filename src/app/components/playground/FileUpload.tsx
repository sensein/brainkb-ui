'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadProps {
  title: string;
  acceptedFileTypes: Record<string, string[]>;
  onFileUpload: (files: File[]) => void;
}

export default function FileUpload({ title, acceptedFileTypes, onFileUpload }: FileUploadProps) {
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const file = acceptedFiles[0];

      // Use text reader for all files
      const reader = new FileReader();
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };

      reader.onload = () => {
        setIsUploading(false);
        onFileUpload(acceptedFiles);
      };

      reader.onerror = () => {
        setIsUploading(false);
        console.error('Error reading file');
      };

      // Read the entire file
      reader.readAsText(file);
    } catch (error) {
      console.error('Error processing file:', error);
      setIsUploading(false);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxFiles: 1
  });

  return (
    <div className="w-full max-w-xl">
      <div
        {...getRootProps()}
        className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'}`}
      >
        <input {...getInputProps()} />
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">Drag and drop a file here, or click to select</p>
        <div className="text-xs text-gray-500">
          <p>Supported formats:</p>
          <ul className="list-none">
            <li>• JSON-LD (.jsonld)</li> 
            <li>• Turtle (.ttl)</li>
            {/*<li>• PDF (.pdf)</li> to enable later*/}
          </ul>
        </div>
      </div>
      {isUploading && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2 text-center">
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}
    </div>
  );
}
