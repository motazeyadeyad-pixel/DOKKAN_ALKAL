// ==========================================
// إعدادات Firebase
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyCijhMKaJTyfL8p76-31GbfzCpLF2bui1A",
    authDomain: "motaz-f6c67.firebaseapp.com",
    databaseURL: "https://motaz-f6c67-default-rtdb.firebaseio.com",
    projectId: "motaz-f6c67",
    storageBucket: "motaz-f6c67.firebasestorage.app",
    messagingSenderId: "553305284670",
    appId: "1:553305284670:web:4fdf78e304fd7aaa34b16f",
    measurementId: "G-YLHN11XE88"
};

if (typeof firebase !== "undefined" && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();
const auth = firebase.auth ? firebase.auth() : null; // تأكد إنك مضيف firebase-auth.js بالـ HTML
if (auth) { auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {}); }

// ==========================================
// إشعار خفيف بدل alert() المزعج
// ==========================================
function showToast(msg, duration = 2200) {
    let box = document.getElementById("toast-container");
    if (!box) {
        box = document.createElement("div");
        box.id = "toast-container";
        document.body.appendChild(box);
    }
    const t = document.createElement("div");
    t.className = "toast-msg";
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.classList.add("show"), 10);
    setTimeout(() => {
        t.classList.remove("show");
        setTimeout(() => t.remove(), 300);
    }, duration);
}

// ==========================================
// إعدادات Cloudinary لرفع الصور
// ==========================================
const CLOUDINARY_CLOUD_NAME = "gfyyessl";
const CLOUDINARY_UPLOAD_PRESET = "dokan_preset";

function openCloudinaryUploadWidget(callback) {
    if (typeof cloudinary === "undefined") {
        alert("مكتبة Cloudinary غير محملة!");
        return;
    }
    cloudinary.createUploadWidget({
        cloudName: CLOUDINARY_CLOUD_NAME,
        uploadPreset: CLOUDINARY_UPLOAD_PRESET,
        sources: ['local', 'url', 'camera'],
        multiple: false,
        language: 'ar'
    }, (error, result) => {
        if (!error && result && result.event === "success") {
            if (callback) callback(result.info.secure_url);
        }
    }).open();
}

// ==========================================
// متغيرات الموقع
// ==========================================
let allProductsList = [];
let cart = [];
let currentCategory = 'الكل';
let userLocationUrl = "";

const TELEGRAM_BOT_TOKEN = "8832237966:AAFM0maLZu_CPxOKk77kGblwx2FJKwJ5X7U";
const TELEGRAM_CHAT_ID = "1953861313";
const MY_PHONE_NUMBER = "962775279117";

// إعدادات السرعة
const PAGE_SIZE = 45;                        // عدد المنتجات في كل دفعة (وأول ما يفتح الموقع)
const CACHE_KEY = "products_cache_v1";      // تخزين المنتجات بالجهاز
let currentFiltered = [];
let renderedCount = 0;
let loadMoreObserver = null;

// ==========================================
// حساب المستخدم الحالي + المفضلة
// ==========================================
let currentUser = null;          // كائن Firebase Auth الحالي
let currentUserProfile = null;   // {name, phone, email}
let userFavorites = {};          // { productId: true }
let ratingStatsCache = {};       // { productId: {sum, count} }

// حالات تتبع الطلب (بالترتيب)
const ORDER_STATUSES = ["تم استلام الطلب", "جاري التجهيز", "خرج للتوصيل", "تم التسليم"];

// ==========================================
// أدوات تسريع التحميل
// ==========================================

// تصغير صور Cloudinary تلقائياً
function optimizeImage(url, size = 250) {
    if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
    if (url.includes("/upload/w_")) return url; // مصغّرة أصلاً
    return url.replace("/upload/", `/upload/w_${size},h_${size},c_fill,q_auto,f_auto/`);
}

// صورة بديلة خفيفة
const PLACEHOLDER_IMG =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150'><rect width='100%' height='100%' fill='%23eeeeee'/></svg>";

