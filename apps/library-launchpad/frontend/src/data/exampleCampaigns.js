import { ALICE_ESCAPE_PLAN } from './aliceEscapePlan'
// Pre-built example campaigns shown to guest users (no API cost)

// Featured campaigns shown in sidebar for anon users
export const featuredCampaigns = [
  {
    topic: "Project Hail Mary",
    media: [
      { title: "Project Hail Mary", author: "Andy Weir", media_type: "book", cover_url: "https://covers.openlibrary.org/b/id/11200092-M.jpg", openlibrary_key: "/works/OL21745884W" },
      { title: "The Martian", author: "Andy Weir", media_type: "book", cover_url: "https://covers.openlibrary.org/b/id/8319240-M.jpg", openlibrary_key: "/works/OL19645747W" },
    ],
    cards: [
      {
        id: "featured_1_0", card_type: "display", pinned: true, position: 0,
        content: {
          headline: "Save the World. Start Here.",
          description: "A dramatic space-themed display: black tablecloth as deep space, LED string lights as stars, and printed planet cutouts at varying heights. Feature Project Hail Mary front and center alongside The Martian, The Expanse series, and other sci-fi standouts. A small whiteboard asks visitors: 'If you had one shot to save Earth, would you take it?'",
          materials: ["Black velvet tablecloth", "Warm-white LED string lights", "Printed planet cutouts (cardboard, various sizes)", "Astronaut helmet prop", "Lab coat + clipboard", "Small whiteboard + markers"],
          layout: "Central easel holds Project Hail Mary. The Martian and other sci-fi flank both sides on tiered risers. Stars drape overhead. Whiteboard stands to the left for visitor responses."
        }
      },
      {
        id: "featured_1_1", card_type: "shelf_talker", pinned: false, position: 1,
        content: {
          headline: "FROM THE AUTHOR OF THE MARTIAN",
          body: "Ryland Grace wakes up alone on a spaceship. He's the only survivor on a desperate, last-chance mission to save Earth — and he can't even remember his own name. Funny, whip-smart, and impossible to put down. If you laughed your way through The Martian, this one goes even harder.",
          call_to_action: "Grab it before it launches off the shelf!"
        }
      },
      {
        id: "featured_1_2", card_type: "escape_room", pinned: false, position: 2,
        content: {
          concept: "The Hail Mary has locked you out of navigation. Astrophage creatures are multiplying in the engine bay. You have 45 minutes before the ship loses power permanently. Decode Ryland Grace's scrambled research notes, solve the Astrophage containment sequence, and reprogram the nav computer using the alien cipher Rocky left behind.",
          puzzles: [
            "Astrophage Feed Rate: Calculate the correct energy absorption ratio from lab notes with missing numbers — the answer is the combination to the supply locker",
            "Rocky's Cipher: Translate a musical-frequency code into English using a provided tone chart. The decoded message reveals the nav override command.",
            "The Volatile Alkali Lock: Three jars of chemicals on the shelf. Mixing the correct two produces a color that matches the code panel. The wrong mix 'overheats' (a timer penalty)."
          ],
          difficulty: "Hard",
          duration: "45 minutes"
        }
      },
      {
        id: "featured_1_3", card_type: "social_media", pinned: false, position: 3,
        content: {
          headline: "🪐 Would you save the world alone?",
          instagram: "One man. One ship. Zero memory. Project Hail Mary is the sci-fi book that made us cry on page 300. If you haven't read it yet — we're jealous. Get it at your library. #ProjectHailMary #BookTok #SciFi #LibraryReads #AndyWeir",
          facebook: "If you loved The Martian, Andy Weir's newest will wreck you (in the best way). Project Hail Mary is available now — plus a space-themed display, a STEM night, and an escape room inspired by the book. Come check it out.",
          tiktok: "POV: You wake up on a spaceship, you're the only survivor, and Earth is counting on you. That's Project Hail Mary. That's the whole book. And it's incredible. #BookTok #ProjectHailMary #SciFiBooks"
        }
      },
      {
        id: "featured_1_4", card_type: "program", pinned: false, position: 4,
        content: {
          headline: "Science of Project Hail Mary Night",
          description: "A hands-on STEM evening exploring the real science behind the book. Guests rotate through stations: build a model of the Hail Mary from recycled materials, run a light-absorption experiment inspired by Astrophage, and debate whether they'd take the one-way mission. Snacks are 'space rations' (freeze-dried fruit and Tang).",
          audience: "Ages 12+ and curious adults",
          duration: "2 hours",
          supplies: ["Cardboard + foil + tape for ship models", "Flashlights + colored cellophane for Astrophage demo", "Printed debate prompt cards", "Freeze-dried fruit, Tang, astronaut ice cream"]
        }
      },
      {
        id: "featured_1_5", card_type: "signage", pinned: false, position: 5,
        content: {
          headline: "WOULD YOU TAKE THE MISSION?",
          subtext: "One chance. One crew. One planet to save. Project Hail Mary — the book everyone's talking about.",
          style: "Deep space background, white bold text, minimal. A tiny astronaut silhouette for scale."
        }
      },
      {
        id: "featured_1_6", card_type: "program", pinned: false, position: 6,
        content: {
          headline: "Sci-Fi Book Club: The Martian → Project Hail Mary",
          description: "A two-session book club reading Andy Weir's two biggest hits back to back. Session 1: The Martian (survival, humor, science). Session 2: Project Hail Mary (first contact, sacrifice, friendship). Discussion questions provided. Spoiler-free zone for session 1.",
          audience: "Adults",
          duration: "2 sessions × 90 minutes",
          supplies: ["Discussion question printouts", "Name tags", "Coffee and cookies"]
        }
      },
      {
        id: "featured_1_7", card_type: "display", pinned: false, position: 7,
        content: {
          headline: "The One-Book-Author That Changed Sci-Fi",
          description: "A 'Read Alike' display pairing Project Hail Mary with books that share its DNA: survival stories, first contact tales, and science-driven adventures. Each book has a handwritten recommendation card with a one-line pitch.",
          materials: ["Handwritten recommendation cards", "Small easel stands", "Category dividers (Survival / First Contact / Hard Science)"],
          layout: "Three columns on a low table. Each column is a category. Project Hail Mary sits at the top center as the anchor."
        }
      }
    ],
    relevant_dates: [
      { date: "September — Library Card Sign-Up Month", reason: "Perfect tie-in for new readers" },
      { date: "Andy Weir's birthday (June 16)", reason: "Author spotlight display" },
      { date: "October 4 — World Space Week", reason: "Space-themed programming tie-in" },
      { date: "January — New Year's Reading Challenge", reason: "Start the year with a page-turner" },
    ],
    cross_media_connections: [
      { title: "Artemis", author: "Andy Weir", connection: "Same author — heist on the Moon", cover_url: "https://covers.openlibrary.org/b/id/8235551-M.jpg" },
      { title: "The Egg and Other Stories", author: "Andy Weir", connection: "Same author — short fiction", cover_url: "https://covers.openlibrary.org/b/id/13608030-M.jpg" },
      { title: "Contact", author: "Carl Sagan", connection: "First contact, science-driven survival", cover_url: "https://covers.openlibrary.org/b/id/4143957-M.jpg" },
      { title: "Leviathan Wakes", author: "James S.A. Corey", connection: "Space opera, crew dynamics", cover_url: "https://covers.openlibrary.org/b/id/7314237-M.jpg" },
    ],
  },
  {
    topic: "Fall Into Reading: Spooky Season",
    media: [
      { title: "Mexican Gothic", author: "Silvia Moreno-Garcia", media_type: "book", cover_url: "https://covers.openlibrary.org/b/id/10422324-M.jpg", openlibrary_key: "/works/OL20233344W" },
      { title: "Coraline", author: "Neil Gaiman", media_type: "book", cover_url: "https://covers.openlibrary.org/b/id/12781632-M.jpg", openlibrary_key: "/works/OL15000984W" },
      { title: "Coraline", author: "Henry Selick", media_type: "movie", cover_url: null, openlibrary_key: null },
    ],
    cards: [
      {
        id: "featured_2_0", card_type: "display", pinned: true, position: 0,
        content: {
          headline: "Something Wicked This Way Reads",
          description: "An atmospheric October display with black lace, battery-operated candles, and fog machine wisps. Books arranged by scare level: 'Mildly Uneasy' to 'Sleep With The Lights On.' A hand-lettered sign reads: 'Every book on this table will make you check behind the shower curtain.'",
          materials: ["Black lace table runner", "Battery-operated taper candles (set of 6)", "Mini fog machine", "Hand-lettered scare-o-meter sign", "Faux cobwebs"],
          layout: "Books grouped by scare level on three tiers. Candles flank the center stack. Fog machine hidden behind the display, venting low. Scare-o-meter sign on a small easel."
        }
      },
      {
        id: "featured_2_1", card_type: "shelf_talker", pinned: false, position: 1,
        content: {
          headline: "THE HOUSE IS ALIVE",
          body: "Noemí's cousin is trapped in a decaying mansion in the Mexican countryside. The walls breathe. The mold whispers. And the family that owns the house has no intention of letting anyone leave. Mexican Gothic is gothic horror at its absolute best — lush, creepy, and completely unputdownable.",
          call_to_action: "Dare to check it out."
        }
      },
      {
        id: "featured_2_2", card_type: "escape_room", pinned: false, position: 2,
        content: {
          concept: "The Other Mother has stolen your real parents and replaced them with button-eyed copies. You have 45 minutes to find three hidden eyes scattered around the library before the door between worlds closes forever. Each eye is locked behind a puzzle inspired by Neil Gaiman's Coraline.",
          puzzles: [
            "The Cat's Riddle: A black cat plushie sits in the children's section with a tag that reads a riddle. The answer points to the shelf where Eye #1 is hidden inside a hollowed book.",
            "The Other Flat: A mirror in the display room has words written backwards. Hold up the provided mirror-card to read the message — it reveals the location of Eye #2 behind a specific movie case.",
            "The Well: A painted paper 'well' sits in the center of the room with 13 stones inside, each numbered. Arrange them by a sequence found on the wall to spell a Dewey Decimal number. That shelf holds Eye #3."
          ],
          difficulty: "Medium",
          duration: "45 minutes"
        }
      },
      {
        id: "featured_2_3", card_type: "social_media", pinned: false, position: 3,
        content: {
          headline: "🎃 Your October TBR just got darker",
          instagram: "We made a Spooky Season display and it goes from 'mildly uneasy' to 'sleep with the lights on.' Our top pick: Mexican Gothic. The house is alive. The mold talks. You won't sleep. You're welcome. #SpookySeason #MexicanGothic #BookTok #LibraryHalloween",
          facebook: "October reading challenge: Can you handle our scare-o-meter? We've got gothic horror, haunted houses, and a Coraline escape room for the kids. Come pick your poison — the display is up through Halloween.",
          tiktok: "Rating our Spooky Season display from 1 to 'I'm sleeping with the lights on.' Number 1: Mexican Gothic. The house breathes. THE HOUSE BREATHES. #SpookySeason #BookTok #MexicanGothic #HorrorBooks"
        }
      },
      {
        id: "featured_2_4", card_type: "program", pinned: false, position: 4,
        content: {
          headline: "Coraline Movie Night + Craft",
          description: "Screen Coraline on the big screen while kids make their own 'Other World' door out of cardboard, paint, and tiny buttons. Parents get hot cider and a reading list of adult gothic novels. Costumes encouraged — best button-eyed costume wins a prize.",
          audience: "Families (ages 6+)",
          duration: "2.5 hours",
          supplies: ["Projector + screen", "Small cardboard rectangles (door blanks)", "Acrylic paint + brushes", "Assorted buttons + hot glue guns", "Hot cider + cups", "Prize: library tote bag with bookmarks"]
        }
      },
      {
        id: "featured_2_5", card_type: "signage", pinned: false, position: 5,
        content: {
          headline: "SPOOKY SEASON IS HERE",
          subtext: "October 1–31. Creepy reads, haunted escapes, and a movie night with the Other Mother. Start at the display. End at the checkout desk.",
          style: "Black background, dripping orange text, small spiderweb accents in corners"
        }
      },
      {
        id: "featured_2_6", card_type: "program", pinned: false, position: 6,
        content: {
          headline: "Flashlight Fright Night: After-Hours Read-Aloud",
          description: "After the library closes, guests gather in the darkened reading room with flashlights. Staff reads the first chapter of three spooky novels — guests vote on which one gets added to the display. The winning author gets a 'Staff Pick' card.",
          audience: "Ages 10+",
          duration: "1 hour",
          supplies: ["Flashlights (extras for kids)", "Three spooky novel excerpts (printed)", "Ballot cards", "Battery candles for ambiance"]
        }
      },
      {
        id: "featured_2_7", card_type: "display", pinned: false, position: 7,
        content: {
          headline: "Haunted Houses: A Reading List",
          description: "A companion display of books where the house is the villain. From The Haunting of Hill House to Mexican Gothic to The Shining — every book has a small card with the house's 'crimes' listed.",
          materials: ["Miniature house props (dollhouse, birdhouse)", "Crime cards (handwritten)", "Red string connecting related books"],
          layout: "Books arranged in a rough house shape (triangle top, rectangular base). String connects books that share themes. Crime cards dangle from the string."
        }
      }
    ],
    relevant_dates: [
      { date: "October 31 — Halloween", reason: "Peak spooky display season" },
      { date: "October — Teen Read Week", reason: "Horror YA tie-in" },
      { date: "September 21 — Fall Equinox", reason: "Seasonal display changeover" },
      { date: "Friday the 13th (any)", reason: "Social media content hook" },
    ],
    cross_media_connections: [
      { title: "The Haunting of Hill House", author: "Shirley Jackson", connection: "Classic haunted house fiction", cover_url: "https://covers.openlibrary.org/b/id/4289014-M.jpg" },
      { title: "Dracula", author: "Bram Stoker", connection: "Gothic horror classic", cover_url: "https://covers.openlibrary.org/b/id/12216503-M.jpg" },
      { title: "Something Wicked This Way Comes", author: "Ray Bradbury", connection: "Dark autumn carnival tale", cover_url: "https://covers.openlibrary.org/b/id/9346340-M.jpg" },
    ],
  },
  {
    topic: "Summer Reading Program 2026",
    media: [
      { title: "The Wild Robot", author: "Peter Brown", media_type: "book", cover_url: "https://covers.openlibrary.org/b/id/8320245-M.jpg", openlibrary_key: "/works/OL17518078W" },
      { title: "Moana", author: "Disney", media_type: "movie", cover_url: null, openlibrary_key: null },
      { title: "Animal Crossing: New Horizons", author: "Nintendo", media_type: "game", cover_url: null, openlibrary_key: null },
    ],
    cards: [
      {
        id: "featured_3_0", card_type: "display", pinned: true, position: 0,
        content: {
          headline: "Unplug & Unwind: Your Summer Starts Here",
          description: "A beach-vibes summer display: paper palm trees, fairy lights, and a real hammock chair for reading. Books span nature, adventure, and 'books that feel like a vacation.' A chalkboard sign says: 'No Wi-Fi? No Problem. You've got a library card.'",
          materials: ["Paper palm trees (3ft tall)", "Warm fairy lights", "Hammock chair (thrift store find)", "Faux tropical plants", "Chalkboard sign", "Sand-colored tablecloth"],
          layout: "Hammock chair in center flanked by two palm trees. Books fanned on tiered risers. Fairy lights woven through the palms. Chalkboard sign at eye level."
        }
      },
      {
        id: "featured_3_1", card_type: "shelf_talker", pinned: false, position: 1,
        content: {
          headline: "THE ROBOT WHO LEARNED TO FEEL",
          body: "Roz washes ashore on a remote island with no memory and no instructions. The animals want her gone. But she's resourceful, patient, and surprisingly tender. The Wild Robot is a story about finding your place in a world that wasn't built for you — and it will make you ugly-cry on page 197.",
          call_to_action: "Read it before the sequel takes over."
        }
      },
      {
        id: "featured_3_2", card_type: "escape_room", pinned: false, position: 2,
        content: {
          concept: "The summer reading log has been sabotaged. Someone swapped all the checkout dates, scrambled the patron names, and hid the prize certificates. You have 30 minutes to decode the logbook, find the missing prizes, and crown the Summer Reading Champion before the end-of-summer party starts.",
          puzzles: [
            "Barcode Braille: The logbook barcodes have dots punched through them — read them as Braille to get the first patron's real name",
            "Date Swap Decoder: The checkout dates are all prime numbers. Map each prime to a letter using a provided chart. The resulting word is the combination to the prize cabinet.",
            "The Missing Bookmark: A bookmark in the returned books has a map of the library drawn on the back. X marks the hidden prize box."
          ],
          difficulty: "Easy",
          duration: "30 minutes"
        }
      },
      {
        id: "featured_3_3", card_type: "program", pinned: false, position: 3,
        content: {
          headline: "Robot Craft Night",
          description: "Build your own Wild Robot out of recycled materials. We read key scenes from the book while kids construct their Roz from boxes, foil, and googly eyes. The best robot wins a copy of the sequel. Adults can build too — no judgment.",
          audience: "Ages 7-12 (adults welcome)",
          duration: "90 minutes",
          supplies: ["Cardboard boxes (various sizes)", "Aluminum foil rolls", "Markers + paint pens", "Googly eyes (bulk pack)", "Hot glue guns + sticks", "Scissors + tape"]
        }
      },
      {
        id: "featured_3_4", card_type: "social_media", pinned: false, position: 4,
        content: {
          headline: "☀️ Summer reading just leveled up",
          instagram: "POV: You just discovered your library has a summer reading challenge with actual prizes. Read 5 books? Get a tote. Read 10? Become a legend. The Wild Robot is on the display and it WILL make you cry. #SummerReading #LibraryLife #TheWildRobot #BookTok",
          facebook: "Summer Reading Challenge 2026 starts June 1! Sign up at the front desk or scan the QR code on our beach-themed display. Prizes for all ages. This year's pick: The Wild Robot — the book that made half our staff cry.",
          tiktok: "Building a robot out of cardboard at the library because The Wild Robot made me feel things. This is what summer reading looks like. #SummerReading #TheWildRobot #LibraryPrograms #BookTok"
        }
      },
      {
        id: "featured_3_5", card_type: "signage", pinned: false, position: 5,
        content: {
          headline: "SUMMER READING CHALLENGE",
          subtext: "June 1 – August 15. Read. Log. Win. Repeat. 5 books = tote bag. 10 books = legend status. Sign up at the front desk.",
          style: "Bright gradient (coral to gold), hand-drawn sun and wave accents, bold white text"
        }
      },
      {
        id: "featured_3_6", card_type: "program", pinned: false, position: 6,
        content: {
          headline: "Moana Movie & Craft Night",
          description: "Screen Moana on the big screen while families make ocean slime and paper leis. Tie-in with our ocean adventure book display. We're also debuting a new island-themed escape room for kids who finish early. Snacks: popcorn and blue 'ocean water' punch.",
          audience: "Families",
          duration: "2.5 hours",
          supplies: ["Projector + screen", "Glue + saline + baking soda + food coloring (slime)", "Tissue paper + string (leis)", "Popcorn machine", "Blue Kool-Aid + Sprite (punch)"]
        }
      },
      {
        id: "featured_3_7", card_type: "display", pinned: false, position: 7,
        content: {
          headline: "Books That Play Like Video Games",
          description: "A crossover display pairing books with video games that share themes. The Wild Robot + Animal Crossing (nature + building). Ender's Game + Halo (space strategy). The Hobbit + Zelda (adventure quests). Each pair has a card explaining the connection.",
          materials: ["Game controller cutouts", "LED strip lights (green)", "Console-shaped bookends (DIY from foam board)", "Connection cards (printed)"],
          layout: "Three-tier display. Top: book. Middle: game case. Bottom: connection card. LED strips under each tier for glow effect."
        }
      }
    ],
    relevant_dates: [
      { date: "June 1 — Summer Reading Kickoff", reason: "Program launch date" },
      { date: "May — Get Caught Reading Month", reason: "Pre-summer buzz building" },
      { date: "July 4 week", reason: "Vacation reading push" },
      { date: "August — Back to School", reason: "Last-chance reading challenge" },
    ],
    cross_media_connections: [
      { title: "The One and Only Ivan", author: "Katherine Applegate", connection: "Animal friendship, illustrated novel", cover_url: "https://covers.openlibrary.org/b/id/12656488-M.jpg" },
      { title: "Hatchet", author: "Gary Paulsen", connection: "Survival adventure, kid protagonist", cover_url: null },
      { title: "Wings of Fire: The Dragonet Prophecy", author: "Tui T. Sutherland", connection: "Epic fantasy, young readers", cover_url: "https://covers.openlibrary.org/b/id/13460810-M.jpg" },
    ],
  },
  {
    topic: "Banned Books Week",
    media: [
      { title: "The Hate U Give", author: "Angie Thomas", media_type: "book", cover_url: "https://covers.openlibrary.org/b/id/8310850-M.jpg", openlibrary_key: "/works/OL18010246W" },
      { title: "Maus", author: "Art Spiegelman", media_type: "book", cover_url: "https://covers.openlibrary.org/b/id/12782978-M.jpg", openlibrary_key: "/works/OL1148659W" },
      { title: "Fahrenheit 451", author: "Ray Bradbury", media_type: "book", cover_url: "https://covers.openlibrary.org/b/id/8763058-M.jpg", openlibrary_key: "/works/OL46940W" },
    ],
    cards: [
      {
        id: "featured_4_0", card_type: "display", pinned: true, position: 0,
        content: {
          headline: "Read the Books They Don't Want You to Read",
          description: "A dramatic black-and-red display with caution tape stretched across the front, redacted document props, and challenged books sealed in evidence-bag sleeves. Each book has a 'Case File' card listing where and why it was challenged, with a pull quote from the actual challenge complaint. A sign at the top reads CLASSIFIED in stencil font.",
          materials: ["Yellow caution tape", "Evidence bag book sleeves (clear, zip-top)", "LED battery candles (red)", "Printed 'Case File' cards", "CLASSIFIED stencil banner", "Black tablecloth"],
          layout: "Books in a pyramid under the CLASSIFIED banner. Candles on either side. Case File cards fanned in front. Caution tape criss-crosses across the base."
        }
      },
      {
        id: "featured_4_1", card_type: "shelf_talker", pinned: false, position: 1,
        content: {
          headline: "BANNED IN 12 STATES",
          body: "This book has been pulled from school libraries in Texas, Florida, Utah, and nine other states. It also won the National Book Award, spent 80 weeks on the bestseller list, and sold 2 million copies. Funny how that works. Read it and decide for yourself — that's the whole point.",
          call_to_action: "Pick a banned book this week."
        }
      },
      {
        id: "featured_4_2", card_type: "escape_room", pinned: false, position: 2,
        content: {
          concept: "Someone has been censoring the library catalog. Entire sections are blacked out. Every book in the YA section has been replaced with a blank notebook. A whistleblower left clues hidden inside challenged books around the library. You have 60 minutes to find the cipher key, decode the real catalog, and restore the banned books before the censor returns.",
          puzzles: [
            "Blackout Poetry: A page from a challenged book has 90% of its words redacted with black marker. The remaining visible words spell a shelf location in the nonfiction section. That shelf holds Clue #2.",
            "The Challenge Log: Three book challenge report forms are pinned to a corkboard. Each has a different date. Cross-reference the dates with a 'Banned Books Timeline' poster on the wall — the year they were all challenged is the combination to the locked file cabinet.",
            "The Redacted Catalog: Inside the file cabinet is the real library catalog with Dewey Decimal numbers, but every third digit is smudged. Use the pattern from the challenge log dates to fill in the missing digits. The restored catalog reveals which books are hidden and where."
          ],
          difficulty: "Hard",
          duration: "60 minutes"
        }
      },
      {
        id: "featured_4_3", card_type: "social_media", pinned: false, position: 3,
        content: {
          headline: "📖 They banned it. We're featuring it.",
          instagram: "They tried to ban this book from 47 schools. It sold 2 million copies anyway. This week we're featuring every banned and challenged book in our collection — because the best response to censorship is a library card. #BannedBooksWeek #FreedomToRead #ReadBannedBooks #LibraryLife",
          facebook: "Over 5,000 book challenges were reported last year. Banned Books Week starts today. Come see our display of the most challenged books of 2025 — each with a 'Case File' showing exactly who tried to remove it and why. Pick a side. Read a banned book.",
          tiktok: "POV: A school board bans your favorite book so you check out three copies from the library out of spite. Happy Banned Books Week. #BannedBooks #ReadBannedBooks #BannedBooksWeek #LibraryTikTok"
        }
      },
      {
        id: "featured_4_4", card_type: "program", pinned: false, position: 4,
        content: {
          headline: "Banned Books Read-Out",
          description: "An open-mic evening where community members read 3-minute passages from their favorite banned or challenged books. Each reader gets a 'This Book Was Banned' sticker. We provide book excerpts for people who didn't bring their own. Snacks and cider. Best reading wins a banned books tote bag.",
          audience: "All ages",
          duration: "2 hours",
          supplies: ["Microphone + portable speaker", "Printed excerpt sheets (10 titles)", "Banned Books Week stickers (bulk)", "Cider + cups + cookies", "Banned books tote bags (3 prizes)"]
        }
      },
      {
        id: "featured_4_5", card_type: "signage", pinned: false, position: 5,
        content: {
          headline: "5,000+ CHALLENGES LAST YEAR",
          subtext: "Banned Books Week · September 22-28. These books were challenged in libraries just like ours. Pick a banned book. Read it. Decide for yourself.",
          style: "Bold red and black. Stencil-style text. A faded redacted bar across 'CHALLENGES' as if someone tried to censor the sign itself."
        }
      },
      {
        id: "featured_4_6", card_type: "display", pinned: false, position: 6,
        content: {
          headline: "Graphic Novels: Art They Tried to Silence",
          description: "A companion display of frequently challenged graphic novels — Maus, Persepolis, Gender Queer, Fun Home, and The Handmaid's Tale (graphic adaptation). Each open book on an easel has a challenge card with the reason it was banned and a single pull quote that proves why it matters.",
          materials: ["Mini display easels (5)", "Challenge cards (printed, laminated)", "Pull quote tent cards"],
          layout: "Five easels in a gentle arc. Each holds an open graphic novel. Challenge card to the left, pull quote tent card to the right. Small sign: 'Every one of these was called inappropriate. Every one won an award.'"
        }
      },
      {
        id: "featured_4_7", card_type: "program", pinned: false, position: 7,
        content: {
          headline: "Censorship in the Digital Age: A Community Panel",
          description: "Local educators, authors, and librarians sit on a moderated panel discussing the rise of book challenges, digital censorship, classroom restrictions, and what communities can actually do about it. 45 minutes of discussion, 30 minutes of audience Q&A. Handouts with local advocacy resources provided.",
          audience: "Adults and teens 16+",
          duration: "90 minutes",
          supplies: ["Panel table + chairs (4-5 panelists)", "Wireless microphones (2)", "Laptop + projector for slides", "Printed advocacy resource handouts", "Name tent cards for panelists"]
        }
      }
    ],
    relevant_dates: [
      { date: "September — Banned Books Week", reason: "Annual awareness campaign" },
      { date: "February — Black History Month", reason: "Spotlight diverse voices" },
      { date: "April 2 — International Children's Book Day", reason: "YA literature celebration" },
      { date: "October — National Reading Group Month", reason: "Book club tie-in" },
    ],
    cross_media_connections: [
      { title: "1984", author: "George Orwell", connection: "Most banned book of all time", cover_url: "https://covers.openlibrary.org/b/id/9267242-M.jpg" },
      { title: "To Kill a Mockingbird", author: "Harper Lee", connection: "Racial injustice, frequently banned", cover_url: "https://covers.openlibrary.org/b/id/12784310-M.jpg" },
      { title: "The Handmaid's Tale", author: "Margaret Atwood", connection: "Banned dystopian classic", cover_url: "https://covers.openlibrary.org/b/id/2943057-M.jpg" },
      { title: "Beloved", author: "Toni Morrison", connection: "Banned Pulitzer winner", cover_url: "https://covers.openlibrary.org/b/id/8261367-M.jpg" },
    ],
  },
  {
    topic: "Alice in Wonderland",
    target_audience: "Kids (6-12)",
    budget: "$50 — Small Event",
    media: [
      { title: "Alice's Adventures in Wonderland / Through the Looking Glass", author: "Lewis Carroll", media_type: "book", cover_url: "https://covers.openlibrary.org/b/id/8595966-M.jpg", openlibrary_key: "/works/OL151411W" },
      { title: "Alice's Adventures in Wonderland", author: "Lewis Carroll", media_type: "book", cover_url: "https://covers.openlibrary.org/b/id/10527843-M.jpg", openlibrary_key: "/works/OL138052W" },
      { title: "Alice in Wonderland in Five Acts", author: "Lewis Carroll", media_type: "book", cover_url: "https://covers.openlibrary.org/b/id/13805873-M.jpg", openlibrary_key: "/works/OL13101191W" },
      { title: "Lewis Carroll's Alice in Wonderland", author: "Jane Carruth", media_type: "book", cover_url: "https://covers.openlibrary.org/b/id/8177839-M.jpg", openlibrary_key: "/works/OL5400023W" },
      { title: "Alice in Wonderland", author: "Gemma Louise Lowe", media_type: "book", cover_url: "https://covers.openlibrary.org/b/id/8470182-M.jpg", openlibrary_key: "/works/OL19355954W" },
      { title: "Alice in Wonderland [adaptation]", author: "Joan Collins", media_type: "book", cover_url: "https://covers.openlibrary.org/b/id/8596385-M.jpg", openlibrary_key: "/works/OL14953096W" },
    ],
    cards: [
      {
        id: "featured_7_0", card_type: "display", pinned: true, position: 0,
        content: {
          headline: "Follow Alice Down the Rabbit Hole!",
          description: "Transform reading corner with cardboard tunnel entrance, playing card bunting, and mushroom seats made from storage ottomans with red paper tops. Add 'Drink Me' and 'Eat Me' labels on bookends.",
          materials: ["Large cardboard box", "Playing cards", "Red construction paper", "Existing ottomans", "Book collection", "Printable labels"],
          layout: "Create tunnel entrance with box, arrange books in a winding path leading to a cozy reading nook decorated with paper flowers and flamingo cutouts."
        }
      },
      {
        id: "featured_7_1", card_type: "shelf_talker", pinned: false, position: 1,
        content: {
          headline: "Curiouser and Curiouser!",
          body: "Join Alice on the most famous tumble in literature! Meet the Cheshire Cat, attend a mad tea party, and play croquet with the Queen of Hearts in this timeless tale of wonder."
        }
      },
      {
        id: "featured_7_2", card_type: "escape_room", pinned: false, position: 2,
        content: {
          concept: "Kids must solve the Mad Hatter's riddles to find their way back home from Wonderland before the Queen of Hearts arrives",
          puzzles: [
            "Decode the Cheshire Cat's disappearing message using a mirror",
            "Arrange tea party settings in correct order from the story",
            "Match playing card characters to their crimes from the trial scene"
          ],
          difficulty: "Easy",
          duration: "30 minutes"
        },
        full_plan: ALICE_ESCAPE_PLAN
      },
      {
        id: "featured_7_3", card_type: "social_media", pinned: false, position: 3,
        content: {
          headline: "We're all mad here! 🎩🐇",
          instagram: "We're all mad here! 🎩🐇 Join us for our Alice in Wonderland celebration — tea parties, riddles, and reading adventures await! #AliceInWonderland #KidsPrograms #LibraryMagic #CuriouserAndCuriouser",
          facebook: "Mad Hatter Tea Party this Saturday! Kids ages 6-12 can join Alice for an afternoon of riddles, stories, and pretend tea. Registration required — spots filling up fast! Call or stop by to reserve your seat at our very merry un-birthday party.",
          tiktok: "POV: You fall down a rabbit hole and end up at the most chaotic tea party ever. The Mad Hatter won't stop asking riddles. The Queen is screaming. You love it. #AliceInWonderland #LibraryPrograms #KidsActivities"
        }
      },
      {
        id: "featured_7_4", card_type: "signage", pinned: false, position: 4,
        content: {
          headline: "You're Invited to a Very Merry Un-Birthday Party!",
          subtext: "Join the Mad Hatter, March Hare, and Alice for riddles, stories, and pretend tea! Ages 6-12. Bring your curiosity and imagination!",
          call_to_action: "Register at the Children's Desk or call (555) 123-BOOK"
        }
      },
      {
        id: "featured_7_5", card_type: "program", pinned: false, position: 5,
        content: {
          name: "Mad Hatter's Very Merry Un-Birthday Tea Party",
          description: "Kids solve riddles, play Wonderland games like musical chairs to 'A Very Merry Un-Birthday,' create paper top hats, and enjoy story time with Alice excerpts. End with group recitation of Jabberwocky tongue twisters.",
          audience: "Kids ages 6-12",
          duration: "90 minutes",
          supplies: ["Construction paper", "Glue sticks", "Crayons", "Plastic tea cups", "Crackers", "Juice boxes", "Printed riddle cards"]
        }
      },
      {
        id: "featured_7_6", card_type: "display", pinned: false, position: 6,
        content: {
          headline: "Help the Queen's Gardeners!",
          description: "Set up coloring station with white paper roses that kids can color red, pink, or any color they choose. Include quote cards with favorite Alice lines and display finished artwork on bulletin board shaped like rose garden.",
          materials: ["White paper rose templates", "Red crayons/markers", "Bulletin board", "Green paper for stems", "Quote printouts"],
          layout: "Low table with art supplies, wall display shaped like garden with branches and leaves. Finished roses go up on the board throughout the day."
        }
      },
      {
        id: "featured_7_7", card_type: "program", pinned: false, position: 7,
        content: {
          name: "Wonderland Character Costume Parade",
          description: "Kids create simple costumes using craft supplies — rabbit ears, playing card tunics, top hats, crown headbands. Practice character voices and parade around library with story snippets about each character.",
          audience: "Families with kids 6-12",
          duration: "45 minutes",
          supplies: ["Cardboard", "Construction paper", "Headbands", "Safety scissors", "Markers", "Tape", "Character voice cards"]
        }
      },
    ],
    relevant_dates: [
      { date: "January 27 — Lewis Carroll's Birthday", reason: "Perfect time to celebrate the author with Alice-themed activities" },
      { date: "July 4 — Alice's Day (Publication Anniversary)", reason: "Alice's Adventures in Wonderland was published July 4, 1865" },
      { date: "March — Mad Hatter Day (10/6)", reason: "Celebrate the Mad Hatter's hat size with tea party events" },
      { date: "April — National Library Week", reason: "Classic literature celebration perfect for Alice displays" },
      { date: "September — Back to School", reason: "Alice's curiosity and learning adventures resonate with new school year" },
      { date: "October — Halloween", reason: "Wonderland's whimsical characters perfect for costume events" },
    ],
    cross_media_connections: [
      { title: "Alice in Wonderland (Disney 1951)", year: 1951, author: null, connection: "Classic animated adaptation of Carroll's story", cover_url: "https://covers.openlibrary.org/b/id/1817779-M.jpg", openlibrary_key: "/works/OL15155594W" },
      { title: "The Phantom Tollbooth", year: 1961, author: null, connection: "Similar nonsense adventure through magical world", cover_url: "https://covers.openlibrary.org/b/id/8578174-M.jpg", openlibrary_key: "/works/OL1636262W" },
      { title: "The Lion, the Witch and the Wardrobe", year: 1950, author: null, connection: "Children discovering magical world through portal", cover_url: "https://covers.openlibrary.org/b/id/8441376-M.jpg", openlibrary_key: "/works/OL71037W" },
      { title: "Matilda", year: 1988, author: null, connection: "Another classic by author who loved wordplay and imagination", cover_url: "https://covers.openlibrary.org/b/id/12889769-M.jpg", openlibrary_key: "/works/OL45846W" },
      { title: "Alice: Madness Returns", year: 2011, author: null, connection: "Video game sequel exploring darker Wonderland themes", cover_url: "https://covers.openlibrary.org/b/id/8619343-M.jpg", openlibrary_key: "/works/OL16212528W" },
    ],
  }
]

