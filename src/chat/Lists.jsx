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

function Lists({ currentUser, chatId }) {
  const [lists, setLists] = useState([])
  const [items, setItems] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeList, setActiveList] = useState(null)
  const [newListTitle, setNewListTitle] = useState('')
  const [newItemText, setNewItemText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const listsRef = collection(db, 'chats', chatId, 'lists')
    const q = query(listsRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setLists(listData)
      setLoading(false)
    })

    return unsubscribe
  }, [chatId])

  useEffect(() => {
    if (!activeList) return

    const itemsRef = collection(db, 'chats', chatId, 'lists', activeList.id, 'items')
    const q = query(itemsRef, orderBy('completed'), orderBy('createdAt'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itemData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setItems((prev) => ({ ...prev, [activeList.id]: itemData }))
    })

    return unsubscribe
  }, [chatId, activeList?.id])

  const handleCreateList = async (e) => {
    e.preventDefault()
    const trimmed = newListTitle.trim()
    if (!trimmed || trimmed.length > 200) return

    setSaving(true)
    try {
      await addDoc(collection(db, 'chats', chatId, 'lists'), {
        title: trimmed,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setNewListTitle('')
    } catch (err) {
      console.error('Error creating list:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteList = async (listId) => {
    if (!window.confirm('Delete this list?')) return
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'lists', listId))
      if (activeList?.id === listId) setActiveList(null)
    } catch (err) {
      console.error('Error deleting list:', err)
    }
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!activeList) return
    const trimmed = newItemText.trim()
    if (!trimmed || trimmed.length > 500) return

    setSaving(true)
    try {
      await addDoc(collection(db, 'chats', chatId, 'lists', activeList.id, 'items'), {
        text: trimmed,
        completed: false,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setNewItemText('')
    } catch (err) {
      console.error('Error adding item:', err)
    } finally {
      setSaving(false)
    }
  }

  const toggleItem = async (item) => {
    if (!activeList) return
    try {
      await updateDoc(doc(db, 'chats', chatId, 'lists', activeList.id, 'items', item.id), {
        completed: !item.completed,
        updatedAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('Error toggling item:', err)
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (!activeList) return
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'lists', activeList.id, 'items', itemId))
    } catch (err) {
      console.error('Error deleting item:', err)
    }
  }

  if (loading) {
    return <div className="lists-container loading">Loading...</div>
  }

  if (activeList) {
    const listItems = items[activeList.id] || []
    return (
      <div className="lists-container">
        <div className="lists-header">
          <button className="back-btn" onClick={() => setActiveList(null)}>
            ←
          </button>
          <h2>{activeList.title}</h2>
        </div>

        <form className="add-item-form" onSubmit={handleAddItem}>
          <input
            type="text"
            placeholder="Add item..."
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            maxLength={500}
            className="item-input"
          />
          <button type="submit" disabled={saving || !newItemText.trim()}>
            +
          </button>
        </form>

        {listItems.length === 0 ? (
          <div className="no-items">No items yet</div>
        ) : (
          <div className="items-list">
            {listItems.map((item) => (
              <div key={item.id} className={`list-item ${item.completed ? 'completed' : ''}`}>
                <button className="item-checkbox" onClick={() => toggleItem(item)}>
                  {item.completed ? '✓' : '○'}
                </button>
                <span className="item-text">{item.text}</span>
                <button className="item-delete" onClick={() => handleDeleteItem(item.id)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="lists-container">
      <div className="lists-header">
        <h2>Shared Lists</h2>
      </div>

      <form className="add-list-form" onSubmit={handleCreateList}>
        <input
          type="text"
          placeholder="New list name..."
          value={newListTitle}
          onChange={(e) => setNewListTitle(e.target.value)}
          maxLength={200}
          className="list-input"
        />
        <button type="submit" disabled={saving || !newListTitle.trim()}>
          +
        </button>
      </form>

      {lists.length === 0 ? (
        <div className="no-lists">No lists yet</div>
      ) : (
        <div className="lists-grid">
          {lists.map((list) => (
            <div key={list.id} className="list-card" onClick={() => setActiveList(list)}>
              <span className="list-title">{list.title}</span>
              <button
                className="list-delete"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteList(list.id)
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Lists