// حماية من الرموز الخاصة
function escapeHTML(str) {
    return String(str ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

// تأخير البحث حتى يتوقف المستخدم عن الكتابة
function debounce(fn, delay = 250) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// تحويل نتيجة Firebase إلى قائمة (بنفس ترتيب Firebase)
function snapshotToList(snapshot) {
    const list = [];
    snapshot.forEach((child) => {
        list.push({ id: child.key, ...child.val() });
    });
    return list;
}

// ==========================================
// جلب المنتجات
// المرحلة 1: أول دفعة فقط (سريعة جداً)
// المرحلة 2: باقي المنتجات بالخلفية
// ==========================================
function fetchProductsFromFirebase() {
    const container = document.getElementById("products-container");

    // إذا الزبون زار الموقع قبل: اعرض النسخة المخزنة فوراً
    let cachedJson = null;
    try {
        cachedJson = localStorage.getItem(CACHE_KEY);
        if (cachedJson) {
            allProductsList = JSON.parse(cachedJson);
            displayProducts();
        }
    } catch (e) {
        cachedJson = null;
    }

    if (!cachedJson && container) {
        container.innerHTML = `<p style="text-align:center; width:100%; grid-column:1/-1; padding:20px; font-weight:bold;">جاري تحميل المنتجات...</p>`;
    }

    const t0 = performance.now();

    function loadAllProducts() {
        db.ref("products").once("value").then((snapshot) => {
            const list = snapshotToList(snapshot);
            const newJson = JSON.stringify(list);
            console.log(`كل المنتجات: ${Math.round(performance.now() - t0)}ms | ${list.length} منتج | ${(newJson.length / 1024).toFixed(0)}KB`);

            // إذا ما تغيّر شي عن النسخة المخزنة، لا تعيد الرسم
            if (cachedJson && cachedJson === newJson) return;

            allProductsList = list;
            try { localStorage.setItem(CACHE_KEY, newJson); } catch (e) { }

            if (cachedJson || renderedCount === 0) {
                displayProducts();          // تغيّرت البيانات أو ما انعرض شي: ارسم من جديد
            } else {
                continueAfterFullLoad();    // نكمل بدون ما نمسح اللي انعرض
            }
        }).catch((error) => {
            console.error("خطأ:", error);
            if (container && allProductsList.length === 0) {
                container.innerHTML = `<p style="text-align:center; color:red; grid-column:1/-1;">تعذر تحميل المنتجات، تحقق من الإنترنت.</p>`;
            }
        });
    }

    if (cachedJson) {
        // عندنا نسخة مخزنة: حدّثها بالخلفية
        loadAllProducts();
        return;
    }

    // أول زيارة: أول دفعة فقط
    db.ref("products").limitToFirst(PAGE_SIZE).once("value").then((snapshot) => {
        const list = snapshotToList(snapshot);
        console.log(`أول ${list.length} منتجات: ${Math.round(performance.now() - t0)}ms`);
        if (allProductsList.length === 0 && list.length > 0) {
            allProductsList = list;
            displayProducts();
        }
    }).catch((error) => {
        console.error("خطأ بالمرحلة الأولى:", error);
    }).then(loadAllProducts);
}

function filterByCategory(category, btnElement) {
    currentCategory = category;
    const buttons = document.querySelectorAll('.category-container button, .categories button');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    displayProducts();
}

function changeProductQty(productId, amount) {
    const qtyInput = document.getElementById(`qty-${productId}`);
    if (!qtyInput) return;
    let currentQty = parseInt(qtyInput.value) || 1;
    currentQty += amount;
    if (currentQty < 1) currentQty = 1;
    qtyInput.value = currentQty;
}

// ==========================================
// عرض المنتجات (على دفعات)
// ==========================================
function getFilteredProducts() {
    let filtered = allProductsList.filter(p => p.available !== false);

    if (currentCategory === 'المفضلة') {
        filtered = filtered.filter(p => userFavorites[p.id]);
    } else if (currentCategory !== 'الكل') {
        filtered = filtered.filter(p => p.category === currentCategory);
    }

    const searchInput = document.getElementById("search-input");
    if (searchInput && searchInput.value.trim() !== "") {
        const query = searchInput.value.trim().toLowerCase();
        filtered = filtered.filter(p => p.name && p.name.toLowerCase().includes(query));
    }
    return filtered;
}

function createProductCard(product) {
    const card = document.createElement("div");
    card.className = "product-card";
    card.id = `product-card-${product.id}`;

    const imgSrc = product.image && product.image.trim() !== ""
        ? optimizeImage(product.image.trim())
        : PLACEHOLDER_IMG;

    const isFav = !!userFavorites[product.id];

    card.innerHTML = `
        <div style="position:relative; width:100%; height:160px; overflow:hidden; border-radius:8px; margin-bottom:10px; background-color:#f0f0f0;">
            <img src="${imgSrc}" alt="" loading="lazy" decoding="async"
                 onerror="this.onerror=null; this.src='${PLACEHOLDER_IMG}'"
                 style="width:100%; height:100%; object-fit:cover; display:block;">
            <button type="button" class="fav-btn" onclick="toggleFavorite('${product.id}', this)"
                style="position:absolute; top:6px; left:6px; width:32px; height:32px; border:none; border-radius:50%;
                       background:rgba(255,255,255,0.9); font-size:16px; cursor:pointer;">${isFav ? '❤️' : '🤍'}</button>
        </div>
        <h3>${escapeHTML(product.name)}</h3>
        <div class="price">${product.price} دينار</div>
        <div class="available">✓ متوفر</div>

        <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin:10px 0;">
            <button type="button" onclick="changeProductQty('${product.id}', -1)" style="width:30px; height:30px; background:#ddd; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">-</button>
            <input type="number" id="qty-${product.id}" value="1" min="1" readonly style="width:45px; text-align:center; border:1px solid #ccc; border-radius:5px; padding:4px; font-weight:bold;">
            <button type="button" onclick="changeProductQty('${product.id}', 1)" style="width:30px; height:30px; background:#ddd; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">+</button>
        </div>

        <button class="add-button" onclick="addToCart('${product.id}')">🛒 أضف إلى السلة</button>
    `;

    return card;
}

// علامة نهاية القائمة: لما الزبون يقرب منها نحمّل دفعة جديدة
function updateSentinel() {
    const container = document.getElementById("products-container");
    if (!container) return;

    const old = document.getElementById("load-more-sentinel");
    if (old) old.remove();
    if (loadMoreObserver) loadMoreObserver.disconnect();

    if (renderedCount >= currentFiltered.length) return;

    const sentinel = document.createElement("div");
    sentinel.id = "load-more-sentinel";
    sentinel.className = "loader-container";
    sentinel.innerHTML = `<div class="spinner"></div><p>جاري تحميل المزيد...</p>`;
    container.appendChild(sentinel);

    if ("IntersectionObserver" in window) {
        if (!loadMoreObserver) {
            loadMoreObserver = new IntersectionObserver((entries) => {
                if (entries.some(e => e.isIntersecting)) renderNextBatch();
            }, { rootMargin: "200px" });
        }
        loadMoreObserver.observe(sentinel);
    } else {
        renderNextBatch(); // متصفح قديم: اعرض الكل تدريجياً
    }
}

function renderNextBatch() {
    const container = document.getElementById("products-container");
    if (!container) return;

    const old = document.getElementById("load-more-sentinel");
    if (old) old.remove();

    const slice = currentFiltered.slice(renderedCount, renderedCount + PAGE_SIZE);
    const fragment = document.createDocumentFragment();
    slice.forEach(p => fragment.appendChild(createProductCard(p)));
    renderedCount += slice.length;
    container.appendChild(fragment);

    updateSentinel();
}

function displayProducts() {
    const container = document.getElementById("products-container");
    if (!container) return;

    if (loadMoreObserver) loadMoreObserver.disconnect();

    const filtered = getFilteredProducts();

    if (filtered.length === 0) {
        currentFiltered = [];
        renderedCount = 0;
        container.innerHTML = "<p style='text-align:center; width:100%; font-size:18px; color:#666; grid-column:1/-1;'>لا توجد منتجات حالياً.</p>";
        return;
    }

    currentFiltered = filtered;
    renderedCount = 0;
    container.innerHTML = "";
    renderNextBatch();
}

// لما توصل كل المنتجات والزبون شايف أول دفعة: نكمل بدون ما نمسح شي
function continueAfterFullLoad() {
    currentFiltered = getFilteredProducts();
    updateSentinel();
}

// ==========================================
// السلة
// ==========================================
function addToCart(productId) {
    let product = allProductsList.find(item => item.id == productId);
    const qtyInput = document.getElementById(`qty-${productId}`);
    let selectedQuantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

    if (product) {
        let existingItem = cart.find(item => item.id == productId);
        if (existingItem) {
            existingItem.quantity += selectedQuantity;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: selectedQuantity
            });
        }
        if (qtyInput) qtyInput.value = 1;
        updateCart();
        showToast(`تمت إضافة ${product.name} 🛒`);
    }
}

