/**
 * Component keyword mapping and AI response failure detection.
 * Ported from perplexity_chat.html lines 2123-2293.
 *
 * Only multi-word specific phrases are used as keywords to avoid
 * false positives from generic words like "winding" or "core"
 * appearing in general transformer discussion text.
 */

export const componentKeyMap = {
  // Bushings — specific phrases only
  'hv bushing': 'hvBushings',
  'high voltage bushing': 'hvBushings',
  'high-voltage bushing': 'hvBushings',
  'lv bushing': 'lvBushings',
  'low voltage bushing': 'lvBushings',
  'low-voltage bushing': 'lvBushings',
  'bushing porcelain': 'bushingPorcelain',
  'porcelain insulator': 'bushingPorcelain',
  'bushing terminal': 'bushingTerminals',
  'bushing flashover': 'hvBushings',
  'bushing failure': 'hvBushings',

  // Radiator / Cooling — specific phrases only
  'radiator cooling fin': 'radiatorFins',
  'cooling fin': 'radiatorFins',
  'radiator bank': 'radiatorBankA',
  'radiator leak': 'radiatorBankA',

  // Fans
  'cooling fan': 'coolingFans',
  'fan motor': 'fanMotors',
  'fan failure': 'coolingFans',

  // Oil system
  'oil pump': 'oilPumps',
  'oil pump failure': 'oilPumps',
  'oil circulation pipe': 'oilPipes',
  'oil leak': 'oilPipes',

  // Tap changer — very specific
  'tap changer': 'tapChanger',
  'oltc': 'tapChanger',
  'on-load tap changer': 'tapChanger',
  'tap changer arcing': 'tapChanger',
  'tap changer failure': 'tapChanger',

  // Conservator
  'conservator tank': 'conservator',
  'conservator failure': 'conservator',

  // Windings — require "winding" with qualifier
  'primary winding': 'primaryWindings',
  'hv winding': 'primaryWindings',
  'secondary winding': 'secondaryWindings',
  'lv winding': 'secondaryWindings',
  'winding insulation': 'windingInsulation',
  'winding failure': 'primaryWindings',
  'winding breakdown': 'primaryWindings',
  'inter-turn fault': 'primaryWindings',
  'turn-to-turn fault': 'primaryWindings',

  // Core — require "core" with qualifier
  'core lamination': 'coreLaminations',
  'transformer core': 'coreLaminations',
  'core overheating': 'coreLaminations',
  'core failure': 'coreLaminations',
  'core hot spot': 'coreLaminations',

  // Relays & protection
  'buchholz relay': 'buchholzRelay',
  'gas relay': 'buchholzRelay',
  'pressure relief device': 'pressureRelief',
  'pressure relief valve': 'pressureRelief',

  // Gauges
  'oil level gauge': 'oilGauge',
  'oil level indicator': 'oilGauge',
  'temperature gauge': 'tempGauge',
  'winding temperature indicator': 'wti',

  // Tank — require "tank" with qualifier
  'tank body': 'tankBody',
  'main tank': 'tankBody',
  'tank rupture': 'tankBody',
  'tank failure': 'tankBody',
};

const noFailuresIndicators = [
  'no transformer failures',
  'no documented',
  'no failures found',
  "couldn't find",
  'no reported failures',
  'no recent failures',
  'no similar failures',
  'no matching incidents',
];

/**
 * Analyze an AI response for mentioned failed components.
 * Only looks for the explicit "Failed Component(s):" line or very
 * specific failure phrases — avoids false positives from general
 * discussion text.
 *
 * @param {string} responseText - The AI response text
 * @returns {string[]} Array of detected component keys (max 2)
 */
export function analyzeResponseForFailures(responseText) {
  const lowerResponse = responseText.toLowerCase();

  // Check if no failures found
  if (noFailuresIndicators.some(ind => lowerResponse.includes(ind))) {
    return [];
  }

  let detectedComponents = [];

  // Strategy 1: Extract the "Failed Component(s):" line specifically
  const failedComponentMatch = lowerResponse.match(/failed component\(?s?\)?:\s*([^\n]+)/i);

  if (failedComponentMatch) {
    const failedComponentsText = failedComponentMatch[1].toLowerCase();

    for (const [keyword, componentKey] of Object.entries(componentKeyMap)) {
      if (failedComponentsText.includes(keyword)) {
        if (!detectedComponents.includes(componentKey)) {
          detectedComponents.push(componentKey);
        }
      }
    }
  }

  // Strategy 2: Look for very specific "X failure" / "X failed" phrases
  // Only match when a component keyword appears directly adjacent to a failure word
  if (detectedComponents.length === 0) {
    for (const [keyword, componentKey] of Object.entries(componentKeyMap)) {
      // Skip keywords that already end with "failure"/"failed" to avoid double matching
      if (keyword.endsWith('failure') || keyword.endsWith('flashover') || keyword.endsWith('breakdown') || keyword.endsWith('arcing') || keyword.endsWith('leak')) {
        if (lowerResponse.includes(keyword)) {
          if (!detectedComponents.includes(componentKey)) {
            detectedComponents.push(componentKey);
          }
        }
      }
    }
  }

  // Strategy 3: Look for "[component keyword] failed/damaged/burned"
  if (detectedComponents.length === 0) {
    for (const [keyword, componentKey] of Object.entries(componentKeyMap)) {
      const pattern = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+(?:failed|damaged|burned|destroyed|ruptured|exploded)', 'i');
      if (pattern.test(lowerResponse)) {
        if (!detectedComponents.includes(componentKey)) {
          detectedComponents.push(componentKey);
        }
      }
    }
  }

  // Limit to max 2 components
  return detectedComponents.slice(0, 2);
}

/**
 * Fallback mapping from DGA fault type to a default CAD component.
 * Used when Perplexity's response doesn't match any component keywords.
 */
export const faultTypeDefaults = {
  'Thermal':   'coreLaminations',   // thermal faults → core hot spots
  'Discharge': 'tapChanger',        // discharge → tap changer arcing contacts
  'Arcing':    'primaryWindings',   // arcing → winding insulation breakdown
  'Normal':    null,                // no highlight needed
};

export function getDefaultComponentForFault(faultType) {
  return faultTypeDefaults[faultType] || null;
}
