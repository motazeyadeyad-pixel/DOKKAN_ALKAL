document.addEventListener("DOMContentLoaded", displayProducts);

const form = document.getElementById("addProductForm");

if (form) {
    form.addEventListener("submit", function(e) {
        e.preventDefault();

        const name = document.getElementById("productName").value.trim();
        const price = parseFloat(document.getElementById("productPrice").value);
        const fileInput = document.getElementById("productImageFile");
        const file = fileInput.files[0];

        if (!name || isNaN(price)) {
            alert("يرجى إدخال اسم وسعر صحيحين!");
            return;
        }

        // إذا تم اختيار صورة من الجهاز
        if (file) {
            // تصغير الصورة تلقائياً لضمان عدم تهنيج الصفحة
            resizeAndCompressImage(file, 400, 400, function(resizedBase64) {
                saveProduct(name, price, resizedBase64);
            });
        } else {
            // صورة افتراضية في حال عدم اختيار ملف
            saveProduct(name, price, "https://via.placeholder.com/150?text=منتج");
        }
    });
}

// دالة لتصغير الصورة وضغط حجمها لتجنب بطء الصفحة
function resizeAndCompressImage(file, maxWidth, maxHeight, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            let canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);

            // تحويل الصورة إلى حجم مصغر جداً بجودة عالية
            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
            callback(dataUrl);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function saveProduct(name, price, imageSrc) {
    const newProduct = {
        id: Date.now(),
        name: name,
        price: price,
        image: imageSrc,
        available: true // يكون متوفراً افتراضياً عند الإضافة
    };

    let products = JSON.parse(localStorage.getItem("shopProducts"));
    if (!products) {
        products = [
            { id: 1, name: "زيت دوار الشمس", price: 1, image: "images/oil.webp", available: true }
        ];
    }

    products.push(newProduct);
    localStorage.setItem("shopProducts", JSON.stringify(products));

    document.getElementById("addProductForm").reset();
    displayProducts();
    alert("تمت إضافة المنتج بنجاح! 🚀");
}

function displayProducts() {
    const productsList = document.getElementById("productsList");
    if (!productsList) return;

    productsList.innerHTML = "";

    let products = JSON.parse(localStorage.getItem("shopProducts")) || [
        { id: 1, name: "زيت دوار الشمس", price: 1, image: "images/oil.webp", available: true }
    ];

    if (products.length === 0) {
        productsList.innerHTML = "<p style='text-align:center;'>لا توجد منتجات معروضة حالياً.</p>";
        return;
    }

    products.forEach(product => {
        // التأكد من حالة التوفر (إذا لم تكن معرفة نعتبرها true)
        const isAvailable = product.available !== false;
        const statusText = isAvailable ? "🟢 متوفر" : "🔴 غير متوفر (مخلص)";
        const toggleBtnText = isAvailable ? "تغيير إلى غير متوفر" : "إعادة توفير المنتج";
        const toggleBtnClass = isAvailable ? "btn-available" : "btn-unavailable";

        const item = document.createElement("div");
        item.className = "product-item";
        item.innerHTML = `
            <div class="product-info">
                <img src="${product.image}" alt="${product.name}" onerror="this.onerror=null; this.src='https://via.placeholder.com/150?text=صورة';">
                <div class="product-details">
                    <strong>${product.name}</strong> - ${product.price} دينار<br>
                    <small>الحالة: ${statusText}</small>
                </div>
            </div>
            <div class="product-actions">
                <button onclick="toggleAvailability(${product.id})" class="toggle-btn ${toggleBtnClass}">
                    ${toggleBtnText}
                </button>
                <button onclick="deleteProduct(${product.id})" class="delete-btn">🗑️ حذف</button>
            </div>
        `;
        productsList.appendChild(item);
    });
}

// دالة التبديل بين متوفر وغير متوفر بضغطة زر
function toggleAvailability(id) {
    let products = JSON.parse(localStorage.getItem("shopProducts")) || [];
    let product = products.find(p => p.id === id);

    if (product) {
        product.available = !product.available; // عكس الحالة
        localStorage.setItem("shopProducts", JSON.stringify(products));
        displayProducts(); // تحديث العرض
    }
}

// دالة الحذف النهائي
function deleteProduct(id) {
    if (confirm("هل أنت تأكد من حذف هذا المنتج نهائياً من القائمة؟")) {
        let products = JSON.parse(localStorage.getItem("shopProducts")) || [];
        products = products.filter(product => product.id !== id);
        localStorage.setItem("shopProducts", JSON.stringify(products));
        displayProducts();
    }
}
// دالة لمعالجة الصورة عند التقاطها بالكاميرا
function handleCameraImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // وضع الصورة الملتقطة في خانة رابط الصورة تلقائياً
            document.getElementById('admin-prod-image').value = e.target.result;
            alert("✅ تم التقاط الصورة بنجاح!");
        };
        reader.readAsDataURL(file);
    }
}