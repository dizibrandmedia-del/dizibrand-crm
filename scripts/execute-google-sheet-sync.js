import * as xlsx from 'xlsx';
import { createClient } from '@libsql/client';

const turso = createClient({
  url: 'libsql://dizibrand-crm-dizibrandmedia-del.aws-ap-south-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODgyOTg3NjYsImlkIjoiMDFhMDVlZTUtM2IwMS03ZmQ0LThlM2UtOGRkMDRmNmE4ZTc5Iiwia2lkIjoibXpldXhwVzJ0aDZNUG1KVzRxQlB6LUhCTHlMaWw0VXVOX2dCeUJoQTQzWSIsInJpZCI6IjExMTZiZDA5LTJmYWMtNDc1NC1iNGVjLTg0NmNmZmU0YzI5YSJ9.NT6VsHsdumWye7k72yYM6yBPAnVPhRKzfxC5rCNh1fKRIjP1z8nfduKSucXrunUJ7K0K3jQeNG8V3nnIhuDnAg',
});

function cleanPhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/[^0-9]/g, '').slice(-10);
}

function parseDateOfInc(val) {
  if (!val) return '';
  const s = String(val).trim();
  if (!s) return '';
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const serial = parseFloat(s);
    if (serial > 30000 && serial < 60000) {
      const ms = Math.round((serial - 25569) * 86400 * 1000);
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parts = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (parts) {
    const num1 = parseInt(parts[1], 10);
    const num2 = parseInt(parts[2], 10);
    const year = parts[3];
    const month = String(num1 > 12 ? num2 : num1).padStart(2, '0');
    const day = String(num1 > 12 ? num1 : num2).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return s;
}

export async function syncGoogleSheetConfigToTurso(configId = 1) {
  console.log(`Starting sync for config #${configId}...`);
  const configRes = await turso.execute({
    sql: 'SELECT * FROM google_sheet_sync_configs WHERE id = ?',
    args: [configId],
  });
  const config = configRes.rows[0];
  if (!config) throw new Error(`Config #${configId} not found`);

  const csvUrl = `https://docs.google.com/spreadsheets/d/${config.sheet_id}/export?format=csv&gid=${config.gid || '0'}`;
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error(`Failed to download sheet CSV (Status: ${res.status})`);

  const csvText = await res.text();
  const workbook = xlsx.read(csvText, { type: 'string' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  console.log(`Downloaded ${rawData.length} rows from Google Sheet.`);

  // Load existing leads for deduplication by Company Name and CIN
  const existingRes = await turso.execute('SELECT cin, company_name FROM leads');
  const existingCompanyNames = new Set(existingRes.rows.map(r => String(r.company_name || '').trim().toLowerCase()));
  const existingCINs = new Set(existingRes.rows.map(r => String(r.cin || '').trim().toUpperCase()).filter(Boolean));

  const validRecords = [];
  const processedCompanyNames = new Set();
  const processedCINs = new Set();
  let duplicateCount = 0;
  let latestIncDate = config.last_synced_incorporation_date || '';

  for (const row of rawData) {
    const companyName = String(
      row['name'] || row['Name'] || row['Company Name'] || row['company_name'] || row['CompanyName'] || row['COMPANY_NAME'] ||
      row['Company'] || row['Legal Name'] || row['Entity Name'] || row['NAME'] || ''
    ).trim();

    if (!companyName) continue;

    const cin = String(
      row['entityId'] || row['entity_id'] || row['CIN'] || row['cin'] || row['Cin'] || row['Corporate Identification Number'] || ''
    ).trim().toUpperCase();

    const normalizedName = companyName.toLowerCase();

    if (
      existingCompanyNames.has(normalizedName) ||
      (cin && existingCINs.has(cin)) ||
      processedCompanyNames.has(normalizedName) ||
      (cin && processedCINs.has(cin))
    ) {
      duplicateCount++;
      continue;
    }

    processedCompanyNames.add(normalizedName);
    if (cin) processedCINs.add(cin);

    const dateOfInc = parseDateOfInc(
      row['dateOfIncorporation'] || row['date_of_incorporation'] || row['Date of Incorporation'] || row['DateOfIncorporation'] ||
      row['INCORPORATION_DATE'] || row['incorporation_date'] || row['Inc Date'] || row['DOI'] || row['doi'] || ''
    );

    if (dateOfInc && (!latestIncDate || dateOfInc > latestIncDate)) {
      latestIncDate = dateOfInc;
    }

    const contactPerson = String(
      row['directorName'] || row['director_name'] || row['Director Name'] || row['Contact Person'] || row['contact_person'] || 'Director'
    ).trim();

    const designation = String(row['Designation'] || row['designation'] || row['Role'] || 'Director').trim();
    const mobile = cleanPhone(row['directorMobile'] || row['director_mobile'] || row['Mobile'] || row['mobile'] || row['Phone'] || '');
    const alternateMobile = cleanPhone(row['Alternate Mobile'] || row['alternate_mobile'] || '');
    const email = String(row['directorEmail'] || row['director_email'] || row['email'] || row['Email'] || '').trim();
    const city = String(row['district'] || row['District'] || row['City'] || row['city'] || '').trim();
    const state = String(row['state'] || row['State'] || '').trim();
    const industry = String(row['nicLabel'] || row['nic_label'] || row['Industry'] || '').trim();
    const companyType = String(row['classOfCompany'] || row['class_of_company'] || 'Private Limited').trim();
    const address = String(row['Registered Address'] || row['Address'] || '').trim();

    validRecords.push({
      company_name: companyName,
      cin: cin || null,
      company_type: companyType,
      industry: industry || null,
      incorporation_date: dateOfInc || null,
      city: city || null,
      state: state || null,
      registered_address: address || null,
      contact_person: contactPerson,
      designation,
      mobile: mobile || alternateMobile || 'N/A',
      alternate_mobile: alternateMobile || null,
      email: email || null,
      lead_score: dateOfInc && dateOfInc >= '2026-08-01' ? 85 : 55,
      lead_score_band: dateOfInc && dateOfInc >= '2026-08-01' ? 'HOT' : 'WARM',
    });
  }

  console.log(`Filtered: ${validRecords.length} unique valid records, ${duplicateCount} duplicate records skipped.`);

  // Insert valid records in chunks of 50 into Turso Cloud
  if (validRecords.length > 0) {
    const chunkSize = 50;
    for (let i = 0; i < validRecords.length; i += chunkSize) {
      const chunk = validRecords.slice(i, i + chunkSize);
      const statements = chunk.map((r, idx) => ({
        sql: `
          INSERT INTO leads (
            lead_id, company_name, cin, company_type, industry,
            incorporation_date, city, state, registered_address,
            contact_person, designation, mobile, alternate_mobile,
            email, source_id, status, priority, lead_score,
            lead_score_band, date_added, assigned_consultant_id, internal_business_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW', 'MEDIUM', ?, ?, CURRENT_TIMESTAMP, ?, ?)
        `,
        args: [
          `MCA-${Date.now()}-${i + idx + 1}`,
          r.company_name,
          r.cin,
          r.company_type,
          r.industry,
          r.incorporation_date,
          r.city,
          r.state,
          r.registered_address,
          r.contact_person,
          r.designation,
          r.mobile,
          r.alternate_mobile,
          r.email,
          config.source_id || 1,
          r.lead_score,
          r.lead_score_band,
          config.assign_consultant_id || null,
          config.internal_business_id || null,
        ],
      }));

      await turso.batch(statements, 'write');
      console.log(`Inserted chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(validRecords.length / chunkSize)}`);
    }
  }

  const newTotal = Number(config.total_leads_synced || 0) + validRecords.length;
  const statusMessage = `Successfully synced ${validRecords.length} new unique leads (${duplicateCount} duplicate companies skipped)`;

  await turso.execute({
    sql: `
      UPDATE google_sheet_sync_configs SET
        last_sync_at = CURRENT_TIMESTAMP,
        last_sync_status = 'SUCCESS',
        last_sync_message = ?,
        total_leads_synced = ?,
        last_synced_incorporation_date = COALESCE(?, last_synced_incorporation_date),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    args: [statusMessage, newTotal, latestIncDate || null, configId],
  });

  console.log('🎉 Sync completed successfully!');
  return {
    totalRows: rawData.length,
    newLeadsInserted: validRecords.length,
    duplicatesSkipped: duplicateCount,
    latestIncDate,
    totalIngestedLeads: newTotal,
  };
}

if (process.argv[1].endsWith('execute-google-sheet-sync.js')) {
  syncGoogleSheetConfigToTurso(1)
    .then(console.log)
    .catch(console.error);
}
