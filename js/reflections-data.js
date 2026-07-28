// Shared "Today's Islamic Reminder" data — one small, deliberately
// conservative set of extremely well-established, agreed-upon (Bukhari &
// Muslim) hadith and widely-known verses, English translation + citation
// only. No attempt to reproduce Qur'anic Arabic script from memory here —
// the risk of a transcription error in sacred text outweighs the value of
// showing it, and families can verify any citation against their own
// Mushaf. Single source of truth, consumed by both the Personalisation
// Centre panel (js/personalisation.js) and the homepage/dashboard
// "Today's Wird" widget (js/site.js) — previously duplicated between the
// two, now shared to avoid the pair drifting apart.
(function () {
  var VERSES = [
    { en: 'Allah does not burden a soul beyond that it can bear.', ref: "Qur'an 2:286" },
    { en: 'And whoever fears Allah, He will make a way out for him, and will provide for him from where he does not expect.', ref: "Qur'an 65:2-3" },
    { en: 'So, verily, with hardship, there is relief. Verily, with hardship, there is relief.', ref: "Qur'an 94:5-6" },
    { en: 'O you who believe, seek help through patience and prayer. Indeed, Allah is with the patient.', ref: "Qur'an 2:153" },
    { en: 'My Lord, increase me in knowledge.', ref: "Qur'an 20:114" },
    { en: 'Verily, in the remembrance of Allah do hearts find rest.', ref: "Qur'an 13:28" },
  ];
  var HADITH = [
    { en: 'Actions are judged by intentions, and every person will get the reward according to what he has intended.', ref: 'Sahih al-Bukhari & Sahih Muslim' },
    { en: 'None of you truly believes until he loves for his brother what he loves for himself.', ref: 'Sahih al-Bukhari & Sahih Muslim' },
    { en: 'Whoever believes in Allah and the Last Day should speak good or remain silent.', ref: 'Sahih al-Bukhari & Sahih Muslim' },
    { en: 'The best among you are those who have the best manners and character.', ref: 'Sahih al-Bukhari' },
    { en: 'A good word is charity.', ref: 'Sahih al-Bukhari & Sahih Muslim' },
  ];
  function dayOfYear() {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 0);
    return Math.floor((now - start) / 86400000);
  }
  function todaysReminder() {
    var doy = dayOfYear();
    // Alternates verse/hadith by day so the reminder doesn't feel
    // mechanically paired with the same partner every time.
    var useVerse = doy % 2 === 0;
    var pick = useVerse ? VERSES[doy % VERSES.length] : HADITH[doy % HADITH.length];
    return { kind: useVerse ? 'verse' : 'hadith', en: pick.en, ref: pick.ref };
  }
  window.SHRS_REFLECTIONS = { VERSES: VERSES, HADITH: HADITH, dayOfYear: dayOfYear, todaysReminder: todaysReminder };
})();
