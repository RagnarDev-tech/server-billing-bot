import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Server, Settings } from 'lucide-react'

const Sidebar = () => {
  const location = useLocation()
  
  const menu = [
    { name: 'Огляд', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Сервери', path: '/servers', icon: Server },
    { name: 'Система', path: '/settings', icon: Settings },
  ]

  return (
    /* На мобілках: fixed bottom + glassmorphism. На ПК: sticky left */
    <div className="fixed bottom-0 left-0 right-0 h-20 md:h-screen md:w-72 md:sticky md:top-0 bg-[#07070a]/90 backdrop-blur-2xl border-t md:border-t-0 md:border-r border-white/5 flex md:flex-col items-center justify-around md:justify-start z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.8)] md:shadow-[20px_0_50px_rgba(0,0,0,0.5)] transition-all">
      
      {/* Логотип: Видно тільки на десктопі */}
      <div className="hidden md:flex p-10 mb-6 w-full items-center gap-4 border-b border-white/5">
        <div className="w-1.5 h-8 bg-neon-green shadow-[0_0_15px_#39FF14] shrink-0"></div>
        <div>
          <h1 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">Admin</h1>
          <p className="text-[8px] text-neon-green font-bold tracking-[0.3em]">CORE_V1</p>
        </div>
      </div>

      {/* Навігація */}
      <nav className="flex md:flex-col items-center md:items-stretch gap-1 md:gap-4 px-2 md:px-6 w-full h-full md:h-auto">
        {menu.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-4 flex-1 md:flex-none px-2 md:px-5 py-2 md:py-4 rounded-xl transition-all relative ${
                isActive 
                ? 'text-neon-green' 
                : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {/* Активний індикатор для мобілок (світіння зверху кнопки) */}
              {isActive && (
                <div className="absolute top-0 md:top-auto md:left-0 w-8 md:w-1 h-1 md:h-8 bg-neon-green shadow-[0_0_15px_#39FF14] rounded-full transition-all"></div>
              )}
              
              <Icon size={isActive ? 22 : 20} className={`transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[8px] md:text-[11px] font-black uppercase tracking-[0.2em]">
                {item.name}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Версія: Тільки для десктопа */}
      <div className="hidden md:block absolute bottom-10 left-10">
        <div className="text-[8px] font-black text-slate-800 uppercase tracking-[0.4em]">
          v1.0.42_STABLE_хуй
        </div>
      </div>
    </div>
  )
}

export default Sidebar