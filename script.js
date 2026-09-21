// المنتجات المبدئية في حال كان المتجر فارغاً لأول مرة
const defaultProducts = [
    {
        id: 1,
        name: "زيت دوار الشمس",
        price: 1,
        category: "مواد غذائية",
        image: "images/oil.webp",
        available: true
    }
];

// جلب المنتجات من التخزين المحلي أو استخدام القائمة المبدئية
function getStoredProducts() {
    let stored = localStorage.getItem("shopProducts");
    if (!stored) {
        localStorage.setItem("shopProducts", JSON.stringify(defaultProducts));
        return defaultProducts;
    }
    return JSON.parse(stored);
}

// السلة
let cart = [];

// القسم المحدد حالياً
let currentCategory = 'الكل';

// متغير لتخزين رابط الـ GPS
let userLocationUrl = "";

// معلومات التلغرام والواتساب
const TELEGRAM_BOT_TOKEN = "8832237966:AAFM0maLZu_CPxOKk77kGblwx2FJKwJ5X7U";
const TELEGRAM_CHAT_ID = "1953861313";
const MY_PHONE_NUMBER = "962775279117";

// دالة التصفية حسب القسم
function filterByCategory(category, btnElement) {
    currentCategory = category;

    const buttons = document.querySelectorAll('.category-container button, .categories button');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (btnElement) {
        btnElement.classList.add('active');
    }

    displayProducts();
}

// دالة التحكم في الكمية بالبطاقة قبل الإضافة للسلة (+ و -)
function changeProductQty(productId, amount) {
    const qtyInput = document.getElementById(`qty-${productId}`);
    if (!qtyInput) return;

    let currentQty = parseInt(qtyInput.value) || 1;
    currentQty += amount;

    if (currentQty < 1) currentQty = 1; // عدم السماح بأقل من حبة واحدة
    qtyInput.value = currentQty;
}

// عرض المنتجات في المتجر
function displayProducts() {
    let container = document.getElementById("products-container");
    if (!container) return;
    
    container.innerHTML = "";
    let products = getStoredProducts();

    // 1. فلترة المتوفر
    let filteredProducts = products.filter(p => p.available !== false);

    // 2. فلترة القسم
    if (currentCategory !== 'الكل') {
        filteredProducts = filteredProducts.filter(p => p.category === currentCategory);
    }

    // 3. فلترة البحث
    const searchInput = document.getElementById("search-input");
    if (searchInput && searchInput.value.trim() !== "") {
        const query = searchInput.value.trim().toLowerCase();
        filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(query));
    }

    if (filteredProducts.length === 0) {
        container.innerHTML = "<p style='text-align:center; width:100%; font-size:18px; color: #666; grid-column: 1/-1;'>لا توجد منتجات معروضة في هذا القسم حالياً.</p>";
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

        // إضافة تفاصيل المنتج + واجهة تحديد عدد الحبات (+ / -)
        card.innerHTML += `
            <h3>${product.name}</h3>
            <div class="price">${product.price} دينار</div>
            <div class="available">✓ متوفر</div>
            
            <!-- أزرار زيادة ونقصان الكمية -->
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin: 10px 0;">
                <button type="button" onclick="changeProductQty(${product.id}, -1)" style="width:30px; height:30px; background:#ddd; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">-</button>
                <input type="number" id="qty-${product.id}" value="1" min="1" readonly style="width: 45px; text-align: center; border: 1px solid #ccc; border-radius: 5px; padding: 4px; font-weight: bold;">
                <button type="button" onclick="changeProductQty(${product.id}, 1)" style="width:30px; height:30px; background:#ddd; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">+</button>
            </div>

            <button class="add-button" onclick="addToCart(${product.id})">
                🛒 أضف إلى السلة
            </button>
        `;

        container.appendChild(card);
    });
}

// إضافة المنتج للسلة مع الكمية المحددة
function addToCart(productId) {
    let products = getStoredProducts();
    let product = products.find(item => item.id === productId);

    // جلب الكمية المختارة من خانة المنتج
    const qtyInput = document.getElementById(`qty-${productId}`);
    let selectedQuantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

    if (product) {
        let existingItem = cart.find(item => item.id === productId);
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

        // إرجاع الخانة لـ 1 بعد الإضافة
        if (qtyInput) qtyInput.value = 1;

        updateCart();
        alert(`تمت إضافة (${selectedQuantity}) حبات من ${product.name} إلى السلة 🛒`);
    }
}

// تحديث الواجهة للسلة وتوفير خيار تعديل الكمية داخل السلة أيضاً
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

// زيادة أو نقصان الحبات من داخل السلة مباشرة
function changeCartItemQty(index, amount) {
    if (cart[index]) {
        cart[index].quantity += amount;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        updateCart();
    }
}

// حذف منتج من السلة
function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

// فتح وإغلاق السلة والتنقل
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
                status.textContent = "❌ تعذر تحديد الموقع. يرجى تفعيل الـ GPS والسماح للمتصفح بالوصول.";
                status.style.color = "#e53935";
            }
        }
    );
}

// دالة تجميع البيانات للطلب
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
        alert("الرجاء إدخال اسمك لنعرف لمن نجهز الطلب.");
        return null;
    }

    if (deliveryType.includes("توصيل للمنزل") && address === "" && !userLocationUrl) {
        alert("الرجاء إدخال عنوانك أو استخدام زر الـ GPS لتحديد موقعك.");
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

// إرسال الطلبات تلغرام/واتساب
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
            alert("حدث خطأ أثناء الإرسال، يرجى التأكد من الضغط على Start في بوت التلغرام.");
        }
    })
    .catch(error => {
        alert("تأكد من الاتصال بالإنترنت وحاول مرة أخرى.");
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
    displayProducts();
    
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.addEventListener("input", displayProducts);
    }
});