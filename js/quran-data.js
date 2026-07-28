// SHRS Digital Qur'an Centre — verse data.
//
// IMPORTANT — PROVENANCE AND VERIFICATION STATUS:
// This Arabic text and its English rendering were transcribed by an AI
// model (Claude) from its training data, NOT fetched from a licensed
// source such as Tanzil.net — this working environment has no outbound
// network access to Qur'an text/audio APIs (confirmed by testing; see
// docs/shrs-intelligent-campus-roadmap.md). The school's own team has
// explicitly asked for this best-effort transcription and has taken on
// responsibility for verifying it against a printed Mushaf or the Tanzil
// text before treating it as authoritative. Every surah is marked
// `verified: false` below — flip it to `true` only after that check.
// Until then, the reader UI shows a prominent "pending verification"
// notice and this is NOT to be presented anywhere as a certified Mushaf.
//
// Scope: Al-Fatihah (the essential opening surah) plus Surahs 93-114 —
// the last block of the Qur'an, the portion most commonly memorized
// first and recited daily in prayer. This is a deliberate scope
// boundary, not the full 604-page Mushaf — see the Qur'an Centre page
// for why, and js/reflections-data.js / the Personalisation Centre for
// this codebase's parallel, narrower Verse-of-the-Day feature.
(function () {
  var SURAHS = [
    {
      number: 1, nameArabic: 'الفاتحة', nameTransliteration: 'Al-Fatihah', nameTranslation: 'The Opening',
      revelationType: 'Meccan', verified: false,
      verses: [
        { n: 1, ar: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', en: 'In the name of Allah, the Most Gracious, the Most Merciful.' },
        { n: 2, ar: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', en: 'All praise is due to Allah, Lord of all the worlds.' },
        { n: 3, ar: 'الرَّحْمَٰنِ الرَّحِيمِ', en: 'The Most Gracious, the Most Merciful.' },
        { n: 4, ar: 'مَالِكِ يَوْمِ الدِّينِ', en: 'Master of the Day of Judgment.' },
        { n: 5, ar: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', en: 'You alone we worship, and You alone we ask for help.' },
        { n: 6, ar: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', en: 'Guide us to the straight path.' },
        { n: 7, ar: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ', en: 'The path of those You have blessed, not of those who have earned Your anger, nor of those who have gone astray.' },
      ],
    },
    {
      number: 93, nameArabic: 'الضحى', nameTransliteration: 'Ad-Duha', nameTranslation: 'The Morning Brightness',
      revelationType: 'Meccan', verified: false,
      verses: [
        { n: 1, ar: 'وَالضُّحَىٰ', en: 'By the morning brightness,' },
        { n: 2, ar: 'وَاللَّيْلِ إِذَا سَجَىٰ', en: 'And by the night when it grows still,' },
        { n: 3, ar: 'مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ', en: 'Your Lord has not forsaken you, nor does He dislike you.' },
        { n: 4, ar: 'وَلَلْآخِرَةُ خَيْرٌ لَكَ مِنَ الْأُولَىٰ', en: 'And the Hereafter is surely better for you than this present life.' },
        { n: 5, ar: 'وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ', en: 'And your Lord will surely give you, and you will be satisfied.' },
        { n: 6, ar: 'أَلَمْ يَجِدْكَ يَتِيمًا فَآوَىٰ', en: 'Did He not find you an orphan and give you shelter?' },
        { n: 7, ar: 'وَوَجَدَكَ ضَالًّا فَهَدَىٰ', en: 'And find you lost and guide you?' },
        { n: 8, ar: 'وَوَجَدَكَ عَائِلًا فَأَغْنَىٰ', en: 'And find you in need and make you self-sufficient?' },
        { n: 9, ar: 'فَأَمَّا الْيَتِيمَ فَلَا تَقْهَرْ', en: 'So as for the orphan, do not oppress him.' },
        { n: 10, ar: 'وَأَمَّا السَّائِلَ فَلَا تَنْهَرْ', en: 'And as for the one who asks, do not turn him away.' },
        { n: 11, ar: 'وَأَمَّا بِنِعْمَةِ رَبِّكَ فَحَدِّثْ', en: 'And as for the blessing of your Lord, speak of it.' },
      ],
    },
    {
      number: 94, nameArabic: 'الشرح', nameTransliteration: 'Ash-Sharh', nameTranslation: 'The Relief',
      revelationType: 'Meccan', verified: false,
      verses: [
        { n: 1, ar: 'أَلَمْ نَشْرَحْ لَكَ صَدْرَكَ', en: 'Did We not expand your chest for you?' },
        { n: 2, ar: 'وَوَضَعْنَا عَنْكَ وِزْرَكَ', en: 'And We removed from you your burden,' },
        { n: 3, ar: 'الَّذِي أَنْقَضَ ظَهْرَكَ', en: 'Which had weighed upon your back,' },
        { n: 4, ar: 'وَرَفَعْنَا لَكَ ذِكْرَكَ', en: 'And We raised for you your renown.' },
        { n: 5, ar: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', en: 'So indeed, with hardship comes ease.' },
        { n: 6, ar: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا', en: 'Indeed, with hardship comes ease.' },
        { n: 7, ar: 'فَإِذَا فَرَغْتَ فَانْصَبْ', en: 'So when you have finished your task, strive on,' },
        { n: 8, ar: 'وَإِلَىٰ رَبِّكَ فَارْغَبْ', en: 'And to your Lord turn your attention.' },
      ],
    },
    {
      number: 95, nameArabic: 'التين', nameTransliteration: 'At-Tin', nameTranslation: 'The Fig',
      revelationType: 'Meccan', verified: false,
      verses: [
        { n: 1, ar: 'وَالتِّينِ وَالزَّيْتُونِ', en: 'By the fig and the olive,' },
        { n: 2, ar: 'وَطُورِ سِينِينَ', en: 'And Mount Sinai,' },
        { n: 3, ar: 'وَهَٰذَا الْبَلَدِ الْأَمِينِ', en: 'And this secure city,' },
        { n: 4, ar: 'لَقَدْ خَلَقْنَا الْإِنْسَانَ فِي أَحْسَنِ تَقْوِيمٍ', en: 'We have certainly created man in the best of forms.' },
        { n: 5, ar: 'ثُمَّ رَدَدْنَاهُ أَسْفَلَ سَافِلِينَ', en: 'Then We reduced him to the lowest of the low,' },
        { n: 6, ar: 'إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ فَلَهُمْ أَجْرٌ غَيْرُ مَمْنُونٍ', en: 'Except those who believe and do righteous deeds — for them is a reward without end.' },
        { n: 7, ar: 'فَمَا يُكَذِّبُكَ بَعْدُ بِالدِّينِ', en: 'So what, after this, causes you to deny the Judgment?' },
        { n: 8, ar: 'أَلَيْسَ اللَّهُ بِأَحْكَمِ الْحَاكِمِينَ', en: 'Is not Allah the most just of judges?' },
      ],
    },
    {
      number: 96, nameArabic: 'العلق', nameTransliteration: "Al-'Alaq", nameTranslation: 'The Clot',
      revelationType: 'Meccan', verified: false,
      verses: [
        { n: 1, ar: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ', en: 'Read in the name of your Lord who created —' },
        { n: 2, ar: 'خَلَقَ الْإِنْسَانَ مِنْ عَلَقٍ', en: 'Created man from a clinging clot.' },
        { n: 3, ar: 'اقْرَأْ وَرَبُّكَ الْأَكْرَمُ', en: 'Read, and your Lord is the Most Generous —' },
        { n: 4, ar: 'الَّذِي عَلَّمَ بِالْقَلَمِ', en: 'Who taught by the pen —' },
        { n: 5, ar: 'عَلَّمَ الْإِنْسَانَ مَا لَمْ يَعْلَمْ', en: 'Taught man that which he knew not.' },
        { n: 6, ar: 'كَلَّا إِنَّ الْإِنْسَانَ لَيَطْغَىٰ', en: 'No! Indeed, man transgresses,' },
        { n: 7, ar: 'أَنْ رَآهُ اسْتَغْنَىٰ', en: 'Because he sees himself self-sufficient.' },
        { n: 8, ar: 'إِنَّ إِلَىٰ رَبِّكَ الرُّجْعَىٰ', en: 'Indeed, to your Lord is the return.' },
        { n: 9, ar: 'أَرَأَيْتَ الَّذِي يَنْهَىٰ', en: 'Have you seen the one who forbids' },
        { n: 10, ar: 'عَبْدًا إِذَا صَلَّىٰ', en: 'A servant when he prays?' },
        { n: 11, ar: 'أَرَأَيْتَ إِنْ كَانَ عَلَى الْهُدَىٰ', en: 'Have you seen if he is upon guidance,' },
        { n: 12, ar: 'أَوْ أَمَرَ بِالتَّقْوَىٰ', en: 'Or enjoins righteousness?' },
        { n: 13, ar: 'أَرَأَيْتَ إِنْ كَذَّبَ وَتَوَلَّىٰ', en: 'Have you seen if he denies and turns away?' },
        { n: 14, ar: 'أَلَمْ يَعْلَمْ بِأَنَّ اللَّهَ يَرَىٰ', en: 'Does he not know that Allah sees?' },
        { n: 15, ar: 'كَلَّا لَئِنْ لَمْ يَنْتَهِ لَنَسْفَعًا بِالنَّاصِيَةِ', en: 'No! If he does not desist, We will surely drag him by the forelock —' },
        { n: 16, ar: 'نَاصِيَةٍ كَاذِبَةٍ خَاطِئَةٍ', en: 'A lying, sinful forelock.' },
        { n: 17, ar: 'فَلْيَدْعُ نَادِيَهُ', en: 'Then let him call his associates;' },
        { n: 18, ar: 'سَنَدْعُ الزَّبَانِيَةَ', en: 'We will call the angels of punishment.' },
        { n: 19, ar: 'كَلَّا لَا تُطِعْهُ وَاسْجُدْ وَاقْتَرِبْ', en: 'No! Do not obey him. Prostrate and draw near.' },
      ],
    },
    {
      number: 97, nameArabic: 'القدر', nameTransliteration: 'Al-Qadr', nameTranslation: 'The Decree',
      revelationType: 'Meccan', verified: false,
      verses: [
        { n: 1, ar: 'إِنَّا أَنْزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ', en: 'Indeed, We sent it (the Qur’an) down in the Night of Decree.' },
        { n: 2, ar: 'وَمَا أَدْرَاكَ مَا لَيْلَةُ الْقَدْرِ', en: 'And what can make you know what the Night of Decree is?' },
        { n: 3, ar: 'لَيْلَةُ الْقَدْرِ خَيْرٌ مِنْ أَلْفِ شَهْرٍ', en: 'The Night of Decree is better than a thousand months.' },
        { n: 4, ar: 'تَنَزَّلُ الْمَلَائِكَةُ وَالرُّوحُ فِيهَا بِإِذْنِ رَبِّهِمْ مِنْ كُلِّ أَمْرٍ', en: 'The angels and the Spirit descend therein by the permission of their Lord for every matter.' },
        { n: 5, ar: 'سَلَامٌ هِيَ حَتَّىٰ مَطْلَعِ الْفَجْرِ', en: 'Peace it is until the emergence of dawn.' },
      ],
    },
    {
      number: 98, nameArabic: 'البينة', nameTransliteration: 'Al-Bayyinah', nameTranslation: 'The Clear Proof',
      revelationType: 'Medinan', verified: false,
      verses: [
        { n: 1, ar: 'لَمْ يَكُنِ الَّذِينَ كَفَرُوا مِنْ أَهْلِ الْكِتَابِ وَالْمُشْرِكِينَ مُنْفَكِّينَ حَتَّىٰ تَأْتِيَهُمُ الْبَيِّنَةُ', en: 'Those who disbelieved among the People of the Scripture and the polytheists were not to be parted from disbelief until there came to them clear evidence.' },
        { n: 2, ar: 'رَسُولٌ مِنَ اللَّهِ يَتْلُو صُحُفًا مُطَهَّرَةً', en: 'A Messenger from Allah reciting purified scriptures,' },
        { n: 3, ar: 'فِيهَا كُتُبٌ قَيِّمَةٌ', en: 'Within which are correct writings.' },
        { n: 4, ar: 'وَمَا تَفَرَّقَ الَّذِينَ أُوتُوا الْكِتَابَ إِلَّا مِنْ بَعْدِ مَا جَاءَتْهُمُ الْبَيِّنَةُ', en: 'Nor did those who were given the Scripture become divided until after clear evidence had come to them.' },
        { n: 5, ar: 'وَمَا أُمِرُوا إِلَّا لِيَعْبُدُوا اللَّهَ مُخْلِصِينَ لَهُ الدِّينَ حُنَفَاءَ وَيُقِيمُوا الصَّلَاةَ وَيُؤْتُوا الزَّكَاةَ وَذَٰلِكَ دِينُ الْقَيِّمَةِ', en: 'They were commanded only to worship Allah, sincere to Him in religion, inclining to truth, and to establish prayer and give zakah — that is the correct religion.' },
        { n: 6, ar: 'إِنَّ الَّذِينَ كَفَرُوا مِنْ أَهْلِ الْكِتَابِ وَالْمُشْرِكِينَ فِي نَارِ جَهَنَّمَ خَالِدِينَ فِيهَا أُولَٰئِكَ هُمْ شَرُّ الْبَرِيَّةِ', en: 'Indeed, those who disbelieved among the People of the Scripture and the polytheists will be in the fire of Hell, abiding eternally therein — they are the worst of creatures.' },
        { n: 7, ar: 'إِنَّ الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ أُولَٰئِكَ هُمْ خَيْرُ الْبَرِيَّةِ', en: 'Indeed, those who believe and do righteous deeds — they are the best of creatures.' },
        { n: 8, ar: 'جَزَاؤُهُمْ عِنْدَ رَبِّهِمْ جَنَّاتُ عَدْنٍ تَجْرِي مِنْ تَحْتِهَا الْأَنْهَارُ خَالِدِينَ فِيهَا أَبَدًا رَضِيَ اللَّهُ عَنْهُمْ وَرَضُوا عَنْهُ ذَٰلِكَ لِمَنْ خَشِيَ رَبَّهُ', en: 'Their reward with their Lord is gardens of perpetual residence beneath which rivers flow, abiding therein forever — Allah is pleased with them and they are pleased with Him. That is for whoever has feared his Lord.' },
      ],
    },
    {
      number: 99, nameArabic: 'الزلزلة', nameTransliteration: 'Az-Zalzalah', nameTranslation: 'The Earthquake',
      revelationType: 'Medinan', verified: false,
      verses: [
        { n: 1, ar: 'إِذَا زُلْزِلَتِ الْأَرْضُ زِلْزَالَهَا', en: 'When the earth is shaken with its final earthquake,' },
        { n: 2, ar: 'وَأَخْرَجَتِ الْأَرْضُ أَثْقَالَهَا', en: 'And the earth discharges its burdens,' },
        { n: 3, ar: 'وَقَالَ الْإِنْسَانُ مَا لَهَا', en: 'And man says, "What is wrong with it?" —' },
        { n: 4, ar: 'يَوْمَئِذٍ تُحَدِّثُ أَخْبَارَهَا', en: 'That Day, it will report its news,' },
        { n: 5, ar: 'بِأَنَّ رَبَّكَ أَوْحَىٰ لَهَا', en: 'Because your Lord has commanded it.' },
        { n: 6, ar: 'يَوْمَئِذٍ يَصْدُرُ النَّاسُ أَشْتَاتًا لِيُرَوْا أَعْمَالَهُمْ', en: 'That Day, people will emerge in scattered groups to be shown their deeds.' },
        { n: 7, ar: 'فَمَنْ يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ', en: "So whoever does an atom's weight of good will see it," },
        { n: 8, ar: 'وَمَنْ يَعْمَلْ مِثْقَالَ ذَرَّةٍ شَرًّا يَرَهُ', en: "And whoever does an atom's weight of evil will see it." },
      ],
    },
    {
      number: 100, nameArabic: 'العاديات', nameTransliteration: "Al-'Adiyat", nameTranslation: 'The Racers',
      revelationType: 'Meccan', verified: false,
      verses: [
        { n: 1, ar: 'وَالْعَادِيَاتِ ضَبْحًا', en: 'By the racers, panting,' },
        { n: 2, ar: 'فَالْمُورِيَاتِ قَدْحًا', en: 'And the strikers of sparks,' },
        { n: 3, ar: 'فَالْمُغِيرَاتِ صُبْحًا', en: 'And the chargers at dawn,' },
        { n: 4, ar: 'فَأَثَرْنَ بِهِ نَقْعًا', en: 'Stirring up dust thereby,' },
        { n: 5, ar: 'فَوَسَطْنَ بِهِ جَمْعًا', en: 'Arriving thereby in the center of a company —' },
        { n: 6, ar: 'إِنَّ الْإِنْسَانَ لِرَبِّهِ لَكَنُودٌ', en: 'Indeed mankind, to his Lord, is ungrateful.' },
        { n: 7, ar: 'وَإِنَّهُ عَلَىٰ ذَٰلِكَ لَشَهِيدٌ', en: 'And indeed, he is a witness to that.' },
        { n: 8, ar: 'وَإِنَّهُ لِحُبِّ الْخَيْرِ لَشَدِيدٌ', en: 'And indeed he is, in love of wealth, intense.' },
        { n: 9, ar: 'أَفَلَا يَعْلَمُ إِذَا بُعْثِرَ مَا فِي الْقُبُورِ', en: 'Does he not know that when the contents of the graves are scattered' },
        { n: 10, ar: 'وَحُصِّلَ مَا فِي الصُّدُورِ', en: 'And that within the breasts is made apparent —' },
        { n: 11, ar: 'إِنَّ رَبَّهُمْ بِهِمْ يَوْمَئِذٍ لَخَبِيرٌ', en: 'Indeed, their Lord, that Day, is fully aware of them.' },
      ],
    },
    {
      number: 101, nameArabic: 'القارعة', nameTransliteration: "Al-Qari'ah", nameTranslation: 'The Striking Calamity',
      revelationType: 'Meccan', verified: false,
      verses: [
        { n: 1, ar: 'الْقَارِعَةُ', en: 'The Striking Calamity —' },
        { n: 2, ar: 'مَا الْقَارِعَةُ', en: 'What is the Striking Calamity?' },
        { n: 3, ar: 'وَمَا أَدْرَاكَ مَا الْقَارِعَةُ', en: 'And what can make you know what the Striking Calamity is?' },
        { n: 4, ar: 'يَوْمَ يَكُونُ النَّاسُ كَالْفَرَاشِ الْمَبْثُوثِ', en: 'It is the Day when people will be like moths, scattered,' },
        { n: 5, ar: 'وَتَكُونُ الْجِبَالُ كَالْعِهْنِ الْمَنْفُوشِ', en: 'And the mountains will be like wool, carded.' },
        { n: 6, ar: 'فَأَمَّا مَنْ ثَقُلَتْ مَوَازِينُهُ', en: 'Then as for one whose scales are heavy with good deeds,' },
        { n: 7, ar: 'فَهُوَ فِي عِيشَةٍ رَاضِيَةٍ', en: 'He will be in a pleasant life.' },
        { n: 8, ar: 'وَأَمَّا مَنْ خَفَّتْ مَوَازِينُهُ', en: 'But as for one whose scales are light,' },
        { n: 9, ar: 'فَأُمُّهُ هَاوِيَةٌ', en: 'His refuge will be an abyss.' },
        { n: 10, ar: 'وَمَا أَدْرَاكَ مَا هِيَهْ', en: 'And what can make you know what that is?' },
        { n: 11, ar: 'نَارٌ حَامِيَةٌ', en: 'It is a Fire, intensely hot.' },
      ],
    },
    {
      number: 102, nameArabic: 'التكاثر', nameTransliteration: 'At-Takathur', nameTranslation: 'Competition in Increase',
      revelationType: 'Meccan', verified: false,
      verses: [
        { n: 1, ar: 'أَلْهَاكُمُ التَّكَاثُرُ', en: 'Competition in worldly increase diverts you,' },
        { n: 2, ar: 'حَتَّىٰ زُرْتُمُ الْمَقَابِرَ', en: 'Until you visit the graveyards.' },
        { n: 3, ar: 'كَلَّا سَوْفَ تَعْلَمُونَ', en: 'No! You are going to know.' },
        { n: 4, ar: 'ثُمَّ كَلَّا سَوْفَ تَعْلَمُونَ', en: 'Then, no! You are going to know.' },
        { n: 5, ar: 'كَلَّا لَوْ تَعْلَمُونَ عِلْمَ الْيَقِينِ', en: 'No! If you only knew with certain knowledge...' },
        { n: 6, ar: 'لَتَرَوُنَّ الْجَحِيمَ', en: 'You will surely see the Hellfire.' },
        { n: 7, ar: 'ثُمَّ لَتَرَوُنَّهَا عَيْنَ الْيَقِينِ', en: 'Then you will surely see it with the eye of certainty.' },
        { n: 8, ar: 'ثُمَّ لَتُسْأَلُنَّ يَوْمَئِذٍ عَنِ النَّعِيمِ', en: 'Then you will surely be asked that Day about the pleasures you enjoyed.' },
      ],
    },
    {
      number: 103, nameArabic: 'العصر', nameTransliteration: "Al-'Asr", nameTranslation: 'Time',
      revelationType: 'Meccan', verified: false,
      verses: [
        { n: 1, ar: 'وَالْعَصْرِ', en: 'By Time,' },
        { n: 2, ar: 'إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ', en: 'Indeed, mankind is in loss,' },
        { n: 3, ar: 'إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ', en: 'Except for those who believe, do righteous deeds, and advise one another to truth and advise one another to patience.' },
      ],
    },
    {
      number: 104, nameArabic: 'الهمزة', nameTransliteration: 'Al-Humazah', nameTranslation: 'The Scorner',
      revelationType: 'Meccan', verified: false,
      verses: [
        { n: 1, ar: 'وَيْلٌ لِكُلِّ هُمَزَةٍ لُمَزَةٍ', en: 'Woe to every scorner and mocker,' },
        { n: 2, ar: 'الَّذِي جَمَعَ مَالًا وَعَدَّدَهُ', en: 'Who collects wealth and counts it,' },
        { n: 3, ar: 'يَحْسَبُ أَنَّ مَالَهُ أَخْلَدَهُ', en: 'Thinking that his wealth will make him immortal.' },
        { n: 4, ar: 'كَلَّا لَيُنْبَذَنَّ فِي الْحُطَمَةِ', en: 'No! He will surely be thrown into the Crusher.' },
        { n: 5, ar: 'وَمَا أَدْرَاكَ مَا الْحُطَمَةُ', en: 'And what can make you know what the Crusher is?' },
        { n: 6, ar: 'نَارُ اللَّهِ الْمُوقَدَةُ', en: 'It is the fire of Allah, kindled,' },
        { n: 7, ar: 'الَّتِي تَطَّلِعُ عَلَى الْأَفْئِدَةِ', en: 'Which mounts up over the hearts.' },
        { n: 8, ar: 'إِنَّهَا عَلَيْهِمْ مُؤْصَدَةٌ', en: 'Indeed, it will be closed down upon them' },
        { n: 9, ar: 'فِي عَمَدٍ مُمَدَّدَةٍ', en: 'In extended columns.' },
      ],
    },
    {
      number: 105, nameArabic: 'الفيل', nameTransliteration: 'Al-Fil', nameTranslation: 'The Elephant',
      revelationType: 'Meccan', verified: false,
      verses: [
        { n: 1, ar: 'أَلَمْ تَرَ كَيْفَ فَعَلَ رَبُّكَ بِأَصْحَابِ الْفِيلِ', en: 'Have you not seen how your Lord dealt with the companions of the elephant?' },
        { n: 2, ar: 'أَلَمْ يَجْعَلْ كَيْدَهُمْ فِي تَضْلِيلٍ', en: 'Did He not make their plan go astray?' },
        { n: 3, ar: 'وَأَرْسَلَ عَلَيْهِمْ طَيْرًا أَبَابِيلَ', en: 'And He sent against them birds in flocks,' },
        { n: 4, ar: 'تَرْمِيهِمْ بِحِجَارَةٍ مِنْ سِجِّيلٍ', en: 'Striking them with stones of hard clay,' },
        { n: 5, ar: 'فَجَعَلَهُمْ كَعَصْفٍ مَأْكُولٍ', en: 'And He made them like eaten straw.' },
      ],
    },
    {
      number: 106, nameArabic: 'قريش', nameTransliteration: 'Quraysh', nameTranslation: 'Quraysh',
      revelationType: 'Meccan', verified: false,
      verses: [
        { n: 1, ar: 'لِإِيلَافِ قُرَيْشٍ', en: 'For the accustomed security of Quraysh —' },
        { n: 2, ar: 'إِيلَافِهِمْ رِحْلَةَ الشِّتَاءِ وَالصَّيْفِ', en: 'Their accustomed security in the caravan of winter and summer —' },
        { n: 3, ar: 'فَلْيَعْبُدُوا رَبَّ هَٰذَا الْبَيْتِ', en: 'Let them worship the Lord of this House,' },
        { n: 4, ar: 'الَّذِي أَطْعَمَهُمْ مِنْ جُوعٍ وَآمَنَهُمْ مِنْ خَوْفٍ', en: 'Who has fed them, saving them from hunger, and made them safe from fear.' },
      ],
    },
    {
      number: 107, nameArabic: 'الماعون', nameTransliteration: "Al-Ma'un", nameTranslation: 'Small Kindnesses',
      revelationType: 'Meccan', verified: false,
      verses: [
        { n: 1, ar: 'أَرَأَيْتَ الَّذِي يُكَذِّبُ بِالدِّينِ', en: 'Have you seen the one who denies the Judgment?' },
        { n: 2, ar: 'فَذَٰلِكَ الَّذِي يَدُعُّ الْيَتِيمَ', en: 'That is the one who pushes away the orphan,' },
        { n: 3, ar: 'وَلَا يَحُضُّ عَلَىٰ طَعَامِ الْمِسْكِينِ', en: 'And does not encourage the feeding of the needy.' },
        { n: 4, ar: 'فَوَيْلٌ لِلْمُصَلِّينَ', en: 'So woe to those who pray,' },
        { n: 5, ar: 'الَّذِينَ هُمْ عَنْ صَلَاتِهِمْ سَاهُونَ', en: 'Those who are heedless of their prayer,' },
        { n: 6, ar: 'الَّذِينَ هُمْ يُرَاءُونَ', en: 'Those who make a show of their deeds,' },
        { n: 7, ar: 'وَيَمْنَعُونَ الْمَاعُونَ', en: 'And withhold small acts of kindness.' },
      ],
    },
    {
      number: 108, nameArabic: 'الكوثر', nameTransliteration: 'Al-Kawthar', nameTranslation: 'Abundance',
      revelationType: 'Meccan', verified: false,
      verses: [
        { n: 1, ar: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ', en: 'Indeed, We have granted you abundant good.' },
        { n: 2, ar: 'فَصَلِّ لِرَبِّكَ وَانْحَرْ', en: 'So pray to your Lord and sacrifice.' },
        { n: 3, ar: 'إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ', en: 'Indeed, it is your enemy who is cut off.' },
      ],
    },
    {
      number: 109, nameArabic: 'الكافرون', nameTransliteration: 'Al-Kafirun', nameTranslation: 'The Disbelievers',
      revelationType: 'Meccan', verified: false,
      verses: [
        { n: 1, ar: 'قُلْ يَا أَيُّهَا الْكَافِرُونَ', en: 'Say, "O disbelievers,' },
        { n: 2, ar: 'لَا أَعْبُدُ مَا تَعْبُدُونَ', en: 'I do not worship what you worship.' },
        { n: 3, ar: 'وَلَا أَنْتُمْ عَابِدُونَ مَا أَعْبُدُ', en: 'Nor are you worshippers of what I worship.' },
        { n: 4, ar: 'وَلَا أَنَا عَابِدٌ مَا عَبَدْتُمْ', en: 'Nor will I be a worshipper of what you worship.' },
        { n: 5, ar: 'وَلَا أَنْتُمْ عَابِدُونَ مَا أَعْبُدُ', en: 'Nor will you be worshippers of what I worship.' },
        { n: 6, ar: 'لَكُمْ دِينُكُمْ وَلِيَ دِينِ', en: 'For you is your religion, and for me is my religion."' },
      ],
    },
    {
      number: 110, nameArabic: 'النصر', nameTransliteration: 'An-Nasr', nameTranslation: 'Divine Support',
      revelationType: 'Medinan', verified: false,
      verses: [
        { n: 1, ar: 'إِذَا جَاءَ نَصْرُ اللَّهِ وَالْفَتْحُ', en: 'When the help of Allah comes, and the victory,' },
        { n: 2, ar: 'وَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا', en: "And you see the people entering the religion of Allah in multitudes," },
        { n: 3, ar: 'فَسَبِّحْ بِحَمْدِ رَبِّكَ وَاسْتَغْفِرْهُ إِنَّهُ كَانَ تَوَّابًا', en: 'Then glorify the praise of your Lord and ask His forgiveness. Indeed, He is ever accepting of repentance.' },
      ],
    },
    {
      number: 111, nameArabic: 'المسد', nameTransliteration: 'Al-Masad', nameTranslation: 'The Palm Fiber',
      revelationType: 'Meccan', verified: false,
      verses: [
        { n: 1, ar: 'تَبَّتْ يَدَا أَبِي لَهَبٍ وَتَبَّ', en: 'May the hands of Abu Lahab be ruined, and ruined is he.' },
        { n: 2, ar: 'مَا أَغْنَىٰ عَنْهُ مَالُهُ وَمَا كَسَبَ', en: 'His wealth will not avail him, nor what he gained.' },
        { n: 3, ar: 'سَيَصْلَىٰ نَارًا ذَاتَ لَهَبٍ', en: 'He will be burned in a Fire of flame,' },
        { n: 4, ar: 'وَامْرَأَتُهُ حَمَّالَةَ الْحَطَبِ', en: 'And his wife as well — the carrier of firewood,' },
        { n: 5, ar: 'فِي جِيدِهَا حَبْلٌ مِنْ مَسَدٍ', en: 'Around her neck is a rope of palm fiber.' },
      ],
    },
    {
      number: 112, nameArabic: 'الإخلاص', nameTransliteration: 'Al-Ikhlas', nameTranslation: 'Sincerity',
      revelationType: 'Meccan', verified: false,
      verses: [
        { n: 1, ar: 'قُلْ هُوَ اللَّهُ أَحَدٌ', en: 'Say, "He is Allah, One.' },
        { n: 2, ar: 'اللَّهُ الصَّمَدُ', en: 'Allah, the Eternal Refuge.' },
        { n: 3, ar: 'لَمْ يَلِدْ وَلَمْ يُولَدْ', en: 'He neither begets nor is born,' },
        { n: 4, ar: 'وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ', en: 'Nor is there to Him any equivalent."' },
      ],
    },
    {
      number: 113, nameArabic: 'الفلق', nameTransliteration: 'Al-Falaq', nameTranslation: 'Daybreak',
      revelationType: 'Meccan', verified: false,
      verses: [
        { n: 1, ar: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ', en: 'Say, "I seek refuge in the Lord of daybreak,' },
        { n: 2, ar: 'مِنْ شَرِّ مَا خَلَقَ', en: 'From the evil of that which He created,' },
        { n: 3, ar: 'وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ', en: 'And from the evil of darkness when it settles,' },
        { n: 4, ar: 'وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ', en: 'And from the evil of the blowers in knots,' },
        { n: 5, ar: 'وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ', en: 'And from the evil of an envier when he envies."' },
      ],
    },
    {
      number: 114, nameArabic: 'الناس', nameTransliteration: 'An-Nas', nameTranslation: 'Mankind',
      revelationType: 'Meccan', verified: false,
      verses: [
        { n: 1, ar: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ', en: 'Say, "I seek refuge in the Lord of mankind,' },
        { n: 2, ar: 'مَلِكِ النَّاسِ', en: 'The Sovereign of mankind,' },
        { n: 3, ar: 'إِلَٰهِ النَّاسِ', en: 'The God of mankind,' },
        { n: 4, ar: 'مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ', en: 'From the evil of the retreating whisperer,' },
        { n: 5, ar: 'الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ', en: 'Who whispers in the breasts of mankind,' },
        { n: 6, ar: 'مِنَ الْجِنَّةِ وَالنَّاسِ', en: 'From among the jinn and mankind."' },
      ],
    },
  ];

  window.SHRS_QURAN = { surahs: SURAHS };
})();
