import { useState, useEffect } from 'react'
import { db } from '../firebase/firebaseConfig'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
} from 'firebase/firestore'

function Devices({ currentUser }) {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDeviceId, setCurrentDeviceId] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('currentDeviceId')
    if (stored) {
      setCurrentDeviceId(stored)
    }
  }, [])

  useEffect(() => {
    if (!currentUser) return

    const q = query(
      collection(db, 'users', currentUser.uid, 'devices'),
      orderBy('lastSeenAt', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const devs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        lastSeenAt: d.data().lastSeenAt?.toDate?.() || null,
        createdAt: d.data().createdAt?.toDate?.() || null,
      }))
      setDevices(devs)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [currentUser])

  const handleRemoveDevice = async (deviceId) => {
    if (!confirm('Remove this device? It will need to re-register for notifications.')) {
      return
    }
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'devices', deviceId))
    } catch (err) {
      console.error('Error removing device:', err)
      alert('Failed to remove device')
    }
  }

  const formatDate = (date) => {
    if (!date) return 'Unknown'
    return date.toLocaleString()
  }

  const getTimeSince = (date) => {
    if (!date) return ''
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  if (loading) {
    return <div className="devices-container"><p>Loading devices...</p></div>
  }

  return (
    <div className="devices-container">
      <h2>Your Devices</h2>
      <p className="devices-note">
        Devices registered for push notifications. Remove old devices to stop receiving notifications on them.
      </p>

      {devices.length === 0 ? (
        <p className="devices-empty">No devices registered yet. Enable notifications to register this device.</p>
      ) : (
        <ul className="devices-list">
          {devices.map((device) => (
            <li key={device.id} className={`device-item ${device.id === currentDeviceId ? 'current' : ''}`}>
              <div className="device-info">
                <div className="device-header">
                  <span className="device-label">{device.label}</span>
                  {device.id === currentDeviceId && (
                    <span className="device-current-badge">This device</span>
                  )}
                </div>
                <div className="device-meta">
                  <span className="device-platform">{device.platform}</span>
                  <span className="device-separator">·</span>
                  <span className="device-last-seen" title={formatDate(device.lastSeenAt)}>
                    Last seen: {getTimeSince(device.lastSeenAt)}
                  </span>
                </div>
              </div>
              <button
                className="device-remove-btn"
                onClick={() => handleRemoveDevice(device.id)}
                title="Remove device"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Devices
