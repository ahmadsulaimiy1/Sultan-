// Morning & Evening Adhkar — content data.
//
// Sourced from the standard, widely-published "Hisn al-Muslim" tradition
// (Qur'an verses and hadith-authenticated supplications used identically
// across virtually every azkar reference and app) rather than any single
// third-party website. Every entry carries a reference so a reader can
// verify it independently; nothing here is a substitute for review by
// the school's own Qur'an College / Arabic & Islamic Studies scholars,
// which SHRS has on staff.
//
// Shared items (Ayat al-Kursi, the three Quls) are recited identically
// in both the morning and evening litany, per the Sunnah — they appear
// in both lists below rather than being artificially split.

(function (global) {
  var AYAT_AL_KURSI = {
    id: 'ayat-al-kursi',
    title: { en: 'Ayat al-Kursi', ar: 'آية الكرسي' },
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
    transliteration: "Allahu la ilaha illa huwa, al-Hayyu al-Qayyum. La ta'khudhuhu sinatun wa la nawm. Lahu ma fis-samawati wa ma fil-ard...",
    translation: {
      en: 'Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except what He wills. His Kursi extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great.',
      ar: 'آيةٌ من سورة البقرة، تُقرأ في أذكار الصباح والمساء لِما ثبت في فضلها من الحفظ والحماية بإذن الله.'
    },
    reference: { en: 'Qur’an 2:255', ar: 'القرآن الكريم، سورة البقرة، الآية 255' },
    virtue: {
      en: 'The greatest verse in the Qur’an; recited morning and evening for protection, following the Sunnah.',
      ar: 'أعظم آية في القرآن الكريم، تُقرأ صباحاً ومساءً طلباً للحفظ اتباعاً للسنة.'
    },
    repeat: 1
  };

  var AL_IKHLAS = {
    id: 'al-ikhlas',
    title: { en: 'Surah Al-Ikhlas', ar: 'سورة الإخلاص' },
    arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ ﴿١﴾ اللَّهُ الصَّمَدُ ﴿٢﴾ لَمْ يَلِدْ وَلَمْ يُولَدْ ﴿٣﴾ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ ﴿٤﴾',
    transliteration: 'Qul huwa Allahu ahad. Allahu-s-samad. Lam yalid wa lam yulad. Wa lam yakun lahu kufuwan ahad.',
    translation: {
      en: 'Say, "He is Allah, [who is] One, Allah, the Eternal Refuge. He neither begets nor is born, nor is there to Him any equivalent."',
      ar: 'سورة كاملة من القرآن الكريم، تُقرأ ثلاث مرات في أذكار الصباح والمساء.'
    },
    reference: { en: 'Qur’an 112:1-4', ar: 'القرآن الكريم، سورة الإخلاص' },
    virtue: { en: 'Recited three times, morning and evening.', ar: 'تُقرأ ثلاث مرات صباحاً ومساءً.' },
    repeat: 3
  };

  var AL_FALAQ = {
    id: 'al-falaq',
    title: { en: 'Surah Al-Falaq', ar: 'سورة الفلق' },
    arabic: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ﴿١﴾ مِنْ شَرِّ مَا خَلَقَ ﴿٢﴾ وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ ﴿٣﴾ وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ﴿٤﴾ وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ ﴿٥﴾',
    transliteration: 'Qul a’udhu bi-rabbil-falaq. Min sharri ma khalaq. Wa min sharri ghasiqin idha waqab. Wa min sharrin-naffathati fil-’uqad. Wa min sharri hasidin idha hasad.',
    translation: {
      en: 'Say, "I seek refuge in the Lord of daybreak, from the evil of that which He created, and from the evil of darkness when it settles, and from the evil of the blowers in knots, and from the evil of an envier when he envies."',
      ar: 'سورة كاملة من القرآن الكريم، تُقرأ ثلاث مرات في أذكار الصباح والمساء.'
    },
    reference: { en: 'Qur’an 113:1-5', ar: 'القرآن الكريم، سورة الفلق' },
    virtue: { en: 'Recited three times, morning and evening, for protection.', ar: 'تُقرأ ثلاث مرات صباحاً ومساءً طلباً للحماية.' },
    repeat: 3
  };

  var AN_NAS = {
    id: 'an-nas',
    title: { en: 'Surah An-Nas', ar: 'سورة الناس' },
    arabic: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ ﴿١﴾ مَلِكِ النَّاسِ ﴿٢﴾ إِلَٰهِ النَّاسِ ﴿٣﴾ مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ﴿٤﴾ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ﴿٥﴾ مِنَ الْجِنَّةِ وَالنَّاسِ ﴿٦﴾',
    transliteration: 'Qul a’udhu bi-rabbin-nas. Malikin-nas. Ilahin-nas. Min sharril-waswasil-khannas. Alladhi yuwaswisu fi sudurin-nas. Minal-jinnati wan-nas.',
    translation: {
      en: 'Say, "I seek refuge in the Lord of mankind, the Sovereign of mankind, the God of mankind, from the evil of the retreating whisperer who whispers [evil] into the breasts of mankind, from among the jinn and mankind."',
      ar: 'سورة كاملة من القرآن الكريم، تُقرأ ثلاث مرات في أذكار الصباح والمساء.'
    },
    reference: { en: 'Qur’an 114:1-6', ar: 'القرآن الكريم، سورة الناس' },
    virtue: { en: 'Recited three times, morning and evening, for protection.', ar: 'تُقرأ ثلاث مرات صباحاً ومساءً طلباً للحماية.' },
    repeat: 3
  };

  var SAYYID_AL_ISTIGHFAR = {
    id: 'sayyid-al-istighfar',
    title: { en: 'Sayyid al-Istighfar (Master of Seeking Forgiveness)', ar: 'سيد الاستغفار' },
    arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَىٰ عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
    transliteration: "Allahumma anta rabbi la ilaha illa ant, khalaqtani wa ana ‘abduka, wa ana ‘ala ‘ahdika wa wa‘dika mas-tata‘t...",
    translation: {
      en: 'O Allah, You are my Lord; there is no deity except You. You created me and I am Your servant, and I abide by Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your favour upon me, and I acknowledge my sin — so forgive me, for none forgives sins except You.',
      ar: 'أعظم صيغ الاستغفار، من قالها موقناً بها ومات من يومه أو ليلته دخل الجنة.'
    },
    reference: { en: 'Sahih al-Bukhari', ar: 'صحيح البخاري' },
    virtue: {
      en: 'Whoever says it during the day with certainty and dies that day before evening is among the people of Paradise (and the same for the night).',
      ar: 'من قالها من النهار موقناً بها فمات من يومه قبل أن يمسي فهو من أهل الجنة، ومن قالها من الليل وهو موقن بها فمات قبل أن يصبح فهو من أهل الجنة.'
    },
    repeat: 1
  };

  var HASBIYA_ALLAH = {
    id: 'hasbiya-allah',
    title: { en: 'Hasbiya Allah', ar: 'حسبي الله' },
    arabic: 'حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ، عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
    transliteration: 'Hasbiya Allahu la ilaha illa huwa, ‘alayhi tawakkaltu wa huwa rabbul-‘arshil-‘azim.',
    translation: {
      en: 'Allah is sufficient for me; there is no deity except Him. Upon Him I have relied, and He is the Lord of the Great Throne.',
      ar: 'تُقال سبع مرات، وقد وردت في القرآن الكريم بمعناها.'
    },
    reference: { en: 'Sunan Abi Dawud', ar: 'سنن أبي داود' },
    virtue: { en: 'Whoever says it seven times, morning and evening, Allah will suffice him against whatever concerns him.', ar: 'من قالها سبع مرات صباحاً ومساءً كفاه الله ما أهمّه.' },
    repeat: 7
  };

  var BISMILLAHIL_LADHI = {
    id: 'bismillahil-ladhi',
    title: { en: 'Bismillah — protection formula', ar: 'بسم الله الذي لا يضر' },
    arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    transliteration: "Bismillahil-ladhi la yadurru ma‘a ismihi shay’un fil-ardi wa la fis-sama’i wa huwas-Sami‘ul-‘Alim.",
    translation: {
      en: 'In the name of Allah, with whose name nothing on earth or in the heaven can cause harm, and He is the All-Hearing, the All-Knowing.',
      ar: 'تُقال ثلاث مرات، ومن قالها لم يُصبه شيء مفاجئ حتى يُمسي أو يُصبح.'
    },
    reference: { en: 'Sunan Abi Dawud; Sunan al-Tirmidhi', ar: 'سنن أبي داود، وسنن الترمذي' },
    virtue: { en: 'Whoever says it three times will not be harmed by anything sudden until the next period.', ar: 'من قالها ثلاث مرات لم يضرّه شيء مفاجئ.' },
    repeat: 3
  };

  var MORNING_ONLY = {
    id: 'asbahna',
    title: { en: 'Asbahna wa Asbaha al-Mulku Lillah', ar: 'أصبحنا وأصبح الملك لله' },
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَٰذَا الْيَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَٰذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ',
    transliteration: "Asbahna wa asbaha al-mulku lillah, wal-hamdu lillah...",
    translation: {
      en: 'We have entered a new morning and with it all dominion belongs to Allah, and praise be to Allah. None has the right to be worshipped except Allah alone, without partner. To Him belongs the dominion and to Him is the praise, and He is over all things omnipotent. My Lord, I ask You for the good of this day and the good of what follows it, and I seek refuge in You from the evil of this day and the evil of what follows it. My Lord, I seek refuge in You from laziness and the evil of old age. My Lord, I seek refuge in You from punishment in the Fire and punishment in the grave.',
      ar: 'يُقال في أذكار الصباح فقط.'
    },
    reference: { en: 'Sahih Muslim', ar: 'صحيح مسلم' },
    virtue: { en: 'The morning declaration of Allah’s sole dominion, with a prayer for the day ahead.', ar: 'إعلان بالتوحيد وطلب خير اليوم ودفع شرّه.' },
    repeat: 1
  };

  var EVENING_ONLY = {
    id: 'amsayna',
    title: { en: 'Amsayna wa Amsa al-Mulku Lillah', ar: 'أمسينا وأمسى الملك لله' },
    arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَٰذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَٰذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ',
    transliteration: "Amsayna wa amsa al-mulku lillah, wal-hamdu lillah...",
    translation: {
      en: 'We have entered a new evening and with it all dominion belongs to Allah, and praise be to Allah. None has the right to be worshipped except Allah alone, without partner. To Him belongs the dominion and to Him is the praise, and He is over all things omnipotent. My Lord, I ask You for the good of this night and the good of what follows it, and I seek refuge in You from the evil of this night and the evil of what follows it. My Lord, I seek refuge in You from laziness and the evil of old age. My Lord, I seek refuge in You from punishment in the Fire and punishment in the grave.',
      ar: 'يُقال في أذكار المساء فقط.'
    },
    reference: { en: 'Sahih Muslim', ar: 'صحيح مسلم' },
    virtue: { en: 'The evening declaration of Allah’s sole dominion, with a prayer for the night ahead.', ar: 'إعلان بالتوحيد وطلب خير الليلة ودفع شرّها.' },
    repeat: 1
  };

  var AFIYAH = {
    id: 'afiyah',
    title: { en: 'Dua for Well-Being', ar: 'دعاء العافية' },
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي',
    transliteration: 'Allahumma inni as’aluka al-‘afwa wal-‘afiyata fid-dunya wal-akhirah...',
    translation: {
      en: 'O Allah, I ask You for pardon and well-being in this world and the next. O Allah, I ask You for pardon and well-being in my religion, my worldly affairs, my family, and my wealth.',
      ar: 'دعاء جامع يُقال في أذكار الصباح والمساء.'
    },
    reference: { en: 'Sunan Abi Dawud; Sunan Ibn Majah', ar: 'سنن أبي داود، وسنن ابن ماجه' },
    virtue: { en: 'A comprehensive supplication for well-being in this life and the next.', ar: 'دعاء جامع لخيري الدنيا والآخرة.' },
    repeat: 1
  };

  global.SHRS_ADHKAR = {
    morning: [AYAT_AL_KURSI, AL_IKHLAS, AL_FALAQ, AN_NAS, MORNING_ONLY, SAYYID_AL_ISTIGHFAR, HASBIYA_ALLAH, BISMILLAHIL_LADHI, AFIYAH],
    evening: [AYAT_AL_KURSI, AL_IKHLAS, AL_FALAQ, AN_NAS, EVENING_ONLY, SAYYID_AL_ISTIGHFAR, HASBIYA_ALLAH, BISMILLAHIL_LADHI, AFIYAH]
  };
})(typeof window !== 'undefined' ? window : this);
