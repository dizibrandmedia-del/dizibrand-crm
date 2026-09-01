import bcrypt from 'bcryptjs';
import { db, initializeDatabase } from './database.js';

export function seedDatabase() {
  initializeDatabase();

  console.log('Seeding CRM Database with Initial PRD Data...');

  // 1. Seed Users
  const salt = bcrypt.genSaltSync(10);
  const adminPassword = bcrypt.hashSync('Admin@123456', salt);
  const consultantPassword = bcrypt.hashSync('Consultant@123456', salt);

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, password_hash, role, mobile, is_active, daily_call_target, daily_lead_target, daily_whatsapp_target, daily_followup_target, daily_potential_target)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(1, 'Super Admin', 'admin@dizibrand.com', adminPassword, 'SUPER_ADMIN', '+91 9876543210', 1, 0, 0, 0, 0, 0);
  insertUser.run(2, 'Rahul Sharma', 'rahul@dizibrand.com', consultantPassword, 'CONSULTANT', '+91 9811122233', 1, 25, 50, 20, 15, 5);
  insertUser.run(3, 'Priya Patel', 'priya@dizibrand.com', consultantPassword, 'CONSULTANT', '+91 9822233344', 1, 30, 60, 25, 18, 6);
  insertUser.run(4, 'Amit Verma', 'amit@dizibrand.com', consultantPassword, 'CONSULTANT', '+91 9833344455', 1, 20, 45, 15, 12, 4);

  // 2. Seed Internal Business Verticals (Super Admin Only)
  const insertBusiness = db.prepare(`
    INSERT OR IGNORE INTO businesses (id, name, code, description, is_active)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertBusiness.run(1, 'Dizibrand', 'DIZI', 'Digital Marketing, Performance Ads & Brand Strategy', 1);
  insertBusiness.run(2, 'Strategic HR', 'STRAT_HR', 'Executive Search, Recruitment & HR Advisory', 1);
  insertBusiness.run(3, 'Fyntrust', 'FYN', 'Financial Advisory, Accounting, Taxation & Compliance', 1);
  insertBusiness.run(4, 'No Brokerage', 'NO_BROK', 'Commercial Leasing & Real Estate Advisory', 1);

  // 3. Seed Lead Sources
  const insertSource = db.prepare(`
    INSERT OR IGNORE INTO lead_sources (id, name, code, is_system, is_active)
    VALUES (?, ?, ?, ?, ?)
  `);

  const sources = [
    [1, 'MCA Database', 'MCA', 1],
    [2, 'Social Media', 'SOC_MEDIA', 1],
    [3, 'Facebook', 'FB_ADS', 1],
    [4, 'Instagram', 'INSTA_ADS', 1],
    [5, 'LinkedIn', 'LINKEDIN', 1],
    [6, 'Google Ads', 'GOOGLE_ADS', 1],
    [7, 'Website', 'WEBSITE', 1],
    [8, 'WhatsApp', 'WHATSAPP', 1],
    [9, 'Referral', 'REFERRAL', 1],
    [10, 'Calling', 'COLD_CALL', 1],
    [11, 'Existing Client', 'EXISTING_CLIENT', 1],
    [12, 'Manual Entry', 'MANUAL', 1],
    [13, 'Other', 'OTHER', 1],
  ];

  for (const s of sources) {
    insertSource.run(s[0], s[1], s[2], s[3], 1);
  }

  // 4. Seed Tags
  const insertTag = db.prepare(`
    INSERT OR IGNORE INTO tags (id, name, color, description)
    VALUES (?, ?, ?, ?)
  `);

  const tags = [
    [1, 'IT & Software', '#6366f1', 'Technology and software companies'],
    [2, 'Startup', '#ec4899', 'High growth startups'],
    [3, 'Real Estate', '#f59e0b', 'Builders and commercial real estate'],
    [4, 'CXO', '#8b5cf6', 'Direct CXO / Founder contact'],
    [5, 'High Value', '#10b981', 'High potential deal size'],
    [6, 'Urgent', '#ef4444', 'Immediate requirement'],
    [7, 'Decision Maker', '#3b82f6', 'Directly in touch with decision maker'],
    [8, 'Existing Vendor', '#64748b', 'Currently using competitor services'],
    [9, 'Follow-up Later', '#06b6d4', 'Scheduled for future outreach'],
  ];

  for (const t of tags) {
    insertTag.run(t[0], t[1], t[2], t[3]);
  }

  // 5. Seed Scoring Rules
  const insertScoringRule = db.prepare(`
    INSERT OR IGNORE INTO scoring_rules (id, criterion_key, criterion_name, category, weight, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const scoringRules = [
    [1, 'RELEVANT_INDUSTRY', 'Target Industry Match (IT/Fintech/Real Estate/Manufacturing)', 'FIT', 15],
    [2, 'DECISION_MAKER', 'Decision Maker Contacted (Founder/Director/CXO)', 'CONTACT', 20],
    [3, 'CONFIRMED_REQ', 'Confirmed Requirement Identified', 'NEED', 20],
    [4, 'BUDGET_AVAILABLE', 'Approved Budget Available (> 1 Lakh INR)', 'BUDGET', 15],
    [5, 'URGENCY', 'High Urgency (Needs solution in < 30 days)', 'TIMELINE', 15],
    [6, 'MEETING_INTEREST', 'Client Agreed to Schedule Discovery Meeting', 'ENGAGEMENT', 15],
  ];

  for (const r of scoringRules) {
    insertScoringRule.run(r[0], r[1], r[2], r[3], r[4], 1);
  }

  // 6. Seed Import Batch
  const insertBatch = db.prepare(`
    INSERT OR IGNORE INTO import_batches (id, batch_id, source_id, total_rows, valid_count, duplicate_count, invalid_count, missing_mobile_count, missing_company_count, imported_by_id, file_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBatch.run(1, 'MCA-01SEP2026-BATCH-001', 1, 250, 242, 6, 2, 1, 1, 1, 'MCA_Karnataka_Sept2026.xlsx');

  // 7. Seed Sample Leads
  const insertLead = db.prepare(`
    INSERT OR IGNORE INTO leads (
      id, lead_id, company_name, cin, company_type, industry, sub_industry,
      incorporation_date, city, state, country, registered_address, website,
      contact_person, designation, mobile, alternate_mobile, email, linkedin,
      source_id, source_campaign, batch_id, assigned_consultant_id, internal_business_id,
      status, priority, lead_score, lead_score_band, original_consultant_id,
      last_activity_at, next_followup_date, next_followup_time, remarks, created_by_id
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      datetime('now'), ?, ?, ?, ?
    )
  `);

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const sampleLeads = [
    {
      id: 1,
      lead_id: 'LD-2026-00001',
      company_name: 'Nexus Cloud Innovations Pvt Ltd',
      cin: 'U72200KA2024PTC189234',
      company_type: 'Private Limited',
      industry: 'Information Technology',
      sub_industry: 'SaaS / Enterprise Software',
      incorporation_date: '2024-03-15',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      registered_address: 'Indiranagar 100ft Road, Bengaluru, 560038',
      website: 'https://nexuscloud.io',
      contact_person: 'Vikramaditya Roy',
      designation: 'Managing Director',
      mobile: '+919845012345',
      alternate_mobile: '+919845012346',
      email: 'vikram@nexuscloud.io',
      linkedin: 'https://linkedin.com/in/vikram-nexus',
      source_id: 1,
      source_campaign: 'MCA_KARNATAKA_Q3',
      batch_id: 'MCA-01SEP2026-BATCH-001',
      assigned_consultant_id: 2, // Rahul
      internal_business_id: 1, // Dizibrand
      status: 'OWNER_HANDOVER',
      priority: 'HOT',
      lead_score: 90,
      lead_score_band: 'HOT',
      original_consultant_id: 2,
      next_followup_date: todayStr,
      next_followup_time: '15:30',
      remarks: 'High urgency for digital performance marketing & re-branding. Budget ~₹2.5L/mo.',
      created_by_id: 1,
    },
    {
      id: 2,
      lead_id: 'LD-2026-00002',
      company_name: 'Zeta Financial Technologies Ltd',
      cin: 'U65990MH2023PLC178456',
      company_type: 'Public Limited',
      industry: 'Financial Services',
      sub_industry: 'Fintech & Lending',
      incorporation_date: '2023-08-20',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      registered_address: 'Bandra Kurla Complex, Mumbai, 400051',
      website: 'https://zetafin.in',
      contact_person: 'Ananya Deshmukh',
      designation: 'VP Finance',
      mobile: '+919920198765',
      alternate_mobile: null,
      email: 'ananya@zetafin.in',
      linkedin: 'https://linkedin.com/in/ananya-zeta',
      source_id: 5, // LinkedIn
      source_campaign: 'LINKEDIN_FINTECH_LEADS',
      batch_id: null,
      assigned_consultant_id: 2, // Rahul
      internal_business_id: 3, // Fyntrust
      status: 'FOLLOW_UP',
      priority: 'HIGH',
      lead_score: 75,
      lead_score_band: 'WARM',
      original_consultant_id: 2,
      next_followup_date: todayStr,
      next_followup_time: '11:00',
      remarks: 'Needs annual statutory audit & tax advisory support. Sent company deck.',
      created_by_id: 1,
    },
    {
      id: 3,
      lead_id: 'LD-2026-00003',
      company_name: 'UrbanScape Infra Projects LLP',
      cin: 'AAH-8921',
      company_type: 'LLP',
      industry: 'Real Estate & Infrastructure',
      sub_industry: 'Commercial Leasing',
      incorporation_date: '2022-11-10',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      registered_address: 'Golf Course Extension Road, Gurugram, 122018',
      website: 'https://urbanscapeinfra.com',
      contact_person: 'Rajesh Mehra',
      designation: 'Chief Operating Officer',
      mobile: '+919810145678',
      alternate_mobile: '+919810145679',
      email: 'rajesh.mehra@urbanscapeinfra.com',
      linkedin: 'https://linkedin.com/in/rajesh-urbanscape',
      source_id: 1, // MCA
      source_campaign: 'MCA_DELHI_NCR_Q3',
      batch_id: 'MCA-01SEP2026-BATCH-001',
      assigned_consultant_id: 3, // Priya
      internal_business_id: 4, // No Brokerage
      status: 'MEETING',
      priority: 'HOT',
      lead_score: 85,
      lead_score_band: 'HOT',
      original_consultant_id: 3,
      next_followup_date: tomorrow,
      next_followup_time: '14:00',
      remarks: 'Looking for 25,000 sq ft office space leasing advisory. Meeting scheduled.',
      created_by_id: 1,
    },
    {
      id: 4,
      lead_id: 'LD-2026-00004',
      company_name: 'Apex Talent Solutions Pvt Ltd',
      cin: 'U74140DL2021PTC165432',
      company_type: 'Private Limited',
      industry: 'Human Resources',
      sub_industry: 'Executive Recruitment',
      incorporation_date: '2021-05-18',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India',
      registered_address: 'Barakhamba Road, Connaught Place, New Delhi, 110001',
      website: 'https://apextalent.co.in',
      contact_person: 'Sunita Aggarwal',
      designation: 'Head of Talent Acquisition',
      mobile: '+919811876543',
      alternate_mobile: null,
      email: 'sunita@apextalent.co.in',
      linkedin: 'https://linkedin.com/in/sunita-apex',
      source_id: 3, // Facebook
      source_campaign: 'FB_HR_SOLUTIONS_LEADS',
      batch_id: null,
      assigned_consultant_id: 3, // Priya
      internal_business_id: 2, // Strategic HR
      status: 'PROPOSAL',
      priority: 'HIGH',
      lead_score: 80,
      lead_score_band: 'HOT',
      original_consultant_id: 3,
      next_followup_date: todayStr,
      next_followup_time: '16:00',
      remarks: 'Sent retainer proposal for C-level executive hiring (₹1.8L retainer).',
      created_by_id: 1,
    },
    {
      id: 5,
      lead_id: 'LD-2026-00005',
      company_name: 'GreenMatrix Renewables Pvt Ltd',
      cin: 'U40100GJ2024PTC190123',
      company_type: 'Private Limited',
      industry: 'Clean Energy & Power',
      sub_industry: 'Solar EPC',
      incorporation_date: '2024-01-12',
      city: 'Ahmedabad',
      state: 'Gujarat',
      country: 'India',
      registered_address: 'SG Highway, Ahmedabad, 380054',
      website: 'https://greenmatrix.in',
      contact_person: 'Ketan Patel',
      designation: 'Founder & Director',
      mobile: '+919825067890',
      alternate_mobile: null,
      email: 'ketan@greenmatrix.in',
      linkedin: 'https://linkedin.com/in/ketan-greenmatrix',
      source_id: 1, // MCA
      source_campaign: 'MCA_GUJARAT_Q3',
      batch_id: 'MCA-01SEP2026-BATCH-001',
      assigned_consultant_id: 2, // Rahul
      internal_business_id: 1, // Dizibrand
      status: 'FOLLOW_UP',
      priority: 'MEDIUM',
      lead_score: 65,
      lead_score_band: 'WARM',
      original_consultant_id: 2,
      next_followup_date: yesterday, // OVERDUE FOLLOWUP
      next_followup_time: '10:30',
      remarks: 'Overdue follow-up for social media management proposal discussion.',
      created_by_id: 1,
    },
    {
      id: 6,
      lead_id: 'LD-2026-00006',
      company_name: 'BlueHorizon Logistics India Ltd',
      cin: 'U63090TN2020PLC145678',
      company_type: 'Public Limited',
      industry: 'Logistics & Supply Chain',
      sub_industry: 'Cold Chain',
      incorporation_date: '2020-04-10',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      registered_address: 'Mount Road, Guindy, Chennai, 600032',
      website: 'https://bluehorizonlogistics.com',
      contact_person: 'Karthik Subramanian',
      designation: 'General Manager - Strategy',
      mobile: '+919444012399',
      alternate_mobile: null,
      email: 'karthik@bluehorizon.com',
      linkedin: 'https://linkedin.com/in/karthik-bluehorizon',
      source_id: 7, // Website
      source_campaign: 'ORGANIC_SEARCH_Q3',
      batch_id: null,
      assigned_consultant_id: 4, // Amit
      internal_business_id: 3, // Fyntrust
      status: 'WON',
      priority: 'HOT',
      lead_score: 95,
      lead_score_band: 'HOT',
      original_consultant_id: 4,
      next_followup_date: null,
      next_followup_time: null,
      remarks: 'Deal closed! Tax restructuring and compliance retainer at ₹3,50,000/yr.',
      created_by_id: 1,
    },
    {
      id: 7,
      lead_id: 'LD-2026-00007',
      company_name: 'Starlight Media Studios LLP',
      cin: 'AAI-4421',
      company_type: 'LLP',
      industry: 'Media & Entertainment',
      sub_industry: 'Video Production',
      incorporation_date: '2023-06-01',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      registered_address: 'Banjara Hills, Hyderabad, 500034',
      website: 'https://starlightstudios.in',
      contact_person: 'Srinivas Rao',
      designation: 'Partner',
      mobile: '+919849033445',
      alternate_mobile: null,
      email: 'srinivas@starlightstudios.in',
      linkedin: null,
      source_id: 1, // MCA
      source_campaign: 'MCA_HYD_Q3',
      batch_id: 'MCA-01SEP2026-BATCH-001',
      assigned_consultant_id: 2, // Rahul
      internal_business_id: 1,
      status: 'ASSIGNED',
      priority: 'MEDIUM',
      lead_score: 55,
      lead_score_band: 'WARM',
      original_consultant_id: 2,
      next_followup_date: todayStr,
      next_followup_time: '17:00',
      remarks: 'Freshly assigned lead from MCA database. Initial call required.',
      created_by_id: 1,
    },
    {
      id: 8,
      lead_id: 'LD-2026-00008',
      company_name: 'SwiftDeliver E-Commerce Solutions',
      cin: 'U72900DL2024PTC192837',
      company_type: 'Private Limited',
      industry: 'E-Commerce',
      sub_industry: 'Hyperlocal Logistics',
      incorporation_date: '2024-02-14',
      city: 'Noida',
      state: 'Uttar Pradesh',
      country: 'India',
      registered_address: 'Sector 62, Noida, 201301',
      website: 'https://swiftdeliver.in',
      contact_person: 'Manish Tyagi',
      designation: 'CEO',
      mobile: '+919818044556',
      alternate_mobile: null,
      email: 'manish@swiftdeliver.in',
      linkedin: 'https://linkedin.com/in/manish-tyagi',
      source_id: 1,
      source_campaign: 'MCA_UP_Q3',
      batch_id: 'MCA-01SEP2026-BATCH-001',
      assigned_consultant_id: null, // Unassigned
      internal_business_id: 1,
      status: 'NEW',
      priority: 'HIGH',
      lead_score: 70,
      lead_score_band: 'WARM',
      original_consultant_id: null,
      next_followup_date: null,
      next_followup_time: null,
      remarks: 'Unassigned fresh import. High growth potential.',
      created_by_id: 1,
    }
  ];

  for (const l of sampleLeads) {
    insertLead.run(
      l.id, l.lead_id, l.company_name, l.cin, l.company_type, l.industry, l.sub_industry,
      l.incorporation_date, l.city, l.state, l.country, l.registered_address, l.website,
      l.contact_person, l.designation, l.mobile, l.alternate_mobile, l.email, l.linkedin,
      l.source_id, l.source_campaign, l.batch_id, l.assigned_consultant_id, l.internal_business_id,
      l.status, l.priority, l.lead_score, l.lead_score_band, l.original_consultant_id,
      l.next_followup_date, l.next_followup_time, l.remarks, l.created_by_id
    );
  }

  // 8. Seed Lead Tags
  const insertLeadTag = db.prepare('INSERT OR IGNORE INTO lead_tags (lead_id, tag_id) VALUES (?, ?)');
  insertLeadTag.run(1, 1); // Nexus -> IT
  insertLeadTag.run(1, 4); // Nexus -> CXO
  insertLeadTag.run(1, 5); // Nexus -> High Value
  insertLeadTag.run(2, 5); // Zeta -> High Value
  insertLeadTag.run(3, 3); // UrbanScape -> Real Estate
  insertLeadTag.run(4, 7); // Apex -> Decision Maker
  insertLeadTag.run(6, 5); // BlueHorizon -> High Value

  // 9. Seed Activities Timeline
  const insertActivity = db.prepare(`
    INSERT OR IGNORE INTO lead_activities (lead_id, user_id, activity_type, title, description, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', ?))
  `);

  insertActivity.run(1, 1, 'CREATED', 'Lead Ingested from MCA Batch', 'Lead automatically created from batch MCA-01SEP2026-BATCH-001', '-2 days');
  insertActivity.run(1, 1, 'ASSIGNED', 'Assigned to Rahul Sharma', 'Super Admin assigned lead for introductory discovery call', '-2 days');
  insertActivity.run(1, 2, 'CALL', 'Discovery Call - Connected', 'Spoke with MD Vikramaditya Roy. High interest in Dizibrand 360 branding & lead generation.', '-1 day');
  insertActivity.run(1, 2, 'WHATSAPP', 'WhatsApp Pitch Deck Sent', 'Shared portfolio PDF & pitch deck to MD via WhatsApp', '-1 day');
  insertActivity.run(1, 2, 'POTENTIAL_HANDOVER', 'Submitted as Potential Lead', 'Handed over to Super Admin with budget ~₹2.5L/mo for executive proposal and closing.', '-4 hours');

  insertActivity.run(6, 4, 'CALL', 'Discovery Call - Connected', 'Spoke with GM Karthik. Confirmed requirement for FY26 tax compliance.', '-5 days');
  insertActivity.run(6, 1, 'MEETING', 'Executive Discovery Meeting Completed', 'Meeting held with Super Admin and Fyntrust leadership.', '-3 days');
  insertActivity.run(6, 1, 'PROPOSAL_SENT', 'Retainer Proposal Submitted', 'Submitted proposal FYN-PROP-2026-001 for ₹3,50,000.', '-2 days');
  insertActivity.run(6, 1, 'WON', 'Deal Closed Won', 'Contract signed and advance payment received.', '-1 day');

  // 10. Seed Calls
  const insertCall = db.prepare(`
    INSERT OR IGNORE INTO calls (lead_id, consultant_id, call_date, call_time, outcome, duration_seconds, remark, next_followup_date, next_followup_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCall.run(1, 2, yesterday, '11:30', 'QUALIFIED', 420, 'Very positive discussion with MD. Needs re-branding immediately.', todayStr, '15:30');
  insertCall.run(2, 2, yesterday, '15:00', 'INTERESTED', 310, 'Interested in corporate tax advisory. Needs followup.', todayStr, '11:00');
  insertCall.run(3, 3, yesterday, '16:15', 'QUALIFIED', 540, 'Ready for physical site walkthrough and discovery call.', tomorrow, '14:00');
  insertCall.run(5, 2, yesterday, '10:00', 'CALL_BACK', 90, 'Client requested call back in the afternoon. Missed due date.', yesterday, '10:30');
  insertCall.run(6, 4, yesterday, '14:30', 'QUALIFIED', 600, 'All compliance parameters discussed and agreed.', null, null);

  // 11. Seed WhatsApp Activities
  const insertWhatsApp = db.prepare(`
    INSERT OR IGNORE INTO whatsapp_activities (lead_id, consultant_id, outcome, template_name, message_preview, remark)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertWhatsApp.run(1, 2, 'REPLIED', 'Introduction & Pitch Deck', 'Hi Vikramaditya, thank you for connecting. Here is the Dizibrand portfolio deck.', 'Client acknowledged deck.');
  insertWhatsApp.run(2, 2, 'REPLIED', 'Tax Advisory Overview', 'Hi Ananya, please find our Fyntrust corporate advisory overview attached.', 'Client confirmed receipt.');

  // 12. Seed Follow-ups
  const insertFollowup = db.prepare(`
    INSERT OR IGNORE INTO follow_ups (lead_id, consultant_id, followup_date, followup_time, priority, reason, remark, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertFollowup.run(1, 2, todayStr, '15:30', 'HOT', 'Potential Handover Review Call', 'Align on meeting slot with Super Admin', 'PENDING');
  insertFollowup.run(2, 2, todayStr, '11:00', 'HIGH', 'Discussion on statutory audit scope', 'Review pricing tiers', 'PENDING');
  insertFollowup.run(4, 3, todayStr, '16:00', 'HIGH', 'Proposal feedback follow-up', 'Check if retainer terms are approved', 'PENDING');
  insertFollowup.run(5, 2, yesterday, '10:30', 'MEDIUM', 'Pricing discussion callback', 'Client was in a meeting yesterday', 'PENDING'); // OVERDUE
  insertFollowup.run(3, 3, tomorrow, '14:00', 'HOT', 'Commercial leasing site survey', 'Meet with operations director', 'PENDING');

  // 13. Seed Potential Lead Handover
  const insertPotential = db.prepare(`
    INSERT OR IGNORE INTO potential_handovers (
      lead_id, consultant_id, company_name, contact_person, mobile,
      requirement, requirement_details, interest_level, budget, urgency,
      decision_maker, current_vendor, call_remark, whatsapp_summary,
      recommended_next_action, admin_status, admin_notes
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?
    )
  `);

  insertPotential.run(
    1, 2, 'Nexus Cloud Innovations Pvt Ltd', 'Vikramaditya Roy', '+919845012345',
    '360 Degree Digital Marketing & SaaS Growth Strategy',
    'Nexus Cloud is launching their enterprise suite across APAC. They need full funnel performance marketing, LinkedIn account-based marketing, and brand repositioning.',
    'VERY_HIGH', '₹2,50,000 / month', 'IMMEDIATE',
    'Vikramaditya Roy (Managing Director - 100% decision authority)', 'Internal team, no external agency currently',
    'Spoke for 7 minutes. MD is keen to start engagement by 15th of this month.',
    'Sent portfolio deck via WhatsApp; MD confirmed receipt and requested formal proposal meeting.',
    'Schedule online discovery meeting with Super Admin and Dizibrand creative director.',
    'PENDING_REVIEW', 'Reviewing requirements for proposal drafting.'
  );

  // 14. Seed Tasks & Targets
  const insertTask = db.prepare(`
    INSERT OR IGNORE INTO tasks (
      title, description, consultant_id, created_by_id, priority,
      start_date, due_date, status, call_target, whatsapp_target,
      lead_target, followup_target, potential_target, meeting_target
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  insertTask.run(
    'Q3 MCA Karnataka Campaign Calling Sprint',
    'Focus on newly incorporated Bangalore IT & SaaS firms. Qualify for Dizibrand digital marketing and Fyntrust compliance.',
    2, 1, 'HOT',
    todayStr, todayStr, 'IN_PROGRESS',
    25, 20, 50, 15, 5, 2
  );

  insertTask.run(
    'Real Estate & Infrastructure Outreach',
    'Call commercial builders in NCR region for No Brokerage advisory.',
    3, 1, 'HIGH',
    todayStr, todayStr, 'IN_PROGRESS',
    30, 25, 60, 18, 6, 2
  );

  // 15. Seed Proposal
  const insertProposal = db.prepare(`
    INSERT OR IGNORE INTO proposals (
      lead_id, service_name, proposal_code, proposal_date,
      value, currency, status, follow_up_date, notes, created_by_id
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
  `);

  insertProposal.run(
    4, 'C-Suite Executive Search Retainer', 'PROP-2026-HR-004', todayStr,
    180000, 'INR', 'SENT', todayStr, 'Sent to Sunita Aggarwal for 2 Senior Engineering VP hires.', 1
  );

  // 16. Seed Deal & Revenue (Closed Won Deal)
  const insertDeal = db.prepare(`
    INSERT OR IGNORE INTO deals (
      lead_id, proposal_id, service_name, internal_business_id, source_id,
      original_consultant_id, closing_person_id, deal_value, payment_type,
      closing_date, payment_status, revenue, notes
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  insertDeal.run(
    6, null, 'Annual Corporate Tax Compliance & Structuring', 3, 7, // Fyntrust, Website
    4, 1, 350000, 'ANNUAL', // Original: Amit Verma, Closed by: Super Admin
    yesterday, 'PAID', 350000, 'Initial retainer contract signed for 12 months.'
  );

  // 17. Seed Notifications
  const insertNotification = db.prepare(`
    INSERT OR IGNORE INTO notifications (user_id, title, message, type, is_read, link_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Admin notifications
  insertNotification.run(1, 'New Potential Lead Submitted', 'Rahul Sharma submitted Nexus Cloud Innovations for review.', 'POTENTIAL_LEAD', 0, '/admin/potential-leads');
  insertNotification.run(1, 'Overdue Follow-up Alert', 'GreenMatrix Renewables follow-up was overdue yesterday.', 'FOLLOWUP_OVERDUE', 0, '/admin/followups');
  insertNotification.run(1, 'Deal Closed Won!', 'BlueHorizon Logistics closed for ₹3,50,000 (Fyntrust).', 'WON', 0, '/admin/deals');

  // Consultant notifications
  insertNotification.run(2, 'Potential Lead Acknowledged', 'Your submission for Nexus Cloud is under Super Admin review.', 'POTENTIAL_LEAD', 0, '/consultant/potential');
  insertNotification.run(2, 'Overdue Follow-up Reminder', 'Follow-up with GreenMatrix Renewables is overdue!', 'FOLLOWUP_OVERDUE', 0, '/consultant/followups');
  insertNotification.run(2, 'Daily Calling Target Update', 'Daily target set to 25 calls / 50 leads for today.', 'TARGET_UPDATE', 0, '/consultant/dashboard');

  // 18. Seed Audit Logs
  const insertAudit = db.prepare(`
    INSERT OR IGNORE INTO audit_logs (user_id, user_email, user_role, action, entity_type, entity_id, old_values_json, new_values_json, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAudit.run(1, 'admin@dizibrand.com', 'SUPER_ADMIN', 'IMPORT_BATCH', 'import_batches', '1', null, JSON.stringify({ batch_id: 'MCA-01SEP2026-BATCH-001', rows: 250 }), '127.0.0.1', 'Mozilla/5.0 CRM Admin Client');
  insertAudit.run(1, 'admin@dizibrand.com', 'SUPER_ADMIN', 'ASSIGN_LEAD', 'leads', '1', null, JSON.stringify({ assigned_to: 'rahul@dizibrand.com' }), '127.0.0.1', 'Mozilla/5.0 CRM Admin Client');
  insertAudit.run(2, 'rahul@dizibrand.com', 'CONSULTANT', 'LOG_CALL', 'calls', '1', null, JSON.stringify({ outcome: 'QUALIFIED', duration: 420 }), '127.0.0.1', 'Mobile Chrome');
  insertAudit.run(2, 'rahul@dizibrand.com', 'CONSULTANT', 'POTENTIAL_HANDOVER', 'potential_handovers', '1', null, JSON.stringify({ company: 'Nexus Cloud Innovations Pvt Ltd' }), '127.0.0.1', 'Mobile Chrome');
  insertAudit.run(1, 'admin@dizibrand.com', 'SUPER_ADMIN', 'CLOSE_DEAL_WON', 'deals', '1', null, JSON.stringify({ deal_value: 350000, business: 'Fyntrust' }), '127.0.0.1', 'Desktop Chrome');

  console.log('CRM Database seeded successfully with users, businesses, sources, leads, timeline, deals, and audit trails.');
}

// Auto-run if executed directly
if (process.argv[1]?.includes('seed')) {
  seedDatabase();
}
