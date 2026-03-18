import { useState } from 'react';
import Modal from './Modal';
import api from '../../api/axios';

const NewOCModal = ({ isOpen, onClose, onSuccess }) => {
  const [osName, setOsName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/web/os', { name: osName });
      setOsName('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) { console.error(err); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Нова ОС">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Назва системи</label>
          <input required type="text" value={osName} onChange={(e) => setOsName(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl py-4 px-4 text-sm text-white focus:outline-none focus:border-cyber-accent/50 transition-all font-bold uppercase" placeholder="DEBIAN 12" />
        </div>
        <button type="submit" className="w-full py-4 rounded-xl text-black font-black uppercase text-[10px] tracking-widest transition-all active:scale-95" style={{ background: 'var(--grad-blue)' }}>
          Додати ОС
        </button>
      </form>
    </Modal>
  );
};

export default NewOCModal;