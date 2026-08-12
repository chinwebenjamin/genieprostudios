export type Period = "day" | "night";

export type StudioPackage = {
  key: string;
  label: string;
  tagline: string;
  includes: string[];
  excludes: string[];
  rates: Record<Period, { hours: number; price: number }[]>;
};

export const PACKAGES: StudioPackage[] = [
  {
    key: "rehearsal",
    label: "Rehearsal Package",
    tagline: "Stereo recording and full access to studio facilities.",
    includes: ["Stereo recording", "Full studio facilities"],
    excludes: ["No production lights", "Cameras not permitted"],
    rates: {
      day: [
        { hours: 2, price: 60000 },
        { hours: 4, price: 110000 },
        { hours: 6, price: 140000 },
        { hours: 12, price: 280000 },
      ],
      night: [
        { hours: 2, price: 60000 },
        { hours: 4, price: 90000 },
        { hours: 6, price: 120000 },
      ],
    },
  },
  {
    key: "virtual",
    label: "Virtual Package",
    tagline: "Facebook or YouTube Live sessions with production lights.",
    includes: ["Stereo recording", "Studio facilities", "Production lights"],
    excludes: [
      "Video livestreaming not included by default",
      "One-camera HD livestream to one platform on request — ₦70,000 / 2hrs",
    ],
    rates: {
      day: [
        { hours: 2, price: 80000 },
        { hours: 4, price: 140000 },
        { hours: 6, price: 180000 },
      ],
      night: [
        { hours: 2, price: 80000 },
        { hours: 4, price: 140000 },
        { hours: 6, price: 180000 },
      ],
    },
  },
  {
    key: "freelance",
    label: "Freelance Producer / Video Filming",
    tagline: "Extracurricular sessions — bring your own producer or video director.",
    includes: ["Stereo recording", "Studio facilities", "Production lights"],
    excludes: ["Client must bring their own producer / video director"],
    rates: {
      day: [
        { hours: 2, price: 80000 },
        { hours: 4, price: 140000 },
        { hours: 6, price: 180000 },
      ],
      night: [
        { hours: 2, price: 80000 },
        { hours: 4, price: 140000 },
        { hours: 6, price: 180000 },
      ],
    },
  },
  {
    key: "multitrack",
    label: "Multitrack Recording (No Screen)",
    tagline: "Stereo & multi-track recording with RGB, beam and key lights.",
    includes: ["Stereo & multi-track recording", "Studio facilities", "RGB, Beam & Key lights"],
    excludes: [
      "Excludes video coverage, mixing & mastering, post-production",
      "Videographers available on request / negotiation",
    ],
    rates: {
      day: [
        { hours: 2, price: 100000 },
        { hours: 4, price: 180000 },
        { hours: 6, price: 280000 },
        { hours: 12, price: 600000 },
      ],
      night: [
        { hours: 2, price: 100000 },
        { hours: 4, price: 180000 },
        { hours: 6, price: 280000 },
      ],
    },
  },
];

export const GUIDELINES = [
  "Minimum 70% payment is required to secure a booking. Full payment is required before studio access.",
  "Prices are fixed and non-negotiable.",
  "Payments are accepted only to the official company account. Payments to any other recipient are at the client's own risk.",
  "Advance booking is required — availability is not guaranteed without it.",
  "Missed sessions without prior notice are non-refundable.",
  "Rescheduling a session in advance attracts a charge of 25% of the initial stated price.",
  "Clients should arrive 30 minutes early for sound checks. After 30 minutes, the booked session time begins counting down regardless.",
  "Additional setup time beyond the grace period is charged at ₦25,000 per hour.",
  "Booked time is strictly adhered to. Additional time must be requested in advance.",
  "Only bottled water is allowed. No food, snacks or bags are permitted in the studio space.",
];

export const PROJECT_TERMS = [
  "Recorded video/audio files not collected or actively worked on are stored for 14 days only.",
  "File damage or loss on the studio's end warrants a refund of the stated price only, with no further liability.",
  "Genie Pro takes 10% of distribution/publishing royalties, but only if the song or project was produced or mixed by them, unless otherwise agreed.",
  "Genie Pro reserves the right to use session content for advertising and promotion of their brand and work.",
];

export function packageByKey(key: string) {
  return PACKAGES.find((p) => p.key === key);
}
