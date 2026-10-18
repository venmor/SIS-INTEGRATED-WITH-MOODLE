# Homepage visual QA — 18 October 2026

final result: passed for the local implementation and supplied reference

Reference: `/home/hangoma/Pictures/sis_home_page.png` (1672×941). Rendered production build screenshots: `/tmp/sis-home-1672-final.png` and `/tmp/sis-home-390-final.png`.

At the reference desktop size, the final page is 1672×941 with no overflow. The header, hero/footer boundaries, left heading, and sign-in card align closely with the supplied image. The card begins near x=1007/y=167 versus roughly x=1020/y=166 in the reference; the hero title begins near x=104/y=367 versus roughly x=101/y=364. The campus background is a generated visual match rather than the exact building photo. The official crest is a local asset from the UNZA application host.

At 390px, the header, hero copy, sign-in form, and footer stack without horizontal overflow. Username, password, password visibility, audience guidance, recovery, sign-in and demo disclosure remain operable. The Student/Staff control explains which account to use; server authorization still chooses the workspace. The demo button appears only when fictional demo mode is enabled. The reference's stay-signed-in checkbox was excluded because no approved session-duration control exists.

A production browser check found no page errors. The desktop and mobile screenshots were opened and compared with the source image. Connected sign-in with a real account was not part of this local visual check; the existing authentication flow and endpoint are reused unchanged. Human visual acceptance remains pending.
