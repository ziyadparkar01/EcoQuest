export interface TimeGreetingInfo {
  salutation: 'Good morning' | 'Good afternoon' | 'Good evening' | 'Good night';
  emoji: string;
  periodLabel: string;
  subTitle: string;
  fieldGuidance: string;
  clockTime: string;
  dateLabel: string;
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  fullTimeString: string;
}

/**
 * Returns a warm, dynamic time-of-day greeting based on the user's real local clock:
 * - 05:00 - 11:59: Good morning (🌅)
 * - 12:00 - 16:59: Good afternoon (☀️)
 * - 17:00 - 20:59: Good evening (🌇)
 * - 21:00 - 04:59: Good night (🌙)
 */
export function getCurrentGreeting(date = new Date()): TimeGreetingInfo {
  const hour = date.getHours();
  // Formats clear human time like "12:00 PM" with unambiguous 12-hour clock
  const clockTime = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const dateLabel = date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const fullTimeString = `${clockTime} · ${dateLabel}`;

  if (hour >= 5 && hour < 12) {
    return {
      salutation: 'Good morning',
      emoji: '🌅',
      periodLabel: 'Good morning',
      subTitle: 'Crisp morning dew on woodland trails · Prime time for canopy birdsong & fresh leaf gathering',
      fieldGuidance: 'The early morning light filters gently through the upper boughs. Optimal time for collecting fallen foliage with intact moisture and spotting early songbirds.',
      clockTime,
      dateLabel,
      timeOfDay: 'Morning',
      fullTimeString,
    };
  }

  if (hour >= 12 && hour < 17) {
    return {
      salutation: 'Good afternoon',
      emoji: '☀️',
      periodLabel: 'Good afternoon',
      subTitle: 'Warm daylight on forest paths · Clear view of ground treasures & tree bark textures',
      fieldGuidance: 'Sunlight highlights deep crevices in tree bark, smooth river pebbles, and vibrant moss textures. Ideal conditions for outdoor ground crafting.',
      clockTime,
      dateLabel,
      timeOfDay: 'Afternoon',
      fullTimeString,
    };
  }

  if (hour >= 17 && hour < 21) {
    return {
      salutation: 'Good evening',
      emoji: '🌇',
      periodLabel: 'Good evening',
      subTitle: 'Warm twilight glow across the canopy · Crepuscular forest wildlife stirring',
      fieldGuidance: 'Soft twilight rays cast long silhouettes across the path. Crepuscular wildlife begins moving through the brush. Listen for dusk calls in your earphones.',
      clockTime,
      dateLabel,
      timeOfDay: 'Evening',
      fullTimeString,
    };
  }

  return {
    salutation: 'Good night',
    emoji: '🌙',
    periodLabel: 'Good night',
    subTitle: 'Quiet starlit skies · Bio-acoustic immersion for nocturnal nature sounds',
    fieldGuidance: 'The woodland enters its tranquil night phase. Switch on earphones, listen for night crickets, owls, and rustling nocturnal flora beneath the starlit sky.',
    clockTime,
    dateLabel,
    timeOfDay: 'Night',
    fullTimeString,
  };
}
