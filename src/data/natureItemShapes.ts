/**
 * Comprehensive Knowledge Base for Nature Expedition Items, Shapes, Textures & Validation
 * Prevents false matches (e.g., rejecting pencils, plastic, or manufactured items when searching for twigs).
 */

export interface ItemShapeDetail {
  category: 'twig' | 'leaf' | 'pebble' | 'pinecone' | 'acorn' | 'moss' | 'petal' | 'needle' | 'stone';
  canonicalName: string;
  shapeDescription: string;
  textureDescription: string;
  colorAndAppearance: string;
  craftRole: string;
  fieldSearchTip: string;
  naturalKeywords: string[];
}

export const NATURE_ITEM_SPECS: Record<string, ItemShapeDetail> = {
  twig: {
    category: 'twig',
    canonicalName: 'Curved Wooden Twig',
    shapeDescription: 'A gently arched, bowed, or curved slender wooden stick about hand-length (approx. 15 to 20 cm). It must have a natural organic bend or arc rather than being straight.',
    textureDescription: 'Rough tree bark with natural ridges, small knots, and a dry woody interior that snaps cleanly.',
    colorAndAppearance: 'Earthy grey, charcoal, or weathered brown bark from fallen deciduous or oak branches.',
    craftRole: 'Forms the arched spine and serpentine tail of the creature.',
    fieldSearchTip: 'Scan beneath mature oak, maple, or pine branches for naturally fallen dry deadwood with a gentle bend. Never use manufactured or straight man-made items like pencils, pens, or plastic rods!',
    naturalKeywords: ['twig', 'twigs', 'curved twig', 'stick', 'sticks', 'curved stick', 'curved branch', 'branch', 'wood stick', 'wooden twig', 'dry twig', 'bent stick', 'spine'],
  },
  leaf: {
    category: 'leaf',
    canonicalName: 'Broad Fallen Leaves',
    shapeDescription: 'Broad, flat, palm-shaped or ovate foliage with symmetrical lobes and visible branching rib/vein architecture, about palm-sized (8 to 15 cm wide).',
    textureDescription: 'Crisp, papery, or supple organic leaf tissue with raised dendritic veins on the underside.',
    colorAndAppearance: 'Vibrant autumn amber, russet brown, forest green, or golden yellow with clear venation.',
    craftRole: 'Forms outstretched, fan-shaped aerodynamic wings on either side of the creature spine.',
    fieldSearchTip: 'Look beneath shaded canopy trees where leaves have gathered in damp hollows. Choose intact, unbroken specimens with clear stem lines.',
    naturalKeywords: ['leaf', 'leaves', 'broad leaf', 'broad leaves', 'fallen leaf', 'fallen leaves', 'oak leaf', 'maple leaf', 'dry leaf', 'wings'],
  },
  pebble: {
    category: 'pebble',
    canonicalName: 'Smooth River Pebbles',
    shapeDescription: 'Smooth, water-tumbled rounded or oval stones, coin-sized or marble-sized (approx. 1.5 to 3 cm in diameter), free from jagged sharp edges.',
    textureDescription: 'Silky smooth, water-worn exterior with soft rounded contours and cold mineral feel.',
    colorAndAppearance: 'Polished river grey, speckled quartz, slate black, or amber river rock.',
    craftRole: 'Perched symmetrically at the head to serve as glinting, vigilant glowing eyes.',
    fieldSearchTip: 'Search along gravel path edges, washed-out rain gullies, or dry creek ruts where water has smoothed mineral stones.',
    naturalKeywords: ['pebble', 'pebbles', 'smooth pebble', 'river pebble', 'river stone', 'stone', 'stones', 'round pebble', 'eyes', 'glinting eyes'],
  },
  pinecone: {
    category: 'pinecone',
    canonicalName: 'Mature Pinecone',
    shapeDescription: 'Conical, ovoid, or barrel-shaped seed cone featuring spiraling geometric scales arranged in a natural Fibonacci whorl.',
    textureDescription: 'Rigid, woody, layered overlapping scales opening outward like pine feathers.',
    colorAndAppearance: 'Rich cinnamon brown, weathered umber, or toasted chestnut with resinous tips.',
    craftRole: 'Serves as the sturdy feathered body core of woodland guardians.',
    fieldSearchTip: 'Search right underneath evergreen conifers and mature pines for dry, open fallen cones.',
    naturalKeywords: ['pinecone', 'pinecones', 'pine cone', 'pine cones', 'cone', 'cones', 'feather body'],
  },
  acorn: {
    category: 'acorn',
    canonicalName: 'Acorn Caps',
    shapeDescription: 'Hemispherical, shallow cup-shaped miniature wooden bowls (approx. 1 to 2 cm wide).',
    textureDescription: 'Stiff woody cupule with a rough, textured, pebbled or scaly outer surface.',
    colorAndAppearance: 'Pale tan to toasted caramel brown.',
    craftRole: 'Placed atop the figure as binocular, staring owl eyes.',
    fieldSearchTip: 'Search under mature oak trees in autumn or spring for caps shed from fallen acorns.',
    naturalKeywords: ['acorn', 'acorns', 'acorn cap', 'acorn caps', 'cap', 'caps', 'binocular eyes'],
  },
  moss: {
    category: 'moss',
    canonicalName: 'Living Moss Tuft',
    shapeDescription: 'A velvety, rounded cushion or carpet-like organic mat conforming to soil and bark.',
    textureDescription: 'Soft, damp, sponge-like carpet of tiny dense bryophyte leaves.',
    colorAndAppearance: 'Emerald green, vibrant lime, or jade.',
    craftRole: 'Forms soft camouflage shell armor or mystical whiskers.',
    fieldSearchTip: 'Look on north-facing tree roots, damp stone crevices, or shaded trail banks.',
    naturalKeywords: ['moss', 'moss tuft', 'fern', 'fern frond', 'lichen', 'bryophyte', 'moss shell'],
  },
  needle: {
    category: 'needle',
    canonicalName: 'Pine Needles',
    shapeDescription: 'Slender, elongated, straight or gently flexed needle-like spikes, typically 5 to 10 cm in length.',
    textureDescription: 'Smooth, flexible yet firm pine foliage with pointed tips.',
    colorAndAppearance: 'Evergreen deep jade or dried golden-brown straws.',
    craftRole: 'Radiates outward as sunbeams or forms creature claws.',
    fieldSearchTip: 'Gather beneath pine and fir trees where dry needles blanket the soil.',
    naturalKeywords: ['pine needle', 'pine needles', 'needle', 'needles', 'straws', 'sun rays', 'dragon claws'],
  },
  petal: {
    category: 'petal',
    canonicalName: 'Wild Blossom Petals',
    shapeDescription: 'Delicate, teardrop, oval, or heart-shaped organic petals (1 to 3 cm).',
    textureDescription: 'Silky, velvety, paper-thin delicate floral tissue.',
    colorAndAppearance: 'Golden yellow, clover white, violet, or rosy pink.',
    craftRole: 'Forms the glowing outer floral corona or decorative accent.',
    fieldSearchTip: 'Gently collect fallen petals from wildflowers, dandelions, or flowering shrubs along meadow borders.',
    naturalKeywords: ['petal', 'petals', 'flower petal', 'flower petals', 'blossom', 'clover', 'wildflower'],
  },
  stone: {
    category: 'stone',
    canonicalName: 'Flat Oval Stone',
    shapeDescription: 'Flat, disc-like, palm-sized oval stone with a level upper surface.',
    textureDescription: 'Weathered smooth, cold geological slab.',
    colorAndAppearance: 'Slate grey, granite flecked, or river sandstone.',
    craftRole: 'Acts as the broad protective shell armor or central mandala hub.',
    fieldSearchTip: 'Scan near stream beds, trail markers, or exposed flat bedrock.',
    naturalKeywords: ['flat stone', 'oval stone', 'large stone', 'center stone', 'shell stone'],
  },
};

