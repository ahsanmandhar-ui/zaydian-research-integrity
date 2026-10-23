import Dexie, { type Table } from 'dexie'

export interface Project {
  id?: number
  name: string
  createdAt: number
}

export class ZriDatabase extends Dexie {
  projects!: Table<Project, number>

  constructor() {
    super('zri')
    this.version(1).stores({
      projects: '++id, name, createdAt',
    })
  }
}

export const db = new ZriDatabase()
