// ==========================================
// إعدادات Firebase
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAwjMnpwY_gUWLi5w0KQRs9_tTXPjx7XZc",
    authDomain: "motaz-3aa5d.firebaseapp.com",
    databaseURL: "https://motaz-3aa5d-default-rtdb.firebaseio.com",
    projectId: "motaz-3aa5d",
    storageBucket: "motaz-3aa5d.firebasestorage.app",
    messagingSenderId: "494735507077",
    appId: "1:494735507077:web:b3d534c45910484ca433ec",
    measurementId: "G-9QLGLJG4P0"
};

if (typeof firebase !== "undefined" && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();

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
// المرحلة 1: أول 3 منتجات فقط (سريعة جداً)
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

    // أول زيارة: أول 3 منتجات فقط
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

    if (currentCategory !== 'الكل') {
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

    const imgSrc = product.image && product.image.trim() !== ""
        ? optimizeImage(product.image.trim())
        : PLACEHOLDER_IMG;

    card.innerHTML = `
        <div style="width:100%; height:160px; overflow:hidden; border-radius:8px; margin-bottom:10px; background-color:#f0f0f0;">
            <img src="${imgSrc}" alt="" loading="lazy" decoding="async"
                 onerror="this.onerror=null; this.src='${PLACEHOLDER_IMG}'"
                 style="width:100%; height:100%; object-fit:cover; display:block;">
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
    sentinel.className = "loader-container";                          // <<< جديد
    sentinel.innerHTML = `<div class="spinner"></div><p>جاري تحميل المزيد...</p>`; // <<< جديد
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

// لما توصل كل المنتجات والزبون شايف أول 3: نكمل بدون ما نمسح شي
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
        alert(`تمت إضافة ${product.name} إلى السلة 🛒`);
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
// إرسال الطلب
// ==========================================
function getOrderData() {
    if (cart.length === 0) {
        alert("السلة فارغة!");
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
    return { name, phone, deliveryType, address: fullAddress, itemsList, subtotal, deliveryFee, total: subtotal + deliveryFee };
}

function orderViaTelegram() {
    let data = getOrderData();
    if (!data) return;

    let message = `🛒 *طلب جديد*\n👤 ${data.name}\n📞 ${data.phone}\n🚚 ${data.deliveryType}\n📍 ${data.address}\n\n${data.itemsList}\n💰 المجموع: ${data.total.toFixed(2)} دينار`;

    fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "Markdown" })
    }).then(res => res.json()).then(res => {
        if (res.ok) {
            alert("تم إرسال الطلب بنجاح!");
            cart = []; userLocationUrl = ""; updateCart(); closeCart();
        } else { alert("خطأ بالإرسال."); }
    });
}

function orderViaWhatsApp() {
    let data = getOrderData();
    if (!data) return;

    let message = `🛒 *طلب جديد*\n👤 ${data.name}\n📞 ${data.phone}\n🚚 ${data.deliveryType}\n📍 ${data.address}\n\n${data.itemsList}\n💰 المجموع: ${data.total.toFixed(2)} دينار`;
    let whatsappUrl = `https://wa.me/${MY_PHONE_NUMBER}?text=${encodeURIComponent(message)}`;

    alert("تم إرسال الطلب!");
    cart = []; userLocationUrl = ""; updateCart(); closeCart();
    window.open(whatsappUrl, "_blank");
}

// ==========================================
// تشغيل الموقع
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    fetchProductsFromFirebase();
    const searchInput = document.getElementById("search-input");
    if (searchInput) searchInput.addEventListener("input", debounce(displayProducts, 250));
});