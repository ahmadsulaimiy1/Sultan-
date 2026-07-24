window.ASSISTANT_CONFIG = {
  "lang": "ar",
  "endpoint": "https://formsubmit.co/info@shroyalschools.ng",
  "start": "start",
  "fallback": "human_handoff",
  "strings": {
    "namePlaceholder": "اسمك الكامل",
    "contactPlaceholder": "البريد الإلكتروني أو الهاتف",
    "emailSubject": "استفسار قبول جديد — المساعد الرقمي",
    "sendLabel": "إرسال بياناتي",
    "sendingLabel": "جارٍ الإرسال…",
    "sentConfirmation": "شكراً لكم — سيتواصل معكم فريق القبول قريباً.",
    "sendError": "تعذّر الإرسال الآن — يرجى التواصل معنا مباشرة عبر واتساب أو الهاتف أو البريد أدناه."
  },
  "nodes": {
    "start": {
      "message": "مرحباً بكم — أنا المساعد الرقمي لمكتب التسجيل وشؤون الطلاب. يسعدني مساعدتكم في اختيار البرنامج المناسب، أو شرح خطوات القبول، أو تحويلكم مباشرة إلى فريقنا.",
      "options": [
        {"label": "استكشاف البرامج", "next": "explore_age", "set": {"intent": "explore_programmes"}},
        {"label": "إجراءات القبول", "next": "admissions_question", "set": {"intent": "admissions_question"}},
        {"label": "الرسوم", "next": "fees", "set": {"intent": "fees"}},
        {"label": "التحدث مع أحد أفراد الفريق", "next": "human_handoff", "set": {"intent": "speak_to_someone"}}
      ]
    },
    "explore_age": {
      "message": "ما الفئة العمرية المقصودة؟",
      "options": [
        {"label": "أقل من 10 سنوات", "next": "rec_nursery", "set": {"age_group": "under_10"}},
        {"label": "من 10 إلى 17 سنة", "next": "explore_interest", "set": {"age_group": "10_17"}},
        {"label": "18 سنة فأكثر", "next": "rec_arabic_adult", "set": {"age_group": "18_plus"}},
        {"label": "غير متأكد بعد", "next": "human_handoff"}
      ]
    },
    "explore_interest": {
      "message": "أي مما يلي يصف احتياجكم بدقة أكبر؟",
      "options": [
        {"label": "أساس أكاديمي قوي", "next": "explore_mode_academic", "set": {"interest": "academic"}},
        {"label": "تعليم إسلامي وقرآني", "next": "rec_islamic_10_17", "set": {"interest": "islamic"}},
        {"label": "كلاهما معاً", "next": "explore_mode_both", "set": {"interest": "both"}},
        {"label": "غير متأكد — أرجو التوجيه", "next": "human_handoff"}
      ]
    },
    "explore_mode_academic": {
      "message": "نهاري فقط، أم مستعدون للسكن الداخلي؟",
      "options": [
        {"label": "نهاري فقط", "next": "rec_royal_day", "set": {"study_mode": "day"}},
        {"label": "مستعدون للسكن الداخلي", "next": "rec_royal_boarding", "set": {"study_mode": "boarding"}}
      ]
    },
    "explore_mode_both": {
      "message": "نهاري فقط، أم مستعدون للسكن الداخلي — الجمع بين حفظ القرآن والدراسة الأكاديمية غالباً ما يتطلب السكن الداخلي؟",
      "options": [
        {"label": "نهاري فقط", "next": "rec_royal_arabic_day", "set": {"study_mode": "day"}},
        {"label": "مستعدون للسكن الداخلي", "next": "rec_royal_quran_boarding", "set": {"study_mode": "boarding"}}
      ]
    },
    "rec_nursery": {
      "message": "مدرسة سلطان حنفي للحضانة والابتدائية (من 2 إلى 10 سنوات) تجمع بين التعليم العصري والتعاليم الإسلامية في السنوات الأولى، بقيادة المعلمة الأولى السيدة كريمة عبدالرزاق.",
      "links": [{"label": "عرض الحضانة والابتدائية ←", "href": "/ar/academics/nursery-primary/"}],
      "set": {"matched_programme": "الحضانة والابتدائية"},
      "options": [
        {"label": "ترك بياناتي للمتابعة", "action": "contactForm"},
        {"label": "أتصفّح فقط، شكراً", "next": "closing"}
      ]
    },
    "rec_royal_day": {
      "message": "الكلية الملكية (10 سنوات فأكثر، نهاري) تدمج المنهج الوطني النيجيري مع العلوم العربية والإسلامية عبر سبعة أقسام.",
      "links": [{"label": "عرض الكلية الملكية ←", "href": "/ar/academics/royal-college/"}],
      "set": {"matched_programme": "الكلية الملكية (نهاري)"},
      "options": [
        {"label": "ترك بياناتي للمتابعة", "action": "contactForm"},
        {"label": "أتصفّح فقط، شكراً", "next": "closing"}
      ]
    },
    "rec_royal_boarding": {
      "message": "الكلية الملكية (10 سنوات فأكثر) توفّر سكناً داخلياً كاملاً ونصفياً للطلاب المؤهلين إلى جانب المنهج المتكامل ذاته.",
      "links": [{"label": "عرض الكلية الملكية ←", "href": "/ar/academics/royal-college/"}, {"label": "عرض السكن الداخلي ←", "href": "/ar/boarding/"}],
      "set": {"matched_programme": "الكلية الملكية (داخلي)"},
      "options": [
        {"label": "ترك بياناتي للمتابعة", "action": "contactForm"},
        {"label": "أتصفّح فقط، شكراً", "next": "closing"}
      ]
    },
    "rec_islamic_10_17": {
      "message": "هناك مساران مناسبان: كلية القرآن الكريم (نهاري وداخلي، 24–36 شهراً، تُختم بالإجازة) للحفظ المتفرغ، أو مدرسة اللغة العربية والدراسات الإسلامية (حصص أيام الأسبوع ونهايته) إلى جانب الدراسة النظامية.",
      "links": [{"label": "عرض كلية القرآن الكريم ←", "href": "/ar/academics/quran-college/"}, {"label": "عرض اللغة العربية والدراسات الإسلامية ←", "href": "/ar/academics/arabic-islamic-studies/"}],
      "set": {"matched_programme": "كلية القرآن الكريم / اللغة العربية والدراسات الإسلامية"},
      "options": [
        {"label": "ترك بياناتي للمتابعة", "action": "contactForm"},
        {"label": "أتصفّح فقط، شكراً", "next": "closing"}
      ]
    },
    "rec_royal_arabic_day": {
      "message": "الكلية الملكية (نهاري) للجانب الأكاديمي، ومدرسة اللغة العربية والدراسات الإسلامية بحصصها في أيام الأسبوع ونهايته للجانب الإسلامي والقرآني.",
      "links": [{"label": "عرض الكلية الملكية ←", "href": "/ar/academics/royal-college/"}, {"label": "عرض اللغة العربية والدراسات الإسلامية ←", "href": "/ar/academics/arabic-islamic-studies/"}],
      "set": {"matched_programme": "الكلية الملكية + اللغة العربية والدراسات الإسلامية"},
      "options": [
        {"label": "ترك بياناتي للمتابعة", "action": "contactForm"},
        {"label": "أتصفّح فقط، شكراً", "next": "closing"}
      ]
    },
    "rec_royal_quran_boarding": {
      "message": "الكلية الملكية (داخلي) للجانب الأكاديمي، وكلية القرآن الكريم (24–36 شهراً، نهاري وداخلي) لحفظ القرآن الكريم كاملاً — تجمع أسر كثيرة بين الاثنين.",
      "links": [{"label": "عرض الكلية الملكية ←", "href": "/ar/academics/royal-college/"}, {"label": "عرض كلية القرآن الكريم ←", "href": "/ar/academics/quran-college/"}, {"label": "عرض السكن الداخلي ←", "href": "/ar/boarding/"}],
      "set": {"matched_programme": "الكلية الملكية + كلية القرآن الكريم (داخلي)"},
      "options": [
        {"label": "ترك بياناتي للمتابعة", "action": "contactForm"},
        {"label": "أتصفّح فقط، شكراً", "next": "closing"}
      ]
    },
    "rec_arabic_adult": {
      "message": "للدارسين البالغين، مدرسة اللغة العربية والدراسات الإسلامية مفتوحة لجميع الأعمار بحصص أيام الأسبوع (الاثنين–الأربعاء، 2–6 مساءً) ونهاية الأسبوع (السبت والأحد، 9 صباحاً–3 مساءً) — دون الحاجة لعملية قبول.",
      "links": [{"label": "عرض اللغة العربية والدراسات الإسلامية ←", "href": "/ar/academics/arabic-islamic-studies/"}],
      "set": {"matched_programme": "اللغة العربية والدراسات الإسلامية (بالغون)"},
      "options": [
        {"label": "ترك بياناتي للمتابعة", "action": "contactForm"},
        {"label": "أتصفّح فقط، شكراً", "next": "closing"}
      ]
    },
    "admissions_question": {
      "message": "يتم القبول عبر اثنتي عشرة مرحلة، من الاستفسار الأولي وصولاً إلى اختبار القبول ثم الاستقرار في الدراسة. ستحتاجون إلى شهادة الميلاد، وصورتين شخصيتين، وكشف درجات أو شهادة من المدرسة السابقة.",
      "links": [{"label": "عرض عملية القبول كاملة ←", "href": "/ar/admission/"}],
      "options": [
        {"label": "ترك بياناتي للمتابعة", "action": "contactForm"},
        {"label": "هذا يجيب على سؤالي، شكراً", "next": "closing"}
      ]
    },
    "fees": {
      "message": "لم يُنشر جدول الرسوم عبر هذا المساعد بعد — ولا أرغب في التخمين برقم. يمكنني تكليف فريق القبول بإرسال الجدول الحالي مباشرة إليكم.",
      "options": [
        {"label": "نعم، أرسلوا لي جدول الرسوم", "action": "contactForm"},
        {"label": "لا شكراً", "next": "closing"}
      ]
    },
    "human_handoff": {
      "message": "بالطبع — إليكم طرق التواصل المباشر مع فريقنا.",
      "links": [{"label": "واتساب: +234 807 374 7650", "href": "https://wa.me/2348073747650"}, {"label": "اتصال: +234 807 374 7650", "href": "tel:+2348073747650"}, {"label": "البريد: info@shroyalschools.ng", "href": "mailto:info@shroyalschools.ng"}],
      "options": [
        {"label": "أرغب أيضاً في ترك بياناتي", "action": "contactForm"},
        {"label": "هذا كل شيء، شكراً", "next": "closing"}
      ]
    },
    "closing": {
      "message": "شكراً لزيارتكم مدارس سلطان حنفي الملكية. يسعدنا إعادة فتح هذا المساعد في أي وقت، أو يمكنكم تصفّح الموقع مباشرة.",
      "options": [
        {"label": "البدء من جديد", "next": "start"}
      ]
    }
  }
};
