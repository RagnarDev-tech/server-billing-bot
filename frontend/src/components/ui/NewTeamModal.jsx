import { useState } from 'react';
import Modal from './Modal';
import api from '../../api/axios';

const NewTeamModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({ name: '', description: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/web/teams', formData);
      setFormData({ name: '', description: '' });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) { console.error(err); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Нова Команда">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Назва команди</label>
          <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyber-accent/50 transition-all font-bold uppercase mb-4" placeholder="BACKEND DEV" />
          
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Опис (Опціонально)</label>
          <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-slate-400 focus:outline-none focus:border-cyber-accent/50 transition-all" placeholder="Команда розробки API" />
        </div>
        <button type="submit" className="w-full py-4 rounded-xl text-black font-black uppercase text-[10px] tracking-widest transition-all active:scale-95" style={{ background: 'var(--grad-blue)' }}>
          Створити Команду
        </button>
      </form>
    </Modal>
  );
};

export default NewTeamModal;