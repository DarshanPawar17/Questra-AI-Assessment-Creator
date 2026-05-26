import { GoogleGenerativeAI } from '@google/generative-ai';
import { ISection, QuestionType, IQuestion } from '../models/Assignment';

// Helper mock generator for fallback
const generateMockQuestions = (
  title: string,
  subject: string,
  grade: string,
  questionTypes: QuestionType[],
  totalQuestions: number,
  totalMarks: number,
  additionalInstructions?: string
): ISection[] => {
  const sections: ISection[] = [];
  const difficultyOptions: ('Easy' | 'Moderate' | 'Hard')[] = ['Easy', 'Moderate', 'Hard'];
  
  // Calculate division
  const questionsPerSection = Math.ceil(totalQuestions / Math.max(1, questionTypes.length));
  let questionsCreated = 0;
  let remainingMarks = totalMarks;

  questionTypes.forEach((type, index) => {
    if (questionsCreated >= totalQuestions) return;

    const sectionTitle = `Section ${String.fromCharCode(65 + index)}: ${type} Questions`;
    const questionsToCreate = Math.min(questionsPerSection, totalQuestions - questionsCreated);
    const marksPerQuestion = Math.max(1, Math.floor(remainingMarks / (totalQuestions - questionsCreated)));

    const questionsList: IQuestion[] = Array.from({ length: questionsToCreate }).map((_, qIdx) => {
      questionsCreated++;
      const currentMarks = questionsCreated === totalQuestions ? remainingMarks : marksPerQuestion;
      remainingMarks -= currentMarks;

      const difficulty = difficultyOptions[qIdx % 3];

      let options: string[] | undefined;
      let correctAnswer = '';

      if (type === 'MCQ') {
        options = [
          `Option A: Core concepts of ${title}`,
          `Option B: Secondary properties of ${subject}`,
          `Option C: Advanced implementation of ${grade} level subjects`,
          `Option D: None of the above`
        ];
        correctAnswer = 'Option A: Core concepts of ' + title;
      } else if (type === 'TrueFalse') {
        options = ['True', 'False'];
        correctAnswer = 'True';
      } else {
        correctAnswer = `Grading Guide: Student response must detail the historical context, main theories, and practical applications of ${title} appropriate for a ${grade} standard in ${subject}.`;
      }

      return {
        text: `Explain or identify the significance of ${title} in relation to ${subject} topics at a ${grade} level (Question ${questionsCreated}).`,
        difficulty,
        marks: currentMarks,
        type,
        options,
        correctAnswer
      };
    });

    sections.push({
      title: sectionTitle,
      instruction: `Attempt all questions in this section. Each question carries ${marksPerQuestion} marks. ${additionalInstructions || ''}`,
      questions: questionsList
    });
  });

  return sections;
};

