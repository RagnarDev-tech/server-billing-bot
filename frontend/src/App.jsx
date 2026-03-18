import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Servers from './pages/Servers'
import Settings from './pages/Settings'
import Layout from './components/layout/Layout'
import ServerDetails from './pages/ServerDetails';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    /* Встановлюємо min-h-screen та прибираємо скрол по горизонталі на рівні всього додатку */
    <div className="min-h-screen bg-[#050507] overflow-x-hidden">
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Всі захищені сторінки рендеряться всередині Layout */}
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="servers" element={<Servers />} />
          <Route path="settings" element={<Settings />} />
          <Route path="/server/:id" element={<ServerDetails />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App