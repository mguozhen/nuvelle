export type Drama = {
  slug: string;
  title: string;
  genre: string;
  episodes: string;
  synopsis: string;
  affiliateUrl?: string;
};

export type BannerItem = {
  slug: string;
  badge: string;
};

const affiliateUrls: Record<string, string> = {
  ceo_secret_wife: "#",
  rejected_alpha: "#",
  returning_luna: "#",
  runaway_bride: "#",
  faked_death: "#",
  maid_mansion: "#",
  ruthless_don: "#",
  reborn_obsession: "#",
  nanny_single_dad: "#",
  sister_stole_life: "#",
  midnight_stranger: "#",
  heiress_disguise: "#",
  twin_swap: "#",
  fake_heiress: "#",
  alpha_bodyguard: "#",
  divorce_queen: "#",
  secret_prince: "#",
  amnesia_love: "#",
  mafia_wife: "#",
  cinderella_ceo: "#"
};

export const dramas: Drama[] = [
  {
    slug: "ceo_secret_wife",
    title: "The CEO's Secret Wife",
    genre: "Hidden Identity",
    episodes: "EP 1-8",
    synopsis: "She mops his lobby by day — and signs the deal that buys his empire by night."
  },
  {
    slug: "rejected_alpha",
    title: "Rejected by My Alpha",
    genre: "Werewolf",
    episodes: "EP 1-12",
    synopsis: "Cast out as the weakest omega, she awakens the moon's deadliest power."
  },
  {
    slug: "returning_luna",
    title: "Returning Luna's Revenge",
    genre: "Werewolf",
    episodes: "EP 1-10",
    synopsis: "The pack exiled their Luna. The moon sent her back for vengeance."
  },
  {
    slug: "runaway_bride",
    title: "The Billionaire's Runaway Bride",
    genre: "Flash Marriage",
    episodes: "EP 1-9",
    synopsis: "She fled the altar in the rain — into the arms of the man she was running from."
  },
  {
    slug: "faked_death",
    title: "My Husband Faked His Death",
    genre: "Revenge",
    episodes: "EP 1-11",
    synopsis: "He buried a lie. She came back to bury him."
  },
  {
    slug: "maid_mansion",
    title: "The Maid Who Owned the Mansion",
    genre: "Rags to Riches",
    episodes: "EP 1-8",
    synopsis: "They threw her out with nothing. She came back holding the deed."
  },
  {
    slug: "ruthless_don",
    title: "Pregnant by the Ruthless Don",
    genre: "Forbidden",
    episodes: "EP 1-10",
    synopsis: "One night with the city's most dangerous man left her a secret worth killing for."
  },
  {
    slug: "reborn_obsession",
    title: "Reborn as His Obsession",
    genre: "Second Chance",
    episodes: "EP 1-12",
    synopsis: "She died betrayed. She woke one day before it all — and this time, he's obsessed."
  },
  {
    slug: "nanny_single_dad",
    title: "The Nanny and the Single Dad",
    genre: "Sweet Romance",
    episodes: "EP 1-9",
    synopsis: "She came to mind his daughter. She stayed to mend his heart."
  },
  {
    slug: "sister_stole_life",
    title: "My Sister Stole My Life",
    genre: "Family Drama",
    episodes: "EP 1-10",
    synopsis: "Same face. Stolen name. One sister will burn it all down."
  },
  {
    slug: "midnight_stranger",
    title: "Kissed by a Stranger at Midnight",
    genre: "Love at First Sight",
    episodes: "EP 1-8",
    synopsis: "One kiss with a stranger — who turned out to own everything she feared."
  },
  {
    slug: "heiress_disguise",
    title: "The Heiress in Disguise",
    genre: "Hidden Identity",
    episodes: "EP 1-9",
    synopsis: "They mocked the poor new girl. They never knew she owned the building."
  },
  {
    slug: "twin_swap",
    title: "The Twin Who Took My Place",
    genre: "Family Drama",
    episodes: "EP 1-10",
    synopsis: "Same face, two lives — one sister was never supposed to come back."
  },
  {
    slug: "fake_heiress",
    title: "Pretending to Be His Heiress",
    genre: "Hidden Identity",
    episodes: "EP 1-9",
    synopsis: "Hired to fake a name. She never meant to fall for the heir."
  },
  {
    slug: "alpha_bodyguard",
    title: "My Billionaire Bodyguard",
    genre: "Forbidden",
    episodes: "EP 1-11",
    synopsis: "He was paid to guard her body. No one paid him to lose his heart."
  },
  {
    slug: "divorce_queen",
    title: "The Divorce That Made Me Rich",
    genre: "Revenge",
    episodes: "EP 1-8",
    synopsis: "He signed the papers smiling. She walked out and bought his company."
  },
  {
    slug: "secret_prince",
    title: "I Married a Secret Prince",
    genre: "Fairytale",
    episodes: "EP 1-10",
    synopsis: "A quiet stranger at the diner — and a crown she never saw coming."
  },
  {
    slug: "amnesia_love",
    title: "He Forgot He Loved Me",
    genre: "Tear-jerkers",
    episodes: "EP 1-9",
    synopsis: "He lost every memory but one feeling he couldn't name — her."
  },
  {
    slug: "mafia_wife",
    title: "Wife of the Mafia King",
    genre: "Forbidden",
    episodes: "EP 1-12",
    synopsis: "She married a monster to save her family. He'd burn the world to keep her."
  },
  {
    slug: "cinderella_ceo",
    title: "From Maid to His Cinderella",
    genre: "Rags to Riches",
    episodes: "EP 1-9",
    synopsis: "One night in a borrowed gown, and the billionaire couldn't look away."
  }
].map((drama) => ({ ...drama, affiliateUrl: affiliateUrls[drama.slug] }));

