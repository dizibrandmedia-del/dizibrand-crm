import * as xlsx from 'xlsx';
import { db } from '../db/database.js';
import { calculateLeadScore } from '../routes/leads.js';

// Parse Google Sheet URL to extract Sheet ID and GID
export function parseGoogleSheetUrl(url: string): { sheetId: string; gid: string } {
  let sheetId = '';
  let gid = '0';

  const sheetIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetIdMatch) {
    sheetId = sheetIdMatch[1];
  }

  const gidMatch = url.match(/gid=([0-9]+)/);
  if (gidMatch) {
    gid = gidMatch[1];
  }

  return { sheetId, gid };
}

// Helper to normalize phone numbers
function cleanPhone(phone: any): string {
  if (!phone) return '';
  return String(phone).replace(/[^0-9]/g, '').slice(-10);
}

// Helper to parse dates in various formats into YYYY-MM-DD
export function parseDateOfInc(val: any): string {
  if (!val) return '';
  const s = String(val).trim();
  if (!s) return '';

  // Check Excel numeric serial date (e.g. 46265 or 45890.5)
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const serial = parseFloat(s);
    if (serial > 30000 && serial < 60000) {
      const ms = Math.round((serial - 25569) * 86400 * 1000);
      const d = new Date(ms);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    }
  }

  // Check YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Check M/D/YYYY or D/M/YYYY or DD-MM-YYYY
  const parts = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (parts) {
    const num1 = parseInt(parts[1], 10);
    const num2 = parseInt(parts[2], 10);
    const year = parts[3];

    let month = '';
    let day = '';

    if (num1 > 12) {
      // Must be DD/MM/YYYY
      day = String(num1).padStart(2, '0');
      month = String(num2).padStart(2, '0');
    } else if (num2 > 12) {
      // Must be MM/DD/YYYY (e.g. 8/31/2026)
      month = String(num1).padStart(2, '0');
      day = String(num2).padStart(2, '0');
    } else {
      // Standard MM/DD/YYYY or DD/MM/YYYY
      month = String(num1).padStart(2, '0');
      day = String(num2).padStart(2, '0');
    }
    return `${year}-${month}-${day}`;
  }

  const dateObj = new Date(s);
  if (!isNaN(dateObj.getTime())) {
    return dateObj.toISOString().split('T')[0];
  }

  return s;
}

// Generate unique batch ID
function generateSheetBatchId(sourceCode: string = 'MCA-SHEET'): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const mon = monthNames[now.getMonth()];
  const year = now.getFullYear();

  const countRow = db.prepare("SELECT COUNT(*) as count FROM import_batches WHERE batch_id LIKE ?").get(`${sourceCode}-${day}${mon}${year}-BATCH-%`) as { count: number };
  const batchNum = String(countRow.count + 1).padStart(3, '0');
  return `${sourceCode}-${day}${mon}${year}-BATCH-${batchNum}`;
}

