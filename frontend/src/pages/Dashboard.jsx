import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { 
  Server, AlertCircle, Calendar, Bell, BellOff, Activity, 
  Info, CheckCircle2, Clock, Wallet, ChevronRight, ChevronDown, ChevronUp 
} from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, hint, valueColor = "text-white", onClick }) => (
  <div 
    onClick={onClick}
    className="premium-card group relative overflow-hidden cursor-pointer hover:border-white/20 transition-all active:scale-95 flex items-center p-6 gap-6"
  >
    <div className="scan-container"><div className="scanline"></div></div>
    <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 ${valueColor} group-hover:bg-white/10 transition-colors`}>
      <Icon size={24} />
    </div>
    <div className="min-w-0">
      <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-1">{title}</p>
      <h3 className={`text-2xl font-black tracking-tight uppercase ${valueColor}`}>{value}</h3>
    </div>
    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
      <ChevronRight size={16} className="text-slate-600" />
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ 
    totalServers: 0, deadServers: 0, upcomingPayments: 0, 
    snoozedCount: 0, recentEvents: [], upcomingList: [] 
  });
  const [loading, setLoading] = useState(true);
  const [expandedFeed, setExpandedFeed] = useState(false);
  
  // ЖИВИЙ ЧАС: Стейт, який оновлюється кожну секунду
  const [now, setNow] = useState(new Date());

  // Тікаємо кожну секунду
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Логіка розрахунку часу до наступного сканування (9, 12 або 16 годин)
  const getNextScanInfo = () => {
    const schedule = [9, 12, 16];
    let nextDate = new Date(now);
    let nextHour = schedule.find(h => now.getHours() < h);

    // Якщо вже пізніше 16:00, перекидаємо на 9:00 наступного дня
    if (nextHour === undefined) {
      nextHour = 9;
      nextDate.setDate(nextDate.getDate() + 1);
    }
    nextDate.setHours(nextHour, 0, 0, 0);

    const diff = nextDate - now;
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);

    return {
      time: `${nextHour.toString().padStart(2, '0')}:00`,
      countdown: `${h}г ${m}хв ${s}с`
    };
  };

  const scanInfo = getNextScanInfo();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/dashboard/summary');
        setStats(data);
      } catch (err) { 
        console.error("Помилка завантаження дашборду:", err); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 20000);
    return () => clearInterval(interval);
  }, []);

  // Адекватна логіка відображення статусу сповіщень
  const getNextNotifyText = (snoozeUntil) => {
    if (snoozeUntil && new Date(snoozeUntil) > now) {
      const snoozeDate = new Date(snoozeUntil);
      const timeStr = snoozeDate.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      const isToday = snoozeDate.toDateString() === now.toDateString();
      const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === snoozeDate.toDateString();
      
      const dateStr = isToday ? 'сьогодні' : isTomorrow ? 'завтра' : snoozeDate.toLocaleDateString('uk-UA');
      return `Пауза до ${dateStr} о ${timeStr}`;
    }
    return 'Активні';
  };

  const groupEventsByDate = (events) => {
    const groups = {};
    events.forEach(event => {
      const date = new Date(event.event_date).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
      if (!groups[date]) groups[date] = [];
      groups[date].push(event);
    });
    return groups;
  };

  if (loading) return (
    <div className="h-[80vh] flex items-center justify-center">
      <div className="text-green-500 font-black animate-pulse tracking-[0.5em] text-[10px] uppercase">Синхронізація систем...</div>
    </div>
  );

  const eventsToShow = expandedFeed ? stats.recentEvents : stats.recentEvents.slice(0, 5);
  const groupedEvents = groupEventsByDate(eventsToShow);

  return (
    <div className="p-4 md:p-10 max-w-full space-y-10 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black text-white uppercase italic tracking-tighter leading-none">
            Admin<span className="text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]">Core</span> <span className="text-slate-800 text-2xl not-italic ml-2">V1.0</span>
          </h1>
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.4em] mt-3 ml-1">Terminal Status: Online</p>
        </div>
        <div className="flex items-center gap-6 px-6 py-3 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="text-right">
            <p className="text-[8px] text-slate-500 font-black uppercase">Системний час (Kyiv)</p>
            <p className="text-xs font-mono text-white mb-1">
              {now.toLocaleTimeString('uk-UA', { timeZone: 'Europe/Kyiv' })}
            </p>
            <p className="text-[8px] text-slate-500 font-black uppercase border-t border-white/5 pt-1.5 mt-1.5">
              Скан бази о {scanInfo.time} <span className="text-green-500 ml-1">через {scanInfo.countdown}</span>
            </p>
          </div>
          <div className="w-px h-10 bg-white/10"></div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-ping shadow-[0_0_10px_#22c55e]"></div>
            <span className="text-[10px] font-black text-white uppercase">Live Feed</span>
          </div>
        </div>
      </header>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Всього вузлів" value={stats.totalServers} icon={Server} onClick={() => navigate('/servers', { state: { filter: 'all' } })} />
        <StatCard title="Помилки" value={stats.deadServers} icon={AlertCircle} valueColor={stats.deadServers > 0 ? "text-red-500" : "text-white"} onClick={() => navigate('/servers', { state: { filter: 'dead' } })} />
        <StatCard title="Оплати (5 дн)" value={stats.upcomingPayments} icon={Calendar} valueColor={stats.upcomingPayments > 0 ? "text-yellow-500" : "text-white"} onClick={() => navigate('/servers', { state: { filter: 'payment' } })} />
        <StatCard title="На паузі" value={stats.snoozedCount} icon={BellOff} valueColor="text-slate-400" onClick={() => navigate('/servers', { state: { filter: 'snoozed' } })} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* LEFT: LIVE FEED */}
        <div className="xl:col-span-7 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[12px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
              <Activity size={16} className="text-green-500" /> Стрічка подій
            </h2>
          </div>

          <div className="premium-card p-4 md:p-6 min-h-[500px] relative flex flex-col">
            <div className="scan-container"><div className="scanline"></div></div>
            <div className="absolute left-10 md:left-14 top-10 bottom-10 w-px bg-white/5 z-0"></div>
            
            <div className="space-y-10 relative z-10 flex-1">
              {Object.keys(groupedEvents).map(date => (
                <div key={date} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 md:w-16 h-px"></div>
                    <div className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/5">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{date}</span>
                    </div>
                    <div className="flex-1 h-px bg-white/5"></div>
                  </div>

                  <div className="space-y-4">
                    {groupedEvents[date].map((event, idx) => {
                      const isUp = event.type === 'up';
                      const config = {
                        down: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', text: "offline" },
                        up: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', text: "online" },
                        paid: { icon: Wallet, color: 'text-blue-400', bg: 'bg-blue-400/10', text: "оплачено" },
                        warning: { icon: Calendar, color: 'text-yellow-500', bg: 'bg-yellow-500/10', text: "дедлайн" }
                      };
                      const { icon: Icon, color, bg, text } = config[event.type] || config.down;
                      
                      return (
                        <div key={idx} onClick={() => navigate(`/server/${event.server_id}`)} className="flex items-center gap-4 md:gap-8 group cursor-pointer p-2 rounded-2xl hover:bg-white/[0.02] transition-all">
                          <div className="w-12 md:w-16 text-[9px] font-mono text-slate-600 text-right group-hover:text-slate-400">
                            {new Date(event.event_date).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className={`relative z-10 w-8 h-8 md:w-10 md:h-10 rounded-full ${bg} ${color} flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform`}>
                            <Icon size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] font-black uppercase tracking-tight truncate ${isUp ? 'text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'text-white'}`}>
                                {event.name}
                              </span>
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${bg} ${color}`}>
                                {text}
                              </span>
                            </div>
                            <p className={`text-[9px] font-bold mt-1 uppercase tracking-wider ${isUp ? 'text-green-500/70' : 'text-slate-500'}`}>
                              {event.type === 'down' ? 'Зафіксовано втрату зв\'язку' : 
                               event.type === 'up' ? 'Вузол знову активний' :
                               event.type === 'paid' ? 'Ручна відмітка про оплату' : 'Наближення дати платежу'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {stats.recentEvents.length > 5 && (
              <button 
                onClick={() => setExpandedFeed(!expandedFeed)}
                className="mt-8 w-full py-4 border border-dashed border-white/5 rounded-2xl text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-white transition-all flex items-center justify-center gap-2 relative z-10"
              >
                {expandedFeed ? <><ChevronUp size={16} /> Сховати історію</> : <><ChevronDown size={16} /> Показати більше ({stats.recentEvents.length - 5})</>}
              </button>
            )}
          </div>
        </div>

        {/* RIGHT: UPCOMING DEADLINES */}
        <div className="xl:col-span-5 space-y-6">
          <h2 className="text-[12px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
            <Clock size={16} className="text-yellow-500" /> Черга дедлайнів
          </h2>

          <div className="grid grid-cols-1 gap-6">
            {stats.upcomingList.map(server => {
              const daysLeft = Math.ceil((new Date(server.next_payment_date) - now) / (1000 * 60 * 60 * 24));
              const isUrgent = daysLeft <= 1;

              return (
                <div 
                  key={server.server_id} 
                  onClick={() => navigate(`/server/${server.server_id}`)}
                  className={`premium-card p-6 group cursor-pointer transition-all active:scale-[0.98] border-l-4 ${isUrgent ? 'border-l-red-500 shadow-[0_0_20px_rgba(239,68,68,0.05)]' : 'border-l-yellow-500'}`}
                >
                  <div className="scan-container"><div className="scanline"></div></div>
                  <div className="flex justify-between items-start relative z-10">
                    <div className="space-y-4 flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl bg-white/5 ${isUrgent ? 'text-red-500' : 'text-yellow-500'}`}>
                          <Calendar size={18} />
                        </div>
                        <h3 className="text-[15px] font-black text-white uppercase truncate group-hover:text-green-500 transition-colors">
                          {server.name}
                        </h3>
                      </div>
                      <div className="flex flex-col gap-2 text-[10px] font-mono text-slate-500">
                        <div className="flex items-center gap-2">
                          <Clock size={12} className="text-slate-700" /> {new Date(server.next_payment_date).toLocaleDateString('uk-UA')}
                        </div>
                        <div className="flex items-center gap-2">
                          {server.snooze_until && new Date(server.snooze_until) > now ? <BellOff size={12} className="text-yellow-500" /> : <Bell size={12} className="text-slate-700" />}
                          <span className={server.snooze_until && new Date(server.snooze_until) > now ? 'text-yellow-500' : ''}>
                            {getNextNotifyText(server.snooze_until)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-2xl font-black italic tracking-tighter leading-none ${isUrgent ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                        {daysLeft <= 0 ? 'DUE' : `${daysLeft}d`}
                      </p>
                      <p className="text-[9px] text-slate-600 font-black uppercase mt-2">залишилось</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;