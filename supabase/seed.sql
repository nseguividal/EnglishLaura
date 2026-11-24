-- ============================================================================
-- Seed Data: Cambridge English Exam Preparation (B2 First & C1 Advanced)
-- Run this in Supabase SQL Editor AFTER running supabase/schema.sql
-- ============================================================================

-- ============================================================================
-- B2 FIRST STEPS
-- ============================================================================
insert into public.steps (id, level, step_number, title, description, is_published)
values
  ('10000000-0000-0000-0000-000000000001', 'B2_FIRST', 1, 'Foundations of Reading & Use of English', 'Master B2 Reading Part 5 comprehension, word formation, and key word transformations.', true),
  ('10000000-0000-0000-0000-000000000002', 'B2_FIRST', 2, 'Listening Strategies & Opinion Essays', 'Develop active listening skills and write a well-structured 140–190 word Cambridge B2 essay.', true),
  ('10000000-0000-0000-0000-000000000003', 'B2_FIRST', 3, 'Grammar Precision & Phrasal Verbs', 'Sharpen conditionals, modal verbs of deduction, and high-frequency B2 vocabulary.', true)
on conflict (id) do nothing;

-- ============================================================================
-- C1 ADVANCED STEPS
-- ============================================================================
insert into public.steps (id, level, step_number, title, description, is_published)
values
  ('20000000-0000-0000-0000-000000000001', 'C1_ADVANCED', 1, 'Advanced Lexical Precision & Inference', 'Tackle C1 Reading inference questions and advanced Use of English transformations.', true),
  ('20000000-0000-0000-0000-000000000002', 'C1_ADVANCED', 2, 'Academic Discourse & Formal Proposals', 'Craft persuasive C1 essays (220–260 words) and dissect nuanced listening lectures.', true)
on conflict (id) do nothing;

-- ============================================================================
-- REUSABLE ASSIGNMENTS (B2 FIRST)
-- ============================================================================

-- 1. B2 Reading Passage + Multiple Choice (Split-Screen)
insert into public.assignments (id, title, instructions, level, category, assignment_type, media_type, media_content, is_published)
values (
  'a0000000-0000-0000-0000-000000000001',
  'The Rise of Urban Rooftop Farming',
  'Read the article carefully on the left and answer the multiple-choice questions on the right. Choose the option (A, B, C, or D) that fits best according to the text.',
  'B2_FIRST',
  'READING',
  'INTERACTIVE_EXERCISE',
  'READING_PASSAGE',
  E'For decades, the skylines of major cities were dominated solely by concrete, steel, and glass. Yet over the past fifteen years, an unexpected shade of green has begun to appear atop warehouses, office blocks, and apartment buildings. Urban rooftop farming—once dismissed by sceptics as an eccentric hobby for eco-conscious amateurs—has evolved into a commercially viable sector supplying restaurants and local supermarkets with freshly harvested produce.\n\nProponents argue that the advantages extend far beyond reducing food miles. Rooftop soil acts as natural insulation, lowering summer cooling costs by up to 25 percent while absorbing heavy rainfall that would otherwise overwhelm city drainage systems. In cities such as Montreal and Paris, municipal authorities have even introduced financial incentives encouraging developers to integrate agricultural spaces into new commercial roofs.\n\nNevertheless, establishing a productive farm ten storeys above street level is rarely straightforward. Structural engineers must verify that older roofs can bear the considerable weight of saturated soil, irrigation pipes, and equipment. Furthermore, exposed rooftops experience stronger winds and sharper temperature fluctuations than ground-level plots, forcing growers to select hardy crop varieties and install windbreaks.\n\nDespite these hurdles, many urban agronomists remain optimistic. As hydroponic systems become lighter and more water-efficient, rooftop farms are no longer limited to sturdy industrial buildings. What started as a niche experiment is steadily redefining how dense cities think about food security.',
  true
) on conflict (id) do nothing;

insert into public.questions (id, assignment_id, order_index, question_type, prompt, options, correct_answer, explanation)
values
  (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    0,
    'MULTIPLE_CHOICE',
    'How was urban rooftop farming originally viewed by critics?',
    '["As a profitable alternative to rural agriculture", "As an impractical pastime for enthusiasts", "As a mandatory requirement for new offices", "As a threat to traditional supermarkets"]'::jsonb,
    'As an impractical pastime for enthusiasts',
    'Paragraph 1 states it was "once dismissed by sceptics as an eccentric hobby for eco-conscious amateurs".'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    1,
    'MULTIPLE_CHOICE',
    'Which environmental benefit of rooftop soil is specifically mentioned in the second paragraph?',
    '["It eliminates the need for artificial lighting", "It purifies indoor air inside office blocks", "It helps prevent urban drainage systems from flooding", "It completely replaces air conditioning"]'::jsonb,
    'It helps prevent urban drainage systems from flooding',
    'Paragraph 2 notes that rooftop soil absorbs "heavy rainfall that would otherwise overwhelm city drainage systems".'
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    2,
    'MULTIPLE_CHOICE',
    'Why are urban agronomists optimistic about the future of rooftop farming?',
    '["Older buildings are being demolished more rapidly", "Lighter hydroponic systems expand where farms can be built", "City weather patterns have become milder", "Restaurants are paying double for rooftop vegetables"]'::jsonb,
    'Lighter hydroponic systems expand where farms can be built',
    'The final paragraph explains that lighter, water-efficient hydroponic systems mean rooftop farms are "no longer limited to sturdy industrial buildings".'
  )
