import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =========================================================================
// 1. WINDOWS 11 BASIC'S (15 Questions grounded in Windows 11 lessons)
// =========================================================================
const windows11Questions = [
  {
    questionText: '1. What is the standard keyboard shortcut to quickly rename a selected file or folder in Windows 11?',
    points: 1,
    order: 1,
    options: [
      { optionText: 'F2', isCorrect: true, explanation: 'Pressing the F2 key allows you to immediately edit the name of a selected file or folder.' },
      { optionText: 'F5', isCorrect: false },
      { optionText: 'Ctrl + R', isCorrect: false },
      { optionText: 'Alt + Enter', isCorrect: false },
    ],
  },
  {
    questionText: '2. Which keyboard shortcut permanently deletes a file or folder without sending it to the Recycle Bin?',
    points: 1,
    order: 2,
    options: [
      { optionText: 'Shift + Delete', isCorrect: true, explanation: 'Shift + Delete bypasses the Recycle Bin and deletes the item permanently from the storage drive.' },
      { optionText: 'Ctrl + Delete', isCorrect: false },
      { optionText: 'Alt + Delete', isCorrect: false },
      { optionText: 'Delete key only', isCorrect: false },
    ],
  },
  {
    questionText: '3. What happens when you delete a file normally using the Delete key in Windows 11?',
    points: 1,
    order: 3,
    options: [
      { optionText: 'The file is moved to the Recycle Bin, where it can be restored if needed.', isCorrect: true, explanation: 'The Recycle Bin acts as a safety holding area for deleted files until it is explicitly emptied.' },
      { optionText: 'The file is instantly and permanently destroyed from your hard drive.', isCorrect: false },
      { optionText: 'The file is uploaded to Microsoft OneDrive automatically.', isCorrect: false },
      { optionText: 'The file is renamed and hidden in the C: drive.', isCorrect: false },
    ],
  },
  {
    questionText: '4. Which keyboard shortcut allows you to quickly create a New Folder in File Explorer?',
    points: 1,
    order: 4,
    options: [
      { optionText: 'Ctrl + Shift + N', isCorrect: true, explanation: 'Ctrl + Shift + N creates a brand new folder instantly inside the current directory.' },
      { optionText: 'Ctrl + N', isCorrect: false },
      { optionText: 'Alt + F', isCorrect: false },
      { optionText: 'Shift + F10', isCorrect: false },
    ],
  },
  {
    questionText: '5. What is the fundamental difference between "Copy" (Ctrl + C) and "Cut" (Ctrl + X) when moving files?',
    points: 1,
    order: 5,
    options: [
      { optionText: 'Copy duplicates the file leaving the original intact, while Cut moves the file by removing it from the original location upon pasting.', isCorrect: true, explanation: 'Copy keeps the original file in place while creating a duplicate; Cut relocates the original file to the new destination.' },
      { optionText: 'Copy permanently deletes the file, while Cut saves it to the cloud.', isCorrect: false },
      { optionText: 'Cut creates two copies of the file on the desktop.', isCorrect: false },
      { optionText: 'There is no difference between Copy and Cut.', isCorrect: false },
    ],
  },
  {
    questionText: '6. Which keyboard shortcut pastes a previously copied or cut file/folder in Windows 11?',
    points: 1,
    order: 6,
    options: [
      { optionText: 'Ctrl + V', isCorrect: true, explanation: 'Ctrl + V pastes whatever content, file, or folder is currently held in your clipboard.' },
      { optionText: 'Ctrl + P', isCorrect: false },
      { optionText: 'Ctrl + Z', isCorrect: false },
      { optionText: 'Ctrl + Shift + V', isCorrect: false },
    ],
  },
  {
    questionText: '7. What is the function of the Taskbar in Windows 11?',
    points: 1,
    order: 7,
    options: [
      { optionText: 'It displays open application windows, pinned favorite apps, the Start button, system tray, and clock.', isCorrect: true, explanation: 'The Taskbar is the primary bottom bar for launching and switching between running applications.' },
      { optionText: 'It is only used to format hard drives.', isCorrect: false },
      { optionText: 'It is the recycle bin storage folder.', isCorrect: false },
      { optionText: 'It is used solely for typing text documents.', isCorrect: false },
    ],
  },
  {
    questionText: '8. Which button in the top-right corner of an application window temporarily hides the window to the Taskbar?',
    points: 1,
    order: 8,
    options: [
      { optionText: 'Minimize button (—)', isCorrect: true, explanation: 'The Minimize button hides the window from view and places it active on the taskbar.' },
      { optionText: 'Maximize button (□)', isCorrect: false },
      { optionText: 'Close button (X)', isCorrect: false },
      { optionText: 'Restore button', isCorrect: false },
    ],
  },
  {
    questionText: '9. What does clicking the "Maximize" (□) button do to an active application window?',
    points: 1,
    order: 9,
    options: [
      { optionText: 'It expands the window to fill the entire computer screen.', isCorrect: true, explanation: 'Maximize expands the application window to take up the full screen display.' },
      { optionText: 'It closes the program completely.', isCorrect: false },
      { optionText: 'It sends the file to the Recycle Bin.', isCorrect: false },
      { optionText: 'It restarts Windows 11.', isCorrect: false },
    ],
  },
  {
    questionText: '10. Which keyboard shortcut immediately closes the currently active window or program in Windows?',
    points: 1,
    order: 10,
    options: [
      { optionText: 'Alt + F4', isCorrect: true, explanation: 'Alt + F4 closes the active application window or brings up the Windows shutdown dialog.' },
      { optionText: 'Ctrl + F4', isCorrect: false },
      { optionText: 'Shift + Esc', isCorrect: false },
      { optionText: 'Windows Key + L', isCorrect: false },
    ],
  },
  {
    questionText: '11. In Windows 11, what are the three standard power options found under the Start menu power button?',
    points: 1,
    order: 11,
    options: [
      { optionText: 'Sleep, Shut Down, and Restart', isCorrect: true, explanation: 'Sleep saves power while keeping open apps in RAM; Shut Down turns off the PC completely; Restart closes all programs and reboots Windows.' },
      { optionText: 'Delete, Format, and Install', isCorrect: false },
      { optionText: 'Copy, Cut, and Paste', isCorrect: false },
      { optionText: 'Backup, Restore, and Clean', isCorrect: false },
    ],
  },
  {
    questionText: '12. What is the difference between "Shut Down" and "Sleep" mode on a Windows 11 PC?',
    points: 1,
    order: 12,
    options: [
      { optionText: 'Shut Down turns off the computer completely, while Sleep puts the PC into a low-power state so you can resume work instantly.', isCorrect: true, explanation: 'Sleep keeps your session active in memory using minimal electricity, whereas Shut Down closes all applications and powers down all hardware.' },
      { optionText: 'Sleep permanently erases files, while Shut Down saves them.', isCorrect: false },
      { optionText: 'Shut Down only turns off the monitor.', isCorrect: false },
      { optionText: 'Sleep restarts the computer automatically every hour.', isCorrect: false },
    ],
  },
  {
    questionText: '13. How can you restore an accidentally deleted file from the Recycle Bin back to its original folder?',
    points: 1,
    order: 13,
    options: [
      { optionText: 'Open the Recycle Bin, right-click on the file, and select "Restore".', isCorrect: true, explanation: 'Right-clicking a deleted item in the Recycle Bin and clicking "Restore" puts it back in the exact folder it came from.' },
      { optionText: 'Restart the computer three times.', isCorrect: false },
      { optionText: 'Drag the Recycle Bin icon into File Explorer.', isCorrect: false },
      { optionText: 'Deleted files can never be restored under any circumstances.', isCorrect: false },
    ],
  },
  {
    questionText: '14. Which key on the keyboard opens the Windows 11 Start Menu directly?',
    points: 1,
    order: 14,
    options: [
      { optionText: 'Windows Logo Key (Win)', isCorrect: true, explanation: 'Tapping the Windows key on your keyboard instantly opens and closes the Start Menu.' },
      { optionText: 'Ctrl key', isCorrect: false },
      { optionText: 'Alt key', isCorrect: false },
      { optionText: 'Tab key', isCorrect: false },
    ],
  },
  {
    questionText: '15. Which keyboard shortcut locks your Windows 11 computer screen when you step away from your desk?',
    points: 1,
    order: 15,
    options: [
      { optionText: 'Windows Key + L', isCorrect: true, explanation: 'Win + L locks the workstation, requiring your PIN or password to unlock.' },
      { optionText: 'Ctrl + L', isCorrect: false },
      { optionText: 'Alt + L', isCorrect: false },
      { optionText: 'Shift + L', isCorrect: false },
    ],
  },
];

