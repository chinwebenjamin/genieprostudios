ALTER TABLE public.studio_settings
  ADD COLUMN IF NOT EXISTS guidelines text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS project_terms text[] NOT NULL DEFAULT '{}';

UPDATE public.studio_settings SET guidelines = ARRAY[
  'Minimum 70% payment is required to secure a booking. Full payment is required before studio access.',
  'Prices are fixed and non-negotiable.',
  'Payments are accepted only to the official company account. Payments to any other recipient are at the client''s own risk.',
  'Advance booking is required — availability is not guaranteed without it.',
  'Missed sessions without prior notice are non-refundable.',
  'Rescheduling a session in advance attracts a charge of 25% of the initial stated price.',
  'Clients should arrive 30 minutes early for sound checks. After 30 minutes, the booked session time begins counting down regardless.',
  'Additional setup time beyond the grace period is charged at ₦25,000 per hour.',
  'Booked time is strictly adhered to. Additional time must be requested in advance.',
  'Only bottled water is allowed. No food, snacks or bags are permitted in the studio space.'
] WHERE coalesce(array_length(guidelines,1),0) = 0;

UPDATE public.studio_settings SET project_terms = ARRAY[
  'Recorded video/audio files not collected or actively worked on are stored for 14 days only.',
  'File damage or loss on the studio''s end warrants a refund of the stated price only, with no further liability.',
  'Genie Pro takes 10% of distribution/publishing royalties, but only if the song or project was produced or mixed by them, unless otherwise agreed.',
  'Genie Pro reserves the right to use session content for advertising and promotion of their brand and work.'
] WHERE coalesce(array_length(project_terms,1),0) = 0;

DROP POLICY IF EXISTS "settings readable" ON public.studio_settings;
CREATE POLICY "settings readable" ON public.studio_settings FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.studio_settings TO anon;