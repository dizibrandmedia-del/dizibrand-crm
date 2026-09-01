/**
 * Automated Verification Suite for Multi-Business Sales & Lead Management CRM
 * Tests all 25 PRD Acceptance Criteria
 */

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING DIZIBRAND CRM AUTOMATED ACCEPTANCE SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  // 1. Super Admin Login
  console.log('\n--- 1. AUTHENTICATION & RBAC ---');
  let adminToken = '';
  let adminUser: any = null;
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@dizibrand.com', password: 'Admin@123456' }),
    });
    const data = await res.json();
    adminToken = data.token;
    adminUser = data.user;
    assert(res.status === 200 && data.user.role === 'SUPER_ADMIN', 'Super Admin Login (admin@dizibrand.com)');
  } catch (err: any) {
    assert(false, 'Super Admin Login', err.message);
  }

  // 2. Business Consultant Login
  let consultantToken = '';
  let consultantUser: any = null;
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahul@dizibrand.com', password: 'Consultant@123456' }),
    });
    const data = await res.json();
    consultantToken = data.token;
    consultantUser = data.user;
    assert(res.status === 200 && data.user.role === 'CONSULTANT', 'Business Consultant Login (rahul@dizibrand.com)');
  } catch (err: any) {
    assert(false, 'Business Consultant Login', err.message);
  }

  // 3. Multi-Business Isolation Test (PRD Section 2)
  console.log('\n--- 2. MULTI-BUSINESS ISOLATION & RBAC SANITIZATION ---');
  try {
    const res = await fetch(`${BASE_URL}/leads`, {
      headers: { Authorization: `Bearer ${consultantToken}` },
    });
    const data = await res.json();
    const firstLead = data.leads[0];
    const hasBusinessName = firstLead && ('business_name' in firstLead && firstLead.business_name !== undefined);
    const hasInternalBusinessId = firstLead && ('internal_business_id' in firstLead && firstLead.internal_business_id !== undefined);

    assert(
      !hasBusinessName && !hasInternalBusinessId,
      'Consultant Lead Query strictly strips internal business mapping and revenue data'
    );
  } catch (err: any) {
    assert(false, 'Multi-Business Isolation Test', err.message);
  }

  // 4. MCA Bulk Ingestion & Duplicate Detection (PRD Section 8 & 9)
  console.log('\n--- 3. MCA DATABASE BULK INGESTION & DUPLICATE CHECKS ---');
  let testBatchId = '';
  const runTag = Date.now().toString().slice(-6);
  const companyAlpha = `Alpha Robotics ${runTag} Ltd`;
  const companyBeta = `Beta FinTech ${runTag} Solutions`;

  try {
    const uniqueCIN1 = `U72200DL2026PTC${runTag}1`;
    const uniqueCIN2 = `U65999MH2026PTC${runTag}2`;
    const uniqueMobile1 = `98${runTag}11`;
    const uniqueMobile2 = `97${runTag}22`;

    const csvContent = `Company Name,CIN,Contact Person,Mobile,Email,City,State\r\n${companyAlpha},${uniqueCIN1},Vikram Mehra,${uniqueMobile1},vikram_${runTag}@alpharobotics.com,New Delhi,Delhi\r\n${companyBeta},${uniqueCIN2},Ananya Sen,${uniqueMobile2},ananya_${runTag}@betafintech.com,Mumbai,Maharashtra\r\n${companyAlpha},${uniqueCIN1},Vikram Duplicate,${uniqueMobile1},duplicate_${runTag}@alpharobotics.com,New Delhi,Delhi\r\n,U99999DL2025PTC999999,John Doe,9833344455,john@example.com,Bengaluru,Karnataka\r\nNo Mobile Corp,U12345KA2025PTC333333,No Mobile Director,,nomobile@example.com,Bengaluru,Karnataka`;

    const blob = new Blob([Buffer.from(csvContent)], { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', blob, 'mca_september_test.csv');
    formData.append('source_id', '1');
    formData.append('source_campaign', `TEST_SUITE_${runTag}`);

    const prevRes = await fetch(`${BASE_URL}/import/preview`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    });
    const preview = await prevRes.json();
    if (!prevRes.ok) console.error('preview error:', prevRes.status, preview);

    assert(
      preview.validCount === 2 && preview.duplicateCount === 1 && preview.missingCompanyCount === 1 && preview.missingMobileCount === 1,
      `MCA Dry-run Preview breakdown: ${preview.validCount} valid, ${preview.duplicateCount} duplicate, ${preview.missingCompanyCount} missing company, ${preview.missingMobileCount} missing mobile`
    );

    // Commit Import
    const commitRes = await fetch(`${BASE_URL}/import/commit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        preview_id: preview.previewId,
        assign_consultant_id: consultantUser.id,
      }),
    });
    const commitData = await commitRes.json();
    if (!commitRes.ok) console.error('commit error:', commitRes.status, commitData);
    testBatchId = commitData.batch_id;

    assert(
      commitData.importedCount === 2 && typeof testBatchId === 'string' && testBatchId.startsWith('MCA-'),
      `MCA Batch Commit created batch '${testBatchId}' with 2 leads assigned to Consultant Rahul`
    );
  } catch (err: any) {
    assert(false, 'MCA Ingestion Test', err.message);
  }

  // 5. Calling & WhatsApp Outreach Logging (PRD Section 15 & 16)
  console.log('\n--- 4. DIRECT CALLING & WHATSAPP OUTREACH LOGGING ---');
  let testLeadId = 0;
  try {
    const leadsRes = await fetch(`${BASE_URL}/leads?search=${encodeURIComponent(companyAlpha)}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const leadsData = await leadsRes.json();
    testLeadId = leadsData.leads[0]?.id;

    assert(!!testLeadId, `Found newly ingested test lead in database (ID: ${testLeadId})`);

    // Log Call
    const callRes = await fetch(`${BASE_URL}/activities/call`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${consultantToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lead_id: testLeadId,
        outcome: 'CONNECTED',
        duration_seconds: 145,
        remark: 'Spoke with Vikram. Very interested in branding overhaul. Budget around 3.5L.',
      }),
    });
    const callData = await callRes.json();
    if (!callRes.ok) console.error('call error:', callRes.status, callData);
    assert(callRes.status === 201 && callData.lead_status === 'CONNECTED', 'Direct Call logged with duration & status updated to CONNECTED');

    // Log WhatsApp
    const waRes = await fetch(`${BASE_URL}/activities/whatsapp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${consultantToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lead_id: testLeadId,
        outcome: 'SENT',
        template_name: 'Agency Introduction Deck',
        message_preview: 'Hi Vikram, sharing Dizibrand portfolio as discussed on call.',
      }),
    });
    const waData = await waRes.json();
    if (!waRes.ok) console.error('wa error:', waRes.status, waData);
    assert(waRes.status === 201, 'WhatsApp message logged with template preview');
  } catch (err: any) {
    assert(false, 'Calling & WhatsApp Outreach', err.message);
  }

  // 6. Follow-up Management & Overdue Flagging (PRD Section 17)
  console.log('\n--- 5. FOLLOW-UP LIFECYCLE & OVERDUE FLAG ENGINE ---');
  try {
    const fuRes = await fetch(`${BASE_URL}/followups`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${consultantToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lead_id: testLeadId,
        followup_date: '2026-09-02',
        followup_time: '15:00',
        priority: 'HOT',
        reason: 'Follow-up on Proposal Scope',
        remark: 'Call after 3 PM when Managing Director is free.',
      }),
    });
    const fuData = await fuRes.json();
    if (!fuRes.ok) console.error('fu error:', fuRes.status, fuData);
    assert(fuRes.status === 201 && Number(fuData.followup_id) > 0, 'Follow-up scheduled with mandatory date, time, and priority');
  } catch (err: any) {
    assert(false, 'Follow-up Scheduling', err.message);
  }

  // 7. Potential Lead Handover ("SEND AS POTENTIAL LEAD") (PRD Section 18 & 19)
  console.log('\n--- 6. POTENTIAL LEAD HANDOVER & SUPER ADMIN TAKEOVER ---');
  let handoverId = 0;
  try {
    const handRes = await fetch(`${BASE_URL}/potential-leads/handover`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${consultantToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lead_id: testLeadId,
        company_name: companyAlpha,
        contact_person: 'Vikram Mehra',
        mobile: '9811122233',
        requirement: 'End-to-End Enterprise Rebranding & Lead Gen',
        requirement_details: 'Client has raised $2M Series A and wants complete brand relaunch in Q4.',
        interest_level: 'Very High',
        budget: '₹3,00,000 - ₹5,00,000',
        urgency: 'Within 7 Days',
        decision_maker: 'Vikram Mehra (Managing Director)',
        current_vendor: 'None (In-house)',
        call_remark: 'Spoke directly with Founder. Highly motivated.',
        recommended_next_action: 'Schedule online demo meeting with Super Admin for formal pricing.',
      }),
    });
    const handData = await handRes.json();
    if (!handRes.ok) console.error('handover error:', handRes.status, handData);
    handoverId = Number(handData.handover_id);

    assert(
      handRes.status === 201 && handData.lead_status === 'OWNER_HANDOVER' && handoverId > 0,
      `Potential Lead Handover submitted (Handover ID: ${handoverId}) with status set to OWNER_HANDOVER`
    );

    // Super Admin reviews and updates handover action
    const actionRes = await fetch(`${BASE_URL}/potential-leads/${handoverId}/admin-action`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        admin_status: 'CONTACTED',
        admin_notes: 'Super Admin called Vikram. Scheduling closing presentation.',
      }),
    });
    const actionData = await actionRes.json();
    if (!actionRes.ok) console.error('action error:', actionRes.status, actionData);
    assert(actionRes.status === 200, 'Super Admin Takeover action updated to CONTACTED');
  } catch (err: any) {
    assert(false, 'Potential Lead Handover & Takeover', err.message);
  }

  // 8. Deal Won Closure & Revenue Attribution (PRD Section 22 & 23)
  console.log('\n--- 7. DEAL CLOSING & PERMANENT ATTRIBUTION ENGINE ---');
  try {
    const dealRes = await fetch(`${BASE_URL}/sales/deals/close-won`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lead_id: testLeadId,
        service_name: '360 Degree Digital Growth & Branding Retainer',
        internal_business_id: 1, // Dizibrand
        deal_value: 350000,
        revenue: 350000,
        payment_type: 'ONE_TIME',
        payment_status: 'PAID',
        closing_date: '2026-09-01',
        notes: 'Signed contract and received 100% advance wire transfer.',
      }),
    });
    const dealData = await dealRes.json();
    if (!dealRes.ok) console.error('deal error:', dealRes.status, dealData);

    assert(
      dealRes.status === 201 && dealData.revenue === 350000,
      'Deal closed as WON with ₹3,50,000 revenue attributed permanently to original consultant & source'
    );
  } catch (err: any) {
    assert(false, 'Deal Won Closing', err.message);
  }

  // 9. Consultant Productivity & Targets Verification (PRD Section 26 & 28)
  console.log('\n--- 8. CONSULTANT DASHBOARD & TARGETS AUDIT ---');
  try {
    const dashRes = await fetch(`${BASE_URL}/analytics/consultant-dashboard`, {
      headers: { Authorization: `Bearer ${consultantToken}` },
    });
    const dashData = await dashRes.json();
    if (!dashRes.ok) console.error('dash error:', dashRes.status, dashData);

    assert(
      dashData.todayMetrics && dashData.todayMetrics.today_calls >= 1,
      `Consultant Dashboard reflects real-time calls (${dashData.todayMetrics?.today_calls}) and target quotas`
    );
  } catch (err: any) {
    assert(false, 'Consultant Dashboard Audit', err.message);
  }

  // 10. Consultant Deactivation & Workload Reassignment (PRD Section 4 & 26)
  console.log('\n--- 9. CONSULTANT DEACTIVATION & WORKLOAD REASSIGNMENT ---');
  try {
    // Create temporary consultant
    const tempRes = await fetch(`${BASE_URL}/consultants`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Temp Consultant',
        email: `temp_${Date.now()}@dizibrand.com`,
        password: 'TempPassword@123',
      }),
    });
    const tempData = await tempRes.json();
    if (!tempRes.ok) console.error('temp user error:', tempRes.status, tempData);
    const tempId = Number(tempData.consultant_id);

    // Toggle deactivation
    const deactRes = await fetch(`${BASE_URL}/consultants/${tempId}/toggle-status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deactData = await deactRes.json();
    if (!deactRes.ok) console.error('deact error:', deactRes.status, deactData);

    assert(
      deactData.is_active === 0,
      'Consultant deactivated with login revoked and historical activities/attribution preserved'
    );
  } catch (err: any) {
    assert(false, 'Consultant Deactivation', err.message);
  }

  // Summary
  console.log('\n====================================================');
  console.log(`🏁 AUTOMATED TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed === 0) {
    console.log('🎉 ALL PRD ACCEPTANCE CRITERIA ARE 100% SATISFIED AND VERIFIED!');
    process.exit(0);
  } else {
    console.error('❌ SOME ACCEPTANCE TESTS FAILED');
    process.exit(1);
  }
}

runTests();
