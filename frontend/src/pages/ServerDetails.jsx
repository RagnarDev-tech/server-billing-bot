import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { 
  ArrowLeft, Server, Globe, Shield, CreditCard, Calendar, Clock, 
  Activity, Users, ExternalLink, HardDrive, AlertTriangle, CheckCircle2, 
  Bell, BellOff, Trash2, ChevronDown, ChevronUp, Wallet
} from 'lucide-react';

const LogSection = ({ title, icon: Icon, logs, type = 'downtime', colorClass, serverId, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);

  // ЖОРСТКА ПЕРЕВІРКА: Якщо logs - це null або undefined, робимо його порожнім масивом
  const safeLogs = Array.isArray(logs) ? logs : [];

  const handleCleanup = async () => {
    if (window.confirm("Оптимізувати базу? Буде залишено тільки 50 останніх записів.")) {
      try {
        await api.delete(`/web/servers/${serverId}/logs/cleanup`);
        onRefresh();
      } catch (err) { console.error("Помилка очистки:", err); }
    }
  };

  const groupLogsByDate = (logArray) => {
    const groups = {};
    logArray.forEach(log => {
      const dateStr = log.down_at || log.payment_date;
      if (!dateStr) return;
      const date = new Date(dateStr).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
    });
    return groups;
  };

  const displayedLogs = expanded ? safeLogs : safeLogs.slice(0, 5);
  const groupedLogs = groupLogsByDate(displayedLogs);

  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}хв ${s}с`;
  };

  return (
    <div className="premium-card rounded-2xl relative z-10 w-full flex flex-col min-h-[400px]">
      <div className="scan-container"><div className="scanline"></div></div>
      
      <div className="p-6 border-b border-white/5 shrink-0 flex justify-between items-center relative z-10">
        <h2 className={`text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 ${colorClass}`}>
          <Icon size={16} /> {title}
        </h2>
        <button onClick={handleCleanup} title="Очистити старі логи" className="p-2 text-slate-600 hover:text-red-500 transition-colors bg-white/5 rounded-lg border border-white/5 hover:border-red-500/50">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar relative z-10 space-y-8">
        {safeLogs.length > 0 ? (
          Object.keys(groupedLogs).map(date => (
            <div key={date} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-px bg-transparent"></div>
                <div className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/5">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{date}</span>
                </div>
                <div className="flex-1 h-px bg-white/5"></div>
              </div>

              <div className="space-y-3">
                {groupedLogs[date].map((log, idx) => {
                  return (
                    <div key={idx} className="flex items-center gap-4 group p-3 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-all">
                      <div className="w-12 text-[9px] font-mono text-slate-600 text-right">
                        {new Date(log.down_at || log.payment_date).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {type === 'downtime' ? (
                          <>
                            <div className="flex justify-between items-center">
                              <span className={`text-[10px] font-black uppercase tracking-wider ${log.up_at ? 'text-green-500' : 'text-red-500 animate-pulse'}`}>
                                {log.up_at ? 'Відновлено' : 'Offline'}
                              </span>
                              {log.duration_seconds && <span className="text-[9px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded">{formatDuration(log.duration_seconds)}</span>}
                            </div>
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                              Падіння: {new Date(log.down_at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                          </>
                        ) : (
                          <div className="flex justify-between items-center">
                            <span className="text-[12px] font-black text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.4)]">
                              ${log.amount}
                            </span>
                            <span className="text-[9px] text-slate-400 italic truncate max-w-[150px]">
                              {log.notes || 'Без коментаря'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-3">
            <CheckCircle2 size={32} className="text-white/10" />
            <span className="text-[10px] font-black uppercase tracking-widest text-center">Записів не знайдено</span>
          </div>
        )}

        {safeLogs.length > 5 && (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="w-full py-4 border border-dashed border-white/5 rounded-2xl text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-white transition-all flex items-center justify-center gap-2"
          >
            {expanded ? <><ChevronUp size={16} /> Сховати історію</> : <><ChevronDown size={16} /> Показати всі ({safeLogs.length})</>}
          </button>
        )}
      </div>
    </div>
  );
};

const ServerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    try {
      const response = await api.get(`/web/servers/${id}`);
      setData(response.data);
    } catch (err) { 
      console.error("Помилка завантаження деталей:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchDetails(); }, [id]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try { return new Date(dateStr).toLocaleDateString('uk-UA'); } catch { return dateStr; }
  };

  if (loading) return (
    <div className="w-full h-[60vh] flex items-center justify-center">
      <div className="text-green-500 animate-pulse font-black tracking-widest uppercase">Дешифрування даних...</div>
    </div>
  );

  if (!data || !data.info) return (
    <div className="w-full h-[60vh] flex flex-col items-center justify-center space-y-4">
      <AlertTriangle size={48} className="text-red-500" />
      <div className="text-white font-black tracking-widest uppercase text-xl">Вузол не знайдено</div>
      <button onClick={() => navigate('/servers')} className="text-green-500 hover:text-white transition-colors text-[10px] uppercase font-bold tracking-widest border border-green-500/30 px-6 py-3 rounded-xl">Повернутись до списку</button>
    </div>
  );

  // ЗАХИСТ: Навіть якщо data.downtime не існує, беремо порожній масив
  const { info, downtime = [], payments = [] } = data;

  const renderStatus = (status) => {
    if (status === 'up') return <div className="px-4 py-2 rounded-xl text-[10px] font-black uppercase text-green-500 bg-green-500/10 border border-green-500/20 flex items-center gap-2 drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]"><CheckCircle2 size={14}/> Online</div>;
    if (status === 'archived') return <div className="px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-400 bg-slate-400/10 border border-white/5">Archived</div>;
    return <div className="px-4 py-2 rounded-xl text-[10px] font-black uppercase text-red-500 bg-red-500/10 border border-red-500/20 flex items-center gap-2"><AlertTriangle size={14}/> Offline</div>;
  };

  const DetailRow = ({ label, value, icon: Icon, valueClass = "text-white" }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-white/5 last:border-0 gap-2">
      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
        {Icon && <Icon size={12} className="text-slate-600" />} {label}
      </span>
      <span className={`text-[11px] font-black uppercase text-right truncate max-w-[250px] ${valueClass}`}>
        {value || '—'}
      </span>
    </div>
  );

  return (
    <div className="max-w-full min-w-0 p-4 md:p-10 space-y-10 animate-in fade-in duration-500 pb-20">
      
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6 min-w-0">
          <button onClick={() => navigate('/servers')} className="shrink-0 p-4 bg-white/[0.02] border border-white/10 rounded-2xl hover:bg-white/10 hover:border-green-500 transition-all text-slate-400 hover:text-green-500">
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tighter truncate drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
              {info.name}
            </h1>
            <div className="flex items-center gap-4 mt-3">
              {renderStatus(info.status)}
              {info.team_name && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5"><Users size={12}/> {info.team_name}</span>}
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        
        <div className="premium-card p-6 rounded-2xl relative z-10">
          <div className="scan-container"><div className="scanline"></div></div>
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 mb-6">
            <Server size={16} className="text-blue-400" /> Мережа & Система
          </h2>
          <div className="space-y-1 relative z-10 bg-black/40 p-4 rounded-xl border border-white/5">
            <DetailRow label="ID Вузла" value={`#${info.id}`} icon={HardDrive} />
            <DetailRow label="Операційна система" value={info.os_name} />
            <DetailRow label="Публічний IP" value={info.ip_original} valueClass="font-mono text-blue-400 select-all" icon={Globe} />
            <DetailRow label="VPN Тунель" value={info.ip_vpn ? `${info.ip_vpn}:51222` : null} valueClass="font-mono text-green-500 select-all" icon={Shield} />
          </div>
        </div>

        <div className="premium-card p-6 rounded-2xl relative z-10">
          <div className="scan-container"><div className="scanline"></div></div>
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 mb-6">
            <CreditCard size={16} className="text-yellow-500" /> Біллінг & Фінанси
          </h2>
          <div className="space-y-1 relative z-10 bg-black/40 p-4 rounded-xl border border-white/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-white/5 gap-2">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Провайдер</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase text-white">{info.provider_name || 'Невідомий'}</span>
                {info.provider_url && <a href={info.provider_url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-green-500 transition-colors"><ExternalLink size={12}/></a>}
              </div>
            </div>
            <DetailRow label="Акаунт" value={info.billing_account_name} />
            <DetailRow label="Остання оплата" value={formatDate(info.last_paid_date)} />
            <DetailRow label="Наступна оплата" value={formatDate(info.next_payment_date)} valueClass="text-yellow-500" icon={Calendar} />
            <DetailRow label="Цикл оплати" value={info.is_custom_cycle ? `${info.custom_cycle_days} днів` : `${info.cycle_months} міс.`} icon={Clock} />
            <DetailRow label="День списання" value={info.payment_day ? `${info.payment_day} число` : 'Кастомний'} />
          </div>
        </div>

        <div className="premium-card p-6 rounded-2xl relative z-10">
          <div className="scan-container"><div className="scanline"></div></div>
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 mb-6">
            <Bell size={16} className="text-purple-400" /> Сповіщення
          </h2>
          <div className="space-y-1 relative z-10 bg-black/40 p-4 rounded-xl border border-white/5">
            <DetailRow label="Політика нагадувань" value={info.policy_name || 'Стандартна'} />
            <DetailRow label="Днів до тригеру" value={info.notify_days_before ? `${info.notify_days_before} дн.` : '5 дн.'} />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 pt-4 border-t border-white/5 gap-2 mt-2">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <BellOff size={12} className="text-slate-600" /> Статус нагадувань
              </span>
              {info.snooze_until && new Date(info.snooze_until) > new Date() ? (
                <div className="text-right">
                  <span className="text-[10px] font-black text-yellow-500 uppercase px-2 py-1 bg-yellow-500/10 rounded">На паузі</span>
                  <p className="text-[8px] font-mono text-slate-400 mt-2">До: {new Date(info.snooze_until).toLocaleString('uk-UA')}</p>
                </div>
              ) : (
                <span className="text-[10px] font-black text-green-500 uppercase px-2 py-1 bg-green-500/10 rounded">Активні</span>
              )}
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <LogSection 
          title="Історія Падінь" 
          icon={Activity} 
          logs={downtime} 
          type="downtime" 
          colorClass="text-red-400"
          serverId={id}
          onRefresh={fetchDetails}
        />
        <LogSection 
          title="Історія Транзакцій" 
          icon={Wallet} 
          logs={payments} 
          type="payment" 
          colorClass="text-green-500"
          serverId={id}
          onRefresh={fetchDetails}
        />
      </div>

    </div>
  );
};

export default ServerDetails;