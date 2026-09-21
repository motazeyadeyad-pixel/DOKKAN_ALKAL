// ==========================================
// 1. تهيئة وإعدادات Firebase
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyAwjMnpwY_gUWLi5w0KQRs9_tTXPjx7XZc",
  authDomain: "motaz-3aa5d.firebaseapp.com",
  projectId: "motaz-3aa5d",
  storageBucket: "motaz-3aa5d.firebasestorage.app",
  messagingSenderId: "494735507077",
  appId: "1:494735507077:web:b3d534c45910484ca433ec",
  measurementId: "G-9QLGLJG4P0"
};

// فحص للتأكد من تحميل مكتبة Firebase بنجاح
if (typeof firebase !== "undefined") {
    firebase.initializeApp(firebaseConfig);
}

// الوصول لقاعدة البيانات
const db = firebase.database();

// ==========================================
// 2. كود موقع دكان الخال
// ==========================================

let allProductsList = [];
let cart = [];
let currentCategory = 'الكل';
let userLocationUrl = "";

const TELEGRAM_BOT_TOKEN = "8832237966:AAFM0maLZu_CPxOKk77kGblwx2FJKwJ5X7U";
const TELEGRAM_CHAT_ID = "1953861313";
const MY_PHONE_NUMBER = "962775279117";

// جلب المنتجات مباشرة من Firebase لحظة بلحظة
function fetchProductsFromFirebase() {
    let container = document.getElementById("products-container");
    if (container) {
        container.innerHTML = "<p style='text-align:center; width:100%; grid-column: 1/-1;'>جاري تحميل المنتجات...</p>";
    }

    db.ref("products").on("value", (snapshot) => {
        const data = snapshot.val();
        allProductsList = [];

        if (data) {
            Object.keys(data).forEach((key) => {
                allProductsList.push({
                    id: key,
                    ...data[key]
                });
            });
        }
        
        displayProducts();
    }, (error) => {
        console.error("خطأ في جلب البيانات:", error);
        if (container) {
            container.innerHTML = "<p style='text-align:center; width:100%; color:red; grid-column: 1/-1;'>حدث خطأ أثناء تحميل المنتجات.</p>";
        }
    });
}

// تصفية حسب القسم
function filterByCategory(category, btnElement) {
    currentCategory = category;

    const buttons = document.querySelectorAll('.category-container button, .categories button');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (btnElement) {
        btnElement.classList.add('active');
    }

    displayProducts();
}

// التحكم بالكمية قبل الإضافة
function changeProductQty(productId, amount) {
    const qtyInput = document.getElementById(`qty-${productId}`);
    if (!qtyInput) return;

    let currentQty = parseInt(qtyInput.value) || 1;
    currentQty += amount;

    if (currentQty < 1) currentQty = 1;
    qtyInput.value = currentQty;
}

