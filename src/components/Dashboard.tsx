import { useState } from 'react';
import { LogOut, Database, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DocumentUpload } from './DocumentUpload';
import { DocumentList } from './DocumentList';
import { QueryInterface } from './QueryInterface';

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState<'query' | 'documents'>('query');

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 p-2 rounded-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Intelligence Centre</h1>
                <p className="text-xs text-slate-600">Multimodal RAG System</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{user?.email}</p>
                <p className="text-xs text-slate-500">Authenticated</p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 inline-flex">
            <button
              onClick={() => setActiveTab('query')}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                activeTab === 'query'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Query Documents
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                activeTab === 'documents'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Manage Documents
            </button>
          </div>
        </div>

        {activeTab === 'query' ? (
          <div className="space-y-6">
            <div className="bg-slate-900 text-white rounded-xl p-6 shadow-lg">
              <h2 className="text-2xl font-bold mb-2">Ask Anything</h2>
              <p className="text-slate-300">
                Search across your documents, images, and audio files using natural language.
                Get AI-powered answers with source citations.
              </p>
            </div>
            <QueryInterface />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DocumentUpload onUploadComplete={() => setRefreshTrigger(prev => prev + 1)} />
            <DocumentList refreshTrigger={refreshTrigger} />
          </div>
        )}
      </div>

      <footer className="border-t border-slate-200 bg-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <FileText className="w-5 h-5" />
              <span className="text-sm">
                Powered by Supabase Vector Database & AI
              </span>
            </div>
            <p className="text-sm text-slate-500">
              Intelligence Centre v1.0
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
