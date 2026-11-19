# Gold Layer City: an anime opening, directed in chat

The [first anime experiment](./post.html?slug=anime-characters-for-our-videos) ended with two characters who could walk, talk and ride a bike. This one asks what they are for. The answer I landed on is a series with its own opening: a night city, a cast, a theme tune, and credits that cut in on the beat, like the start of an anime episode.

This is a Lab entry, so it's a log of what happened, not a tutorial. The pictures below are stills from the opening.

[![Watch the Gold Layer City opening on YouTube (0:47)](./assets/img/posts/gold-layer-city-an-anime-opening-directed-in-chat/01-welcome.jpg)](https://youtu.be/XRFJSl3Wt1w)

[Watch the opening on YouTube (0:47)](https://youtu.be/XRFJSl3Wt1w), or the [vertical cut as a Short](https://youtube.com/shorts/fiJVgD_O47g).

## The idea

One rule, the same as last time: I direct and judge, Claude writes the code. I never opened a file. Everything went through chat: a sentence or two from me, often with a screenshot and a red circle on it, then a new render about 25 minutes later.

The whole film is code. The city, the cars, the camera moves and the credits are drawn by a web page, frame by frame, and turned into a video. Nothing was modelled by hand except the characters, which come from VRoid.

## What I tried

**Three openings first.** I asked for ideas and got three: night falling over the city, the logo unfolding into a tower, and a camera chase through the streets. I had all three built. The chase won because of its camera work, so the other two stopped there.

![The first version of the chase: two characters, a thin tower, signs about data layers](./assets/img/posts/gold-layer-city-an-anime-opening-directed-in-chat/08-first-version.jpg)

**A theme tune from my own PC.** The music is AI-generated with ACE-Step, an open model that runs on an ordinary graphics card. The first batch wasn't good. It took several rounds of samples before one track stuck: a 47-second house tune at 122 beats per minute. From then on the film was cut to that track. The name cards land where the bass drops out, and the flight to the tower starts on the drop.

**A cast of three.** The site has three lanes, and each one got a character:

- **Prof** is the knowledge: she explains why.
- **Nova** is the learner in the Lab: she learns by trying.
- **Kit** is the tools: he builds the thing that makes it work, and arrives on a sport bike.

![Kit's name card, frozen as he rides past](./assets/img/posts/gold-layer-city-an-anime-opening-directed-in-chat/03-kit.jpg)

**Credits you can't miss.** The site's four sections appear as large credits while the camera lifts off the street: Articles, Shorts, Tools, The Lab.

![A section credit during the crane-up, with the tower ahead](./assets/img/posts/gold-layer-city-an-anime-opening-directed-in-chat/04-section-credit.jpg)

## What happened: twenty renders of "that looks off"

Getting a city on screen took one afternoon. Making it look right took the other day and a half. These are the notes that changed the film, roughly in order.

- **Too much about data layers.** The first version put bronze, silver and gold everywhere. But the opening is for the whole of Gold Layer, not one diagram, so most of that came out.
- **Empty streets, then crowded pavements.** First there was nobody around. Then there were people, but also a bench, a bin and a lamppost every few metres. Each got cut back in turn: fewer benches, fewer lampposts, fewer signs.
- **A billboard in the middle of the road.** After a change to the signs, every rooftop billboard ended up at the same spot: the centre of a crossing. The cause was one stray comment in the code that swallowed the line placing them. I only saw it because I watched the video.
- **A walker through a person.** One passer-by walked straight through a woman standing by a shop. The AI found that one itself, in a still frame, and moved her.
- **The tower "doesn't look important".** It began as a thin pole with three slabs on top, then three stacked blocks. It only worked once it became a landmark: far taller than everything else, with light fins, a glowing top and a beam into the sky.

![The tower as three plain blocks, before it became a landmark](./assets/img/posts/gold-layer-city-an-anime-opening-directed-in-chat/06-tower-before.jpg)

- **Gaps in the city.** Bare ground around the tower became a plaza, then parks. The first parks were invisible, hidden behind the buildings in front of them, and had to be regrouped into bigger ones.
- **A rider facing backwards.** Kit's first model sat on the bike the wrong way round. That model is in an older file format where characters face the other direction, and the seating code didn't know.

![An early Kit: sitting backwards, hands short of the bars](./assets/img/posts/gold-layer-city-an-anime-opening-directed-in-chat/07-kit-backwards.jpg)

- **Hands that trailed behind the bike.** The hands were on a springy solver that makes arm movement look natural. On a bike doing 40 km/h the spring lags, so the hands floated behind the bars. Fixed by pinning them to the grips.
- **Hair through an arm, three times.** Prof's long hair kept passing through her sleeve. Two fixes did nothing. The real cause: the model treats each strand as 5 mm thick, and her hair tails are about 9 cm. The centre of the hair stayed clear while its surface didn't.
- **Hair the colour of the street.** Prof's dark blue hair vanished against a dark blue city. She's auburn now.
- **Flickering grass.** In the last shot the parks flickered. Lawn, paths and paving were flat layers a centimetre apart, and from a far camera the renderer couldn't tell which was on top.
- **An ending that just stopped.** The music played at full level to the last half-second and then cut. It now fades over the last three and a half seconds, and the picture fades with it.
- **A credit that read like a handle.** "Created by @goldlayerdata · JP" looked like one long account name. The handle is on the end card anyway, so the credit is now two letters.
- **Widescreen doesn't fit a phone.** The film is 16:9, and Reels and TikTok are vertical. Because the film is code, the vertical cut is a second render with the shots re-framed: characters centred, wider lenses on the moving shots, the end logo stacked. It isn't a crop.

## What it taught me about AI

The AI can't watch the video. It renders the film, pulls still frames out of it, and looks at those. That catches a lot: a sign in the wrong place, a character in the road, a tower hidden behind a building. It misses anything that only shows in motion, like flicker, a hand lagging, or a moment between two sampled frames.

So the work split in a way I didn't expect. The AI was fast and tireless at building, and honest about what it had and hadn't checked. But nearly every fix that mattered began with me pressing play. And when its first fix didn't work, the useful move was to stop adjusting and find the cause: the hair wasn't fixed by a bigger collision shape, it was fixed by reading the model file and finding the 5 mm.

Before publishing I also had it run the checks I would have skipped: a clipping audit on the two leads, a read-through of every sign in the city, and the licence of each character model. The licence check ended with me opening the model maker's terms in my own browser, because their site refused the AI's request.

One more thing worked better than I thought it would: asking for options. Three openings, four rounds of music, two versions of Kit side by side. Choosing between real things was much easier than describing what I wanted up front.

## What's next

The opening needs something to open. Next is a first episode: Prof, Nova and Kit, one idea, two to four minutes.

---

*Credits: characters made with VRoid. Prof and Nova are based on pixiv's VRoid sample models; Kit is a free VRoid project model. Walk cycle from Mixamo motion capture. Music generated locally with ACE-Step. City, cars, camera and credits written in code by Claude.*
