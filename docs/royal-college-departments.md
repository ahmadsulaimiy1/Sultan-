# Royal College: seven departments

Settled during the 2026 site review. Recorded here so it is not re-litigated
from a bare number on a page.

## The seven

| # | Department | Subjects |
|---|---|---|
| 1 | Languages | English, Yoruba, French (future), Hausa (future), Chinese (future) |
| 2 | Mathematics & ICT | Mathematics, Further Mathematics, Computer Studies, Data Processing, Programming |
| 3 | Humanities | Geography, History, Government, Civic Education, Art, Literature in English, Social Studies |
| 4 | Science & Technology | Biology, Physics, Chemistry, Agricultural Science, Food & Nutrition, Technical Drawing, Basic Technology, Home Economics, PHE |
| 5 | Commerce & Management | Financial Accounting, Commerce, Economics, Bookkeeping, Marketing, Business Studies |
| 6 | Arabic | Arabic, Nahwu & Sarfu, Aruud, Balaghah, Al-Adab-Al Arabiy, Al-Inshaw |
| 7 | Islamic Sciences | Fiqh, Usul-Fiqh, Tawheed, Seerah, Tajweed, Hadith, Ulumul-Hadith, Ulumul-Tafseer, Tafseer, Ilmu Qiraat |

## Why seven and not six

The site said both. Six appeared on `/academics/`, `/academics/royal-college/`,
the curriculum page and the homepage; seven appeared in the Royal College
department grid, in the assistant's fact sheet, on the full application form,
and in the Arabic page description in `pages/manifest.json`.

Six was the error, and its origin was findable: `/academics/` listed six
because its grid had dropped **Commerce & Management** altogether. That
department is not in doubt —

- it has a named Head of Department in the governance register, Mr. Afolabi
  Morufu Olalekan (B.Sc.(Ed) Accounting Edu., NCE);
- its six subjects are carried in `functions/api/chat.js`;
- it is one of the seven on `/academics/royal-college/`;
- the Arabic Royal College page has carried التجارة والإدارة all along.

So the missing card produced the wrong figure, and the wrong figure then spread
to three other pages. The card is restored and the count is seven everywhere,
in English and Arabic.

## If this is wrong

It is a fact about the school, not about the code. If the Board counts six —
for instance by placing Arabic and Islamic Sciences under the Islamiyyah School
rather than under Royal College — then the fix is not to change the number back
on four pages but to say which seven-minus-one is meant, here, once. Every
place the number appears is listed in the commit that unified it.
