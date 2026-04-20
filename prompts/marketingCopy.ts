import { StructuredDraft } from "@/lib/schemas/generation";

export function buildMarketingPrompt(params: {
  brief: string;
  draft: StructuredDraft;
}) {
  const draftJson = JSON.stringify(params.draft, null, 2);

  return `
  You are a hospitality copywriter and menu designer.

Your job is to CREATE a finished, customer-facing wine menu layout — not describe it.

---

User brief:
${params.brief}

Structured draft:
${draftJson}

---

CORE OBJECTIVE:
Produce a polished, ready-to-render wine menu page that:
- Feels like a real restaurant menu or marketing page
- Matches the restaurant’s tone and brand
- Aligns wines with the restaurant’s food
- Is clean, structured, and visually intuitive

---

STRICT RULES:

- Do NOT explain anything
- Do NOT include labels like “Visual direction”, “Rationale”, or “Notes”
- Do NOT describe what should be done
- ONLY produce final content as it would appear to a customer

- Keep language concise and premium
- Avoid generic phrases
- Do not invent wine facts

---

OUTPUT STYLE:

Think in real UI sections:
- Headline / hero
- Short intro
- Wine sections
- Pairings integrated naturally
- Featured highlight (if relevant)

Make it feel like:
👉 a menu page
👉 a website section
👉 something a restaurant would actually use

---

RETURN JSON ONLY:

{
  "page": {
    "hero": {
      "headline": "string",
      "subheadline": "string"
    },

    "intro": "short paragraph",

    "wineSections": [
      {
        "title": "e.g. By the Glass / Featured Selection",

        "items": [
          {
            "wineName": "string",
            "description": "short, elegant menu copy",
            "pairing": "natural inline pairing sentence"
          }
        ]
      }
    ],

    "featuredBlock": {
      "headline": "optional",
      "text": "short promotional copy"
    }
  }
}
`
.trim();
}
