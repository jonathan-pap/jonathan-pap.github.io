# Anime characters for our videos, animated by AI

The Gold Layer videos are motion graphics: a chart, some code, a caption, a logo at the end. They're clear, but nobody remembers a bar chart's face. So I wanted to try characters: anime presenters who can react in a quiz short, talk through the trailer, or race through the data city.

This is a Lab entry, so it's a log, not a how-to. It's still in progress, and most of it is about what went wrong. If you only have a minute, the short at the end puts each mistake next to its fix.

## The idea

Give the videos a cast. Start with one test that's easy to judge: take an existing quiz short, "What does 120 / 0 give you in DAX?", and put a teacher in it who looks at the formula, reacts to the answer, and sells the fix, with the facts kept exactly as they are. If that works, take the same characters into other videos: hosts for the trailer, riders in the data city, and whatever else a video needs.

The rule I set myself: I direct and judge, Claude writes the code. That's the AI part of the experiment.

## What I tried

**Round 0: hand-drawn faces.** Before this experiment, Claude drew characters in code: SVG chibi mascots, then "sensei" teachers with visors and lab coats. Every version looked childish. Coding a face by hand can't reach the quality of a drawn character, however many details you add. I dropped faces entirely and the shorts went back to a faceless logo.

**Round 1: a real character, AI only for motion.** This time the art came from a real tool. VRoid Studio makes anime characters, and they load into a web page with three.js and the three-vrm library. The video renders frame by frame from that page. Claude's job was only the acting: posing the body, aiming the eyes, timing expressions.

![The first look test: the character glances up at a DIVIDE card and smiles](./assets/img/posts/anime-characters-for-our-videos/01-first-look.jpg)

**Round 2: a hologram presenter.** The full DIVIDE quiz with the teacher below it, drawn as cyan line-art with scanlines and a glitch on the "Infinity" reveal. It looked cool for a second, then it just stood there.

![The hologram version: a quiz panel above, the character drawn as a hologram below](./assets/img/posts/anime-characters-for-our-videos/02-hologram.jpg)

**Round 3: a classroom.** Plain cartoon shading instead of the hologram, and two characters: a teacher who writes the formula on a chalkboard while the arm follows the chalk, and a student who asks the question, gets a manga-style shock beat, and celebrates. This was the first version that felt alive.

![The classroom version: the student asks "Gloves sold zero, so what's the Avg Price?"](./assets/img/posts/anime-characters-for-our-videos/03-classroom.jpg)

**Round 4: our own teacher.** The sample models wore school uniforms, which is wrong for a data channel. So we made "the Gold Layer teacher" in VRoid Studio: navy blazer with gold buttons, adult proportions. Claude built it by driving VRoid Studio with simulated clicks and keystrokes, from a build sheet we wrote together. The teacher then presents the quiz on a holographic stage, walks in, points at the zero, and facepalms at Infinity.

![The Gold Layer teacher presenting the DIVIDE fix on a holo panel](./assets/img/posts/anime-characters-for-our-videos/04-own-teacher.jpg)

**Round 5: beyond the quiz.** With a teacher that worked, the characters moved into other kinds of video.

- **Costumes:** a costume layer recolours the outfits in brand colours at render time, so one model can play different roles.
- **Hosts for the trailer:** two characters, Prof and Nova, talking through the Gold Layer trailer while clips of it play beside them.
- **Gestures:** a library of 20 named hand gestures, so a host stops repeating the same wave.
- **The race:** the two of them racing light bikes through the isometric data city from the trailer, ending in the logo.

![The gesture lab: twenty named gestures, here "shrug"](./assets/img/posts/anime-characters-for-our-videos/05-gesture-lab.jpg)

![The light-bike race through the data city](./assets/img/posts/anime-characters-for-our-videos/06-city-race.jpg)

## What happened: the challenges

The hard part was never getting a character on screen. It was making it look right.

- **Hand-coded faces look childish.** No amount of detail fixed it. The fix was to stop drawing and use an art tool.
- **The first poses were wrong.** Arms stuck out at the sides, and the first "happy" was a full laugh at a division result. Toning everything down to about half made it believable.
- **Hair and cloth broke video rendering.** The renderer jumps to any frame in any order, but hair physics depends on the frames before it. Each frame now replays the physics from the start, so frame 300 always looks the same.
- **A hologram is a still image with effects.** The scanlines didn't hide that nothing moved. The cartoon classroom with two characters interacting worked far better.
- **Looking at things is harder than it sounds.** If the panel the teacher talks about sits behind the character, the head turns all the way round to look at it. The panel has to float in front.
- **Clipping.** In one over-the-shoulder shot a strand of hair passes through the teacher's arm. It's still there.
- **Stand-in characters.** Free models come in school uniforms or random outfits. A real teacher meant building one in VRoid Studio, and VRoid has no API: Claude drove it with simulated clicks and keystrokes. That worked, slowly, with quirks (typing 35 into a slider meant for -1 to 1 broke the model). When it started recolouring a dress click by click, I stopped it, and the outfits became a costume layer in code instead.
- **Repetitive hands.** My note after the first talking version: "the hand and arm gestures are very repetitive and sometimes unnatural." Hence the gesture library, with a rule never to repeat the same gesture twice in a row.
- **Two hosts is harder than one.** With two characters talking, every flaw doubles. My note was to focus on one character first and get the motion right there.
- **Bikes that weren't bikes.** The first ride put the characters on glowing sleds. They had to become real sport bikes, with the riders sitting on the seat and their hands on the grips.
- **Licences.** Every model has its own terms. One requires a credit on screen, the others don't. Music needs a credit line too. That's now a checklist item for every render.

## What's next

Put the characters to work in real videos: a teacher version of the DIVIDE short next to the original, to see which one people watch longer, and hosts for the next trailer. Action scenes are already in testing too, like a fight with fighting-game touches and walking from motion capture instead of hand-written formulas. The hair clipping still comes first.

## What it taught us about AI

The AI wrote every line of motion code, but the parts that made it look right were human: the characters came from a real art tool, and every "that looks off" came from a person watching.

---

*Credits: student character "Seed-san" © VirtualCast, Inc. Teacher model built in VRoid Studio. Other characters: pixiv's VRoid sample model and VRoid CC0 models from OpenGameArt. Music in the short: "Steps On Clouds" by < e s c p > (CC BY 4.0). Voice in the short: AI (Kokoro).*