on conflict (id) do nothing;

-- 2. B2 Use of English (Parts 2, 3 & 4 — Fill in the Blank with Keywords)
insert into public.assignments (id, title, instructions, level, category, assignment_type, media_type, is_published)
values (
  'a0000000-0000-0000-0000-000000000002',
  'Use of English: Word Formation & Key Word Transformations',
  'Complete each gap accurately. Where a keyword is shown, use the correct form of that word or include it unchanged in your transformation.',
  'B2_FIRST',
  'USE_OF_ENGLISH',
  'INTERACTIVE_EXERCISE',
  'NONE',
  true
) on conflict (id) do nothing;

insert into public.questions (id, assignment_id, order_index, question_type, prompt, accepted_answers, keyword, explanation)
values
  (
    'b0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000002',
    0,
    'FILL_IN_THE_BLANK',
    'Making the right ________ about your university degree can take months of reflection.',
    '["decision"]'::jsonb,
    'DECIDE',
    'Noun form of "decide" is "decision" (collocation: make a decision).'
  ),
  (
    'b0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000002',
    1,
    'FILL_IN_THE_BLANK',
    'The museum exhibition was ________ popular, attracting twice as many visitors as expected.',
    '["surprisingly", "unsurprisingly"]'::jsonb,
    'SURPRISE',
    'An adverb is needed before the adjective "popular". "Surprisingly" fits the unexpected surge in visitors.'
  ),
  (
    'b0000000-0000-0000-0000-000000000006',
    'a0000000-0000-0000-0000-000000000002',
    2,
    'FILL_IN_THE_BLANK',
    'Complete the second sentence using 2–5 words including the keyword: "I regret not booking the train tickets earlier." -> I wish I ________ the train tickets earlier.',
    '["had booked", "''d booked"]'::jsonb,
    'BOOKED',
    'Use "wish + past perfect" (had booked) to express regret about a past action.'
  )
on conflict (id) do nothing;

-- 3. B2 External Link Vocabulary Practice
insert into public.assignments (id, title, instructions, level, category, assignment_type, external_url, media_type, is_published)
values (
  'a0000000-0000-0000-0000-000000000003',
  'B2 Collocations & Idioms Quiz (External)',
  'Open the official Cambridge English practice activity in a new tab, complete all items, and return here to submit your score (as a percentage or fraction such as 16/20).',
  'B2_FIRST',
  'VOCABULARY',
  'EXTERNAL_LINK',
  'https://www.cambridgeenglish.org/learning-english/activities-for-learners/',
  'NONE',
  true
) on conflict (id) do nothing;

-- 4. B2 Listening (Video Embed Split-Screen)
insert into public.assignments (id, title, instructions, level, category, assignment_type, media_type, media_content, is_published)
values (
  'a0000000-0000-0000-0000-000000000004',
  'Listening Practice: Exam Speaking & Listening Tips',
  'Watch the video on the left and answer the comprehension questions on the right. You may pause and replay key sections as needed.',
  'B2_FIRST',
  'LISTENING',
  'INTERACTIVE_EXERCISE',
  'VIDEO_URL',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  true
) on conflict (id) do nothing;

insert into public.questions (id, assignment_id, order_index, question_type, prompt, options, correct_answer, explanation)
values
  (
    'b0000000-0000-0000-0000-000000000007',
    'a0000000-0000-0000-0000-000000000004',
    0,
    'MULTIPLE_CHOICE',
    'What is the best strategy before a Cambridge Listening recording begins?',
    '["Read the questions and underline key words", "Write out full answers in advance", "Skip the instructions completely", "Focus only on the final question"]'::jsonb,
    'Read the questions and underline key words',
    'Underlining keywords helps you predict context and spot distractors while listening.'
  ),
  (
    'b0000000-0000-0000-0000-000000000008',
    'a0000000-0000-0000-0000-000000000004',
    1,
    'MULTIPLE_CHOICE',
    'Why do Cambridge Listening recordings often mention all three multiple-choice options?',
    '["To make the recording longer", "To test whether you recognize distractors and speaker attitude", "Because all three answers are correct", "To confuse native speakers"]'::jsonb,
    'To test whether you recognize distractors and speaker attitude',
    'Cambridge exams deliberately include distractors; listen for qualifiers like "however", "actually", or "I used to think".'
  )
