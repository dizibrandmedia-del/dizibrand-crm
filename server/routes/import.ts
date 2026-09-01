import { Router } from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { db } from '../db/database.js';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { calculateLeadScore } from './leads.js';

export const importRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB limit

// In-memory cache for pending import previews before commit (keyed by preview_id)
const pendingImports = new Map<string, {
  fileName: string;
  sourceId: number;
  sourceCampaign?: string;
  validRecords: any[];
  batchId: string;
  summary: any;
}>();

// Helper to normalize phone numbers
function cleanPhone(phone: any): string {
  if (!phone) return '';
  return String(phone).replace(/[^0-9]/g, '').slice(-10);
}

// Generate unique batch ID e.g. MCA-01SEP2026-BATCH-001
function generateBatchId(sourceCode: string = 'MCA'): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const mon = monthNames[now.getMonth()];
  const year = now.getFullYear();

  const countRow = db.prepare("SELECT COUNT(*) as count FROM import_batches WHERE batch_id LIKE ?").get(`${sourceCode}-${day}${mon}${year}-BATCH-%`) as { count: number };
  const batchNum = String(countRow.count + 1).padStart(3, '0');
  return `${sourceCode}-${day}${mon}${year}-BATCH-${batchNum}`;
}

// 1. Dry Run / Import Preview (Parses XLSX/CSV, checks duplicates, returns preview breakdown)
importRouter.post('/preview', requireAdmin, upload.single('file'), (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { source_id = 1, source_campaign } = req.body;
    const sourceId = Number(source_id);

    const source = db.prepare('SELECT * FROM lead_sources WHERE id = ?').get(sourceId) as any;
    const sourceCode = source ? source.code : 'MCA';

    // Parse Excel / CSV buffer
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData: any[] = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    if (rawData.length === 0) {
      return res.status(400).json({ error: 'The uploaded file is empty or has no readable rows.' });
    }

    // Cache existing database records for ultra-fast in-memory duplicate lookups
    const existingCINs = new Set<string>();
    const existingMobiles = new Set<string>();
    const existingEmails = new Set<string>();
    const existingCompanyNames = new Set<string>();

    const allExisting = db.prepare('SELECT cin, mobile, alternate_mobile, email, company_name FROM leads').all() as any[];
    for (const lead of allExisting) {
      if (lead.cin) existingCINs.add(lead.cin.trim().toUpperCase());
      if (lead.mobile) existingMobiles.add(cleanPhone(lead.mobile));
      if (lead.alternate_mobile) existingMobiles.add(cleanPhone(lead.alternate_mobile));
      if (lead.email) existingEmails.add(lead.email.trim().toLowerCase());
      if (lead.company_name) existingCompanyNames.add(lead.company_name.trim().toLowerCase());
    }

    const validRecords: any[] = [];
    const duplicateRecords: any[] = [];
    const invalidRecords: any[] = [];
    let missingMobileCount = 0;
    let missingCompanyCount = 0;

    // Track within-batch duplicates
    const fileCINs = new Set<string>();
    const fileMobiles = new Set<string>();
    const fileEmails = new Set<string>();

    // Process each row
    rawData.forEach((row, index) => {
      const rowNum = index + 2; // header is line 1

      // Flexible column mapping (supports various MCA and general header names)
      const companyName = String(
        row['Company Name'] || row['company_name'] || row['CompanyName'] || row['COMPANY_NAME'] || row['Company'] || row['Business Name'] || ''
      ).trim();

      const cin = String(
        row['CIN'] || row['cin'] || row['Cin'] || row['Corporate Identification Number'] || ''
      ).trim();

      const contactPerson = String(
        row['Contact Person'] || row['contact_person'] || row['Director Name'] || row['DIRECTOR_NAME'] || row['Contact'] || row['Name'] || 'Director'
      ).trim();

      const designation = String(
        row['Designation'] || row['designation'] || row['DESIGNATION'] || row['Title'] || 'Director'
      ).trim();

      const mobile = String(
        row['Mobile'] || row['mobile'] || row['Phone'] || row['Contact Number'] || row['MOBILE'] || row['PHONE'] || ''
      ).trim();

      const alternateMobile = String(
        row['Alternate Mobile'] || row['alternate_mobile'] || row['Alt Phone'] || ''
      ).trim();

      const email = String(
        row['Email'] || row['email'] || row['EMAIL'] || row['Email Address'] || ''
      ).trim();

      const industry = String(
        row['Industry'] || row['industry'] || row['Activity Description'] || row['Sector'] || ''
      ).trim();

      const subIndustry = String(
        row['Sub Industry'] || row['sub_industry'] || ''
      ).trim();

      const companyType = String(
        row['Company Type'] || row['company_type'] || row['Class'] || ''
      ).trim();

      const incorporationDate = String(
        row['Incorporation Date'] || row['incorporation_date'] || row['DATE_OF_INCORPORATION'] || ''
      ).trim();

      const city = String(
        row['City'] || row['city'] || row['CITY'] || row['District'] || ''
      ).trim();

      const state = String(
        row['State'] || row['state'] || row['STATE'] || ''
      ).trim();

      const registeredAddress = String(
        row['Address'] || row['Registered Address'] || row['registered_address'] || row['ADDRESS'] || ''
      ).trim();

      const website = String(
        row['Website'] || row['website'] || row['URL'] || ''
      ).trim();

      const linkedin = String(
        row['LinkedIn'] || row['linkedin'] || ''
      ).trim();

      const priority = String(
        row['Priority'] || row['priority'] || 'MEDIUM'
      ).trim().toUpperCase();

      const validPriority = ['HOT', 'HIGH', 'MEDIUM', 'LOW'].includes(priority) ? priority : 'MEDIUM';

      // Validation Checks
      if (!companyName) {
        missingCompanyCount++;
        invalidRecords.push({ row: rowNum, reason: 'Missing Company Name', data: row });
        return;
      }

      const cleanMob = cleanPhone(mobile);
      if (!cleanMob || cleanMob.length < 10) {
        missingMobileCount++;
        invalidRecords.push({ row: rowNum, reason: 'Missing or Invalid Mobile Number (must have at least 10 digits)', data: row });
        return;
      }

      // Duplicate Checks
      const upperCin = cin ? cin.toUpperCase() : '';
      const lowerEmail = email ? email.toLowerCase() : '';
      const lowerCompany = companyName.toLowerCase();

      let isDuplicate = false;
      let duplicateReason = '';

      if (upperCin && (existingCINs.has(upperCin) || fileCINs.has(upperCin))) {
        isDuplicate = true;
        duplicateReason = `Duplicate CIN: ${cin}`;
      } else if (cleanMob && (existingMobiles.has(cleanMob) || fileMobiles.has(cleanMob))) {
        isDuplicate = true;
        duplicateReason = `Duplicate Mobile Number: ${cleanMob}`;
      } else if (lowerEmail && (existingEmails.has(lowerEmail) || fileEmails.has(lowerEmail))) {
        isDuplicate = true;
        duplicateReason = `Duplicate Email: ${email}`;
      }

      if (isDuplicate) {
        duplicateRecords.push({
          row: rowNum,
          companyName,
          cin,
          contactPerson,
          mobile: cleanMob,
          email,
          reason: duplicateReason,
        });
        return;
      }

      // Track for in-batch duplicates
      if (upperCin) fileCINs.add(upperCin);
      if (cleanMob) fileMobiles.add(cleanMob);
      if (lowerEmail) fileEmails.add(lowerEmail);

      const { score, band } = calculateLeadScore({
        industry,
        contact_person: contactPerson,
        designation,
        priority: validPriority,
      });

      validRecords.push({
        company_name: companyName,
        cin: cin || null,
        company_type: companyType || null,
        industry: industry || null,
        sub_industry: subIndustry || null,
        incorporation_date: incorporationDate || null,
        city: city || null,
        state: state || null,
        country: 'India',
        registered_address: registeredAddress || null,
        website: website || null,
        contact_person: contactPerson || 'Director',
        designation: designation || 'Director',
        mobile: cleanMob,
        alternate_mobile: cleanPhone(alternateMobile) || null,
        email: email || null,
        linkedin: linkedin || null,
        source_id: sourceId,
        source_campaign: source_campaign || null,
        priority: validPriority,
        lead_score: score,
        lead_score_band: band,
        remarks: 'Imported via Batch Import',
      });
    });

    const batchId = generateBatchId(sourceCode);
    const previewId = `prev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const summary = {
      totalRows: rawData.length,
      validCount: validRecords.length,
      duplicateCount: duplicateRecords.length,
      invalidCount: invalidRecords.length,
      missingMobileCount,
      missingCompanyCount,
      batchId,
      previewId,
      fileName: req.file.originalname,
      sampleValid: validRecords.slice(0, 10),
      sampleDuplicates: duplicateRecords.slice(0, 10),
      sampleInvalid: invalidRecords.slice(0, 10),
    };

    // Store in memory for commit
    pendingImports.set(previewId, {
      fileName: req.file.originalname,
      sourceId,
      sourceCampaign: source_campaign,
      validRecords,
      batchId,
      summary,
    });

    return res.json(summary);
  } catch (error: any) {
    console.error('Import preview error:', error);
    return res.status(500).json({ error: `Failed to process import preview: ${error.message}` });
  }
});

// 2. Commit Import (Commits valid records to DB in high-throughput transaction)
importRouter.post('/commit', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { preview_id, assign_consultant_id, internal_business_id } = req.body;
    if (!preview_id || !pendingImports.has(preview_id)) {
      return res.status(400).json({ error: 'Invalid or expired preview session. Please upload file again.' });
    }

    const pending = pendingImports.get(preview_id)!;
    const { validRecords, batchId, fileName, sourceId, summary } = pending;

    if (validRecords.length === 0) {
      return res.status(400).json({ error: 'No valid records to import.' });
    }

    const assignedConsultantId = assign_consultant_id ? Number(assign_consultant_id) : null;
    const internalBusinessId = internal_business_id ? Number(internal_business_id) : null;

    // Begin High-Speed Bulk Transaction
    db.exec('BEGIN TRANSACTION');

    try {
      // 1. Record Import Batch
      const insertBatchStmt = db.prepare(`
        INSERT INTO import_batches (
          batch_id, source_id, total_rows, valid_count, duplicate_count,
          invalid_count, missing_mobile_count, missing_company_count,
          imported_by_id, file_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const batchRes = insertBatchStmt.run(
        batchId,
        sourceId,
        summary.totalRows,
        summary.validCount,
        summary.duplicateCount,
        summary.invalidCount,
        summary.missingMobileCount,
        summary.missingCompanyCount,
        req.user!.id,
        fileName
      );

      // 2. Bulk Insert Leads
      const insertLeadStmt = db.prepare(`
        INSERT INTO leads (
          lead_id, company_name, cin, company_type, industry, sub_industry,
          incorporation_date, city, state, country, registered_address, website,
          contact_person, designation, mobile, alternate_mobile, email, linkedin,
          source_id, source_campaign, batch_id, assigned_consultant_id, internal_business_id,
          status, priority, lead_score, lead_score_band, original_consultant_id,
          remarks, created_by_id, last_activity_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, datetime('now')
        )
      `);

      const insertActivityStmt = db.prepare(`
        INSERT INTO lead_activities (lead_id, user_id, activity_type, title, description)
        VALUES (?, ?, 'CREATED', 'Lead Imported', ?)
      `);

      const year = new Date().getFullYear();
      let countRow = (db.prepare('SELECT COUNT(*) as count FROM leads').get() as { count: number }).count;

      for (const rec of validRecords) {
        countRow++;
        const leadIdCode = `LD-${year}-${String(countRow).padStart(5, '0')}`;
        const initialStatus = assignedConsultantId ? 'ASSIGNED' : 'NEW';

        const leadResult = insertLeadStmt.run(
          leadIdCode,
          rec.company_name,
          rec.cin,
          rec.company_type,
          rec.industry,
          rec.sub_industry,
          rec.incorporation_date,
          rec.city,
          rec.state,
          rec.country,
          rec.registered_address,
          rec.website,
          rec.contact_person,
          rec.designation,
          rec.mobile,
          rec.alternate_mobile,
          rec.email,
          rec.linkedin,
          rec.source_id,
          rec.source_campaign,
          batchId,
          assignedConsultantId,
          internalBusinessId,
          initialStatus,
          rec.priority,
          rec.lead_score,
          rec.lead_score_band,
          assignedConsultantId, // permanent original attribution
          rec.remarks,
          req.user!.id
        );

        insertActivityStmt.run(
          Number(leadResult.lastInsertRowid),
          req.user!.id,
          `Imported in Batch ${batchId} from ${fileName}`
        );
      }

      db.exec('COMMIT');

      // Clean up memory cache
      pendingImports.delete(preview_id);

      logAudit(req, 'IMPORT_BATCH_COMMITTED', 'import_batches', batchRes.lastInsertRowid, null, {
        batch_id: batchId,
        imported_leads: validRecords.length,
        assigned_to: assignedConsultantId,
      });

      return res.status(201).json({
        message: `Successfully imported ${validRecords.length} leads into database!`,
        batch_id: batchId,
        importedCount: validRecords.length,
      });
    } catch (txErr: any) {
      db.exec('ROLLBACK');
      console.error('Transaction failed during batch commit:', txErr);
      return res.status(500).json({ error: `Transaction failed: ${txErr.message}` });
    }
  } catch (error: any) {
    console.error('Commit import error:', error);
    return res.status(500).json({ error: 'Failed to commit import batch' });
  }
});

// 3. Get Import Batches List & Analytics (Admin Only)
importRouter.get('/batches', requireAdmin, (req: AuthRequest, res) => {
  try {
    const batches = db.prepare(`
      SELECT 
        import_batches.*,
        lead_sources.name as source_name,
        users.name as imported_by_name,
        (SELECT COUNT(*) FROM leads WHERE leads.batch_id = import_batches.batch_id) as current_leads_count,
        (SELECT COUNT(*) FROM leads WHERE leads.batch_id = import_batches.batch_id AND leads.status = 'WON') as won_leads_count,
        (SELECT COALESCE(SUM(deals.revenue), 0) FROM deals JOIN leads ON leads.id = deals.lead_id WHERE leads.batch_id = import_batches.batch_id) as batch_revenue
      FROM import_batches
      LEFT JOIN lead_sources ON lead_sources.id = import_batches.source_id
      LEFT JOIN users ON users.id = import_batches.imported_by_id
      ORDER BY import_batches.created_at DESC
    `).all();

    return res.json({ batches });
  } catch (error: any) {
    console.error('Fetch batches error:', error);
    return res.status(500).json({ error: 'Failed to fetch import batches' });
  }
});