export const generateQuestionsAI = async (params: {
  title: string;
  subject: string;
  grade: string;
  questionTypes: QuestionType[];
  totalQuestions: number;
  totalMarks: number;
  creativity?: number; // 0 to 1
  additionalInstructions?: string;
  sourceText?: string;
}): Promise<ISection[]> => {
  const {
    title,
    subject,
    grade,
    questionTypes,
    totalQuestions,
    totalMarks,
    creativity = 0.7,
    additionalInstructions,
    sourceText
  } = params;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY' || apiKey === '') {
    console.warn('GEMINI_API_KEY is not set or placeholder. Falling back to mock generator.');
    // Delay slightly to simulate AI generation latency
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return generateMockQuestions(title, subject, grade, questionTypes, totalQuestions, totalMarks, additionalInstructions);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-1.5-flash which is very fast and supports structured JSON outputs
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: creativity, // creativity maps directly to temperature (0.0 to 1.0)
      },
    });

    const prompt = `
      You are an expert exam creator. Generate a structured question paper.
      
      Topic/Title: "${title}"
      Subject: "${subject}"
      Grade Level: "${grade}"
      Question Types Required: ${questionTypes.join(', ')}
      Total Number of Questions: ${totalQuestions}
      Total Marks: ${totalMarks}
      ${additionalInstructions ? `Additional Instructions for Exam: "${additionalInstructions}"` : ''}
      ${sourceText ? `Source Reference Content to base questions on:\n"""\n${sourceText}\n"""` : ''}

      INSTRUCTIONS:
      1. Divide the questions logically into Sections (e.g. "Section A", "Section B" based on question types or general groupings).
      2. The sum of the marks of all questions across all sections MUST EXACTLY equal ${totalMarks}.
      3. The total number of questions across all sections MUST EXACTLY equal ${totalQuestions}.
      4. Assign a difficulty level to each question: 'Easy', 'Moderate', or 'Hard'.
      5. The question types must only be from the requested list: ${questionTypes.join(', ')}.
         - For 'MCQ': Provide an 'options' array containing exactly 4 options, and set 'correctAnswer' to the exact correct option text.
         - For 'TrueFalse': Provide an 'options' array containing exactly ["True", "False"], and set 'correctAnswer' to either "True" or "False".
         - For 'Descriptive': Do not provide 'options'. Set 'correctAnswer' to a short 1-2 sentence grading guideline/criteria for teachers.
      6. Return ONLY a valid JSON object matching the TypeScript type ISection[] inside a parent object with key "sections". Do not include markdown code block formatting like \`\`\`json. Just raw JSON.

      Target JSON Format:
      {
        "sections": [
          {
            "title": "Section A: Multiple Choice Questions",
            "instruction": "Attempt all questions. Each carries X marks.",
            "questions": [
              {
                "text": "The question text goes here...",
                "difficulty": "Easy", // Must be one of: "Easy", "Moderate", "Hard"
                "marks": 5,
                "type": "MCQ", // Must match the question type
                "options": ["Option 1", "Option 2", "Option 3", "Option 4"], // Required only for MCQ/TrueFalse
                "correctAnswer": "Option 1" // Required
              }
            ]
          }
        ]
      }
    `;

    console.log(`Sending prompt to Gemini for assignment: "${title}" (Creativity/Temp: ${creativity})...`);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log('Gemini generation completed. Parsing response...');
    
    // Safety clean-up if the model wrapped it in markdown codeblocks anyway
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }

    const parsedData = JSON.parse(cleanedText) as { sections: ISection[] };
    
    if (!parsedData || !Array.isArray(parsedData.sections)) {
      throw new Error('AI output did not contain a valid sections array.');
    }

    // Schema formatting, validation, and normalization
    let actualQuestionCount = 0;
    let actualMarksSum = 0;

    const validatedSections = parsedData.sections.map((section, sIdx) => {
      const title = section.title || `Section ${String.fromCharCode(65 + sIdx)}`;
      const instruction = section.instruction || 'Attempt all questions.';
      
      const questions = (section.questions || []).map((q) => {
        actualQuestionCount++;
        actualMarksSum += q.marks || 0;
        
        let diff: 'Easy' | 'Moderate' | 'Hard' = 'Moderate';
        if (q.difficulty && ['Easy', 'Moderate', 'Hard'].includes(q.difficulty)) {
          diff = q.difficulty as 'Easy' | 'Moderate' | 'Hard';
        }

        let qType: QuestionType = 'Descriptive';
        if (q.type && ['MCQ', 'TrueFalse', 'Descriptive'].includes(q.type)) {
          qType = q.type as QuestionType;
        }

        return {
          text: q.text || 'Question text could not be generated.',
          difficulty: diff,
          marks: typeof q.marks === 'number' && q.marks > 0 ? q.marks : 2,
          type: qType,
          options: q.options,
          correctAnswer: q.correctAnswer
        };
      });

      return { title, instruction, questions };
    });

    console.log(`Validated generated paper: Questions: ${actualQuestionCount} (target: ${totalQuestions}), Marks: ${actualMarksSum} (target: ${totalMarks})`);
    
    return validatedSections;
  } catch (error) {
    console.error('Error generating questions with Gemini, falling back to mock generator:', error);
    return generateMockQuestions(title, subject, grade, questionTypes, totalQuestions, totalMarks, additionalInstructions);
  }
};

