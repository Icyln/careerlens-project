import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, ShieldCheck, Sparkles } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import FileDropzone from '../components/FileDropzone.jsx';
import ResumeCard from '../components/ResumeCard.jsx';
import { deleteResume, fetchResumes, getErrorMessage, updateResume, uploadResume } from '../api/client.js';

export default function ResumePage() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const totalStorage = useMemo(() => resumes.reduce((sum, resume) => sum + (resume.file_size || 0), 0), [resumes]);

  const loadResumes = async () => {
    try {
      setLoading(true);
      const data = await fetchResumes();
      setResumes(data);
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  const handleUpload = async (file) => {
    try {
      setBusy(true);
      await uploadResume(file);
      setMessage({ type: 'success', text: 'Your resume was uploaded successfully.' });
      await loadResumes();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (resumeId, file) => {
    try {
      setBusy(true);
      await updateResume(resumeId, file);
      setMessage({ type: 'success', text: 'Your resume was updated successfully.' });
      await loadResumes();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (resumeId) => {
    try {
      setBusy(true);
      await deleteResume(resumeId);
      setMessage({ type: 'success', text: 'Resume deleted.' });
      await loadResumes();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 relative font-['Inter',_ui-sans-serif,_system-ui,_sans-serif] text-[#111439] min-h-screen pb-12 selection:bg-[#0FFCBE]/30 bg-[#F8F8F9] z-0 overflow-hidden">
      
      {/* Soft Ambient Background Glows (Matching Landing Page exactly) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] max-w-[800px] h-[600px] bg-gradient-to-br from-[#106EBE]/10 to-[#0FFCBE]/10 blur-[120px] rounded-full -z-10 pointer-events-none"></div>

      {/* Hero Section */}
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-stretch relative z-10">
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl shadow-[#111439]/5 flex flex-col justify-between border border-[#111439]/5">
          <div>    
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
              Manage Your Resumes
            </h1>
            
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#111439]/70 max-w-xl">
              Upload your PDF or Word files here. We will save them securely and help you match them to the jobs you want.
            </p>
          </div>

          {/* Simple Metric Row */}
          <div className="mt-8 grid gap-4 grid-cols-3">
            <div className="rounded-2xl bg-[#F8F8F9] border border-[#111439]/5 p-4 transition-colors hover:bg-white hover:border-[#106EBE]/20">
              <div className="flex items-center gap-2 text-[#106EBE]">
                <Database size={16} />
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#111439]/60">Saved</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-[#111439]">{resumes.length}</p>
            </div>

            <div className="rounded-2xl bg-[#F8F8F9] border border-[#111439]/5 p-4 transition-colors hover:bg-white hover:border-[#106EBE]/20">
              <div className="flex items-center gap-2 text-[#0D9476]">
                <ShieldCheck size={16} />
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#111439]/60">Types</span>
              </div>
              <p className="mt-2 text-xs sm:text-sm font-semibold text-[#111439]">PDF & DOCX</p>
            </div>

            <div className="rounded-2xl bg-[#F8F8F9] border border-[#111439]/5 p-4 transition-colors hover:bg-white hover:border-[#106EBE]/20">
              <div className="flex items-center gap-2 text-[#111439]">
                <Sparkles size={16} className="text-[#0FFCBE]" />
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#111439]/60">Tools</span>
              </div>
              <p className="mt-2 text-xs sm:text-sm font-semibold text-[#111439]">ATS + AI Analysis</p>
            </div>
          </div>
        </div>

        <FileDropzone onFileSelected={handleUpload} disabled={busy} />
      </section>

      {/* Alerts */}
      {message && (
        <div className="relative z-10">
          <Alert type={message.type} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        </div>
      )}

      {/* Resumes List */}
      <section className="relative z-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#111439]">Your Saved Resumes</h2>
            <p className="text-xs sm:text-sm text-[#111439]/60 mt-1">Choose a resume below to see how well it matches a job.</p>
          </div>
          <div className="rounded-xl bg-white border border-[#111439]/10 px-4 py-2 text-xs sm:text-sm font-semibold text-[#111439]/70 shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#106EBE]"></span>
            <span>Storage Used: {(totalStorage / 1024 / 1024).toFixed(2)} MB</span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-2xl bg-white border border-[#111439]/5 shadow-sm" />
            ))}
          </div>
        ) : resumes.length ? (
          <div className="space-y-3">
            {resumes.map((resume) => (
              <ResumeCard
                key={resume.id}
                resume={resume}
                busy={busy}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onAnalyze={(resumeId) => navigate(`/ats?resume=${resumeId}`)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[#111439]/20 bg-white p-12 text-center max-w-lg mx-auto mt-8 shadow-sm">
            <h3 className="text-lg font-extrabold text-[#111439]">No resumes uploaded yet</h3>
            <p className="mt-2 text-sm text-[#111439]/60 leading-relaxed">
              Drag and drop your file in the box above to get started.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}