import { useState, useEffect } from 'react';
import { Shield, LogOut, Key, User, CheckCircle2, AlertTriangle, Database, Trash2, HardDrive, Server, Users, Plus, Edit2, X, CreditCard } from 'lucide-react';
import api from '../api/axios';

const SettingCard = ({ title, icon: Icon, children, className = "" }) => (
  <div className={`premium-card p-6 md:p-8 space-y-6 flex flex-col ${className}`}>
    <div className="scan-container"><div className="scanline"></div></div>
    <div className="relative z-10 flex-1 flex flex-col">
      <div className="flex items-center gap-4 mb-8 shrink-0">
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-green-500">
          <Icon size={20} />
        </div>
        <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] italic">{title}</h2>
      </div>
      {children}
    </div>
  </div>
);

const Settings = () => {
  const [user, setUser] = useState({ username: 'Завантаження...', role: '' });
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState({ type: '', msg: '' });
  
  const [references, setReferences] = useState({ os: [], providers: [], teams: [], billing: [] });

  const [modalConfig, setModalConfig] = useState({ isOpen: false, mode: 'add', type: '', item: null });
  const [refFormData, setRefFormData] = useState({ name: '', website_url: '', description: '', provider_id: '', team_id: '', api_key: '' });

  const fetchReferences = async () => {
    try {
      const { data } = await api.get('/references');
      setReferences({
        os: Array.isArray(data.os) ? data.os : [],
        providers: Array.isArray(data.providers) ? data.providers : [],
        teams: Array.isArray(data.teams) ? data.teams : [],
        billing: Array.isArray(data.billing) ? data.billing : []
      });
    } catch (err) {}
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get('/profile/me');
        setUser(data);
      } catch (err) {}
    };
    
    fetchUser();
    fetchReferences();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const handlePassChange = async (e) => {
    e.preventDefault();
    setStatus({ type: '', msg: '' });
    
    if (!newPassword) return setStatus({ type: 'error', msg: 'Введіть новий пароль' });

    try {
      await api.put('/profile/password', { newPassword });
      setStatus({ type: 'success', msg: 'Пароль успішно оновлено!' });
      setNewPassword('');
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.error || 'Помилка оновлення' });
    }
  };

  const handleDeleteRef = async (type, id) => {
    if (!window.confirm("Видалити цей запис? (Сервери не будуть видалені, але поле у них стане порожнім)")) return;
    
    try {
      await api.delete(`/references/${type}/${id}`);
      await fetchReferences();
      setStatus({ type: 'success', msg: 'Запис успішно видалено' });
    } catch (err) {
      setStatus({ type: 'error', msg: 'Помилка видалення запису' });
    }
  };

  const openRefModal = (mode, type, item = null) => {
    setModalConfig({ isOpen: true, mode, type, item });
    if (item) {
      setRefFormData({ 
        name: item.name || '', 
        website_url: item.website_url || '', 
        description: item.description || '',
        provider_id: item.provider_id || '',
        team_id: item.team_id || '',
        api_key: item.api_key || ''
      });
    } else {
      setRefFormData({ name: '', website_url: '', description: '', provider_id: '', team_id: '', api_key: '' });
    }
  };

  const handleRefSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalConfig.mode === 'add') {
        await api.post(`/references/${modalConfig.type}`, refFormData);
        setStatus({ type: 'success', msg: 'Запис успішно додано' });
      } else {
        await api.put(`/references/${modalConfig.type}/${modalConfig.item.id}`, refFormData);
        setStatus({ type: 'success', msg: 'Запис успішно оновлено' });
      }
      setModalConfig({ ...modalConfig, isOpen: false });
      await fetchReferences();
    } catch (err) {
      setStatus({ type: 'error', msg: 'Помилка збереження запису' });
    }
  };

  const getRefTypeName = (type) => {
    if (type === 'os') return 'ОС';
    if (type === 'providers') return 'Провайдера';
    if (type === 'billing') return 'API Акаунт';
    return 'Команду';
  };

  const RefList = ({ items, type, icon: Icon, title, subtextKey }) => (
    <div className="space-y-4 flex flex-col h-[250px]">
      <div className="flex items-center justify-between border-b border-white/5 pb-2 shrink-0">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Icon size={14} className="text-slate-400" /> {title}
        </h3>
        <button 
          onClick={() => openRefModal('add', type)} 
          className="p-1 text-slate-400 hover:text-green-500 bg-white/5 rounded hover:bg-white/10 transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="overflow-y-auto space-y-2 pr-2 flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
        {items.length > 0 ? items.map(item => (
          <div key={item.id} className="flex justify-between items-center p-3 bg-black/40 border border-white/5 rounded-xl group hover:border-white/10 transition-all">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] font-black text-white uppercase truncate block">{item.name}</span>
              {subtextKey && item[subtextKey] && (
                <span className="text-[8px] font-bold text-slate-500 uppercase truncate block mt-0.5">{item[subtextKey]}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => openRefModal('edit', type, item)}
                className="p-1.5 rounded-lg bg-white/5 text-slate-600 hover:text-blue-400 hover:bg-blue-400/10 transition-all"
              >
                <Edit2 size={14} />
              </button>
              <button 
                onClick={() => handleDeleteRef(type, item.id)}
                className="p-1.5 rounded-lg bg-white/5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )) : (
          <div className="h-full flex items-center justify-center text-[9px] font-black text-slate-600 uppercase tracking-widest">
            Пусто
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-12 max-w-7xl mx-auto space-y-8 pb-32 md:pb-12 animate-in fade-in duration-500">
      <header>
        <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
          Налаштування <span className="text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]">системи</span>
        </h1>
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.4em] mt-3">Конфігурація терміналу</p>
      </header>

      {status.msg && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${
          status.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-red-500/10 border-red-500 text-red-500'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span className="text-[10px] font-black uppercase tracking-widest">{status.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SettingCard title="Безпека" icon={Shield}>
          <form onSubmit={handlePassChange} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Новий пароль доступу</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Введіть новий пароль" 
                  className="w-full bg-black/40 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-green-500/50 transition-all font-bold" 
                />
              </div>
            </div>
            <button type="submit" className="w-full py-4 rounded-xl text-black font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] bg-green-500">
              Встановити новий пароль
            </button>
          </form>
        </SettingCard>

        <SettingCard title="Керування сесією" icon={LogOut}>
          <div className="space-y-6">
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><User size={12} /> Активний профіль</span>
                <span className="text-[10px] font-black text-white uppercase">{user.username}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Shield size={12} /> Привілеї</span>
                <span className="text-[10px] font-black text-green-500 uppercase tracking-tighter drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]">{user.role || 'Root'}</span>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="w-full py-4 rounded-xl text-white font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 hover:bg-red-500/20 hover:text-red-500 border border-transparent hover:border-red-500/50 bg-white/5"
            >
              Завершити роботу
            </button>
          </div>
        </SettingCard>

        <SettingCard title="Системні довідники" icon={Database} className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 h-full">
            <RefList title="Операційні системи" type="os" icon={HardDrive} items={references.os} />
            <RefList title="Провайдери" type="providers" icon={Server} items={references.providers} />
            <RefList title="Команди" type="teams" icon={Users} items={references.teams} />
          </div>
        </SettingCard>

        <SettingCard title="Білінг та Інтеграції" icon={CreditCard} className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 h-full">
            <RefList title="API Акаунти" type="billing" icon={Key} items={references.billing} subtextKey="team_name" />
            <div className="hidden md:flex col-span-2 items-center justify-center border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Зона майбутніх інтеграцій</p>
            </div>
          </div>
        </SettingCard>
      </div>

      <footer className="pt-12 flex justify-center border-t border-white/5">
        <div className="text-[9px] font-bold text-slate-700 uppercase tracking-[0.5em]">
          Admin Core v1.0.42 — Stable
        </div>
      </footer>

      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setModalConfig({...modalConfig, isOpen: false})}></div>
          <div className="premium-card w-full max-w-sm relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 animate-in zoom-in-95 duration-200">
            <div className="scan-container"><div className="scanline"></div></div>
            <div className="p-6 relative z-10">
              <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                <h2 className="text-sm font-black text-white uppercase italic tracking-tighter">
                  {modalConfig.mode === 'add' ? 'Додати' : 'Редагувати'} {getRefTypeName(modalConfig.type)}
                </h2>
                <button type="button" onClick={() => setModalConfig({...modalConfig, isOpen: false})} className="text-slate-500 hover:text-red-500 transition-colors"><X size={18} /></button>
              </div>
              
              <form onSubmit={handleRefSubmit} className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Назва</label>
                  <input required type="text" value={refFormData.name} onChange={e => setRefFormData({...refFormData, name: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-green-500/50 transition-all font-bold" placeholder="Введіть назву..." />
                </div>
                
                {modalConfig.type === 'billing' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Провайдер</label>
                        <select required value={refFormData.provider_id} onChange={e => setRefFormData({...refFormData, provider_id: e.target.value})} className="w-full bg-[#0a0a0f] border border-white/5 rounded-xl py-3 px-4 text-[10px] text-white focus:outline-none focus:border-green-500/50 transition-all font-bold uppercase">
                          <option value="">Оберіть</option>
                          {references.providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Команда</label>
                        <select required value={refFormData.team_id} onChange={e => setRefFormData({...refFormData, team_id: e.target.value})} className="w-full bg-[#0a0a0f] border border-white/5 rounded-xl py-3 px-4 text-[10px] text-white focus:outline-none focus:border-green-500/50 transition-all font-bold uppercase">
                          <option value="">Оберіть</option>
                          {references.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">API Key / Token</label>
                      <input required type="text" value={refFormData.api_key} onChange={e => setRefFormData({...refFormData, api_key: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-green-500/50 transition-all font-mono" placeholder="v1.xxxxxxxxx..." />
                    </div>
                  </>
                )}

                {modalConfig.type === 'providers' && (
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Сайт (Опціонально)</label>
                    <input type="text" value={refFormData.website_url} onChange={e => setRefFormData({...refFormData, website_url: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-green-500/50 transition-all font-mono" placeholder="https://..." />
                  </div>
                )}

                {modalConfig.type === 'teams' && (
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Опис (Опціонально)</label>
                    <input type="text" value={refFormData.description} onChange={e => setRefFormData({...refFormData, description: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-green-500/50 transition-all font-bold" placeholder="Замітки про команду..." />
                  </div>
                )}

                <div className="pt-4">
                  <button type="submit" className="w-full py-4 rounded-xl text-black font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] bg-green-500">
                    Зберегти запис
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;