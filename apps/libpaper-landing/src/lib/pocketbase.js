import PocketBase from 'pocketbase'

const pbUrl = import.meta.env.VITE_POCKETBASE_URL || '/pb'
export const pb = new PocketBase(pbUrl)