function updateCart() {
    let totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountEl = document.getElementById("cart-count");
    if (cartCountEl) cartCountEl.textContent = totalItemsCount;

    let cartItems = document.getElementById("cart-items");
    let subtotal = 0;

    if (!cartItems) return;

    if (cart.length === 0) {
        cartItems.innerHTML = "السلة فارغة";
    } else {
        cartItems.innerHTML = "";
        cart.forEach(function (product, index) {
            let itemTotal = product.price * product.quantity;
            subtotal += itemTotal;

            let item = document.createElement("div");
            item.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; background: #f9f9f9; padding: 8px; border-radius: 5px;";

            item.innerHTML = `
                <div style="flex:1;">
                    <strong>${escapeHTML(product.name)}</strong><br>
                    <small>${product.price} × ${product.quantity} = ${itemTotal.toFixed(2)} دينار</small>
                </div>
                <div style="display:flex; align-items:center; gap:5px;">
                    <button onclick="changeCartItemQty(${index}, -1)">-</button>
                    <span>${product.quantity}</span>
                    <button onclick="changeCartItemQty(${index}, 1)">+</button>
                    <button onclick="removeFromCart(${index})" style="color:red; border:none; background:none;">❌</button>
                </div>
            `;
            cartItems.appendChild(item);
        });
    }

    const deliveryType = document.getElementById("delivery-type") ? document.getElementById("delivery-type").value : "";
    let deliveryFee = (deliveryType.includes("توصيل للمنزل") && cart.length > 0) ? 0.15 : 0;
    let finalTotal = subtotal + deliveryFee;

    const subtotalEl = document.getElementById("subtotal");
    if (subtotalEl) subtotalEl.textContent = subtotal.toFixed(2);

    const deliveryFeeRow = document.getElementById("delivery-fee-row");
    if (deliveryFeeRow) {
        deliveryFeeRow.style.display = (deliveryFee > 0) ? "flex" : "none";
    }

    const totalEl = document.getElementById("total");
    if (totalEl) totalEl.textContent = finalTotal.toFixed(2);
}

