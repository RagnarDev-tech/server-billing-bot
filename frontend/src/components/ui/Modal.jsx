import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
      <div className="premium-card w-full max-w-lg relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 animate-in zoom-in-95 duration-200">
        <div className="scan-container"><div className="scanline"></div></div>
        <div className="p-6 md:p-8 relative z-10">
          <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
            <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">{title}</h2>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-red-500 transition-colors bg-white/5 rounded-lg hover:bg-white/10">
              <X size={20} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;