// عرض المنتجات
function displayProducts() {
    let container = document.getElementById("products-container");
    if (!container) return;
    
    container.innerHTML = "";

    let filteredProducts = allProductsList.filter(p => p.available !== false);

    if (currentCategory !== 'الكل') {
        filteredProducts = filteredProducts.filter(p => p.category === currentCategory);
    }

    const searchInput = document.getElementById("search-input");
    if (searchInput && searchInput.value.trim() !== "") {
        const query = searchInput.value.trim().toLowerCase();
        filteredProducts = filteredProducts.filter(p => p.name && p.name.toLowerCase().includes(query));
    }

    if (filteredProducts.length === 0) {
        container.innerHTML = "<p style='text-align:center; width:100%; font-size:18px; color: #666; grid-column: 1/-1;'>لا توجد منتجات معروضة حالياً.</p>";
        return;
    }

    filteredProducts.forEach(function(product) {
        let card = document.createElement("div");
        card.className = "product-card";

        let imgContainer = document.createElement("div");
        imgContainer.style.cssText = "width: 100%; height: 160px; overflow: hidden; border-radius: 8px; margin-bottom: 10px; background-color: #f0f0f0;";

        let imgElement = document.createElement("img");
        imgElement.src = product.image && product.image.trim() !== "" ? product.image : "https://via.placeholder.com/150?text=منتج";
        imgElement.className = "product-image";
        imgElement.style.cssText = "width: 100%; height: 100%; object-fit: cover; display: block;";
        imgElement.onerror = function() {
            this.onerror = null;
            this.src = "https://via.placeholder.com/150?text=صورة+غير+متوفرة";
        };

        imgContainer.appendChild(imgElement);
        card.appendChild(imgContainer);

        card.innerHTML += `
            <h3>${product.name}</h3>
            <div class="price">${product.price} دينار</div>
            <div class="available">✓ متوفر</div>
            
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin: 10px 0;">
                <button type="button" onclick="changeProductQty('${product.id}', -1)" style="width:30px; height:30px; background:#ddd; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">-</button>
                <input type="number" id="qty-${product.id}" value="1" min="1" readonly style="width: 45px; text-align: center; border: 1px solid #ccc; border-radius: 5px; padding: 4px; font-weight: bold;">
                <button type="button" onclick="changeProductQty('${product.id}', 1)" style="width:30px; height:30px; background:#ddd; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">+</button>
            </div>

            <button class="add-button" onclick="addToCart('${product.id}')">
                🛒 أضف إلى السلة
            </button>
        `;

        container.appendChild(card);
    });
}

// إضافة للسلة
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
        alert(`تمت إضافة (${selectedQuantity}) حبات من ${product.name} إلى السلة 🛒`);
    }
}

// تحديث السلة
function updateCart() {
    let totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountEl = document.getElementById("cart-count");
    if (cartCountEl) cartCountEl.textContent = totalItemsCount;

    let cartItems = document.getElementById("cart-items");
    let total = 0;

    if (!cartItems) return;

    if (cart.length === 0) {
        cartItems.innerHTML = "لا يوجد منتجات في السلة";
    } else {
        cartItems.innerHTML = "";

        cart.forEach(function(product, index) {
            let itemTotal = product.price * product.quantity;
            total += itemTotal;

            let item = document.createElement("div");
            item.className = "cart-item";
            item.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; background: #f9f9f9; padding: 8px; border-radius: 5px;";
            
            item.innerHTML = `
                <div style="flex:1;">
                    <strong>${product.name}</strong><br>
                    <small>${product.price} × ${product.quantity} = ${itemTotal.toFixed(2)} دينار</small>
                </div>
                <div style="display:flex; align-items:center; gap:5px;">
                    <button onclick="changeCartItemQty(${index}, -1)" style="padding: 2px 8px;">-</button>
                    <span>${product.quantity}</span>
                    <button onclick="changeCartItemQty(${index}, 1)" style="padding: 2px 8px;">+</button>
                    <button onclick="removeFromCart(${index})" style="background:none; border:none; color:red; cursor:pointer; margin-right:5px;">❌</button>
                </div>
            `;

            cartItems.appendChild(item);
        });
    }

    const totalEl = document.getElementById("total");
    if (totalEl) totalEl.textContent = total.toFixed(2);
}