// =========================================================================
// 2. MICROSOFT WORD 2019 (15 Questions grounded in Word curriculum)
// =========================================================================
const word2019Questions = [
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
    questionText: '2. What is the purpose of the "Header" and "Footer" areas in a Microsoft Word document?',
    points: 1,
    order: 2,
    options: [
      { optionText: 'They display text, document titles, logos, or page numbers that repeat consistently at the top and bottom of every page.', isCorrect: true, explanation: 'Headers appear in top margins and Footers appear in bottom margins across pages in the document.' },
      { optionText: 'They are only used for creating spreadsheet calculations.', isCorrect: false },
      { optionText: 'They prevent the document from being printed.', isCorrect: false },
      { optionText: 'They automatically delete old paragraphs.', isCorrect: false },
    ],
  },
  {
    questionText: '3. Which key on the keyboard launches the Spelling and Grammar check tool in Microsoft Word?',
    points: 1,
    order: 3,
    options: [
      { optionText: 'F7', isCorrect: true, explanation: 'F7 opens the Editor pane to review spelling and grammatical suggestions.' },
      { optionText: 'F1', isCorrect: false },
      { optionText: 'F5', isCorrect: false },
      { optionText: 'F12', isCorrect: false },
    ],
  },
  {
    questionText: '4. Under which Ribbon Tab can you add a Watermark, Page Color, and Page Borders in Word 2019?',
    points: 1,
    order: 4,
    options: [
      { optionText: 'Design Tab', isCorrect: true, explanation: 'The Design tab in Word 2019 contains Page Background tools including Watermark, Page Color, and Page Borders.' },
      { optionText: 'Home Tab', isCorrect: false },
      { optionText: 'Review Tab', isCorrect: false },
      { optionText: 'View Tab', isCorrect: false },
    ],
  },
  {
    questionText: '5. What is a "Watermark" in Microsoft Word, and what is it commonly used for?',
    points: 1,
    order: 5,
    options: [
      { optionText: 'A faint background text or image (e.g. "CONFIDENTIAL" or "DRAFT") displayed behind the main document content.', isCorrect: true, explanation: 'Watermarks indicate document status or security branding faintly behind page text.' },
      { optionText: 'A blue line under misspelled words.', isCorrect: false },
      { optionText: 'An animated video placed inside a table cell.', isCorrect: false },
      { optionText: 'A password encryption key for PDF files.', isCorrect: false },
    ],
  },
  {
    questionText: '6. When designing a Certificate or ID Card in Word, which feature allows you to combine multiple adjacent cells into one large cell in a table?',
    points: 1,
    order: 6,
    options: [
      { optionText: 'Merge Cells', isCorrect: true, explanation: 'Merge Cells combines two or more selected cells into a single larger cell in a table.' },
      { optionText: 'Split Table', isCorrect: false },
      { optionText: 'AutoFit', isCorrect: false },
      { optionText: 'Wrap Text', isCorrect: false },
    ],
  },
  {
    questionText: '7. In Microsoft Word, what must you apply to your document titles and subheadings to generate an Automatic Table of Contents?',
    points: 1,
    order: 7,
    options: [
      { optionText: 'Heading Styles (e.g. Heading 1, Heading 2, Heading 3)', isCorrect: true, explanation: 'Word scans Heading styles applied to text to automatically compile and update the Table of Contents.' },
      { optionText: 'Bold and Underline only', isCorrect: false },
      { optionText: 'Yellow text highlight color', isCorrect: false },
      { optionText: 'Double spacing', isCorrect: false },
    ],
  },
  {
    questionText: '8. Under which Tab do you find the "Table of Contents" tool in Microsoft Word?',
    points: 1,
    order: 8,
    options: [
      { optionText: 'References Tab', isCorrect: true, explanation: 'The References tab contains Table of Contents, Footnotes, Citations, and Index tools.' },
      { optionText: 'Insert Tab', isCorrect: false },
      { optionText: 'Home Tab', isCorrect: false },
      { optionText: 'Mailings Tab', isCorrect: false },
    ],
  },
  {
    questionText: '9. What are the two primary Page Orientation choices available in Microsoft Word?',
    points: 1,
    order: 9,
    options: [
      { optionText: 'Portrait (Vertical) and Landscape (Horizontal)', isCorrect: true, explanation: 'Portrait is taller than wide (standard letters), while Landscape is wider than tall (used for certificates and charts).' },
      { optionText: 'Square and Circular', isCorrect: false },
      { optionText: 'Letter and Legal', isCorrect: false },
      { optionText: 'Narrow and Wide', isCorrect: false },
    ],
  },
  {
    questionText: '10. Which keyboard shortcut applies "Bold" formatting to selected text in Microsoft Word?',
    points: 1,
    order: 10,
    options: [
      { optionText: 'Ctrl + B', isCorrect: true, explanation: 'Ctrl + B toggles bold styling on selected text.' },
      { optionText: 'Ctrl + I', isCorrect: false },
      { optionText: 'Ctrl + U', isCorrect: false },
      { optionText: 'Ctrl + E', isCorrect: false },
    ],
  },
  {
    questionText: '11. Which keyboard shortcut centers the selected paragraph or text horizontally across the page?',
    points: 1,
    order: 11,
    options: [
      { optionText: 'Ctrl + E', isCorrect: true, explanation: 'Ctrl + E centers selected text between left and right margins.' },
      { optionText: 'Ctrl + C', isCorrect: false },
      { optionText: 'Ctrl + L', isCorrect: false },
      { optionText: 'Ctrl + R', isCorrect: false },
    ],
  },
  {
    questionText: '12. What does "Justify" text alignment (Ctrl + J) accomplish in Microsoft Word?',
    points: 1,
    order: 12,
    options: [
      { optionText: 'It aligns text evenly along both the left and right margins for a clean, professional newspaper-like look.', isCorrect: true, explanation: 'Justify adjusts spacing between words so text aligns smoothly to both page edges.' },
      { optionText: 'It aligns all text to the top of the page only.', isCorrect: false },
      { optionText: 'It converts English text into numbers.', isCorrect: false },
      { optionText: 'It deletes all blank lines.', isCorrect: false },
    ],
  },
  {
    questionText: '13. When inserting a Shape or Picture in Word, which option must you adjust so you can freely move it anywhere on the page over/behind text?',
    points: 1,
    order: 13,
    options: [
      { optionText: 'Wrap Text (e.g. "In Front of Text" or "Square")', isCorrect: true, explanation: 'Setting Wrap Text to "In Front of Text" or "Square" unpins the object from inline text flow, allowing free drag-and-drop placement.' },
      { optionText: 'Font Size', isCorrect: false },
      { optionText: 'Line Spacing', isCorrect: false },
      { optionText: 'Check Spelling', isCorrect: false },
    ],
  },
  {
    questionText: '14. What is the difference between "Save" (Ctrl + S) and "Save As" (F12) in Microsoft Word?',
    points: 1,
    order: 14,
    options: [
      { optionText: 'Save updates the existing file, while Save As allows saving a new copy with a different name, location, or format (e.g. PDF).', isCorrect: true, explanation: 'Save As prompts for a new filename, target directory, or file type (such as Word Document vs PDF).' },
      { optionText: 'Save deletes the old file permanently.', isCorrect: false },
      { optionText: 'Save As prints the file directly to paper.', isCorrect: false },
      { optionText: 'There is no difference between Save and Save As.', isCorrect: false },
    ],
  },
  {
    questionText: '15. Which keyboard shortcut allows you to "Undo" your last action in Microsoft Word?',
    points: 1,
    order: 15,
    options: [
      { optionText: 'Ctrl + Z', isCorrect: true, explanation: 'Ctrl + Z reverses the most recent change, typing action, or formatting mistake.' },
      { optionText: 'Ctrl + Y', isCorrect: false },
      { optionText: 'Ctrl + U', isCorrect: false },
      { optionText: 'Ctrl + A', isCorrect: false },
    ],
  },
];

