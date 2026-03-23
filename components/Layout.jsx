import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0 px-6 py-6">
        {children}
      </main>
    </div>
  )
}