function changeCartItemQty(index, amount) {
    if (cart[index]) {
        cart[index].quantity += amount;
        if (cart[index].quantity <= 0) cart.splice(index, 1);
        updateCart();
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

function showCart() {
    const cartModal = document.getElementById("cart");
    if (cartModal) cartModal.style.display = "flex";
    updateCart();
}

function closeCart() {
    const cartModal = document.getElementById("cart");
    if (cartModal) cartModal.style.display = "none";
}

function scrollToProducts() {
    const p = document.getElementById("products");
    if (p) p.scrollIntoView({ behavior: "smooth" });
}

function toggleAddressInput() {
    const deliveryType = document.getElementById("delivery-type").value;
    const addressGroup = document.getElementById("address-group");
    if (addressGroup) {
        addressGroup.style.display = deliveryType.includes("توصيل للمنزل") ? "flex" : "none";
    }
    updateCart();
}

function getLocation() {
    const status = document.getElementById("location-status");
    if (!navigator.geolocation) {
        if (status) status.textContent = "الـ GPS غير مدعوم.";
        return;
    }
    if (status) status.textContent = "جاري تحديد الموقع...";

    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLocationUrl = `https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`;
            if (status) status.textContent = "✅ تم تحديد الموقع!";
        },
        () => { if (status) status.textContent = "❌ تعذر تحديد الموقع."; }
    );
}

// ==========================================
// تسجيل الدخول / إنشاء حساب (Firebase Auth)
// ==========================================
// متطلبات الـ HTML: عناصر بهذي الـ id (اختياري تسميتها كما تحب وتعدّل الكود):
// auth-modal, login-email, login-password, register-name, register-phone,
// register-email, register-password, auth-status, account-btn, account-name-label

// يتأكد إن للمستخدم بروفايل محفوظ بقاعدة البيانات (يُستخدم بعد تسجيل الدخول
// عبر Google / Facebook / الهاتف، لأن هاي الطرق ما بتمرلنا بنموذج تسجيل يدوي)
function ensureUserProfile(user) {
    if (!user) return Promise.resolve();
    const ref = db.ref(`users/${user.uid}/profile`);
    return ref.once("value").then(snap => {
        if (!snap.exists()) {
            return ref.set({
                name: user.displayName || "مستخدم",
                phone: user.phoneNumber || "",
                email: user.email || ""
            });
        }
    });
}

