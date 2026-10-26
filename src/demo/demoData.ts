import { db } from '../db'
import { createVariable } from '../dataset/variables'
import { createRecord } from '../dataset/records'

export async function seedDemoData(ownerId: number): Promise<number> {
  const projectId = await db.projects.add({
    name: 'Cardi Demo',
    description: 'Detailed cardi dataset for analytics testing',
    ownerId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  await createVariable({ projectId, name: 'age', type: 'numeric', order: 0 })
  await createVariable({ projectId, name: 'sex', type: 'string', order: 1 })
  await createVariable({ projectId, name: 'bp', type: 'numeric', order: 2 })
  await createVariable({ projectId, name: 'cholesterol', type: 'numeric', order: 3 })
  await createVariable({ projectId, name: 'outcome', type: 'string', order: 4 })
  await createVariable({ projectId, name: 'visitDate', type: 'date', order: 5 })
  await createVariable({ projectId, name: 'followUp', type: 'boolean', order: 6 })
  await createVariable({ projectId, name: 'email', type: 'string', order: 7 })
  const rows = [
    { age: 45, sex: 'M', bp: 120, cholesterol: 200, outcome: 'normal', visitDate: '2025-01-10', followUp: true, email: 'a1@example.com' },
    { age: 52, sex: 'F', bp: 135, cholesterol: 240, outcome: 'high', visitDate: '2025-01-12', followUp: false, email: 'a2@example.com' },
    { age: 38, sex: 'M', bp: 118, cholesterol: 190, outcome: 'normal', visitDate: '2025-01-15', followUp: true, email: 'a3@example.com' },
    { age: 60, sex: 'F', bp: 150, cholesterol: 260, outcome: 'high', visitDate: '2025-01-18', followUp: true, email: 'a4@example.com' },
    { age: 47, sex: 'M', bp: 125, cholesterol: 210, outcome: 'normal', visitDate: '2025-01-20', followUp: false, email: 'a5@example.com' },
    { age: 55, sex: 'F', bp: 140, cholesterol: 230, outcome: 'high', visitDate: '2025-01-22', followUp: true, email: 'a6@example.com' },
    { age: 41, sex: 'M', bp: 122, cholesterol: 195, outcome: 'normal', visitDate: '2025-01-25', followUp: false, email: 'a7@example.com' },
    { age: 63, sex: 'F', bp: 160, cholesterol: 280, outcome: 'high', visitDate: '2025-01-28', followUp: true, email: 'a8@example.com' },
    { age: 36, sex: 'M', bp: 115, cholesterol: 185, outcome: 'normal', visitDate: '2025-02-01', followUp: false, email: 'a9@example.com' },
    { age: 58, sex: 'F', bp: 145, cholesterol: 250, outcome: 'high', visitDate: '2025-02-03', followUp: true, email: 'a10@example.com' },
    { age: 50, sex: 'M', bp: 130, cholesterol: 215, outcome: 'normal', visitDate: '2025-02-05', followUp: false, email: 'a11@example.com' },
    { age: 44, sex: 'F', bp: 128, cholesterol: 205, outcome: 'normal', visitDate: '2025-02-08', followUp: true, email: 'a12@example.com' },
    { age: 61, sex: 'M', bp: 155, cholesterol: 270, outcome: 'high', visitDate: '2025-02-10', followUp: false, email: 'a13@example.com' },
    { age: 39, sex: 'F', bp: 119, cholesterol: 192, outcome: 'normal', visitDate: '2025-02-12', followUp: true, email: 'a14@example.com' },
    { age: 57, sex: 'M', bp: 142, cholesterol: 235, outcome: 'high', visitDate: '2025-02-15', followUp: false, email: 'a15@example.com' },
    { age: 48, sex: 'F', bp: 126, cholesterol: 212, outcome: 'normal', visitDate: '2025-02-18', followUp: true, email: 'a16@example.com' },
    { age: 62, sex: 'M', bp: 162, cholesterol: 285, outcome: 'high', visitDate: '2025-02-20', followUp: true, email: 'a17@example.com' },
    { age: 40, sex: 'F', bp: 121, cholesterol: 198, outcome: 'normal', visitDate: '2025-02-22', followUp: false, email: 'a18@example.com' },
    { age: 53, sex: 'M', bp: 136, cholesterol: 242, outcome: 'high', visitDate: '2025-02-25', followUp: true, email: 'a19@example.com' },
    { age: 49, sex: 'F', bp: 129, cholesterol: 218, outcome: 'normal', visitDate: '2025-02-28', followUp: false, email: 'a20@example.com' },
  ]
  for (let i = 0; i < rows.length; i++) {
    await createRecord(projectId, rows[i])
  }
  return projectId
}

export async function removeDemoData(projectId: number): Promise<void> {
  await db.records.where('projectId').equals(projectId).delete()
  await db.variables.where('projectId').equals(projectId).delete()
  await db.projects.delete(projectId)
}
