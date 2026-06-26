import { FileDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { exportAnalysisPdf } from '../api/client.js';
import { downloadBlob } from '../utils/format.js';

export default function ReportExport({ reportId, disabled = false, onError, className = '' }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      const blob = await exportAnalysisPdf(reportId);
      downloadBlob(blob, `careerlens_report_${reportId}.pdf`);
    } catch (error) {
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled || !reportId || loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-[#111439]/10 px-4 py-2.5 text-xs font-bold text-[#111439] shadow-sm transition hover:bg-[#F8F8F9] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
      Save PDF
    </button>
  );
}