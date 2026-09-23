// ==========================================
// إعدادات Firebase (لوحة التحكم)
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
// متغيرات لوحة التحكم والتحميل التدريجي
// ==========================================
let allAdminProductsList = [];
let currentAdminFiltered = [];
let adminRenderedCount = 0;
let adminLoadMoreObserver = null;
const PAGE_SIZE = 45; // عدد المنتجات في كل دفعة

// تصغير صور Cloudinary تلقائياً
function optimizeImage(url, size = 150) {
    if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
    if (url.includes("/upload/w_")) return url;
    return url.replace("/upload/", `/upload/w_${size},h_${size},c_fill,q_auto,f_auto/`);
}

// حماية من الرموز الخاصة
function escapeHTML(str) {
    return String(str ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

// تحويل نتيجة Firebase إلى قائمة
function snapshotToList(snapshot) {
    const list = [];
    snapshot.forEach((child) => {
        list.push({ id: child.key, ...child.val() });
    });
    return list;
}

// ==========================================
// إدارة المنتجات في لوحة التحكم (إضافة / حذف / عرض تدريجي)
// ==========================================

// إضافة منتج جديد
function addNewProduct(productData) {
    const newProductRef = db.ref("products").push();
    newProductRef.set(productData, (error) => {
        if (error) {
            alert("حدث خطأ أثناء إضافة المنتج.");
        } else {
            alert("تم إضافة المنتج بنجاح!");
            loadAdminProducts(); // تحديث القائمة فوراً
        }
    });
}

// حذف منتج
function deleteProduct(productId) {
    if (confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
        db.ref("products/" + productId).remove().then(() => {
            alert("تم حذف المنتج بنجاح.");
            loadAdminProducts(); // تحديث القائمة فوراً
        }).catch((error) => {
            alert("خطأ في حذف المنتج.");
        });
    }
}

// إنشاء بطقة منتج لعرضها في لوحة التحكم
function createAdminProductCard(product) {
    const itemDiv = document.createElement("div");
    itemDiv.style.cssText = "display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 10px; margin-bottom: 8px; border-radius: 5px; border: 1px solid #ddd;";
    
    const imgSrc = product.image && product.image.trim() !== ""
        ? optimizeImage(product.image.trim())
        : 'https://via.placeholder.com/50';

    itemDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${imgSrc}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
            <div>
                <strong>${escapeHTML(product.name)}</strong><br>
                <small>${product.price} دينار - ${escapeHTML(product.category || 'عام')}</small>
            </div>
        </div>
        <button onclick="deleteProduct('${product.id}')" style="background: red; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">حذف</button>
    `;
    return itemDiv;
}

// تحديث مؤشر نهاية القائمة للتحميل التدريجي
function updateAdminSentinel() {
    const container = document.getElementById("admin-products-container");
    if (!container) return;

    const old = document.getElementById("admin-load-more-sentinel");
    if (old) old.remove();
    if (adminLoadMoreObserver) adminLoadMoreObserver.disconnect();

    if (adminRenderedCount >= currentAdminFiltered.length) return;

    const sentinel = document.createElement("div");
    sentinel.id = "admin-load-more-sentinel";
    sentinel.style.cssText = "text-align:center; padding:15px; font-weight:bold; color:#666;";
    sentinel.innerHTML = `جاري تحميل المزيد من المنتجات...`;
    container.appendChild(sentinel);

    if ("IntersectionObserver" in window) {
        if (!adminLoadMoreObserver) {
            adminLoadMoreObserver = new IntersectionObserver((entries) => {
                if (entries.some(e => e.isIntersecting)) renderNextAdminBatch();
            }, { rootMargin: "200px" });
        }
        adminLoadMoreObserver.observe(sentinel);
    } else {
        renderNextAdminBatch();
    }
}

function renderNextAdminBatch() {
    const container = document.getElementById("admin-products-container");
    if (!container) return;

    const old = document.getElementById("admin-load-more-sentinel");
    if (old) old.remove();

    const slice = currentAdminFiltered.slice(adminRenderedCount, adminRenderedCount + PAGE_SIZE);
    const fragment = document.createDocumentFragment();
    slice.forEach(p => fragment.appendChild(createAdminProductCard(p)));
    adminRenderedCount += slice.length;
    container.appendChild(fragment);

    updateAdminSentinel();
}

// جلب المنتجات للوحة التحكم وتفعيل ميزة الـ 45 منتج بالبداية
function loadAdminProducts() {
    const adminContainer = document.getElementById("admin-products-container");
    if (!adminContainer) return;

    if (adminLoadMoreObserver) adminLoadMoreObserver.disconnect();
    adminContainer.innerHTML = "<p style='text-align:center;'>جاري تحميل المنتجات...</p>";

    db.ref("products").once("value").then((snapshot) => {
        const list = snapshotToList(snapshot);
        allAdminProductsList = list;

        if (list.length === 0) {
            currentAdminFiltered = [];
            adminRenderedCount = 0;
            adminContainer.innerHTML = "<p style='text-align:center;'>لا توجد منتجات حالياً.</p>";
            return;
        }

        currentAdminFiltered = list;
        adminRenderedCount = 0;
        adminContainer.innerHTML = "";
        renderNextAdminBatch();
    }).catch((error) => {
        console.error("خطأ في جلب المنتجات:", error);
        adminContainer.innerHTML = "<p style='text-align:center; color:red;'>تعذر تحميل المنتجات.</p>";
    });
}

// تشغيل لوحة التحكم
document.addEventListener("DOMContentLoaded", function () {
    loadAdminProducts();
});