import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import api from '../../api/axios';

const EditServerModal = ({ isOpen, onClose, onSuccess, serverId }) => {
  const [osList, setOsList] = useState([]);
  const [providersList, setProvidersList] = useState([]);
  const [teamsList, setTeamsList] = useState([]);
  const [billingList, setBillingList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '', os_id: '', ip_original: '', ip_vpn: '', provider_id: '', team_id: '', billing_account_id: '', next_payment_date: '',
    is_custom_cycle: false, custom_cycle_days: '', notify_days_before: 5
  });

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      // 1. Спочатку тягнемо всі списки довідників
      const [osRes, provRes, teamsRes, refRes] = await Promise.all([
        api.get('/web/os'),
        api.get('/web/providers'),
        api.get('/web/teams'),
        api.get('/references')
      ]);
      
      const osData = Array.isArray(osRes.data) ? osRes.data : [];
      const provData = Array.isArray(provRes.data) ? provRes.data : [];
      const teamsData = Array.isArray(teamsRes.data) ? teamsRes.data : [];
      const billData = refRes.data?.billing || [];

      setOsList(osData);
      setProvidersList(provData);
      setTeamsList(teamsData);
      setBillingList(billData);

      // 2. Потім тягнемо дані самого сервера
      const serverRes = await api.get(`/web/servers/${serverId}`);
      const info = serverRes.data.info;

      // 3. Відразу мапимо імена в ID-шники (якщо бекенд не віддав прямі ID)
      const matchedOs = osData.find(o => o.name === info.os_name)?.id || '';
      const matchedProv = provData.find(p => p.name === info.provider_name)?.id || '';
      const matchedTeam = teamsData.find(t => t.name === info.team_name)?.id || '';
      // ТУТ ВАЖЛИВО: беремо або прямий ID, або шукаємо по імені
      const matchedBilling = info.billing_account_id || billData.find(b => b.name === info.billing_account_name)?.id || '';

      setFormData({
        name: info.name || '',
        os_id: matchedOs, 
        ip_original: info.ip_original || '',
        ip_vpn: info.ip_vpn || '',
        provider_id: matchedProv,
        team_id: matchedTeam,
        billing_account_id: matchedBilling,
        next_payment_date: info.next_payment_date ? info.next_payment_date.split('T')[0] : '',
        is_custom_cycle: info.is_custom_cycle === true || info.is_custom_cycle === 'true',
        custom_cycle_days: info.custom_cycle_days || '',
        notify_days_before: info.notify_days_before || 5
      });
    } catch (err) {
      console.error("Помилка завантаження даних модалки:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && serverId) {
      fetchInitialData();
    }
  }, [isOpen, serverId]);

  const handleInputChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/web/servers/${serverId}`, formData);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) { console.error("Помилка збереження:", err); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="premium-card w-full max-w-2xl relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden">
        <div className="scan-container"><div className="scanline"></div></div>
        
        <div className="flex justify-between items-center p-6 border-b border-white/5 bg-[#0a0a0f] relative z-20 shrink-0">
          <h2 className="text-lg md:text-xl font-black text-cyber-accent uppercase italic tracking-tighter truncate">Редагування вузла / Сервісу</h2>
          <button type="button" onClick={onClose} className="p-2 text-slate-500 hover:text-red-500 transition-colors bg-white/5 rounded-lg hover:bg-white/10 shrink-0 ml-4"><X size={20} /></button>
        </div>
        
        <div className="p-4 md:p-6 relative z-10 overflow-y-auto custom-scrollbar w-full">
          {isLoading ? (
            <div className="flex justify-center items-center py-12 text-cyber-accent uppercase font-black tracking-widest text-[10px] animate-pulse">Завантаження...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 w-full">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Назва</label>
                  <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyber-accent/50 transition-all font-bold uppercase" />
                </div>
                
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block truncate">Команда (Власник)</label>
                  <select name="team_id" value={formData.team_id} onChange={handleInputChange} className="w-full bg-[#050507] border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyber-accent/50 transition-all font-bold uppercase appearance-none">
                    <option value="">Без команди</option>
                    {teamsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block truncate">ОС (Опц. для сервісів)</label>
                  <select name="os_id" value={formData.os_id} onChange={handleInputChange} className="w-full bg-[#050507] border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyber-accent/50 transition-all font-bold uppercase appearance-none">
                    <option value="">Немає (Сервіс)</option>
                    {osList.map(os => <option key={os.id} value={os.id}>{os.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block truncate">Провайдер</label>
                  <select required name="provider_id" value={formData.provider_id} onChange={handleInputChange} className="w-full bg-[#050507] border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyber-accent/50 transition-all font-bold uppercase appearance-none">
                    <option value="" disabled>Оберіть Провайдера</option>
                    {providersList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Публічний IP (Опц.)</label>
                  <input type="text" name="ip_original" value={formData.ip_original} onChange={handleInputChange} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-white font-mono focus:outline-none focus:border-cyber-accent/50 transition-all" />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block truncate">VPN IP (Опц.)</label>
                  <input type="text" name="ip_vpn" value={formData.ip_vpn} onChange={handleInputChange} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-white font-mono focus:outline-none focus:border-cyber-accent/50 transition-all" />
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

              <div className="pt-2 w-full">
                <button type="submit" className="w-full py-4 rounded-xl text-black font-black uppercase text-[10px] tracking-widest transition-all flex justify-center items-center gap-2 active:scale-95 hover:shadow-[0_0_20px_rgba(0,255,148,0.4)]" style={{ background: 'var(--grad-green)' }}>
                  <Save size={16} /> Зберегти зміни
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditServerModal;