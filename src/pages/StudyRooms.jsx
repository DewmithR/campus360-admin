import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, doc, updateDoc,
  addDoc, deleteDoc, query, where, orderBy,
  serverTimestamp, getDocs
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { db } from '../firebase'

// Helpers
function OccupancyBar({ current, max }) {
  const percent = max > 0 ? (current / max) * 100 : 0
  const color =
    percent === 0 ? 'bg-gray-200' :
    percent < 50  ? 'bg-green-500' :
    percent < 80  ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
      <div
        className={`${color} h-1.5 rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  )
}

function StatusBadge({ current, max }) {
  const percent = max > 0 ? (current / max) * 100 : 0
  if (current === 0) return (
    <span className="bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-full">Empty</span>
  )
  if (percent < 80) return (
    <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">Available</span>
  )
  if (percent < 100) return (
    <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">Almost Full</span>
  )
  return (
    <span className="bg-red-100 text-red-700 text-xs font-medium px-2.5 py-1 rounded-full">Full</span>
  )
}

function GroupStatusBadge({ isOccupied }) {
  return isOccupied
    ? <span className="bg-red-100 text-red-700 text-xs font-medium px-2.5 py-1 rounded-full">Occupied</span>
    : <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">Free</span>
}

// Add / Edit Room Modal
function RoomModal({ room, facultyId, onClose, onSave }) {
  const [name, setName]         = useState(room?.name || '')
  const [capacity, setCapacity] = useState(room?.capacity || 10)
  const [type, setType]         = useState(room?.type || 'common')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  // Library can only have group rooms
  const isLibrary = facultyId === 'Library'

  useEffect(() => {
    if (isLibrary) setType('group')
  }, [isLibrary])

  const handleSave = async () => {
    if (!name.trim()) { setError('Room name is required.'); return }
    if (type === 'common' && capacity < 1) { setError('Capacity must be at least 1.'); return }
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        capacity: type === 'common' ? Number(capacity) : 1,
        type,
      })
      onClose()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md px-6 py-6">
        <h2 className="text-gray-800 font-semibold text-lg mb-1">
          {room ? 'Edit Study Room' : 'Add Study Room'}
        </h2>
        <p className="text-gray-400 text-sm mb-5">
          Faculty: <span className="font-medium text-gray-600">{facultyId}</span>
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Room name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Room 1"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            />
          </div>

          {/* Room type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room type</label>
            {isLibrary ? (
              <div className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-400 bg-gray-50">
                Group room <span className="text-xs">(Library only supports group rooms)</span>
              </div>
            ) : (
              <div className="flex gap-3">
                {['common', 'group'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => !room && setType(t)}
                    disabled={!!room}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition
                      ${type === t
                        ? 'bg-green-700 text-white border-green-700'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-green-400'}
                      ${room ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {t === 'common' ? '🪑 Common' : '👥 Group'}
                  </button>
                ))}
              </div>
            )}
            <p className="text-gray-400 text-xs mt-1.5">
              {type === 'common'
                ? 'Students can self check-in and check-out.'
                : 'Check-in and check-out is managed by admins only.'}
            </p>
          </div>

          {/* Capacity — only for common rooms */}
          {type === 'common' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                min={1}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm bg-green-700 text-white font-medium hover:bg-green-800 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : room ? 'Save changes' : 'Add room'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Delete Room Modal
function DeleteConfirmModal({ room, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try { await onConfirm(); onClose() }
    finally { setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm px-6 py-6">
        <h2 className="text-gray-800 font-semibold text-lg mb-2">Delete room?</h2>
        <p className="text-gray-500 text-sm mb-6">
          Are you sure you want to delete <span className="font-medium text-gray-700">{room.name}</span>? This cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-5 py-2 rounded-xl text-sm bg-red-600 text-white font-medium hover:bg-red-700 transition disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Check-in Modal (group rooms)
function CheckInModal({ room, facultyId, onClose }) {
  const [primaryName, setPrimaryName] = useState('')
  const [primarySid, setPrimarySid] = useState('')
  const [primaryPhone, setPrimaryPhone] = useState('')
  const [primaryEmail, setPrimaryEmail] = useState('')
  const [reason, setReason] = useState('')
  const [sidInput, setSidInput] = useState('')
  const [allSids, setAllSids] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [lookingUp, setLookingUp] = useState(false)

  // Auto-fill the fields phone and email when SID is entered
  const handleSidLookup = async (sid) => {
    setPrimarySid(sid)
    if (sid.length < 4) return
    setLookingUp(true)
    try {
      const snap = await getDocs(
        query(collection(db, 'users'), where('sid', '==', sid))
      )
      if (!snap.empty) {
        const data = snap.docs[0].data()
        setPrimaryPhone(data.phone || '')
        setPrimaryEmail(data.email || '')
        setPrimaryName(data.name || '')
      } else {
        setPrimaryPhone('')
        setPrimaryEmail('')
      }
    } catch {
      // silently fail — admin can fill manually
    } finally {
      setLookingUp(false)
    }
  }

  const handleAddSid = () => {
    const trimmed = sidInput.trim()
    if (!trimmed) return
    if (allSids.includes(trimmed)) return
    setAllSids([...allSids, trimmed])
    setSidInput('')
  }

  const handleRemoveSid = (sid) => {
    setAllSids(allSids.filter((s) => s !== sid))
  }

  const handleCheckIn = async () => {
    if (!primaryName.trim()) { setError('Primary student name is required.'); return }
    if (!primarySid.trim()) { setError('Primary student SID is required.'); return }
    if (!primaryPhone.trim()) { setError('Phone number is required.'); return }
    if (!primaryEmail.trim()) { setError('Email is required.'); return }
    if (!reason.trim()) { setError('Please enter a reason for booking.'); return }

    setSaving(true)
    try {
      const now = new Date()
      const roomRef = doc(db, 'faculties', facultyId, 'rooms', room.id)

      // Create booking record
      await addDoc(
        collection(db, 'faculties', facultyId, 'rooms', room.id, 'bookings'),
        {
          primaryName: primaryName.trim(),
          primarySid: primarySid.trim(),
          primaryPhone: primaryPhone.trim(),
          primaryEmail: primaryEmail.trim(),
          studentSids: [primarySid.trim(), ...allSids],
          reason: reason.trim(),
          checkInTime: now,
          checkOutTime: null,
          adminUid: getAuth().currentUser?.uid || '',
          adminEmail: getAuth().currentUser?.email || '',
          status: 'active',
          createdAt: serverTimestamp(),
        }
      )

      // Update room status
      await updateDoc(roomRef, {
        isOccupied:    true,
        occupantCount: [primarySid.trim(), ...allSids].length,
      })

      onClose()
    } catch (e) {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg px-6 py-6 my-auto">
        <h2 className="text-gray-800 font-semibold text-lg mb-1">Check In — {room.name}</h2>
        <p className="text-gray-400 text-sm mb-5">
          Record the primary student's details and all student SIDs in the group.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">

          {/* Primary SID with auto-fill */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Student SID
              {lookingUp && <span className="text-green-600 text-xs ml-2">Looking up...</span>}
            </label>
            <input
              type="text"
              value={primarySid}
              onChange={(e) => handleSidLookup(e.target.value)}
              placeholder="Enter SID to auto-fill details"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            />
          </div>

          {/* Primary name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={primaryName}
              onChange={(e) => setPrimaryName(e.target.value)}
              placeholder="Primary student's full name"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            />
          </div>

          {/* Phone and email — auto-filled */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                value={primaryPhone}
                onChange={(e) => setPrimaryPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={primaryEmail}
                onChange={(e) => setPrimaryEmail(e.target.value)}
                placeholder="Auto-filled"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for booking</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Group project discussion"
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition resize-none"
            />
          </div>

          {/* Additional SIDs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Other Student SIDs
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sidInput}
                onChange={(e) => setSidInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSid()}
                placeholder="Enter SID and press Add"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={handleAddSid}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition"
              >
                Add
              </button>
            </div>

            {/* SID chips */}
            {allSids.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {allSids.map((sid) => (
                  <span
                    key={sid}
                    className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-medium px-3 py-1.5 rounded-full"
                  >
                    {sid}
                    <button
                      onClick={() => handleRemoveSid(sid)}
                      className="text-green-500 hover:text-red-500 transition text-sm leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <p className="text-gray-400 text-xs mt-1.5">
              Total students: {1 + allSids.length}
            </p>
          </div>

          {/* Check-in time preview */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-500">
            <span className="font-medium text-gray-700">Check-in time: </span>
            {new Date().toLocaleString()}
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition">
            Cancel
          </button>
          <button
            onClick={handleCheckIn}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm bg-green-700 text-white font-medium hover:bg-green-800 transition disabled:opacity-50"
          >
            {saving ? 'Checking in...' : 'Confirm Check-in'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Check-out Modal (group rooms)
function CheckOutModal({ room, facultyId, onClose }) {
  const [activeBooking, setActiveBooking] = useState(null)
  const [loading, setLoading]  = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)

  useEffect(() => {
    const fetchBooking = async () => {
      const snap = await getDocs(
        query(
          collection(db, 'faculties', facultyId, 'rooms', room.id, 'bookings'),
          where('status', '==', 'active')
        )
      )
      if (!snap.empty) {
        setActiveBooking({ id: snap.docs[0].id, ...snap.docs[0].data() })
      }
      setLoading(false)
    }
    fetchBooking()
  }, [room.id, facultyId])

  const handleCheckOut = async () => {
    if (!activeBooking) return
    setCheckingOut(true)
    try {
      const now = new Date()

      // Update booking record
      await updateDoc(
        doc(db, 'faculties', facultyId, 'rooms', room.id, 'bookings', activeBooking.id),
        {
          checkOutTime: now,
          status: 'completed',
        }
      )

      // Update room status
      await updateDoc(
        doc(db, 'faculties', facultyId, 'rooms', room.id),
        {
          isOccupied: false,
          occupantCount: 0,
        }
      )

      onClose()
    } catch {
      // error handled silently — admin can retry
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md px-6 py-6">
        <h2 className="text-gray-800 font-semibold text-lg mb-1">Check Out — {room.name}</h2>
        <p className="text-gray-400 text-sm mb-5">Review the active booking and confirm check-out.</p>

        {loading ? (
          <div className="py-8 text-center text-gray-400 text-sm">Loading booking...</div>
        ) : !activeBooking ? (
          <div className="py-8 text-center text-gray-400 text-sm">No active booking found for this room.</div>
        ) : (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-xl px-4 py-4 space-y-2 text-sm">
              <_BookingRow label="Name" value={activeBooking.primaryName} />
              <_BookingRow label="SID" value={activeBooking.primarySid} />
              <_BookingRow label="Phone" value={activeBooking.primaryPhone} />
              <_BookingRow label="Email" value={activeBooking.primaryEmail} />
              <_BookingRow label="Reason" value={activeBooking.reason} />
              <_BookingRow
                label="Check-in"
                value={activeBooking.checkInTime?.toDate
                  ? activeBooking.checkInTime.toDate().toLocaleString()
                  : new Date(activeBooking.checkInTime).toLocaleString()}
              />
              {activeBooking.studentSids?.length > 1 && (
                <div className="pt-1">
                  <p className="text-gray-500 text-xs font-medium mb-1.5">All SIDs</p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeBooking.studentSids.map((sid) => (
                      <span key={sid} className="bg-green-50 border border-green-200 text-green-700 text-xs px-2.5 py-1 rounded-full">
                        {sid}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
              Check-out time will be recorded as <span className="font-medium">{new Date().toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition">
            Cancel
          </button>
          {activeBooking && (
            <button
              onClick={handleCheckOut}
              disabled={checkingOut}
              className="px-5 py-2 rounded-xl text-sm bg-red-600 text-white font-medium hover:bg-red-700 transition disabled:opacity-50"
            >
              {checkingOut ? 'Checking out...' : 'Confirm Check-out'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function _BookingRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-gray-700 font-medium text-right">{value || '—'}</span>
    </div>
  )
}

// Booking History Modal
function BookingHistoryModal({ room, facultyId, onClose }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const fetchBookings = async () => {
      const snap = await getDocs(
        query(
          collection(db, 'faculties', facultyId, 'rooms', room.id, 'bookings'),
          orderBy('createdAt', 'desc')
        )
      )
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }
    fetchBookings()
  }, [room.id, facultyId])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl px-6 py-6 my-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-gray-800 font-semibold text-lg">Booking History</h2>
            <p className="text-gray-400 text-sm mt-0.5">{room.name} · {facultyId}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-400 text-sm">Loading history...</div>
        ) : bookings.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">No bookings yet for this room.</div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {bookings.map((b) => (
              <div key={b.id} className="bg-gray-50 rounded-xl px-4 py-4 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-800">{b.primaryName}</span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    b.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {b.status === 'active' ? 'Active' : 'Completed'}
                  </span>
                </div>
                <div className="space-y-1 text-gray-500">
                  <p><span className="text-gray-400">SID:</span> {b.primarySid}</p>
                  <p><span className="text-gray-400">Phone:</span> {b.primaryPhone}</p>
                  <p><span className="text-gray-400">Reason:</span> {b.reason}</p>
                  <p>
                    <span className="text-gray-400">Check-in:</span>{' '}
                    {b.checkInTime?.toDate
                      ? b.checkInTime.toDate().toLocaleString()
                      : new Date(b.checkInTime).toLocaleString()}
                  </p>
                  {b.checkOutTime && (
                    <p>
                      <span className="text-gray-400">Check-out:</span>{' '}
                      {b.checkOutTime?.toDate
                        ? b.checkOutTime.toDate().toLocaleString()
                        : new Date(b.checkOutTime).toLocaleString()}
                    </p>
                  )}
                  {b.studentSids?.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {b.studentSids.map((sid) => (
                        <span key={sid} className="bg-white border border-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                          {sid}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Common Room Card
function CommonRoomCard({ room, facultyId, onEdit, onDelete }) {
  const current = room.currentCapacity || 0
  const max  = room.capacity || 10

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-gray-800 font-semibold text-base">{room.name}</h3>
            <span className="bg-blue-50 text-blue-600 text-xs font-medium px-2 py-0.5 rounded-full">Common</span>
          </div>
          <p className="text-gray-400 text-xs mt-0.5">{facultyId}</p>
        </div>
        <StatusBadge current={current} max={max} />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">
          <span className="text-gray-800 font-semibold">{current}</span>
          <span className="text-gray-400"> / {max} occupants</span>
        </span>
      </div>

      <OccupancyBar current={current} max={max} />

      <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
        <button onClick={() => onEdit(room, facultyId)} className="text-sm text-green-700 font-medium hover:underline">
          Edit
        </button>
        <button onClick={() => onDelete(room, facultyId)} className="text-sm text-red-500 font-medium hover:underline">
          Delete
        </button>
      </div>
    </div>
  )
}

// Group Room Card
function GroupRoomCard({ room, facultyId, onEdit, onDelete, onCheckIn, onCheckOut, onHistory }) {
  const isOccupied = room.isOccupied || false
  const occupantCount = room.occupantCount || 0

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-gray-800 font-semibold text-base">{room.name}</h3>
            <span className="bg-purple-50 text-purple-600 text-xs font-medium px-2 py-0.5 rounded-full">Group</span>
          </div>
          <p className="text-gray-400 text-xs mt-0.5">{facultyId}</p>
        </div>
        <GroupStatusBadge isOccupied={isOccupied} />
      </div>

      <p className="text-sm text-gray-500">
        {isOccupied
          ? <><span className="text-gray-800 font-semibold">{occupantCount}</span> student{occupantCount !== 1 ? 's' : ''} inside</>
          : 'Available for booking'}
      </p>

      {/* Check-in / Check-out buttons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onCheckIn(room, facultyId)}
          disabled={isOccupied}
          className="flex-1 py-2 rounded-xl text-sm font-medium bg-green-700 text-white hover:bg-green-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Check In
        </button>
        <button
          onClick={() => onCheckOut(room, facultyId)}
          disabled={!isOccupied}
          className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Check Out
        </button>
      </div>

      <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
        <button onClick={() => onHistory(room, facultyId)} className="text-sm text-gray-500 font-medium hover:underline">
          History
        </button>
        <button onClick={() => onEdit(room, facultyId)} className="text-sm text-green-700 font-medium hover:underline">
          Edit
        </button>
        <button onClick={() => onDelete(room, facultyId)} className="text-sm text-red-500 font-medium hover:underline">
          Delete
        </button>
      </div>
    </div>
  )
}

// Main Page
export default function StudyRooms() {
  const [allRooms, setAllRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [deletingRoom, setDeletingRoom] = useState(null)
  const [checkInRoom, setCheckInRoom] = useState(null)
  const [checkOutRoom, setCheckOutRoom] = useState(null)
  const [historyRoom, setHistoryRoom] = useState(null)

  // Get current admin's faculty
  const [adminFaculty, setAdminFaculty] = useState(null)

  useEffect(() => {
    const fetchAdminFaculty = async () => {
      const currentEmail = getAuth().currentUser?.email?.toLowerCase()
      if (!currentEmail) return
      const { doc: firestoreDoc, getDoc } = await import('firebase/firestore')
      const adminDoc = await getDoc(firestoreDoc(db, 'admins', currentEmail))
      if (adminDoc.exists()) {
        setAdminFaculty(adminDoc.data().faculty)
      }
    }
    fetchAdminFaculty()
  }, [])

  useEffect(() => {
    if (!adminFaculty) return

    const roomsRef = collection(db, 'faculties', adminFaculty, 'rooms')
    const unsub = onSnapshot(roomsRef, (snap) => {
      const rooms = snap.docs.map((d) => ({
        id: d.id,
        facultyId: adminFaculty,
        ...d.data(),
      }))
      rooms.sort((a, b) => a.name.localeCompare(b.name))
      setAllRooms(rooms)
      setLoading(false)
    })

    return () => unsub()
  }, [adminFaculty])

  const handleAdd = async ({ name, capacity, type }) => {
  const roomData = { name, type }

  if (type === 'common') {
    roomData.capacity = Number(capacity)
    roomData.currentCapacity = 0
  } else {
    roomData.isOccupied = false
    roomData.occupantCount = 0
  }

  await addDoc(collection(db, 'faculties', adminFaculty, 'rooms'), roomData)
}

  const handleEdit = async ({ name, capacity }) => {
    await updateDoc(
      doc(db, 'faculties', editingRoom.facultyId, 'rooms', editingRoom.room.id),
      { name, capacity }
    )
  }

  const handleDelete = async () => {
    await deleteDoc(
      doc(db, 'faculties', deletingRoom.facultyId, 'rooms', deletingRoom.room.id)
    )
  }

  const commonRooms = allRooms.filter((r) => r.type === 'common')
  const groupRooms = allRooms.filter((r) => r.type === 'group')

  const totalCurrent = commonRooms.reduce((sum, r) => sum + (r.currentCapacity || 0), 0)
  const totalCapacity = commonRooms.reduce((sum, r) => sum + (r.capacity || 0), 0)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Study Rooms</h1>
          <p className="text-gray-400 text-sm mt-1">
            {adminFaculty
              ? <>Managing rooms for <span className="font-medium text-gray-600">{adminFaculty}</span></>
              : 'Loading your faculty...'}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={!adminFaculty}
          className="bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition disabled:opacity-50"
        >
          + Add Room
        </button>
      </div>

      {/* Summary bar */}
      {!loading && allRooms.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4 mb-6 flex flex-wrap gap-6">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide font-medium">Total rooms</p>
            <p className="text-gray-800 text-xl font-bold mt-0.5">{allRooms.length}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide font-medium">Common rooms</p>
            <p className="text-gray-800 text-xl font-bold mt-0.5">{commonRooms.length}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide font-medium">Group rooms</p>
            <p className="text-gray-800 text-xl font-bold mt-0.5">{groupRooms.length}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide font-medium">Currently occupied</p>
            <p className="text-gray-800 text-xl font-bold mt-0.5">{totalCurrent} / {totalCapacity}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide font-medium">Group occupied</p>
            <p className="text-gray-800 text-xl font-bold mt-0.5">
              {groupRooms.filter((r) => r.isOccupied).length} / {groupRooms.length}
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 px-6 py-5 space-y-3">
              <div className="h-4 bg-gray-100 rounded animate-pulse w-1/3" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-1/4" />
              <div className="h-2 bg-gray-100 rounded-full animate-pulse w-full mt-2" />
            </div>
          ))}
        </div>
      ) : allRooms.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">⊞</p>
          <p className="text-sm mb-4">No study rooms yet.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-green-800 transition"
          >
            Add your first room
          </button>
        </div>
      ) : (
        <>
          {/* Common Rooms */}
          {commonRooms.length > 0 && (
            <div className="mb-8">
              <h2 className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-3">
                🪑 Common Rooms
              </h2>
              <div className="space-y-4">
                {commonRooms.map((room) => (
                  <CommonRoomCard
                    key={room.id}
                    room={room}
                    facultyId={adminFaculty}
                    onEdit={(room, fId) => setEditingRoom({ room, facultyId: fId })}
                    onDelete={(room, fId) => setDeletingRoom({ room, facultyId: fId })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Group Rooms */}
          {groupRooms.length > 0 && (
            <div className="mb-8">
              <h2 className="text-gray-500 text-xs font-semibold uppercase tracking-widest mb-3">
                👥 Group Rooms
              </h2>
              <div className="space-y-4">
                {groupRooms.map((room) => (
                  <GroupRoomCard
                    key={room.id}
                    room={room}
                    facultyId={adminFaculty}
                    onEdit={(room, fId) => setEditingRoom({ room, facultyId: fId })}
                    onDelete={(room, fId) => setDeletingRoom({ room, facultyId: fId })}
                    onCheckIn={(room, fId) => setCheckInRoom({ room, facultyId: fId })}
                    onCheckOut={(room, fId) => setCheckOutRoom({ room, facultyId: fId })}
                    onHistory={(room, fId) => setHistoryRoom({ room, facultyId: fId })}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showAddModal && adminFaculty && (
        <RoomModal
          facultyId={adminFaculty}
          onClose={() => setShowAddModal(false)}
          onSave={handleAdd}
        />
      )}
      {editingRoom && (
        <RoomModal
          room={editingRoom.room}
          facultyId={editingRoom.facultyId}
          onClose={() => setEditingRoom(null)}
          onSave={handleEdit}
        />
      )}
      {deletingRoom && (
        <DeleteConfirmModal
          room={deletingRoom.room}
          onClose={() => setDeletingRoom(null)}
          onConfirm={handleDelete}
        />
      )}
      {checkInRoom && (
        <CheckInModal
          room={checkInRoom.room}
          facultyId={checkInRoom.facultyId}
          onClose={() => setCheckInRoom(null)}
        />
      )}
      {checkOutRoom && (
        <CheckOutModal
          room={checkOutRoom.room}
          facultyId={checkOutRoom.facultyId}
          onClose={() => setCheckOutRoom(null)}
        />
      )}
      {historyRoom && (
        <BookingHistoryModal
          room={historyRoom.room}
          facultyId={historyRoom.facultyId}
          onClose={() => setHistoryRoom(null)}
        />
      )}
    </div>
  )
}