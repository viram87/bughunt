# Promotion copy and outreach

Ready-to-paste text for getting BugHunt in front of people, plus the reasoning
behind each choice so it can be adapted rather than copied blindly.

**Rule for all of it: never quote a challenge count.** The library grows, and a
number goes stale the moment it is written. "A growing library" also signals the
project is alive, which is what a reader is actually looking for — and a fixed
number invites a comparison with HackerRank that is not worth inviting.

---

## LinkedIn — Featured section

Profile → Add profile section → Recommended → Add featured → Add a link →
paste `https://trybughunt.com`

LinkedIn auto-fills the title and image from the site's Open Graph tags, then
lets you edit both the title and the description. **Overwrite them.** The
defaults are written to sell the product to a student; Featured is real estate
on *your* profile, so it should sell you.

**Title**

```
BugHunt — debugging practice that runs entirely in the browser
```

**Description**

```
A free platform teaching debugging to CS students. Python runs via
WebAssembly and JavaScript in sandboxed workers — no backend executes
user code, so it costs nothing to run and scales to any number of users.
Includes a step-through visualiser built on sys.settrace and AST
instrumentation. Next.js, Supabase, a growing library of hand-verified
challenges.
```

The interesting parts to a recruiter are the zero-backend execution
architecture and the visualiser, not the catalogue.

---

## LinkedIn — About section

People read About far more than they click Featured.

```
Currently building BugHunt, a free debugging-practice platform that runs
Python and JavaScript entirely in the browser.
```

---

## LinkedIn — Projects section

Separate from Featured, and it is what shows when someone scans the profile for
experience. Same description as Featured; add the URL and the date range.

---

## LinkedIn — if you do post

Featured is permanent, a post decays in about 48 hours. If you post as well:

- **Lead with the technical story, not the link.** "I built a debugging practice
  site" gets scrolled past. "I got Python running in the browser with no backend
  at all — here's how" gets read.
- **Put the link in the first comment**, not the post body. LinkedIn suppresses
  reach on posts containing external links.
- **Tag your college and any coding club.** That is how it reaches people who
  would actually use it.

Expect a spike, then silence. The value is feedback and portfolio credit, not
sustained traffic.

---

## Email to a lab instructor

The highest-converting channel by a wide margin: one instructor who assigns it
is ~60 students in a week. Email **lab instructors and lab assistants, not the
HOD** — they choose the practical exercises. Send ten, not one.

**Subject**

```
Free in-browser debugging exercises for your programming lab
```

**Body**

```
Hello <name>,

I built a free tool for practising debugging and thought it might be
useful for your programming lab.

Students get working code with one bug in it and a description of the
symptom rather than the cause. They find it, fix it in the browser, and
run it against test cases. Once it passes they get an explanation of the
bug pattern behind it — the aim is recognising the shape of an off-by-one
or a closure bug, not memorising one fix.

Practical details:
- Free, and no account is needed for students to start.
- Nothing to install. Python runs through WebAssembly and JavaScript in a
  sandboxed worker, both inside the browser tab. No lab machine setup, no
  admin rights.
- Python and JavaScript, across easy to hard.

https://trybughunt.com

Happy to add challenges for a specific topic you teach if that would
help.

<your name>
<college / year>
```

Keep it short and lead with "no install" — that is the objection that kills most
lab tools.

---

## Reddit and developer communities

r/learnprogramming, r/learnpython, r/webdev, and college coding-club groups.

Do not lead with "check out my site" — most subreddits will remove it and
readers ignore it. Lead with the technical thing that is genuinely novel:
running Python in the browser with no backend at all. Read each subreddit's
self-promotion rules first; they vary and they are enforced.

The real value here is feedback, which is what the in-app report button is for.

---

## SEO — the channel that compounds

Already built: bug-pattern landing pages at `/bugs/[pattern]` targeting the
error strings people actually search (`IndexError: string index out of range`,
`Cannot read properties of undefined`), challenge metadata leading with the
symptom rather than the spec, internal linking from every challenge to its
pattern, and structured data.

Sitemap submitted. After the move to trybughunt.com, add the new domain as a
**separate Search Console property** — the old one only covers the vercel.app
host — verify it via Cloudflare DNS, and resubmit the sitemap there. Then use
URL Inspection → Request indexing on `/`, `/visualize` and two or three pattern
pages.

Realistic timeline: three to six months before meaningful traffic, and a new
domain starts from zero authority, so expect a dip before it climbs. It is slow,
but it works while you sleep, which none of the other channels do.

---

## Outstanding operational items

Done: custom domain (trybughunt.com, Cloudflare Registrar), OAuth consent screen
published to production, sitemap submitted for the old host.

- Add **trybughunt.com as a new Search Console property** and resubmit the
  sitemap there. The existing property only covers the vercel.app host.
- Run `supabase/migrations/0006_challenge_reports.sql` so the report button works
- Enable Web Analytics in the Vercel dashboard (the component alone does not
  switch it on)
- Set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` in Vercel now that the consent
  screen is in production, and confirm Supabase's Site URL and Redirect URLs
  point at the new domain.

Google branding verification may stay pending. It only affects how the consent
screen looks — publishing status is what governs who can sign in, and that is
already In production.