// --- AI TEACHER TOOLKIT GENERATION UTILITIES ---

// Fallback Mock Rubric Maker
const generateMockRubric = (title: string, grade: string) => {
  return {
    title,
    grade,
    criteria: [
      {
        name: "Content & Subject Knowledge",
        maxPoints: 10,
        levels: [
          { name: "Excellent", points: 10, description: "Demonstrates complete understanding of the topic with thorough, accurate, and original details." },
          { name: "Good", points: 8, description: "Demonstrates a solid understanding of the topic with only minor errors or omissions." },
          { name: "Basic", points: 6, description: "Demonstrates basic conceptual understanding, but has multiple inaccuracies or gaps." },
          { name: "Below Standard", points: 4, description: "Fails to meet basic assignment requirements and shows poor understanding of concepts." }
        ]
      },
      {
        name: "Structure & Organization",
        maxPoints: 10,
        levels: [
          { name: "Excellent", points: 10, description: "Logically organized with smooth transitions, a strong introduction, and a cohesive conclusion." },
          { name: "Good", points: 8, description: "Clear organizational structure with only minor lapses in transition or paragraph flow." },
          { name: "Basic", points: 6, description: "Somewhat disjointed with weak transitions, making structural flow difficult to trace." },
          { name: "Below Standard", points: 4, description: "Lacks clear organization, causing content to appear completely disjointed and confusing." }
        ]
      },
      {
        name: "Clarity & Mechanics",
        maxPoints: 5,
        levels: [
          { name: "Excellent", points: 5, description: "Free from grammatical, spelling, or punctuation errors. Written with sophisticated style." },
          { name: "Good", points: 4, description: "Contains 1-3 minor mechanical errors that do not distract from readability or meaning." },
          { name: "Basic", points: 3, description: "Contains multiple mechanical errors that occasionally hinder comprehension." },
          { name: "Below Standard", points: 1.5, description: "Dominated by mechanical errors, rendering the text extremely difficult to read." }
        ]
      }
    ]
  };
};

// Fallback Mock Lesson Planner
const generateMockLessonPlan = (topic: string, grade: string, duration: string) => {
  return {
    topic,
    grade,
    duration,
    objectives: [
      `Define and explain the core principles of ${topic} appropriate for ${grade}.`,
      `Identify the real-world applications and significance of ${topic}.`,
      `Formulate answers to basic problem sheets analyzing ${topic}.`
    ],
    materials: [
      `Printed slides outlining key concepts of ${topic}`,
      `Handout worksheet containing practice problems and questions`,
      `Whiteboard markers and student notebook journals`
    ],
    activities: [
      { name: "Introduction & Warm-up", duration: "10 minutes", description: `Introduce the core topic of ${topic}. Review prior concepts from previous lectures to hook students.` },
      { name: "Core Concept Presentation", duration: "20 minutes", description: `Deliver the main points of the ${topic} syllabus, using visual slides, whiteboard diagrams, and class discussion.` },
      { name: "Guided Group Activity", duration: "15 minutes", description: `Divide students into small groups to work through the practice problems on the ${topic} worksheet together.` },
      { name: "Wrap-up & Exit Ticket", duration: "5 minutes", description: `Synthesize today's lesson. Administer a quick 1-question check for understanding (exit ticket).` }
    ],
    homework: `Complete practice exercise questions 1-5 on page 78 of the ${topic} workbook guide.`
  };
};

