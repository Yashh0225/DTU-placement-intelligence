import { getGeminiModel } from './geminiClient.js';
import { normalizeCompanyName } from '../../utils/normalize.js';

const JOB_EXTRACTION_SYSTEM_PROMPT = `
You are an expert recruitment parser for university campus placement announcements at Delhi Technological University (DTU).
Extract structured placement announcement details from the provided message.

CRITICAL INSTRUCTIONS:
1. Return ONLY a valid JSON object matching the schema below. Do NOT include markdown code blocks or extra text.
2. DO NOT invent or assume missing information. If a field is not explicitly mentioned or clearly implied, set it to null or empty list.
3. For Company: Often the first line of the announcement contains the company name, e.g. "*STRIDE AMC (SEED Programme) | 6M+PPO | 2027 *" -> company is "STRIDE AMC". Strip programme names like (SEED Programme) into ctcBreakup or notes if needed.
4. For Roles: Announcements may list multiple roles separated by commas (e.g. "*Roles:* Associate Product Manager,DevOps Engineer Trainee,QA Automation Engineer"). Extract all roles as a clean comma-separated string.
5. For CTC:
   - Extract numeric value in LPA (Lakhs Per Annum). E.g., "18 LPA" -> 18, "45.03 LPA" -> 45.03.
   - If a range is given (e.g., "10-15 LPA"), set "ctc" to the lower or average bound (e.g., 10 or 12.5), and put the full range "10-15 LPA" in "ctcBreakup".
   - If only monthly stipend is mentioned (e.g. "50k pm"), set "ctc" to null and "stipend" to "50k pm".
6. For Cutoff / CGPA:
   - Extract "minCgpa" as a number. If it explicitly says "CGPA: 0" or "No cutoff", set "minCgpa" to 0. If "CGPA: 7.5", set to 7.5.
   - Extract "class10Percentage" and "class12Percentage" if mentioned (e.g., "10th: 0 , 12th:0" -> 0, "10th: 75%" -> 75).
   - "allowedBacklogs": If message says "Active Backlogs are not allowed" or "0 backlogs", set to 0.
7. For Type & PPO:
   - Identify whether the opening is: "internship", "full-time", "internship+fte", or "other".
   - If message mentions "6M+PPO", "6 Months + PPO", "Internship + FTE", set type to "internship+fte" and "ppo" to true.
8. For Branches:
   - Include all eligible degrees and disciplines: BTech (COE, CSE, IT, SE, MC, MCE, ECE, EE, EP, ME, CE, ENE, MAM, BT, CSE MINOR), MTech (SWE, CSE, DSC, AFI, ITY, CYS), B.Des, M.Des, MBA.
9. For Application Deadline:
   - Extract the deadline string if mentioned (e.g. "22nd November , 8:00 PM").

JSON Schema:
{
  "company": string or null,
  "role": string or null,
  "type": "internship" | "full-time" | "internship+fte" | "other",
  "eligibleBranches": string[],
  "minCgpa": number or null,
  "class10Percentage": number or null,
  "class12Percentage": number or null,
  "allowedBacklogs": number or null,
  "batch": string or null,
  "stipend": string or null,
  "ctc": number or null,
  "ctcBreakup": string or null,
  "ppo": boolean,
  "location": string[],
  "applicationDeadline": string or null
}
`;

/**
 * Deterministic fallback extractor for DTU WhatsApp announcement patterns
 */
