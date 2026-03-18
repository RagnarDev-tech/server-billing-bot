import { useState } from 'react';
import Modal from './Modal';
import api from '../../api/axios';

const NewProviderModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({ name: '', website_url: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/web/providers', formData);
      setFormData({ name: '', website_url: '' });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) { console.error(err); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Новий Провайдер">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Назва</label>
          <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyber-accent/50 transition-all font-bold uppercase mb-4" placeholder="HETZNER" />
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Сайт (Опціонально)</label>
          <input type="url" value={formData.website_url} onChange={(e) => setFormData({ ...formData, website_url: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-slate-400 focus:outline-none focus:border-cyber-accent/50 transition-all font-mono" placeholder="https://hetzner.com" />
        </div>
        <button type="submit" className="w-full py-4 rounded-xl text-black font-black uppercase text-[10px] tracking-widest transition-all active:scale-95" style={{ background: 'var(--grad-blue)' }}>
          Додати Провайдера
        </button>
      </form>
    </Modal>
  );
};

export default NewProviderModal;