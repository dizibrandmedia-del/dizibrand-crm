// Centralized Business-Wise WhatsApp Greeting & Message Template Service

export type BusinessKey = 'fyntrust' | 'dizibrand_media' | 'strategic_hr' | 'no_brokerage';

export interface TemplateParams {
  clientName?: string;
  consultantName?: string;
  companyName?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  businessName?: string;
}

export interface BusinessTemplateDefinition {
  key: string;
  title: string;
  text: string;
}

// 1. Business Normalization Layer
export function normalizeBusinessKey(
  business: { id?: number | string; name?: string; code?: string } | string | null | undefined
): BusinessKey {
  if (!business) return 'fyntrust';

  const idStr = typeof business === 'object' ? String(business.id || '') : '';
  const nameStr = (
    typeof business === 'object' ? (business.name || business.code || '') : String(business)
  ).toLowerCase().trim();

  // DiziBrand Media (ID 1, DIZI)
  if (idStr === '1' || nameStr.includes('dizi') || nameStr.includes('brand')) {
    return 'dizibrand_media';
  }

  // Strategic HR (ID 2, STRAT_HR)
  if (idStr === '2' || nameStr.includes('strat') || nameStr.includes('hr') || nameStr.includes('skilltech')) {
    return 'strategic_hr';
  }

  // FynTrust (ID 3, FYN)
  if (idStr === '3' || nameStr.includes('fyn') || nameStr.includes('trust')) {
    return 'fyntrust';
  }

  // No Brokerage (ID 4, NO_BROK)
  if (idStr === '4' || nameStr.includes('broker') || nameStr.includes('nobrok')) {
    return 'no_brokerage';
  }

  return 'fyntrust';
}

// 2. Official Business Display Names
export const BUSINESS_NAMES: Record<BusinessKey, string> = {
  fyntrust: 'FynTrust',
  dizibrand_media: 'DiziBrand Media',
  strategic_hr: 'Strategic HR',
  no_brokerage: 'No Brokerage',
};

export function getBusinessDisplayName(key: BusinessKey): string {
  return BUSINESS_NAMES[key] || 'FynTrust';
}

// Helper: Format Date & Time safely
function formatDiscussionSchedule(dateStr?: string, timeStr?: string): string {
  let formattedDate = '';
  let formattedTime = '';

  if (dateStr && dateStr.trim()) {
    try {
      const d = new Date(dateStr.trim().includes('T') ? dateStr : `${dateStr.trim()}T00:00:00`);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      } else {
        formattedDate = dateStr.trim();
      }
    } catch {
      formattedDate = dateStr.trim();
    }
  }

  if (timeStr && timeStr.trim()) {
    formattedTime = timeStr.trim();
  }

  if (formattedDate && formattedTime) {
    return `is scheduled for ${formattedDate} at ${formattedTime}`;
  } else if (formattedDate) {
    return `is scheduled for ${formattedDate}`;
  } else if (formattedTime) {
    return `is scheduled for ${formattedTime}`;
  } else {
    return 'is scheduled for our upcoming call';
  }
}