on conflict (id) do nothing;

-- 5. B2 Writing Essay (Open-Ended with Word Counter 140–190)
insert into public.assignments (id, title, instructions, level, category, assignment_type, media_type, is_published)
values (
  'a0000000-0000-0000-0000-000000000005',
  'B2 Writing Part 1: Opinion Essay (Remote Learning)',
  'In your English class you have been talking about online education. Now your teacher has asked you to write an essay (140–190 words). Once submitted, your teacher will grade it and provide detailed feedback, while your next step unlocks immediately.',
  'B2_FIRST',
  'WRITING',
  'INTERACTIVE_EXERCISE',
  'NONE',
  true
) on conflict (id) do nothing;

insert into public.questions (id, assignment_id, order_index, question_type, prompt, min_words, max_words, explanation)
values (
  'b0000000-0000-0000-0000-000000000009',
  'a0000000-0000-0000-0000-000000000005',
  0,
  'OPEN_ENDED',
  E'Essay Prompt: "Is online learning as effective as studying in a traditional classroom?"\n\nWrite about:\n1. Flexibility and convenience\n2. Social interaction with classmates\n3. Your own idea\n\nAim for 140–190 words with clear paragraphs, linking devices, and a balanced conclusion.',
  140,
  190,
  'Evaluated on Cambridge B2 criteria: Content, Communicative Achievement, Organisation, and Language.'
) on conflict (id) do nothing;

-- 6. B2 Grammar Practice (Step 3)
insert into public.assignments (id, title, instructions, level, category, assignment_type, media_type, is_published)
values (
  'a0000000-0000-0000-0000-000000000006',
  'Conditionals & Modals of Deduction',
  'Choose or type the grammatically accurate form for each sentence.',
  'B2_FIRST',
  'GRAMMAR',
  'INTERACTIVE_EXERCISE',
  'NONE',
  true
) on conflict (id) do nothing;

insert into public.questions (id, assignment_id, order_index, question_type, prompt, options, correct_answer, explanation)
values
  (
    'b0000000-0000-0000-0000-000000000010',
    'a0000000-0000-0000-0000-000000000006',
    0,
    'MULTIPLE_CHOICE',
    'Laura''s lights are off and her car is gone. She ________ left for the airport already.',
    '["must have", "can''t have", "should have", "needn''t have"]'::jsonb,
    'must have',
    '"Must have + past participle" expresses strong certainty about a past event based on evidence.'
  ),
  (
    'b0000000-0000-0000-0000-000000000011',
    'a0000000-0000-0000-0000-000000000006',
    1,
    'MULTIPLE_CHOICE',
    'If I ________ more carefully during the exam, I wouldn''t have missed that easy question.',
    '["had read", "read", "would read", "have read"]'::jsonb,
    'had read',
    'Third conditional (unreal past): If + past perfect, would(n''t) have + past participle.'
  )
on conflict (id) do nothing;

-- ============================================================================
-- REUSABLE ASSIGNMENTS (C1 ADVANCED)
-- ============================================================================

-- C1 Reading + Use of English
insert into public.assignments (id, title, instructions, level, category, assignment_type, media_type, media_content, is_published)
values (
  'a0000000-0000-0000-0000-000000000007',
  'C1 Reading: The Architecture of Memory',
  'Read the excerpt on the left and answer the inference and lexical questions on the right.',
  'C1_ADVANCED',
  'READING',
  'INTERACTIVE_EXERCISE',
  'READING_PASSAGE',
  E'Human memory is frequently likened to a digital archive—a vault of pristine recordings awaiting faithful retrieval. Yet cognitive neuroscientists have long dismantled this comforting metaphor. Far from replaying the past verbatim, the brain reconstructs each recollection anew, stitching together sensory fragments with present-day beliefs and emotional states.\n\nThis malleability, though occasionally a source of embarrassing error or unreliable eyewitness testimony, is not an evolutionary flaw. On the contrary, researchers contend that a flexible memory system enables humans to recombine past experiences in order to simulate hypothetical futures. Were our memories rigid and immutable, creative problem-solving and adaptive planning would be severely impoverished.',
  true
) on conflict (id) do nothing;

