import { describe, it, expect } from 'vitest'

describe('fake-indexeddb', () => {
  it('provides a working IndexedDB in the test environment', async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('test-db', 1)
      req.onupgradeneeded = () => req.result.createObjectStore('kv')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const tx = db.transaction('kv', 'readwrite')
    tx.objectStore('kv').put('world', 'hello')
    await new Promise<void>((r) => { tx.oncomplete = () => r() })

    const tx2 = db.transaction('kv', 'readonly')
    const val = await new Promise<string>((resolve, reject) => {
      const req = tx2.objectStore('kv').get('hello')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    expect(val).toBe('world')
    db.close()
  })
})