// Core Sync Processor
export async function syncGoogleSheetConfig(configId: number, options: { rawRows?: any[]; triggeredBy?: string } = {}) {
  const config = db.prepare('SELECT * FROM google_sheet_sync_configs WHERE id = ?').get(configId) as any;
  if (!config) {
    throw new Error(`Google Sheet sync configuration #${configId} not found`);
  }

  let rawData: any[] = [];

  if (options.rawRows && Array.isArray(options.rawRows)) {
    rawData = options.rawRows;
  } else {
    // Fetch live from Google Sheets export endpoints
    const exportUrl = `https://docs.google.com/spreadsheets/d/${config.sheet_id}/export?format=csv&gid=${config.gid}`;
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${config.sheet_id}/gviz/tq?tqx=out:csv&gid=${config.gid}`;

    let csvText = '';
    try {
      const response = await fetch(exportUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' },
      });
      if (response.ok) {
        const text = await response.text();
        if (!text.includes('<!DOCTYPE html>')) {
          csvText = text;
        }
      }
    } catch (e) {
      console.warn('Direct CSV export failed, trying gviz endpoint:', e);
    }

    if (!csvText) {
      try {
        const gvizResponse = await fetch(gvizUrl);
        if (gvizResponse.ok) {
          const text = await gvizResponse.text();
          if (!text.includes('<!DOCTYPE html>')) {
            csvText = text;
          }
        }
      } catch (e) {
        console.warn('GViz endpoint failed:', e);
      }
    }

    if (!csvText) {
      const errMessage = 'Could not fetch Google Sheet as CSV. Please ensure the Google Sheet sharing is set to "Anyone with the link can view", or use the provided Google Apps Script webhook integration.';
      db.prepare(`
        UPDATE google_sheet_sync_configs SET
          last_sync_at = datetime('now'),
          last_sync_status = 'FAILED',
          last_sync_message = ?
        WHERE id = ?
      `).run(errMessage, configId);

      db.prepare(`
        INSERT INTO google_sheet_sync_logs (config_id, status, error_message)
        VALUES (?, 'FAILED', ?)
      `).run(configId, errMessage);

      throw new Error(errMessage);
    }

    // Parse CSV buffer into JSON
    const workbook = xlsx.read(csvText, { type: 'string' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    rawData = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  }

  if (rawData.length === 0) {
    db.prepare(`
      UPDATE google_sheet_sync_configs SET
        last_sync_at = datetime('now'),
        last_sync_status = 'SUCCESS',
        last_sync_message = 'Sync completed. Sheet has 0 records.'
      WHERE id = ?
    `).run(configId);
    return { totalRows: 0, importedCount: 0, duplicateCount: 0 };
  }

  // Load existing database records for fast deduplication
  const existingContactKeys = new Set<string>();

  const allExisting = db.prepare('SELECT cin, mobile, alternate_mobile, company_name, contact_person FROM leads').all() as any[];
  for (const lead of allExisting) {
    const mob = cleanPhone(lead.mobile) || cleanPhone(lead.alternate_mobile) || 'N/A';
    const cin = (lead.cin || '').trim().toUpperCase();
    const cName = (lead.company_name || '').trim().toLowerCase();
    const cPerson = (lead.contact_person || '').trim().toLowerCase();

    if (cin) {
      existingContactKeys.add(`${cin}_${cPerson}_${mob}`);
      existingContactKeys.add(`${cin}_${mob}`);
      existingContactKeys.add(`${cin}_${cPerson}`);
    } else {
      existingContactKeys.add(`${cName}_${cPerson}_${mob}`);
      existingContactKeys.add(`${cName}_${mob}`);
    }
  }

  const validRecords: any[] = [];
  let duplicateCount = 0;
  let missingMobileCount = 0;
  let missingCompanyCount = 0;
  let latestIncDate = config.last_synced_incorporation_date || '';

  const fileKeys = new Set<string>();

  // Process rows
  rawData.forEach((row) => {
    // Flexible column auto-mapping
    const companyName = String(
      row['name'] || row['Name'] || row['Company Name'] || row['company_name'] || row['CompanyName'] || row['COMPANY_NAME'] ||
      row['Company'] || row['Legal Name'] || row['legal_name'] || row['Entity Name'] || row['NAME'] || ''
    ).trim();

    const cin = String(
      row['entityId'] || row['entity_id'] || row['CIN'] || row['cin'] || row['Cin'] || row['Corporate Identification Number'] || row['CIN_NUMBER'] || ''
    ).trim().toUpperCase();

    const dateOfInc = parseDateOfInc(
      row['dateOfIncorporation'] || row['date_of_incorporation'] || row['Date of Incorporation'] || row['DateOfIncorporation'] ||
      row['INCORPORATION_DATE'] || row['incorporation_date'] || row['Inc Date'] || row['DOI'] || row['doi'] || ''
    );

    const contactPerson = String(
      row['directorName'] || row['director_name'] || row['Director Name'] || row['Contact Person'] || row['contact_person'] || row['Director'] ||
      row['ContactPerson'] || row['Promoter'] || row['DIRECTOR_NAME'] || 'Director'
    ).trim();

    const designation = String(
      row['Designation'] || row['designation'] || row['Role'] || row['DESIGNATION'] || 'Director'
    ).trim();

    const mobile = cleanPhone(
      row['directorMobile'] || row['director_mobile'] || row['Mobile'] || row['mobile'] || row['Mobile Number'] || row['Phone'] ||
      row['Contact Number'] || row['Director Mobile'] || row['MOBILE'] || row['Phone Number']
    );

    const alternateMobile = cleanPhone(
      row['Alternate Mobile'] || row['alternate_mobile'] || row['Alternate Phone'] || row['Mobile 2'] || ''
    );

    const email = String(
      row['directorEmail'] || row['director_email'] || row['email'] || row['Email'] || row['Email Address'] || row['Company Email'] || row['Director Email'] || row['EMAIL'] || ''
    ).trim();

    const city = String(row['district'] || row['District'] || row['City'] || row['city'] || row['Registered City'] || row['CITY'] || '').trim();
    const state = String(row['state'] || row['State'] || row['Registered State'] || row['STATE'] || '').trim();
    const industry = String(row['nicLabel'] || row['nic_label'] || row['Industry'] || row['industry'] || row['Activity'] || row['Category'] || '').trim();
    const companyType = String(row['classOfCompany'] || row['class_of_company'] || row['Company Type'] || 'Private Limited').trim();
    const registeredAddress = String(row['Registered Address'] || row['Address'] || row['address'] || row['REGISTERED_ADDRESS'] || '').trim();
    const website = String(row['Website'] || row['website'] || '').trim();

    const finalMobile = mobile || alternateMobile || 'N/A';
    const finalCompanyName = companyName || (contactPerson ? `${contactPerson} Ventures` : 'New Entity');

    // Unique contact identity for this director within this company
    const cinKey = cin ? `${cin}_${contactPerson.toLowerCase()}_${finalMobile}` : `${finalCompanyName.toLowerCase()}_${contactPerson.toLowerCase()}_${finalMobile}`;
    const cinMobOnlyKey = cin && finalMobile !== 'N/A' ? `${cin}_${finalMobile}` : '';

    let isDuplicate = false;
    if (existingContactKeys.has(cinKey)) {
      isDuplicate = true;
    } else if (cinMobOnlyKey && existingContactKeys.has(cinMobOnlyKey)) {
      isDuplicate = true;
    } else if (fileKeys.has(cinKey) || (cinMobOnlyKey && fileKeys.has(cinMobOnlyKey))) {
      isDuplicate = true;
    }

    if (isDuplicate) {
      duplicateCount++;
      return;
    }

    fileKeys.add(cinKey);
    if (cinMobOnlyKey) fileKeys.add(cinMobOnlyKey);

    // Track latest incorporation date
    if (dateOfInc && (!latestIncDate || dateOfInc > latestIncDate)) {
      latestIncDate = dateOfInc;
    }

    validRecords.push({
      company_name: finalCompanyName,
      cin: cin || null,
      company_type: companyType || 'Private Limited',
      industry: industry || null,
      incorporation_date: dateOfInc || null,
      city: city || null,
      state: state || null,
      registered_address: registeredAddress || null,
      website: website || null,
      contact_person: contactPerson,
      designation: designation || 'Director',
      mobile: finalMobile,
      alternate_mobile: alternateMobile || null,
      email: email || null,
    });
  });

  // Sort valid records chronologically by incorporation date
  validRecords.sort((a, b) => {
    if (!a.incorporation_date) return 1;
    if (!b.incorporation_date) return -1;
    return b.incorporation_date.localeCompare(a.incorporation_date);
  });

  const sourceId = config.source_id || 1; // Default to MCA Database source
  const batchId = generateSheetBatchId('MCA-GSHEET');

  if (validRecords.length > 0) {
    // Insert imported batch record
    const batchInsert = db.prepare(`
      INSERT INTO import_batches (
        batch_id, source_id, file_name, total_rows, valid_count,
        duplicate_count, invalid_count, missing_mobile_count,
        missing_company_count, imported_by_id, created_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, 0, ?,
        ?, 1, datetime('now')
      )
    `);

    batchInsert.run(
      batchId,
      sourceId,
      `Google Sheet: ${config.sheet_name}`,
      rawData.length,
      validRecords.length,
      duplicateCount,
      missingMobileCount,
      missingCompanyCount
    );

    // High-speed transaction to insert valid leads
    const insertLeadStmt = db.prepare(`
      INSERT INTO leads (
        lead_id, company_name, cin, company_type, industry,
        incorporation_date, city, state, country, registered_address,
        website, contact_person, designation, mobile, alternate_mobile,
        email, linkedin, source_id, source_campaign, batch_id,
        assigned_consultant_id, original_consultant_id, internal_business_id,
        status, priority, lead_score, lead_score_band, created_by_id,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, 'India', ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, 1,
        datetime('now'), datetime('now')
      )
    `);

    const initialStatus = config.assign_consultant_id ? 'ASSIGNED' : 'NEW';

    const maxIdRow = db.prepare("SELECT MAX(id) as max_id FROM leads").get() as { max_id: number | null };
    let currentMaxId = maxIdRow.max_id || 0;

    db.exec('BEGIN TRANSACTION;');
    try {
      for (const record of validRecords) {
        currentMaxId++;
        const formattedLeadId = `LEAD-${String(currentMaxId).padStart(6, '0')}`;

        // Score calculation
        const { score, band: scoreBand } = calculateLeadScore({
          industry: record.industry,
          designation: record.designation,
          status: initialStatus,
          priority: 'MEDIUM',
        });
        const priority = scoreBand === 'HOT' ? 'HOT' : scoreBand === 'WARM' ? 'HIGH' : 'MEDIUM';

        insertLeadStmt.run(
          formattedLeadId,
          record.company_name,
          record.cin,
          record.company_type,
          record.industry,
          record.incorporation_date,
          record.city,
          record.state,
          record.registered_address,
          record.website,
          record.contact_person,
          record.designation,
          record.mobile,
          record.alternate_mobile,
          record.email,
          null,
          sourceId,
          `LIVE_GOOGLE_SHEET_SYNC_${batchId}`,
          batchId,
          config.assign_consultant_id || null,
          config.assign_consultant_id || null,
          config.internal_business_id || null,
          initialStatus,
          priority,
          score,
          scoreBand
        );
      }
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  // Count exact total leads synced from Google Sheets in database
  const totalLeadsCountRow = db.prepare(`
    SELECT COUNT(*) as count FROM leads
    WHERE batch_id LIKE 'MCA-GSHEET%' OR source_campaign LIKE 'LIVE_GOOGLE_SHEET_SYNC%'
  `).get() as { count: number };
  const totalSyncedLeads = totalLeadsCountRow?.count || 0;

  const syncMessage = validRecords.length > 0
    ? `Successfully synced ${validRecords.length} new leads. ${duplicateCount} duplicates skipped.`
    : `All data up-to-date (${duplicateCount} existing records verified, 0 new leads).`;

  // Update Config Stats
  db.prepare(`
    UPDATE google_sheet_sync_configs SET
      last_sync_at = datetime('now'),
      last_synced_incorporation_date = ?,
      last_sync_status = 'SUCCESS',
      last_sync_message = ?,
      total_leads_synced = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    latestIncDate || config.last_synced_incorporation_date,
    syncMessage,
    totalSyncedLeads,
    configId
  );

  // Insert Sync Log
  db.prepare(`
    INSERT INTO google_sheet_sync_logs (
      config_id, batch_id, status, total_rows,
      new_leads_imported, duplicates_skipped, missing_mobile_skipped,
      latest_incorporation_date, created_at
    ) VALUES (
      ?, ?, 'SUCCESS', ?,
      ?, ?, ?,
      ?, datetime('now')
    )
  `).run(
    configId,
    batchId,
    rawData.length,
    validRecords.length,
    duplicateCount,
    missingMobileCount,
    latestIncDate || config.last_synced_incorporation_date
  );

  return {
    batchId,
    totalRows: rawData.length,
    importedCount: validRecords.length,
    duplicateCount,
    missingMobileCount,
    missingCompanyCount,
    latestIncorporationDate: latestIncDate || config.last_synced_incorporation_date,
  };

  // Super Admin notification
  const superAdmins = db.prepare("SELECT id FROM users WHERE role = 'SUPER_ADMIN' AND is_active = 1").all() as any[];
  const notifStmt = db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link_url)
    VALUES (?, ?, ?, 'SYSTEM', '/admin/google-sheets')
  `);

  for (const admin of superAdmins) {
    notifStmt.run(
      admin.id,
      '📊 Live Google Sheet Sync Completed',
      `${validRecords.length} new leads ingested from "${config.sheet_name}" (Batch: ${batchId}). Latest DOI: ${latestIncDate || 'N/A'}.`
    );
  }

  return {
    batchId,
    totalRows: rawData.length,
    importedCount: validRecords.length,
    duplicateCount,
    missingMobileCount,
    missingCompanyCount,
    latestIncorporationDate: latestIncDate,
  };
}

// Generate Google Apps Script code for 1-click install in Google Sheets
export function generateGoogleAppsScript(configId: number, webhookUrl: string, secretKey: string = ''): string {
  return `/**
 * =========================================================================
 * DIZIBRAND CRM — LIVE GOOGLE SHEET AUTO-SYNC SCRIPT
 * =========================================================================
 * Instructions:
 * 1. Open your Google Sheet
 * 2. Click Extensions > Apps Script
 * 3. Replace all code in the editor with this script
 * 4. Click Save, then click "Run" > "sendAllRowsToCRM" to test
 * 5. To sync DAILY automatically: Click Triggers (clock icon on left) >
 *    Add Trigger > Choose "sendAllRowsToCRM" > Time-driven > Day timer
 * =========================================================================
 */

var CRM_WEBHOOK_URL = "${webhookUrl}";
var CRM_CONFIG_ID = ${configId};
var SECRET_KEY = "${secretKey}";

function sendAllRowsToCRM() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return;

  var headers = data[0];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var rowObj = {};
    for (var j = 0; j < headers.length; j++) {
      var headerName = String(headers[j]).trim();
      var cellVal = data[i][j];
      if (cellVal instanceof Date) {
        rowObj[headerName] = Utilities.formatDate(cellVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
      } else {
        rowObj[headerName] = String(cellVal || "").trim();
      }
    }
    rows.push(rowObj);
  }

  var payload = {
    config_id: CRM_CONFIG_ID,
    secret_key: SECRET_KEY,
    rows: rows
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(CRM_WEBHOOK_URL, options);
  Logger.log("CRM Response: " + response.getContentText());
}

function onEdit(e) {
  // Optional: Auto-trigger on edits
}
`;
}
