import { getGeminiModel } from '../gemini/geminiClient.js';
import { retrievalPlanSchema } from './planSchema.js';

const ROUTER_PROMPT = `
You are the Query Understanding and Retrieval Planning Engine for DTU Placement Intelligence.
Analyze the user's placement question and create a strict Retrieval Plan JSON.

Available Data Sources:
1. "jobs": Historical placement announcement database (packages, branches, CGPA, CTC, stipends, roles, companies).
2. "experiences": Student interview experiences at DTU (rounds, interview questions, DSA topics asked, project discussion, tips).
3. "leetcode": Company-tagged LeetCode practice problems (difficulty, frequency, topics, problem links).

INSTRUCTIONS:
1. Return ONLY valid JSON matching the schema below. No markdown fences, no explanations.
2. Determine which source(s) are needed: one, two, or all three.
   - "Which companies offered 15+ LPA?" -> sources: ["jobs"]
   - "What DSA topics were asked in Amazon interviews at DTU?" -> sources: ["experiences"]
   - "Show Amazon medium-level LeetCode questions." -> sources: ["leetcode"]
   - "Which companies offered 15+ LPA, what were their interview experiences at DTU, and what LeetCode questions should I practice?" -> sources: ["jobs", "experiences", "leetcode"]
3. Extract clean search parameters.

JSON Schema:
{
  "userQuery": string,
  "intentSummary": string,
  "sources": ("jobs" | "experiences" | "leetcode")[],
  "plan": {
    "jobs": {
      "enabled": boolean,
      "company": string or null,
      "minCtc": number or null,
      "maxCtc": number or null,
      "branch": string or null,
      "role": string or null,
      "limit": number
    },
    "experiences": {
      "enabled": boolean,
      "queryText": string,
      "company": string or null,
      "role": string or null,
      "year": number or null,
      "limit": number
    },
    "leetcode": {
      "enabled": boolean,
      "company": string or null,
      "difficulty": "Easy" | "Medium" | "Hard" | null,
      "topics": string[] or null,
      "limit": number
    }
  }
}
`;

export const geminiRoute = async (userQuery) => {
  const model = getGeminiModel();
  if (!model) {
    return null;
  }

  try {
    const prompt = `${ROUTER_PROMPT}\n\nUSER QUERY: "${userQuery}"`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    const jsonStr = responseText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(jsonStr);

    return parsed;
  } catch (err) {
    console.warn('[Gemini Router Warning, using deterministic plan]:', err.message);
    return null;
  }
};
