import { db } from './db'

const studies = [
 { studyId:'ZRF-2026-001', title:'Evaluating Left Ventricular Strain in Post-MI Patients', primaryDepartment:'Cardiology', collaboratingDepartments:'Radiology', firstAuthor:'Dr. Aliza Khan', currentPhase:'Active Data Collection', synopsisStatus:'Accepted', manuscriptStructure:'Full Article', submissionStatus:'Not Submitted', targetVenue:'European Heart Journal', presentationType:'Not Applicable' },
 { studyId:'ZRF-2026-002', title:'Biomarkers of Neuroinflammation in Acute Ischemic Stroke', primaryDepartment:'Neurology', collaboratingDepartments:'Internal Medicine', firstAuthor:'Dr. Tariq Mahmood', currentPhase:'Statistical Analysis', synopsisStatus:'Accepted', manuscriptStructure:'Full Article', submissionStatus:'Submitted - Under Review', abstractSubmissionDate:'2026-02-14', fullTextSubmissionDate:'2026-05-12', targetVenue:'Stroke Journal', presentationType:'Not Applicable' },
 { studyId:'ZRF-2026-003', title:'Immunotherapy Outcomes in Advanced Non-Small Cell Lung Cancer', primaryDepartment:'Oncology', collaboratingDepartments:'Surgery', firstAuthor:'Dr. Zainab Bibi', currentPhase:'Manuscript Writing', synopsisStatus:'Accepted', manuscriptStructure:'Full Article', submissionStatus:'Not Submitted', targetVenue:'Journal of Clinical Oncology', presentationType:'Not Applicable' },
 { studyId:'ZRF-2026-004', title:'Pediatric Bronchiolitis Management Pathways in Tertiary Care', primaryDepartment:'Pediatrics', collaboratingDepartments:'Public Health', firstAuthor:'Dr. Hamza Malik', currentPhase:'Synopsis Under Review', synopsisStatus:'Revisions Requested', manuscriptStructure:'Abstract Only', submissionStatus:'Not Submitted', targetVenue:'Pediatric Academic Societies Conference', presentationType:'Poster Presentation' },
 { studyId:'ZRF-2026-005', title:'Novel Surgical Techniques in Minimally Invasive Cholecystectomy', primaryDepartment:'Surgery', collaboratingDepartments:'Radiology', firstAuthor:'Dr. Sara Ahmed', currentPhase:'Idea Stage', synopsisStatus:'Under Review', manuscriptStructure:'Both Abstract & Full Article', submissionStatus:'Not Submitted', targetVenue:'Annals of Surgery', presentationType:'Not Applicable' },
 { studyId:'ZRF-2026-006', title:'Prevalence of Metabolic Syndrome in Urban Cohorts', primaryDepartment:'Internal Medicine', collaboratingDepartments:'Public Health', firstAuthor:'Dr. Omar Farooq', currentPhase:'Active Data Collection', synopsisStatus:'Accepted', manuscriptStructure:'Full Article', submissionStatus:'Not Submitted', targetVenue:'Diabetes Care', presentationType:'Not Applicable' },
 { studyId:'ZRF-2026-007', title:'AI-Assisted Diagnostic Accuracy in Chest Radiography', primaryDepartment:'Radiology', collaboratingDepartments:'Internal Medicine', firstAuthor:'Dr. Ayesha Siddiqui', currentPhase:'Submitted - Pending Decision', synopsisStatus:'Accepted', manuscriptStructure:'Full Article', submissionStatus:'Accepted for Presentation', abstractSubmissionDate:'2026-01-20', fullTextSubmissionDate:'2026-04-18', targetVenue:'RSNA Annual Meeting', presentationType:'Oral Presentation' },
 { studyId:'ZRF-2026-008', title:'Post-Surgical Delirium Risk Factors in Elderly Populations', primaryDepartment:'Surgery', collaboratingDepartments:'Neurology', firstAuthor:'Dr. Bilal Hassan', currentPhase:'Manuscript Writing', synopsisStatus:'Accepted', manuscriptStructure:'Full Article', submissionStatus:'Selected for Journal Publication', abstractSubmissionDate:'2025-12-10', fullTextSubmissionDate:'2026-03-10', targetVenue:'British Journal of Anaesthesia', presentationType:'Moderated Poster' },
 { studyId:'ZRF-2026-009', title:'Long-term Efficacy of Direct Oral Anticoagulants in Atrial Fibrillation', primaryDepartment:'Cardiology', collaboratingDepartments:'Internal Medicine', firstAuthor:'Dr. Usman Ghani', currentPhase:'Active Data Collection', synopsisStatus:'Accepted', manuscriptStructure:'Full Article', submissionStatus:'Not Submitted', targetVenue:'Journal of the American College of Cardiology', presentationType:'Not Applicable' },
 { studyId:'ZRF-2026-010', title:'Epilepsy Surgery Outcomes in Pediatric Drug-Resistant Cases', primaryDepartment:'Neurology', collaboratingDepartments:'Pediatrics', firstAuthor:'Dr. Rabia Basri', currentPhase:'Statistical Analysis', synopsisStatus:'Accepted', manuscriptStructure:'Full Article', submissionStatus:'Submitted - Under Review', abstractSubmissionDate:'2026-03-01', fullTextSubmissionDate:'2026-06-01', targetVenue:'Epilepsia', presentationType:'Not Applicable' },
 { studyId:'ZRF-2026-011', title:'Prognostic Value of Liquid Biopsy in Colorectal Cancer', primaryDepartment:'Oncology', collaboratingDepartments:'Pathology', firstAuthor:'Dr. Kamran Akmal', currentPhase:'Manuscript Writing', synopsisStatus:'Accepted', manuscriptStructure:'Full Article', submissionStatus:'Not Submitted', targetVenue:'Clinical Cancer Research', presentationType:'Not Applicable' },
 { studyId:'ZRF-2026-012', title:'Neonatal Sepsis Microbiological Profiles in Level III NICU', primaryDepartment:'Pediatrics', collaboratingDepartments:'Microbiology', firstAuthor:'Dr. Sanaullah Khan', currentPhase:'Active Data Collection', synopsisStatus:'Accepted', manuscriptStructure:'Abstract Only', submissionStatus:'Accepted for Presentation', abstractSubmissionDate:'2026-02-10', fullTextSubmissionDate:'2026-04-05', targetVenue:'World Pediatric Congress', presentationType:'Oral Presentation' },
]

