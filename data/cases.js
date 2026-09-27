// Documented US campus sexual-assault / abuse cases.
//
// Editorial rules (see README "Data policy"):
//  - Every entry must cite at least one published source.
//  - Survivors/complainants are never named.
//  - An individual is named ONLY if (a) convicted in criminal court, or
//    (b) deceased and the subject of an official charge or a university-commissioned
//    investigation. People who are only accused (lawsuits, Title IX findings, no charges)
//    are NOT named, and no photos of any individual are published.
//  - `affected` is the number of complainants/plaintiffs reported in the cited sources
//    (a floor, not a prevalence estimate). `payout` is USD in settlements + federal fines.
//
// clery: "<Clery INSTNM>|<branch substring>" links the case to its campus row in data/clery.js.
// tracks: position in each legal track (see data/process.js): step index, "active" or "closed", short outcome, note.
// statusCategory: "conviction" | "settled" | "pending" | "federal" | "no-charges" | "discredited"

window.CASES = [
  {
    id: "cornell-2024",
    clery: "Cornell University|Endowed",
    school: "Cornell University",
    city: "Ithaca", state: "NY", lat: 42.4534, lng: -76.4735,
    year: 2024, reported: 2026,
    title: "Alleged drugging and group sexual assault at Chi Phi fraternity house",
    type: "Student-on-student (fraternity)",
    summary: "A former student alleges she was given ketamine and sexually assaulted for hours at the Chi Phi house in October 2024, and that a member invited others via a Snapchat group chat. Civil suit filed September 2026 in NY Supreme Court against Cornell, Chi Phi, related Greek organizations and seven current/former members. Cornell says its Office of Civil Rights investigated; reporting indicates two students were expelled. The chapter remains barred from campus.",
    status: "Civil lawsuit pending (filed Sept 2026). Tompkins County DA found insufficient evidence for criminal charges; no arrests.",
    tracks: [{"track": "civil", "step": 0, "state": "active", "note": "Filed Sept 2026 against Cornell, Chi Phi, related organizations and seven members. Defendants have not yet answered.", "short": "Lawsuit filed; awaiting response"}, {"track": "criminal", "step": 2, "state": "closed", "note": "Tompkins County DA declined to charge: insufficient evidence. No arrests.", "short": "No charges filed"}, {"track": "campus", "step": 3, "state": "closed", "note": "Cornell's investigation concluded. Reporting says two students were expelled, others received lesser discipline. The chapter is barred from campus.", "short": "Discipline issued"}],
    statusCategory: "pending",
    affected: 1, payout: 0,
    named: [],
    namingNote: "The lawsuit names seven individual defendants. None has been criminally charged, so this site does not list their names.",
    sources: [
      { label: "CBS New York", url: "https://www.cbsnews.com/newyork/news/cornell-university-lawsuit-fraternity-rape-allegations/" },
      { label: "Cornell University statement (Sept 21, 2026)", url: "https://statements.cornell.edu/2026/20260921-update.cfm" },
      { label: "Cornell Daily Sun editorial", url: "https://www.cornellsun.com/article/2026/09/editorial-cornell-won-t-we-will" },
      { label: "WBNG", url: "https://www.wbng.com/2026/09/22/cornell-university-fraternity-sued-by-student-after-alleged-gang-rape-drugging-2024/" },
      { label: "Cornell Daily Sun (Sept 2026)", url: "https://www.cornellsun.com/article/2026/09/university-releases-statement-on-alleged-gang-rape-at-chi-phi" }
    ]
  },
  {
    id: "stanford-2015",
    clery: "Stanford University|Main Campus",
    school: "Stanford University",
    city: "Stanford", state: "CA", lat: 37.4275, lng: -122.1697,
    year: 2015, reported: 2015,
    title: "Sexual assault of an unconscious woman outside a fraternity party",
    type: "Student-on-student",
    summary: "A Stanford swimmer was found guilty in March 2016 of three felony counts: assault with intent to commit rape of an intoxicated/unconscious person and two counts of sexual penetration. The six-month jail sentence provoked national outrage and the 2018 recall of the sentencing judge.",
    status: "Convicted (2016); appeal denied (2018). Served 3 months of a 6-month jail sentence; lifetime sex-offender registration.",
    tracks: [{"track": "criminal", "step": 6, "state": "closed", "note": "Convicted March 2016. Appeal denied August 2018. Sentence served; lifetime sex-offender registration.", "short": "Convicted; appeal denied"}],
    statusCategory: "conviction",
    affected: 1, payout: 0,
    named: [{ name: "Brock Turner", basis: "Convicted of three felony counts, March 2016" }],
    sources: [
      { label: "Stanford Daily", url: "https://stanforddaily.com/2016/03/30/brock-turner-found-guilty-on-three-felony-counts/" },
      { label: "CNN", url: "https://www.cnn.com/2016/06/06/us/sexual-assault-brock-turner-stanford/" },
      { label: "Stanford Daily (appeal denied)", url: "https://stanforddaily.com/2018/08/08/turner-appeal-denied/" }
    ]
  },
  {
    id: "msu-nassar",
    clery: "Michigan State University|",
    school: "Michigan State University",
    city: "East Lansing", state: "MI", lat: 42.7018, lng: -84.4822,
    year: 2016, reported: 2016,
    title: "Sports physician's serial sexual abuse of patients",
    type: "Physician / employee abuse",
    summary: "A university sports physician (also USA Gymnastics team doctor) sexually abused hundreds of patients. MSU agreed to a $500M settlement ($425M to 333 plaintiffs). The Education Department imposed a then-record $4.5M Clery Act fine in 2019, citing a \"systemic failure to protect students.\"",
    status: "Convicted (2017–2018); serving effective life sentences. $500M settlement + $4.5M federal fine.",
    tracks: [{"track": "criminal", "step": 6, "state": "closed", "note": "Pleaded guilty 2017. Michigan Supreme Court denied his final sentencing appeal in June 2022.", "short": "Guilty plea; appeals exhausted"}, {"track": "civil", "step": 4, "state": "closed", "note": "$500M settlement (2018).", "short": "Settled ($500M)"}, {"track": "federal", "step": 3, "state": "closed", "note": "Title IX violations found; record $4.5M Clery fine (2019).", "short": "Fined $4.5M"}],
    statusCategory: "conviction",
    affected: 333, payout: 504500000,
    named: [{ name: "Larry Nassar", basis: "Convicted on federal and state charges, 2017–2018" }],
    sources: [
      { label: "Inside Higher Ed — $4.5M fine", url: "https://www.insidehighered.com/news/2019/09/06/education-department-fines-michigan-state-45-million-not-reporting-nassar-crimes" },
      { label: "TIME", url: "https://time.com/5669880/michigan-state-university-larry-nassar-fine/" },
      { label: "CNN (final appeal denied)", url: "https://www.cnn.com/2022/06/17/us/larry-nassar-appeal-rejected/index.html" }
    ]
  },
  {
    id: "usc-tyndall",
    clery: "University of Southern California|University Park",
    school: "University of Southern California",
    city: "Los Angeles", state: "CA", lat: 34.0224, lng: -118.2851,
    year: 2018, reported: 2018,
    title: "Student-health-center gynecologist accused of abusing thousands of patients",
    type: "Physician / employee abuse",
    summary: "USC reached a $215M federal class settlement (2018, ~18,000 women) and an $852M state settlement (2021, 710 plaintiffs) — about $1.1B total, the largest sex-abuse payout in higher-education history at the time. The gynecologist was charged with 18 felony counts but died in October 2023 before trial.",
    status: "Criminal case ended by defendant's death (never tried). ~$1.1B in civil settlements.",
    tracks: [{"track": "criminal", "step": 3, "state": "closed", "note": "Charged with 18 felonies. Died in October 2023 before trial; case dismissed.", "short": "Died before trial"}, {"track": "civil", "step": 4, "state": "closed", "note": "About $1.1B in federal class and state settlements (2018, 2021).", "short": "Settled (~$1.1B)"}],
    statusCategory: "settled",
    affected: 17000, payout: 1067000000,
    named: [{ name: "George Tyndall", basis: "Charged with 18 felonies; died before trial (never convicted)" }],
    sources: [
      { label: "NPR", url: "https://www.npr.org/2021/03/25/981435791/usc-agrees-852-million-settlement-to-end-sex-abuse-litigation" },
      { label: "PBS NewsHour", url: "https://www.pbs.org/newshour/nation/former-usc-doctor-charged-with-sexual-abuse-of-students-dies-before-going-to-trial" },
      { label: "Annenberg Media", url: "https://www.uscannenbergmedia.com/2024/02/02/case-dismissed-against-ex-usc-gynecologist-george-tyndall/" }
    ]
  },
  {
    id: "columbia-hadden",
    clery: "Columbia University in the City of New York|Morningside",
    school: "Columbia University",
    city: "New York", state: "NY", lat: 40.8075, lng: -73.9626,
    year: 2012, reported: 2012,
    title: "Affiliated OB-GYN's abuse of hundreds of patients (1993–2012)",
    type: "Physician / employee abuse",
    summary: "Columbia and NewYork-Presbyterian paid $71.5M (2021, 79 survivors), $165M (2022, 147 survivors) and $750M (2025, 576 former patients). ProPublica reporting documented the institutions' failure to act on early complaints. Total settlements exceed $1B.",
    status: "Convicted federally (2023); 20-year sentence affirmed on appeal. >$1B in settlements.",
    tracks: [{"track": "criminal", "step": 6, "state": "closed", "note": "Convicted January 2023. 20-year sentence affirmed on appeal.", "short": "Convicted; sentence upheld"}, {"track": "civil", "step": 4, "state": "closed", "note": "More than $1B in settlements; the largest ($750M, 576 patients) was approved in 2025.", "short": "Settled (>$1B)"}],
    statusCategory: "conviction",
    affected: 802, payout: 986500000,
    named: [{ name: "Robert Hadden", basis: "Convicted in federal court, 2023; sentenced to 20 years" }],
    sources: [
      { label: "ProPublica", url: "https://www.propublica.org/article/columbia-university-750-million-settlement-robert-hadden-sexual-assault" },
      { label: "NBC News", url: "https://www.nbcnews.com/news/us-news/columbia-new-york-presbyterian-hospital-settle-hundreds-sex-abuse-clai-rcna205335" },
      { label: "Columbia Spectator", url: "https://www.columbiaspectator.com/news/2025/05/23/historic-recovery-columbia-and-newyork-presbyterian-to-pay-750-million-to-former-patients-in-largest-hadden-settlement-to-date/" },
      { label: "U.S. Attorney, SDNY", url: "https://www.justice.gov/usao-sdny/us-v-robert-hadden" }
    ]
  },
  {
    id: "ucla-heaps",
    clery: "University of California-Los Angeles|",
    school: "University of California, Los Angeles",
    city: "Los Angeles", state: "CA", lat: 34.0689, lng: -118.4452,
    year: 2019, reported: 2019,
    title: "Campus gynecologist's abuse of patients",
    type: "Physician / employee abuse",
    summary: "The University of California paid nearly $700M across settlements ($73M federal class; $243.6M; $374M) — the largest sexual-abuse settlement involving a public university. An appeals court overturned the original conviction in 2026; the doctor then pleaded guilty to 13 felonies involving five victims.",
    status: "Pleaded guilty (April 2026) to 13 felonies; sentenced to 11 years.",
    tracks: [{"track": "criminal", "step": 5, "state": "closed", "note": "Original conviction overturned in 2026. He then pleaded guilty to 13 felonies (April 2026) and was sentenced to 11 years.", "short": "Pleaded guilty; 11 years"}, {"track": "civil", "step": 4, "state": "closed", "note": "About $700M in settlements (2021–2022).", "short": "Settled (~$700M)"}],
    statusCategory: "conviction",
    affected: 6000, payout: 690600000,
    named: [{ name: "James Heaps", basis: "Pleaded guilty to 13 felonies, April 2026" }],
    sources: [
      { label: "CNN (2026)", url: "https://www.cnn.com/2026/04/14/us/james-heaps-ucla-gynecologist" },
      { label: "ABC7 Los Angeles", url: "https://abc7.com/post/ex-ucla-campus-gynecologist-james-mason-heaps-pleads-guilty-13-sex-crimes-resentenced-11-years-prison/18885744/" }
    ]
  },
  {
    id: "osu-strauss",
    clery: "Ohio State University-Main Campus|",
    school: "The Ohio State University",
    city: "Columbus", state: "OH", lat: 40.0067, lng: -83.0305,
    year: 1978, reported: 2018,
    title: "Team physician's abuse of male athletes and students (1978–1996)",
    type: "Physician / employee abuse",
    summary: "A university-commissioned investigation documented decades of abuse by a sports-medicine doctor. In 2023 the U.S. Supreme Court declined to hear OSU's appeal, letting 230+ men's lawsuits proceed. OSU previously paid $61M to 317 plaintiffs and approved a further $100M settlement in principle with 279 of 280 remaining plaintiffs.",
    status: "$100M settlement approved June 2026 for 279 of 280 remaining plaintiffs; payouts being allocated by a special master. Earlier settlements: ~$61M.",
    tracks: [{"track": "civil", "step": 4, "state": "active", "note": "$100M settlement approved June 2026 for 279 of 280 remaining plaintiffs. A court-appointed special master is allocating payouts; one plaintiff has not settled.", "short": "$100M settlement being paid out"}],
    statusCategory: "settled",
    affected: 596, payout: 161000000,
    named: [{ name: "Richard Strauss", basis: "Deceased; subject of university-commissioned investigation" }],
    sources: [
      { label: "Sportico ($100M, 2026)", url: "https://www.sportico.com/leagues/college-sports/2026/ohio-state-richard-strauss-settlement-1234902281/" },
      { label: "PBS NewsHour (Supreme Court)", url: "https://www.pbs.org/newshour/nation/supreme-court-wont-hear-cases-over-ohio-state-doctors-sexual-abuse-allowing-lawsuits-to-proceed" },
      { label: "OSU Strauss investigation", url: "https://straussinvestigation.osu.edu/strauss-investigation/about" },
      { label: "WOSU (June 2026)", url: "https://www.wosu.org/politics-government/2026-06-03/ohio-state-university-says-nearly-all-remaining-strauss-survivors-have-agreed-to-a-settlement" }
    ]
  },
  {
    id: "umich-anderson",
    clery: "University of Michigan-Ann Arbor|",
    school: "University of Michigan",
    city: "Ann Arbor", state: "MI", lat: 42.2780, lng: -83.7382,
    year: 1966, reported: 2020,
    title: "University physician's decades-long abuse of students and athletes (1966–2003)",
    type: "Physician / employee abuse",
    summary: "A WilmerHale report (2021) found a \"pervasive, decades-long\" pattern of sexual misconduct and that university officials knew as early as 1978. U-M settled for $490M with about 1,050 claimants in 2022.",
    status: "Perpetrator died 2008. $490M settlement finalized 2022.",
    tracks: [{"track": "civil", "step": 4, "state": "closed", "note": "$490M settlement finalized 2022. No criminal case: the doctor died in 2008.", "short": "Settled ($490M)"}],
    statusCategory: "settled",
    affected: 1050, payout: 490000000,
    named: [{ name: "Robert E. Anderson", basis: "Deceased; subject of university-commissioned WilmerHale investigation" }],
    sources: [
      { label: "University Record", url: "https://record.umich.edu/articles/u-m-reaches-490m-settlement-with-anderson-plaintiffs/" },
      { label: "Michigan Daily", url: "https://www.michigandaily.com/news/over-1000-anderson-survivors-reach-490-million-settlement-with-the-university-of-michigan/" }
    ]
  },
  {
    id: "baylor",
    clery: "Baylor University|",
    school: "Baylor University",
    city: "Waco", state: "TX", lat: 31.5489, lng: -97.1131,
    year: 2012, reported: 2016,
    title: "Football program sexual-assault scandal and institutional Title IX failures",
    type: "Student-on-student (athletics) / institutional",
    summary: "A Pepper Hamilton review (2016) found Baylor failed to implement Title IX and that officials discouraged or retaliated against complainants. The head football coach was fired; the president and athletic director left. The Big 12 fined Baylor $2M; the NCAA imposed probation and a $5,000 fine in 2021. Multiple Title IX suits were settled, including one alleging gang rape by football players.",
    status: "Lawsuits settled. Under federal monitoring through a 2025 OCR resolution agreement. One former player convicted (2014).",
    tracks: [{"track": "criminal", "step": 5, "state": "closed", "note": "One former player convicted 2014 and sentenced to 20 years.", "short": "One player convicted"}, {"track": "civil", "step": 4, "state": "closed", "note": "Title IX lawsuits settled; the last of the 2016 suits settled in 2023.", "short": "Settled"}, {"track": "federal", "step": 4, "state": "active", "note": "Education Dept. OCR found delays in Title IX cases (Jan 2025). Resolution agreement requires progress reports in 2025 and 2026.", "short": "Under federal monitoring"}],
    statusCategory: "conviction",
    affected: null, payout: 2005000,
    named: [{ name: "Tevin Elliott", basis: "Convicted of two counts of sexual assault, January 2014; sentenced to 20 years" }],
    sources: [
      { label: "ESPN (NCAA ruling)", url: "https://www.espn.com/college-sports/story/_/id/32003986/ncaa-not-punishing-baylor-sexual-assault-allegations" },
      { label: "Baylor Lariat (Elliott verdict)", url: "https://baylorlariat.com/2014/01/24/elliott-guilty-ex-football-player-to-serve-20-years-for-assault/" },
      { label: "Dallas Morning News timeline", url: "https://www.dallasnews.com/sports/baylor-bears/2016/10/28/baylor-sexual-assault-scandal-timeline-from-football-convictions-to-title-ix-investigation/" },
      { label: "ESPN (2025 federal report)", url: "https://www.espn.com/college-football/story/_/id/43010592/federal-report-baylor-finds-delays-title-ix-cases" }
    ]
  },
  {
    id: "vanderbilt-2013",
    clery: "Vanderbilt University|",
    school: "Vanderbilt University",
    city: "Nashville", state: "TN", lat: 36.1447, lng: -86.8027,
    year: 2013, reported: 2013,
    title: "Dorm-room rape of an unconscious student by football players",
    type: "Student-on-student (athletics)",
    summary: "Four former football players were charged after a June 2013 assault captured on phone video. Initial 2015 convictions were vacated over juror misconduct; both principal defendants were convicted again at retrial in 2016.",
    status: "Two convicted at retrial (2016); one sentenced to 15 years, the other to 17 years.",
    tracks: [{"track": "criminal", "step": 6, "state": "closed", "note": "Both convicted at retrial (2016). Sentences of 15 and 17 years; the 17-year sentence was upheld on appeal (2019).", "short": "Convicted; sentence upheld"}],
    statusCategory: "conviction",
    affected: 1, payout: 0,
    named: [
      { name: "Brandon Vandenburg", basis: "Convicted of aggravated rape at retrial, 2016; sentenced to 17 years" },
      { name: "Cory Batey", basis: "Convicted of aggravated rape at retrial, 2016; sentenced to 15 years" }
    ],
    sources: [
      { label: "NBC News", url: "https://www.nbcnews.com/news/us-news/ex-vanderbilt-football-player-vandenburg-convicted-rape-retrial-n595086" },
      { label: "ESPN", url: "https://www.espn.com/college-football/story/_/id/17083346/former-vanderbilt-commodores-player-cory-batey-sentenced-15-years-dorm-rape" },
      { label: "Washington Post (17-year sentence)", url: "https://www.washingtonpost.com/news/early-lead/wp/2016/11/04/second-ex-vanderbilt-football-player-sentenced-in-rape-case-gets-17-years/" },
      { label: "ESPN (sentence upheld)", url: "https://www.espn.com/college-football/story/_/id/27356238/ex-vandy-player-sentence-upheld-appeal" }
    ]
  },
  {
    id: "pennstate-sandusky",
    clery: "Pennsylvania State University-Main Campus|University Park",
    school: "Pennsylvania State University",
    city: "University Park", state: "PA", lat: 40.7982, lng: -77.8599,
    year: 2011, reported: 2011,
    title: "Former assistant football coach's child sexual abuse; Clery violations",
    type: "Employee abuse (minors on campus)",
    summary: "After the 2011 scandal the Education Department's five-year review found 11 serious Clery Act violations and imposed a then-record ~$2.4M fine (2016).",
    status: "Convicted (2012) on 45 counts; still appealing. State courts denied a new trial; he is moving his appeal to federal court (Sept 2026).",
    tracks: [{"track": "criminal", "step": 6, "state": "active", "note": "Convicted 2012 on 45 counts. Pennsylvania courts denied a new trial (2024). In Sept 2026 he withdrew his latest state bid to pursue a federal appeal.", "short": "Convicted; federal appeal pending"}, {"track": "federal", "step": 3, "state": "closed", "note": "$2.4M Clery Act fine (2016).", "short": "Fined $2.4M"}],
    statusCategory: "conviction",
    affected: 10, payout: 2397500,
    named: [{ name: "Jerry Sandusky", basis: "Convicted of 45 counts of child sexual abuse, 2012" }],
    sources: [
      { label: "CNN", url: "https://www.cnn.com/2016/11/03/us/penn-state-fine-sandusky-case/index.html" },
      { label: "Inside Higher Ed", url: "https://www.insidehighered.com/news/2016/11/04/education-departments-historic-sanction-against-penn-state-clery-violations" },
      { label: "CNN (Sept 2026)", url: "https://www.cnn.com/2026/09/07/us/jerry-sandusky-hearing-trial-appeal" }
    ]
  },
  {
    id: "liberty",
    clery: "Liberty University|",
    school: "Liberty University",
    city: "Lynchburg", state: "VA", lat: 37.3524, lng: -79.1797,
    year: 2016, reported: 2021,
    title: "Honor code used against sexual-assault reporters; Clery Act violations",
    type: "Institutional",
    summary: "Lawsuits in 2021 from more than two dozen people alleged Liberty discouraged reporting by punishing victims under its honor code. The Education Department found the university did not keep an accurate crime log (2016–2023) and imposed a $14M Clery fine in March 2024 — the largest ever.",
    status: "$14M federal fine (2024). 20 of 22 plaintiffs settled their lawsuit in 2022.",
    tracks: [{"track": "civil", "step": 4, "state": "active", "note": "20 of 22 plaintiffs settled in May 2022. Two declined to settle; the status of their claims has not been publicly reported.", "short": "20 of 22 settled; 2 unresolved"}, {"track": "federal", "step": 3, "state": "closed", "note": "$14M Clery Act fine (March 2024), the largest ever.", "short": "Fined $14M"}],
    statusCategory: "federal",
    affected: 25, payout: 14000000,
    named: [],
    sources: [
      { label: "Inside Higher Ed", url: "https://www.insidehighered.com/news/students/safety/2024/03/05/liberty-university-fined-14-million-clery-violations" },
      { label: "The 19th", url: "https://19thnews.org/2024/03/liberty-university-14-million-fine-clery-act-sexual-violence/" },
      { label: "Inside Higher Ed (2022 settlement)", url: "https://www.insidehighered.com/quicktakes/2022/05/12/liberty-university-partially-settles-title-ix-lawsuit" }
    ]
  },
  {
    id: "emu-2006",
    clery: "Eastern Michigan University|",
    school: "Eastern Michigan University",
    city: "Ypsilanti", state: "MI", lat: 42.2506, lng: -83.6245,
    year: 2006, reported: 2007,
    title: "Student raped and murdered in dorm; university denied foul play",
    type: "Student-on-student / institutional cover-up",
    summary: "The university initially announced a student's December 2006 death in her residence hall involved no foul play and did not correct that for two months. The president was fired. EMU settled with the family for $2.5M and paid a then-record ~$357,500 Clery fine (2008).",
    status: "Perpetrator convicted of murder. $2.5M settlement + Clery fine.",
    tracks: [{"track": "criminal", "step": 6, "state": "closed", "note": "Convicted of murder April 2008; verdict upheld on appeal (2010).", "short": "Convicted; verdict upheld"}, {"track": "civil", "step": 4, "state": "closed", "note": "$2.5M settlement with the family (2007).", "short": "Settled ($2.5M)"}, {"track": "federal", "step": 3, "state": "closed", "note": "Clery Act fine (2008).", "short": "Fined"}],
    statusCategory: "conviction",
    affected: 1, payout: 2857500,
    named: [{ name: "Orange Taylor III", basis: "Convicted of the murder at retrial, April 2008" }],
    sources: [
      { label: "Campus Safety Magazine", url: "https://www.campussafetymagazine.com/news/eastern-michigan-university-agrees-to-pay-largest-ever-clery-act-fine-of-35/" },
      { label: "NBC News", url: "https://www.nbcnews.com/id/wbna19790500" },
      { label: "Michigan Daily (verdict)", url: "https://www.michigandaily.com/uncategorized/taylor-found-guilty-emu-death/" },
      { label: "Eastern Echo (verdict upheld)", url: "https://www.easternecho.com/blog/news_blog/2010/04/murder-verdict-upheld-in-emu-student-dorm" }
    ]
  },
  {
    id: "colorado-2001",
    clery: "University of Colorado Boulder|",
    school: "University of Colorado Boulder",
    city: "Boulder", state: "CO", lat: 40.0076, lng: -105.2659,
    year: 2001, reported: 2002,
    title: "Alleged gang rape at party for football recruits (Simpson v. University of Colorado)",
    type: "Student-on-student (athletics)",
    summary: "Two former students alleged they were assaulted at a 2001 off-campus party involving players and recruits. After a federal appeals ruling, CU settled for $2.85M in 2007. The scandal contributed to the departures of the system president, chancellor, athletic director and football coach.",
    status: "Settled 2007 ($2.85M) with policy reforms.",
    tracks: [{"track": "civil", "step": 4, "state": "closed", "note": "Settled for $2.85M in 2007 after a federal appeals court revived the case.", "short": "Settled ($2.85M)"}],
    statusCategory: "settled",
    affected: 2, payout: 2850000,
    named: [],
    sources: [
      { label: "Inside Higher Ed", url: "https://www.insidehighered.com/news/2007/12/06/settlement-sexual-assault-case" },
      { label: "ACLU", url: "https://www.aclu.org/cases/simpson-v-university-colorado" }
    ]
  },
  {
    id: "tennessee-2016",
    clery: "The University of Tennessee-Knoxville|",
    school: "University of Tennessee, Knoxville",
    city: "Knoxville", state: "TN", lat: 35.9544, lng: -83.9295,
    year: 2013, reported: 2016,
    title: "Title IX suit alleging indifference to assaults by athletes",
    type: "Student-on-student (athletics) / institutional",
    summary: "Eight women alleged UT fostered a culture of indifference to sexual assaults by athletes (2013–2015 reports). UT settled for $2.48M in July 2016 without admitting wrongdoing.",
    status: "Settled 2016 ($2.48M), no admission of fault.",
    tracks: [{"track": "civil", "step": 4, "state": "closed", "note": "Settled for $2.48M in July 2016, with no admission of fault.", "short": "Settled ($2.48M)"}],
    statusCategory: "settled",
    affected: 8, payout: 2480000,
    named: [],
    sources: [
      { label: "CNN", url: "https://www.cnn.com/2016/07/05/us/tennessee-title-ix-lawsuit/index.html" },
      { label: "UT announcement", url: "https://news.tennessee.edu/2016/07/05/attorneys-announce-settlement-of-title-ix-lawsuit-against-the-university-of-tennessee/" }
    ]
  },
  {
    id: "fsu-2012",
    clery: "Florida State University|Main Campus",
    school: "Florida State University",
    city: "Tallahassee", state: "FL", lat: 30.4419, lng: -84.2985,
    year: 2012, reported: 2013,
    title: "Title IX suit over handling of a report against a star football player",
    type: "Student-on-student (athletics)",
    summary: "A former student alleged FSU refused to investigate and covered up her December 2012 report. FSU settled for $950,000 in January 2016 and committed to five years of prevention programming. No criminal charges were filed.",
    status: "Settled 2016 ($950K). No criminal charges.",
    tracks: [{"track": "criminal", "step": 2, "state": "closed", "note": "No criminal charges were filed.", "short": "No charges filed"}, {"track": "civil", "step": 4, "state": "closed", "note": "Settled for $950K in January 2016.", "short": "Settled ($950K)"}],
    statusCategory: "settled",
    affected: 1, payout: 950000,
    named: [],
    namingNote: "The accused was never charged; this site does not name him.",
    sources: [
      { label: "NPR", url: "https://www.npr.org/sections/thetwo-way/2016/01/25/464332250/fsu-pays-950-000-to-woman-who-accused-jameis-winston-of-sexual-assault" },
      { label: "Inside Higher Ed", url: "https://www.insidehighered.com/quicktakes/2016/01/26/florida-state-settles-student-sexual-assault-case" }
    ]
  },
  {
    id: "oregon-2014",
    clery: "University of Oregon|",
    school: "University of Oregon",
    city: "Eugene", state: "OR", lat: 44.0448, lng: -123.0726,
    year: 2014, reported: 2014,
    title: "Alleged assault by three basketball players",
    type: "Student-on-student (athletics)",
    summary: "A student alleged she was raped by three basketball players in March 2014. The DA declined charges; the university suspended the players for four years. UO settled her suit for $800,000 plus tuition waiver and adopted a transfer-disciplinary-disclosure policy.",
    status: "Settled 2015 ($800K). DA declined charges; university sanctions imposed.",
    tracks: [{"track": "criminal", "step": 2, "state": "closed", "note": "Lane County DA declined to charge.", "short": "No charges filed"}, {"track": "campus", "step": 3, "state": "closed", "note": "Three players suspended for four years.", "short": "Suspended 4 years"}, {"track": "civil", "step": 4, "state": "closed", "note": "Settled for $800K plus tuition (2015).", "short": "Settled ($800K)"}],
    statusCategory: "settled",
    affected: 1, payout: 800000,
    named: [],
    sources: [
      { label: "ESPN", url: "https://www.espn.com/mens-college-basketball/story/_/id/13377587/university-oregon-settles-lawsuit-rape-allegations" },
      { label: "Courthouse News", url: "https://www.courthousenews.com/uo-student-settles-rape-claims-for-800k/" }
    ]
  },
  {
    id: "dartmouth-pbs",
    clery: "Dartmouth College|Main",
    school: "Dartmouth College",
    city: "Hanover", state: "NH", lat: 43.7044, lng: -72.2887,
    year: 2017, reported: 2018,
    title: "Class action over three psychology professors' sexual misconduct",
    type: "Faculty misconduct",
    summary: "Nine named plaintiffs (plus 65 class members) alleged harassment and assault by three professors in the Department of Psychological and Brain Sciences. A $14M settlement received final approval in 2020; the college admitted no fault.",
    status: "Settled 2020 ($14M). No criminal charges.",
    tracks: [{"track": "civil", "step": 4, "state": "closed", "note": "$14M class settlement approved July 2020. The college admitted no fault.", "short": "Settled ($14M)"}],
    statusCategory: "settled",
    affected: 74, payout: 14000000,
    named: [],
    namingNote: "The professors were not criminally charged; this site does not name them.",
    sources: [
      { label: "VTDigger", url: "https://vtdigger.org/2020/07/17/settlement-in-dartmouth-sexual-misconduct-lawsuit-gets-final-approval/" },
      { label: "The Hill", url: "https://thehill.com/blogs/blog-briefing-room/news/456584-dartmouth-reaches-14-million-settlement-in-sexual-harassment/" }
    ]
  },
  {
    id: "montana-doj",
    clery: "The University of Montana|",
    school: "University of Montana",
    city: "Missoula", state: "MT", lat: 46.8601, lng: -113.9852,
    year: 2010, reported: 2012,
    title: "Federal investigation of university and police response to sexual assault",
    type: "Institutional",
    summary: "After multiple reports (Sept 2010–Dec 2011), some involving football players, the U.S. Department of Justice and Education Department's OCR investigated and in May 2013 entered resolution agreements with UM and its police department. DOJ later reported full implementation.",
    status: "Federal resolution agreements (2013); fully implemented.",
    tracks: [{"track": "federal", "step": 4, "state": "closed", "note": "Resolution agreements signed May 2013. DOJ later reported them fully implemented.", "short": "Reforms completed"}],
    statusCategory: "federal",
    affected: 9, payout: 0,
    named: [],
    sources: [
      { label: "DOJ resolution agreement (PDF)", url: "https://www.justice.gov/sites/default/files/crt/legacy/2013/05/09/montanaagree.pdf" },
      { label: "DOJ press release", url: "https://www.justice.gov/archives/opa/pr/justice-department-announces-university-montana-police-department-has-fully-implemented" }
    ]
  },
  {
    id: "unc-clery",
    clery: "University of North Carolina at Chapel Hill|",
    school: "University of North Carolina at Chapel Hill",
    city: "Chapel Hill", state: "NC", lat: 35.9049, lng: -79.0469,
    year: 2013, reported: 2013,
    title: "Mishandling of sexual-assault reports; under-reporting of campus crime",
    type: "Institutional",
    summary: "Five women's 2013 complaint triggered a six-year federal review that found UNC under-reported crime statistics including sexual assaults (2009–2017) and failed to issue timely warnings. UNC paid $1.5M in 2019 and accepted three years of monitoring.",
    status: "$1.5M federal settlement (2019); monitoring completed.",
    tracks: [{"track": "federal", "step": 4, "state": "closed", "note": "$1.5M settlement (2019), followed by three years of federal monitoring.", "short": "Settled ($1.5M); monitoring done"}],
    statusCategory: "federal",
    affected: 5, payout: 1500000,
    named: [],
    sources: [
      { label: "WRAL", url: "https://www.wral.com/unc-ch-will-pay-1-5m-to-settle-claims-it-violated-crime-reporting-law/19168388/" },
      { label: "Campus Safety Magazine", url: "https://www.campussafetymagazine.com/news/unc-chapel-hill-clery-violations/89625/" }
    ]
  },
  {
    id: "harvard-law-ocr",
    clery: "Harvard University|",
    school: "Harvard Law School",
    city: "Cambridge", state: "MA", lat: 42.3770, lng: -71.1167,
    year: 2012, reported: 2014,
    title: "Federal finding that the law school mishandled sexual-assault complaints",
    type: "Institutional",
    summary: "The Education Department's OCR found in December 2014 that Harvard Law violated Title IX in responding to two student sexual-assault complaints (including a ruling that took over a year). The school agreed to revise policies and re-review complaints from 2012–2014.",
    status: "OCR violation finding; resolution agreement (2014).",
    tracks: [{"track": "federal", "step": 3, "state": "closed", "note": "Violation finding and resolution agreement (Dec 2014).", "short": "Violation found; agreement signed"}],
    statusCategory: "federal",
    affected: 2, payout: 0,
    named: [],
    sources: [
      { label: "TIME", url: "https://time.com/3649858/harvard-law-school-title-ix-sexual-assault/" },
      { label: "Inside Higher Ed", url: "https://www.insidehighered.com/news/2014/12/30/law-school-reaches-agreement-education-department-do-more-protect-victims-sexual" }
    ]
  },
  {
    id: "minnesota-2016",
    clery: "University of Minnesota-Twin Cities|",
    school: "University of Minnesota",
    city: "Minneapolis", state: "MN", lat: 44.9740, lng: -93.2277,
    year: 2016, reported: 2016,
    title: "Alleged group sexual assault involving football players",
    type: "Student-on-student (athletics)",
    summary: "The university's EOAA office found code violations after a September 2016 report and 10 players were suspended; the team briefly threatened a bowl boycott. The county attorney declined charges. An appeals panel upheld sanctions for five players. An outside review found the university followed law and policy.",
    status: "No criminal charges; university discipline upheld for five players.",
    tracks: [{"track": "criminal", "step": 2, "state": "closed", "note": "Hennepin County Attorney declined to charge.", "short": "No charges filed"}, {"track": "campus", "step": 4, "state": "closed", "note": "Appeal panel upheld sanctions for five players and cleared four (2017).", "short": "5 sanctioned, 4 cleared"}, {"track": "civil", "step": 4, "state": "closed", "note": "Suspended players sued the university for discrimination; the suit was dismissed (2023).", "short": "Players' suit dismissed"}],
    statusCategory: "no-charges",
    affected: 1, payout: 0,
    named: [],
    sources: [
      { label: "NPR", url: "https://www.npr.org/sections/thetwo-way/2016/12/16/505837287/university-of-minnesota-football-players-boycott-after-10-teammates-suspended" },
      { label: "ESPN", url: "https://www.espn.co.uk/college-football/story/_/id/18615694/minnesota-panel-upholds-punishment-five-10-football-players-alleged-involvement-sexual-assault" },
      { label: "ESPN (players' suit dismissed)", url: "https://www.espn.com/college-football/story/_/id/35564945/judge-dismisses-ex-minnesota-football-players-discrimination-suit" }
    ]
  },
  {
    id: "byu-2016",
    clery: "Brigham Young University|230038",
    school: "Brigham Young University",
    city: "Provo", state: "UT", lat: 40.2518, lng: -111.6493,
    year: 2016, reported: 2016,
    title: "Honor-code investigations of students who reported sexual assault",
    type: "Institutional",
    summary: "Students and alumni reported that BYU's Title IX office shared information with the Honor Code Office, which then investigated victims. In October 2016 BYU adopted an amnesty clause and all 23 recommendations of an advisory council, separating the two offices.",
    status: "Policy reforms adopted (2016).",
    tracks: [{"track": "campus", "step": 4, "state": "closed", "note": "Policy reform, not a court case: BYU adopted an amnesty clause and separated its Title IX and Honor Code offices (Oct 2016).", "short": "Policy changed"}],
    statusCategory: "federal",
    affected: 1, payout: 0,
    named: [],
    sources: [
      { label: "CBS News", url: "https://www.cbsnews.com/news/brigham-young-university-changes-policy-that-investigated-rape-victims-for-violating-honor-code/" },
      { label: "Deseret News", url: "https://www.deseret.com/2016/10/26/20599069/byu-adopts-amnesty-clause-other-sweeping-changes-to-help-sexual-assault-victims/" }
    ]
  },
  {
    id: "uva-rollingstone",
    clery: "University of Virginia-Main Campus|Main",
    school: "University of Virginia",
    city: "Charlottesville", state: "VA", lat: 38.0336, lng: -78.5080,
    year: 2014, reported: 2014,
    title: "Rolling Stone \"A Rape on Campus\" — story retracted",
    type: "Discredited report",
    summary: "Rolling Stone retracted its November 2014 story in full in April 2015. A jury found the magazine defamed a UVA associate dean with actual malice ($3M verdict, 2016), and the fraternity settled for $1.65M. Included as a reminder that allegations must be verified.",
    status: "Discredited — retracted; publisher found liable for defamation.",
    tracks: [{"track": "civil", "step": 4, "state": "closed", "note": "Story retracted. The magazine lost a $3M defamation verdict (2016) and settled with the fraternity for $1.65M.", "short": "Story retracted; defamation verdict"}],
    statusCategory: "discredited",
    affected: 0, payout: 0,
    named: [],
    sources: [
      { label: "CBS News", url: "https://www.cbsnews.com/news/jury-awards-3-million-to-uva-administrator-in-rolling-stone-magazine-trial-nicole-eramo/" },
      { label: "NPR", url: "https://www.npr.org/sections/thetwo-way/2017/04/12/523527227/rolling-stone-settles-defamation-case-with-former-u-va-associate-dean" }
    ]
  },
  {
    id: "duke-2006",
    clery: "Duke University|",
    school: "Duke University",
    city: "Durham", state: "NC", lat: 36.0014, lng: -78.9382,
    year: 2006, reported: 2006,
    title: "Lacrosse rape accusation — players declared innocent",
    type: "Discredited report",
    summary: "Three lacrosse players were charged in 2006. In April 2007 North Carolina's attorney general declared them innocent, and the district attorney was disbarred for misconduct including withholding DNA evidence. Included as a reminder of why this site does not name people who are only accused.",
    status: "Discredited — defendants declared innocent (2007).",
    tracks: [{"track": "criminal", "step": 3, "state": "closed", "note": "Charges dropped. The NC Attorney General declared the players innocent (April 2007), and the DA was disbarred.", "short": "Charges dropped; declared innocent"}],
    statusCategory: "discredited",
    affected: 0, payout: 0,
    named: [],
    sources: [
      { label: "Britannica", url: "https://www.britannica.com/event/Duke-lacrosse-rape-case" },
      { label: "NPR", url: "https://www.npr.org/2007/06/16/11134497/law-panel-disbars-d-a-in-duke-lacrosse-case" }
    ]
  }
];