insert into public.questions (id, assignment_id, order_index, question_type, prompt, options, correct_answer, explanation)
values
  (
    'b0000000-0000-0000-0000-000000000012',
    'a0000000-0000-0000-0000-000000000007',
    0,
    'MULTIPLE_CHOICE',
    'What does the writer imply by calling the digital archive metaphor "comforting"?',
    '["People prefer believing their memories are permanently accurate", "Neuroscientists rely heavily on digital storage", "Modern archives are easier to search than human memory", "Forgetting causes severe emotional distress"]'::jsonb,
    'People prefer believing their memories are permanently accurate',
    'Describing the metaphor as "comforting" implies people take reassurance in believing memory is reliable, even though neuroscience disproves it.'
  ),
  (
    'b0000000-0000-0000-0000-000000000013',
    'a0000000-0000-0000-0000-000000000007',
    1,
    'MULTIPLE_CHOICE',
    'According to the second paragraph, why is the flexibility of human memory advantageous?',
    '["It improves the accuracy of eyewitness accounts", "It allows us to imagine and plan for future scenarios", "It eliminates unwanted emotional fragments", "It stores sensory data more compactly"]'::jsonb,
    'It allows us to imagine and plan for future scenarios',
    'Paragraph 2 explains that a flexible system "enables humans to recombine past experiences in order to simulate hypothetical futures".'
  )
on conflict (id) do nothing;

-- C1 Use of English Inversion & Transformations
insert into public.assignments (id, title, instructions, level, category, assignment_type, media_type, is_published)
values (
  'a0000000-0000-0000-0000-000000000008',
  'C1 Use of English: Inversion & Advanced Idioms',
  'Complete each sentence using 3–6 words including the keyword given. Do not change the keyword.',
  'C1_ADVANCED',
  'USE_OF_ENGLISH',
  'INTERACTIVE_EXERCISE',
  'NONE',
  true
) on conflict (id) do nothing;

insert into public.questions (id, assignment_id, order_index, question_type, prompt, accepted_answers, keyword, explanation)
values
  (
    'b0000000-0000-0000-0000-000000000014',
    'a0000000-0000-0000-0000-000000000008',
    0,
    'FILL_IN_THE_BLANK',
    '"You must not disclose this information under any circumstances." -> Under ________ this information.',
    '["no circumstances must you disclose", "no circumstances should you disclose"]'::jsonb,
    'CIRCUMSTANCES',
    'Negative adverbials at the beginning of a sentence ("Under no circumstances...") require subject-auxiliary inversion ("must you disclose").'
  ),
  (
    'b0000000-0000-0000-0000-000000000015',
    'a0000000-0000-0000-0000-000000000008',
    1,
    'FILL_IN_THE_BLANK',
    '"She had barely arrived at the station when the train departed." -> Hardly ________ at the station when the train departed.',
    '["had she arrived"]'::jsonb,
    'HARDLY',
    '"Hardly + had + subject + past participle ... when ..." is a classic C1 inversion structure.'
  )
on conflict (id) do nothing;

-- C1 Writing Essay (220–260 words)
insert into public.assignments (id, title, instructions, level, category, assignment_type, media_type, is_published)
values (
  'a0000000-0000-0000-0000-000000000009',
  'C1 Writing Part 1: Academic Essay (Public Funding for the Arts)',
  'Write a formal, well-argued C1 essay of 220–260 words addressing two of the three points and explaining which is more significant.',
  'C1_ADVANCED',
  'WRITING',
  'INTERACTIVE_EXERCISE',
  'NONE',
  true
) on conflict (id) do nothing;

insert into public.questions (id, assignment_id, order_index, question_type, prompt, min_words, max_words, explanation)
values (
  'b0000000-0000-0000-0000-000000000016',
  'a0000000-0000-0000-0000-000000000009',
  0,
  'OPEN_ENDED',
  E'Your class has attended a panel discussion on how governments should allocate cultural funding. Write an essay discussing TWO of the following areas and explain which deserves greater public investment:\n• Local museums and heritage sites\n• Arts education in schools\n• Subsidised theatre and concert tickets\n\nTarget length: 220–260 words.',
  220,
  260,
  'Assessed on C1 Advanced criteria: Content, Communicative Achievement, Organisation, and Language.'
) on conflict (id) do nothing;

-- ============================================================================
-- LINK ASSIGNMENTS TO STEPS (step_assignments)
-- ============================================================================
insert into public.step_assignments (step_id, assignment_id, order_index)
values
  -- B2 Step 1
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 0),
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 1),
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 2),
  -- B2 Step 2
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 0),
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 1),
  -- B2 Step 3
  ('10000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000006', 0),
  -- C1 Step 1
  ('20000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 0),
  ('20000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000008', 1),
  -- C1 Step 2
  ('20000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000009', 0)
on conflict (step_id, assignment_id) do nothing;
