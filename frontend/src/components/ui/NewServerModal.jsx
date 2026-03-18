import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import api from '../../api/axios';
import NewOCModal from './NewOCModal';
import NewProviderModal from './NewProviderModal';
import NewTeamModal from './NewTeamModal';

const NewServerModal = ({ isOpen, onClose, onSuccess }) => {
  const [osList, setOsList] = useState([]);
  const [providersList, setProvidersList] = useState([]);
  const [teamsList, setTeamsList] = useState([]);
  const [billingList, setBillingList] = useState([]);

  const [formData, setFormData] = useState({
    name: '', os_id: '', ip_original: '', ip_vpn: '', provider_id: '', team_id: '', billing_account_id: '', next_payment_date: '',
    is_custom_cycle: false, custom_cycle_days: '', notify_days_before: 5
  });

  const [isOsModalOpen, setIsOsModalOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  const fetchLists = async () => {
    try {
      const [osRes, provRes, teamsRes, refRes] = await Promise.all([
        api.get('/web/os'),
        api.get('/web/providers'),
        api.get('/web/teams'),
        api.get('/references')
      ]);
      setOsList(Array.isArray(osRes.data) ? osRes.data : []);
      setProvidersList(Array.isArray(provRes.data) ? provRes.data : []);
      setTeamsList(Array.isArray(teamsRes.data) ? teamsRes.data : []);
      setBillingList(refRes.data?.billing || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLists();
    } else {
      setFormData({ 
        name: '', os_id: '', ip_original: '', ip_vpn: '', provider_id: '', team_id: '', billing_account_id: '', next_payment_date: '',
        is_custom_cycle: false, custom_cycle_days: '', notify_days_before: 5
      });
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/web/servers', formData);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) { console.error(err); }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
        <div className="premium-card w-full max-w-2xl relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 animate-in zoom-in-95 duration-200">
          <div className="scan-container"><div className="scanline"></div></div>
          
          <div className="p-6 md:p-8 relative z-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4 sticky top-0 bg-[#0a0a0f] z-20">
              <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Створення вузла / Сервісу</h2>
              <button type="button" onClick={onClose} className="p-2 text-slate-500 hover:text-red-500 transition-colors bg-white/5 rounded-lg hover:bg-white/10"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Назва</label>
                  <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyber-accent/50 transition-all font-bold uppercase" placeholder="WEB-PROD-01" />
                </div>
                
                <div className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block truncate">Команда (Власник)</label>
                    <select name="team_id" value={formData.team_id} onChange={handleInputChange} className="w-full bg-[#050507] border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyber-accent/50 transition-all font-bold uppercase appearance-none">
                      <option value="">Без команди</option>
                      {teamsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <button type="button" onClick={() => setIsTeamModalOpen(true)} className="shrink-0 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-cyber-accent transition-all text-cyber-accent"><Plus size={20} /></button>
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block truncate">ОС (Опц. для сервісів)</label>
                    <select name="os_id" value={formData.os_id} onChange={handleInputChange} className="w-full bg-[#050507] border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyber-accent/50 transition-all font-bold uppercase appearance-none">
                      <option value="">Немає (Сервіс)</option>
                      {osList.map(os => <option key={os.id} value={os.id}>{os.name}</option>)}
                    </select>
                  </div>
                  <button type="button" onClick={() => setIsOsModalOpen(true)} className="shrink-0 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-cyber-accent transition-all text-cyber-accent"><Plus size={20} /></button>
                </div>

                <div className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block truncate">Провайдер</label>
                    <select required name="provider_id" value={formData.provider_id} onChange={handleInputChange} className="w-full bg-[#050507] border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyber-accent/50 transition-all font-bold uppercase appearance-none">
                      <option value="" disabled>Оберіть Провайдера</option>
                      {providersList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <button type="button" onClick={() => setIsProviderModalOpen(true)} className="shrink-0 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-cyber-accent transition-all text-cyber-accent"><Plus size={20} /></button>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Публічний IP (Опц.)</label>
                  <input type="text" name="ip_original" value={formData.ip_original} onChange={handleInputChange} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-white font-mono focus:outline-none focus:border-cyber-accent/50 transition-all" placeholder="192.168.1.1" />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block truncate">VPN IP (Опц.)</label>
                  <input type="text" name="ip_vpn" value={formData.ip_vpn} onChange={handleInputChange} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-white font-mono focus:outline-none focus:border-cyber-accent/50 transition-all" placeholder="10.8.0.1" />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block truncate">API Акаунт (Білінг)</label>
                  <select name="billing_account_id" value={formData.billing_account_id} onChange={handleInputChange} className="w-full bg-[#050507] border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyber-accent/50 transition-all font-bold uppercase appearance-none">
                    <option value="">Не підключено</option>
                    {billingList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block truncate">Наступна оплата</label>
                  <input type="date" name="next_payment_date" value={formData.next_payment_date} onChange={handleInputChange} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyber-accent/50 transition-all uppercase" style={{ colorScheme: 'dark' }} />
                </div>
              </div>

              {/* Блок Кастомного циклу */}
              <div className="md:col-span-2 w-full pt-4 mt-2 border-t border-white/5">
                <label className="flex items-center gap-3 cursor-pointer select-none mb-4 w-fit group relative">
                  <div 
                    className={`relative w-6 h-6 rounded flex items-center justify-center transition-all duration-200 border-2 ${
                      formData.is_custom_cycle 
                        ? 'border-[#00FF94] shadow-[0_0_15px_rgba(0,255,148,0.5)]' 
                        : 'bg-[#15151a] border-slate-600 group-hover:border-slate-400 group-hover:bg-[#1f1f24]'
                    }`}
                    style={{ backgroundColor: formData.is_custom_cycle ? '#00FF94' : undefined }}
                  >
                    <input 
                      type="checkbox" 
                      name="is_custom_cycle"
                      checked={!!formData.is_custom_cycle} 
                      onChange={handleInputChange} 
                      className="absolute opacity-0 w-full h-full cursor-pointer z-20 m-0 p-0"
                    />
                    {formData.is_custom_cycle && (
                      <svg className="w-4 h-4 text-black relative z-10 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
                      </svg>
                    )}
                  </div>
                  <span className={`text-[11px] font-black uppercase tracking-widest transition-colors relative z-10 ${formData.is_custom_cycle ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>
                    ⚙️ Кастомний цикл оплати
                  </span>
                </label>

                {formData.is_custom_cycle && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-5 bg-white/[0.02] rounded-xl border border-white/5 animate-in fade-in slide-in-from-top-2 duration-200 w-full mt-2">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Період (днів)</label>
                      <input required type="number" min="1" name="custom_cycle_days" value={formData.custom_cycle_days} onChange={handleInputChange} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#00FF94]/50 transition-all font-bold" placeholder="Напр: 7" />
                      <p className="text-[8px] text-slate-600 font-bold mt-1.5 ml-1">Раз у скільки днів платимо.</p>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Сповіщати за (днів)</label>
                      <input required type="number" min="1" name="notify_days_before" value={formData.notify_days_before} onChange={handleInputChange} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[#00FF94]/50 transition-all font-bold" placeholder="Напр: 2" />
                      <p className="text-[8px] text-slate-600 font-bold mt-1.5 ml-1">За скільки днів до оплати слати пуші.</p>
                    </div>
                  </div>
                )}
              </div>  

              <div className="pt-4 mt-2 border-t border-white/5">
                <button type="submit" className="w-full py-4 rounded-xl text-black font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 hover:shadow-[0_0_20px_rgba(0,255,148,0.4)]" style={{ background: 'var(--grad-green)' }}>
                  Додати в систему
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <NewOCModal isOpen={isOsModalOpen} onClose={() => setIsOsModalOpen(false)} onSuccess={fetchLists} />
      <NewProviderModal isOpen={isProviderModalOpen} onClose={() => setIsProviderModalOpen(false)} onSuccess={fetchLists} />
      <NewTeamModal isOpen={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)} onSuccess={fetchLists} />
    </>
  );
};

export default NewServerModal;