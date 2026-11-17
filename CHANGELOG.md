# Changelog

## Summary of Changes
- **Brand & Visual Direction (`css/styles.css`)**:
  - Updated palette to warm cream `#FBF6F1`, blush `#F3E4DC`, ink `#1E1715`, muted text `#675753`, oxblood `#7A2E3B`, and WhatsApp green `#0F7A40` (with white text).
  - Switched fonts to `Bricolage Grotesque` (headings) and `DM Sans` (body) with `display=swap`.
  - Removed template tells (diagonal hatch borders, emoji in filter chips, dot-bullet pill chips).
  - Added `:focus-visible` outlines and 44px minimum tap targets.
- **Home Page (`index.html`, `js/main.js`, `data/reviews.json`)**:
  - Added top announcement bar (hours, Haatso Supermarket Junction, cash/mobile money).
  - Rebuilt hero with plain headline, intro, "Book an appointment" + "Chat on WhatsApp" CTAs, trust row with inline SVGs, and a 3-photo nail-focused grid.
  - Added "Popular services" (4 cards with duration, price, and booking link), "Recent work" (6-photo grid), "What clients say" (3 review cards from Firestore `reviews` or `data/reviews.json`), "Owner" section, "Find us" (directions, hours table, Google Maps embed, WhatsApp/call), and mobile sticky bottom bar (`Book` + `WhatsApp`).
- **Services & Booking (`services.html`, `js/services.js`, `booking.html`, `js/booking.js`, `js/data.js`)**:
  - Added `durationMinutes` and `featured` to every service in `GN_DEFAULT_DATA`.
  - Long Acrylic priced as `from GH₵200`.
  - Fixed "All services" category headings, equal-height service cards (`4:3` images), and preserved active category filter when toggling "Add to booking".
  - Added piercing age/sterilisation/aftercare notes.
  - Updated booking flow to 4 labeled steps ("Four steps, one message."), removed header cart icon/badge, added Ghana phone validation (`024/054/055/059/020/050/026/027/057/023/028` and `+233`), and filtered time slots by total selected duration vs. closing hours.
- **Bug Fixes & SEO (`contact.html`, `services.html`, `booking.html`, `index.html`)**:
  - Fixed Contact page hours layout using `.hours-table`.
  - Added `LocalBusiness` (`NailSalon`) JSON-LD, updated titles/meta descriptions with `"nail salon Haatso Accra"`, OG image, and SVG favicon.
- **Admin (`js/admin.js`)**:
  - Added `durationMinutes` and `featured` (show on home page) inputs to the service pricing table.

## Items You Must Supply
1. **Owner name & bio**: Replace `[OWNER NAME]` and the bio `[PLACEHOLDER]` in `index.html`.
2. **Real client reviews**: Replace `[PLACEHOLDER]` entries in `data/reviews.json` (or add documents to the Firestore `reviews` collection).
3. **Landmark directions**: Replace `[PLACEHOLDER]` directions in `index.html` ("Find us").
4. **Cancellation & lateness policy**: Replace `[PLACEHOLDER]` policy text in `booking.html`.
5. **Service durations**: Review and adjust `durationMinutes` per service in Admin.
6. **Photos & Instagram**: Verify hero/gallery photos and `@glamorousbeautyplus` handle.
7. **Google Maps pin**: Confirm the embedded map pin matches your exact shop location.