export const exampleCampaigns = [
  {
    topic: "Summer Reading Program",
    media: [
      { title: "The Wild Robot", author: "Peter Brown", media_type: "book", cover_url: null, openlibrary_key: null },
      { title: "Moana", author: "Disney", media_type: "movie", cover_url: null, openlibrary_key: null },
      { title: "Animal Crossing", author: "Nintendo", media_type: "game", cover_url: null, openlibrary_key: null },
    ],
    cards: [
      {
        id: "demo_1_0",
        card_type: "display",
        pinned: false,
        position: 0,
        content: {
          headline: "Unplug & Unwind: Summer Adventures Await",
          description: "A nature-themed display with paper palm trees, beach props, and a hammock reading nook. Feature books about summer, adventure, and outdoor exploration.",
          materials: ["Cardboard palm trees", "Beach towels", "Fairy lights", "Printed book covers", "Faux tropical plants"],
          layout: "Central hammock chair flanked by two tree displays. Books fanned out on a sand-colored tablecloth."
        }
      },
      {
        id: "demo_1_1",
        card_type: "shelf_talker",
        pinned: false,
        position: 1,
        content: {
          headline: "BEACH READ ALERT",
          body: "If you loved Where the Crawdads Sing, you'll devour this story of a girl who befriends a wild robot on a remote island. Grab it before someone else does!"
        }
      },
      {
        id: "demo_1_2",
        card_type: "escape_room",
        pinned: false,
        position: 2,
        content: {
          headline: "The Lost Library Card",
          concept: "A mysterious patron checked out 13 books exactly 13 years ago and never returned them. Can you decode the cryptic checkout slip and find the missing collection before the summer deadline?",
          puzzles: [
            "Dewey Decimal Cipher: Use the decimal numbers from the checkout slip as a substitution cipher key",
            "Spine Poetry Trail: Arrange 5 books so their spine titles form a sentence revealing the next clue location"
          ],
          difficulty: "Medium",
          duration: "45 minutes"
        }
      },
      {
        id: "demo_1_3",
        card_type: "social_media",
        pinned: false,
        position: 3,
        content: {
          headline: "Summer Reading Social Campaign",
          instagram: "POV: You just discovered your library has a secret summer program. Read 5 books, earn prizes. Read 10, become a legend. #SummerReading #LibraryLife",
          facebook: "Summer Reading Challenge is HERE! Sign up at the front desk or scan the QR code on our Summer Adventure Wall. Prizes for all ages!",
          tiktok: "Show us your summer TBR stack! Tag us for a chance to win a library tote bag full of ARCs. #BookTok #SummerReading"
        }
      },
      {
        id: "demo_1_4",
        card_type: "signage",
        pinned: false,
        position: 4,
        content: {
          headline: "SUMMER READING CHALLENGE",
          subtext: "June 1 – August 15. Read. Log. Win. Repeat. Sign up at the front desk.",
          call_to_action: "Scan to join today"
        }
      },
      {
        id: "demo_1_5",
        card_type: "program",
        pinned: false,
        position: 5,
        content: {
          headline: "Robot Craft Night",
          description: "Build your own Wild Robot out of recycled materials while we read excerpts from the book. Perfect for ages 7-12.",
          audience: "Ages 7-12",
          duration: "90 minutes",
          supplies: ["Cardboard boxes", "Aluminum foil", "Markers", "Googly eyes", "Glue guns"]
        }
      },
      {
        id: "demo_1_6",
        card_type: "display",
        pinned: false,
        position: 6,
        content: {
          headline: "Game Night Picks: Books That Play Like Video Games",
          description: "Crossover display featuring books that share themes with popular video games. Side-by-side comparisons drive checkouts from both gamers and readers.",
          materials: ["Game controller cutouts", "LED strip lights", "Console-shaped bookends"],
          layout: "Three-tier display. Left: book. Right: game poster. Bottom: recommendation cards."
        }
      },
      {
        id: "demo_1_7",
        card_type: "program",
        pinned: false,
        position: 7,
        content: {
          headline: "Moana Movie & Craft Night",
          description: "Screen Moana on the big screen while kids make ocean slime and paper leis. Tie-in with our ocean adventure book display.",
          audience: "Families",
          duration: "2.5 hours",
          supplies: ["Projector", "Glue + saline + baking soda", "Tissue paper + string", "Popcorn"]
        }
      }
    ],
    relevant_dates: [
      { date: "June 1 — Summer Reading Kickoff", reason: "Program launch date" },
      { date: "May — Get Caught Reading Month", reason: "Pre-summer buzz building" },
      { date: "July 4 week", reason: "Vacation reading push" },
      { date: "August — Back to School", reason: "Last-chance reading challenge" },
    ],
    cross_media_connections: [
      { title: "The One and Only Ivan", author: "Katherine Applegate", connection: "Animal friendship, illustrated novel", cover_url: "https://covers.openlibrary.org/b/id/12656488-M.jpg" },
      { title: "Hatchet", author: "Gary Paulsen", connection: "Survival adventure, kid protagonist", cover_url: null },
      { title: "Wings of Fire: The Dragonet Prophecy", author: "Tui T. Sutherland", connection: "Epic fantasy, young readers", cover_url: "https://covers.openlibrary.org/b/id/13460810-M.jpg" },
    ],
  },
  {
    topic: "Banned Books Week",
    media: [
      { title: "The Hate U Give", author: "Angie Thomas", media_type: "book", cover_url: null, openlibrary_key: null },
      { title: "Maus", author: "Art Spiegelman", media_type: "book", cover_url: null, openlibrary_key: null },
      { title: "Fahrenheit 451", author: "Ray Bradbury", media_type: "book", cover_url: null, openlibrary_key: null },
    ],
    cards: [
      {
        id: "demo_2_0",
        card_type: "display",
        pinned: false,
        position: 0,
        content: {
          headline: "Read the Books They Don't Want You to Read",
          description: "A dramatic black-and-red display with faux banned tape, redacted document props, and challenged books wrapped in evidence-bag sleeves.",
          materials: ["Caution tape", "Evidence bag sleeves", "LED candles", "Challenge statistics printout"],
          layout: "Books in a pyramid under a CLASSIFIED banner. Each book has a card listing why it was challenged."
        }
      },
      {
        id: "demo_2_1",
        card_type: "shelf_talker",
        pinned: false,
        position: 1,
        content: {
          headline: "BANNED IN 12 STATES",
          body: "This book has been removed from school libraries across the country. It's also won the National Book Award. Read it and decide for yourself."
        }
      },
      {
        id: "demo_2_2",
        card_type: "social_media",
        pinned: false,
        position: 2,
        content: {
          headline: "Banned Books Social Push",
          instagram: "They banned this book from 47 schools. It sold 2 million copies anyway. Pick a banned book this week. #BannedBooksWeek #FreedomToRead",
          facebook: "5,000+ book challenges reported last year alone. Banned Books Week starts today. Come see our display of the most challenged books of the year.",
          tiktok: "POV: You find out your favorite book was banned. Time to read it again. #BannedBooks #ReadBannedBooks"
        }
      },
      {
        id: "demo_2_3",
        card_type: "signage",
        pinned: false,
        position: 3,
        content: {
          headline: "BANNED BOOKS WEEK",
          subtext: "September 22-28. 5,000+ challenges last year. Pick a side. Read a banned book.",
          call_to_action: "See the display near the entrance"
        }
      },
      {
        id: "demo_2_4",
        card_type: "program",
        pinned: false,
        position: 4,
        content: {
          headline: "Banned Books Read-Out",
          description: "Community members read passages from their favorite banned or challenged books. Open mic format. Snacks provided.",
          audience: "All ages",
          duration: "90 minutes",
          supplies: ["Microphone", "Book excerpt printouts", "Name tags", "Cookies"]
        }
      },
      {
        id: "demo_2_5",
        card_type: "escape_room",
        pinned: false,
        position: 5,
        content: {
          headline: "The Redacted Report",
          concept: "Someone has been censoring the library catalog. Entire sections are blacked out. A whistleblower left clues hidden in the pages of challenged books. Can you restore the catalog before the censors return?",
          puzzles: [
            "Blackout Poetry: A redacted page from a banned book — the remaining visible words spell a location in the library",
            "The Challenge Log: Cross-reference three challenge reports to find the date that reveals the combination to the locked drawer"
          ],
          difficulty: "Hard",
          duration: "60 minutes"
        }
      },
      {
        id: "demo_2_6",
        card_type: "display",
        pinned: false,
        position: 6,
        content: {
          headline: "Graphic Novels: Art That Speaks Volumes",
          description: "Feature graphic novels that have been frequently challenged. Include Maus, Persepolis, and Gender Queer with context cards.",
          materials: ["Display easels", "Reading glasses prop", "Challenge cards"],
          layout: "Easel stands with open graphic novels. Each has a challenge card with the reason for banning and a pull quote."
        }
      },
      {
        id: "demo_2_7",
        card_type: "program",
        pinned: false,
        position: 7,
        content: {
          headline: "Censorship in the Digital Age: A Panel",
          description: "Local educators, authors, and librarians discuss the rise of book challenges, digital censorship, and what communities can do. Q&A follows.",
          audience: "Adults",
          duration: "90 minutes",
          supplies: ["Panel table", "Microphones", "Presentation slides", "Handouts"]
        }
      }
    ],
    relevant_dates: [
      { date: "September — Banned Books Week", reason: "Annual awareness campaign" },
      { date: "February — Black History Month", reason: "Spotlight diverse voices" },
      { date: "April 2 — International Children's Book Day", reason: "YA literature celebration" },
      { date: "October — National Reading Group Month", reason: "Book club tie-in" },
    ],
    cross_media_connections: [
      { title: "1984", author: "George Orwell", connection: "Most banned book of all time", cover_url: "https://covers.openlibrary.org/b/id/9267242-M.jpg" },
      { title: "To Kill a Mockingbird", author: "Harper Lee", connection: "Racial injustice, frequently banned", cover_url: "https://covers.openlibrary.org/b/id/12784310-M.jpg" },
      { title: "The Handmaid's Tale", author: "Margaret Atwood", connection: "Banned dystopian classic", cover_url: "https://covers.openlibrary.org/b/id/2943057-M.jpg" },
      { title: "Beloved", author: "Toni Morrison", connection: "Banned Pulitzer winner", cover_url: "https://covers.openlibrary.org/b/id/8261367-M.jpg" },
    ],
  }
]

export function getRandomExample() {
  const idx = Math.floor(Math.random() * exampleCampaigns.length)
  const campaign = exampleCampaigns[idx]
  return {
    ...campaign,
    campaign_id: `demo_${idx}`,
    isExample: true,
  }
}