// =========================================================================
// 3. POWERPOINT (15 Questions grounded in PowerPoint curriculum)
// =========================================================================
const powerPointQuestions = [
  {
    questionText: '1. What is the primary purpose of Microsoft PowerPoint software?',
    points: 1,
    order: 1,
    options: [
      { optionText: 'To create visual slide-based presentations for speeches, lectures, business meetings, and demonstrations.', isCorrect: true, explanation: 'PowerPoint is a presentation program designed for creating engaging slide decks with text, graphics, and animations.' },
      { optionText: 'To calculate financial payroll formulas in spreadsheets.', isCorrect: false },
      { optionText: 'To edit operating system system files.', isCorrect: false },
      { optionText: 'To serve as a web browser.', isCorrect: false },
    ],
  },
  {
    questionText: '2. Which keyboard shortcut starts a Slide Show from the very first slide in PowerPoint?',
    points: 1,
    order: 2,
    options: [
      { optionText: 'F5', isCorrect: true, explanation: 'Pressing F5 launches the presentation in full-screen Slide Show mode from slide 1.' },
      { optionText: 'Shift + F5', isCorrect: false },
      { optionText: 'Ctrl + S', isCorrect: false },
      { optionText: 'F1', isCorrect: false },
    ],
  },
  {
    questionText: '3. Which shortcut starts the Slide Show from the CURRENTLY SELECTED slide instead of the beginning?',
    points: 1,
    order: 3,
    options: [
      { optionText: 'Shift + F5', isCorrect: true, explanation: 'Shift + F5 begins the full-screen presentation directly from the active slide.' },
      { optionText: 'F5', isCorrect: false },
      { optionText: 'Ctrl + F5', isCorrect: false },
      { optionText: 'Alt + F5', isCorrect: false },
    ],
  },
  {
    questionText: '4. Which keyboard shortcut inserts a New Slide into your PowerPoint presentation?',
    points: 1,
    order: 4,
    options: [
      { optionText: 'Ctrl + M', isCorrect: true, explanation: 'Ctrl + M creates a new slide in the presentation deck.' },
      { optionText: 'Ctrl + N', isCorrect: false },
      { optionText: 'Ctrl + S', isCorrect: false },
      { optionText: 'Ctrl + Shift + S', isCorrect: false },
    ],
  },
  {
    questionText: '5. What is the fundamental difference between a "Transition" and an "Animation" in PowerPoint?',
    points: 1,
    order: 5,
    options: [
      { optionText: 'Transitions apply motion effects when moving from one slide to another, while Animations apply motion to individual elements (text, pictures, shapes) on a slide.', isCorrect: true, explanation: 'Transitions occur between entire slides; Animations occur on objects within a single slide.' },
      { optionText: 'Transitions change font colors, while Animations print slides.', isCorrect: false },
      { optionText: 'Animations can only be used on videos.', isCorrect: false },
      { optionText: 'There is no difference between Transitions and Animations.', isCorrect: false },
    ],
  },
  {
    questionText: '6. Which keyboard shortcut duplicates a selected slide or object in PowerPoint?',
    points: 1,
    order: 6,
    options: [
      { optionText: 'Ctrl + D', isCorrect: true, explanation: 'Ctrl + D duplicates the selected slide, image, or shape instantly.' },
      { optionText: 'Ctrl + P', isCorrect: false },
      { optionText: 'Ctrl + T', isCorrect: false },
      { optionText: 'Ctrl + Shift + D', isCorrect: false },
    ],
  },
  {
    questionText: '7. Where in the PowerPoint interface can an instructor type private speaking notes that are invisible to the audience during a presentation?',
    points: 1,
    order: 7,
    options: [
      { optionText: 'The Notes Pane at the bottom of each slide.', isCorrect: true, explanation: 'The Notes pane allows speakers to jot down reminders visible only to the presenter in Presenter View.' },
      { optionText: 'Directly on top of the slide title in red text.', isCorrect: false },
      { optionText: 'In the Recycle Bin.', isCorrect: false },
      { optionText: 'In the Windows Start menu.', isCorrect: false },
    ],
  },
  {
    questionText: '8. What is the purpose of "Presenter View" in PowerPoint when connecting to an external projector or monitor?',
    points: 1,
    order: 8,
    options: [
      { optionText: 'It shows the presenter their upcoming slide, speaker notes, and timer on their laptop screen while the audience only sees the current slide.', isCorrect: true, explanation: 'Presenter View provides private tools (notes, elapsed time, next slide preview) without revealing them to the audience.' },
      { optionText: 'It records phone calls.', isCorrect: false },
      { optionText: 'It permanently deletes unused slides.', isCorrect: false },
      { optionText: 'It converts slides into a Word document.', isCorrect: false },
    ],
  },
  {
    questionText: '9. Which key on the keyboard immediately stops and exits a full-screen Slide Show in PowerPoint?',
    points: 1,
    order: 9,
    options: [
      { optionText: 'Escape (Esc)', isCorrect: true, explanation: 'Pressing Esc exits Slide Show mode and returns to normal editing view.' },
      { optionText: 'Enter', isCorrect: false },
      { optionText: 'Spacebar', isCorrect: false },
      { optionText: 'Shift', isCorrect: false },
    ],
  },
  {
    questionText: '10. Which slide layout is typically used as the very first slide of a new presentation deck?',
    points: 1,
    order: 10,
    options: [
      { optionText: 'Title Slide', isCorrect: true, explanation: 'The Title Slide layout contains placeholders for the presentation title and subtitle.' },
      { optionText: 'Blank Slide', isCorrect: false },
      { optionText: 'Comparison Slide', isCorrect: false },
      { optionText: 'Picture with Caption', isCorrect: false },
    ],
  },
  {
    questionText: '11. Which PowerPoint feature allows you to customize the global fonts, colors, and layout templates across ALL slides simultaneously?',
    points: 1,
    order: 11,
    options: [
      { optionText: 'Slide Master (View Tab -> Slide Master)', isCorrect: true, explanation: 'Slide Master controls the default appearance, themes, and placeholders for every slide in the presentation.' },
      { optionText: 'Spelling Check (F7)', isCorrect: false },
      { optionText: 'File Print (Ctrl + P)', isCorrect: false },
      { optionText: 'Save As (F12)', isCorrect: false },
    ],
  },
  {
    questionText: '12. During a live presentation, what keyboard key can you press to turn the entire projector screen black so the audience focuses on the speaker?',
    points: 1,
    order: 12,
    options: [
      { optionText: 'The "B" key (for Black Screen)', isCorrect: true, explanation: 'Pressing B blacks out the screen; pressing B again restores the slide.' },
      { optionText: 'The "X" key', isCorrect: false },
      { optionText: 'The "Z" key', isCorrect: false },
      { optionText: 'Ctrl + Alt + Delete', isCorrect: false },
    ],
  },
  {
    questionText: '13. What is the standard file format extension used for modern Microsoft PowerPoint presentations?',
    points: 1,
    order: 13,
    options: [
      { optionText: '.pptx', isCorrect: true, explanation: '.pptx is the official OpenXML presentation file format for PowerPoint.' },
      { optionText: '.docx', isCorrect: false },
      { optionText: '.xlsx', isCorrect: false },
      { optionText: '.mp3', isCorrect: false },
    ],
  },
  {
    questionText: '14. In PowerPoint, how can you advance to the NEXT slide during a Slide Show presentation?',
    points: 1,
    order: 14,
    options: [
      { optionText: 'Press the Spacebar, Right Arrow, or Left-Click the mouse.', isCorrect: true, explanation: 'Spacebar, Enter, Right Arrow, Page Down, or left-clicking advances to the next slide or animation.' },
      { optionText: 'Press the Escape key.', isCorrect: false },
      { optionText: 'Turn off the monitor.', isCorrect: false },
      { optionText: 'Press Alt + F4.', isCorrect: false },
    ],
  },
  {
    questionText: '15. Which tool in PowerPoint allows you to record audio narration and slide timings for an automated presentation video?',
    points: 1,
    order: 15,
    options: [
      { optionText: 'Record Slide Show (Slide Show Tab -> Record)', isCorrect: true, explanation: 'Record Slide Show records your voice voiceover, laser pointer movements, and slide timings.' },
      { optionText: 'Page Setup', isCorrect: false },
      { optionText: 'Font Dialog Box', isCorrect: false },
      { optionText: 'WordArt Gallery', isCorrect: false },
    ],
  },
];