function registerUser() {
    if (!auth) { alert("خدمة الحسابات غير مفعّلة."); return; }
    const name = (document.getElementById("register-name") || {}).value?.trim();
    const phone = (document.getElementById("register-phone") || {}).value?.trim();
    const email = (document.getElementById("register-email") || {}).value?.trim();
    const password = (document.getElementById("register-password") || {}).value;

    if (!name || !email || !password) {
        alert("الرجاء تعبئة الاسم والإيميل وكلمة المرور.");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then((cred) => {
            const uid = cred.user.uid;
            return db.ref(`users/${uid}/profile`).set({ name, phone: phone || "", email });
        })
        .then(() => {
            showToast("تم إنشاء الحساب ✅");
            closeAuthModal();
        })
        .catch((err) => alert("خطأ: " + translateAuthError(err)));
}

function loginUser() {
    if (!auth) { alert("خدمة الحسابات غير مفعّلة."); return; }
    const email = (document.getElementById("login-email") || {}).value?.trim();
    const password = (document.getElementById("login-password") || {}).value;

    if (!email || !password) {
        alert("الرجاء إدخال الإيميل وكلمة المرور.");
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .then(() => { showToast("تم تسجيل الدخول ✅"); closeAuthModal(); })
        .catch((err) => alert("خطأ: " + translateAuthError(err)));
}

function logoutUser() {
    if (!auth) return;
    auth.signOut();
}

// ------------------------------------------
// تسجيل الدخول عبر Google
// ------------------------------------------
function loginWithGoogle() {
    if (!auth) { alert("خدمة الحسابات غير مفعّلة."); return; }
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((cred) => ensureUserProfile(cred.user))
        .then(() => { showToast("تم تسجيل الدخول ✅"); closeAuthModal(); })
        .catch((err) => alert("خطأ: " + translateAuthError(err)));
}

// ------------------------------------------
// تسجيل الدخول عبر Facebook
// ------------------------------------------
function loginWithFacebook() {
    if (!auth) { alert("خدمة الحسابات غير مفعّلة."); return; }
    const provider = new firebase.auth.FacebookAuthProvider();
    auth.signInWithPopup(provider)
        .then((cred) => ensureUserProfile(cred.user))
        .then(() => { showToast("تم تسجيل الدخول ✅"); closeAuthModal(); })
        .catch((err) => alert("خطأ: " + translateAuthError(err)));
}

// ------------------------------------------
// تسجيل الدخول عبر رقم الهاتف (OTP برسالة نصية)
// متطلبات الـ HTML: عنصر id="recaptcha-container"،
// حقل id="phone-login-number"، حقل id="phone-otp-code" (مخفي بالبداية)،
// وعنصر id="phone-otp-group" يتحكم بإظهار حقل الرمز
// ------------------------------------------
let recaptchaVerifier = null;
let phoneConfirmationResult = null;

function setupRecaptcha() {
    if (!auth || recaptchaVerifier) return;
    recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        size: 'normal'
    }, firebase.app());
}

function sendPhoneOtp() {
    if (!auth) { alert("خدمة الحسابات غير مفعّلة."); return; }
    const phoneInput = document.getElementById("phone-login-number");
    let phoneNumber = phoneInput ? phoneInput.value.trim() : "";

    if (!phoneNumber) {
        alert("الرجاء إدخال رقم الهاتف.");
        return;
    }

    // تحويل الرقم الأردني المحلي (07XXXXXXXX) إلى صيغة دولية (+9627XXXXXXXX)
    if (phoneNumber.startsWith("0")) {
        phoneNumber = "+962" + phoneNumber.slice(1);
    } else if (!phoneNumber.startsWith("+")) {
        phoneNumber = "+962" + phoneNumber;
    }

    setupRecaptcha();

    auth.signInWithPhoneNumber(phoneNumber, recaptchaVerifier)
        .then((confirmationResult) => {
            phoneConfirmationResult = confirmationResult;
            const otpGroup = document.getElementById("phone-otp-group");
            if (otpGroup) otpGroup.style.display = "flex";
            showToast("تم إرسال رمز التحقق 📩");
        })
        .catch((err) => {
            alert("خطأ بإرسال الرمز: " + err.message);
        });
}

function verifyPhoneOtp() {
    const codeInput = document.getElementById("phone-otp-code");
    const code = codeInput ? codeInput.value.trim() : "";

    if (!code || !phoneConfirmationResult) {
        alert("الرجاء إرسال الرمز أولاً وإدخاله.");
        return;
    }

    phoneConfirmationResult.confirm(code)
        .then((cred) => ensureUserProfile(cred.user))
        .then(() => { showToast("تم تسجيل الدخول ✅"); closeAuthModal(); })
        .catch((err) => alert("رمز التحقق غير صحيح: " + err.message));
}

function translateAuthError(err) {
    const map = {
        "auth/email-already-in-use": "الإيميل مستخدم من قبل.",
        "auth/invalid-email": "الإيميل غير صحيح.",
        "auth/weak-password": "كلمة المرور ضعيفة (6 أحرف على الأقل).",
        "auth/user-not-found": "الحساب غير موجود.",
        "auth/wrong-password": "كلمة المرور غير صحيحة."
    };
    return map[err.code] || err.message;
}

function openAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (modal) modal.style.display = "flex";
}

function closeAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (modal) modal.style.display = "none";
}

function requireLogin() {
    if (!currentUser) {
        alert("لازم تسجل دخول أول 🙏");
        openAuthModal();
        return false;
    }
    return true;
}

function updateAccountUI() {
    const accountBtn = document.getElementById("account-btn");
    const nameLabel = document.getElementById("account-name-label");
    if (accountBtn) {
        accountBtn.textContent = currentUser ? "حسابي" : "تسجيل الدخول";
    }
    if (nameLabel) {
        nameLabel.textContent = currentUser && currentUserProfile ? currentUserProfile.name : "";
    }
}

