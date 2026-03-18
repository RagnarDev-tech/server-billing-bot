import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';
import { Server, Plus, Search, MoreVertical, Globe, Shield, ExternalLink, Users, Filter, SortAsc, Edit2, Archive, Trash2, Activity, Key } from 'lucide-react';
import NewServerModal from '../components/ui/NewServerModal';
import EditServerModal from '../components/ui/EditServerModal';

const Servers = () => {
  const navigate = useNavigate();
  const location = useLocation(); 
  
  const [servers, setServers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [sortBy, setSortBy] = useState('payment_asc');
  const [showArchived, setShowArchived] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState(location.state?.filter || 'all');
  
  const [isNewServerModalOpen, setIsNewServerModalOpen] = useState(false);
  const [editingServerId, setEditingServerId] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  useEffect(() => {
    if (location.state?.filter) {
      setStatusFilter(location.state.filter);
      window.history.replaceState({}, document.title); 
    }
  }, [location.state]);

  const fetchServers = async () => {
    try {
      const { data } = await api.get('/web/servers');
      console.log("👀 [FRONTEND] Прийшло з бекенду:", data);
      if (data && Array.isArray(data)) {
        setServers(data);
      } else if (data && data.data && Array.isArray(data.data)) {
        setServers(data.data);
      }
    } catch (err) {
      console.error("❌ [FRONTEND] Помилка fetchServers:", err);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.dropdown-container')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try { return new Date(dateStr).toLocaleDateString('uk-UA'); } catch { return dateStr; }
  };

  const handleEdit = (server) => {
    if (server.is_api_account) return;
    setEditingServerId(server.id);
    setOpenDropdownId(null);
  };

  const handleArchive = async (id) => {
    if (window.confirm("Відправити цей вузол в архів? Він перестане пінгуватись.")) {
      try {
        await api.patch(`/web/servers/${id}/archive`);
        fetchServers(); 
      } catch (err) { console.error(err); }
    }
    setOpenDropdownId(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Точно видалити цей вузол назавжди? Уся його історія зникне!")) {
      try {
        await api.delete(`/web/servers/${id}`);
        fetchServers(); 
      } catch (err) { console.error(err); }
    }
    setOpenDropdownId(null);
  };

  const renderStatus = (status) => {
    if (status === 'api') return <div className="px-2 py-1 rounded-md text-[8px] font-black uppercase text-purple-400 bg-purple-400/10 whitespace-nowrap">API Sync</div>;
    if (status === 'up') return <div className="px-2 py-1 rounded-md text-[8px] font-black uppercase text-cyber-accent bg-cyber-accent/10 whitespace-nowrap">Online</div>;
    if (status === 'archived') return <div className="px-2 py-1 rounded-md text-[8px] font-black uppercase text-slate-400 bg-slate-400/10 whitespace-nowrap">Archived</div>;
    return <div className="px-2 py-1 rounded-md text-[8px] font-black uppercase text-red-500 bg-red-500/10 whitespace-nowrap">Offline</div>;
  };

  const uniqueTeams = [...new Set(servers.map(s => s.team_name).filter(Boolean))].sort();

  const processedServers = servers
    .filter(s => {
      const name = (s?.server_name || '').toLowerCase();
      const ip = s?.ip_original || '';
      const query = searchTerm.toLowerCase();

      const matchesSearch = name.includes(query) || ip.includes(query);
      const matchesTeam = selectedTeam === 'all' || s.team_name === selectedTeam;
      const matchesArchive = showArchived ? true : s.status !== 'archived';

      let matchesStatus = true;
      if (statusFilter === 'dead') {
        matchesStatus = s.status === 'down' || s.status === 'dead';
      } else if (statusFilter === 'payment') {
        const daysLeft = s.next_payment_date ? Math.ceil((new Date(s.next_payment_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;
        matchesStatus = daysLeft !== null && daysLeft <= 5;
      } else if (statusFilter === 'snoozed') {
        matchesStatus = s.snooze_until && new Date(s.snooze_until) > new Date();
      }

      return matchesSearch && matchesTeam && matchesArchive && matchesStatus;
    })
    .sort((a, b) => {
      if (a.is_api_account && !b.is_api_account) return -1;
      if (!a.is_api_account && b.is_api_account) return 1;

      if (sortBy === 'payment_asc') {
        if (!a.next_payment_date) return 1;
        if (!b.next_payment_date) return -1;
        return new Date(a.next_payment_date) - new Date(b.next_payment_date);
      }
      if (sortBy === 'payment_desc') {
        if (!a.next_payment_date) return 1;
        if (!b.next_payment_date) return -1;
        return new Date(b.next_payment_date) - new Date(a.next_payment_date);
      }
      if (sortBy === 'name_asc') return (a.server_name || '').localeCompare(b.server_name || '');
      if (sortBy === 'status') return (a.status === 'up' ? -1 : 1) - (b.status === 'up' ? -1 : 1);
      return 0;
    });

  const ActionMenu = ({ server }) => (
    <div className="absolute right-0 top-full mt-2 w-40 sm:w-48 bg-[#0a0a0f] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-md">
      <button onClick={() => handleEdit(server)} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white/5 transition-colors">
        <Edit2 size={14} className="text-cyber-accent shrink-0" /> Редагувати
      </button>
      {server.status !== 'archived' && (
        <button onClick={() => handleArchive(server.id)} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold text-slate-300 uppercase tracking-widest hover:bg-white/5 transition-colors">
          <Archive size={14} className="text-slate-500 shrink-0" /> В архів
        </button>
      )}
      <div className="h-px w-full bg-white/5 my-1"></div>
      <button onClick={() => handleDelete(server.id)} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold text-red-500 uppercase tracking-widest hover:bg-red-500/10 transition-colors">
        <Trash2 size={14} className="shrink-0" /> Видалити
      </button>
    </div>
  );

  return (
    <div className="max-w-full min-w-0 p-4 md:p-12 space-y-6 md:space-y-8 animate-in fade-in duration-300">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter truncate">
            Список <span className="text-cyber-accent" style={{ textShadow: '0 0 15px #00FF94' }}>серверів</span>
          </h1>
        </div>
        <button onClick={() => setIsNewServerModalOpen(true)} className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-black font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shrink-0" style={{ background: 'var(--grad-green)', boxShadow: '0 0 15px rgba(0, 255, 148, 0.3)' }}>
          <Plus size={18} />
          <span>Додати вузол</span>
        </button>
      </header>

      <div className="premium-card p-4 rounded-2xl w-full flex flex-col xl:flex-row gap-4 items-center flex-wrap">
        <div className="scan-container"><div className="scanline"></div></div>

        <div className="flex-1 min-w-[280px] flex items-center gap-4 w-full bg-black/40 border border-white/5 rounded-xl px-4 py-1 relative z-10">
          <Search size={18} className="text-slate-600 shrink-0" />
          <input type="text" placeholder="Пошук за назвою або IP..." className="bg-transparent border-none text-white text-sm py-3 w-full focus:outline-none font-bold uppercase tracking-tight" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto relative z-10 items-center">
          <div className="relative flex-1 sm:w-48 w-full">
            <Activity size={14} className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none ${statusFilter !== 'all' ? 'text-cyber-accent' : 'text-slate-500'}`} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-[10px] text-white font-black uppercase tracking-widest appearance-none outline-none focus:border-cyber-accent/50 cursor-pointer">
              <option value="all">Всі стани</option>
              <option value="dead">Тільки фейли</option>
              <option value="payment">Очікують оплати</option>
              <option value="snoozed">На паузі</option>
            </select>
          </div>

          <div className="relative flex-1 sm:w-40 w-full">
            <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-[10px] text-white font-black uppercase tracking-widest appearance-none outline-none focus:border-cyber-accent/50 cursor-pointer">
              <option value="all">Всі команди</option>
              {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="relative flex-1 sm:w-56 w-full">
            <SortAsc size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-[10px] text-white font-black uppercase tracking-widest appearance-none outline-none focus:border-cyber-accent/50 cursor-pointer">
              <option value="payment_asc">Оплата (найближчі)</option>
              <option value="payment_desc">Оплата (найдальші)</option>
              <option value="name_asc">За алфавітом (А-Я)</option>
              <option value="status">Спочатку Online</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none whitespace-nowrap px-2">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-cyber-accent w-4 h-4 cursor-pointer" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest hover:text-white transition-colors">Архівні</span>
          </label>
        </div>
      </div>

      <div className="w-full min-w-0">
        <div className="grid grid-cols-1 gap-4 lg:hidden">
          {processedServers.map((server) => (
            <div key={server.id} className="premium-card p-5 space-y-5 w-full">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2.5 rounded-lg shrink-0 ${server.is_api_account ? 'bg-purple-500/10 text-purple-400' : 'bg-white/5 text-cyber-accent'}`}>
                    {server.is_api_account ? <Key size={18} /> : <Server size={18} />}
                  </div>
                  <div className="min-w-0">
                    <div onClick={() => !server.is_api_account && navigate(`/server/${server.id}`)} className={`text-sm font-black text-white uppercase truncate ${!server.is_api_account && 'cursor-pointer hover:text-cyber-accent transition-colors'}`}>{server.server_name}</div>
                    <div className="text-[8px] text-slate-500 font-bold uppercase flex flex-wrap items-center gap-1 mt-1">
                      <span className={server.is_api_account ? 'text-purple-400/70' : ''}>{server.os_name || 'ОС не вказана'}</span>
                      {server.team_name && <><span className="mx-1">•</span><span className="flex items-center"><Users size={8} className="mr-1" />{server.team_name}</span></>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 relative dropdown-container z-20">
                  {renderStatus(server.status)}
                  {!server.is_api_account && (
                    <>
                      <button onClick={() => setOpenDropdownId(openDropdownId === server.id ? null : server.id)} className="p-1.5 rounded-lg bg-white/5 text-slate-500 hover:text-white transition-all"><MoreVertical size={16} /></button>
                      {openDropdownId === server.id && <ActionMenu server={server} />}
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 border-t border-white/5 pt-4 gap-4">
                <div className="min-w-0">
                  <p className="text-[8px] text-slate-600 uppercase font-black tracking-widest mb-1">Мережа</p>
                  <p className={`text-[10px] font-mono truncate flex items-center gap-1 ${server.is_api_account ? 'text-purple-300' : 'text-slate-300'}`}><Globe size={10} className="text-slate-600 shrink-0" /> {server.ip_original || '—'}</p>
                  {server.ip_vpn && <p className="text-[9px] font-mono text-slate-500 truncate mt-1 flex items-center gap-1"><Shield size={10} className="text-slate-600 shrink-0" /> {server.ip_vpn}:51222</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[8px] text-slate-600 uppercase font-black tracking-widest mb-1">Провайдер</p>
                  <div className="text-[10px] font-black text-white uppercase">{server.provider_name || '—'}</div>
                  {server.provider_url && <a href={server.provider_url} target="_blank" rel="noreferrer" className="text-[8px] text-cyber-accent hover:underline flex items-center justify-end gap-1 mt-1">Сайт <ExternalLink size={8} /></a>}
                  {server.team_balance != null && (
                    <p className="text-[11px] text-green-500 font-black uppercase mt-1 border-t border-white/5 pt-1">
                      Баланс: ${server.team_balance}
                    </p>
                  )}
                </div>
              </div>
              <div className="border-t border-white/5 pt-3">
                {server.is_api_account ? (
                  <p className="text-[8px] text-slate-600 uppercase font-black tracking-widest text-center">Прогноз 0$: <span className="text-purple-400 italic">{formatDate(server.next_payment_date)}</span></p>
                ) : (
                  <p className="text-[8px] text-slate-600 uppercase font-black tracking-widest text-center">Оплата: <span className="text-white italic">{formatDate(server.next_payment_date)}</span></p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden lg:block premium-card rounded-2xl w-full">
          <div className="scan-container"><div className="scanline"></div></div>
          <div className="w-full relative z-10">
            <table className="w-full text-left border-collapse table-auto">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Вузол & Команда</th>
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Статус</th>
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Мережа</th>
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Хостинг & Фінанси</th>
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {processedServers.map((server) => (
                  <tr key={server.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4 align-top">
                      <div className="flex items-start gap-4">
                        {server.is_api_account ? <Key size={20} className="text-purple-500 mt-0.5 shrink-0" /> : <Server size={20} className="text-slate-500 mt-0.5 shrink-0" />}
                        <div className="min-w-0">
                          <div onClick={() => !server.is_api_account && navigate(`/server/${server.id}`)} className={`text-sm font-black text-white uppercase flex flex-wrap items-center gap-2 mb-1 ${!server.is_api_account && 'cursor-pointer hover:text-cyber-accent transition-colors'}`}>
                            <span className="break-words">{server.server_name}</span>
                            {server.team_name && <span className="px-1.5 py-0.5 rounded bg-white/5 text-[8px] text-slate-400 tracking-widest flex items-center whitespace-nowrap"><Users size={8} className="mr-1" />{server.team_name}</span>}
                          </div>
                          <div className={`text-[9px] font-bold uppercase ${server.is_api_account ? 'text-purple-400/70' : 'text-slate-600'}`}>{server.os_name || 'ОС не вказана'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center align-top">{renderStatus(server.status)}</td>
                    <td className="p-4 align-top">
                      <div className={`font-mono text-[11px] flex items-center gap-2 mb-1 whitespace-nowrap ${server.is_api_account ? 'text-purple-300' : 'text-slate-300'}`}><Globe size={12} className="text-slate-600 shrink-0" /> {server.ip_original || 'Немає IP'}</div>
                      {server.ip_vpn && <div className="font-mono text-[10px] text-slate-500 flex items-center gap-2 whitespace-nowrap"><Shield size={12} className="text-slate-600 shrink-0" /> VPN: {server.ip_vpn}:51222</div>}
                    </td>
                    <td className="p-4 align-top">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-black text-white uppercase flex flex-wrap items-center gap-2">
                          <span className="break-words">{server.provider_name || 'Невідомий'}</span>
                          {server.provider_url && <a href={server.provider_url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-cyber-accent shrink-0"><ExternalLink size={12} /></a>}
                        </span>
                        
                        {server.is_api_account ? (
                          <span className="text-[9px] text-slate-500 font-bold uppercase whitespace-nowrap">Прогноз 0$: <span className="text-purple-400 italic">{formatDate(server.next_payment_date)}</span></span>
                        ) : (
                          <span className="text-[9px] text-slate-500 font-bold uppercase whitespace-nowrap">Оплата: <span className="text-slate-300 italic">{formatDate(server.next_payment_date)}</span></span>
                        )}

                        {server.team_balance != null && (
                          <span className="text-[10px] text-green-500 font-black uppercase whitespace-nowrap mt-1">
                            Баланс: <span className="text-green-400 italic">${server.team_balance}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right align-top relative dropdown-container">
                      {server.is_api_account ? (
                        <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest pt-2">Авто (Налаштування)</div>
                      ) : (
                        <>
                          <button onClick={() => setOpenDropdownId(openDropdownId === server.id ? null : server.id)} className="p-2.5 rounded-xl bg-white/5 text-slate-500 hover:text-white transition-all inline-block"><MoreVertical size={16} /></button>
                          {openDropdownId === server.id && <ActionMenu server={server} />}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <NewServerModal isOpen={isNewServerModalOpen} onClose={() => setIsNewServerModalOpen(false)} onSuccess={fetchServers} />
      <EditServerModal isOpen={!!editingServerId} onClose={() => setEditingServerId(null)} onSuccess={fetchServers} serverId={editingServerId} />
    </div>
  );
};

export default Servers;