export const deterministicJobExtract = (text) => {
  const clean = text.trim();
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Company Extraction:
  // Check for Header pattern: *COMPANY NAME (Optional Details) | 6M+PPO | 2027*
  let company = 'Unknown Company';
  const firstLine = lines[0] || '';
  const headerPipeMatch = firstLine.match(/^\*?([A-Za-z0-9&.\s]+?)(?:\s*\([^)]*\))?\s*\|/);
  if (headerPipeMatch && headerPipeMatch[1].trim().length > 1) {
    company = headerPipeMatch[1].trim().replace(/^\*+|\*+$/g, '');
  } else {
    const explicitCompMatch = clean.match(/(?:company|hiring|recruitment|for)\*?\s*[:\-]?\s*([A-Za-z0-9&.\s]{2,40})/i) ||
      clean.match(/^([A-Za-z0-9&.\s]{2,30})\s+(?:is hiring|Placement|Campus)/i);
    if (explicitCompMatch) company = explicitCompMatch[1].trim().replace(/^\*+|\*+$/g, '');
  }

  // 2. Role Extraction:
  // Handle patterns like: *Roles:* Associate Product Manager... or *Role*: SDE
  let role = 'Software Engineer';
  const rolesMatch = clean.match(/\*?(?:roles?|profiles?|positions?):?\*?[\s:\-]*([^\n\r]+)/i);
  if (rolesMatch && rolesMatch[1].trim() && !/^[:\-*\s]+$/.test(rolesMatch[1])) {
    role = rolesMatch[1].replace(/^\*+|\*+$/g, '').trim();
  } else {
    const roleKeywordMatch = clean.match(/\b(SDE[- ]?1?|Software Engineer|Analyst|Associate Product Manager|DevOps|UI\/UX|Consultant|Graduate Engineer Trainee|GET)\b/i);
    if (roleKeywordMatch) role = roleKeywordMatch[1].trim();
  }

  // 3. CTC & CTC Breakup:
  // Handle *CTC (in case of PPO)* : 10-15 LPA or CTC: 12 LPA
  const ctcRangeMatch = clean.match(/(?:ctc|package)[^*:\n\r]*\*?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakh|lakhs)/i);
  let ctc = null;
  let ctcBreakup = null;
  if (ctcRangeMatch) {
    ctc = parseFloat(ctcRangeMatch[1]);
    ctcBreakup = `${ctcRangeMatch[1]}-${ctcRangeMatch[2]} LPA`;
  } else {
    const ctcMatch = clean.match(/(?:ctc|package)[^*:\n\r]*\*?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakh|lakhs)/i) ||
      clean.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:LPA|lpa)/i) ||
      clean.match(/(\d+(?:\.\d+)?)\s*(?:LPA|lpa|Lakh|Lakhs)/i);
    if (ctcMatch) {
      if (ctcMatch[2]) {
        ctc = parseFloat(ctcMatch[1]);
        ctcBreakup = `${ctcMatch[1]}-${ctcMatch[2]} LPA`;
      } else {
        ctc = parseFloat(ctcMatch[1]);
        ctcBreakup = `${ctc} LPA CTC`;
      }
    }
  }

  // 4. Stipend:
  const stipendMatch = clean.match(/\*?stipend:?\*?[\s:\-]*([0-9kK,\s]+(?:\/month|pm|per month)?)/i);
  const stipend = stipendMatch ? stipendMatch[1].trim().replace(/^\*+|\*+$/g, '') : null;

  // 5. Cutoff (CGPA, 10th, 12th):
  const cgpaMatch = clean.match(/(?:cgpa|cg|gpa)\s*[:\->=]?\s*(\d+(?:\.\d+)?)/i);
  const minCgpa = cgpaMatch ? parseFloat(cgpaMatch[1]) : null;

  const class10Match = clean.match(/10th\s*[:\->=]?\s*(\d+(?:\.\d+)?)/i);
  const class10Percentage = class10Match ? parseFloat(class10Match[1]) : null;

  const class12Match = clean.match(/12th\s*[:\->=]?\s*(\d+(?:\.\d+)?)/i);
  const class12Percentage = class12Match ? parseFloat(class12Match[1]) : null;

  const allowedBacklogs = /active backlogs are not allowed|no backlogs|0 backlogs/i.test(clean) ? 0 : null;

  // 6. Eligible Branches:
  const allBranchesList = [
    'COE', 'CSE', 'IT', 'SE', 'MC', 'MCE', 'ECE', 'EE', 'EP', 'ME', 'CE', 'ENE', 'MAM', 'BT',
    'CSE MINOR', 'SWE', 'DSC', 'AFI', 'ITY', 'CYS', 'B.DES', 'M.DES', 'MBA'
  ];
  const eligibleBranches = [];
  for (const b of allBranchesList) {
    if (new RegExp(`(?:\\b|_|\\*)${b.replace('.', '\\.')}(?:\\b|_|\\*)`, 'i').test(clean)) {
      eligibleBranches.push(b);
    }
  }

  // 7. Batch:
  const batchMatch = clean.match(/\b(202[3-9])\b/);
  const batch = batchMatch ? batchMatch[1] : null;

  // 8. Type and PPO:
  const isPPO = /\bppo\b|6m\+ppo/i.test(clean);
  const is6M = /6m|6 months/i.test(clean);
  const isIntern = /\bintern(?:ship)?\b/i.test(clean);
  let type = 'full-time';
  if (is6M || (isIntern && isPPO)) {
    type = 'internship+fte';
  } else if (isIntern) {
    type = 'internship';
  }

  // 9. Location:
  const locationList = ['Delhi', 'Noida', 'Gurugram', 'Gurgaon', 'Bangalore', 'Bengaluru', 'Hyderabad', 'Pune', 'Mumbai'];
  const locations = locationList.filter(loc => new RegExp(`\\b${loc}\\b`, 'i').test(clean));

  // 10. Deadline:
  const deadlineMatch = clean.match(/\*?deadline:?\*?[\s:\-]*([^\n\r*]+)/i);
  const applicationDeadline = deadlineMatch ? deadlineMatch[1].trim().replace(/^\*+|\*+$/g, '') : null;

  return {
    company,
    role,
    type,
    eligibleBranches: eligibleBranches.length > 0 ? eligibleBranches : ['COE', 'IT', 'SE'],
    minCgpa,
    class10Percentage,
    class12Percentage,
    allowedBacklogs,
    batch,
    stipend,
    ctc,
    ctcBreakup: ctcBreakup || (ctc ? `${ctc} LPA` : null),
    ppo: isPPO,
    location: locations.length > 0 ? locations : ['Delhi NCR'],
    applicationDeadline,
  };
};

