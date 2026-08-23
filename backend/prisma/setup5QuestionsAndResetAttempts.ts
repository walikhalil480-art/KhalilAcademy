import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =========================================================================
// 1. WINDOWS 11 BASIC'S (5 Targeted Questions from Windows 11 Lessons)
// =========================================================================
const windows11Questions5 = [
  {
    questionText: '1. What is the standard keyboard shortcut to rename a selected file or folder in Windows 11?',
    points: 1,
    order: 1,
    options: [
      { optionText: 'F2', isCorrect: true, explanation: 'Pressing F2 allows you to instantly edit the name of any selected file or folder.' },
      { optionText: 'F5', isCorrect: false },
      { optionText: 'Ctrl + R', isCorrect: false },
      { optionText: 'Alt + Enter', isCorrect: false },
    ],
  },
  {
    questionText: '2. Which keyboard shortcut permanently deletes a file without sending it to the Recycle Bin?',
    points: 1,
    order: 2,
    options: [
      { optionText: 'Shift + Delete', isCorrect: true, explanation: 'Shift + Delete bypasses the Recycle Bin and deletes the item permanently.' },
      { optionText: 'Ctrl + Delete', isCorrect: false },
      { optionText: 'Alt + Delete', isCorrect: false },
      { optionText: 'Delete key only', isCorrect: false },
    ],
  },
  {
    questionText: '3. Which keyboard shortcut creates a New Folder in File Explorer?',
    points: 1,
    order: 3,
    options: [
      { optionText: 'Ctrl + Shift + N', isCorrect: true, explanation: 'Ctrl + Shift + N creates a new folder instantly.' },
      { optionText: 'Ctrl + N', isCorrect: false },
      { optionText: 'Alt + F', isCorrect: false },
      { optionText: 'Shift + F10', isCorrect: false },
    ],
  },
  {
    questionText: '4. Which button in the top-right corner of a window temporarily hides it to the Taskbar?',
    points: 1,
    order: 4,
    options: [
      { optionText: 'Minimize button (—)', isCorrect: true, explanation: 'The Minimize button hides the window from view and places it active on the taskbar.' },
      { optionText: 'Maximize button (□)', isCorrect: false },
      { optionText: 'Close button (X)', isCorrect: false },
      { optionText: 'Restore button', isCorrect: false },
    ],
  },
  {
    questionText: '5. Which keyboard shortcut immediately closes the currently active program window?',
    points: 1,
    order: 5,
    options: [
      { optionText: 'Alt + F4', isCorrect: true, explanation: 'Alt + F4 closes the active application window.' },
      { optionText: 'Ctrl + F4', isCorrect: false },
      { optionText: 'Shift + Esc', isCorrect: false },
      { optionText: 'Windows Key + L', isCorrect: false },
    ],
  },
];

// =========================================================================
// 2. MICROSOFT WORD 2019 (5 Targeted Questions from Word Lessons)
// =========================================================================
const word2019Questions5 = [
  {
    questionText: '1. In Microsoft Word 2019, which keyboard shortcut quickly saves changes to your current document?',
    points: 1,
    order: 1,
    options: [
      { optionText: 'Ctrl + S', isCorrect: true, explanation: 'Ctrl + S saves the current document immediately.' },
      { optionText: 'Ctrl + P', isCorrect: false },
      { optionText: 'Ctrl + O', isCorrect: false },
      { optionText: 'Ctrl + W', isCorrect: false },
    ],
  },
  {
    questionText: '2. Under which Ribbon Tab can you add a Watermark, Page Color, and Page Borders in Word 2019?',
    points: 1,
    order: 2,
    options: [
      { optionText: 'Design Tab', isCorrect: true, explanation: 'The Design tab contains Page Background tools including Watermark, Page Color, and Page Borders.' },
      { optionText: 'Home Tab', isCorrect: false },
      { optionText: 'Review Tab', isCorrect: false },
      { optionText: 'View Tab', isCorrect: false },
    ],
  },
  {
    questionText: '3. Which key on the keyboard launches the Spelling and Grammar check tool in Word?',
    points: 1,
    order: 3,
    options: [
      { optionText: 'F7', isCorrect: true, explanation: 'F7 opens the Editor to check spelling and grammatical mistakes.' },
      { optionText: 'F1', isCorrect: false },
      { optionText: 'F5', isCorrect: false },
      { optionText: 'F12', isCorrect: false },
    ],
  },
  {
    questionText: '4. When formatting a Certificate or ID Card in Word, which table feature merges multiple cells into one?',
    points: 1,
    order: 4,
    options: [
      { optionText: 'Merge Cells', isCorrect: true, explanation: 'Merge Cells combines multiple selected cells into a single larger cell in a table.' },
      { optionText: 'Split Table', isCorrect: false },
      { optionText: 'AutoFit', isCorrect: false },
      { optionText: 'Wrap Text', isCorrect: false },
    ],
  },
  {
    questionText: '5. In Microsoft Word, what must you apply to document titles to generate an Automatic Table of Contents?',
    points: 1,
    order: 5,
    options: [
      { optionText: 'Heading Styles (e.g. Heading 1, Heading 2)', isCorrect: true, explanation: 'Word uses Heading styles to automatically construct and update the Table of Contents under the References tab.' },
      { optionText: 'Bold and Underline only', isCorrect: false },
      { optionText: 'Yellow text highlight color', isCorrect: false },
      { optionText: 'Double spacing', isCorrect: false },
    ],
  },
];

