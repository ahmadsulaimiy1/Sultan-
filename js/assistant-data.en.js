window.ASSISTANT_CONFIG = {
  "lang": "en",
  "endpoint": "https://formsubmit.co/info@shroyalschools.ng",
  "start": "start",
  "fallback": "human_handoff",
  "strings": {
    "namePlaceholder": "Your full name",
    "contactPlaceholder": "Email or phone",
    "emailSubject": "New admissions enquiry — Digital Assistant",
    "sendLabel": "Send my details",
    "sendingLabel": "Sending…",
    "sentConfirmation": "Thank you — our admissions team will be in touch shortly.",
    "sendError": "Couldn't send just now — please reach us directly via WhatsApp, phone, or email below."
  },
  "nodes": {
    "start": {
      "message": "Welcome — I'm the digital assistant for our Office of Registration & Student Affairs. I can help you find the right programme, walk you through admissions, or connect you with our team directly.",
      "options": [
        {"label": "Explore programmes", "next": "explore_age", "set": {"intent": "explore_programmes"}},
        {"label": "Admissions process", "next": "admissions_question", "set": {"intent": "admissions_question"}},
        {"label": "Fees", "next": "fees", "set": {"intent": "fees"}},
        {"label": "Speak with someone", "next": "human_handoff", "set": {"intent": "speak_to_someone"}}
      ]
    },
    "explore_age": {
      "message": "What age group is this for?",
      "options": [
        {"label": "Under 10", "next": "rec_nursery", "set": {"age_group": "under_10"}},
        {"label": "10 to 17", "next": "explore_interest", "set": {"age_group": "10_17"}},
        {"label": "18 or older", "next": "rec_arabic_adult", "set": {"age_group": "18_plus"}},
        {"label": "Not sure yet", "next": "human_handoff"}
      ]
    },
    "explore_interest": {
      "message": "Which best describes what you're hoping for?",
      "options": [
        {"label": "A strong academic foundation", "next": "explore_mode_academic", "set": {"interest": "academic"}},
        {"label": "Islamic & Qur'anic education", "next": "rec_islamic_10_17", "set": {"interest": "islamic"}},
        {"label": "Both, integrated", "next": "explore_mode_both", "set": {"interest": "both"}},
        {"label": "Not sure — please guide me", "next": "human_handoff"}
      ]
    },
    "explore_mode_academic": {
      "message": "Day only, or open to boarding?",
      "options": [
        {"label": "Day only", "next": "rec_royal_day", "set": {"study_mode": "day"}},
        {"label": "Open to boarding", "next": "rec_royal_boarding", "set": {"study_mode": "boarding"}}
      ]
    },
    "explore_mode_both": {
      "message": "Day only, or open to boarding — combining Qur'an memorisation with academics usually means boarding?",
      "options": [
        {"label": "Day only", "next": "rec_royal_arabic_day", "set": {"study_mode": "day"}},
        {"label": "Open to boarding", "next": "rec_royal_quran_boarding", "set": {"study_mode": "boarding"}}
      ]
    },
    "rec_nursery": {
      "message": "Sultan Hanafi Nursery & Primary School (ages 2–10) blends secular and Islamic teaching in the early years, led by Head Teacher Mrs. Kareemat Abdurazaq.",
      "links": [{"label": "View Nursery & Primary School →", "href": "/academics/nursery-primary/"}],
      "set": {"matched_programme": "Nursery & Primary School"},
      "options": [
        {"label": "Leave my details for a follow-up", "action": "contactForm"},
        {"label": "Just browsing, thanks", "next": "closing"}
      ]
    },
    "rec_royal_day": {
      "message": "Royal College (ages 10+, day) integrates the Nigerian National Curriculum with Arabic & Islamic Sciences across seven departments.",
      "links": [{"label": "View Royal College →", "href": "/academics/royal-college/"}],
      "set": {"matched_programme": "Royal College (day)"},
      "options": [
        {"label": "Leave my details for a follow-up", "action": "contactForm"},
        {"label": "Just browsing, thanks", "next": "closing"}
      ]
    },
    "rec_royal_boarding": {
      "message": "Royal College (ages 10+) offers full and half boarding for eligible students alongside the same integrated curriculum.",
      "links": [{"label": "View Royal College →", "href": "/academics/royal-college/"}, {"label": "View Boarding →", "href": "/boarding/"}],
      "set": {"matched_programme": "Royal College (boarding)"},
      "options": [
        {"label": "Leave my details for a follow-up", "action": "contactForm"},
        {"label": "Just browsing, thanks", "next": "closing"}
      ]
    },
    "rec_islamic_10_17": {
      "message": "Two paths fit here: Qur'an College (day & boarding, 24–36 months, culminating in Ijazaat) for full-time memorisation, or the School of Arabic & Islamic Studies (weekday and weekend classes) alongside regular schooling.",
      "links": [{"label": "View Qur'an College →", "href": "/academics/quran-college/"}, {"label": "View Arabic & Islamic Studies →", "href": "/academics/arabic-islamic-studies/"}],
      "set": {"matched_programme": "Qur'an College / Arabic & Islamic Studies"},
      "options": [
        {"label": "Leave my details for a follow-up", "action": "contactForm"},
        {"label": "Just browsing, thanks", "next": "closing"}
      ]
    },
    "rec_royal_arabic_day": {
      "message": "Royal College (day) covers the academic side, and the School of Arabic & Islamic Studies runs weekday/weekend classes alongside it for the Islamic & Qur'anic side.",
      "links": [{"label": "View Royal College →", "href": "/academics/royal-college/"}, {"label": "View Arabic & Islamic Studies →", "href": "/academics/arabic-islamic-studies/"}],
      "set": {"matched_programme": "Royal College + Arabic & Islamic Studies"},
      "options": [
        {"label": "Leave my details for a follow-up", "action": "contactForm"},
        {"label": "Just browsing, thanks", "next": "closing"}
      ]
    },
    "rec_royal_quran_boarding": {
      "message": "Royal College (boarding) for the academic side, and Qur'an College (24–36 months, day & boarding) for full Qur'an memorisation — many families combine the two.",
      "links": [{"label": "View Royal College →", "href": "/academics/royal-college/"}, {"label": "View Qur'an College →", "href": "/academics/quran-college/"}, {"label": "View Boarding →", "href": "/boarding/"}],
      "set": {"matched_programme": "Royal College + Qur'an College (boarding)"},
      "options": [
        {"label": "Leave my details for a follow-up", "action": "contactForm"},
        {"label": "Just browsing, thanks", "next": "closing"}
      ]
    },
    "rec_arabic_adult": {
      "message": "For adult learners, the School of Arabic & Islamic Studies is open to all ages with weekday (Mon–Wed, 2–6pm) and weekend (Sat–Sun, 9am–3pm) classes — no admission process required to attend.",
      "links": [{"label": "View Arabic & Islamic Studies →", "href": "/academics/arabic-islamic-studies/"}],
      "set": {"matched_programme": "School of Arabic & Islamic Studies (adult)"},
      "options": [
        {"label": "Leave my details for a follow-up", "action": "contactForm"},
        {"label": "Just browsing, thanks", "next": "closing"}
      ]
    },
    "admissions_question": {
      "message": "Admission runs in twelve stages, from initial enquiry through entrance assessment to settling in. You'll need a birth certificate, two passport photographs, and a report or testimonial from any previous school.",
      "links": [{"label": "View the full admissions process →", "href": "/admission/"}],
      "options": [
        {"label": "Leave my details for a follow-up", "action": "contactForm"},
        {"label": "That answers it, thanks", "next": "closing"}
      ]
    },
    "fees": {
      "message": "Our fee schedule isn't published through this assistant yet — I don't want to guess at a figure. I can have our admissions team send you the current schedule directly.",
      "options": [
        {"label": "Yes, please send me the fee schedule", "action": "contactForm"},
        {"label": "No thanks", "next": "closing"}
      ]
    },
    "human_handoff": {
      "message": "Of course — here's how to reach our team directly.",
      "links": [{"label": "WhatsApp: +234 807 374 7650", "href": "https://wa.me/2348073747650"}, {"label": "Call: +234 807 374 7650", "href": "tel:+2348073747650"}, {"label": "Email: info@shroyalschools.ng", "href": "mailto:info@shroyalschools.ng"}],
      "options": [
        {"label": "I'd also like to leave my details", "action": "contactForm"},
        {"label": "That's all, thank you", "next": "closing"}
      ]
    },
    "closing": {
      "message": "Thank you for visiting Sultan Hanafi Royal Schools. You're welcome to reopen this assistant any time, or browse the site directly.",
      "options": [
        {"label": "Start over", "next": "start"}
      ]
    }
  }
};
