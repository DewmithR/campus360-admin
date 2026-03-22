import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '../firebase'

function StatCard({ label, value, color, icon }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5 flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="text-gray-800 text-2xl font-bold mt-0.5">
          {value === null ? (
            <span className="w-12 h-6 bg-gray-100 rounded animate-pulse inline-block" />
          ) : value}
        </p>
      </div>
    </div>
  )
}

function QuickAction({ label, description, icon, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex items-center gap-4 hover:shadow-md transition text-left w-full"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-gray-800 text-sm font-semibold">{label}</p>
        <p className="text-gray-400 text-xs mt-0.5">{description}</p>
      </div>
    </button>
  )
}

export default function Dashboard() {
  const [activeOccupants, setActiveOccupants] = useState(null)
  const [pendingFeedback, setPendingFeedback] = useState(null)
  const [recentStudents, setRecentStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(true)

  useEffect(() => {
    fetchStats()
    fetchRecentStudents()
  }, [])

  const fetchStats = async () => {
    try {
      // Active study room occupants
      const facultyIds = ['Business', 'Computing', 'Engineering', 'Library']
      let occupants = 0
      for (const facultyId of facultyIds) {
        const roomsSnap = await getDocs(
          collection(db, 'faculties', facultyId, 'rooms')
        )
        roomsSnap.forEach((doc) => {
          occupants += doc.data().currentCapacity || 0
        })
      }
      setActiveOccupants(occupants)

      // Pending feedback (no reply yet)
      const feedbackSnap = await getDocs(
        query(collection(db, 'feedbacks'), where('status', '==', 'pending'))
      )
      setPendingFeedback(feedbackSnap.size)
    } catch (err) {
      console.error('Error fetching stats:', err)
      setActiveOccupants(0)
      setPendingFeedback(0)
    }
  }

  const fetchRecentStudents = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(5))
      )
      const students = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setRecentStudents(students)
    } catch (err) {
      console.error('Error fetching students:', err)
    } finally {
      setLoadingStudents(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">
          Welcome back. Here's what's happening at Campus 360.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <StatCard
          label="Active Room Occupants"
          value={activeOccupants}
          icon="⊞"
          color="bg-green-100 text-green-700"
        />
        <StatCard
          label="Pending Feedback Replies"
          value={pendingFeedback}
          icon="✉"
          color="bg-amber-100 text-amber-700"
        />
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent students */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5">
          <h2 className="text-gray-800 font-semibold text-base mb-4">Recently Registered Students</h2>
          {loadingStudents ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentStudents.length === 0 ? (
            <p className="text-gray-400 text-sm">No students registered yet.</p>
          ) : (
            <div className="space-y-3">
              {recentStudents.map((student) => (
                <div key={student.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm flex-shrink-0">
                    {student.name ? student.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-800 text-sm font-medium truncate">
                      {student.name || 'Unknown'}
                    </p>
                    <p className="text-gray-400 text-xs truncate">{student.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5">
          <h2 className="text-gray-800 font-semibold text-base mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <QuickAction
              label="Reply to Feedback"
              description="View and respond to pending feedback"
              icon="✉"
              color="bg-amber-100 text-amber-700"
              onClick={() => window.location.href = '/feedback'}
            />
            <QuickAction
              label="Manage Study Rooms"
              description="View occupancy and override check-ins"
              icon="⊞"
              color="bg-green-100 text-green-700"
              onClick={() => window.location.href = '/study-rooms'}
            />
            <QuickAction
              label="Create Event"
              description="Publish a new event for students"
              icon="◈"
              color="bg-blue-100 text-blue-700"
              onClick={() => window.location.href = '/events'}
            />
          </div>
        </div>

      </div>
    </div>
  )
}