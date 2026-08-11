import PocketBase from 'pocketbase'

const pbUrl = import.meta.env.VITE_POCKETBASE_URL || 'http://10.0.0.179:8070'
export const pb = new PocketBase(pbUrl)
