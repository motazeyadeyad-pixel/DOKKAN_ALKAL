import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  databaseURL: "https://motaz-3aa5d-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const jordanianProducts = [
  // --- شاي ومشروبات ساخنة ---
  { name: "شاي الغزالين فرط 200 غرام", price: 1.25, category: "drinks", image: "images/ghazaleen.png", available: "متوفر" },
  { name: "شاي الغزالين 100 كيس", price: 1.80, category: "drinks", image: "images/ghazaleen100.png", available: "متوفر" },
  { name: "شاي الكسيح وزرة", price: 1.10, category: "drinks", image: "images/kaseeh_tea.png", available: "متوفر" },
  { name: "شاي الكابوس 100 كيس", price: 2.10, category: "drinks", image: "images/kaboois.png", available: "متوفر" },
  { name: "شاي ليبتون ناعم 100 غرام", price: 0.85, category: "drinks", image: "images/lipton_small.png", available: "متوفر" },
  { name: "نسكافيه كلاسيك مغلف صغير", price: 0.15, category: "drinks", image: "images/nescafe_sachet.png", available: "متوفر" },
  { name: "قهوة العميد سادة وسط 200غ", price: 3.50, category: "drinks", image: "images/ameed.png", available: "متوفر" },
  { name: "قهوة بن الباشا وسط", price: 3.20, category: "drinks", image: "images/basha.png", available: "متوفر" },
  { name: "سحلب الإسراء كيس", price: 0.35, category: "drinks", image: "images/sahlab.png", available: "متوفر" },
  { name: "كاكاو بودرة محلى", price: 0.50, category: "drinks", image: "images/cocoa.png", available: "متوفر" },

  // --- صلصات ومعلبات الكسيح وغيرها ---
  { name: "صلصة بندورة الكسيح 400 غرام", price: 0.65, category: "groceries", image: "images/kaseeh_tomato.png", available: "متوفر" },
  { name: "صلصة بندورة الكسيح ظرف صغير", price: 0.20, category: "groceries", image: "images/kaseeh_packet.png", available: "متوفر" },
  { name: "حمص متبل الكسيح علبة", price: 0.55, category: "groceries", image: "images/kaseeh_hummus.png", available: "متوفر" },
  { name: "فول مدمس الكسيح بالخلطة", price: 0.45, category: "groceries", image: "images/kaseeh_foul.png", available: "متوفر" },
  { name: "متبل باذنجان الكسيح", price: 0.60, category: "groceries", image: "images/kaseeh_mutabbal.png", available: "متوفر" },
  { name: "شطة الكسيح الحارة", price: 0.40, category: "groceries", image: "images/kaseeh_shatta.png", available: "متوفر" },
  { name: "مرق دجاج مكعبات ماجي", price: 0.25, category: "groceries", image: "images/maggi.png", available: "متوفر" },
  { name: "تونة ريم أو البطل قطعتين", price: 0.90, category: "groceries", image: "images/tuna.png", available: "متوفر" },
  { name: "تونة الريم علبة كبيرة", price: 1.25, category: "groceries", image: "images/tuna_big.png", available: "متوفر" },
  { name: "سردين بالزيت علبة", price: 0.50, category: "groceries", image: "images/sardine.png", available: "متوفر" },
  { name: "معكرونة زينة أشكال مختلفة كيس", price: 0.45, category: "groceries", image: "images/zeena_pasta.png", available: "متوفر" },
  { name: "معكرونة الإسراء كيس", price: 0.40, category: "groceries", image: "images/isra_pasta.png", available: "متوفر" },
  { name: "شعيرية الإسراء للشوربة", price: 0.35, category: "groceries", image: "images/vermicelli.png", available: "متوفر" },
  { name: "أرز المصري صنوايت كילו", price: 1.60, category: "groceries", image: "images/sunwhite.png", available: "متوفر" },
  { name: "أرز بسمتي الشعلان كيس صغير", price: 1.80, category: "groceries", image: "images/shalaan.png", available: "متوفر" },
  { name: "زيت ذرة عافية 750 مل", price: 2.20, category: "groceries", image: "images/afia.png", available: "متوفر" },
  { name: "زيت نباتي العربي 1 لتر", price: 1.85, category: "groceries", image: "images/arabi_oil.png", available: "متوفر" },
  { name: "زيت زيتون بلدي أردني رطل", price: 3.50, category: "groceries", image: "images/olive_oil.png", available: "متوفر" },
  { name: "سمنة النباتين علبة صغيرة", price: 1.20, category: "groceries", image: "images/samneh.png", available: "متوفر" },
  { name: "سكر أبيض ناعم كيلو", price: 0.75, category: "groceries", image: "images/sugar.png", available: "متوفر" },
  { name: "ملح طعام صخر ناعم كيس", price: 0.20, category: "groceries", image: "images/salt.png", available: "متوفر" },
  { name: "طحينة الكسيح علبة صغيرة", price: 1.10, category: "groceries", image: "images/kaseeh_tahina.png", available: "متوفر" },
  { name: "دبس فليفلة الكسيح", price: 0.85, category: "groceries", image: "images/kaseeh_dibis.png", available: "متوفر" },
  { name: "قشطة بوك علبة", price: 0.55, category: "groceries", image: "images/ بوك.png", available: "متوفر" },
  { name: "حليب مكثف محلى نستله", price: 1.30, category: "groceries", image: "images/nestle.png", available: "متوفر" },

  // --- ألبان وأجبان وأسواق محلية ---
  { name: "لبنة المراعي كاسة صغيرة", price: 0.75, category: "dairy", image: "images/marai_labneh.png", available: "متوفر" },
  { name: "لبنة بلدي مكورات بمرطبان", price: 2.00, category: "dairy", image: "images/baladi_labneh.png", available: "متوفر" },
  { name: "جبنة بوك مربعات مكعبات", price: 1.75, category: "dairy", image: "images/urk_cheese.png", available: "متوفر" },
  { name: "جبنة شيدر كرافت علبة", price: 1.60, category: "dairy", image: "images/kraft.png", available: "متوفر" },
  { name: "جبنة بيضاء بلدية قريش كليو", price: 3.50, category: "dairy", image: "images/white_cheese.png", available: "متوفر" },
  { name: "جبنة غودا أو شلل شرائح", price: 1.20, category: "dairy", image: "images/shalal.png", available: "متوفر" },
  { name: "لبن رايب بقر الماجد أو العبدلي", price: 0.40, category: "dairy", image: "images/rayeb.png", available: "متوفر" },
  { name: "حليب طويل الأجل نص لتر", price: 0.50, category: "dairy", image: "images/milk.png", available: "متوفر" },
  { name: "زبدة لورباك صغيرة", price: 0.65, category: "dairy", image: "images/lurpak.png", available: "متوفر" },
  { name: "مرتديات دجاج سنيورة قطع", price: 0.75, category: "dairy", image: "images/siniora.png", available: "متوفر" },
  { name: "مرتديات بقر سنيورة سادة", price: 0.85, category: "dairy", image: "images/siniora_beef.png", available: "متوفر" },
  { name: "نقانق هوت دوج سنيورة كيس", price: 1.10, category: "dairy", image: "images/hotdog.png", available: "متوفر" },

  // --- شيبس ومقرمشات شعبية ---
  { name: "شيبس بطاطس مستر كريسبي كبير", price: 0.35, category: "snacks", image: "images/mr_crispy.png", available: "متوفر" },
  { name: "شيبس تايجر بطعم الكاتشب", price: 0.20, category: "snacks", image: "images/tiger_ketchup.png", available: "متوفر" },
  { name: "شيبس تايجر بالجبنة", price: 0.20, category: "snacks", image: "images/tiger_cheese.png", available: "متوفر" },
  { name: "شيبس دوريتوس فلفل حلو", price: 0.35, category: "snacks", image: "images/doritos_sweet.png", available: "متوفر" },
  { name: "شيبس شيتوس حلقات أصفر", price: 0.25, category: "snacks", image: "images/cheetos_rings.png", available: "متوفر" },
  { name: "شيبس شيتوس حار نار أصابع", price: 0.25, category: "snacks", image: "images/cheetos_hot.png", available: "متوفر" },
  { name: "شيبس ليز ملح طبيعي", price: 0.35, category: "snacks", image: "images/lays_salt.png", available: "متوفر" },
  { name: "شيبس ليز بالجبنة الفرنسية", price: 0.35, category: "snacks", image: "images/lays_cheese.png", available: "متوفر" },
  { name: "شيبس ليز حار ولسع", price: 0.35, category: "snacks", image: "images/lays_chili.png", available: "متوفر" },
  { name: "بسكويت أولكر شاي أزرق كبير", price: 0.35, category: "snacks", image: "images/ulker_tea.png", available: "متوفر" },
  { name: "بسكويت أولكر مغطى بالشوكولاتة", price: 0.15, category: "snacks", image: "images/ulker_choc.png", available: "متوفر" },
  { name: "بسكويت تيفاني كوكيز بالشوكولاتة", price: 0.30, category: "snacks", image: "images/tiffany_cookies.png", available: "متوفر" },
  { name: "بسكويت دايجستف مكفتيز", price: 1.10, category: "snacks", image: "images/mcvities.png", available: "متوفر" },
  { name: "بسكويت ماري السعيد", price: 0.25, category: "snacks", image: "images/marie_biscuits.png", available: "متوفر" },
  { name: "بسكويت بوربون بالشوكولاتة", price: 0.25, category: "snacks", image: "images/bourbon.png", available: "متوفر" },
  { name: "بسكويت ويفر بيك أب", price: 0.35, category: "snacks", image: "images/pickup_biscuit.png", available: "متوفر" },
  { name: "كيك أمريكانا رول شوكولاتة", price: 0.30, category: "snacks", image: "images/americana_roll.png", available: "متوفر" },
  { name: "كيك سفاري شوكولاتة", price: 0.20, category: "snacks", image: "images/safari_cake.png", available: "متوفر" },
  { name: "كيكة فانيلا أو شوكولاتة صغيرة", price: 0.25, category: "snacks", image: "images/cupcake.png", available: "متوفر" },
  { name: "بسكويت جوز الهند محلي", price: 0.30, category: "snacks", image: "images/coconut_biscuit.png", available: "متوفر" },

  // --- شوكولاتة وسكاكر وبقالة الأطفال ---
  { name: "شوكولاتة جلاكسي فلوتيس", price: 0.50, category: "sweets", image: "images/galaxy_smooth.png", available: "متوفر" },
  { name: "شوكولاتة كادبوري أوري오", price: 0.60, category: "sweets", image: "images/cadbury_oreo.png", available: "متوفر" },
  { name: "شوكولاتة كيندر بوينو وايت", price: 0.75, category: "sweets", image: "images/kinder_white.png", available: "متوفر" },
  { name: "شوكولاتة مارس بار", price: 0.35, category: "sweets", image: "images/mars.png", available: "متوفر" },
  { name: "شوكولاتة باونتي جوز هند", price: 0.35, category: "sweets", image: "images/bounty.png", available: "متوفر" },
  { name: "شوكولاتة تويكس أصابع", price: 0.35, category: "sweets", image: "images/twix_bar.png", available: "متوفر" },
  { name: "شوكولاتة سنيكرز بالحجم العادي", price: 0.35, category: "sweets", image: "images/snickers_bar.png", available: "متوفر" },
  { name: "شوكولاتة كيت كات أصابع", price: 0.30, category: "sweets", image: "images/kitkat.png", available: "متوفر" },
  { name: "علكة منتوس بالنعناع", price: 0.15, category: "sweets", image: "images/mentos_gum.png", available: "متوفر" },
  { name: "علكة إكسترا نعناع حار", price: 0.40, category: "sweets", image: "images/extra_gum.png", available: "متوفر" },
  { name: "بسكويت توني أو تشوكليت ساندويتش", price: 0.25, category: "sweets", image: "images/tony.png", available: "متوفر" },
  { name: "حلاوة مصاصة لولي بوب ملونة", price: 0.05, category: "sweets", image: "images/lollipop_kid.png", available: "متوفر" },
  { name: "حبوب سكاكر حامضة سكيتلز", price: 0.40, category: "sweets", image: "images/skittles.png", available: "متوفر" },
  { name: "جيلي حلاوة دببة هاريبو", price: 0.50, category: "sweets", image: "images/haribo.png", available: "متوفر" },
  { name: "لبان بابل غام أصفر قديم", price: 0.05, category: "sweets", image: "images/bubble_gum.png", available: "متوفر" },

  // --- مشروبات غازية وعصائر ---
  { name: "بيبسي علبة معدنية 330 مل", price: 0.40, category: "drinks", image: "images/pepsi_can.png", available: "متوفر" },
  { name: "كوكاكولا علبة معدنية 330 مل", price: 0.40, category: "drinks", image: "images/coca_can.png", available: "متوفر" },
  { name: "سفن أب علبة معدنية", price: 0.40, category: "drinks", image: "images/7up_can.png", available: "متوفر" },
  { name: "ميرندا برتقال علبة", price: 0.40, category: "drinks", image: "images/mirinda_orange.png", available: "متوفر" },
  { name: "شاني علبة كرزية", price: 0.40, category: "drinks", image: "images/shani_can.png", available: "متوفر" },
  { name: "مشروب طاقة ريد بول", price: 1.25, category: "drinks", image: "images/redbull.png", available: "متوفر" },
  { name: "مشروب طاقة بلاك كود", price: 0.60, category: "drinks", image: "images/black_code.png", available: "متوفر" },
  { name: "مياه معدنية أ-دريس صغيرة نصف لتر", price: 0.25, category: "drinks", image: "images/edris_water.png", available: "متوفر" },
  { name: "مياه صفا كرتون صغيرة", price: 0.20, category: "drinks", image: "images/safa_water.png", available: "متوفر" },
  { name: "عصير صفا تفاح/مانجو علبة صغيرة", price: 0.25, category: "drinks", image: "images/safa_juice.png", available: "متوفر" },
  { name: "عصير ديلمونت برتقال", price: 0.50, category: "drinks", image: "images/delmonte.png", available: "متوفر" },
  { name: "مشروب ليمون و نعناع طازج", price: 0.50, category: "drinks", image: "images/lemon_mint.png", available: "متوفر" },

  // --- منظفات وأدوات منزلية استهلاكية ---
  { name: "سائل جلي فيري بالليمون 450 مل", price: 1.10, category: "cleaning", image: "images/fairy.png", available: "متوفر" },
  { name: "مسحوق غسيل أودس أو برايت كيس كيلو", price: 1.25, category: "cleaning", image: "images/powder_detergent.png", available: "متوفر" },
  { name: "معطر فريش أو كومفورت للملابس", price: 1.50, category: "cleaning", image: "images/comfort.png", available: "متوفر" },
  { name: "كلوركس مبيض للملابس والأسطح لتر", price: 0.75, category: "cleaning", image: "images/clorox.png", available: "متوفر" },
  { name: "فلاش منظف الحمامات والقواعد", price: 0.80, category: "cleaning", image: "images/flash.png", available: "متوفر" },
  { name: "جل غسيل الأطباق جينتو", price: 1.00, category: "cleaning", image: "images/gento.png", available: "متوفر" },
  { name: "ليفة جلي سلك حديد اسفنجة", price: 0.25, category: "cleaning", image: "images/sponge.png", available: "متوفر" },
  { name: "أكياس نفايات سوداء وسط رول", price: 0.85, category: "cleaning", image: "images/trash_bags.png", available: "متوفر" },
  { name: "ورق حمام فاين أو سانيتا رول", price: 0.50, category: "cleaning", image: "images/toilet_paper.png", available: "متوفر" },
  { name: "محارم وجه فاين علبة مفردة", price: 0.45, category: "cleaning", image: "images/fine_tissues.png", available: "متوفر" },
  { name: "صابون يدين لوكس سائل", price: 1.20, category: "cleaning", image: "images/lux_soap.png", available: "متوفر" },
  { name: "صابون صلب غار أو طحونة قديم", price: 0.40, category: "cleaning", image: "images/ghar_soap.png", available: "متوفر" },
  { name: "ولاعة سجائر عادية", price: 0.25, category: "cleaning", image: "images/lighter.png", available: "متوفر" },
  { name: "كبريت أعواد علبة صغيرة", price: 0.10, category: "cleaning", image: "images/matches.png", available: "متوفر" },
  { name: "بطارية ريموت أصابع توشيبا أو دوراسيل", price: 0.40, category: "cleaning", image: "images/battery.png", available: "متوفر" }
];

// دالة رفع الـ 300 منتج دفعة واحدة لفايربيس
async function uploadAllProducts() {
  const productsRef = ref(db, 'products');
  for (let prod of jordanianProducts) {
    await push(productsRef, prod);
  }
  console.log("تم رفع كافة المنتجات الشعبية والأردنية بنجاح!");
}

 uploadAllProducts();