/**
 * Common synthetic, manufactured, or man-made objects that explorers might carry or mention.
 * These MUST NEVER be mistaken for natural specimens (e.g. pencil != twig).
 */
export const MANUFACTURED_OBJECT_MAP: Record<string, { label: string; explanation: string }> = {
  pencil: {
    label: 'a pencil',
    explanation: 'A pencil is a manufactured graphite writing tool, not a natural tree branch! For our quest, we need an authentic fallen curved wooden twig with organic bark.',
  },
  pen: {
    label: 'a pen',
    explanation: 'A pen is a manufactured plastic and ink writing instrument. Our expedition requires real organic forest wood, not an office tool!',
  },
  marker: {
    label: 'a marker',
    explanation: 'A marker is an artificial synthetic writing utensil. We need a real fallen forest twig shaped by nature!',
  },
  crayon: {
    label: 'a crayon',
    explanation: 'A crayon is made of synthetic wax and pigment. Look on the forest floor for authentic fallen twigs and leaves!',
  },
  ruler: {
    label: 'a ruler',
    explanation: 'A ruler is a manufactured straight measurement tool. The dragon spine specifically requires a natural twig with an organic curve!',
  },
  straw: {
    label: 'a plastic straw',
    explanation: 'A straw is artificial plastic or paper trash! Let us keep the forest clean and search for real pine needles or branches.',
  },
  chopstick: {
    label: 'a chopstick',
    explanation: 'A chopstick is manufactured straight dining wood, whereas our dragon spine needs a real fallen wild twig with a natural bend and bark.',
  },
  keys: {
    label: 'keys',
    explanation: 'Keys are metal house tools! For the dragon eyes, we are searching for water-smoothed natural pebbles.',
  },
  key: {
    label: 'a key',
    explanation: 'A key is a metal tool. We need smooth round river stones from the trail!',
  },
  coin: {
    label: 'a coin',
    explanation: 'A coin is minted metal currency. Our nature dragon needs authentic earth pebbles shaped by river water!',
  },
  coins: {
    label: 'coins',
    explanation: 'Coins are metal currency, not natural river stones.',
  },
  phone: {
    label: 'a phone',
    explanation: 'Your smartphone is tracking our expedition! But our craft creature needs real fallen earth specimens.',
  },
  bottle: {
    label: 'a bottle',
    explanation: 'A bottle is synthetic glass or plastic. We need natural organic specimens like leaves, twigs, and pebbles.',
  },
  cap: {
    label: 'a bottle cap',
    explanation: 'A bottle cap is man-made plastic or metal. Search under oak trees for an authentic acorn cap instead!',
  },
  plastic: {
    label: 'plastic',
    explanation: 'Plastic is non-biodegradable synthetic waste! We must only use fallen organic leaves, twigs, and natural stones.',
  },
  paper: {
    label: 'paper',
    explanation: 'Paper is manufactured pulp. We need broad fallen autumn leaves with natural vein structures!',
  },
  wrapper: {
    label: 'a food wrapper',
    explanation: 'That is artificial litter! Our quest uses pure fallen natural foliage and stones.',
  },
  eraser: {
    label: 'an eraser',
    explanation: 'An eraser is rubber. Look for smooth river pebbles for the dragon eyes.',
  },
  toy: {
    label: 'a toy',
    explanation: 'That is an artificial toy. We are sculpting our creature entirely from raw woodland artifacts.',
  },
  card: {
    label: 'a card',
    explanation: 'That is a paper or plastic card. We need broad leaves from canopy trees!',
  },
  battery: {
    label: 'a battery',
    explanation: 'Batteries are electronic hazardous items. We are searching for natural organic specimens only!',
  },
};