export const extractJobFromAnnouncement = async (rawMessage) => {
  if (!rawMessage || typeof rawMessage !== 'string') {
    throw new Error('Announcement message text is required');
  }

  const model = getGeminiModel();
  if (!model) {
    // Return deterministic extraction when Gemini API key is not configured
    return deterministicJobExtract(rawMessage);
  }

  try {
    const prompt = `${JOB_EXTRACTION_SYSTEM_PROMPT}\n\nANNOUNCEMENT MESSAGE:\n${rawMessage}`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Clean JSON markdown markers if any
    const jsonStr = responseText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(jsonStr);

    return {
      company: parsed.company || 'Unknown Company',
      role: parsed.role || 'Software Engineer',
      type: parsed.type || 'full-time',
      eligibleBranches: Array.isArray(parsed.eligibleBranches) ? parsed.eligibleBranches : [],
      minCgpa: typeof parsed.minCgpa === 'number' ? parsed.minCgpa : null,
      class10Percentage: typeof parsed.class10Percentage === 'number' ? parsed.class10Percentage : null,
      class12Percentage: typeof parsed.class12Percentage === 'number' ? parsed.class12Percentage : null,
      allowedBacklogs: typeof parsed.allowedBacklogs === 'number' ? parsed.allowedBacklogs : 0,
      batch: parsed.batch ? String(parsed.batch) : null,
      stipend: parsed.stipend ? String(parsed.stipend) : null,
      ctc: typeof parsed.ctc === 'number' ? parsed.ctc : null,
      ctcBreakup: parsed.ctcBreakup ? String(parsed.ctcBreakup) : null,
      ppo: Boolean(parsed.ppo),
      location: Array.isArray(parsed.location) ? parsed.location : [],
      applicationDeadline: parsed.applicationDeadline || null,
    };
  } catch (err) {
    console.warn('[Gemini Job Extraction Error, falling back to deterministic parser]:', err.message);
    return deterministicJobExtract(rawMessage);
  }
};
