import { useEffect, useState } from 'react';
import { FileText, Image, Music, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase, Document } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function DocumentList({ refreshTrigger }: { refreshTrigger: number }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadDocuments();
  }, [refreshTrigger]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('uploaded_by', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (doc: Document) => {
    if (!confirm(`Delete ${doc.filename}?`)) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.storage_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const getFileIcon = (type: string) => {
    if (type === 'image') return <Image className="w-5 h-5" />;
    if (type === 'audio') return <Music className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return (
        <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
          <CheckCircle className="w-3 h-3" />
          Ready
        </span>
      );
    }
    if (status === 'processing') {
      return (
        <span className="flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full">
          <Clock className="w-3 h-3" />
          Processing
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span className="flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-1 rounded-full">
          <XCircle className="w-3 h-3" />
          Failed
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs text-slate-700 bg-slate-50 px-2 py-1 rounded-full">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">
        Document Library ({documents.length})
      </h2>

      {documents.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">No documents uploaded yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Upload documents to start building your knowledge base
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="text-slate-600">
                  {getFileIcon(doc.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {doc.filename}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-slate-500">
                      {(doc.file_size / 1024).toFixed(1)} KB
                    </p>
                    <span className="text-slate-300">•</span>
                    <p className="text-xs text-slate-500">
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {getStatusBadge(doc.processing_status)}
                <button
                  onClick={() => deleteDocument(doc)}
                  className="text-slate-400 hover:text-red-600 transition p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
