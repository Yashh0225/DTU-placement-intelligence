/**
 * Context Builder for RAG Pipeline
 * Constructs strictly separated and labeled context blocks from retrieved data sources.
 */
export const buildRAGContext = (retrievalResult) => {
  const { retrievedData, userQuery } = retrievalResult;
  const sections = [];

  // Header
  sections.push(`USER QUESTION:\n${userQuery}\n`);

  // Section 1: Historical Placement Job Announcements
  if (retrievedData.jobs && retrievedData.jobs.length > 0) {
    sections.push('=== HISTORICAL JOB DATA (OFFICIAL ANNOUNCEMENTS) ===');
    retrievedData.jobs.forEach((job, idx) => {
      const details = [
        `Record ID: [Job #${job.sourceId}]`,
        `Company: ${job.company}`,
        `Role: ${job.role}`,
        `Type: ${job.type}`,
        job.ctc ? `CTC: ${job.ctc} LPA` : null,
        job.stipend ? `Stipend: ${job.stipend}` : null,
        job.eligibleBranches?.length > 0 ? `Eligible Branches: ${job.eligibleBranches.join(', ')}` : null,
        job.minCgpa ? `Minimum CGPA: ${job.minCgpa}` : null,
        job.batch ? `Batch: ${job.batch}` : null,
        job.location?.length > 0 ? `Location: ${job.location.join(', ')}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      sections.push(`${idx + 1}. ${details}`);
      if (job.originalMessage) {
        sections.push(`   Excerpt: "${job.originalMessage.substring(0, 200).replace(/\n/g, ' ')}..."`);
      }
    });
    sections.push('');
  } else {
    sections.push('=== HISTORICAL JOB DATA ===\nNo official placement announcements found for this query.\n');
  }

  // Section 2: Student Interview Experiences
  if (retrievedData.experiences && retrievedData.experiences.length > 0) {
    sections.push('=== STUDENT EXPERIENCES (STUDENT-REPORTED INTERVIEW EXPERIENCES AT DTU) ===');
    retrievedData.experiences.forEach((exp, idx) => {
      const header = `[Experience #${exp.sourceId}] Company: ${exp.company} | Role: ${exp.role} | Year: ${exp.placementYear} | Section: ${exp.section || 'General'}`;
      sections.push(`${idx + 1}. ${header}`);
      sections.push(`   Student Report: "${exp.chunkText.replace(/\n/g, ' ')}"`);
      if (exp.topics?.length > 0) {
        sections.push(`   DSA Topics Mentioned: ${exp.topics.join(', ')}`);
      }
    });
    sections.push('');
  } else {
    sections.push('=== STUDENT EXPERIENCES ===\nNo student interview experiences found for this query.\n');
  }

  // Section 3: LeetCode Preparation Problems
  if (retrievedData.leetcode && retrievedData.leetcode.length > 0) {
    sections.push('=== THIRD-PARTY LEETCODE PREPARATION DATA (PRACTICE ONLY, NOT VERIFIED DTU QUESTIONS) ===');
    retrievedData.leetcode.forEach((q, idx) => {
      const topicsStr = q.topics?.length > 0 ? `[Topics: ${q.topics.join(', ')}]` : '';
      sections.push(
        `${idx + 1}. [LeetCode #${q.problemId || q.sourceId}] ${q.title} | Difficulty: ${q.difficulty} | Company: ${q.company} | Acceptance: ${q.acceptanceRate} ${topicsStr} | Link: ${q.url}`
      );
    });
    sections.push('');
  } else {
    sections.push('=== LEETCODE PREPARATION DATA ===\nNo LeetCode practice problems retrieved.\n');
  }

  // Instructions
  sections.push(`=== GROUNDING INSTRUCTIONS ===
1. Base all DTU placement claims strictly on the provided HISTORICAL JOB DATA and STUDENT EXPERIENCES.
2. Clearly distinguish between:
   - Official announcement data (CTC, branches, eligibility).
   - Student interview experiences (rounds, DSA questions asked at DTU).
   - Third-party LeetCode preparation questions (strictly external practice data).
3. DO NOT invent or extrapolate missing numbers, CTCs, branches, or questions.
4. If the provided evidence has no matching data for any part of the query, explicitly state that DTU historical data is unavailable.
5. Provide citation tags like [Job #<id>], [Experience #<id>], or [LeetCode #<id>] when citing specific records.
`);

  return sections.join('\n');
};
