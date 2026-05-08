import { useState, useEffect } from 'react'
import { db } from '../firebase/firebaseConfig'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'

const CATEGORY_OPTIONS = [
  { value: 'emergency', label: 'Emergency' },
  { value: 'health', label: 'Health' },
  { value: 'home', label: 'Home' },
  { value: 'travel', label: 'Travel' },
  { value: 'school', label: 'School' },
  { value: 'finance', label: 'Finance' },
  { value: 'other', label: 'Other' },
]

function Vault({ currentUser, chatId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('other')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const vaultRef = collection(db, 'chats', chatId, 'vaultItems')
    const q = query(vaultRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itemList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setItems(itemList)
      setLoading(false)
    })

    return unsubscribe
  }, [chatId])

  const resetForm = () => {
    setTitle('')
    setCategory('other')
    setBody('')
    setEditingId(null)
    setShowForm(false)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmedTitle = title.trim()
    const trimmedBody = body.trim()

    if (!trimmedTitle) {
      setError('Title is required')
      return
    }
    if (trimmedTitle.length > 200) {
      setError('Title must be 200 characters or less')
      return
    }
    if (trimmedBody.length > 10000) {
      setError('Content must be 10000 characters or less')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (editingId) {
        await updateDoc(doc(db, 'chats', chatId, 'vaultItems', editingId), {
          title: trimmedTitle,
          category,
          body: trimmedBody,
          updatedBy: currentUser.uid,
          updatedAt: serverTimestamp(),
        })
      } else {
        await addDoc(collection(db, 'chats', chatId, 'vaultItems'), {
          title: trimmedTitle,
          category,
          body: trimmedBody,
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
      resetForm()
    } catch (err) {
      console.error('Error saving vault item:', err)
      setError('Failed to save item')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item) => {
    setTitle(item.title)
    setCategory(item.category || 'other')
    setBody(item.body || '')
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleDelete = async (itemId) => {
    if (!window.confirm('Delete this item?')) return
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'vaultItems', itemId))
    } catch (err) {
      console.error('Error deleting vault item:', err)
    }
  }

  const getCategoryLabel = (cat) => {
    const found = CATEGORY_OPTIONS.find((c) => c.value === cat)
    return found ? found.label : cat
  }

  const filteredItems = items.filter((item) => {
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.body && item.body.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  if (loading) {
    return <div className="vault-container loading">Loading vault...</div>
  }

  return (
    <div className="vault-container">
      <div className="vault-header">
        <h2>Important Info Vault</h2>
        <button
          className="add-vault-btn"
          onClick={() => {
            if (showForm) resetForm()
            else setShowForm(true)
          }}
        >
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      <div className="vault-notice">
        Do not store passwords or highly sensitive data here.
      </div>

      {showForm && (
        <form className="vault-form" onSubmit={handleSubmit}>
          {error && <div className="vault-error">{error}</div>}
          <input
            type="text"
            placeholder="Title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="vault-input"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="vault-select"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Details..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={10000}
            className="vault-textarea"
            rows={5}
          />
          <button type="submit" disabled={saving} className="vault-submit">
            {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
          </button>
        </form>
      )}

      <div className="vault-filters">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="vault-search"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="vault-filter-select"
        >
          <option value="all">All Categories</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {filteredItems.length === 0 ? (
        <div className="no-vault-items">
          {items.length === 0 ? 'No items in vault yet' : 'No items match your filters'}
        </div>
      ) : (
        <div className="vault-list">
          {filteredItems.map((item) => (
            <div key={item.id} className="vault-item">
              <div className="vault-item-header">
                <div className="vault-item-title">{item.title}</div>
                <span className={`vault-category-badge ${item.category}`}>
                  {getCategoryLabel(item.category)}
                </span>
              </div>
              {item.body && <div className="vault-item-body">{item.body}</div>}
              <div className="vault-item-actions">
                <button className="vault-edit" onClick={() => handleEdit(item)}>
                  Edit
                </button>
                <button className="vault-delete" onClick={() => handleDelete(item.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Vault