export const top10: string[] = [
  "ceo_secret_wife",
  "mafia_wife",
  "reborn_obsession",
  "divorce_queen",
  "rejected_alpha",
  "midnight_stranger",
  "faked_death",
  "secret_prince",
  "heiress_disguise",
  "cinderella_ceo"
];

export const rows: Record<string, string[]> = {
  "New Releases": [
    "ceo_secret_wife",
    "reborn_obsession",
    "midnight_stranger",
    "divorce_queen",
    "mafia_wife",
    "secret_prince",
    "cinderella_ceo"
  ],
  "Hidden Identity": [
    "ceo_secret_wife",
    "heiress_disguise",
    "fake_heiress",
    "runaway_bride",
    "maid_mansion",
    "twin_swap"
  ],
  "Magic & Mates": ["rejected_alpha", "returning_luna", "alpha_bodyguard", "mafia_wife"],
  "Love at First Sight": [
    "midnight_stranger",
    "runaway_bride",
    "nanny_single_dad",
    "secret_prince",
    "amnesia_love",
    "cinderella_ceo"
  ],
  "Revenge & Reversal": [
    "faked_death",
    "sister_stole_life",
    "divorce_queen",
    "returning_luna",
    "twin_swap",
    "maid_mansion"
  ],
  "Second Chance": ["reborn_obsession", "faked_death", "maid_mansion", "nanny_single_dad", "amnesia_love"]
};

export const bannerItems: BannerItem[] = [
  { slug: "ceo_secret_wife", badge: "● #1 Trending Now" },
  { slug: "mafia_wife", badge: "● Editors' Pick" },
  { slug: "reborn_obsession", badge: "● New & Hot" },
  { slug: "rejected_alpha", badge: "● Fan Favorite" },
  { slug: "midnight_stranger", badge: "● Just Added" }
];

const searchAliases: Record<string, string[]> = {
  mafia_wife: ["Mafia Wife"]
};

export function getDramaBySlug(slug: string): Drama | undefined {
  return dramas.find((drama) => drama.slug === slug);
}

export function searchDramas(query: string): Drama[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return [];
  }

  return dramas.filter((drama) => {
    const aliases = searchAliases[drama.slug]?.join(" ") ?? "";
    return `${drama.title} ${drama.genre} ${drama.synopsis} ${aliases}`.toLowerCase().includes(normalized);
  });
}

export function statForDrama(slug: string): { views: string; rating: string } {
  const hash = [...slug].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 0);

  return {
    views: `${(0.4 + (hash % 900) / 100).toFixed(1)}M`,
    rating: (4.5 + (hash % 5) / 10).toFixed(1)
  };
}

export function displayAliasForDrama(slug: string): string | undefined {
  return searchAliases[slug]?.[0];
}
