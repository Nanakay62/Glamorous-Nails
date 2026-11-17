import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { db } from "../firebase.js";

const GN_DEFAULT_DATA = {
  "salon_name": "Glamorous Nails",
  "tagline": "Considered nail artistry, made for everyday hands.",
  "currency": "GH\u20B5",
  "contact": {
    "whatsapp_dispatch": "233502743916",
    "backup_phone": "+233502743916",
    "instagram": "glamorousbeautyplus",
    "facebook": "Arda Sodjina",
    "tiktok_url": "https://vm.tiktok.com/ZS9Mjckf9hr5v-1TMml/",
    "facebook_url": "https://facebook.com/",
    "instagram_url": "https://instagram.com/",
    "location": "Haatso Supermarket Junction",
    "map_url": "https://maps.app.goo.gl/JrgtSx8Z6H68VLgX7",
    "hours": [
      { "day": "Mon - Fri", "time": "9:00 AM - 7:00 PM" },
      { "day": "Saturday", "time": "9:00 AM - 8:00 PM" },
      { "day": "Sunday", "time": "12:00 PM - 6:00 PM" }
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
  "closed_dates": [],
  "swatches": ["#E8C4B8", "#C6A669", "#9C6B63", "#F3ECE7", "#7A4F49", "#EFD6CC"]
};

const GNStore = (() => {
  const catalogRef = doc(db, "settings", "catalog");
  const listeners = new Set();
  const bookingListeners = new Set();
  const cartListeners = new Set();
  const CART_KEY = "gn_cart_v1";
  let currentData = structuredClone(GN_DEFAULT_DATA);
  let bookings = [];
  let catalogReady = false;
  let catalogExists = false;
  let bookingsUnsub = null;
  let resolveCatalogReady;
  const catalogReadyPromise = new Promise((resolve) => { resolveCatalogReady = resolve; });

  function normalizeCatalog(data) {
    return {
      ...structuredClone(GN_DEFAULT_DATA),
      ...(data || {}),
      contact: { ...GN_DEFAULT_DATA.contact, ...((data && data.contact) || {}) },
      categories: Array.isArray(data?.categories) ? data.categories : structuredClone(GN_DEFAULT_DATA.categories),
      closed_dates: Array.isArray(data?.closed_dates) ? data.closed_dates : []
    };
  }

  function load() {
    return structuredClone(currentData);
  }

  async function save(data) {
    currentData = normalizeCatalog(data);
    await setDoc(catalogRef, currentData);
    _notify(currentData);
  }

  async function resetToDefault() {
    await save(structuredClone(GN_DEFAULT_DATA));
  }

  async function ensureCatalog() {
    await catalogReadyPromise;
    if (!catalogExists) await save(currentData);
  }

  function _notify(data) {
    listeners.forEach((fn) => { try { fn(structuredClone(data)); } catch (e) {} });
  }

  function onChange(fn) {
    listeners.add(fn);
    if (catalogReady) fn(load());
    return () => listeners.delete(fn);
  }

  onSnapshot(catalogRef, (snap) => {
    catalogReady = true;
    catalogExists = snap.exists();
    currentData = normalizeCatalog(snap.exists() ? snap.data() : GN_DEFAULT_DATA);
    resolveCatalogReady();
    _notify(currentData);
  }, (error) => {
    catalogReady = true;
    console.error("Catalog sync failed", error);
    resolveCatalogReady();
    _notify(currentData);
  });

  function loadBookings() {
    return bookings.map((b) => ({ ...b }));
  }

  async function addBooking(entry) {
    await addDoc(collection(db, "bookings"), entry);
  }

  async function deleteBooking(id) {
    await deleteDoc(doc(db, "bookings", id));
  }

  async function refreshBookingsOnce() {
    const snap = await getDocs(query(collection(db, "bookings"), orderBy("created_at", "desc"), limit(50)));
    bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    _notifyBookings();
  }

  function watchBookings() {
    if (bookingsUnsub) return bookingsUnsub;
    bookingsUnsub = onSnapshot(
      query(collection(db, "bookings"), orderBy("created_at", "desc"), limit(50)),
      (snap) => {
        bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        _notifyBookings();
      },
      (error) => console.error("Booking sync failed", error)
    );
    return bookingsUnsub;
  }

  function _notifyBookings() {
    bookingListeners.forEach((fn) => { try { fn(loadBookings()); } catch (e) {} });
  }

  function onBookingsChange(fn) {
    bookingListeners.add(fn);
    fn(loadBookings());
    return () => bookingListeners.delete(fn);
  }

  function getCart() {
    const raw = localStorage.getItem(CART_KEY);
    try { return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
  }

  function _notifyCart(cart) {
    cartListeners.forEach((fn) => { try { fn([...cart]); } catch (e) {} });
  }

  function toggleCartItem(id) {
    const cart = getCart();
    const idx = cart.indexOf(id);
    if (idx > -1) cart.splice(idx, 1);
    else cart.push(id);
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    _notifyCart(cart);
  }

  function clearCart() {
    localStorage.setItem(CART_KEY, JSON.stringify([]));
    _notifyCart([]);
  }

  function onCartChange(fn) {
    cartListeners.add(fn);
    return () => cartListeners.delete(fn);
  }

  window.addEventListener("storage", (ev) => {
    if (ev.key === CART_KEY && ev.newValue) {
      try { _notifyCart(JSON.parse(ev.newValue)); } catch (e) {}
    }
  });

  return {
    load,
    save,
    resetToDefault,
    ensureCatalog,
    onChange,
    loadBookings,
    addBooking,
    deleteBooking,
    refreshBookingsOnce,
    watchBookings,
    onBookingsChange,
    getCart,
    toggleCartItem,
    clearCart,
    onCartChange
  };
})();

window.GN_DEFAULT_DATA = GN_DEFAULT_DATA;
window.GNStore = GNStore;