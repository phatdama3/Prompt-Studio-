import { GoogleGenAI, Type } from "@google/genai";

// INTERFACES

// Define the structure for a single scene prompt
export interface ScenePrompt {
  scene_id: number;
  title: string;
  main_subjects: string;
  setting: string;
  action: string;
  style: string;
  camera: string;
  lighting: string;
  sound: string;
  negative?: string;
}

// Define the structure for a story paragraph and its associated prompts
export interface StorySegment {
  paragraph: string;
  prompts: ScenePrompt[];
}

// Define the structure for the entire API response for prompts
export interface PromptsApiResponse {
  story: StorySegment[];
}

// FUNCTIONS

export const cleanJsonString = (str: string): string => {
  if (!str || typeof str !== 'string') return '';
  
  // 1. Remove markdown fences and trim
  let cleaned = str.replace(/^```json\s*|```\s*$/g, '').trim();

  // 2. Remove JavaScript-style comments (// and /* */) which are invalid in JSON.
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
  
  return cleaned;
};

export const generatePromptsForSingleParagraph = async (paragraph: string, ai: GoogleGenAI, durationPerPrompt: number): Promise<StorySegment> => {
    const promptGenPrompt = `
        ROLE:
        You are a scientific visualization and narrative-alignment expert for a calm, sleep-aid science documentary aimed at U.S. men aged 50-65 who prefer calm, natural, credible deep-dives (PBS/NOVA vibe).
        Your primary responsibility is design ultra-realistic, scientifically grounded visuals that stay tightly aligned with what is being said.
        Every scene you create must be extremely simple and readable at a glance: one clear main subject, low visual complexity, minimal motion, and clean composition. The images must be easy to understand, easy to watch for a long time, and easy to mentally absorb even when the viewer is sleepy, gently supporting drowsiness rather than stimulating excitement. All visuals must feel spacious, slow, soothing, and very easy on the eyes.

        Script Paragraph:
        "${paragraph}"

        TASK:
        1. Based ONLY on the "${paragraph}" above, generate EXACTLY 4 scene prompts that translate the paragraph's scientific meaning, observational perspective, and narrative intent into visuals that directly mirror the spoken content.
        2. For each scene, provide:
           - title: A short descriptive title for the scene.
           - main_subjects: The primary focus of the visual.
           - setting: The environment (e.g., deep space, Earth orbit, terrestrial nightscape).
           - action: Any subtle motion or evolution.
           - style: The specific RAW Astrophotography style (e.g., "Deep-field long exposure", "Hydrogen-alpha narrowband").
           - camera: Framing and perspective (e.g., "Wide-angle observational", "Extreme telephoto").
           - lighting: Natural light sources (e.g., "Distant starlight", "Faint nebula glow").
           - sound: Implied ambient soundscape (e.g., "Low-frequency cosmic hum", "Silence").
           - negative: Elements to avoid (based on the negative prompt base).
        
        EARTH-BASED NIGHTSCAPE EXCEPTION (OPTIONAL | ALLOWED WHEN APPLICABLE):
        If the paragraph implies an Earth observer perspective, you may depict terrestrial nightscapes under the real night sky (trees silhouettes, mountains, lakes, horizons, reflections).
        Still NO man-made objects: no buildings, roads, cars, boats, satellites, aircraft, city skylines, power lines.
        No artificial lights: no streetlights, no windows, no neon, no light beams; only natural starlight/moonlight and subtle airglow.
        No light pollution glow, no orange horizon glow.
        Keep astrophotography realism: gentle gradients, controlled star density (Use a sparse, low-density starfield. No bright Milky Way band or dense galaxy core; the sky should feel mostly dark with only a modest number of stars visible), no twinkling animation.
        
        STYLE GOAL (SLEEP-AID | MANDATORY):
        The primary goal is to calm the viewer while maintaining high scientific credibility.
        Every scene must feel spacious, uncluttered, majestic, slow, and contemplative.
        Absolutely no harsh flashes, rapid motion, chaotic detail density, visually aggressive patterns, or attention-grabbing gimmicks.
        Prioritize: authentic observational look, clear subject separation, minimal clutter, slow “hold” pacing.

        AUTHENTICITY & TASTE (50-65 FRIENDLY | MANDATORY):
        Prefer realistic observational looks over flashy sci-fi CGI.
        Do NOT depict any observatory equipment or telescopes; only the captured look.
        No neon synthwave palettes, no exaggerated lens flares, no “gaming RGB” look.
        
        ABSTRACT LARGE NUMBERS (MANDATORY):
        When the narration mentions huge numbers (billions of galaxies, countless stars, innumerable planets, etc.), represent them symbolically and minimally.
        Never literally fill the frame with billions of objects.
        Instead, show a single calm representative subject (for example: one quiet spiral galaxy standing in for all galaxies, or one softly lit planet representing many planets).

        VISUAL CLARITY & COMFORTABLE CONTRAST (MANDATORY):
        Keep star density low and uncluttered: a sparse starfield with lots of dark empty sky, never an overwhelming glitter field. No twinkling or shimmering stars.
        No aggressive sharpening, no HDR crunch, no clarity halos; keep detail natural and soft.

        VISUAL REALISM (MANDATORY):
        Strictly realistic, scientifically plausible, ultra-photoreal imagery.
        Avoid surreal symbolism, impossible physics, or fantasy exaggeration.

        EARTH REALISM (WHEN EARTH APPEARS | SHORT):
        Depict Earth as real ISS/NASA documentary footage, not CGI or stock-photo composite. 
        Show clear oceans, continents, and multi-layer cloud microstructure with natural color science. 
        Avoid over-sharpening and “too clean” textures; keep soft highlight roll-off, subtle film grain/fine sensor noise, and a thin atmospheric limb (subtle cyan rim). 
        Background stars must be sparse and clean, no colorful nebula or dense glitter.
                
        STAR MOTION (WHEN NIGHTSCAPE | MANDATORY):
        Keep star density low and uncluttered: a sparse starfield with lots of dark empty sky, never an overwhelming glitter field.
        Stars must drift very slowly and smoothly due to Earth rotation (calm time-lapse feel).
        Avoid strong star trails; if trails appear, keep them extremely short and subtle.
        No jumps, no jitter, no speed ramps.

        HIGHLIGHT CONTROL (MANDATORY):
        Prevent blown highlights and harsh bloom. Prefer soft core highlights, gentle falloff, restrained glow.
        Avoid intense “glowing ring” looks; keep any accretion glow subtle and smooth with controlled bloom.
        
        PACING, CAMERA & EDITING (MANDATORY):
        Slow-cinema pacing: fewer cuts, longer holds. Each scene should feel steady and easy to follow.
        Camera should feel tripod-stable and observational (like a high-resolution photograph on a stable mount).
        No handheld shake, no whip-pan, no snap zoom, no dramatic angle gimmicks.
        Motion only as subtle natural evolution (slow planetary rotation, faint drifting dust, gentle plasma shimmer).
        If a transition is implied within the scene, it must feel like a slow dissolve / crossfade (no flashes).

        COMPOSITION (MANDATORY):
        Clean silhouettes and simple geometry. Avoid clutter and “too many tiny points of interest”.
        No split screens, no picture-in-picture, no borders, no letterbox/pillarbox.
        
        NEGATIVE PROMPT BASE (ALWAYS INCLUDE):
        no spacecraft, no satellites, no telescopes, no rockets, no debris, no text, no UI, no watermark, no logo, no glitch, no flicker, no strobe, no fast cuts, no shaky cam, no oversaturated neon, no heavy lens flare, no noisy starfield, no twinkling stars, no busy clutter, no HDR crunch, no oversharpening
    `

    const promptsSchema = {
        type: Type.OBJECT,
        properties: {
            story: {
                type: Type.ARRAY,
                description: "An array containing a single story segment for the provided paragraph.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        paragraph: { type: Type.STRING },
                        prompts: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    scene_id: { type: Type.NUMBER },
                                    title: { type: Type.STRING },
                                    main_subjects: { type: Type.STRING },
                                    setting: { type: Type.STRING },
                                    action: { type: Type.STRING },
                                    style: { type: Type.STRING },
                                    camera: { type: Type.STRING },
                                    lighting: { type: Type.STRING },
                                    sound: { type: Type.STRING },
                                    negative: { type: Type.STRING }
                                },
                                required: ["scene_id", "title", "main_subjects", "setting", "action", "style", "camera", "lighting", "sound"]
                            }                            
                        }
                    },
                    required: ["paragraph", "prompts"]
                }
            }
        },
        required: ["story"]
    };

    const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: promptGenPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: promptsSchema,
        },
    });

    const parsedResult: PromptsApiResponse = JSON.parse(cleanJsonString(response.text));
    return parsedResult.story[0];
  };
