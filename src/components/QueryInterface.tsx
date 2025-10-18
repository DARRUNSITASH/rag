import { useState } from 'react';
import { Search, Sparkles, FileText, Image, Music } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Citation {
  source: string;
  type: string;
  reference: string;
  document_id: string;
}

interface SearchResult {
  answer: string;
  citations: Citation[];
  query: string;
}

export function QueryInterface() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/query-rag`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query, user_id: user?.id })
        }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResult(data);

      await supabase.from('queries').insert({
        user_id: user?.id,
        query_text: query,
        retrieved_chunks: data.retrieved_chunks || [],
        generated_response: data.answer,
        citations: data.citations
      });

    } catch (err: any) {
      setError(err.message || 'An error occurred during search');
    } finally {
      setLoading(false);
    }
  };

  const getCitationIcon = (type: string) => {
    if (type === 'Image') return <Image className="w-4 h-4" />;
    if (type === 'Audio') return <Music className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-slate-900" />
          <h2 className="text-xl font-semibold text-slate-900">Ask Your Documents</h2>
        </div>

        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="w-full pl-12 pr-4 py-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition text-slate-900 placeholder-slate-400"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="w-full bg-slate-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Search
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Answer</h3>
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {result.answer}
              </p>
            </div>
          </div>

          {result.citations && result.citations.length > 0 && (
            <div className="border-t border-slate-200 pt-4 mt-4">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">
                Citations ({result.citations.length})
              </h4>
              <div className="space-y-2">
                {result.citations.map((citation, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center justify-center w-6 h-6 bg-slate-200 text-slate-700 rounded-full text-xs font-semibold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-slate-600">
                          {getCitationIcon(citation.type)}
                        </div>
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {citation.source}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="font-medium">Type:</span>
                        <span>{citation.type}</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-medium">Ref:</span>
                        <span>{citation.reference}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
