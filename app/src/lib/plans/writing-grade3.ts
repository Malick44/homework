// 30 daily writing lessons for a 3rd grader, in six weekly units.
// Follows the grade 3 writing and language standards: opinion, informative and
// narrative writing, plus sentences, punctuation, revising and editing.

export interface PlanLesson { title: string; skill: string; minutes: number; plan: string; steps: string[] }

export const WRITING_GRADE3: PlanLesson[] = [
  // ---- Week 1: Sentences and paragraphs ----
  {
    title: 'What makes a complete sentence', skill: 'Complete sentences', minutes: 25,
    plan: 'A sentence needs a naming part (who or what) and a telling part (what they do or are). Materials: sentence strips or index cards, marker.',
    steps: ['Read 5 examples together and find the naming and telling parts', 'Sort 8 cards into "sentence" or "fragment"', 'Fix 3 fragments by adding the missing part', 'Write 4 complete sentences about your morning'],
  },
  {
    title: 'Four kinds of sentences', skill: 'Sentence types', minutes: 25,
    plan: 'Statements, questions, commands and exclamations, and the end mark each one takes.',
    steps: ['Make a 4-box chart with an example of each kind', 'Play "guess the end mark" with 8 sentences read aloud', 'Write one of each kind about a favorite animal', 'Circle every end mark'],
  },
  {
    title: 'Joining sentences with and, but, so', skill: 'Compound sentences', minutes: 25,
    plan: 'Combine two short sentences with a comma and and/but/so.',
    steps: ['Model: "I was hungry. I made a sandwich." becomes "I was hungry, so I made a sandwich."', 'Combine 6 sentence pairs', 'Talk about when to use but instead of and', 'Write 3 compound sentences of your own'],
  },
  {
    title: 'Capitals and end marks check', skill: 'Capitalization and punctuation', minutes: 20,
    plan: 'Capitals for sentence starts, names, places, days and months. Materials: a short paragraph with 8 mistakes.',
    steps: ['Review the capital letter rules on a small anchor chart', 'Find and fix the 8 mistakes in the practice paragraph', 'Write 3 sentences using a name, a place and a month', 'Swap and check each other’s sentences'],
  },
  {
    title: 'Building a paragraph', skill: 'Paragraphs', minutes: 30,
    plan: 'Topic sentence, three detail sentences, closing sentence. Use the hamburger model (bun, fillings, bun).',
    steps: ['Draw the hamburger and label each part', 'Pick a topic: "My favorite place to play"', 'Write the topic sentence and 3 details', 'Add a closing sentence and read it aloud'],
  },

  // ---- Week 2: Narrative writing ----
  {
    title: 'Finding a small moment to write about', skill: 'Narrative writing', minutes: 25,
    plan: 'Good stories zoom in on one small moment, not a whole day.',
    steps: ['Read a short personal story together', 'Make a list of 5 small moments (a lost tooth, a first swim)', 'Pick one and tell it out loud in 1 minute', 'Jot down who, where and what happened'],
  },
  {
    title: 'Story map: beginning, middle, end', skill: 'Narrative writing', minutes: 25,
    plan: 'Plan the small moment before drafting. Materials: story map sheet with 3 boxes.',
    steps: ['Fill in the beginning: setting and characters', 'Fill in the middle: the problem or exciting part', 'Fill in the end: how it turned out and how you felt', 'Retell the story using only the map'],
  },
  {
    title: 'Hook your reader', skill: 'Narrative writing', minutes: 25,
    plan: 'Try openings that start with a sound, a question, dialogue or action.',
    steps: ['Read 4 story openings and pick a favorite', 'Write 3 different openings for your story', 'Choose the best one', 'Draft the beginning of the story'],
  },
  {
    title: 'Writing dialogue', skill: 'Dialogue', minutes: 30,
    plan: 'Quotation marks around spoken words, a comma before the closing mark, and a new line for each speaker.',
    steps: ['Look at dialogue in a favorite book', 'Punctuate 5 practice lines', 'Try said-alternatives: whispered, shouted, asked', 'Add 2 lines of dialogue to your story'],
  },
  {
    title: 'Time-order words and drafting the ending', skill: 'Transition words', minutes: 30,
    plan: 'First, next, then, after that, later, finally. Use them to move the story along.',
    steps: ['Make a list of time-order words', 'Draft the middle of your story using at least 3', 'Draft the ending: how the problem was solved and how you felt', 'Read the whole draft aloud'],
  },

  // ---- Week 3: Revising and editing a story ----
  {
    title: 'Show, don’t tell', skill: 'Descriptive details', minutes: 25,
    plan: 'Use the five senses. "I was scared" becomes "My hands shook and my heart thumped."',
    steps: ['Turn 4 "telling" sentences into "showing" sentences', 'Make a senses chart for your story’s setting', 'Add 3 sensory details to your draft'],
  },
  {
    title: 'Strong verbs and vivid adjectives', skill: 'Word choice', minutes: 25,
    plan: 'Swap tired words (went, said, good, big) for exact ones. Materials: a children’s thesaurus.',
    steps: ['Brainstorm 5 words to use instead of "went"', 'Circle 5 tired words in your draft', 'Replace each with a stronger word', 'Read the before and after versions'],
  },
  {
    title: 'Revising with ARMS', skill: 'Revising', minutes: 30,
    plan: 'Add, Remove, Move, Substitute. Revising is about making the writing clearer and more interesting.',
    steps: ['Learn the ARMS steps', 'Add one detail', 'Remove one sentence that doesn’t belong', 'Move or swap one part so it flows better'],
  },
  {
    title: 'Editing with CUPS', skill: 'Editing', minutes: 25,
    plan: 'Capitals, Usage, Punctuation, Spelling. Editing fixes mistakes.',
    steps: ['Check capitals with a green pencil', 'Check end marks and quotation marks', 'Circle words that might be misspelled and look them up', 'Read it aloud one last time'],
  },
  {
    title: 'Publish and share your story', skill: 'Narrative writing', minutes: 30,
    plan: 'Write a neat final copy, add an illustration, and read it to someone.',
    steps: ['Copy the story neatly or type it', 'Add a title and a picture', 'Read it aloud to family', 'Ask your listener for one thing they liked'],
  },

  // ---- Week 4: Opinion writing ----
  {
    title: 'Fact or opinion?', skill: 'Opinion writing', minutes: 20,
    plan: 'A fact can be proven. An opinion is what someone thinks or feels.',
    steps: ['Sort 10 statements into fact and opinion', 'Find opinion words: best, worst, should, favorite', 'Write 2 facts and 2 opinions about pizza'],
  },
  {
    title: 'Opinion and reasons (OREO)', skill: 'Opinion writing', minutes: 25,
    plan: 'Opinion, Reasons, Examples, Opinion restated.',
    steps: ['Pick a question: "Should kids have homework?"', 'State your opinion in one sentence', 'List 3 reasons', 'Add an example for each reason'],
  },
  {
    title: 'Linking words for reasons', skill: 'Linking words', minutes: 25,
    plan: 'Because, therefore, since, for example, also, another reason is.',
    steps: ['Make a linking-words bookmark', 'Join 5 opinions to reasons with linking words', 'Use 3 linking words in yesterday’s reasons'],
  },
  {
    title: 'Draft an opinion piece', skill: 'Opinion writing', minutes: 30,
    plan: 'Topic: "The best pet for a family" or a topic of your choice.',
    steps: ['Introduce the topic and state your opinion', 'Write a paragraph for each reason', 'Use at least 3 linking words'],
  },
  {
    title: 'Strong endings and revising opinions', skill: 'Opinion writing', minutes: 30,
    plan: 'A concluding statement restates the opinion in new words and leaves the reader thinking.',
    steps: ['Read 3 example endings and pick the strongest', 'Write your concluding statement', 'Revise with ARMS', 'Edit with CUPS'],
  },

  // ---- Week 5: Informative writing ----
  {
    title: 'Choose a topic and ask questions', skill: 'Informative writing', minutes: 25,
    plan: 'Pick something to teach about, like an animal, planet or sport. Make a KWL chart (Know, Want to know, Learned).',
    steps: ['Choose a topic you’re curious about', 'Fill in what you already Know', 'Write 4 questions you Want to answer'],
  },
  {
    title: 'Research and take notes', skill: 'Note-taking', minutes: 30,
    plan: 'Use 2 kid-friendly sources (library book, encyclopedia site). Take notes as short phrases in your own words.',
    steps: ['Read one section at a time', 'Write key facts as short phrases, not whole sentences', 'Note where each fact came from', 'Fill in the Learned column'],
  },
  {
    title: 'Group your facts', skill: 'Informative writing', minutes: 25,
    plan: 'Sort notes into 3 groups that become sections, for example what it looks like, where it lives, what it eats.',
    steps: ['Cut notes apart or color-code them', 'Sort into 3 groups', 'Give each group a heading'],
  },
  {
    title: 'Draft the report', skill: 'Informative writing', minutes: 30,
    plan: 'Introduce the topic, write a paragraph per heading, include a definition of one special word.',
    steps: ['Write an introduction that grabs interest', 'Write one paragraph for each heading', 'Define one topic word, like "herbivore"', 'Use linking words: also, another, for example'],
  },
  {
    title: 'Text features and conclusion', skill: 'Informative writing', minutes: 30,
    plan: 'Add a title, headings, a labeled diagram or picture with a caption, and a closing section.',
    steps: ['Write a concluding paragraph', 'Draw a diagram with 3 labels', 'Add a caption', 'Edit with CUPS and make a final copy'],
  },

  // ---- Week 6: Letters, poetry and reflection ----
  {
    title: 'Writing a friendly letter', skill: 'Letter writing', minutes: 25,
    plan: 'The five parts: date, greeting, body, closing, signature. Write to a relative or friend.',
    steps: ['Label the 5 parts on a sample letter', 'Write a letter to someone you know', 'Ask them one question in the letter'],
  },
  {
    title: 'Commas in letters and dates', skill: 'Commas', minutes: 20,
    plan: 'Commas in dates (May 4, 2026), greetings (Dear Grandma,), closings (Love,) and addresses (Austin, Texas).',
    steps: ['Fix 8 practice lines with missing commas', 'Check all commas in yesterday’s letter', 'Address an envelope and send the letter'],
  },
  {
    title: 'Poetry: a senses poem', skill: 'Poetry', minutes: 25,
    plan: 'Write a five-senses poem about a season: one line each for see, hear, smell, taste, feel.',
    steps: ['Read 2 short poems aloud and listen for images', 'Brainstorm words for each sense', 'Write the 5-line poem', 'Try an acrostic poem with your name'],
  },
  {
    title: 'Quick-write and reread', skill: 'Writing fluency', minutes: 20,
    plan: 'Build stamina: write for 10 minutes without stopping on a fun prompt, like "If I could shrink to the size of an ant…".',
    steps: ['Set a 10-minute timer and keep writing', 'Count your words', 'Reread and underline your favorite sentence', 'Fix 3 mistakes you spot'],
  },
  {
    title: 'Writing celebration and reflection', skill: 'Publishing', minutes: 30,
    plan: 'Look back at the 6 weeks. Pick a best piece and gather the rest into a writing folder or portfolio.',
    steps: ['Choose your best piece and say why', 'Write 3 sentences: what I learned, what got easier, what I want to try next', 'Make a cover for your writing folder', 'Share your best piece with the family'],
  },
];
