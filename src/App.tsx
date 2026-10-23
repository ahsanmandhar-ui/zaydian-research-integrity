import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Home from './pages/Home'
import Projects from './pages/Projects'
import Dataset from './pages/Dataset'
import Sync from './pages/Sync'
import Vault from './pages/Vault'
import AnalyticsPage from './pages/Analytics'
import Dashboards from './pages/Dashboards'

export default function App() {
  return (
    <BrowserRouter>
      <nav className="zri-nav">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/projects">Projects</NavLink>
        <NavLink to="/dataset">Dataset</NavLink>
        <NavLink to="/sync">Sync</NavLink>
        <NavLink to="/vault">Vault</NavLink>
        <NavLink to="/analytics">Analytics</NavLink>
        <NavLink to="/dashboards">Dashboards</NavLink>
      </nav>
      <main className="zri-shell">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/dataset" element={<Dataset />} />
          <Route path="/sync" element={<Sync />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/dashboards" element={<Dashboards />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