if (auth) {
    auth.onAuthStateChanged((user) => {
        currentUser = user;
        if (user) {
            db.ref(`users/${user.uid}/profile`).once("value").then(snap => {
                currentUserProfile = snap.val() || { name: user.email, phone: "", email: user.email };
                updateAccountUI();
            });
            loadUserFavorites();
        } else {
            currentUserProfile = null;
            userFavorites = {};
            updateAccountUI();
            if (allProductsList.length > 0) displayProducts();
        }
    });
}

// ==========================================
// المفضلة ❤️
// ==========================================
function loadUserFavorites() {
    if (!currentUser) return;
    db.ref(`users/${currentUser.uid}/favorites`).once("value").then(snap => {
        userFavorites = snap.val() || {};
        displayProducts();
    });
}

function toggleFavorite(productId, btnEl) {
    if (!requireLogin()) return;

    const isFav = !!userFavorites[productId];
    const ref = db.ref(`users/${currentUser.uid}/favorites/${productId}`);

    if (isFav) {
        ref.remove().then(() => {
            delete userFavorites[productId];
            if (btnEl) btnEl.textContent = "🤍";
            if (currentCategory === 'المفضلة') displayProducts();
        });
    } else {
        ref.set(true).then(() => {
            userFavorites[productId] = true;
            if (btnEl) btnEl.textContent = "❤️";
        });
    }
}

// ==========================================
// تقييم الدكان (تقييم واحد عام بدل تقييم كل منتج)
// متطلبات الـ HTML: عنصر id="store-rating-stars" وعنصر id="store-rating-text"
// ==========================================
function renderStoreStarPicker() {
    const el = document.getElementById("store-rating-stars");
    if (!el) return;
    el.style.cursor = "pointer";
    el.innerHTML = [1, 2, 3, 4, 5].map(i => `<span data-star="${i}">☆</span>`).join("");

    el.querySelectorAll("span[data-star]").forEach(starSpan => {
        starSpan.addEventListener("click", () => {
            rateStore(parseInt(starSpan.dataset.star));
        });
    });
}

function rateStore(value) {
    if (!requireLogin()) return;

    const uid = currentUser.uid;
    const userRatingRef = db.ref(`storeRatings/${uid}`);

    userRatingRef.once("value").then(snap => {
        const oldValue = snap.val();
        return userRatingRef.set(value).then(() => {
            const statsRef = db.ref("storeRatingStats");
            return statsRef.transaction(stats => {
                if (!stats) stats = { sum: 0, count: 0 };
                if (oldValue) {
                    stats.sum += (value - oldValue);
                } else {
                    stats.sum += value;
                    stats.count += 1;
                }
                return stats;
            });
        });
    }).then(() => {
        loadStoreRating();
        showToast("شكراً لتقييمك ⭐");
    });
}

function loadStoreRating() {
    const starsEl = document.getElementById("store-rating-stars");
    const textEl = document.getElementById("store-rating-text");
    if (!starsEl && !textEl) return;

    db.ref("storeRatingStats").once("value").then(snap => {
        const stats = snap.val();
        if (!stats || !stats.count) {
            if (textEl) textEl.textContent = "لا يوجد تقييم بعد";
            return;
        }
        const avg = stats.sum / stats.count;
        if (textEl) textEl.textContent = `${avg.toFixed(1)} من 5 (${stats.count} تقييم)`;
        if (starsEl) {
            const rounded = Math.round(avg);
            starsEl.querySelectorAll("span[data-star]").forEach(s => {
                s.textContent = parseInt(s.dataset.star) <= rounded ? "★" : "☆";
            });
        }
    });
}

// ==========================================
// إرسال الطلب + حفظ الطلب بفايربيس مع حالة التتبع
// ==========================================
function getOrderData() {
    if (cart.length === 0) {
        alert("السلة فارغة!");
        return null;
    }

    const MIN_ORDER_TOTAL = 1; // الحد الأدنى للطلب بالدينار
    const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (cartSubtotal < MIN_ORDER_TOTAL) {
        alert(`الحد الأدنى للطلب ${MIN_ORDER_TOTAL} دينار. مجموع سلتك الحالي: ${cartSubtotal.toFixed(2)} دينار.`);
        return null;
    }

    let name = document.getElementById("customer-name").value.trim();
    let phone = document.getElementById("customer-phone").value.trim();
    let deliveryType = document.getElementById("delivery-type").value;
    let addressInput = document.getElementById("customer-address");
    let address = addressInput ? addressInput.value.trim() : "";

    if (name === "") {
        alert("الرجاء إدخال اسمك.");
        return null;
    }
    if (phone === "") phone = "بدون رقم";

    let fullAddress = address;
    if (userLocationUrl) {
        fullAddress += (fullAddress ? `\n🗺️ رابط الخريطة: ${userLocationUrl}` : `🗺️ رابط الخريطة: ${userLocationUrl}`);
    }

    let itemsList = "";
    let subtotal = 0;
    cart.forEach(item => {
        let itemTotal = item.price * item.quantity;
        itemsList += `- ${item.name} x${item.quantity} (${itemTotal.toFixed(2)} دينار)\n`;
        subtotal += itemTotal;
    });

    let deliveryFee = deliveryType.includes("توصيل للمنزل") ? 0.15 : 0;
    return {
        name, phone, deliveryType, address: fullAddress, itemsList,
        items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        subtotal, deliveryFee, total: subtotal + deliveryFee
    };
}

