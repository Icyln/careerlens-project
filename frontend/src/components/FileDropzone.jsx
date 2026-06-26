import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';

export default function FileDropzone({ onFileSelected, disabled = false, compact = false }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files) => {
    const file = files?.[0];
    if (file) onFileSelected(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) handleFiles(event.dataTransfer.files);
      }}
      className={[
        'group cursor-pointer rounded-3xl border-2 border-dashed p-6 text-center transition-all duration-300 relative overflow-hidden flex flex-col justify-center items-center',
        dragging 
          ? 'border-[#106EBE] bg-[#106EBE]/5 scale-[0.99]' 
          : 'border-[#111439]/10 bg-white hover:border-[#106EBE]/40 hover:bg-[#F8F8F9] shadow-sm hover:shadow-md',
        disabled ? 'pointer-events-none opacity-50' : '',
        compact ? 'p-6' : 'p-8 sm:p-12',
      ].join(' ')}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !disabled) inputRef.current?.click();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
      
      <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#106EBE] to-[#0FFCBE] text-white shadow-lg shadow-[#106EBE]/20 transition-transform duration-300 group-hover:-translate-y-1">
        <UploadCloud size={24} className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      
      <h3 className="mt-4 sm:mt-5 text-base sm:text-lg font-bold text-[#111439]">Upload your resume</h3>
      <p className="mt-2 text-xs sm:text-sm text-[#111439]/60 max-w-[220px] mx-auto leading-relaxed">
        Drag and drop your PDF or Word document here, or click to choose a file.
      </p>
      
      <p className="mt-4 inline-block px-3 py-1 bg-[#111439]/5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-[#111439]/50">
        Safe & Secure Upload
      </p>
    </div>
  );
}