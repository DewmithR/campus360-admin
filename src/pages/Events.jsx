import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, addDoc, deleteDoc,
  doc, orderBy, query, where, updateDoc, Timestamp,
  getDocs, writeBatch
} from 'firebase/firestore'
import { db } from '../firebase'

// Helpers

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  }) + ' · ' + date.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  })
}

// Event Modal (Create & Edit)

function EventModal({ event, onClose, onSave }) {
  const isEdit = !!event
  const [title, setTitle] = useState(event?.title || '')
  const [description, setDescription] = useState(event?.description || '')
  const [venue, setVenue] = useState(event?.venue || '')
  const [flyerUrl, setFlyerUrl] = useState(event?.flyerUrl || '')
  const [type, setType] = useState(event?.type || 'free')
  const [ticketPrice, setTicketPrice] = useState(event?.ticketPrice || '')
  const [totalSeats, setTotalSeats] = useState(event?.totalSeats || '')
  const [date, setDate] = useState(
    event?.date
      ? new Date(event.date.toDate()).toISOString().slice(0, 16)
      : ''
  )
  const [status, setStatus] = useState(event?.status || 'upcoming')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required.'); return }
    if (!date) { setError('Date and time is required.'); return }
    if (!venue.trim()) { setError('Venue is required.'); return }
    if (!totalSeats || Number(totalSeats) < 1) {
      setError('Total seats must be at least 1.'); return
    }
    if (type === 'paid' && (!ticketPrice || Number(ticketPrice) <= 0)) {
      setError('Ticket price must be greater than 0.'); return
    }
    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        venue: venue.trim(),
        flyerUrl: flyerUrl.trim(),
        type,
        ticketPrice: type === 'paid' ? Number(ticketPrice) : 0,
        totalSeats: Number(totalSeats),
        date: Timestamp.fromDate(new Date(date)),
        status,
      })
      onClose()
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg px-6 py-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-gray-800 font-semibold text-lg mb-5">
          {isEdit ? 'Edit Event' : 'Create Event'}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {isEdit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            >
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual Tech Fest 2026"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the event..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date & time</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Main Auditorium"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event type</label>
            <div className="flex gap-3">
              {[
                { value: 'free', label: 'Free entry' },
                { value: 'paid', label: 'Paid / Ticketed' },
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition
                    ${type === t.value
                      ? 'bg-green-700 text-white border-green-700'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-green-400'
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`grid gap-3 ${type === 'paid' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {type === 'paid' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ticket price (LKR)
                </label>
                <input
                  type="number"
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(e.target.value)}
                  min={1}
                  placeholder="500"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total seats
              </label>
              <input
                type="number"
                value={totalSeats}
                onChange={(e) => setTotalSeats(e.target.value)}
                min={1}
                placeholder="100"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Flyer image URL
              <span className="text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <input
              type="url"
              value={flyerUrl}
              onChange={(e) => setFlyerUrl(e.target.value)}
              placeholder="cloudinary.com/yourimage.jpg"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            />
            {flyerUrl && (
              <img
                src={flyerUrl}
                alt="Preview"
                className="mt-2 w-full h-32 object-cover rounded-xl border border-gray-100"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
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
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm bg-green-700 text-white font-medium hover:bg-green-800 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Delete Confirm Modal

function DeleteConfirmModal({ event, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false)

const handleDelete = async () => {
  const bookingsSnap = await getDocs(
    query(collection(db, 'bookings'), where('eventId', '==', deletingEvent.id))
  )
  const batch = writeBatch(db)
  bookingsSnap.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(doc(db, 'events', deletingEvent.id))
  await batch.commit()
}

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm px-6 py-6">
        <h2 className="text-gray-800 font-semibold text-lg mb-2">Delete event?</h2>
        <p className="text-gray-500 text-sm mb-6">
          Are you sure you want to delete{' '}
          <span className="font-medium text-gray-700">{event.title}</span>?
          This cannot be undone.
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
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Bookings Panel

function BookingsPanel({ event, onClose }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUncollected, setShowUncollected] = useState(false)
  const [markingId, setMarkingId] = useState(null)

  useEffect(() => {
    const q = query(
      collection(db, 'bookings'),
      where('eventId', '==', event.id),
      orderBy('bookedAt', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsub()
  }, [event.id])

  const handleMarkCollected = async (booking) => {
    setMarkingId(booking.id)
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'collected',
        collectedAt: Timestamp.now(),
      })
    } finally {
      setMarkingId(null)
    }
  }

  const reserved = bookings.filter((b) => b.status === 'reserved')
  const collected = bookings.filter((b) => b.status === 'collected')
  const filtered = showUncollected
    ? bookings.filter((b) => b.status === 'reserved')
    : bookings

  const formatBookedAt = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  const statusColors = {
    reserved: 'bg-amber-100 text-amber-700',
    collected: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-500',
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="text-gray-800 font-semibold text-lg">{event.title}</h2>
            <p className="text-gray-400 text-sm mt-0.5">
              {event.type === 'paid' ? `Bookings · LKR ${event.ticketPrice}` : 'Attendees'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Stats */}
        <div className="px-6 py-4 border-b border-gray-100 grid grid-cols-3 gap-4">
          {[
            { label: 'Total seats', value: event.totalSeats || 0, color: 'text-gray-800' },
            { label: event.type === 'paid' ? 'Reserved' : 'Attending', value: reserved.length, color: 'text-amber-600' },
            { label: 'Collected', value: collected.length, color: 'text-green-600' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-gray-400 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Uncollected filter toggle (paid only) */}
        {event.type === 'paid' && (
          <div className="px-6 pt-4 pb-2 flex items-center gap-3">
            <button
              onClick={() => setShowUncollected(!showUncollected)}
              className={`px-4 py-1.5 rounded-xl text-xs font-medium border transition
                ${showUncollected
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-amber-400'
                }`}
            >
              {showUncollected ? '✓ Uncollected only' : 'Show uncollected only'}
            </button>
            {showUncollected && (
              <span className="text-amber-600 text-xs font-medium">
                {reserved.length} uncollected
              </span>
            )}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm">No bookings found.</p>
            </div>
          ) : (
            filtered.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-xs flex-shrink-0">
                    {booking.userName?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-800 text-sm font-medium truncate">
                      {booking.userName}
                    </p>
                    <p className="text-gray-400 text-xs truncate">
                      {booking.userEmail} · {formatBookedAt(booking.bookedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusColors[booking.status] || 'bg-gray-100 text-gray-500'}`}>
                    {booking.status}
                  </span>
                  {booking.status === 'reserved' && event.type === 'paid' && (
                    <button
                      onClick={() => handleMarkCollected(booking)}
                      disabled={markingId === booking.id}
                      className="text-xs text-green-700 font-medium hover:underline disabled:opacity-50"
                    >
                      {markingId === booking.id ? '...' : 'Mark collected'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// Event Card

function EventCard({ event, onEdit, onDelete, onViewBookings }) {
  const percentBooked = event.totalSeats > 0
    ? ((event.bookedSeats || 0) / event.totalSeats) * 100
    : 0
  const seatsLeft = (event.totalSeats || 0) - (event.bookedSeats || 0)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      {event.flyerUrl ? (
        <img
          src={event.flyerUrl}
          alt={event.title}
          className="w-full h-40 object-cover"
          onError={(e) => e.target.style.display = 'none'}
        />
      ) : (
        <div className="w-full h-40 bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
          <span className="text-green-300 text-4xl">◈</span>
        </div>
      )}

      <div className="px-5 py-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-gray-800 font-semibold text-sm leading-snug">{event.title}</h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0
            ${event.type === 'paid' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
            {event.type === 'paid' ? `LKR ${event.ticketPrice}` : 'Free'}
          </span>
        </div>

        {event.description && (
          <p className="text-gray-400 text-xs leading-relaxed mb-3 line-clamp-2">
            {event.description}
          </p>
        )}

        <div className="space-y-1 mb-3">
          <p className="text-gray-400 text-xs">◷ {formatDate(event.date)}</p>
          <p className="text-gray-400 text-xs">◎ {event.venue}</p>
        </div>

        {/* Seats progress bar — both free and paid */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">
              <span className="font-semibold text-gray-800">{event.bookedSeats || 0}</span>
              /{event.totalSeats} {event.type === 'paid' ? 'booked' : 'attending'}
            </span>
            <span className="text-gray-400">{seatsLeft} left</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-500
                ${percentBooked >= 100 ? 'bg-red-500'
                  : percentBooked >= 80 ? 'bg-amber-500'
                  : 'bg-green-500'}`}
              style={{ width: `${Math.min(percentBooked, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-auto pt-3 border-t border-gray-100">
          <button
            onClick={() => onViewBookings(event)}
            className="text-xs text-green-700 font-medium hover:underline"
          >
            {event.type === 'paid' ? 'Bookings' : 'Attendees'}
          </button>
          <button
            onClick={() => onEdit(event)}
            className="text-xs text-blue-600 font-medium hover:underline"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(event)}
            className="text-xs text-red-500 font-medium hover:underline"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// Main Page

export default function Events() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [deletingEvent, setDeletingEvent] = useState(null)
  const [viewingBookings, setViewingBookings] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const handleAdd = async (data) => {
    await addDoc(collection(db, 'events'), {
      ...data,
      createdAt: Timestamp.now(),
    })
  }

  const handleEdit = async (data) => {
    await updateDoc(doc(db, 'events', editingEvent.id), data)
  }

  const handleDelete = async () => {
    await deleteDoc(doc(db, 'events', deletingEvent.id))
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Events</h1>
          <p className="text-gray-400 text-sm mt-1">
            Create and manage events for all students.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          + Create Event
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="h-40 bg-gray-100 animate-pulse" />
              <div className="px-5 py-4 space-y-3">
                <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">◈</p>
          <p className="text-sm mb-4">No events yet.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-green-800 transition"
          >
            Create your first event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onEdit={setEditingEvent}
              onDelete={setDeletingEvent}
              onViewBookings={setViewingBookings}
            />
          ))}
        </div>
      )}

      {showAddModal && (
        <EventModal onClose={() => setShowAddModal(false)} onSave={handleAdd} />
      )}
      {editingEvent && (
        <EventModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={handleEdit}
        />
      )}
      {deletingEvent && (
        <DeleteConfirmModal
          event={deletingEvent}
          onClose={() => setDeletingEvent(null)}
          onConfirm={handleDelete}
        />
      )}
      {viewingBookings && (
        <BookingsPanel
          event={viewingBookings}
          onClose={() => setViewingBookings(null)}
        />
      )}
    </div>
  )
}