// =========================================================================
// 4. LINUX ADVANCED / FUNDAMENTALS (15 Questions grounded in Linux)
// =========================================================================
const linuxQuestions = [
  {
    questionText: '1. In Linux, which command displays the full path of the current working directory?',
    points: 1,
    order: 1,
    options: [
      { optionText: 'pwd (Print Working Directory)', isCorrect: true, explanation: 'pwd outputs the exact absolute path of the directory you are currently in.' },
      { optionText: 'cd', isCorrect: false },
      { optionText: 'ls', isCorrect: false },
      { optionText: 'dir', isCorrect: false },
    ],
  },
  {
    questionText: '2. Which Linux command is used to list all files and subdirectories, including hidden files (those starting with a dot)?',
    points: 1,
    order: 2,
    options: [
      { optionText: 'ls -la', isCorrect: true, explanation: 'ls -la lists all files in long format including hidden dotfiles.' },
      { optionText: 'list -all', isCorrect: false },
      { optionText: 'show files', isCorrect: false },
      { optionText: 'cat .', isCorrect: false },
    ],
  },
  {
    questionText: '3. Which command is used to create a new empty directory in Linux?',
    points: 1,
    order: 3,
    options: [
      { optionText: 'mkdir folder_name', isCorrect: true, explanation: 'mkdir (make directory) creates new folders in the Linux filesystem.' },
      { optionText: 'touch folder_name', isCorrect: false },
      { optionText: 'newdir folder_name', isCorrect: false },
      { optionText: 'create folder_name', isCorrect: false },
    ],
  },
  {
    questionText: '4. Which command is used to create an empty text file or update the timestamp of an existing file in Linux?',
    points: 1,
    order: 4,
    options: [
      { optionText: 'touch file.txt', isCorrect: true, explanation: 'touch creates a new 0-byte file if it does not already exist.' },
      { optionText: 'mkdir file.txt', isCorrect: false },
      { optionText: 'make file.txt', isCorrect: false },
      { optionText: 'echo file.txt', isCorrect: false },
    ],
  },
  {
    questionText: '5. Which Linux command is used to change file and directory permissions (Read, Write, Execute)?',
    points: 1,
    order: 5,
    options: [
      { optionText: 'chmod', isCorrect: true, explanation: 'chmod (change mode) modifies read (r), write (w), and execute (x) permissions for user, group, and others.' },
      { optionText: 'chown', isCorrect: false },
      { optionText: 'passwd', isCorrect: false },
      { optionText: 'sudo', isCorrect: false },
    ],
  },
  {
    questionText: '6. In Linux permissions, what do the octal permission numbers `755` represent on a script file?',
    points: 1,
    order: 6,
    options: [
      { optionText: 'User: Read/Write/Execute (7), Group: Read/Execute (5), Others: Read/Execute (5)', isCorrect: true, explanation: '7 = 4+2+1 (rwx), 5 = 4+0+1 (r-x). User can modify and run; group and others can read and execute.' },
      { optionText: 'Full access for everyone on the internet.', isCorrect: false },
      { optionText: 'The file is encrypted and locked.', isCorrect: false },
      { optionText: 'The file is deleted after 755 seconds.', isCorrect: false },
    ],
  },
  {
    questionText: '7. Which command is used to change the user or group owner of a file in Linux?',
    points: 1,
    order: 7,
    options: [
      { optionText: 'chown', isCorrect: true, explanation: 'chown (change owner) modifies the user and group ownership of files and directories.' },
      { optionText: 'chmod', isCorrect: false },
      { optionText: 'usermod', isCorrect: false },
      { optionText: 'whoami', isCorrect: false },
    ],
  },
  {
    questionText: '8. Which command is used to display the contents of a text file directly in the terminal?',
    points: 1,
    order: 8,
    options: [
      { optionText: 'cat file.txt', isCorrect: true, explanation: 'cat (concatenate) outputs the entire contents of a file to standard output.' },
      { optionText: 'open file.txt', isCorrect: false },
      { optionText: 'show file.txt', isCorrect: false },
      { optionText: 'run file.txt', isCorrect: false },
    ],
  },
  {
    questionText: '9. Which command copies files and directories from one location to another in Linux?',
    points: 1,
    order: 9,
    options: [
      { optionText: 'cp source destination', isCorrect: true, explanation: 'cp copies files; use cp -r to recursively copy entire directories.' },
      { optionText: 'mv source destination', isCorrect: false },
      { optionText: 'rm source destination', isCorrect: false },
      { optionText: 'ln source destination', isCorrect: false },
    ],
  },
  {
    questionText: '10. Which command moves or renames a file or directory in Linux?',
    points: 1,
    order: 10,
    options: [
      { optionText: 'mv old_name new_name', isCorrect: true, explanation: 'mv (move) is used both for moving files between directories and for renaming files.' },
      { optionText: 'rename old_name new_name', isCorrect: false },
      { optionText: 'cp old_name new_name', isCorrect: false },
      { optionText: 'chname old_name new_name', isCorrect: false },
    ],
  },
  {
    questionText: '11. Which command safely removes (deletes) a file in Linux?',
    points: 1,
    order: 11,
    options: [
      { optionText: 'rm file.txt', isCorrect: true, explanation: 'rm (remove) deletes files; rm -rf recursively and forcefully deletes directories.' },
      { optionText: 'delete file.txt', isCorrect: false },
      { optionText: 'del file.txt', isCorrect: false },
      { optionText: 'erase file.txt', isCorrect: false },
    ],
  },
  {
    questionText: '12. What does the `sudo` command allow an authorized user to do in Linux?',
    points: 1,
    order: 12,
    options: [
      { optionText: 'Execute commands with Superuser (root / administrator) security privileges.', isCorrect: true, explanation: 'sudo (superuser do) allows administrative command execution with elevated root permissions.' },
      { optionText: 'Shut down the network card permanently.', isCorrect: false },
      { optionText: 'Switch terminal text color to green.', isCorrect: false },
      { optionText: 'Uninstall the Linux kernel.', isCorrect: false },
    ],
  },
  {
    questionText: '13. Which command displays dynamic, real-time statistics on CPU utilization, memory usage, and running system processes?',
    points: 1,
    order: 13,
    options: [
      { optionText: 'top (or htop)', isCorrect: true, explanation: 'top provides an interactive process viewer with live CPU, RAM, and process activity.' },
      { optionText: 'df -h', isCorrect: false },
      { optionText: 'uname -r', isCorrect: false },
      { optionText: 'free -m', isCorrect: false },
    ],
  },
  {
    questionText: '14. In the Linux root directory tree, where are global system configuration files (e.g. `/etc/passwd`, `/etc/hosts`) stored?',
    points: 1,
    order: 14,
    options: [
      { optionText: '/etc', isCorrect: true, explanation: '/etc contains all system-wide configuration files and startup scripts.' },
      { optionText: '/home', isCorrect: false },
      { optionText: '/var', isCorrect: false },
      { optionText: '/tmp', isCorrect: false },
    ],
  },
  {
    questionText: '15. Which package manager command is used to install software packages on Debian and Ubuntu Linux systems?',
    points: 1,
    order: 15,
    options: [
      { optionText: 'sudo apt install package_name', isCorrect: true, explanation: 'apt (Advanced Package Tool) is the package manager for Debian/Ubuntu distributions.' },
      { optionText: 'sudo yum get package_name', isCorrect: false },
      { optionText: 'pip run package_name', isCorrect: false },
      { optionText: 'brew setup package_name', isCorrect: false },
    ],
  },
];

