import { useEffect, useState } from 'react'
import { collection, onSnapshot, doc, deleteDoc, setDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import { db } from '../firebase'
import { initializeApp, getApps } from 'firebase/app'

const FACULTIES = ['FOB', 'FOC', 'FOE/FOS', 'Library']

let secondaryApp
const initSecondaryApp = () => {
  if (!secondaryApp) {
    const mainApp = getApps()[0]
    secondaryApp = initializeApp(mainApp.options, 'secondary')
  }
  return secondaryApp
}

function AddAdminModal({ onClose }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [faculty, setFaculty] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async () => {
    if (!name.trim())     { setError('Name is required.'); return }
    if (!email.trim())    { setError('Email is required.'); return }
    if (!email.includes('@')) { setError('Enter a valid email.'); return }
    if (!faculty)         { setError('Please select a faculty.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }

    setSaving(true)
    try {
      const secondaryAuth = getAuth(initSecondaryApp())
      const credential = await createUserWithEmailAndPassword(
        secondaryAuth, email.trim(), password
      )
      const uid = credential.user.uid
      await secondaryAuth.signOut()

      // Store in admins collection (keyed by email)
      await setDoc(doc(db, 'admins', email.trim().toLowerCase()), {
        uid,
        name: name.trim(),
        faculty,
        role: 'admin',
        createdAt: new Date(),
      })

      onClose()
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.')
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.')
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md px-6 py-6">
        <h2 className="text-gray-800 font-semibold text-lg mb-1">Add admin account</h2>
        <p className="text-gray-400 text-sm mb-5">
          Create a new admin account. Share the temporary password with them.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Perera"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@nsbm.ac.lk"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            />
          </div>

          {/* Faculty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Faculty</label>
            <select
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            >
              <option value="">Select faculty</option>
              {FACULTIES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Temporary password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm bg-green-700 text-white font-medium hover:bg-green-800 transition disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create account'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirmModal({ admin, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try { await onConfirm(); onClose() }
    finally { setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm px-6 py-6">
        <h2 className="text-gray-800 font-semibold text-lg mb-2">Remove admin?</h2>
        <p className="text-gray-500 text-sm mb-6">
          This will remove <span className="font-medium text-gray-700">{admin.email}</span> from
          the admin list. Their Firebase Auth account will remain but they won't be able to log in.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-5 py-2 rounded-xl text-sm bg-red-600 text-white font-medium hover:bg-red-700 transition disabled:opacity-50"
          >
            {deleting ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Admins() {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [removingAdmin, setRemovingAdmin] = useState(null)
  const currentEmail = getAuth().currentUser?.email?.toLowerCase()

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'admins'), (snap) => {
      const data = snap.docs.map((d) => ({ email: d.id, ...d.data() }))
      data.sort((a, b) => a.email.localeCompare(b.email))
      setAdmins(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const handleRemove = async () => {
    await deleteDoc(doc(db, 'admins', removingAdmin.email))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Admin Management</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage who has access to the admin portal.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          + Add Admin
        </button>
      </div>

      {/* Admin list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-100">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No admins found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {admins.map((admin) => {
              const isCurrentUser = admin.email === currentEmail
              return (
                <div key={admin.email} className="flex items-center gap-4 px-6 py-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm flex-shrink-0">
                    {(admin.name || admin.email).charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-gray-800 text-sm font-medium truncate">
                        {admin.name || '—'}
                      </p>
                      {isCurrentUser && (
                        <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5 truncate">{admin.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full">
                        {admin.faculty || '—'}
                      </span>
                      <span className="text-gray-300 text-xs">·</span>
                      <span className="text-gray-400 text-xs capitalize">{admin.role}</span>
                    </div>
                  </div>

                  {/* Remove button */}
                  {!isCurrentUser && (
                    <button
                      onClick={() => setRemovingAdmin(admin)}
                      className="text-sm text-red-500 font-medium hover:underline flex-shrink-0"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-gray-400 text-xs mt-4 text-center">
        Removing an admin revokes their portal access but does not delete their account.
      </p>

      {showAddModal && (
        <AddAdminModal onClose={() => setShowAddModal(false)} />
      )}
      {removingAdmin && (
        <DeleteConfirmModal
          admin={removingAdmin}
          onClose={() => setRemovingAdmin(null)}
          onConfirm={handleRemove}
        />
      )}
    </div>
  )
}