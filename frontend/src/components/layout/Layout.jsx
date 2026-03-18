import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

const Layout = () => {
  return (
    /* На мобільних: flex-col, на десктопі: flex-row */
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#050507] overflow-hidden">
      <Sidebar />
      {/* Додаємо pb-20 для мобілок, щоб контент не ховався за фіксований Sidebar */}
      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden bg-cyber-bg pb-20 md:pb-0">
        <div className="relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout