import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-storage.js";
import { auth, storage } from "../firebase.js";
import "./data.js";

const AdminAuth = (() => {
  let user = null;
  let ready = false;
  const listeners = new Set();

  onAuthStateChanged(auth, (nextUser) => {
    user = nextUser;
    ready = true;
    listeners.forEach((fn) => fn(user));
  });

  async function login(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  function isLoggedIn() {
    return !!user;
  }

  function onChange(fn) {
    listeners.add(fn);
    if (ready) fn(user);
    return () => listeners.delete(fn);
  }

  return { login, logout, resetPassword, isLoggedIn, onChange };
})();

document.addEventListener("DOMContentLoaded", () => {
  const loginView = document.getElementById("adminLoginView");
  const dashView = document.getElementById("adminDashboard");
  const logoutBtn = document.getElementById("adminLogout");

  function showView(view) {
    [loginView, dashView].forEach((v) => v && v.classList.remove("is-visible"));
    view && view.classList.add("is-visible");
    if (logoutBtn) logoutBtn.style.display = AdminAuth.isLoggedIn() ? "" : "none";
  }

  /* ============ TABS ============ */
 function initTabs() {
    const tabsWrap = document.querySelector(".admin-tabs");
    if (!tabsWrap || tabsWrap.dataset.tabsBound) return;
    tabsWrap.dataset.tabsBound = "true";

    tabsWrap.addEventListener("click", (e) => {
      const btn = e.target.closest(".admin-tab-btn");
      if (!btn) return;

      document.querySelectorAll(".admin-tab-btn").forEach((b) => {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });
      document.querySelectorAll(".admin-tab-panel").forEach((panel) => {
        const active = panel.dataset.tabPanel === btn.dataset.tab;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
      });
    });
  }

  initTabs(); 

  async function refreshAuthView() {
    if (AdminAuth.isLoggedIn()) {
      showView(dashView);
      await GNStore.ensureCatalog();
      GNStore.watchBookings();
      renderDashboard();
    } else {
      showView(loginView);
    }
  }

  const loginForm = document.getElementById("adminLoginForm");
  const loginError = document.getElementById("adminLoginError");
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("admin-email").value.trim();
    const password = document.getElementById("admin-password").value;
    loginError.textContent = "";
    loginError.style.color = "var(--danger)";
    try {
      await AdminAuth.login(email, password);
    } catch (error) {
      loginError.textContent = authMessage(error);
    }
  });

  document.getElementById("showResetLink")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("admin-email").value.trim();
    if (!email) {
      loginError.textContent = "Enter your admin email first, then request a reset link.";
      return;
    }
    try {
      await AdminAuth.resetPassword(email);
      loginError.style.color = "var(--success)";
      loginError.textContent = "Password reset email sent.";
    } catch (error) {
      loginError.style.color = "var(--danger)";
      loginError.textContent = authMessage(error);
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    await AdminAuth.logout();
    refreshAuthView();
  });


  function renderDashboard() {
    const data = GNStore.load();
    renderCategorySelect(data);
    renderPricing(data);
    renderClosedDates(data);
    renderBookingLog();
    renderReviewsLog();

    document.getElementById("resetDefaultsBtn").onclick = async () => {
      if (confirm("Reset all catalog data to the original defaults? This cannot be undone.")) {
        await GNStore.resetToDefault();
        flashSaved("pricingSavedNote");
      }
    };
  }

  function renderCategorySelect(data) {
    const select = document.getElementById("newProductCategory");
    if (!select) return;
    select.innerHTML = data.categories.map((cat) => `<option value="${cat.id}">${cat.name}</option>`).join("");
  }

  function renderPricing(data) {
    const pricingBody = document.getElementById("pricingTableBody");
    pricingBody.innerHTML = data.categories.map((cat) => cat.items.map((item) => `
      <tr data-cat="${cat.id}" data-item="${item.id}">
        <td data-label="Category">${cat.name}</td>
        <td data-label="Image">
          <div class="pricing-thumb-wrap">
            <img class="pricing-thumb" src="${item.image || ''}" alt="" onerror="this.style.display='none'">
            <input type="file" class="edit-image" accept="image/*">
          </div>
        </td>
        <td data-label="Service name"><input type="text" class="edit-name" value="${escapeAttr(item.name)}"></td>
        <td data-label="Price"><input type="number" class="edit-price" value="${Number(item.price) || 0}" min="0"></td>
        <td data-label="Duration (min)"><input type="number" class="edit-duration" value="${Number(item.durationMinutes) || 60}" min="5" step="5" style="width:76px;"></td>
        <td data-label="Home"><input type="checkbox" class="edit-featured" ${item.featured ? 'checked' : ''} title="Show on home page"></td>
        <td data-label="Note"><input type="text" class="edit-note" value="${escapeAttr(item.note || "")}" placeholder="e.g. from"></td>
        <td data-label=""><button class="btn btn-secondary btn-sm delete-product" type="button">Delete</button></td>
      </tr>`).join("")).join("");

    pricingBody.querySelectorAll(".delete-product").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const row = btn.closest("tr");
        const fresh = GNStore.load();
        const cat = fresh.categories.find((c) => c.id === row.dataset.cat);
        if (!cat) return;
        cat.items = cat.items.filter((item) => item.id !== row.dataset.item);
        await GNStore.save(fresh);
        flashSaved("pricingSavedNote");
      });
    });

    /* Live thumbnail preview when a new image is chosen for an existing row */
    pricingBody.querySelectorAll(".edit-image").forEach((input) => {
      input.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const thumb = input.closest(".pricing-thumb-wrap").querySelector(".pricing-thumb");
        thumb.src = URL.createObjectURL(file);
        thumb.style.display = "";
      });
    });

    document.getElementById("savePricing").onclick = async () => {
      const saveBtn = document.getElementById("savePricing");
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";
      try {
        const fresh = GNStore.load();
        const rows = [...pricingBody.querySelectorAll("tr")];

        for (const row of rows) {
          const cat = fresh.categories.find((c) => c.id === row.dataset.cat);
          const item = cat && cat.items.find((i) => i.id === row.dataset.item);
          if (!item) continue;

          item.name = row.querySelector(".edit-name").value.trim() || item.name;
          item.price = Number(row.querySelector(".edit-price").value) || 0;
          item.durationMinutes = Number(row.querySelector(".edit-duration").value) || 60;
          item.featured = !!row.querySelector(".edit-featured")?.checked;
          const note = row.querySelector(".edit-note").value.trim();
          if (note) item.note = note; else delete item.note;

          const file = row.querySelector(".edit-image").files[0];
          if (file) {
            saveBtn.textContent = `Uploading ${item.name}...`;
            item.image = await uploadProductImage(item.id, file);
          }
        }

        await GNStore.save(fresh);
        flashSaved("pricingSavedNote");
      } catch (err) {
        alert("Save failed: " + err.message);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save pricing";
      }
    };
  }

  document.getElementById("addCategoryForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("newCategoryName").value.trim();
    const iconEl = document.getElementById("newCategoryIcon");
    const icon = iconEl ? iconEl.value.trim() : "";
    if (!name) return;
    const fresh = GNStore.load();
    fresh.categories.push({ id: uniqueId(name, "cat"), name, icon, items: [] });
    await GNStore.save(fresh);
    e.target.reset();
    flashSaved("catalogSavedNote");
  });

  document.getElementById("newProductImage")?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    const preview = document.getElementById("newProductImagePreview");
    if (!file) { preview.innerHTML = ""; return; }
    preview.innerHTML = `<img src="${URL.createObjectURL(file)}" style="max-width:120px;border-radius:8px;">`;
  });

  document.getElementById("addProductForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const fresh = GNStore.load();
    const cat = fresh.categories.find((c) => c.id === document.getElementById("newProductCategory").value);
    if (!cat) return;
    const name = document.getElementById("newProductName").value.trim();
    if (!name) return;

    const durEl = document.getElementById("newProductDuration");
    const featEl = document.getElementById("newProductFeatured");
    const item = {
      id: uniqueId(name, "item"),
      name,
      price: Number(document.getElementById("newProductPrice").value) || 0,
      durationMinutes: Number(durEl?.value) || 60,
      featured: Boolean(featEl?.checked)
    };
    const note = document.getElementById("newProductNote").value.trim();
    if (note) item.note = note;

    const file = document.getElementById("newProductImage").files[0];
    if (file) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Uploading image...";
      try {
        item.image = await uploadProductImage(item.id, file);
      } catch (err) {
        alert("Image upload failed: " + err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = "Add product";
        return;
      }
    }

    cat.items.push(item);
    await GNStore.save(fresh);
    e.target.reset();
    document.getElementById("newProductImagePreview").innerHTML = "";
    submitBtn.disabled = false;
    submitBtn.textContent = "Add product";
    renderCategorySelect(fresh);
    flashSaved("catalogSavedNote");
  });

  async function uploadProductImage(itemId, file) {
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const imgRef = ref(storage, `products/${itemId}-${Date.now()}-${safeName}`);
    await uploadBytes(imgRef, file);
    return getDownloadURL(imgRef);
  }

  function renderClosedDates(data) {
    const wrap = document.getElementById("closedDatesList");
    wrap.innerHTML = data.closed_dates.length
      ? data.closed_dates.map((d) => `<span class="closed-date-tag">${d} <button data-date="${d}" aria-label="Reopen date">&times;</button></span>`).join("")
      : `<span class="form-note">No closed dates - every day is bookable.</span>`;
    wrap.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const fresh = GNStore.load();
        fresh.closed_dates = fresh.closed_dates.filter((d) => d !== btn.dataset.date);
        await GNStore.save(fresh);
        flashSaved("pricingSavedNote");
      });
    });
  }

  document.getElementById("addClosedDate").addEventListener("click", async () => {
    const input = document.getElementById("newClosedDate");
    if (!input.value) return;
    const fresh = GNStore.load();
    if (!fresh.closed_dates.includes(input.value)) fresh.closed_dates.push(input.value);
    fresh.closed_dates.sort();
    await GNStore.save(fresh);
    input.value = "";
    flashSaved("pricingSavedNote");
  });

  function renderBookingLog() {
    const wrap = document.getElementById("bookingLog");
    const list = GNStore.loadBookings();
    wrap.innerHTML = list.length
      ? list.slice(0, 50).map((b) => `
          <tr data-id="${b.id}">
            <td data-label="Name">${escapeHTML(b.name || "Guest")}</td>
            <td data-label="Phone">${escapeHTML(b.phone || "-")}</td>
            <td data-label="Date">${escapeHTML(b.date || "-")}</td>
            <td data-label="Time">${escapeHTML(b.time || "-")}</td>
            <td data-label="Services">${(b.services || []).map(escapeHTML).join(", ") || "-"}</td>
            <td data-label=""><button class="btn btn-secondary btn-sm delete-booking" type="button" data-id="${b.id}">Delete</button></td>
          </tr>`).join("")
      : `<tr><td colspan="6"><p class="form-note">No booking requests yet.</p></td></tr>`;

    wrap.querySelectorAll(".delete-booking").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this client's booking? This cannot be undone.")) return;
        btn.disabled = true;
        btn.textContent = "Deleting...";
        try {
          await GNStore.deleteBooking(btn.dataset.id);
        } catch (err) {
          alert("Delete failed: " + err.message);
          btn.disabled = false;
          btn.textContent = "Delete";
        }
      });
    });
  }

  async function renderReviewsLog() {
    const wrap = document.getElementById("reviewsLog");
    if (!wrap || !GNStore.getReviews) return;
    const list = await GNStore.getReviews();
    wrap.innerHTML = list.length
      ? list.map((r) => `
          <tr>
            <td data-label="Author">${escapeHTML(r.author || "Client")}</td>
            <td data-label="Service">${escapeHTML(r.service || "-")}</td>
            <td data-label="Rating">${Number(r.rating) || 5} / 5</td>
            <td data-label="Review">${escapeHTML(r.quote || "")}</td>
            <td data-label=""><button class="btn btn-secondary btn-sm delete-review" type="button" data-id="${escapeAttr(r.id || '')}">Delete</button></td>
          </tr>`).join("")
      : `<tr><td colspan="5"><p class="form-note">No reviews found.</p></td></tr>`;
    wrap.querySelectorAll(".delete-review").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        if (!id || !confirm("Delete this review from Firestore?")) return;
        try {
          await GNStore.deleteReview(id);
          renderReviewsLog();
        } catch (err) {
          alert("Delete failed (local fallback reviews are edited in data/reviews.json): " + err.message);
        }
      });
    });
  }

  function flashSaved(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = "Saved - changes are live on the site now.";
    el.style.opacity = 1;
    setTimeout(() => { el.style.opacity = 0.6; }, 2200);
  }

  function uniqueId(text, prefix) {
    const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 32) || prefix;
    return `${slug}_${Date.now().toString(36)}`;
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  function escapeAttr(value) {
    return escapeHTML(value);
  }

  function authMessage(error) {
    const code = error?.code ? ` (${error.code})` : "";
    if (error?.code === "auth/invalid-credential") return `Email or password is incorrect.${code}`;
    if (error?.code === "auth/too-many-requests") return `Too many attempts. Try again later.${code}`;
    if (error?.code === "auth/operation-not-allowed") return `Email/Password login is disabled in Firebase Console.${code}`;
    if (error?.code === "auth/unauthorized-domain" || error?.code === "auth/unauthorized-continue-uri") {
      return `Add ${window.location.hostname} to Firebase Console -> Authentication -> Authorized domains.${code}`;
    }
    return `Unable to sign in: ${error?.message || "Check the admin account and try again."}`;
  }

  GNStore.onChange(() => { if (AdminAuth.isLoggedIn()) renderDashboard(); });
  GNStore.onBookingsChange(() => { if (AdminAuth.isLoggedIn()) renderBookingLog(); });
  AdminAuth.onChange(refreshAuthView);
});