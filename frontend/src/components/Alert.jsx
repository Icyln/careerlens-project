export default function Alert({ type = 'info', children, onClose }) {
  const classes = {
    info: 'border-[#106EBE]/20 bg-[#106EBE]/5 text-[#106EBE]',
    error: 'border-red-500/20 bg-red-500/5 text-red-700',
    success: 'border-[#0D9476]/20 bg-[#0D9476]/5 text-[#0D9476]',
    warning: 'border-amber-500/20 bg-amber-500/5 text-amber-800',
  };
  
  return (
    <div className={`flex items-start justify-between gap-4 rounded-2xl border p-4 text-sm font-medium ${classes[type] || classes.info} animate-fade-in shadow-sm`}>
      <div className="leading-relaxed flex-1">{children}</div>
      {onClose && (
        <button 
          type="button" 
          onClick={onClose} 
          className="text-current opacity-50 hover:opacity-100 transition-opacity p-1 font-bold text-lg leading-none flex items-center justify-center rounded-lg hover:bg-black/5" 
          aria-label="Close message"
        >
          &times;
        </button>
      )}
    </div>
  );
}