// Call Gemini to generate a structured Rubric
export const generateRubricAI = async (params: { title: string; grade: string }): Promise<any> => {
  const { title, grade } = params;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY' || apiKey === '') {
    console.warn('GEMINI_API_KEY is not set or placeholder. Falling back to mock rubric generator.');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return generateMockRubric(title, grade);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.6,
      },
    });

    const prompt = `
      You are an expert grading assistant. Generate a highly detailed, professional grading rubric matrix for an assessment task.
      
      Task Title: "${title}"
      Grade Level: "${grade}"
      
      INSTRUCTIONS:
      1. Provide exactly 3 or 4 relevant criteria to grade (e.g. "Content Knowledge", "Structure & Organization", "Clarity & Grammar").
      2. For each criteria, provide 4 levels of performance: "Excellent", "Good", "Basic", and "Below Standard".
      3. Supply a clear, descriptive paragraph explaining what is expected at each level to guide teachers.
      4. Assign point values logically (e.g., Excellent: 10, Good: 8, Basic: 6, Below Standard: 4).
      5. Return ONLY a valid JSON object matching the target format. Do not write markdown wrappers like \`\`\`json. Just raw JSON.

      Target JSON Format:
      {
        "title": "Creative Writing Essay",
        "grade": "Grade 9",
        "criteria": [
          {
            "name": "Criteria Name",
            "maxPoints": 10,
            "levels": [
              { "name": "Excellent", "points": 10, "description": "Criteria descriptive guidelines..." },
              { "name": "Good", "points": 8, "description": "Criteria descriptive guidelines..." },
              { "name": "Basic", "points": 6, "description": "Criteria descriptive guidelines..." },
              { "name": "Below Standard", "points": 4, "description": "Criteria descriptive guidelines..." }
            ]
          }
        ]
      }
    `;

    console.log(`Calling Gemini to generate rubric for: "${title}"...`);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    let cleanedText = responseText;
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }

    return JSON.parse(cleanedText);
  } catch (err) {
    console.error('Gemini Rubric generation failed, falling back:', err);
    return generateMockRubric(title, grade);
  }
};

// Call Gemini to generate a structured Lesson Plan
export const generateLessonPlanAI = async (params: { topic: string; grade: string; duration: string }): Promise<any> => {
  const { topic, grade, duration } = params;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY' || apiKey === '') {
    console.warn('GEMINI_API_KEY is not set or placeholder. Falling back to mock lesson plan generator.');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return generateMockLessonPlan(topic, grade, duration);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.6,
      },
    });

    const prompt = `
      You are an expert pedagogy designer. Generate a structured classroom lesson plan.
      
      Topic: "${topic}"
      Grade Level: "${grade}"
      Duration: "${duration}"
      
      INSTRUCTIONS:
      1. Define 2 or 3 clear, measurable student learning Objectives.
      2. Provide a list of classroom Materials and resources needed for this lesson.
      3. Create a series of time-blocked Activities that span the full lesson duration (e.g. Warm-up, presentation, guided practice, wrap-up).
      4. Assign a clear duration (in minutes) and detailed instructions for each activity block.
      5. Provide a constructive Homework assignment.
      6. Return ONLY a valid JSON object matching the target format. Do not write markdown wrappers like \`\`\`json. Just raw JSON.

      Target JSON Format:
      {
        "topic": "Photosynthesis",
        "grade": "Grade 7",
        "duration": "45 minutes",
        "objectives": [
          "Explain the chemical inputs and outputs of photosynthesis.",
          "Identify chloroplasts as the cellular location of food production."
        ],
        "materials": [
          "Diagram of plant cell structure",
          "Dry-erase whiteboards and markers",
          "Guided activity handouts"
        ],
        "activities": [
          {
            "name": "Introduction & Hook",
            "duration": "10 minutes",
            "description": "Engage students with a question about how plants eat..."
          }
        ],
        "homework": "Read chapter review and complete section 3 exercises."
      }
    `;

    console.log(`Calling Gemini to generate lesson plan for: "${topic}"...`);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    let cleanedText = responseText;
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }

    return JSON.parse(cleanedText);
  } catch (err) {
    console.error('Gemini Lesson plan generation failed, falling back:', err);
    return generateMockLessonPlan(topic, grade, duration);
  }
};

