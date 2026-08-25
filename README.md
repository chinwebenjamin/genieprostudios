# Studio Genie

# Genie Pro Music Studio â€” App Spec

**App name:** Genie Pro Music Studio
**Purpose:** A booking platform for recording/rehearsal studio sessions, with two user roles: Manager and Client.
**Branding:** App should have a settings area where the manager can upload/change the company logo and app profile picture (Genie Pro Music Studio branding).

---

## 1. User Roles

### Manager
- Primary admin account: username `admin`, password `12334566` (changeable after first login).
- Admin can generate a **permanent, reusable invite/secret code** (`54953947`) â€” any new manager uses this once during registration to gain manager access. This applies even if the new manager signs in via Google â€” Google handles identity, but the invite code is what actually grants manager-level permissions.
- Can view/review all bookings across all clients.
- Can create and manage **equipment/service categories** and their **quantities** (e.g. how many of each mic type, keyboards, etc). If a category is deleted, clients immediately lose access/visibility to it.
- Verifies payment receipts and approves/declines pending bookings (see Section 4).
- Receives all automated session notifications (see Section 3).

### Client
- Logs in via **Google account** (no separate password to manage).
- Can browse available equipment/service categories (as set up by the Manager).
- Can book a studio session, selecting a date/time and choosing from available categories.
- Can only see **their own bookings** â€” not other clients' bookings â€” for privacy.
- Receives all automated session notifications (see Section 3).

---

## 2. Equipment / Category System