// يحفظ الطلب بقاعدة البيانات مع أول حالة تتبع، ويربطه بحساب الزبون إذا مسجل دخول
function saveOrderToFirebase(data) {
    const orderRef = db.ref("orders").push();
    const orderId = orderRef.key;

    const orderRecord = {
        uid: currentUser ? currentUser.uid : null,
        customerName: data.name,
        phone: data.phone,
        deliveryType: data.deliveryType,
        address: data.address,
        items: data.items,
        subtotal: data.subtotal,
        deliveryFee: data.deliveryFee,
        total: data.total,
        status: ORDER_STATUSES[0],
        createdAt: Date.now()
    };

    return orderRef.set(orderRecord).then(() => {
        if (currentUser) {
            db.ref(`users/${currentUser.uid}/orders/${orderId}`).set(true);
        }
        return orderId;
    });
}

function orderViaTelegram() {
    let data = getOrderData();
    if (!data) return;

    saveOrderToFirebase(data).then((orderId) => {
        let message = `🛒 *طلب جديد*\n👤 ${data.name}\n📞 ${data.phone}\n🚚 ${data.deliveryType}\n📍 ${data.address}\n\n${data.itemsList}\n💰 المجموع: ${data.total.toFixed(2)} دينار\n🔖 رقم الطلب: ${orderId}`;

        return fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "Markdown" })
        }).then(res => res.json()).then(res => {
            if (res.ok) {
                alert("تم إرسال الطلب بنجاح! رقم طلبك: " + orderId);
                cart = []; userLocationUrl = ""; updateCart(); closeCart();
                trackOrder(orderId);
            } else { alert("خطأ بالإرسال."); }
        });
    }).catch(err => {
        console.error(err);
        alert("تعذر حفظ الطلب، حاول مرة أخرى.");
    });
}

function orderViaWhatsApp() {
    let data = getOrderData();
    if (!data) return;

    saveOrderToFirebase(data).then((orderId) => {
        let message = `🛒 *طلب جديد*\n👤 ${data.name}\n📞 ${data.phone}\n🚚 ${data.deliveryType}\n📍 ${data.address}\n\n${data.itemsList}\n💰 المجموع: ${data.total.toFixed(2)} دينار\n🔖 رقم الطلب: ${orderId}`;
        let whatsappUrl = `https://wa.me/${MY_PHONE_NUMBER}?text=${encodeURIComponent(message)}`;

        alert("تم إرسال الطلب! رقم طلبك: " + orderId);
        cart = []; userLocationUrl = ""; updateCart(); closeCart();
        window.open(whatsappUrl, "_blank");
        trackOrder(orderId);
    }).catch(err => {
        console.error(err);
        alert("تعذر حفظ الطلب، حاول مرة أخرى.");
    });
}

// ==========================================
// تتبع حالة الطلب (Live Tracking)
// ==========================================
// متطلبات الـ HTML: مودال بـ id="tracking-modal" وبداخله عنصر id="tracking-steps"

let trackingListenerRef = null;

function trackOrder(orderId) {
    const modal = document.getElementById("tracking-modal");
    const stepsContainer = document.getElementById("tracking-steps");
    if (!modal || !stepsContainer) return;

    if (trackingListenerRef) trackingListenerRef.off();

    modal.style.display = "flex";
    modal.dataset.orderId = orderId;

    trackingListenerRef = db.ref(`orders/${orderId}`);
    trackingListenerRef.on("value", (snap) => {
        const order = snap.val();
        if (!order) {
            stepsContainer.innerHTML = "<p>لم يتم العثور على الطلب.</p>";
            return;
        }
        renderOrderStatusStepper(order.status, stepsContainer);
    });
}

function closeTrackingModal() {
    const modal = document.getElementById("tracking-modal");
    if (modal) modal.style.display = "none";
    if (trackingListenerRef) { trackingListenerRef.off(); trackingListenerRef = null; }
}