// =========================================================================
// 3. POWERPOINT (5 Targeted Questions from PowerPoint Lessons)
// =========================================================================
const powerPointQuestions5 = [
  {
    questionText: '1. Which keyboard shortcut starts a Slide Show from the very first slide in PowerPoint?',
    points: 1,
    order: 1,
    options: [
      { optionText: 'F5', isCorrect: true, explanation: 'Pressing F5 launches the full-screen Slide Show starting from slide 1.' },
      { optionText: 'Shift + F5', isCorrect: false },
      { optionText: 'Ctrl + S', isCorrect: false },
      { optionText: 'F1', isCorrect: false },
    ],
  },
  {
    questionText: '2. Which shortcut starts the Slide Show from the CURRENTLY SELECTED slide?',
    points: 1,
    order: 2,
    options: [
      { optionText: 'Shift + F5', isCorrect: true, explanation: 'Shift + F5 begins the presentation directly from the active slide.' },
      { optionText: 'F5', isCorrect: false },
      { optionText: 'Ctrl + F5', isCorrect: false },
      { optionText: 'Alt + F5', isCorrect: false },
    ],
  },
  {
    questionText: '3. Which keyboard shortcut inserts a New Slide into your PowerPoint presentation?',
    points: 1,
    order: 3,
    options: [
      { optionText: 'Ctrl + M', isCorrect: true, explanation: 'Ctrl + M creates a new slide in the presentation deck.' },
      { optionText: 'Ctrl + N', isCorrect: false },
      { optionText: 'Ctrl + S', isCorrect: false },
      { optionText: 'Ctrl + Shift + S', isCorrect: false },
    ],
  },
  {
    questionText: '4. What is the difference between a "Transition" and an "Animation" in PowerPoint?',
    points: 1,
    order: 4,
    options: [
      { optionText: 'Transitions apply effects between entire slides, while Animations apply motion to individual text or objects on a slide.', isCorrect: true, explanation: 'Transitions occur between slides; Animations occur on objects on a single slide.' },
      { optionText: 'Transitions change font colors, while Animations print slides.', isCorrect: false },
      { optionText: 'Animations can only be used on video files.', isCorrect: false },
      { optionText: 'There is no difference between Transitions and Animations.', isCorrect: false },
    ],
  },
  {
    questionText: '5. Which key on the keyboard immediately exits and stops a full-screen Slide Show?',
    points: 1,
    order: 5,
    options: [
      { optionText: 'Escape (Esc)', isCorrect: true, explanation: 'Pressing Esc exits Slide Show mode.' },
      { optionText: 'Enter', isCorrect: false },
      { optionText: 'Spacebar', isCorrect: false },
      { optionText: 'Shift', isCorrect: false },
    ],
  },
];

