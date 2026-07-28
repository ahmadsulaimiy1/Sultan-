// SHRS Marketplace — client-side rendering. Renders per-category product
// grids from the public GET /api/portal/marketplace/list endpoint. No
// fabricated products: an empty category renders an honest "Nothing
// listed here yet" card, never a placeholder product. There is no cart
// or checkout here on purpose (see docs/shrs-intelligent-campus-roadmap.md) —
// every "Order" action opens a pre-filled WhatsApp message to the
// Bursary/Bookshop, the same escalation pattern used by the AI assistant
// and the sitewide floating WhatsApp button.
(function () {
  var lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
  var WHATSAPP_NUMBER = '2348073747650';

  var CATEGORY_LABELS = {
    en: {
      textbooks: 'School Textbooks', exercise_books: 'Exercise Books', uniforms: 'Uniforms',
      bags: 'School Bags', stationery: 'Stationery', quran_materials: "Qur'an Materials",
      arabic_materials: 'Arabic Materials', islamic_studies_materials: 'Islamic Studies Materials',
      digital_products: 'Digital Products', shrs_publications: 'SHRS Publications',
      grammar_books: 'SHRS Grammar Books', curriculum_materials: 'SHRS Curriculum Materials',
    },
    ar: {
      textbooks: 'الكتب المدرسية', exercise_books: 'كراسات التمارين', uniforms: 'الزي المدرسي',
      bags: 'الحقائب المدرسية', stationery: 'القرطاسية', quran_materials: 'مواد قرآنية',
      arabic_materials: 'مواد اللغة العربية', islamic_studies_materials: 'مواد الدراسات الإسلامية',
      digital_products: 'منتجات رقمية', shrs_publications: 'إصدارات المدارس',
      grammar_books: 'كتب القواعد', curriculum_materials: 'مواد المنهج الدراسي',
    },
  };
  var STRINGS = {
    en: {
      empty: 'Nothing listed here yet.', priceOnEnquiry: 'Price on enquiry',
      unavailable: 'Currently unavailable', order: 'Enquire to Order',
    },
    ar: {
      empty: 'لا توجد منتجات مدرجة هنا بعد.', priceOnEnquiry: 'السعر عند الاستفسار',
      unavailable: 'غير متوفر حالياً', order: 'استفسر للطلب',
    },
  };
  var t = STRINGS[lang];
  var labels = CATEGORY_LABELS[lang] || CATEGORY_LABELS.en;

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatPrice(n) {
    if (n == null) return t.priceOnEnquiry;
    return '₦' + Number(n).toLocaleString(lang === 'ar' ? 'ar' : 'en-NG', { maximumFractionDigits: 0 });
  }

  function waLink(productName) {
    var msg = lang === 'ar'
      ? ('السلام عليكم، أرغب في الاستفسار عن طلب: ' + productName)
      : ("Hello, I'd like to enquire about ordering: " + productName);
    return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg);
  }

  function productCard(p) {
    return (
      '<article class="mkt-card' + (p.isAvailable ? '' : ' is-unavailable') + '">' +
      '<div class="mkt-card-media">' + (p.imageUrl ? '<img src="' + escapeHtml(p.imageUrl) + '" alt="" loading="lazy">' : '<span class="mkt-card-placeholder" aria-hidden="true"></span>') + '</div>' +
      '<div class="mkt-card-body">' +
      '<h4>' + escapeHtml(p.name) + '</h4>' +
      (p.description ? '<p>' + escapeHtml(p.description) + '</p>' : '') +
      '<div class="mkt-card-foot">' +
      '<span class="mkt-price">' + escapeHtml(formatPrice(p.priceNaira)) + '</span>' +
      (p.isAvailable
        ? '<a class="mkt-order-btn" href="' + waLink(p.name) + '" target="_blank" rel="noopener">' + escapeHtml(t.order) + '</a>'
        : '<span class="mkt-unavailable-tag">' + escapeHtml(t.unavailable) + '</span>') +
      '</div></div></article>'
    );
  }

  function renderCategory(section, category, items) {
    var grid = section.querySelector('[data-mkt-grid]');
    if (!grid) return;
    if (!items.length) {
      grid.innerHTML = '<p class="mkt-empty">' + escapeHtml(t.empty) + '</p>';
      return;
    }
    grid.innerHTML = items.map(productCard).join('');
  }

  function init() {
    var sections = document.querySelectorAll('[data-mkt-category]');
    if (!sections.length) return;
    sections.forEach(function (section) {
      var category = section.getAttribute('data-mkt-category');
      fetch('/api/portal/marketplace/list?category=' + encodeURIComponent(category), { headers: { accept: 'application/json' } })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
          renderCategory(section, category, data && data.ok ? data.items : []);
        })
        .catch(function () { renderCategory(section, category, []); });
    });
  }

  init();
})();
