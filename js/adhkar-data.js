// Adhkar content data — the Islamic Spiritual Life layer's single source
// of truth (consumed by pages/adhkar.html's app shell, the homepage
// reflection rotator, and the Personalisation Centre widget).
//
// Sourced from the standard, widely-published "Hisn al-Muslim" tradition
// (Qur'an verses and hadith-authenticated supplications used identically
// across Islamic scholarship) rather than any single third-party site.
// Every entry carries a reference so it can be verified independently.
// This is not a substitute for review by the school's own Qur'an College
// / Arabic & Islamic Studies scholars, which SHRS has on staff.
//
// Deliberately NOT built as separate "Ruqyah" / "Protection from Jinn"
// branded categories: the mainstream Qur'anic and hadith texts actually
// used for that purpose (Ayat al-Kursi, the Mu'awwidhatayn, the general
// protection duas) are included and tagged into "protection" — but a
// formal ruqyah program is something a real Islamic institution defines
// deliberately, case by case, not something to construct generically here.
//
// Data model: one flat ITEMS array; each item lists every category id it
// belongs to (many adhkar are prescribed in more than one context — that
// overlap is real, not padding). `repeat` is the prescribed count the
// Smart Counter stops at. `seconds` is total estimated recitation time
// for that item at its prescribed count (per-repeat pace hand-estimated
// from the text's actual length, not auto-computed from character count).

