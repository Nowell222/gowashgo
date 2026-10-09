import type { ClothingType, FabricType, ColorCategory, WashRecommendation } from '@/lib/types';

interface WashRecommendationInput {
  clothing_type: ClothingType;
  fabric_type: FabricType;
  color_category: ColorCategory;
  has_stains: boolean;
  stain_description?: string;
}

/**
 * Rules-based wash recommendation engine.
 * No LLM call — deterministic decision matrix based on clothing/fabric/color properties.
 *
 * Future upgrade path: swap internals for an LLM call for stain analysis,
 * keeping the same interface.
 */
export function getWashRecommendation(input: WashRecommendationInput): WashRecommendation {
  const { clothing_type, fabric_type, color_category, has_stains } = input;

  // Default recommendation
  let wash_program: WashRecommendation['wash_program'] = 'normal';
  let water_temp: WashRecommendation['water_temp'] = 'warm';
  const special_handling: string[] = [];
  const notes_parts: string[] = [];

  // --- Fabric-based rules (highest priority) ---
  if (fabric_type === 'silk') {
    wash_program = 'delicate';
    water_temp = 'cold';
    special_handling.push('mesh_bag', 'no_bleach', 'no_tumble_dry');
    notes_parts.push('Silk requires gentle cold wash in a mesh bag.');
  } else if (fabric_type === 'wool') {
    wash_program = 'delicate';
    water_temp = 'cold';
    special_handling.push('no_bleach', 'flat_dry');
    notes_parts.push('Wool should be washed cold and dried flat to prevent shrinkage.');
  } else if (fabric_type === 'linen') {
    wash_program = 'delicate';
    water_temp = 'warm';
    special_handling.push('no_bleach');
    notes_parts.push('Linen is gentle — warm delicate wash recommended.');
  } else if (fabric_type === 'denim') {
    wash_program = 'normal';
    water_temp = 'cold';
    special_handling.push('inside_out', 'separate_wash');
    notes_parts.push('Denim should be turned inside out and washed cold to prevent fading.');
  }

  // --- Clothing type rules ---
  if (clothing_type === 'delicate') {
    wash_program = 'hand_wash';
    water_temp = 'cold';
    if (!special_handling.includes('mesh_bag')) special_handling.push('mesh_bag');
    notes_parts.push('Delicate items require hand wash or gentle cycle.');
  } else if (clothing_type === 'bedsheet' || clothing_type === 'towel') {
    wash_program = 'heavy_duty';
    if (water_temp !== 'cold') water_temp = 'warm'; // Don't override cold for special fabrics
    notes_parts.push(`${clothing_type === 'bedsheet' ? 'Bedsheets' : 'Towels'} can handle a heavy duty wash.`);
  } else if (clothing_type === 'jacket') {
    if (fabric_type === 'synthetic_blend' || fabric_type === 'polyester') {
      wash_program = 'normal';
      water_temp = 'cold';
    } else {
      wash_program = 'delicate';
      water_temp = 'cold';
    }
    notes_parts.push('Jackets should be checked for special care labels.');
  }

  // --- Color-based rules ---
  if (color_category === 'white') {
    if (fabric_type === 'cotton' || fabric_type === 'polyester' || fabric_type === 'synthetic_blend') {
      water_temp = 'hot';
      notes_parts.push('White cotton/polyester can be washed hot for best results.');
    }
  } else if (color_category === 'dark') {
    special_handling.push('wash_dark_colors_together');
    water_temp = 'cold'; // Always cold for darks to prevent fading
    notes_parts.push('Dark colors should be washed cold to prevent fading.');
  } else if (color_category === 'colored') {
    special_handling.push('color_safe_detergent');
    if (water_temp !== 'cold') {
      water_temp = 'warm';
    }
    notes_parts.push('Use color-safe detergent for colored items.');
  }

  // --- Stain handling ---
  if (has_stains) {
    special_handling.push('stain_pretreat');
    notes_parts.push('Stained areas will be pre-treated before washing.');
  }

  // Deduplicate special handling
  const uniqueHandling = [...new Set(special_handling)];

  return {
    wash_program,
    water_temp,
    special_handling: uniqueHandling,
    confidence: 'rule_based',
    notes: notes_parts.join(' ') || 'Standard wash cycle recommended.',
  };
}

/**
 * Intelligent Wash & Garment Care Recommendation via Google Gemini Flash AI.
 * Falls back safely to rule-based engine if offline or timed out.
 */
export async function getAiWashRecommendation(input: WashRecommendationInput): Promise<WashRecommendation> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return getWashRecommendation(input);
  }

  try {
    const prompt = `You are an expert commercial laundry technician.
Analyze this garment intake item and provide optimal machine instructions:
- Garment Type: ${input.clothing_type}
- Fabric Material: ${input.fabric_type}
- Color Sorting: ${input.color_category}
- Stains Present: ${input.has_stains ? 'Yes - ' + (input.stain_description || 'surface stains') : 'No'}

Return ONLY a valid JSON object matching this schema:
{
  "wash_program": "delicate" | "normal" | "heavy_duty" | "hand_wash",
  "water_temp": "cold" | "warm" | "hot",
  "special_handling": ["mesh_bag", "no_bleach", "flat_dry", "inside_out", "stain_pretreat"],
  "notes": "1-2 sentence technician care instruction"
}`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(4500),
    });

    if (res.ok) {
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        return {
          wash_program: parsed.wash_program || 'normal',
          water_temp: parsed.water_temp || 'warm',
          special_handling: Array.isArray(parsed.special_handling) ? parsed.special_handling : [],
          confidence: 'ai_evaluated',
          notes: parsed.notes || 'AI evaluated wash cycle.',
        };
      }
    }
  } catch (err) {
    console.warn('Gemini AI wash care fallback:', err);
  }

  return getWashRecommendation(input);
}