function changeCartItemQty(index, amount) {
    if (cart[index]) {
        cart[index].quantity += amount;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
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
}

function closeCart() {
    const cartModal = document.getElementById("cart");
    if (cartModal) cartModal.style.display = "none";
}

function scrollToProducts() {
    const productsSection = document.getElementById("products");
    if (productsSection) {
        productsSection.scrollIntoView({ behavior: "smooth" });
    }
}

function toggleAddressInput() {
    const deliveryType = document.getElementById("delivery-type").value;
    const addressGroup = document.getElementById("address-group");
    if (addressGroup) {
        addressGroup.style.display = deliveryType.includes("توصيل للمنزل") ? "flex" : "none";
    }
}

function getLocation() {
    const status = document.getElementById("location-status");
    if (!navigator.geolocation) {
        if (status) status.textContent = "خاصية الـ GPS غير مدعومة في متصفحك.";
        return;
    }

    if (status) {
        status.textContent = "جاري تحديد موقعك...";
        status.style.color = "#555";
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            userLocationUrl = `https://maps.google.com/?q=${lat},${lng}`;
            if (status) {
                status.textContent = "✅ تم تحديد موقعك بنجاح!";
                status.style.color = "#006b3c";
            }
        },
        (error) => {
            if (status) {
                status.textContent = "❌ تعذر تحديد الموقع. يرجى تفعيل الـ GPS.";
                status.style.color = "#e53935";
            }
        }
    );
}

function getOrderData() {
    if (cart.length === 0) {
        alert("السلة فارغة! الرجاء إضافة منتجات أولاً.");
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

    if (deliveryType.includes("توصيل للمنزل") && address === "" && !userLocationUrl) {
        alert("الرجاء إدخال عنوانك أو استخدام الـ GPS.");
        return null;
    }

    if (phone === "") phone = "لم يدخل رقم هاتف";

    let fullAddress = address;
    if (userLocationUrl) {
        fullAddress += fullAddress ? `\n🗺️ رابط الخريطة: ${userLocationUrl}` : `🗺️ رابط الخريطة: ${userLocationUrl}`;
    }

    let itemsList = "";
    let total = 0;

    cart.forEach(function(item) {
        let itemTotal = item.price * item.quantity;
        itemsList += `- ${item.name} x${item.quantity} (${itemTotal.toFixed(2)} دينار)\n`;
        total += itemTotal;
    });

    return { name, phone, deliveryType, address: fullAddress, itemsList, total };
}

function orderViaTelegram() {
    let data = getOrderData();
    if (!data) return;

    let message = `🛒 *طلب جديد من دكان الخال*\n\n` +
                  `👤 *الاسم:* ${data.name}\n` +
                  `📞 *رقم الهاتف:* ${data.phone}\n` +
                  `🚚 *طريقة الاستلام:* ${data.deliveryType}\n`;

    if (data.address) message += `📍 *العنوان:* ${data.address}\n`;

    message += `\n📦 *الطلبات:*\n${data.itemsList}\n` +
               `💰 *المجموع الكلي:* ${data.total.toFixed(2)} دينار`;

    let telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: "Markdown"
        })
    })
    .then(response => response.json())
    .then(result => {
        if (result.ok) {
            alert("سوف يتم تجهيز طلبك خلال دقائق");
            cart = [];
            userLocationUrl = "";
            updateCart();
            closeCart();
        } else {
            alert("حدث خطأ أثناء الإرسال لتلغرام.");
        }
    });
}

function orderViaWhatsApp() {
    let data = getOrderData();
    if (!data) return;

    let message = `🛒 *طلب جديد من دكان الخال*\n\n` +
                  `👤 *الاسم:* ${data.name}\n` +
                  `📞 *رقم الهاتف:* ${data.phone}\n` +
                  `🚚 *طريقة الاستلام:* ${data.deliveryType}\n`;

    if (data.address) message += `📍 *العنوان:* ${data.address}\n`;

    message += `\n📦 *الطلبات:*\n${data.itemsList}\n` +
               `💰 *المجموع الكلي:* ${data.total.toFixed(2)} دينار`;

    let whatsappUrl = `https://wa.me/${MY_PHONE_NUMBER}?text=${encodeURIComponent(message)}`;
    
    alert("سوف يتم تجهيز طلبك خلال دقائق");
    cart = [];
    userLocationUrl = "";
    updateCart();
    closeCart();
    window.open(whatsappUrl, "_blank");
}

document.addEventListener("DOMContentLoaded", function() {
    fetchProductsFromFirebase();
    
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.addEventListener("input", displayProducts);
    }
});