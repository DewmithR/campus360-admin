import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

function Badge({ status }) {
  return status === 'replied' ? (
    <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
      Replied
    </span>
  ) : (
    <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">
      Pending
    </span>
  )
}

function FeedbackCard({ item, onReply }) {
  const [replyText, setReplyText] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmitReply = async () => {
    if (!replyText.trim()) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'feedbacks', item.id), {
        reply: replyText.trim(),
        repliedAt: new Date(),
        status: 'replied',
      })
      setOpen(false)
      setReplyText('')
      onReply()
    } catch (err) {
      console.error('Error saving reply:', err)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5">
      {/* Top row */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm flex-shrink-0">
            {item.isAnonymous ? '?' : (item.name?.charAt(0).toUpperCase() || '?')}
          </div>
          <div className="min-w-0">
            <p className="text-gray-800 text-sm font-medium truncate">
              {item.isAnonymous ? 'Anonymous' : (item.name || 'Unknown')}
            </p>
            <p className="text-gray-400 text-xs">
              {item.isAnonymous ? '' : item.email} · {formatDate(item.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {item.category && (
            <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">
              {item.category}
            </span>
          )}
          <Badge status={item.status} />
        </div>
      </div>

      {/* Message */}
      <p className="text-gray-700 text-sm leading-relaxed mb-4">{item.message}</p>

      {/* Existing reply */}
      {item.reply && (
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-4">
          <p className="text-green-700 text-xs font-semibold mb-1">Admin reply</p>
          <p className="text-green-800 text-sm leading-relaxed">{item.reply}</p>
        </div>
      )}

      {/* Reply input */}
      {open && (
        <div className="mt-3 space-y-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setOpen(false); setReplyText('') }}
              className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitReply}
              disabled={saving || !replyText.trim()}
              className="px-4 py-2 rounded-xl text-sm bg-green-700 text-white font-medium hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Send reply'}
            </button>
          </div>
        </div>
      )}

      {/* Action button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-green-700 font-medium hover:underline"
        >
          {item.reply ? 'Edit reply' : 'Reply'}
        </button>
      )}
    </div>
  )
}

export default function Feedback() {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const q = query(
      collection(db, 'feedbacks'),
      orderBy('createdAt', sort === 'newest' ? 'desc' : 'asc')
    )
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      setFeedback(items)
      setLoading(false)
    })
    return () => unsub()
  }, [sort, refreshKey])

  const filtered = feedback.filter((item) => {
    if (filter === 'pending') return item.status === 'pending'
    if (filter === 'replied') return item.status === 'replied'
    return true
  })

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Feedback</h1>
        <p className="text-gray-400 text-sm mt-1">
          View and respond to feedback submitted by students.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {['all', 'pending', 'replied'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium transition capitalize
                ${filter === f
                  ? 'bg-green-700 text-white'
                  : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
              {f}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <span className="ml-auto text-sm text-gray-400">
          {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 px-6 py-5 space-y-3">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/4" />
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">✉</p>
          <p className="text-sm">No feedback found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <FeedbackCard
              key={item.id}
              item={item}
              onReply={() => setRefreshKey((k) => k + 1)}
            />
          ))}
        </div>
      )}
    </div>
  )
}