- Manager creates categories representing what's available in the studio (e.g. "BGV Mics," "Lead Mics," "Drum Kit," "Keyboard," "Percussion").
- Clients select from these categories when booking a session (e.g. "6 BGV mics," "full drum kit").
- **Studio-provided on-site (fixed):** a full drum kit and a keyboard. No screens are available at all, under any package.
- **Client must outsource/bring their own:** everything else â€” bass guitar, lead guitar, percussionist, lead guitarist, etc. For these, the client specifies quantity needed when booking (e.g. how many percussionists they're bringing).
- **Current in-house inventory (as of Aug 2026):** 6 BGV mics, 2 lead mics. Quantities fluctuate as equipment goes out/comes back, so **managers must be able to edit category quantities in real time** to reflect current availability â€” this is a core, frequently-used manager feature, not a one-time setup.
- The category system should make clear to the client which items are studio-provided vs. client-provided.

## 2a. Booking / Scheduling Rules
- Once a client selects a session time, that slot is **locked and unavailable to other clients** â€” no double-booking.
- A **mandatory 30-minute buffer** is automatically enforced between consecutive bookings, for setup/teardown (e.g. an 11amâ€“1pm session means the next session cannot start before 1:30pm).

---

## 3. Automated Notification / Reminder System

Notifications go to **both** the client and the manager for every booked session.

### Standard schedule (session booked well in advance)
| Time before session | Notification |
|---|---|
| 3 days before | "You have a session with Genie Pro Music Studio in 3 days." |
| 2 days before | "You have a session in 2 days." |
| 1 day before | "You have a session in 1 day." |
| 45 minutes before | "Session starting in 45 minutes." |
| 30 minutes before | "Session starting in 30 minutes." |

### Same-day booking (short-notice sessions)
If a session is booked with less lead time than the standard schedule (e.g. booked 4 hours before the session), the reminders scale down proportionally instead of following the day-based schedule above. Example: booked 4 hours ahead â†’
- Immediate confirmation notification
- Reminder at 2 hours before
- Reminder at 30 minutes before

*(Open question: what's the general rule for scaling â€” is it always "immediately, halfway, then 30 min before," or something else for bookings made e.g. 1 hour or 8 hours ahead? Worth defining a simple formula, e.g. reminders at 100%/50%/30-min-mark of the lead time.)*

### Delivery channel
- Reminders should be delivered as **push notifications from within the app itself** (not dependent on OS-level scheduling that could be blocked or delayed).
- **Email** reminders as an additional backup channel.

---

## 4. Payment Flow (app does not process payments directly)

1. Client selects a session date/time. **The time locks in at this point and cannot be changed afterward** â€” this is intentional, to prevent disputes later about what time slot was actually paid for.
2. Client is shown a separate page with the studio's **bank account details** to make payment externally (bank transfer).
3. Client uploads a **photo of the payment receipt** and clicks a **"Payment Made"** button.
4. Booking status changes to **Pending**.
5. Manager reviews the uploaded receipt, verifies the payment, and **approves** (or declines) the booking.
6. Only after manager approval does the booking become confirmed and the notification countdown begins.
7. When approving, the manager marks the payment as **Full** or **Partial**. If Partial, the manager enters the **remaining balance owed**. This balance is then included in all subsequent automated reminder messages to the client (e.g. "...reminder your session is in 2 days. Outstanding balance: â‚¦X") until the session takes place.
8. If Partial, a **"Complete Payment"** button appears on the client's booking. Tapping it shows the studio account details again so the client can pay the remaining balance, then the client marks it paid â€” same as the initial flow. The manager verifies and approves the balance as settled.
9. Before making any payment (initial or balance), the client must **tick a checkbox agreeing to the studio's Guidelines and Terms & Conditions** (see Section 5) â€” payment cannot proceed without this.

*(Note: minimum 70% payment to secure a booking per current studio policy â€” see Section 5.)*

---

## 5. Packages / Pricing (from current studio rate card)

All prices in Nigerian Naira (â‚¦). Each package has separate Day and Night hourly rates.

### Package 1: Rehearsal Package
- Includes stereo recording and full access to studio facilities.
- Excludes production lights. Cameras not permitted.
- **Day:** 2hrs â‚¦60,000 Â· 4hrs â‚¦110,000 Â· 6hrs â‚¦140,000 Â· Full day (12hrs) â‚¦280,000
- **Night:** 2hrs â‚¦60,000 Â· 4hrs â‚¦90,000 Â· 6hrs â‚¦120,000

### Package 2: Virtual Package (Facebook or YouTube Live)
- Includes stereo recording, studio facilities, and production lights.
- Does not include video livestreaming by default. One-camera-angle HD livestream to one social platform available on request for â‚¦70,000/2hrs.
- **Day:** 2hrs â‚¦80,000 Â· 4hrs â‚¦140,000 Â· 6hrs â‚¦180,000
- **Night:** 2hrs â‚¦80,000 Â· 4hrs â‚¦140,000 Â· 6hrs â‚¦180,000

### Package 3: Freelance Producer / Video Filming Package (Extracurricular)
- Includes stereo recording, studio facilities, and production lights.
- Client must bring their own producer/video director for this session type.
- **Day:** 2hrs â‚¦80,000 Â· 4hrs â‚¦140,000 Â· 6hrs â‚¦180,000
- **Night:** 2hrs â‚¦80,000 Â· 4hrs â‚¦140,000 Â· 6hrs â‚¦180,000

### Package 4: Multitrack Recording Without Screen
- Includes stereo & multi-track recording, studio facilities, and production lights (RGB, Beam & Key lights).
- Excludes video coverage, mixing & mastering, and post-production. Videographers available on request/negotiation.
- **Day:** 2hrs â‚¦100,000 Â· 4hrs â‚¦180,000 Â· 6hrs â‚¦280,000 Â· Full day (12hrs) â‚¦600,000
- **Night:** 2hrs â‚¦100,000 Â· 4hrs â‚¦180,000 Â· 6hrs â‚¦280,000

### Studio Guidelines (to reflect in app copy / booking terms)
- Minimum 70% payment required to secure a booking (full payment required before studio access).
- Prices are fixed and non-negotiable.
- Payments accepted only to the official company account; payments to any other recipient are at the client's own risk.
- Advance booking required â€” availability is not guaranteed without it.
- Missed sessions without prior notice are non-refundable.
- Rescheduling a session in advance attracts a charge of 25% of the initial stated price.
- Clients should arrive 30 minutes early for sound checks; after 30 minutes, the booked session time begins counting down regardless.
- Additional setup time beyond the grace period is charged at â‚¦25,000/hour.
- Booked time is strictly adhered to; additional time must be requested in advance.
- Only bottled water allowed; no food/snacks and no bags permitted in the studio space.

### Project Management Terms
- Recorded video/audio files not collected or actively worked on are stored for 14 days only.
- File damage/loss on the studio's end warrants a refund of the stated price only (no further liability).
- Genie Pro takes 10% of distribution/publishing royalties, but only if the song/project was produced or mixed by them (unless otherwise agreed).
- Genie Pro reserves the right to use session content for advertising/promotion of their brand and work.

---

## 6. Open Questions Before Building
1. Additional setup-time overage (â‚¦25,000/hr) â€” confirmed to be left as a manual/policy item, not automatically tracked by the app.
2. Any package-specific add-ons (e.g. livestream add-on, videographer negotiation) â€” should clients be able to request these directly in-app, or only by contacting the studio?
3. Should the 25% rescheduling fee be calculated automatically by the app when a client reschedules, or just stated as policy with the manager handling it manually?

---

*This document is meant to be pasted as the initial prompt into Lovable (or edited further) to scaffold the app in one pass.*

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://genieprostudios.lovable.app