function renderOrderStatusStepper(currentStatus, containerEl) {
    if (!containerEl) return;
    const currentIndex = ORDER_STATUSES.indexOf(currentStatus);

    containerEl.innerHTML = ORDER_STATUSES.map((status, i) => {
        const state = i < currentIndex ? "done" : (i === currentIndex ? "active" : "pending");
        const icon = state === "done" ? "✅" : (state === "active" ? "🟢" : "⚪");
        const color = state === "pending" ? "#aaa" : "#222";
        const weight = state === "active" ? "bold" : "normal";
        return `
            <div style="display:flex; align-items:center; gap:10px; padding:8px 0; color:${color}; font-weight:${weight};">
                <span style="font-size:18px;">${icon}</span>
                <span>${status}</span>
            </div>`;
    }).join("");
}

// دالة مساعدة (للاستخدام من لوحة تحكم الأدمن) لتغيير حالة الطلب
function adminUpdateOrderStatus(orderId, newStatus) {
    if (!ORDER_STATUSES.includes(newStatus)) {
        alert("حالة غير صحيحة");
        return;
    }
    db.ref(`orders/${orderId}/status`).set(newStatus);
}

// ==========================================
// سجل الطلبات السابقة + إعادة الطلب
// ==========================================
// متطلبات الـ HTML: مودال id="orders-history-modal" وبداخله عنصر id="orders-history-list"

function openOrderHistory() {
    if (!requireLogin()) return;

    const modal = document.getElementById("orders-history-modal");
    const listEl = document.getElementById("orders-history-list");
    if (!modal || !listEl) return;

    modal.style.display = "flex";
    listEl.innerHTML = "<p>جاري التحميل...</p>";

    db.ref(`users/${currentUser.uid}/orders`).once("value").then(snap => {
        const orderIds = snap.val() ? Object.keys(snap.val()) : [];
        if (orderIds.length === 0) {
            listEl.innerHTML = "<p>لا يوجد طلبات سابقة.</p>";
            return;
        }
        return Promise.all(orderIds.map(id => db.ref(`orders/${id}`).once("value").then(s => ({ id, ...s.val() }))))
            .then(orders => {
                orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                renderOrderHistoryList(orders, listEl);
            });
    });
}

function renderOrderHistoryList(orders, listEl) {
    listEl.innerHTML = "";
    orders.forEach(order => {
        const date = order.createdAt ? new Date(order.createdAt).toLocaleString("ar-EG") : "";
        const itemsSummary = (order.items || []).map(i => `${i.name} x${i.quantity}`).join("، ");

        const card = document.createElement("div");
        card.style.cssText = "border:1px solid #eee; border-radius:8px; padding:10px; margin-bottom:10px;";
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <strong>طلب #${order.id.slice(-6)}</strong>
                <span>${date}</span>
            </div>
            <div style="margin:6px 0; color:#555; font-size:14px;">${escapeHTML(itemsSummary)}</div>
            <div>الحالة الحالية: <strong>${order.status || ORDER_STATUSES[0]}</strong></div>
            <div>المجموع: <strong>${(order.total || 0).toFixed(2)} دينار</strong></div>
            <div style="display:flex; gap:8px; margin-top:8px;">
                <button onclick="trackOrder('${order.id}')">📍 تتبع الطلب</button>
                <button onclick="reorderOrder('${order.id}')">🔁 إعادة الطلب</button>
            </div>
        `;
        listEl.appendChild(card);
    });
}

function closeOrderHistoryModal() {
    const modal = document.getElementById("orders-history-modal");
    if (modal) modal.style.display = "none";
}

// إعادة طلب قديم بضغطة واحدة: يعبي السلة بنفس المنتجات ويفتحها
function reorderOrder(orderId) {
    db.ref(`orders/${orderId}`).once("value").then(snap => {
        const order = snap.val();
        if (!order || !order.items) {
            alert("تعذر إيجاد تفاصيل هذا الطلب.");
            return;
        }

        order.items.forEach(item => {
            // نتأكد المنتج لسا موجود بالقائمة الحالية قبل ما نضيفه
            const stillExists = allProductsList.find(p => p.id === item.id);
            if (!stillExists) return;

            const existing = cart.find(c => c.id === item.id);
            if (existing) {
                existing.quantity += item.quantity;
            } else {
                cart.push({ id: item.id, name: item.name, price: item.price, quantity: item.quantity });
            }
        });

        updateCart();
        closeOrderHistoryModal();
        showCart();
        showToast("تمت إضافة الطلب لسلتك 🛒");
    });
}

// ==========================================
// تشغيل الموقع
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    fetchProductsFromFirebase();
    renderStoreStarPicker();
    loadStoreRating();
    const searchInput = document.getElementById("search-input");
    if (searchInput) searchInput.addEventListener("input", debounce(displayProducts, 250));
});
