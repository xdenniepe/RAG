import { StructuredDraft } from "@/lib/schemas/generation";

export function buildMarketingPrompt(params: {
  brief: string;
  draft: StructuredDraft;
}) {
  const draftJson = JSON.stringify(params.draft, null, 2);

  return `
    You are a hospitality copywriter and wine menu editor.

    Your job is to create a finished, customer-facing wine menu from grounded inputs.

    This is a real restaurant wine menu.
    The output must show all available wines for the restaurant and clearly match each wine to the best food pairing from the merchant's menu.

    User brief:
    ${params.brief}

    Structured draft:
    ${draftJson}

    Rules:
    - Return JSON only. No markdown, no code fences, no commentary.
    - Do not invent wine facts. Use only grounded details from the draft.
    - Include all available wines provided in the draft whenever possible.
    - Organize wines into clear menu sections such as Red Wines, White Wines, Rosé, Sparkling, or By the Glass.
    - Keep copy concise, menu-ready, and easy to scan.
    - For each wine, identify the single best pairing from the merchant's restaurant menu.
    - If supported by the draft, include 1 to 2 alternate pairings.
    - Pairings must reference real dishes from the merchant's menu, not generic dish ideas.
    - Prioritize clarity and usefulness for diners choosing wine with food.
    - Do not include internal labels such as "visual direction", "rationale", "notes", or explanatory text.
    - Do not output page planning language or design instructions.
    - Write like a real restaurant wine menu, not a product card or internal content draft.

    Output must match this exact JSON schema:
    {
      "wineMenu": {
        "title": "string",
        "subtitle": "string",
        "sections": [
          {
            "sectionName": "string",
            "wines": [
              {
                "wineName": "string",
                "wineStyle": "string",
                "description": "string",
                "bestPairing": {
                  "dishName": "string",
                  "pairingText": "string"
                },
                "alternatePairings": ["string"],
                "imageUrl": "https://example.com/image.jpg",
                "imageAlt": "string"
              }
            ]
          }
        ]
      }
    }

    Field constraints:
    - "wineMenu.title": short customer-facing menu title.
    - "wineMenu.subtitle": one concise supporting line in the merchant's tone.
    - "sections": include all relevant wine categories supported by the draft.
    - Each wine must include:
      - "wineName"
      - "wineStyle"
      - "description"
      - "bestPairing"
    - "description": 1 to 2 short sentences max.
    - "bestPairing.dishName": exact restaurant dish name when available.
    - "bestPairing.pairingText": short helpful pairing sentence.
    - "alternatePairings": optional, omit if unsupported.
    - "imageUrl" optional, omit if unavailable.
    - "imageAlt" only when "imageUrl" is included.

    Quality bar:
    - The output should read like a polished restaurant wine list.
    - A diner should be able to scan the menu and quickly decide which wine goes with which dish.
`
.trim();
}