async function seedCourseSpecificAssessments() {
  console.log('--- Seeding 100% Course-Specific 15-Question Final Assessments ---');

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

    let questionSet = windows11Questions;
    const titleLower = course.title.toLowerCase();

    if (titleLower.includes('word')) {
      questionSet = word2019Questions;
    } else if (titleLower.includes('powerpoint')) {
      questionSet = powerPointQuestions;
    } else if (titleLower.includes('linux')) {
      questionSet = linuxQuestions;
    } else if (titleLower.includes('window')) {
      questionSet = windows11Questions;
    }

    console.log(`Setting up assessment for: "${course.title}" (${questionSet.length} questions grounded in ${course.title} curriculum)`);

    // Find or create the final quiz
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
          title: `${course.title} — Official Final Course Assessment & Certification Exam`,
          description: `Comprehensive 15-Question Final Certification Assessment for ${course.title}. You have 40 minutes to complete this exam with a minimum passing score of 80%. A maximum of 3 attempts are allowed. Passing this assessment is mandatory to unlock and issue your official Khalil Academy Certificate.`,
          passingScore: 80.0,
          timeLimitMinutes: 40,
          maxAttempts: 3,
          isRequired: true,
          isFinalAssessment: true,
          moduleId: lastModule.id,
        },
      });

      // Clear existing questions to insert clean course-specific ones
      await prisma.quizQuestion.deleteMany({
        where: { quizId: quiz.id },
      });
    } else {
      quiz = await prisma.quiz.create({
        data: {
          title: `${course.title} — Official Final Course Assessment & Certification Exam`,
          description: `Comprehensive 15-Question Final Certification Assessment for ${course.title}. You have 40 minutes to complete this exam with a minimum passing score of 80%. A maximum of 3 attempts are allowed. Passing this assessment is mandatory to unlock and issue your official Khalil Academy Certificate.`,
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

    // Insert 15 course-specific questions
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

    console.log(`✓ Attached 15 ${course.title}-specific questions to Final Assessment on Module: "${lastModule.title}".`);
  }

  console.log('--- All Course Assessments 100% Aligned to Course Curriculum ---');
}

seedCourseSpecificAssessments()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
