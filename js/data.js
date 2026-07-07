/* ==========================================================================
   Glamorous Nails — Hardcoded data schema
   This object seeds localStorage on first load, then acts as the "live"
   source of truth that the /admin dashboard edits. Swap the storage layer
   (see GNStore below) for Firebase/Supabase to get true multi-device
   real-time sync — everything else in the site talks to GNStore only,
   so that swap does not require touching booking.js, admin.js, or markup.
   ========================================================================== */

const GN_DEFAULT_DATA = {
  "salon_name": "Glamorous Nails",
  "tagline": "Considered nail artistry, made for everyday hands.",
  "currency": "GH\u20B5",
  "contact": {
    "whatsapp_dispatch": "233240876736",
    "backup_phone": "0502743916",
    "instagram": "glamorousbeautyplus",
    "facebook": "Arda Sodjina",
    "tiktok_url": "https://vm.tiktok.com/ZS9Mjckf9hr5v-1TMml/",
    "facebook_url": "https://facebook.com/",
    "instagram_url": "https://instagram.com/",
    "location": "Haatso Supermarket Junction",
    "map_url": "https://maps.app.goo.gl/JrgtSx8Z6H68VLgX7",
    "hours": [
      { "day": "Mon \u2013 Fri", "time": "9:00 AM \u2013 7:00 PM" },
      { "day": "Saturday", "time": "9:00 AM \u2013 8:00 PM" },
      { "day": "Sunday", "time": "12:00 PM \u2013 6:00 PM" }
    ]
  },
  "categories": [
    {
      "id": "nail_services",
      "name": "Nail Services",
      "icon": "\uD83D\uDC85",
      "items": [
        { "id": "n1", "name": "Short Nails", "price": 150, "image": "./assets/images/short_nails.jpeg" },
        { "id": "n2", "name": "Medium Nails", "price": 170, "image": "./assets/images/medium_nails.jpeg" },
        { "id": "n3", "name": "Long Acrylic", "price": 200, "note": "and above", "image": "./assets/images/long_acrylic.jpeg" },
        { "id": "n4", "name": "Stick-on with Gel and Design", "price": 100, "image": "./assets/images/stick_on_design.jpeg" },
        { "id": "n5", "name": "Stick-on without Design", "price": 80, "image": "./assets/images/stick_on_design1.jpeg" },
        { "id": "n6", "name": "Stick-on with Normal Polish", "price": 50, "image": "./assets/images/stick_on_normal_polish.jpeg" },
        { "id": "n7", "name": "Gel Polish", "price": 45, "image": "./assets/images/gel_polish.jpeg" },
        { "id": "n8", "name": "Normal Polish", "price": 20, "image": "./assets/images/stickon_polish.jpeg" },
        { "id": "n9", "name": "Refill", "price": 100, "image": "./assets/images/refill.jpeg" }
      ]
    },
    {
      "id": "lashes_brows",
      "name": "Lashes & Eyebrows",
      "icon": "\uD83D\uDC41\uFE0F",
      "items": [
        { "id": "l1", "name": "Lashes", "price": 80, "image": "./assets/images/lashes.jpg" },
        { "id": "l2", "name": "Strip Lashes", "price": 30, "image": "./assets/images/strip%20lashes.jpg" },
        { "id": "e1", "name": "Eyebrow Shaping", "price": 15, "image": "./assets/images/eyebrow_shaping.jpg" },
        { "id": "e2", "name": "Microblading", "price": 500, "image": "./assets/images/micro_blading.jpeg" }
      ]
    },
    {
      "id": "facials_mani_pedi",
      "name": "Facial & Manicure/Pedicure",
      "icon": "\u2728",
      "items": [
        { "id": "f1", "name": "Facials", "price": 70, "image": "./assets/images/facials.jpg" },
        { "id": "mp1", "name": "Pedicure", "price": 120, "image": "./assets/images/pedicure.jpg" },
        { "id": "mp2", "name": "Manicure", "price": 80, "image": "./assets/images/manicure.jpeg" }
      ]
    },
    {
      "id": "makeup_services",
      "name": "Makeup Services",
      "icon": "\uD83D\uDC84",
      "items": [
        { "id": "m1", "name": "Makeup", "price": 170, "image": "./assets/images/makeup.jpg" },
        { "id": "m2", "name": "Makeup with Lashes", "price": 200, "image": "./assets/images/makeup_with_lashes.jpg" }
      ]
    },
    {
      "id": "piercing_services",
      "name": "Piercing Services",
      "icon": "\uD83D\uDC8E",
      "items": [
        { "id": "p1", "name": "Nose Pierce", "price": 80, "image": "./assets/images/nose_pierce.jpg" },
        { "id": "p2", "name": "Belly Pierce", "price": 200, "image": "./assets/images/belly_pierce.jpg" },
        { "id": "p3", "name": "Tongue Pierce", "price": 200, "image": "./assets/images/tongue_pierce.png" },
        { "id": "p4", "name": "Tragus Pierce", "price": 100, "image": "./assets/images/tragus_pierce.png" },
        { "id": "p5", "name": "Rook Pierce", "price": 100, "image": "./assets/images/rook_pierce.png" }
      ]
    }
  ],
  /* Dates the salon has explicitly closed (admin-editable). ISO yyyy-mm-dd */
  "closed_dates": [],
  /* Swatch palette used purely as the decorative signature motif */
  "swatches": ["#E8C4B8", "#C6A669", "#9C6B63", "#F3ECE7", "#7A4F49", "#EFD6CC"]
};

