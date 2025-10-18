import { useState, useRef } from 'react';
import { Upload, FileText, Image, Music, FileCheck, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface UploadedFile {
  file: File;
  id: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
}

export function DocumentUpload({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const getFileType = (file: File): 'pdf' | 'docx' | 'txt' | 'image' | 'audio' => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (ext === 'docx' || ext === 'doc') return 'docx';
    if (ext === 'txt') return 'txt';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) return 'audio';
    return 'txt';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    const uploadedFiles: UploadedFile[] = selectedFiles.map(file => ({
      file,
      id: crypto.randomUUID(),
      status: 'uploading'
    }));

    setFiles(prev => [...prev, ...uploadedFiles]);

    for (const uploadedFile of uploadedFiles) {
      try {
        const fileType = getFileType(uploadedFile.file);
        const fileName = `${user?.id}/${Date.now()}_${uploadedFile.file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, uploadedFile.file);

        if (uploadError) throw uploadError;

        setFiles(prev => prev.map(f =>
          f.id === uploadedFile.id ? { ...f, status: 'processing' } : f
        ));

        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            filename: uploadedFile.file.name,
            file_type: fileType,
            file_size: uploadedFile.file.size,
            storage_path: fileName,
            uploaded_by: user?.id,
            metadata: {
              original_name: uploadedFile.file.name,
              mime_type: uploadedFile.file.type
            }
          });

        if (dbError) throw dbError;

        setFiles(prev => prev.map(f =>
          f.id === uploadedFile.id ? { ...f, status: 'completed' } : f
        ));

      } catch (error) {
        console.error('Upload error:', error);
        setFiles(prev => prev.map(f =>
          f.id === uploadedFile.id ? { ...f, status: 'error' } : f
        ));
      }
    }

    onUploadComplete();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const getFileIcon = (file: File) => {
    const type = getFileType(file);
    if (type === 'image') return <Image className="w-5 h-5" />;
    if (type === 'audio') return <Music className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Upload Documents</h2>

      <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition">
        <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600 mb-2">
          Drag and drop files or click to browse
        </p>
        <p className="text-sm text-slate-500 mb-4">
          Supports PDF, DOCX, TXT, Images (JPG, PNG), and Audio (MP3, WAV)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png,.gif,.webp,.mp3,.wav,.ogg,.m4a"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-block bg-slate-900 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-slate-800 transition"
        >
          Select Files
        </label>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-2">
          {files.map(uploadedFile => (
            <div
              key={uploadedFile.id}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-slate-600">
                  {getFileIcon(uploadedFile.file)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(uploadedFile.file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {uploadedFile.status === 'uploading' && (
                  <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                )}
                {uploadedFile.status === 'processing' && (
                  <div className="text-yellow-600 text-sm font-medium">Processing...</div>
                )}
                {uploadedFile.status === 'completed' && (
                  <FileCheck className="w-5 h-5 text-green-600" />
                )}
                {uploadedFile.status === 'error' && (
                  <span className="text-red-600 text-sm font-medium">Error</span>
                )}
                <button
                  onClick={() => removeFile(uploadedFile.id)}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
