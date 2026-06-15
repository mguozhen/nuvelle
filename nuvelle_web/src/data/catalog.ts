export type MaterialPack = {
  slug: string;
  title: string;
  genre: string;
};

export type CatalogDrama = {
  slug: string;
  title: string;
  genre: string;
};

export const packs: MaterialPack[] = [
  { slug: "my_wife", title: "MY WIFE", genre: "Revenge - Pregnant Heroine" },
  { slug: "the_ceo_s_secret_wife", title: "THE CEO'S SECRET WIFE", genre: "Hidden Identity - Billionaire" },
  { slug: "the_wrong_bride", title: "THE WRONG BRIDE", genre: "Forbidden - Bodyguard" },
  { slug: "the_last_signature", title: "THE LAST SIGNATURE", genre: "Revenge - Reversal" },
  { slug: "midnight_vows", title: "MIDNIGHT VOWS", genre: "Romance - Second Chance" }
];

export const catalog: CatalogDrama[] = [
  { slug: "ceo_secret_wife", title: "The CEO's Secret Wife", genre: "Hidden Identity" },
  { slug: "rejected_alpha", title: "Rejected by My Alpha", genre: "Werewolf" },
  { slug: "returning_luna", title: "Returning Luna's Revenge", genre: "Werewolf" },
  { slug: "runaway_bride", title: "The Billionaire's Runaway Bride", genre: "Flash Marriage" },
  { slug: "faked_death", title: "My Husband Faked His Death", genre: "Revenge" },
  { slug: "maid_mansion", title: "The Maid Who Owned the Mansion", genre: "Rags to Riches" },
  { slug: "ruthless_don", title: "Pregnant by the Ruthless Don", genre: "Forbidden" },
  { slug: "reborn_obsession", title: "Reborn as His Obsession", genre: "Second Chance" },
  { slug: "nanny_single_dad", title: "The Nanny and the Single Dad", genre: "Sweet Romance" },
  { slug: "sister_stole_life", title: "My Sister Stole My Life", genre: "Family Drama" },
  { slug: "midnight_stranger", title: "Kissed by a Stranger at Midnight", genre: "Love at First Sight" },
  { slug: "heiress_disguise", title: "The Heiress in Disguise", genre: "Hidden Identity" },
  { slug: "twin_swap", title: "The Twin Who Took My Place", genre: "Family Drama" },
  { slug: "fake_heiress", title: "Pretending to Be His Heiress", genre: "Hidden Identity" },
  { slug: "alpha_bodyguard", title: "My Billionaire Bodyguard", genre: "Forbidden" },
  { slug: "divorce_queen", title: "The Divorce That Made Me Rich", genre: "Revenge" },
  { slug: "secret_prince", title: "I Married a Secret Prince", genre: "Fairytale" },
  { slug: "amnesia_love", title: "He Forgot He Loved Me", genre: "Tear-jerkers" },
  { slug: "mafia_wife", title: "Wife of the Mafia King", genre: "Forbidden" },
  { slug: "cinderella_ceo", title: "From Maid to His Cinderella", genre: "Rags to Riches" }
];

export function packAssetPath(slug: string, asset: "caption.txt" | "cover.jpg" | "teaser_13s.mp4"): string {
  return `/packs/${slug}/${asset}`;
}

export function posterPath(slug: string): string {
  return `/posters/${slug}.png`;
}
