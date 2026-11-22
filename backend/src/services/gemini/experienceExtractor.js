import { getGeminiModel } from './geminiClient.js';

const EXPERIENCE_EXTRACTION_PROMPT = `
You are an expert interview analyzer for DTU students.
Analyze the following student interview narrative and extract structured details.

CRITICAL INSTRUCTIONS:
1. Return ONLY a valid JSON object matching the schema below. No markdown fences, no explanatory text.
2. DO NOT hallucinate missing details. Extract strictly what is mentioned or strongly indicated.
3. Separate interview rounds chronologically (e.g. Round 1: OA, Round 2: Technical, Round 3: HR).
4. Identify all DSA topics (e.g. Dynamic Programming, Trees, Graphs, Trie, Sliding Window, Greedy, Backtracking, Binary Search, Arrays).
5. Identify CS fundamentals (e.g. OS, DBMS, OOPs, Computer Networks, System Design).
6. Determine difficulty: "Easy", "Medium", "Hard", or "Variable".

JSON Schema:
{
  "roundsCount": number,
  "rounds": [
    {
      "roundNumber": number,
      "roundName": string,
      "roundType": "OA" | "Technical" | "System Design" | "HR" | "Managerial",
      "topicsCovered": string[],
      "questions": string[],
      "description": string
    }
  ],
  "dsaTopics": string[],
  "csFundamentals": string[],
  "projectDiscussion": string,
  "hrQuestions": string[],
  "difficulty": "Easy" | "Medium" | "Hard" | "Variable",
  "overallVerdict": "Selected" | "Rejected" | "Waitlisted" | "Undisclosed"
}
`;

/**
 * Deterministic fallback extractor for local testing or offline use.
 */
export const deterministicExperienceExtract = (narrative) => {
  const text = narrative.trim();

  const dsaKeywords = [
    'Arrays', 'Strings', 'Linked List', 'Trees', 'Binary Tree', 'BST', 'Graphs',
    'Dynamic Programming', 'DP', 'Recursion', 'Backtracking', 'Stack', 'Queue',
    'Heap', 'Priority Queue', 'Trie', 'Sliding Window', 'Two Pointers', 'Binary Search',
    'Greedy', 'Bit Manipulation', 'BFS', 'DFS'
  ];

  const csKeywords = [
    'OS', 'Operating Systems', 'DBMS', 'Database Management', 'OOPs',
    'Computer Networks', 'CN', 'System Design', 'SQL', 'Multithreading'
  ];

  const foundDsa = dsaKeywords.filter((topic) =>
    new RegExp(`\\b${topic.replace('+', '\\+')}\\b`, 'i').test(text)
  );

  const foundCs = csKeywords.filter((topic) =>
    new RegExp(`\\b${topic}\\b`, 'i').test(text)
  );

  // Detect rounds
  const rounds = [];
  const roundMatches = text.split(/(?:round\s*(\d+)|\b(?:oa|online assessment)\b)/i);

  if (/online assessment|oa|hackerrank|mettl|test/i.test(text)) {
    rounds.push({
      roundNumber: 1,
      roundName: 'Online Assessment',
      roundType: 'OA',
      topicsCovered: foundDsa.slice(0, 2),
      questions: [],
      description: 'Online coding round on assessment platform.',
    });
  }

  if (/interview|technical round|f2f|zoom/i.test(text)) {
    rounds.push({
      roundNumber: rounds.length + 1,
      roundName: 'Technical Interview',
      roundType: 'Technical',
      topicsCovered: foundDsa.slice(2),
      questions: [],
      description: 'Technical discussion on DSA and core computer science concepts.',
    });
  }

  if (/hr|behavioral|cultural fit/i.test(text)) {
    rounds.push({
      roundNumber: rounds.length + 1,
      roundName: 'HR / Behavioral Round',
      roundType: 'HR',
      topicsCovered: [],
      questions: ['Tell me about yourself', 'Why this company?'],
      description: 'Behavioral and situational discussion.',
    });
  }

  if (rounds.length === 0) {
    rounds.push({
      roundNumber: 1,
      roundName: 'Overall Interview',
      roundType: 'Technical',
      topicsCovered: foundDsa,
      questions: [],
      description: 'Complete interview rounds process.',
    });
  }

  const isSelected = /\bselected|got the offer|offer received|accepted\b/i.test(text);
  const isRejected = /\brejected|not selected|eliminated\b/i.test(text);

  return {
    roundsCount: rounds.length,
    rounds,
    dsaTopics: foundDsa,
    csFundamentals: foundCs,
    projectDiscussion: /project|resume|react|node|internship/i.test(text)
      ? 'Discussed candidate projects, architecture, and tech stack.'
      : '',
    hrQuestions: /hr|behavioral/i.test(text) ? ['Why join our company?', 'Tell me about yourself'] : [],
    difficulty: /hard|tough|difficult/i.test(text)
      ? 'Hard'
      : /easy|simple|straightforward/i.test(text)
      ? 'Easy'
      : 'Medium',
    overallVerdict: isSelected ? 'Selected' : isRejected ? 'Rejected' : 'Selected',
  };
};

export const extractExperienceFromNarrative = async (narrative) => {
  if (!narrative || typeof narrative !== 'string') {
    throw new Error('Interview narrative text is required');
  }

  const model = getGeminiModel();
  if (!model) {
    return deterministicExperienceExtract(narrative);
  }

  try {
    const prompt = `${EXPERIENCE_EXTRACTION_PROMPT}\n\nSTUDENT NARRATIVE:\n${narrative}`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    const jsonStr = responseText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(jsonStr);

    return {
      roundsCount: typeof parsed.roundsCount === 'number' ? parsed.roundsCount : (parsed.rounds?.length || 0),
      rounds: Array.isArray(parsed.rounds) ? parsed.rounds : [],
      dsaTopics: Array.isArray(parsed.dsaTopics) ? parsed.dsaTopics : [],
      csFundamentals: Array.isArray(parsed.csFundamentals) ? parsed.csFundamentals : [],
      projectDiscussion: parsed.projectDiscussion || '',
      hrQuestions: Array.isArray(parsed.hrQuestions) ? parsed.hrQuestions : [],
      difficulty: ['Easy', 'Medium', 'Hard', 'Variable'].includes(parsed.difficulty) ? parsed.difficulty : 'Medium',
      overallVerdict: parsed.overallVerdict || 'Selected',
    };
  } catch (err) {
    console.warn('[Gemini Experience Extraction Error, falling back to deterministic]:', err.message);
    return deterministicExperienceExtract(narrative);
  }
};
