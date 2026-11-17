# Firebase production setup

The site now uses Firebase Auth and Firestore directly from the browser.

## Admin account

In Firebase Console, enable **Authentication > Sign-in method > Email/Password**, then create the admin user under **Users**. That email and password are used on `/admin.html`.

## Firestore data

Deploy `firestore.rules` from this folder, or paste its contents into **Firestore Database > Rules**.

The app uses:

- `settings/catalog` for categories, products, prices, contact details, and closed dates.
- `bookings/{bookingId}` for customer booking requests.

Public visitors can read the catalog and create bookings. Only signed-in admins can edit the catalog and read booking history.

## First admin login

The first signed-in admin visit seeds `settings/catalog` with the default catalog if it does not already exist. After that, all Add category, Add product, Delete, price, and closed-date edits update Firestore and appear on `services.html` and `booking.html` through live `onSnapshot` listeners.