(function (global) {
  var CATEGORIES = [
    { id: 'morning', label: { en: 'Morning Adhkār', ar: 'أذكار الصباح' }, icon: 'sun', priority: true, group: 'daily',
      description: { en: 'Recited after Fajr through mid-morning.', ar: 'تُقرأ من بعد الفجر حتى الضحى.' } },
    { id: 'evening', label: { en: 'Evening Adhkār', ar: 'أذكار المساء' }, icon: 'moon', priority: true, group: 'daily',
      description: { en: 'Recited after Asr through Maghrib.', ar: 'تُقرأ من بعد العصر حتى المغرب.' } },
    { id: 'after-salah', label: { en: 'After Each Prayer', ar: 'أذكار بعد الصلاة' }, icon: 'prayer', priority: true, group: 'daily',
      description: { en: 'The remembrance said immediately after the five daily prayers.', ar: 'الذكر الذي يُقال عقب الصلوات الخمس مباشرة.' } },
    { id: 'sleep', label: { en: 'Before Sleep', ar: 'أذكار النوم' }, icon: 'moon-stars', priority: false, group: 'daily',
      description: { en: 'Said before sleeping each night.', ar: 'تُقال قبل النوم كل ليلة.' } },
    { id: 'waking', label: { en: 'Upon Waking', ar: 'أذكار الاستيقاظ' }, icon: 'sunrise', priority: false, group: 'daily',
      description: { en: 'Said on waking, before rising.', ar: 'تُقال عند الاستيقاظ قبل النهوض.' } },
    { id: 'home', label: { en: 'Entering & Leaving Home', ar: 'دخول وخروج المنزل' }, icon: 'home', priority: false, group: 'occasions',
      description: { en: 'Said at the door, each time.', ar: 'تُقال عند الباب في كل مرة.' } },
    { id: 'mosque', label: { en: 'Entering & Leaving the Mosque', ar: 'دخول وخروج المسجد' }, icon: 'mosque', priority: false, group: 'occasions',
      description: { en: 'Said stepping in and stepping out.', ar: 'تُقال عند الدخول والخروج.' } },
    { id: 'travel', label: { en: 'Travel', ar: 'أذكار السفر' }, icon: 'travel', priority: false, group: 'occasions',
      description: { en: 'Said when setting out on a journey.', ar: 'تُقال عند بدء السفر.' } },
    { id: 'protection', label: { en: 'Protection & Well-Being', ar: 'الحماية والعافية' }, icon: 'shield', priority: true, group: 'occasions',
      description: { en: 'The Qur’an and Sunnah’s own texts for protection — against harm, the evil eye, and whispers of Shayṭān.', ar: 'نصوص القرآن والسنة نفسها للحماية — من الأذى والعين ووسوسة الشيطان.' } },
    { id: 'distress', label: { en: 'Distress & Anxiety', ar: 'الكرب والقلق' }, icon: 'heart', priority: false, group: 'occasions',
      description: { en: 'Said in hardship or worry.', ar: 'تُقال عند الهم والكرب.' } },
    { id: 'forgiveness', label: { en: 'Seeking Forgiveness', ar: 'الاستغفار' }, icon: 'hands', priority: true, group: 'occasions',
      description: { en: 'Istighfar — turning back to Allah in repentance.', ar: 'الاستغفار — الرجوع إلى الله تائباً.' } },
    { id: 'salawat', label: { en: 'Salawāt Collection', ar: 'الصلاة على النبي ﷺ' }, icon: 'star', priority: true, group: 'occasions',
      description: { en: 'Sending blessings upon the Prophet ﷺ.', ar: 'الصلاة والسلام على النبي ﷺ.' } },
    { id: 'gratitude', label: { en: 'Gratitude', ar: 'الشكر والحمد' }, icon: 'hands', priority: false, group: 'occasions',
      description: { en: 'Praise and thanks in the Prophet’s ﷺ own words.', ar: 'الحمد والشكر بألفاظ النبي ﷺ.' } },
    { id: 'family', label: { en: 'Family', ar: 'الأسرة والذرية' }, icon: 'home', priority: false, group: 'occasions',
      description: { en: 'Qur’anic supplications for parents and offspring.', ar: 'أدعية قرآنية للوالدين والذرية.' } },
    { id: 'wudu', label: { en: 'Wuḍūʾ', ar: 'الوضوء' }, icon: 'home', priority: false, group: 'occasions',
      description: { en: 'Said upon completing ablution.', ar: 'تُقال عند الفراغ من الوضوء.' } },
    { id: 'knowledge', label: { en: 'Seeking Knowledge', ar: 'طلب العلم' }, icon: 'hands', priority: false, group: 'occasions',
      description: { en: 'For students and seekers of beneficial knowledge.', ar: 'للطلاب وطالبي العلم النافع.' } },
    { id: 'rizq', label: { en: 'Sustenance & Barakah', ar: 'الرزق والبركة' }, icon: 'home', priority: false, group: 'occasions',
      description: { en: 'Seeking provision and blessing in what is given.', ar: 'طلب الرزق والبركة فيما أُعطي.' } },
    { id: 'ramadan', label: { en: 'Ramaḍān', ar: 'رمضان' }, icon: 'moon-stars', priority: false, group: 'occasions',
      description: { en: 'Specific to the blessed month.', ar: 'خاصة بالشهر الفضيل.' } },
    { id: 'ruqyah', label: { en: 'Ruqyah (Healing)', ar: 'الرقية الشرعية' }, icon: 'shield', priority: false, group: 'occasions',
      description: { en: 'The Prophet’s ﷺ own words recited over the sick.', ar: 'ألفاظ النبي ﷺ التي كان يرقي بها المريض.' } },
  ];

  function it(o) { return o; }

  var AYAT_AL_KURSI = it({
    id: 'ayat-al-kursi', categories: ['morning', 'evening', 'after-salah', 'sleep', 'protection'],
    title: { en: 'Ayat al-Kursi', ar: 'آية الكرسي' },
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
    transliteration: "Allahu la ilaha illa huwa, al-Hayyu al-Qayyum. La ta'khudhuhu sinatun wa la nawm. Lahu ma fis-samawati wa ma fil-ard...",
    translation: { en: 'Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except what He wills. His Kursi extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great.',
      ar: 'آيةٌ من سورة البقرة، تُقرأ في أذكار الصباح والمساء وبعد الصلاة لِما ثبت في فضلها من الحفظ والحماية بإذن الله.' },
    reference: { en: 'Qur’an 2:255', ar: 'القرآن الكريم، سورة البقرة، الآية 255' },
    virtue: { en: 'The greatest verse in the Qur’an; recited for protection, following the Sunnah.', ar: 'أعظم آية في القرآن الكريم، تُقرأ طلباً للحفظ اتباعاً للسنة.' },
    repeat: 1, seconds: 40,
  });

  var AL_IKHLAS = it({
    id: 'al-ikhlas', categories: ['morning', 'evening', 'sleep'],
    title: { en: 'Surah Al-Ikhlas', ar: 'سورة الإخلاص' },
    arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ ﴿١﴾ اللَّهُ الصَّمَدُ ﴿٢﴾ لَمْ يَلِدْ وَلَمْ يُولَدْ ﴿٣﴾ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ ﴿٤﴾',
    transliteration: 'Qul huwa Allahu ahad. Allahu-s-samad. Lam yalid wa lam yulad. Wa lam yakun lahu kufuwan ahad.',
    translation: { en: 'Say, "He is Allah, [who is] One, Allah, the Eternal Refuge. He neither begets nor is born, nor is there to Him any equivalent."',
      ar: 'سورة كاملة من القرآن الكريم، تُقرأ ثلاث مرات في أذكار الصباح والمساء.' },
    reference: { en: 'Qur’an 112:1-4', ar: 'القرآن الكريم، سورة الإخلاص' },
    virtue: { en: 'Recited three times, morning and evening.', ar: 'تُقرأ ثلاث مرات صباحاً ومساءً.' },
    repeat: 3, seconds: 24,
  });

  var AL_FALAQ = it({
    id: 'al-falaq', categories: ['morning', 'evening', 'sleep', 'protection'],
    title: { en: 'Surah Al-Falaq', ar: 'سورة الفلق' },
    arabic: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ﴿١﴾ مِنْ شَرِّ مَا خَلَقَ ﴿٢﴾ وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ ﴿٣﴾ وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ﴿٤﴾ وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ ﴿٥﴾',
    transliteration: 'Qul a’udhu bi-rabbil-falaq. Min sharri ma khalaq. Wa min sharri ghasiqin idha waqab. Wa min sharrin-naffathati fil-’uqad. Wa min sharri hasidin idha hasad.',
    translation: { en: 'Say, "I seek refuge in the Lord of daybreak, from the evil of that which He created, and from the evil of darkness when it settles, and from the evil of the blowers in knots, and from the evil of an envier when he envies."',
      ar: 'سورة كاملة من القرآن الكريم، تُقرأ ثلاث مرات في أذكار الصباح والمساء، ومن أعظم آيات الحماية.' },
    reference: { en: 'Qur’an 113:1-5', ar: 'القرآن الكريم، سورة الفلق' },
    virtue: { en: 'One of the Mu’awwidhatayn — recited three times for protection from all harm.', ar: 'من المعوذتين — تُقرأ ثلاث مرات طلباً للحماية من كل أذى.' },
    repeat: 3, seconds: 24,
  });

  var AN_NAS = it({
    id: 'an-nas', categories: ['morning', 'evening', 'sleep', 'protection'],
    title: { en: 'Surah An-Nas', ar: 'سورة الناس' },
    arabic: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ ﴿١﴾ مَلِكِ النَّاسِ ﴿٢﴾ إِلَٰهِ النَّاسِ ﴿٣﴾ مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ﴿٤﴾ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ﴿٥﴾ مِنَ الْجِنَّةِ وَالنَّاسِ ﴿٦﴾',
    transliteration: 'Qul a’udhu bi-rabbin-nas. Malikin-nas. Ilahin-nas. Min sharril-waswasil-khannas. Alladhi yuwaswisu fi sudurin-nas. Minal-jinnati wan-nas.',
    translation: { en: 'Say, "I seek refuge in the Lord of mankind, the Sovereign of mankind, the God of mankind, from the evil of the retreating whisperer who whispers [evil] into the breasts of mankind, from among the jinn and mankind."',
      ar: 'سورة كاملة من القرآن الكريم، تُقرأ ثلاث مرات في أذكار الصباح والمساء، وهي الحماية من وسوسة الشيطان.' },
    reference: { en: 'Qur’an 114:1-6', ar: 'القرآن الكريم، سورة الناس' },
    virtue: { en: 'The second of the Mu’awwidhatayn — protection from the whispers of Shayṭān, jinn and human alike.', ar: 'ثانية المعوذتين — الحماية من وسوسة الشيطان، من الجن والإنس.' },
    repeat: 3, seconds: 27,
  });

  var SAYYID_AL_ISTIGHFAR = it({
    id: 'sayyid-al-istighfar', categories: ['morning', 'evening', 'forgiveness'],
    title: { en: 'Sayyid al-Istighfar (Master of Seeking Forgiveness)', ar: 'سيد الاستغفار' },
    arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَىٰ عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
    transliteration: "Allahumma anta rabbi la ilaha illa ant, khalaqtani wa ana ‘abduka, wa ana ‘ala ‘ahdika wa wa‘dika mas-tata‘t...",
    translation: { en: 'O Allah, You are my Lord; there is no deity except You. You created me and I am Your servant, and I abide by Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your favour upon me, and I acknowledge my sin — so forgive me, for none forgives sins except You.',
      ar: 'أعظم صيغ الاستغفار، من قالها موقناً بها ومات من يومه أو ليلته دخل الجنة.' },
    reference: { en: 'Sahih al-Bukhari', ar: 'صحيح البخاري' },
    virtue: { en: 'Whoever says it during the day with certainty and dies that day before evening is among the people of Paradise (and the same for the night).', ar: 'من قالها من النهار موقناً بها فمات من يومه قبل أن يمسي فهو من أهل الجنة، ومن قالها من الليل وهو موقن بها فمات قبل أن يصبح فهو من أهل الجنة.' },
    repeat: 1, seconds: 22,
  });

  var HASBIYA_ALLAH = it({
    id: 'hasbiya-allah', categories: ['morning', 'evening', 'protection'],
    title: { en: 'Hasbiya Allah', ar: 'حسبي الله' },
    arabic: 'حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ، عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
    transliteration: 'Hasbiya Allahu la ilaha illa huwa, ‘alayhi tawakkaltu wa huwa rabbul-‘arshil-‘azim.',
    translation: { en: 'Allah is sufficient for me; there is no deity except Him. Upon Him I have relied, and He is the Lord of the Great Throne.',
      ar: 'تُقال سبع مرات، وقد وردت في القرآن الكريم بمعناها.' },
    reference: { en: 'Sunan Abi Dawud', ar: 'سنن أبي داود' },
    virtue: { en: 'Whoever says it seven times, morning and evening, Allah will suffice him against whatever concerns him.', ar: 'من قالها سبع مرات صباحاً ومساءً كفاه الله ما أهمّه.' },
    repeat: 7, seconds: 42,
  });

  var BISMILLAHIL_LADHI = it({
    id: 'bismillahil-ladhi', categories: ['morning', 'evening', 'protection'],
    title: { en: 'Bismillah — protection formula', ar: 'بسم الله الذي لا يضر' },
    arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    transliteration: "Bismillahil-ladhi la yadurru ma‘a ismihi shay’un fil-ardi wa la fis-sama’i wa huwas-Sami‘ul-‘Alim.",
    translation: { en: 'In the name of Allah, with whose name nothing on earth or in the heaven can cause harm, and He is the All-Hearing, the All-Knowing.',
      ar: 'تُقال ثلاث مرات، ومن قالها لم يُصبه شيء مفاجئ حتى يُمسي أو يُصبح.' },
    reference: { en: 'Sunan Abi Dawud; Sunan al-Tirmidhi', ar: 'سنن أبي داود، وسنن الترمذي' },
    virtue: { en: 'Whoever says it three times will not be harmed by anything sudden until the next period.', ar: 'من قالها ثلاث مرات لم يضرّه شيء مفاجئ.' },
    repeat: 3, seconds: 21,
  });

  var AFIYAH = it({
    id: 'afiyah', categories: ['morning', 'evening'],
    title: { en: 'Dua for Well-Being', ar: 'دعاء العافية' },
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي',
    transliteration: 'Allahumma inni as’aluka al-‘afwa wal-‘afiyata fid-dunya wal-akhirah...',
    translation: { en: 'O Allah, I ask You for pardon and well-being in this world and the next. O Allah, I ask You for pardon and well-being in my religion, my worldly affairs, my family, and my wealth.',
      ar: 'دعاء جامع يُقال في أذكار الصباح والمساء.' },
    reference: { en: 'Sunan Abi Dawud; Sunan Ibn Majah', ar: 'سنن أبي داود، وسنن ابن ماجه' },
    virtue: { en: 'A comprehensive supplication for well-being in this life and the next.', ar: 'دعاء جامع لخيري الدنيا والآخرة.' },
    repeat: 1, seconds: 20,
  });

  var RADHITU_BILLAH = it({
    id: 'radhitu-billah', categories: ['morning', 'evening'],
    title: { en: 'Radhitu Billahi Rabban', ar: 'رضيت بالله ربًا' },
    arabic: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا',
    transliteration: 'Radhitu billahi rabban, wa bil-islami dinan, wa bi-Muhammadin sallallahu ‘alayhi wa sallama nabiyya.',
    translation: { en: 'I am pleased with Allah as a Lord, Islam as a religion, and Muhammad ﷺ as a Prophet.', ar: 'تُقال ثلاث مرات صباحاً ومساءً.' },
    reference: { en: 'Sunan Abi Dawud; Sunan al-Tirmidhi', ar: 'سنن أبي داود والترمذي' },
    virtue: { en: 'Whoever says it three times morning and evening, Allah takes it upon Himself to please him on the Day of Resurrection.', ar: 'من قالها ثلاث مرات حين يصبح وحين يمسي كان حقاً على الله أن يرضيه يوم القيامة.' },
    repeat: 3, seconds: 21,
  });

  var TASBIH_100 = it({
    id: 'tasbih-100', categories: ['morning', 'evening'],
    title: { en: 'SubhanAllahi wa bihamdihi (100x)', ar: 'سبحان الله وبحمده' },
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ (×١٠٠)',
    transliteration: 'SubhanAllahi wa bihamdihi (×100)',
    translation: { en: 'Glory be to Allah and praise Him.', ar: 'تُقال مائة مرة.' },
    reference: { en: 'Sahih Muslim', ar: 'صحيح مسلم' },
    virtue: { en: 'Whoever says it 100 times in a day, his sins are wiped away even if they are like the foam of the sea.', ar: 'من قالها مائة مرة في يوم حُطّت خطاياه وإن كانت مثل زبد البحر.' },
    repeat: 100, seconds: 200,
  });

  var LA_ILAHA_10X = it({
    id: 'la-ilaha-10x', categories: ['morning', 'evening'],
    title: { en: 'La ilaha illallah (×10)', ar: 'لا إله إلا الله (×١٠)' },
    arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ (×١٠)',
    transliteration: 'La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu, wa huwa ‘ala kulli shay’in qadir (×10).',
    translation: { en: 'There is no deity except Allah alone, without partner. His is the dominion and His is the praise, and He is over all things omnipotent.', ar: 'تُقال عشر مرات صباحاً ومساءً — دون الزيادة الواردة بعد الصلاة.' },
    reference: { en: 'Sahih al-Bukhari & Sahih Muslim', ar: 'صحيح البخاري ومسلم' },
    virtue: { en: 'Said ten times morning and evening, equal in reward to freeing four souls from the descendants of Isma‘il, and a protection from Shayṭān that day.', ar: 'من قالها عشر مرات كانت له عدل رقبة من ولد إسماعيل، وكانت له حرساً من الشيطان حتى يمسي.' },
    repeat: 10, seconds: 60,
  });

  var ASBAHNA = it({
    id: 'asbahna', categories: ['morning'],
    title: { en: 'Asbahna wa Asbaha al-Mulku Lillah', ar: 'أصبحنا وأصبح الملك لله' },
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَٰذَا الْيَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَٰذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ',
    transliteration: "Asbahna wa asbaha al-mulku lillah, wal-hamdu lillah...",
    translation: { en: 'We have entered a new morning and with it all dominion belongs to Allah, and praise be to Allah. None has the right to be worshipped except Allah alone, without partner. To Him belongs the dominion and to Him is the praise, and He is over all things omnipotent. My Lord, I ask You for the good of this day and the good of what follows it, and I seek refuge in You from the evil of this day and the evil of what follows it. My Lord, I seek refuge in You from laziness and the evil of old age. My Lord, I seek refuge in You from punishment in the Fire and punishment in the grave.',
      ar: 'يُقال في أذكار الصباح فقط.' },
    reference: { en: 'Sahih Muslim', ar: 'صحيح مسلم' },
    virtue: { en: 'The morning declaration of Allah’s sole dominion, with a prayer for the day ahead.', ar: 'إعلان بالتوحيد وطلب خير اليوم ودفع شرّه.' },
    repeat: 1, seconds: 35,
  });

  var ALLAHUMMA_BIKA_ASBAHNA = it({
    id: 'allahumma-bika-asbahna', categories: ['morning'],
    title: { en: 'Allahumma Bika Asbahna', ar: 'اللهم بك أصبحنا' },
    arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ',
    transliteration: 'Allahumma bika asbahna, wa bika amsayna, wa bika nahya, wa bika namutu wa ilaykan-nushur.',
    translation: { en: 'O Allah, by You we enter the morning and by You we enter the evening, by You we live and by You we die, and to You is the resurrection.', ar: 'تُقال عند الصباح.' },
    reference: { en: 'Sunan al-Tirmidhi; Sunan Abi Dawud', ar: 'سنن الترمذي وأبي داود' },
    virtue: { en: 'A short, comprehensive declaration of dependence on Allah alone, said each morning.', ar: 'إعلانٌ موجز بالتوكل الكامل على الله، تُقال كل صباح.' },
    repeat: 1, seconds: 14,
  });

  var AMSAYNA = it({
    id: 'amsayna', categories: ['evening'],
    title: { en: 'Amsayna wa Amsa al-Mulku Lillah', ar: 'أمسينا وأمسى الملك لله' },
    arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَٰذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَٰذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ',
    transliteration: "Amsayna wa amsa al-mulku lillah, wal-hamdu lillah...",
    translation: { en: 'We have entered a new evening and with it all dominion belongs to Allah, and praise be to Allah. None has the right to be worshipped except Allah alone, without partner. To Him belongs the dominion and to Him is the praise, and He is over all things omnipotent. My Lord, I ask You for the good of this night and the good of what follows it, and I seek refuge in You from the evil of this night and the evil of what follows it. My Lord, I seek refuge in You from laziness and the evil of old age. My Lord, I seek refuge in You from punishment in the Fire and punishment in the grave.',
      ar: 'يُقال في أذكار المساء فقط.' },
    reference: { en: 'Sahih Muslim', ar: 'صحيح مسلم' },
    virtue: { en: 'The evening declaration of Allah’s sole dominion, with a prayer for the night ahead.', ar: 'إعلان بالتوحيد وطلب خير الليلة ودفع شرّها.' },
    repeat: 1, seconds: 35,
  });

  var ALLAHUMMA_BIKA_AMSAYNA = it({
    id: 'allahumma-bika-amsayna', categories: ['evening'],
    title: { en: 'Allahumma Bika Amsayna', ar: 'اللهم بك أمسينا' },
    arabic: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ',
    transliteration: 'Allahumma bika amsayna, wa bika asbahna, wa bika nahya, wa bika namutu wa ilaykal-masir.',
    translation: { en: 'O Allah, by You we enter the evening and by You we enter the morning, by You we live and by You we die, and to You is the final return.', ar: 'تُقال عند المساء.' },
    reference: { en: 'Sunan al-Tirmidhi', ar: 'سنن الترمذي' },
    virtue: { en: 'The evening counterpart to the morning declaration of dependence on Allah alone.', ar: 'نظير دعاء الصباح، تُقال كل مساء.' },
    repeat: 1, seconds: 14,
  });

  // --- After Each Prayer ---
  var ASTAGHFIRULLAH_3X = it({
    id: 'astaghfirullah-3x', categories: ['after-salah'],
    title: { en: 'Astaghfirullah', ar: 'أستغفر الله' },
    arabic: 'أَسْتَغْفِرُ اللَّهَ (×٣)',
    transliteration: 'Astaghfirullah (×3)',
    translation: { en: 'I seek the forgiveness of Allah.', ar: 'تُقال ثلاث مرات مباشرة بعد السلام من كل صلاة.' },
    reference: { en: 'Sahih Muslim', ar: 'صحيح مسلم' },
    virtue: { en: 'The first words said after the salam of every obligatory prayer.', ar: 'أول ما يُقال عقب السلام من كل صلاة مفروضة.' },
    repeat: 3, seconds: 9,
  });

  var ANTAS_SALAM = it({
    id: 'antas-salam', categories: ['after-salah'],
    title: { en: 'Allahumma Antas-Salam', ar: 'اللهم أنت السلام' },
    arabic: 'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
    transliteration: 'Allahumma antas-salamu wa minkas-salam, tabarakta ya dhal-jalali wal-ikram.',
    translation: { en: 'O Allah, You are Peace and from You comes peace. Blessed are You, O Owner of majesty and honour.', ar: 'تُقال بعد أذكار الاستغفار الثلاثة عقب الصلاة.' },
    reference: { en: 'Sahih Muslim', ar: 'صحيح مسلم' },
    virtue: { en: 'Said right after the three Astaghfirullah.', ar: 'تُقال مباشرة بعد الاستغفار الثلاثي.' },
    repeat: 1, seconds: 10,
  });

  var LA_ILAHA_MULK = it({
    id: 'la-ilaha-mulk', categories: ['after-salah'],
    title: { en: 'La ilaha illallah (Dominion)', ar: 'لا إله إلا الله وحده' },
    arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ وَلَا مُعْطِيَ لِمَا مَنَعْتَ وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ',
    transliteration: 'La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamd...',
    translation: { en: 'There is no deity except Allah alone, without partner. His is the dominion and His is the praise, and He is over all things omnipotent. O Allah, none can withhold what You give, and none can give what You withhold, and the might of the mighty person cannot benefit him against You.',
      ar: 'من أذكار ما بعد الصلاة الثابتة.' },
    reference: { en: 'Sahih al-Bukhari & Sahih Muslim', ar: 'صحيح البخاري ومسلم' },
    virtue: { en: 'A declaration of Allah’s sole dominion, said after each prayer.', ar: 'إعلانٌ بتوحيد الله في الملك، يُقال بعد كل صلاة.' },
    repeat: 1, seconds: 22,
  });

  var TASBIH_SUBHANALLAH = it({
    id: 'tasbih-subhanallah', categories: ['after-salah', 'sleep'],
    title: { en: 'SubhanAllah', ar: 'سبحان الله' },
    arabic: 'سُبْحَانَ اللَّهِ (×٣٣)',
    transliteration: 'SubhanAllah (×33)',
    translation: { en: 'Glory be to Allah.', ar: 'من تسبيح فاطمة رضي الله عنها، تُقال بعد الصلاة وقبل النوم.' },
    reference: { en: 'Sahih Muslim', ar: 'صحيح مسلم' },
    virtue: { en: 'Part of the tasbih the Prophet ﷺ taught Fatimah — 33 SubhanAllah, 33 Alhamdulillah, 34 Allahu Akbar.', ar: 'من التسبيح الذي علّمه النبي ﷺ لفاطمة رضي الله عنها.' },
    repeat: 33, seconds: 66,
  });

  var TASBIH_ALHAMDULILLAH = it({
    id: 'tasbih-alhamdulillah', categories: ['after-salah', 'sleep'],
    title: { en: 'Alhamdulillah', ar: 'الحمد لله' },
    arabic: 'الْحَمْدُ لِلَّهِ (×٣٣)',
    transliteration: 'Alhamdulillah (×33)',
    translation: { en: 'All praise is due to Allah.', ar: 'من تسبيح فاطمة رضي الله عنها.' },
    reference: { en: 'Sahih Muslim', ar: 'صحيح مسلم' },
    virtue: { en: 'The second third of Fatimah’s tasbih.', ar: 'الثلث الثاني من تسبيح فاطمة.' },
    repeat: 33, seconds: 66,
  });

  var TASBIH_ALLAHU_AKBAR = it({
    id: 'tasbih-allahu-akbar', categories: ['after-salah', 'sleep'],
    title: { en: 'Allahu Akbar', ar: 'الله أكبر' },
    arabic: 'اللَّهُ أَكْبَرُ (×٣٤)',
    transliteration: 'Allahu Akbar (×34)',
    translation: { en: 'Allah is the Greatest.', ar: 'من تسبيح فاطمة رضي الله عنها، تُتمّ به المائة.' },
    reference: { en: 'Sahih Muslim', ar: 'صحيح مسلم' },
    virtue: { en: 'Completes the 100 of Fatimah’s tasbih.', ar: 'يُتمّ به المائة من تسبيح فاطمة رضي الله عنها.' },
    repeat: 34, seconds: 68,
  });

  // --- Sleep ---
  var BISMIKA_AMUTU = it({
    id: 'bismika-amutu', categories: ['sleep'],
    title: { en: 'Bismika Allahumma Amutu wa Ahya', ar: 'باسمك اللهم أموت وأحيا' },
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: 'Bismika Allahumma amutu wa ahya.',
    translation: { en: 'In Your name, O Allah, I die and I live.', ar: 'تُقال عند الاضطجاع للنوم.' },
    reference: { en: 'Sahih al-Bukhari', ar: 'صحيح البخاري' },
    virtue: { en: 'The Prophet’s ﷺ own words on lying down to sleep.', ar: 'من قول النبي ﷺ عند اضطجاعه للنوم.' },
    repeat: 1, seconds: 8,
  });

  var QINI_ADHABAKA = it({
    id: 'qini-adhabaka', categories: ['sleep'],
    title: { en: 'Allahumma Qini ‘Adhabak', ar: 'اللهم قني عذابك' },
    arabic: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ',
    transliteration: 'Allahumma qini ‘adhabaka yawma tab‘athu ‘ibadak.',
    translation: { en: 'O Allah, protect me from Your punishment on the Day You resurrect Your servants.', ar: 'تُقال ثلاث مرات عند النوم.' },
    reference: { en: 'Sunan Abi Dawud; Sunan al-Tirmidhi', ar: 'سنن أبي داود والترمذي' },
    virtue: { en: 'Said three times before sleeping.', ar: 'تُقال ثلاث مرات قبل النوم.' },
    repeat: 3, seconds: 18,
  });

  // --- Waking ---
  var ALHAMDU_AHYANA = it({
    id: 'alhamdu-ahyana', categories: ['waking'],
    title: { en: 'Alhamdulillahil-ladhi Ahyana', ar: 'الحمد لله الذي أحيانا' },
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    transliteration: 'Alhamdulillahil-ladhi ahyana ba‘da ma amatana wa ilayhin-nushur.',
    translation: { en: 'All praise is due to Allah, who gave us life after having taken it from us, and unto Him is the resurrection.', ar: 'أول ما يُقال عند الاستيقاظ من النوم.' },
    reference: { en: 'Sahih al-Bukhari', ar: 'صحيح البخاري' },
    virtue: { en: 'The first words said upon waking.', ar: 'أول ما يُقال عند الاستيقاظ.' },
    repeat: 1, seconds: 12,
  });

  // --- Home ---
  var LEAVING_HOME = it({
    id: 'leaving-home', categories: ['home'],
    title: { en: 'Leaving the House', ar: 'الخروج من المنزل' },
    arabic: 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    transliteration: 'Bismillahi tawakkaltu ‘alallahi wa la hawla wa la quwwata illa billah.',
    translation: { en: 'In the name of Allah, I place my trust in Allah, and there is no might nor power except with Allah.', ar: 'تُقال عند الخروج من المنزل.' },
    reference: { en: 'Sunan Abi Dawud; Sunan al-Tirmidhi', ar: 'سنن أبي داود والترمذي' },
    virtue: { en: 'Said at the door on leaving; a hadith states the one who says it is guided, protected, and Shayṭān keeps away.', ar: 'من قالها كُفي وهُدي ووُقي، وتنحّى عنه الشيطان.' },
    repeat: 1, seconds: 12,
  });

  var ENTERING_HOME = it({
    id: 'entering-home', categories: ['home'],
    title: { en: 'Entering the House', ar: 'دخول المنزل' },
    arabic: 'بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا',
    transliteration: 'Bismillahi walajna, wa bismillahi kharajna, wa ‘alallahi rabbina tawakkalna.',
    translation: { en: 'In the name of Allah we enter, in the name of Allah we leave, and upon Allah our Lord we place our trust.', ar: 'تُقال عند الدخول، ثم يُسلَّم على أهل البيت.' },
    reference: { en: 'Sunan Abi Dawud', ar: 'سنن أبي داود' },
    virtue: { en: 'Said entering, followed by greeting those inside with salam.', ar: 'تُقال عند الدخول، ثم يُسلِّم على من في البيت.' },
    repeat: 1, seconds: 14,
  });

  // --- Mosque ---
  var ENTERING_MOSQUE = it({
    id: 'entering-mosque', categories: ['mosque'],
    title: { en: 'Entering the Mosque', ar: 'دخول المسجد' },
    arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
    transliteration: 'Allahummaf-tah li abwaba rahmatik.',
    translation: { en: 'O Allah, open the doors of Your mercy for me.', ar: 'تُقال عند دخول المسجد بالقدم اليمنى.' },
    reference: { en: 'Sahih Muslim', ar: 'صحيح مسلم' },
    virtue: { en: 'Said stepping in with the right foot.', ar: 'تُقال عند الدخول بالقدم اليمنى.' },
    repeat: 1, seconds: 10,
  });

  var LEAVING_MOSQUE = it({
    id: 'leaving-mosque', categories: ['mosque'],
    title: { en: 'Leaving the Mosque', ar: 'الخروج من المسجد' },
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ',
    transliteration: 'Allahumma inni as’aluka min fadlik.',
    translation: { en: 'O Allah, I ask You from Your bounty.', ar: 'تُقال عند الخروج بالقدم اليسرى.' },
    reference: { en: 'Sahih Muslim', ar: 'صحيح مسلم' },
    virtue: { en: 'Said stepping out with the left foot.', ar: 'تُقال عند الخروج بالقدم اليسرى.' },
    repeat: 1, seconds: 10,
  });

  // --- Travel ---
  var TRAVEL_DUA = it({
    id: 'travel-dua', categories: ['travel'],
    title: { en: 'Setting Out on a Journey', ar: 'دعاء السفر' },
    arabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَىٰ رَبِّنَا لَمُنْقَلِبُونَ',
    transliteration: 'Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila rabbina lamunqalibun.',
    translation: { en: 'Glory be to Him Who has subjected this to us, for we could never have accomplished this by ourselves. And to our Lord we shall return.', ar: 'تُقال عند ركوب وسيلة السفر.' },
    reference: { en: 'Qur’an 43:13-14; Sahih Muslim', ar: 'القرآن الكريم، سورة الزخرف، وصحيح مسلم' },
    virtue: { en: 'Said on boarding any means of travel.', ar: 'تُقال عند ركوب أي وسيلة سفر.' },
    repeat: 1, seconds: 16,
  });

  // --- Protection extra ---
  var AUDHU_KALIMATILLAH = it({
    id: 'audhu-kalimatillah', categories: ['protection', 'evening'],
    title: { en: 'A’udhu bi-Kalimatillah', ar: 'أعوذ بكلمات الله التامات' },
    arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
    transliteration: "A’udhu bikalimatillahit-tammati min sharri ma khalaq.",
    translation: { en: 'I seek refuge in the perfect words of Allah from the evil of what He has created.', ar: 'تُقال ثلاث مرات، خاصة في المساء.' },
    reference: { en: 'Sahih Muslim', ar: 'صحيح مسلم' },
    virtue: { en: 'A general protection formula, especially recommended in the evening.', ar: 'صيغة حماية عامة، يُستحب قولها في المساء خاصة.' },
    repeat: 3, seconds: 18,
  });

  // --- Distress & Anxiety ---
  var DHUN_NUN = it({
    id: 'dhun-nun', categories: ['distress'],
    title: { en: 'Dua of Dhun-Nun (Prophet Yunus ‘alayhis-salam)', ar: 'دعاء ذي النون' },
    arabic: 'لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
    transliteration: 'La ilaha illa anta subhanaka inni kuntu minaz-zalimin.',
    translation: { en: 'There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers.', ar: 'دعاء يونس عليه السلام في بطن الحوت.' },
    reference: { en: 'Qur’an 21:87', ar: 'القرآن الكريم، سورة الأنبياء، الآية 87' },
    virtue: { en: 'No Muslim ever supplicates with it for anything except that Allah answers him — as related in the hadith on this verse.', ar: 'لا يدعو بها مسلمٌ في شيء قط إلا استجاب الله له.' },
    repeat: 3, seconds: 15,
  });

  var HASBUNALLAH = it({
    id: 'hasbunallah', categories: ['distress'],
    title: { en: 'Hasbunallahu wa Ni‘mal Wakil', ar: 'حسبنا الله ونعم الوكيل' },
    arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
    transliteration: "Hasbunallahu wa ni‘mal wakil.",
    translation: { en: 'Allah is sufficient for us, and He is the best Disposer of affairs.', ar: 'قالها إبراهيم عليه السلام حين أُلقي في النار، وقالها الصحابة عند اجتماع الأعداء.' },
    reference: { en: 'Qur’an 3:173', ar: 'القرآن الكريم، سورة آل عمران، الآية 173' },
    virtue: { en: 'Said by Ibrahim ‘alayhis-salam when cast into the fire, and by the Companions facing an assembling enemy.', ar: 'قالها إبراهيم عليه السلام حين أُلقي في النار.' },
    repeat: 1, seconds: 10,
  });

  var LA_HAWLA = it({
    id: 'la-hawla', categories: ['distress', 'protection'],
    title: { en: 'La Hawla wa la Quwwata illa Billah', ar: 'لا حول ولا قوة إلا بالله' },
    arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    transliteration: 'La hawla wa la quwwata illa billah.',
    translation: { en: 'There is no power and no strength except with Allah.', ar: 'كنزٌ من كنوز الجنة.' },
    reference: { en: 'Sahih al-Bukhari & Sahih Muslim', ar: 'صحيح البخاري ومسلم' },
    virtue: { en: 'Described by the Prophet ﷺ as a treasure from the treasures of Paradise.', ar: 'وصفها النبي ﷺ بأنها كنزٌ من كنوز الجنة.' },
    repeat: 1, seconds: 8,
  });

  var HAMM_WAL_HAZAN = it({
    id: 'hamm-wal-hazan', categories: ['distress'],
    title: { en: 'Dua Against Anxiety and Grief', ar: 'دعاء الهم والحزن' },
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ',
    transliteration: 'Allahumma inni a‘udhu bika minal-hammi wal-hazan, wal-‘ajzi wal-kasal, wal-bukhli wal-jubn, wa dala‘id-dayni wa ghalabatir-rijal.',
    translation: { en: 'O Allah, I seek refuge in You from anxiety and grief, from incapacity and laziness, from cowardice and miserliness, from being overcome by debt and overpowered by men.', ar: 'من أدعية النبي ﷺ التي كان يكثر منها.' },
    reference: { en: 'Sahih al-Bukhari', ar: 'صحيح البخاري' },
    virtue: { en: 'A dua the Prophet ﷺ said often against exactly these eight afflictions.', ar: 'كان النبي ﷺ يتعوّذ بهذا الدعاء كثيراً.' },
    repeat: 1, seconds: 24,
  });

  var RAHMATAKA_ARJU = it({
    id: 'rahmataka-arju', categories: ['distress'],
    title: { en: 'Rahmataka Arju', ar: 'رحمتك أرجو' },
    arabic: 'اللَّهُمَّ رَحْمَتَكَ أَرْجُو فَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ، وَأَصْلِحْ لِي شَأْنِي كُلَّهُ، لَا إِلَٰهَ إِلَّا أَنْتَ',
    transliteration: 'Allahumma rahmataka arju, fala takilni ila nafsi tarfata ‘ayn, wa aslih li sha’ni kullah, la ilaha illa ant.',
    translation: { en: 'O Allah, it is Your mercy I hope for, so do not leave me to myself even for the blink of an eye, and set right all of my affairs. There is no deity except You.', ar: 'من أدعية الكرب الجامعة.' },
    reference: { en: 'Sunan Abi Dawud (graded ḥasan)', ar: 'سنن أبي داود' },
    virtue: { en: 'A comprehensive dua for reliance on Allah alone in every difficulty.', ar: 'دعاء جامع للتوكل على الله وحده في كل شدة.' },
    repeat: 1, seconds: 18,
  });

  // --- Forgiveness extra ---
  var RABBIGHFIRLI = it({
    id: 'rabbighfirli', categories: ['forgiveness'],
    title: { en: 'Rabbighfir li wa Tub ‘Alayya', ar: 'رب اغفر لي وتب علي' },
    arabic: 'رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ',
    transliteration: "Rabbigh-fir li wa tub ‘alayya innaka antat-Tawwabur-Rahim.",
    translation: { en: 'My Lord, forgive me and accept my repentance; indeed, You are the Accepter of repentance, the Merciful.', ar: 'كان النبي ﷺ يقولها في المجلس الواحد مائة مرة.' },
    reference: { en: 'Sunan Abi Dawud; Sunan al-Tirmidhi', ar: 'سنن أبي داود والترمذي' },
    virtue: { en: 'The Prophet ﷺ would say this one hundred times in a single gathering.', ar: 'كان النبي ﷺ يقولها في المجلس الواحد مائة مرة.' },
    repeat: 100, seconds: 300,
  });

  var ASTAGHFIRULLAH_ADHIM = it({
    id: 'astaghfirullah-adhim', categories: ['forgiveness'],
    title: { en: 'Astaghfirullah al-‘Adhim', ar: 'أستغفر الله العظيم' },
    arabic: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ',
    transliteration: "Astaghfirullah al-‘Adhima-lladhi la ilaha illa huwal-Hayyul-Qayyumu wa atubu ilayh.",
    translation: { en: 'I seek the forgiveness of Allah the Mighty, besides whom there is no deity, the Ever-Living, the Sustainer of existence, and I turn to Him in repentance.', ar: 'صيغة استغفار جامعة موسّعة.' },
    reference: { en: 'Sunan Abi Dawud; Sunan al-Tirmidhi (graded ḥasan)', ar: 'سنن أبي داود والترمذي' },
    virtue: { en: 'A fuller istighfar formula, said freely through the day.', ar: 'صيغة استغفار موسّعة، تُقال في أي وقت من اليوم.' },
    repeat: 3, seconds: 24,
  });

  // --- Salawat ---
  var SALAWAT_IBRAHIMIYYAH = it({
    id: 'salawat-ibrahimiyyah', categories: ['salawat'],
    title: { en: 'As-Salat al-Ibrahimiyyah', ar: 'الصلاة الإبراهيمية' },
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ',
    transliteration: 'Allahumma salli ‘ala Muhammadin wa ‘ala ali Muhammadin kama sallayta ‘ala Ibrahima...',
    translation: { en: 'O Allah, send blessings upon Muhammad and upon the family of Muhammad, as You sent blessings upon Ibrahim and the family of Ibrahim; indeed, You are Praiseworthy and Glorious. O Allah, send blessings upon Muhammad and upon the family of Muhammad, as You blessed Ibrahim and the family of Ibrahim; indeed, You are Praiseworthy and Glorious.',
      ar: 'الصيغة التي عُلِّمها الصحابة للصلاة على النبي ﷺ في التشهد، ويُستحب الإكثار منها خاصة يوم الجمعة.' },
    reference: { en: 'Sahih al-Bukhari & Sahih Muslim', ar: 'صحيح البخاري ومسلم' },
    virtue: { en: 'The form the Companions were taught for sending blessings on the Prophet ﷺ in the tashahhud — especially recommended in abundance on Fridays.', ar: 'يُستحب الإكثار من الصلاة على النبي ﷺ خاصة يوم الجمعة.' },
    repeat: 10, seconds: 150,
  });

  // --- Gratitude ---
  var HAMD_BAD_AKL = it({
    id: 'hamd-bad-akl', categories: ['gratitude'],
    title: { en: 'Praise After Eating', ar: 'الحمد بعد الطعام' },
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَٰذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ',
    transliteration: 'Alhamdu lillahil-ladhi at‘amani hadha wa razaqanihi min ghayri hawlin minni wa la quwwah.',
    translation: { en: 'All praise is due to Allah who fed me this and provided it for me without any might or power on my part.', ar: 'تُقال بعد الفراغ من الطعام.' },
    reference: { en: 'Sunan Abi Dawud; Sunan al-Tirmidhi (graded ḥasan ṣaḥīḥ)', ar: 'سنن أبي داود والترمذي' },
    virtue: { en: 'Whoever says this after eating, his past sins are forgiven.', ar: 'من قالها غُفر له ما تقدّم من ذنبه.' },
    repeat: 1, seconds: 12,
  });

  var AHABB_KALAM = it({
    id: 'ahabb-kalam', categories: ['gratitude'],
    title: { en: 'The Most Beloved Words to Allah', ar: 'أحب الكلام إلى الله' },
    arabic: 'سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَٰهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ',
    transliteration: 'SubhanAllah, wal-hamdu lillah, wa la ilaha illallah, wallahu akbar.',
    translation: { en: 'Glory be to Allah, praise be to Allah, there is no deity except Allah, and Allah is the Greatest.', ar: 'أحبّ الكلام إلى الله كما أخبر النبي ﷺ.' },
    reference: { en: 'Sahih Muslim', ar: 'صحيح مسلم' },
    virtue: { en: 'Named by the Prophet ﷺ as the most beloved speech to Allah.', ar: 'وصفها النبي ﷺ بأنها أحبّ الكلام إلى الله.' },
    repeat: 1, seconds: 12,
  });

  // --- Family ---
  var RABBI_IRHAMHUMA = it({
    id: 'rabbi-irhamhuma', categories: ['family'],
    title: { en: 'Dua for Parents', ar: 'دعاء الوالدين' },
    arabic: 'رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
    transliteration: 'Rabbi-rhamhuma kama rabbayani saghira.',
    translation: { en: 'My Lord, have mercy upon them as they raised me when I was small.', ar: 'دعاءٌ قرآني للوالدين.' },
    reference: { en: 'Qur’an 17:24', ar: 'القرآن الكريم، سورة الإسراء، الآية 24' },
    virtue: { en: 'The Qur’an’s own instruction for a child’s dua for their parents.', ar: 'الدعاء الذي أمر الله به الأبناء لوالديهم.' },
    repeat: 1, seconds: 10,
  });

  var QURRATA_AYUN = it({
    id: 'qurrata-ayun', categories: ['family'],
    title: { en: 'Dua for Righteous Family', ar: 'دعاء قرة الأعين' },
    arabic: 'رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا',
    transliteration: 'Rabbana hab lana min azwajina wa dhurriyyatina qurrata a‘yunin waj‘alna lil-muttaqina imama.',
    translation: { en: 'Our Lord, grant us from among our spouses and offspring comfort to our eyes, and make us leaders for the righteous.', ar: 'دعاء المتقين لذريتهم في القرآن الكريم.' },
    reference: { en: 'Qur’an 25:74', ar: 'القرآن الكريم، سورة الفرقان، الآية 74' },
    virtue: { en: 'The Qur’an’s description of the dua of the righteous for their families.', ar: 'من صفات عباد الرحمن كما وصفهم القرآن الكريم.' },
    repeat: 1, seconds: 14,
  });

  // --- Wudu ---
  var SHAHADA_AFTER_WUDU = it({
    id: 'shahada-after-wudu', categories: ['wudu'],
    title: { en: 'Testimony After Wuḍūʾ', ar: 'الشهادة بعد الوضوء' },
    arabic: 'أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
    transliteration: 'Ash-hadu an la ilaha illallahu wahdahu la sharika lah, wa ash-hadu anna Muhammadan ‘abduhu wa rasuluh.',
    translation: { en: 'I bear witness that there is no deity except Allah alone, without partner, and I bear witness that Muhammad is His servant and Messenger.', ar: 'تُقال عند الفراغ من الوضوء.' },
    reference: { en: 'Sahih Muslim', ar: 'صحيح مسلم' },
    virtue: { en: 'Whoever completes wuḍūʾ well and then says this, the eight gates of Paradise are opened for him, to enter through whichever he wishes.', ar: 'من قالها بعد إسباغ الوضوء فُتحت له أبواب الجنة الثمانية يدخل من أيها شاء.' },
    repeat: 1, seconds: 14,
  });

  // --- Seeking Knowledge ---
  var RABBI_ZIDNI_ILMA = it({
    id: 'rabbi-zidni-ilma', categories: ['knowledge'],
    title: { en: 'My Lord, Increase Me in Knowledge', ar: 'رب زدني علماً' },
    arabic: 'رَبِّ زِدْنِي عِلْمًا',
    transliteration: 'Rabbi zidni ‘ilma.',
    translation: { en: 'My Lord, increase me in knowledge.', ar: 'دعاء قرآني، أُمر به النبي ﷺ.' },
    reference: { en: 'Qur’an 20:114', ar: 'القرآن الكريم، سورة طه، الآية 114' },
    virtue: { en: 'The only supplication the Prophet ﷺ was directly commanded in the Qur’an to say for an increase — of knowledge.', ar: 'الدعاء الوحيد الذي أُمر النبي ﷺ صراحة في القرآن أن يطلب فيه المزيد، وهو العلم.' },
    repeat: 1, seconds: 6,
  });

  // --- Sustenance & Barakah ---
  var BARIK_LANA_RIZQ = it({
    id: 'barik-lana-rizq', categories: ['rizq'],
    title: { en: 'Blessing in Provision', ar: 'اللهم بارك لنا فيما رزقتنا' },
    arabic: 'اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ',
    transliteration: 'Allahumma barik lana fima razaqtana wa qina ‘adhaban-nar.',
    translation: { en: 'O Allah, bless for us what You have provided us, and protect us from the punishment of the Fire.', ar: 'تُقال قبل الطعام أو عند طلب البركة في الرزق.' },
    reference: { en: 'Widely narrated table-dua; cited in Ibn as-Sunni’s ‘Amal al-Yawm wal-Laylah', ar: 'ذكره ابن السني في عمل اليوم والليلة' },
    virtue: { en: 'A short, comprehensive request for blessing in what has been provided.', ar: 'طلب موجز جامع للبركة فيما رُزق.' },
    repeat: 1, seconds: 10,
  });

  // --- Ramadan ---
  var ALLAHUMMA_INNAKA_AFUWWUN = it({
    id: 'allahumma-innaka-afuwwun', categories: ['ramadan'],
    title: { en: 'Laylat al-Qadr Dua', ar: 'دعاء ليلة القدر' },
    arabic: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي',
    transliteration: 'Allahumma innaka ‘afuwwun tuhibbul-‘afwa fa‘fu ‘anni.',
    translation: { en: 'O Allah, You are Pardoning and You love to pardon, so pardon me.', ar: 'علّمها النبي ﷺ لعائشة رضي الله عنها لتقولها إن وافقت ليلة القدر.' },
    reference: { en: 'Sunan al-Tirmidhi; Sunan Ibn Majah (graded ḥasan ṣaḥīḥ)', ar: 'سنن الترمذي وابن ماجه' },
    virtue: { en: 'Taught by the Prophet ﷺ to ‘A’ishah as what to say if she found Laylat al-Qadr.', ar: 'علّمه النبي ﷺ لعائشة رضي الله عنها لتقوله إن أدركت ليلة القدر.' },
    repeat: 1, seconds: 12,
  });

  // --- Ruqyah ---
  var ADHHIB_AL_BAS = it({
    id: 'adhhib-al-bas', categories: ['ruqyah'],
    title: { en: 'Ruqyah for the Sick', ar: 'رقية المريض' },
    arabic: 'أَذْهِبِ الْبَأْسَ رَبَّ النَّاسِ، اشْفِ أَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ، شِفَاءً لَا يُغَادِرُ سَقَمًا',
    transliteration: 'Adhhibil-ba’sa Rabban-nas, ishfi Antash-Shafi, la shifa’a illa shifa’uk, shifa’an la yughadiru saqama.',
    translation: { en: 'Remove the harm, Lord of mankind, and heal — You are the Healer. There is no healing except Your healing, a healing that leaves no illness behind.', ar: 'كان النبي ﷺ يقولها إذا عاد مريضاً، يمسح بيده اليمنى.' },
    reference: { en: 'Sahih al-Bukhari & Sahih Muslim', ar: 'صحيح البخاري ومسلم' },
    virtue: { en: 'The Prophet’s ﷺ own ruqyah when visiting the sick, said while wiping with the right hand.', ar: 'من رقية النبي ﷺ للمريض، مع المسح باليد اليمنى.' },
    repeat: 1, seconds: 16,
  });

  // --- Travel (return) ---
  var AYIBUNA_TAIBUN = it({
    id: 'ayibuna-taibun', categories: ['travel'],
    title: { en: 'Returning from a Journey', ar: 'دعاء الرجوع من السفر' },
    arabic: 'آيِبُونَ تَائِبُونَ عَابِدُونَ لِرَبِّنَا حَامِدُونَ',
    transliteration: 'Ayibuna ta’ibuna ‘abiduna li-Rabbina hamidun.',
    translation: { en: 'We return, repenting, worshipping, and praising our Lord.', ar: 'كان النبي ﷺ يقولها عند القفول من السفر.' },
    reference: { en: 'Sahih al-Bukhari & Sahih Muslim', ar: 'صحيح البخاري ومسلم' },
    virtue: { en: 'Said by the Prophet ﷺ specifically on the way back, distinct from the outbound travel dua.', ar: 'يُقال عند الرجوع، وهو غير دعاء الذهاب.' },
    repeat: 1, seconds: 10,
  });

  var ITEMS = [
    AYAT_AL_KURSI, AL_IKHLAS, AL_FALAQ, AN_NAS, SAYYID_AL_ISTIGHFAR, HASBIYA_ALLAH, BISMILLAHIL_LADHI, AFIYAH,
    RADHITU_BILLAH, TASBIH_100, LA_ILAHA_10X,
    ASBAHNA, ALLAHUMMA_BIKA_ASBAHNA, AMSAYNA, ALLAHUMMA_BIKA_AMSAYNA,
    ASTAGHFIRULLAH_3X, ANTAS_SALAM, LA_ILAHA_MULK, TASBIH_SUBHANALLAH, TASBIH_ALHAMDULILLAH, TASBIH_ALLAHU_AKBAR,
    BISMIKA_AMUTU, QINI_ADHABAKA,
    ALHAMDU_AHYANA,
    LEAVING_HOME, ENTERING_HOME,
    ENTERING_MOSQUE, LEAVING_MOSQUE,
    TRAVEL_DUA,
    AUDHU_KALIMATILLAH,
    DHUN_NUN, HASBUNALLAH, LA_HAWLA, HAMM_WAL_HAZAN, RAHMATAKA_ARJU,
    RABBIGHFIRLI, ASTAGHFIRULLAH_ADHIM,
    SALAWAT_IBRAHIMIYYAH,
    HAMD_BAD_AKL, AHABB_KALAM,
    RABBI_IRHAMHUMA, QURRATA_AYUN,
    SHAHADA_AFTER_WUDU, RABBI_ZIDNI_ILMA, BARIK_LANA_RIZQ, ALLAHUMMA_INNAKA_AFUWWUN, ADHHIB_AL_BAS, AYIBUNA_TAIBUN,
  ];

  function itemsByCategory(catId) {
    // Short adhkar first, longer-count ones later — makes a session feel
    // achievable from the first tap rather than opening on the longest item.
    return ITEMS.filter(function (i) { return i.categories.indexOf(catId) !== -1; })
      .sort(function (a, b) { return a.seconds - b.seconds; });
  }

  function categoryTotalSeconds(catId) {
    return itemsByCategory(catId).reduce(function (sum, i) { return sum + i.seconds; }, 0);
  }

  global.SHRS_ADHKAR = {
    categories: CATEGORIES,
    items: ITEMS,
    itemsByCategory: itemsByCategory,
    categoryTotalSeconds: categoryTotalSeconds,
    // Back-compat for existing consumers (homepage teaser, Personalisation
    // widget) built against the earlier {morning:[...], evening:[...]} shape.
    morning: itemsByCategory('morning'),
    evening: itemsByCategory('evening'),
  };
})(typeof window !== 'undefined' ? window : this);
