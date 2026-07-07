const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

const sourceApp = initializeApp({ projectId: 'ctask-manager' }, 'source')
const sourceDb = getFirestore(sourceApp, 'restored-jun23')

const targetApp = initializeApp({ projectId: 'ctask-manager' }, 'target')
const targetDb = getFirestore(targetApp)

async function migrate() {
  console.log('Starting migration from restored-jun23 to default database...')

  const sourceRef = sourceDb.collection('chats').doc('aneesh_tina').collection('messages')
  const sourceSnap = await sourceRef.get()
  console.log(`Jun 23 backup: ${sourceSnap.docs.length} messages`)

  const targetRef = targetDb.collection('chats').doc('aneesh_tina').collection('messages')
  const targetSnap = await targetRef.get()
  const existingIds = new Set(targetSnap.docs.map(d => d.id))
  console.log(`Current DB: ${existingIds.size} messages`)

  const toRecover = sourceSnap.docs.filter(d => !existingIds.has(d.id))
  console.log(`Recovering: ${toRecover.length} messages`)

  if (toRecover.length === 0) {
    console.log('No messages to recover!')
    return
  }

  let batch = targetDb.batch(), count = 0, total = 0
  for (const doc of toRecover) {
    batch.set(targetRef.doc(doc.id), doc.data())
    count++
    total++
    if (count >= 500) {
      await batch.commit()
      console.log(`Progress: ${total}/${toRecover.length}`)
      batch = targetDb.batch()
      count = 0
    }
  }
  if (count > 0) await batch.commit()

  console.log(`Done! Recovered ${total} messages.`)
  console.log(`Total messages now: ${existingIds.size + total}`)
}

migrate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