// =========================================================================
// 4. LINUX ADVANCED (5 Targeted Questions from Linux Lessons)
// =========================================================================
const linuxQuestions5 = [
  {
    questionText: '1. In Linux, which command displays the full path of the current working directory?',
    points: 1,
    order: 1,
    options: [
      { optionText: 'pwd (Print Working Directory)', isCorrect: true, explanation: 'pwd outputs the current absolute directory path.' },
      { optionText: 'cd', isCorrect: false },
      { optionText: 'ls', isCorrect: false },
      { optionText: 'dir', isCorrect: false },
    ],
  },
  {
    questionText: '2. Which Linux command lists all files including hidden files (starting with a dot)?',
    points: 1,
    order: 2,
    options: [
      { optionText: 'ls -la', isCorrect: true, explanation: 'ls -la lists all files in long format including hidden files.' },
      { optionText: 'list -all', isCorrect: false },
      { optionText: 'show files', isCorrect: false },
      { optionText: 'cat .', isCorrect: false },
    ],
  },
  {
    questionText: '3. Which command is used to create a new directory (folder) in Linux?',
    points: 1,
    order: 3,
    options: [
      { optionText: 'mkdir folder_name', isCorrect: true, explanation: 'mkdir creates new directories.' },
      { optionText: 'touch folder_name', isCorrect: false },
      { optionText: 'newdir folder_name', isCorrect: false },
      { optionText: 'create folder_name', isCorrect: false },
    ],
  },
  {
    questionText: '4. Which Linux command is used to change file permissions?',
    points: 1,
    order: 4,
    options: [
      { optionText: 'chmod', isCorrect: true, explanation: 'chmod modifies read, write, and execute permissions.' },
      { optionText: 'chown', isCorrect: false },
      { optionText: 'passwd', isCorrect: false },
      { optionText: 'sudo', isCorrect: false },
    ],
  },
  {
    questionText: '5. Which command displays real-time CPU and memory process monitoring in Linux?',
    points: 1,
    order: 5,
    options: [
      { optionText: 'top (or htop)', isCorrect: true, explanation: 'top provides real-time system process and resource monitoring.' },
      { optionText: 'df -h', isCorrect: false },
      { optionText: 'free -m', isCorrect: false },
      { optionText: 'uname -r', isCorrect: false },
    ],
  },
];

async function main() {
  console.log('--- 1. Resetting All Past Quiz Attempts Across Database ---');
  const deletedAnswers = await prisma.quizAnswer.deleteMany({});
  const deletedAttempts = await prisma.quizAttempt.deleteMany({});
  console.log(`✓ Cleared ${deletedAttempts.count} past attempts and ${deletedAnswers.count} attempt answers. All student attempts are now reset to 0/3!`);

  console.log('\n--- 2. Setting Up 5 Course-Specific Questions per Course ---');
  const courses = await prisma.course.findMany({
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: { lessons: { orderBy: { order: 'asc' } } },
      },
    },
  });

  for (const course of courses) {
    const lastModule = course.modules[course.modules.length - 1];
    if (!lastModule) continue;

    let questionSet = windows11Questions5;
    const titleLower = course.title.toLowerCase();

    if (titleLower.includes('word')) {
      questionSet = word2019Questions5;
    } else if (titleLower.includes('powerpoint')) {
      questionSet = powerPointQuestions5;
    } else if (titleLower.includes('linux')) {
      questionSet = linuxQuestions5;
    } else if (titleLower.includes('window')) {
      questionSet = windows11Questions5;
    }

    console.log(`Setting 5 questions for: "${course.title}"`);

    let quiz = await prisma.quiz.findFirst({
      where: {
        courseId: course.id,
        isFinalAssessment: true,
      },
    });

    if (quiz) {
      await prisma.quiz.update({
        where: { id: quiz.id },
        data: {
          title: `${course.title} — Final Course Assessment`,
          description: `5-Question Final Certification Assessment for ${course.title}. You have 40 minutes with a minimum passing score of 80% (4 of 5 correct). Max 3 attempts allowed.`,
          passingScore: 80.0,
          timeLimitMinutes: 40,
          maxAttempts: 3,
          isRequired: true,
          isFinalAssessment: true,
          moduleId: lastModule.id,
        },
      });

      // Clear existing questions to insert exactly 5
      await prisma.quizQuestion.deleteMany({
        where: { quizId: quiz.id },
      });
    } else {
      quiz = await prisma.quiz.create({
        data: {
          title: `${course.title} — Final Course Assessment`,
          description: `5-Question Final Certification Assessment for ${course.title}. You have 40 minutes with a minimum passing score of 80% (4 of 5 correct). Max 3 attempts allowed.`,
          passingScore: 80.0,
          timeLimitMinutes: 40,
          maxAttempts: 3,
          isRequired: true,
          isFinalAssessment: true,
          moduleId: lastModule.id,
          courseId: course.id,
        },
      });
    }

    // Insert the 5 questions
    for (const q of questionSet) {
      await prisma.quizQuestion.create({
        data: {
          quizId: quiz.id,
          questionText: q.questionText,
          points: q.points,
          order: q.order,
          options: {
            create: q.options.map((opt) => ({
              optionText: opt.optionText,
              isCorrect: opt.isCorrect,
              explanation: opt.explanation,
            })),
          },
        },
      });
    }

    console.log(`✓ Attached 5 questions to Final Assessment for ${course.title}.`);
  }

  console.log('\n--- All Courses Configured with 5 Questions & Fresh 3 Attempts! ---');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