/* ---------- GNStore: tiny persistence + pub/sub layer ---------------------
   Today: localStorage + BroadcastChannel (instant sync across open tabs on
   this device — a faithful stand-in for a websocket while there is no
   backend project connected).
   Tomorrow: point GNStore.save()/load() at Supabase/Firebase Realtime DB
   and subscribe to its change stream inside the same `_notify` hook —
   nothing in booking.js / admin.js / render code needs to change.
--------------------------------------------------------------------------- */
const GNStore = (() => {
  const KEY = 'gn_salon_data_v3';
  const BOOKINGS_KEY = 'gn_bookings_v1';
  let channel = null;
  try { channel = new BroadcastChannel('gn_salon_sync'); } catch (e) { channel = null; }
  const listeners = new Set();

  function load() {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(GN_DEFAULT_DATA));
      return structuredClone(GN_DEFAULT_DATA);
    }
    try { return JSON.parse(raw); } catch (e) { return structuredClone(GN_DEFAULT_DATA); }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
    _notify(data);
    if (channel) channel.postMessage({ type: 'data', data });
  }

  function resetToDefault() {
    save(structuredClone(GN_DEFAULT_DATA));
  }

  function _notify(data) {
    listeners.forEach((fn) => { try { fn(data); } catch (e) {} });
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  if (channel) {
    channel.onmessage = (ev) => {
      if (ev.data && ev.data.type === 'data') _notify(ev.data.data);
    };
  }
  window.addEventListener('storage', (ev) => {
    if (ev.key === KEY && ev.newValue) {
      try { _notify(JSON.parse(ev.newValue)); } catch (e) {}
    }
  });

  /* ---- bookings log (used by admin to see incoming requests) ---- */
  function loadBookings() {
    const raw = localStorage.getItem(BOOKINGS_KEY);
    try { return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
  }
  function addBooking(entry) {
    const list = loadBookings();
    list.unshift(entry);
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(list.slice(0, 200)));
    if (channel) channel.postMessage({ type: 'booking' });
  }

  /* ---- cart system ---- */
  const CART_KEY = 'gn_cart_v1';
  const cartListeners = new Set();
  
  function getCart() {
    const raw = localStorage.getItem(CART_KEY);
    try { return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
  }
  
  function _notifyCart(cart) {
    cartListeners.forEach((fn) => { try { fn(cart); } catch (e) {} });
  }

  function toggleCartItem(id) {
    const cart = getCart();
    const idx = cart.indexOf(id);
    if (idx > -1) cart.splice(idx, 1);
    else cart.push(id);
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    _notifyCart(cart);
    if (channel) channel.postMessage({ type: 'cart', cart });
  }

  function clearCart() {
    localStorage.setItem(CART_KEY, JSON.stringify([]));
    _notifyCart([]);
    if (channel) channel.postMessage({ type: 'cart', cart: [] });
  }

  function onCartChange(fn) {
    cartListeners.add(fn);
    return () => cartListeners.delete(fn);
  }

  if (channel) {
    const oldOnMessage = channel.onmessage;
    channel.onmessage = (ev) => {
      if (oldOnMessage) oldOnMessage(ev);
      if (ev.data && ev.data.type === 'cart') _notifyCart(ev.data.cart);
    };
  }
  window.addEventListener('storage', (ev) => {
    if (ev.key === CART_KEY && ev.newValue) {
      try { _notifyCart(JSON.parse(ev.newValue)); } catch (e) {}
    }
  });

  return { load, save, resetToDefault, onChange, loadBookings, addBooking, getCart, toggleCartItem, clearCart, onCartChange };
})();