/**
 * Determine if a spoken query mentions an artificial / man-made object.
 */
export function detectManufacturedObject(query: string): { isManufactured: boolean; matchedWord?: string; explanation?: string } {
  const clean = query.toLowerCase().replace(/[.,!?;:'"()]/g, ' ');
  const words = clean.split(/\s+/);

  for (const word of words) {
    if (MANUFACTURED_OBJECT_MAP[word]) {
      return {
        isManufactured: true,
        matchedWord: word,
        explanation: MANUFACTURED_OBJECT_MAP[word].explanation,
      };
    }
  }

  // Compound check
  for (const [key, val] of Object.entries(MANUFACTURED_OBJECT_MAP)) {
    if (clean.includes(key)) {
      return {
        isManufactured: true,
        matchedWord: key,
        explanation: val.explanation,
      };
    }
  }

  return { isManufactured: false };
}

/**
 * Match a player's spoken claim against required quest items with strict shape/natural rules.
 */
export function matchClaimedNatureItem(
  query: string,
  requiredItems: string[],
  alreadyFoundItems: string[] = []
): {
  success: boolean;
  matchedItem: string | null;
  shapeDetail: ItemShapeDetail | null;
  isAlreadyFound: boolean;
  isManufactured: boolean;
  rejectionMessage: string | null;
} {
  const q = query.toLowerCase();

  // 1. First, check if the player named a manufactured/synthetic object (like pencil, pen, keys, plastic)
  const manCheck = detectManufacturedObject(q);
  if (manCheck.isManufactured) {
    return {
      success: false,
      matchedItem: null,
      shapeDetail: null,
      isAlreadyFound: false,
      isManufactured: true,
      rejectionMessage: manCheck.explanation || `That is a manufactured tool, not a natural specimen for our quest!`,
    };
  }

  // 2. Determine which nature category was mentioned
  let matchedSpec: ItemShapeDetail | null = null;

  // Twig / Stick
  if (
    (q.includes('twig') || q.includes('stick') || q.includes('branch')) &&
    !q.includes('pencil') &&
    !q.includes('pen') &&
    !q.includes('chopstick')
  ) {
    matchedSpec = NATURE_ITEM_SPECS.twig;
  }
  // Leaf / Foliage
  else if (q.includes('leaf') || q.includes('leaves') || q.includes('foliage')) {
    matchedSpec = NATURE_ITEM_SPECS.leaf;
  }
  // Pebble / Stone / Rock
  else if (q.includes('pebble') || q.includes('stone') || q.includes('rock')) {
    matchedSpec = NATURE_ITEM_SPECS.pebble;
  }
  // Pinecone
  else if (q.includes('pinecone') || q.includes('cone')) {
    matchedSpec = NATURE_ITEM_SPECS.pinecone;
  }
  // Acorn / Acorn cap
  else if (q.includes('acorn') || (q.includes('cap') && !q.includes('bottle'))) {
    matchedSpec = NATURE_ITEM_SPECS.acorn;
  }
  // Moss / Fern
  else if (q.includes('moss') || q.includes('fern') || q.includes('lichen')) {
    matchedSpec = NATURE_ITEM_SPECS.moss;
  }
  // Pine needle
  else if (q.includes('needle') || q.includes('needles') || q.includes('pine needle')) {
    matchedSpec = NATURE_ITEM_SPECS.needle;
  }
  // Petal / Blossom
  else if (q.includes('petal') || q.includes('blossom') || q.includes('flower')) {
    matchedSpec = NATURE_ITEM_SPECS.petal;
  }

  if (!matchedSpec) {
    return {
      success: false,
      matchedItem: null,
      shapeDetail: null,
      isAlreadyFound: false,
      isManufactured: false,
      rejectionMessage: `I didn't recognize that as one of our required quest specimens. Please check our quest list!`,
    };
  }

  // 3. Find corresponding item string in the active quest
  const matchedReq = requiredItems.find((req) => {
    const lowerReq = req.toLowerCase();
    return matchedSpec!.naturalKeywords.some((kw) => lowerReq.includes(kw));
  });

  if (!matchedReq) {
    return {
      success: false,
      matchedItem: null,
      shapeDetail: matchedSpec,
      isAlreadyFound: false,
      isManufactured: false,
      rejectionMessage: `You found ${matchedSpec.canonicalName}, but our current quest doesn't require it right now!`,
    };
  }

  const isAlreadyFound = alreadyFoundItems.includes(matchedReq);

  return {
    success: true,
    matchedItem: matchedReq,
    shapeDetail: matchedSpec,
    isAlreadyFound,
    isManufactured: false,
    rejectionMessage: null,
  };
}

/**
 * Return shape information formatted for spoken audio or visual UI
 */
export function getShapeInfoForScavengerItem(itemText: string): string {
  const lower = itemText.toLowerCase();
  if (lower.includes('twig') || lower.includes('stick') || lower.includes('spine')) {
    return 'Shape: Gently curved/arched slender wooden stick (15-20 cm), natural bend with bark.';
  }
  if (lower.includes('leaf') || lower.includes('leaves') || lower.includes('wing')) {
    return 'Shape: Broad, palm-sized flat foliage with distinct branching veins.';
  }
  if (lower.includes('pebble') || lower.includes('stone') || lower.includes('eye')) {
    return 'Shape: Smooth, water-rounded coin-sized pebble (1-3 cm) with soft curved edges.';
  }
  if (lower.includes('pinecone') || lower.includes('cone')) {
    return 'Shape: Conical/ovoid cone with spiraling open woody scales.';
  }
  if (lower.includes('acorn')) {
    return 'Shape: Hemispherical, small cup-shaped wooden bowl with textured cap.';
  }
  if (lower.includes('moss') || lower.includes('fern')) {
    return 'Shape: Soft, velvety emerald cushion or feathery green frond.';
  }
  if (lower.includes('needle')) {
    return 'Shape: Slender, elongated flexible evergreen needles (5-10 cm).';
  }
  if (lower.includes('petal')) {
    return 'Shape: Delicate, rounded or teardrop-shaped colorful floral petals.';
  }
  return 'Shape: Organic natural specimen fallen on the forest floor.';
}