const publishedRecords = [
 { studyId:'ZRF-2025-014', title:'Cardiovascular Outcomes in Post-Viral Myocarditis Syndromes', firstAuthor:'Dr. Aliza Khan', primaryDepartment:'Cardiology', collaboratingDepartments:'Internal Medicine', journal:'PubMed Indexed Cardiology Journal', publicationDate:'2025-11-20', doi:'https://doi.org/10.1016/j.cardio.2025.11.004', takeaway:'Post-viral myocarditis shows favorable long-term ventricular recovery when managed with early beta-blocker therapy.' },
 { studyId:'ZRF-2025-019', title:'Efficacy of Endovascular Thrombectomy Beyond 24 Hours in Stroke', firstAuthor:'Dr. Tariq Mahmood', primaryDepartment:'Neurology', collaboratingDepartments:'Surgery', journal:'Scopus Indexed Stroke Review', publicationDate:'2025-12-15', doi:'https://doi.org/10.1161/STROKEAHA.125.039201', takeaway:'Selected patient selection using automated perfusion imaging significantly expands the therapeutic window for thrombectomy.' },
 { studyId:'ZRF-2025-022', title:'Targeted Therapy Protocols in EGFR-Mutant Lung Adenocarcinoma', firstAuthor:'Dr. Zainab Bibi', primaryDepartment:'Oncology', collaboratingDepartments:'Pathology', journal:'WoS Indexed Oncology Quarterly', publicationDate:'2026-01-10', doi:'https://doi.org/10.1200/JCO.25.01842', takeaway:'Third-generation EGFR inhibitors demonstrated superior intracranial progression-free survival in metastatic cohorts.' },
 { studyId:'ZRF-2025-028', title:'Minimally Invasive Spine Surgery vs Open Decompression: A 5-Year Review', firstAuthor:'Dr. Asim Jamil', primaryDepartment:'Orthopedics', collaboratingDepartments:'Surgery', journal:'PubMed Indexed Spine Journal', publicationDate:'2025-10-05', doi:'https://doi.org/10.1097/BRS.0000000000004120', takeaway:'Minimally invasive approaches result in shorter hospital stay and reduced postoperative opioid consumption without compromising fusion rates.' },
]
export async function seedDemoData(adminId: number): Promise<void> {
  const count = await db.projects.count()
  if (count > 0) return
  const now = Date.now()
  const projectId = await db.projects.add({
    name: 'Demo Study',
    description: 'Seeded demo dataset for exploring features',
    ownerId: adminId,
    createdAt: now,
    updatedAt: now,
  })
  const vars = [
    { name: 'age', type: 'numeric' as const, order: 0 },
    { name: 'gender', type: 'string' as const, order: 1 },
    { name: 'score', type: 'numeric' as const, order: 2 },
    { name: 'phone', type: 'string' as const, order: 3 },
  ]
  for (const v of vars) {
    await db.variables.add({ projectId, name: v.name, type: v.type, order: v.order, createdAt: now, updatedAt: now })
  }
  const rows = [
    { age: 24, gender: 'F', score: 88 },
    { age: 31, gender: 'M', score: 72 },
    { age: 27, gender: 'F', score: 95 },
    { age: 40, gender: 'M', score: 60 },
    { age: 35, gender: 'F', score: 81 },
  ]
  for (let i = 0; i < rows.length; i++) {
    await db.records.add({ projectId, rowIndex: i, values: rows[i], createdAt: now, updatedAt: now })
  }
  await db.peers.add({ deviceId: 'demo-peer-1', publicKey: 'demo', pairedAt: now })
  await db.departmentDashboards.add({ department: 'Research', config: { widgets: [] }, createdAt: now, updatedAt: now })
  await db.publishedItems.add({ projectId, versionId: 0, publishedBy: adminId, publishedAt: now })
  for (const s of studies) {
    await db.studies.add({ ...s, createdAt: now, updatedAt: now })
  }
  for (const r of publishedRecords) {
    await db.publishedRecords.add({ ...r, createdAt: now, updatedAt: now })
  }
}
