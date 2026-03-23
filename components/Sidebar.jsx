import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import logo from '../assets/logo.png'

const links = [
  { to: '/dashboard', label: 'Dashboard'},
  { to: '/feedback', label: 'Feedback'},
  { to: '/study-rooms', label: 'Study Rooms'},
  { to: '/events', label: 'Events'},
  { to: '/admins', label: 'Admin Management'},
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-green-900 flex items-center justify-between px-4 z-50 shadow">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-xl p-1">
            <img src={logo} alt="Logo" className="w-7 h-7 object-contain" />
          </div>
          <span className="text-white font-semibold text-sm">Campus 360 Admin</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="text-white text-xl focus:outline-none"
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-40 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-green-900 flex flex-col z-50
          transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:flex
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-green-700">
          <div className="bg-white rounded-xl p-1.5 shadow">
            <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Campus 360</p>
            <p className="text-green-300 text-xs">Admin Portal</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition
                ${isActive
                  ? 'bg-green-700 text-white'
                  : 'text-green-200 hover:bg-green-800 hover:text-white'
                }`
              }
            >
              <span className="text-base">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-green-700">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-green-200 hover:bg-green-800 hover:text-white transition"
          >
            <span className="text-base">⇤</span>
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}