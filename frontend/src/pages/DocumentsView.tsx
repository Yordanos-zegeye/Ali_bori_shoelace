import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Plus, RefreshCw, Download, 
  ExternalLink, Calendar, FileCheck
} from 'lucide-react';
import { api } from '../api/client';

export const DocumentsView: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDoc, setNewDoc] = useState({
    title: '',
    document_type: 'MANUAL',
    file_reference: '',
    description: '',
  });

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>('/documents/items/');
      setDocuments(res.results || res);
    } catch (err) {
      console.error('Failed to load documents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/documents/items/', newDoc);
      setShowAddModal(false);
      setNewDoc({ title: '', document_type: 'MANUAL', file_reference: '', description: '' });
      fetchDocuments();
    } catch (err: any) {
      alert(err.message || 'Failed to register document');
    }
  };

  const filteredDocs = documents.filter((d) => {
    const term = searchTerm.toLowerCase();
    return (
      d.title.toLowerCase().includes(term) ||
      (d.document_type && d.document_type.toLowerCase().includes(term)) ||
      (d.description && d.description.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-factory-darkCard p-5 rounded-xl border border-factory-darkBorder">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold font-heading text-factory-paper">
              Factory Files & Documents Archive
            </h1>
          </div>
          <p className="text-xs text-factory-muted mt-1">
            Preserving Excel's files&documents sheet: Standard operating procedures, technical machine manuals, and trade certificates.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={fetchDocuments}
            className="p-2.5 rounded-lg border border-factory-darkBorder text-factory-muted hover:text-factory-paper hover:bg-factory-darkBorder/40 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-factory-rust hover:bg-factory-rustLight text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-factory-rust/20"
          >
            <Plus className="w-4 h-4" />
            Register Document
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-factory-muted" />
        <input
          type="text"
          placeholder="Search documents by title or type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-factory-darkCard border border-factory-darkBorder rounded-lg text-xs text-factory-paper placeholder-factory-muted focus:outline-none focus:border-factory-amber"
        />
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-12 text-center text-factory-muted bg-factory-darkCard border border-factory-darkBorder rounded-xl">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-factory-amber" />
            Loading documents...
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-factory-muted bg-factory-darkCard border border-factory-darkBorder rounded-xl">
            No documents found in the archive.
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-factory-darkCard border border-factory-darkBorder rounded-xl p-5 space-y-3 hover:border-factory-darkBorder/80 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-factory-rust/10 text-factory-amber">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-factory-paper text-sm">{doc.title}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-factory-dark border border-factory-darkBorder text-factory-muted">
                      {doc.document_type}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-factory-muted">
                {doc.description || 'Official factory documentation and equipment guidance notes.'}
              </p>

              <div className="flex items-center justify-between text-[11px] font-mono text-factory-muted pt-2 border-t border-factory-darkBorder/60">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Active'}
                </span>
                <span className="text-factory-amber font-bold">
                  {doc.file_reference || 'Ref: AB-DOC'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: Register Document */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-factory-darkCard border border-factory-darkBorder rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-factory-darkBorder pb-3">
              <h2 className="text-base font-bold font-heading text-factory-paper flex items-center gap-2">
                <FileText className="w-4 h-4 text-factory-amber" />
                Register Document
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-factory-muted hover:text-factory-paper text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-4 text-xs">
              <div>
                <label className="block text-factory-muted mb-1 font-medium">Document Title</label>
                <input
                  type="text"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                  required
                />
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Document Type</label>
                <select
                  value={newDoc.document_type}
                  onChange={(e) => setNewDoc({ ...newDoc, document_type: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                >
                  <option value="MANUAL">Technical Manual / SOP</option>
                  <option value="COMPLIANCE">Factory Compliance / License</option>
                  <option value="CONTRACT">Labor / Supplier Contract</option>
                  <option value="CERTIFICATE">Quality Assurance Certificate</option>
                  <option value="FINANCIAL">Tax & Bank Records</option>
                </select>
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Document Reference / Location</label>
                <input
                  type="text"
                  value={newDoc.file_reference}
                  onChange={(e) => setNewDoc({ ...newDoc, file_reference: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper focus:outline-none focus:border-factory-amber"
                />
              </div>

              <div>
                <label className="block text-factory-muted mb-1 font-medium">Description</label>
                <textarea
                  value={newDoc.description}
                  onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
                  className="w-full bg-factory-dark border border-factory-darkBorder rounded-lg px-3 py-2 text-factory-paper h-20 focus:outline-none focus:border-factory-amber"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-factory-darkBorder rounded-lg text-factory-muted hover:text-factory-paper"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-factory-rust hover:bg-factory-rustLight text-white rounded-lg font-semibold"
                >
                  Save Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