// 3. Centralized Template Generator
export function getBusinessTemplates(
  businessKey: BusinessKey,
  params: TemplateParams
): Record<string, BusinessTemplateDefinition> {
  const clientName = params.clientName?.trim() || 'Sir/Madam';
  const consultantName = params.consultantName?.trim() || 'Business Consultant';
  const companyName = params.companyName?.trim() || 'your company';
  const officialBizName = BUSINESS_NAMES[businessKey] || params.businessName?.trim() || 'FynTrust';
  const scheduleText = formatDiscussionSchedule(params.scheduledDate, params.scheduledTime);

  // Common Signature
  const signature = `Warm regards,\n${consultantName}\n${officialBizName}`;

  switch (businessKey) {
    case 'fyntrust':
      return {
        intro: {
          key: 'intro',
          title: 'Official Greeting & Overview',
          text: `Hello ${clientName}, this is ${consultantName} from FynTrust.\n\nWe work with MSMEs and growing businesses for Accounting, GST & Tax, ROC/MCA Compliance, MIS & Financial Reporting, Payroll, Business Consulting and Virtual CFO support.\n\nWe have a professional CA/CS/CFO network across Lucknow, Delhi NCR, Mumbai, Varanasi and other locations.\n\nWe first understand your business and requirements and then help you connect with a suitable professional with relevant industry experience.\n\nIf you're currently looking to streamline your finance, accounts or compliance, I'd be happy to understand your requirement.\n\nWould it be okay if I share a brief overview?\n\n${signature}`,
        },
        follow_up: {
          key: 'follow_up',
          title: 'Follow-up on Finance & Compliance',
          text: `Hello ${clientName}, this is ${consultantName} from FynTrust.\n\nFollowing up on our earlier discussion regarding financial, accounting, and compliance support for ${companyName}. Did you get a chance to review the details?\n\nPlease let me know if you would like to connect for a quick 5-minute call.\n\n${signature}`,
        },
        meeting_confirm: {
          key: 'meeting_confirm',
          title: 'Consultation Call Confirmation',
          text: `Hello ${clientName}, this is ${consultantName} from FynTrust.\n\nConfirming our upcoming financial advisory discussion regarding ${companyName}. Our session ${scheduleText}.\n\nLooking forward to speaking with you.\n\n${signature}`,
        },
      };

    case 'dizibrand_media':
      return {
        intro: {
          key: 'intro',
          title: 'Official Discussion Confirmation',
          text: `Hi ${clientName}, thank you for connecting with DiziBrand Media.\n\nYour discussion ${scheduleText}.\n\nDuring the meeting, we’ll understand your current business model, digital presence, target audience, challenges and growth objectives, and accordingly discuss the most suitable strategy.\n\nLooking forward to speaking with you.\n\n${signature}`,
        },
        follow_up: {
          key: 'follow_up',
          title: 'Follow-up on Brand & Growth Strategy',
          text: `Hi ${clientName}, this is ${consultantName} from DiziBrand Media.\n\nFollowing up regarding our discussion on digital presence and growth strategy for ${companyName}. We would be thrilled to help accelerate your brand's digital reach.\n\nLet me know when we can take this forward.\n\n${signature}`,
        },
        pitch_deck: {
          key: 'pitch_deck',
          title: 'Share Digital Portfolio & Case Studies',
          text: `Hi ${clientName}, as promised, sharing DiziBrand Media's portfolio and growth case studies for ${companyName}.\n\nLet us know a convenient time to walk you through our tailored roadmap.\n\n${signature}`,
        },
      };

    case 'strategic_hr':
      return {
        intro: {
          key: 'intro',
          title: 'Official HR & Talent Outreach',
          text: `Hello ${clientName}, this is ${consultantName} from Strategic HR.\n\nWe work with growing businesses for Recruitment, Staffing, Leadership Hiring and HR Solutions.\n\nI came across ${companyName} and wanted to understand if you have any current or upcoming hiring or HR requirements where we could support you.\n\nOur team first understands your business, industry and specific requirement, and accordingly works on the right talent solution.\n\nWould you be open to a short discussion to explore if we can support your business?\n\n${signature}`,
        },
        follow_up: {
          key: 'follow_up',
          title: 'Follow-up on Hiring Requirements',
          text: `Hello ${clientName}, this is ${consultantName} from Strategic HR.\n\nFollowing up to see if ${companyName} has any active talent acquisition or HR advisory needs this quarter. We'd be glad to share pre-vetted profiles tailored to your industry.\n\nLooking forward to connecting.\n\n${signature}`,
        },
        meeting_confirm: {
          key: 'meeting_confirm',
          title: 'HR Discussion Confirmation',
          text: `Hello ${clientName}, confirming our upcoming discussion regarding talent solutions for ${companyName}. Our meeting ${scheduleText}.\n\nLooking forward to speaking with you.\n\n${signature}`,
        },
      };

    case 'no_brokerage':
      return {
        intro: {
          key: 'intro',
          title: 'Official Direct Owner Property Outreach',
          text: `मैं ${consultantName} ${companyName} से बात कर रहा/रही हूँ।\n\nहम Direct Owner Properties – No Brokerage के साथ काम करते हैं और genuine buyers/investors की property requirements को suitable properties से connect करने में सहायता करते हैं।\n\nअगर आपके पास कोई Residential, Commercial, Plot/Land या Investment Property sale के लिए available है, तो आप उसकी basic details हमारे साथ share कर सकते हैं।\n\nहम आपकी property की location, type, size, expected price और other details समझकर relevant buyer requirements के साथ match करने का प्रयास करते हैं।\n\nहमारा focus direct owner और genuine buyer के बीच transparent communication पर रहता है।\n\n${signature}`,
        },
        follow_up: {
          key: 'follow_up',
          title: 'Follow-up on Property Details',
          text: `नमस्ते ${clientName}, मैं ${consultantName} No Brokerage से बात कर रहा/रही हूँ।\n\nक्या आप अपनी property की details (location, type, expected price) हमारे साथ share करना चाहेंगे ताकि हम relevant genuine buyers से connect कर सकें?\n\nधन्यवाद,\n${consultantName}\nNo Brokerage`,
        },
        meeting_confirm: {
          key: 'meeting_confirm',
          title: 'Property Consultation Confirmation',
          text: `नमस्ते ${clientName}, हमारी property consultation चर्चा ${scheduleText} निर्धारित है।\n\nआपसे बातचीत के लिए उत्सुक हैं।\n\n${signature}`,
        },
      };

    default:
      return {
        intro: {
          key: 'intro',
          title: 'Official Introduction',
          text: `Hello ${clientName}, this is ${consultantName} from ${officialBizName}.\n\nWe work with growing businesses to provide specialized corporate advisory and business solutions for ${companyName}.\n\nWould you be open for a brief discussion this week?\n\n${signature}`,
        },
      };
  }
}
