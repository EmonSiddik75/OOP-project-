
// =======================
// OOP CLASSES
// =======================

class Question {
    constructor(id, text, options, correctOptionIndex, subjectKey) {
        this.id = id;
        this.text = text;
        this.options = options;
        this.correctOptionIndex = correctOptionIndex;
        this.subjectKey = subjectKey;
    }

    isCorrect(userChoiceIndex) {
        return userChoiceIndex === this.correctOptionIndex;
    }
}

class Quiz {
    constructor(id, subjectKey, subjectLabel, questions) {
        this.id = id;
        this.subjectKey = subjectKey;
        this.subjectLabel = subjectLabel;
        this.questions = questions;
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.startTime = null;
        this.endTime = null;
    }

    start() {
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.startTime = Date.now();
        this.endTime = null;
    }

    finish() {
        this.endTime = Date.now();
    }

    getTimeUsedSeconds() {
        if (!this.startTime) return 0;
        const end = this.endTime || Date.now();
        return Math.floor((end - this.startTime) / 1000);
    }

    hasNextQuestion() {
        return this.currentQuestionIndex < this.questions.length - 1;
    }

    hasPrevQuestion() {
        return this.currentQuestionIndex > 0;
    }

    getCurrentQuestion() {
        return this.questions[this.currentQuestionIndex];
    }

    goToNextQuestion() {
        if (this.hasNextQuestion()) {
            this.currentQuestionIndex++;
        }
        return this.getCurrentQuestion();
    }

    goToPrevQuestion() {
        if (this.hasPrevQuestion()) {
            this.currentQuestionIndex--;
        }
        return this.getCurrentQuestion();
    }

    saveAnswer(questionId, choiceIndex) {
        this.userAnswers[questionId] = choiceIndex;
    }

    getAttemptedCount() {
        return Object.keys(this.userAnswers).length;
    }
}

class TimedQuiz extends Quiz {
    constructor(id, subjectKey, subjectLabel, questions, timeLimitInSeconds) {
        super(id, subjectKey, subjectLabel, questions);
        this.timeLimitInSeconds = timeLimitInSeconds;
    }

    getRemainingSeconds() {
        if (!this.startTime) return this.timeLimitInSeconds;
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        return Math.max(0, this.timeLimitInSeconds - elapsed);
    }

    isTimeOver() {
        return this.getRemainingSeconds() <= 0;
    }
}

class Result {
    constructor(studentName, studentId, subjectLabel, score, totalQuestions, timeUsedSeconds, timeLimitSeconds, attemptedCount, takenAt) {
        this.studentName = studentName || "Guest";
        this.studentId = studentId || "N/A";
        this.subjectLabel = subjectLabel;
        this.score = score;
        this.totalQuestions = totalQuestions;
        this.timeUsedSeconds = timeUsedSeconds;
        this.timeLimitSeconds = timeLimitSeconds;
        this.attemptedCount = attemptedCount;
        this.takenAt = takenAt;
    }

    getPercentage() {
        return (this.score * 100) / this.totalQuestions;
    }

    getGrade() {
        const p = this.getPercentage();
        if (p >= 80) return "A+";
        if (p >= 70) return "A";
        if (p >= 60) return "B";
        if (p >= 50) return "C";
        return "F";
    }

    getTimeStatus() {
        if (this.timeUsedSeconds > this.timeLimitSeconds) return "Time over";
        return "Completed within time";
    }
}

class SubjectManager {
    constructor() {
        this.subjects = {};
    }

    addSubject(key, label) {
        if (!key || !label) {
            throw new Error("Subject key and label are required.");
        }
        this.subjects[key] = { label };
    }

    getSubjectLabel(key) {
        return this.subjects[key]?.label || key;
    }

    getAllSubjects() {
        return Object.entries(this.subjects).map(([key, value]) => ({
            key,
            label: value.label
        }));
    }
}

class QuizService {
    constructor(questionsDb, subjectManager) {
        this.questionsDb = questionsDb;
        this.subjectManager = subjectManager;
        this.nextQuestionId = this._getMaxExistingId() + 1;
    }

    _getMaxExistingId() {
        let maxId = 0;
        Object.values(this.questionsDb).forEach(arr => {
            arr.forEach(q => {
                if (q.id > maxId) maxId = q.id;
            });
        });
        return maxId;
    }

    loadQuiz(subjectKey, questionCount, timeLimitInSeconds) {
        const allQuestions = this.questionsDb[subjectKey];
        if (!allQuestions || allQuestions.length === 0) {
            throw new Error("No questions available for this subject.");
        }
        const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
        let selected;
        if (questionCount === "all" || questionCount >= shuffled.length) {
            selected = shuffled;
        } else {
            selected = shuffled.slice(0, questionCount);
        }

        selected.forEach(q => {
            const zipped = q.options.map((opt, idx) => ({ opt, idx }));
            zipped.sort(() => Math.random() - 0.5);
            q.options = zipped.map(z => z.opt);
            q.correctOptionIndex = zipped.findIndex(z => z.idx === q.correctOptionIndex);
        });

        const subjectLabel = this.subjectManager.getSubjectLabel(subjectKey);
        const quiz = new TimedQuiz(1, subjectKey, subjectLabel, selected, timeLimitInSeconds);
        quiz.start();
        return quiz;
    }

    calculateScore(quiz) {
        let score = 0;
        quiz.questions.forEach(q => {
            const chosen = quiz.userAnswers[q.id];
            if (chosen !== undefined && q.isCorrect(chosen)) {
                score++;
            }
        });
        return score;
    }

    addSubject(key, label) {
        this.subjectManager.addSubject(key, label);
        if (!this.questionsDb[key]) {
            this.questionsDb[key] = [];
        }
    }

    addQuestion(subjectKey, text, options, correctIndex) {
        if (!this.questionsDb[subjectKey]) {
            this.questionsDb[subjectKey] = [];
        }
        const q = new Question(this.nextQuestionId++, text, options, correctIndex, subjectKey);
        this.questionsDb[subjectKey].push(q);
    }
}

// =======================
// Questions Database
// =======================

const QUESTIONS_DB = {
    c_programming: [
        new Question(1, "Which of the following is a valid C data type?", ["number", "integer", "float", "real"], 2, "c_programming"),
        new Question(2, "Which symbol is used to terminate a statement in C?", [".", ":", ";", ","], 2, "c_programming"),
        new Question(3, "Which function is used to print output in C?", ["print()", "printf()", "cout<<", "System.out.println()"], 1, "c_programming"),
        new Question(4, "Which of the following is a loop structure in C?", ["repeat-until", "for", "foreach", "loop"], 1, "c_programming"),
        new Question(5, "Which header file is needed for printf()?", ["<stdlib.h>", "<stdio.h>", "<conio.h>", "<math.h>"], 1, "c_programming"),
        new Question(16, "What is the index of the first element in a C array?", ["0", "1", "-1", "Depends on compiler"], 0, "c_programming"),
        new Question(17, "Which operator is used to access value at an address?", ["&", "*", "->", "."], 1, "c_programming")
    ],
    oop: [
        new Question(6, "Which is NOT an OOP concept?", ["Encapsulation", "Polymorphism", "Compilation", "Inheritance"], 2, "oop"),
        new Question(7, "Which keyword is commonly used to create an object?", ["create", "object", "new", "class"], 2, "oop"),
        new Question(8, "Hiding internal details and showing only functionality is called:", ["Abstraction", "Encapsulation", "Polymorphism", "Inheritance"], 0, "oop"),
        new Question(9, "Which OOP concept allows using the same method name with different parameters?", ["Inheritance", "Overloading", "Overriding", "Abstraction"], 1, "oop"),
        new Question(10, "A class is a:", ["Variable", "Function", "Blueprint", "Object"], 2, "oop"),
        new Question(18, "Which of these lets a subclass provide specific implementation of a method in its superclass?", ["Overloading", "Overriding", "Hiding", "Inlining"], 1, "oop")
    ],
    dbms: [
        new Question(11, "What does DBMS stand for?", ["Data Backup Management System", "Database Management System", "Data Business Management System", "DataBase Managing Storage"], 1, "dbms"),
        new Question(12, "Which language is used to query data from a database?", ["HTML", "CSS", "SQL", "XML"], 2, "dbms"),
        new Question(13, "Which of the following is a DBMS?", ["MySQL", "PHP", "JavaScript", "HTML"], 0, "dbms"),
        new Question(14, "Which SQL command is used to insert data?", ["ADD", "INSERT", "APPEND", "UPDATE"], 1, "dbms"),
        new Question(15, "Primary key is:", ["A key that can be null", "A key that uniquely identifies a record", "A key that is always 0", "A duplicate key"], 1, "dbms")
    ],
    java_basics: [
        new Question(19, "Which keyword is used to inherit a class in Java?", ["implement", "extends", "inherits", "super"], 1, "java_basics"),
        new Question(20, "Which method is the entry point of a Java program?", ["init()", "start()", "main()", "run()"], 2, "java_basics"),
        new Question(21, "Which of these is not a Java primitive type?", ["int", "String", "double", "char"], 1, "java_basics")
    ]
};

// =======================
// Initialization
// =======================

const subjectManager = new SubjectManager();
subjectManager.addSubject("c_programming", "C Programming");
subjectManager.addSubject("oop", "Object Oriented Programming");
subjectManager.addSubject("dbms", "Database Management System");
subjectManager.addSubject("java_basics", "Java Basics");

const quizService = new QuizService(QUESTIONS_DB, subjectManager);

let currentQuiz = null;
let timerInterval = null;

let currentUser = {
    role: null, // "student" or "teacher"
    name: null,
    id: null
};

// DOM elements
const authSection = document.getElementById("auth-section");
const homeSection = document.getElementById("home-section");
const quizSection = document.getElementById("quiz-section");
const resultSection = document.getElementById("result-section");
const teacherSection = document.getElementById("teacher-section");

const headerUserInfo = document.getElementById("header-user-info");
const logoutBtn = document.getElementById("logout-btn");

const studentNameInput = document.getElementById("student-name");
const studentIdInput = document.getElementById("student-id");
const studentLoginBtn = document.getElementById("student-login-btn");

const teacherUsernameInput = document.getElementById("teacher-username");
const teacherPasswordInput = document.getElementById("teacher-password");
const teacherLoginBtn = document.getElementById("teacher-login-btn");

const subjectSelect = document.getElementById("subject");
const startForm = document.getElementById("start-form");
const questionCountSelect = document.getElementById("question-count");
const customTimeInput = document.getElementById("custom-time");

const quizSubjectTitle = document.getElementById("quiz-subject-title");
const quizUsernameDisplay = document.getElementById("quiz-username-display");
const questionCounter = document.getElementById("question-counter");
const timerDisplay = document.getElementById("timer");
const questionText = document.getElementById("question-text");
const optionsList = document.getElementById("options-list");

const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const submitBtn = document.getElementById("submit-btn");

const resultUsername = document.getElementById("result-username");
const resultSubject = document.getElementById("result-subject");
const resultScore = document.getElementById("result-score");
const resultPercentage = document.getElementById("result-percentage");
const resultGrade = document.getElementById("result-grade");
const resultTimeUsed = document.getElementById("result-time-used");
const resultTimeStatus = document.getElementById("result-time-status");
const resultAttempted = document.getElementById("result-attempted");
const answersReview = document.getElementById("answers-review");

const retryBtn = document.getElementById("retry-btn");
const changeConfigBtn = document.getElementById("change-config-btn");

const newSubjectKeyInput = document.getElementById("new-subject-key");
const newSubjectLabelInput = document.getElementById("new-subject-label");
const addSubjectBtn = document.getElementById("add-subject-btn");
const adminSubjectSelect = document.getElementById("admin-subject-select");
const adminQuestionText = document.getElementById("admin-question-text");
const adminCorrectIndexInput = document.getElementById("admin-correct-index");
const addQuestionBtn = document.getElementById("add-question-btn");
const adminOptionInputs = [
    document.getElementById("admin-option-0"),
    document.getElementById("admin-option-1"),
    document.getElementById("admin-option-2"),
    document.getElementById("admin-option-3")
];

const resultsTableBody = document.querySelector("#results-table tbody");

// Helpers
function showSection(section) {
    [authSection, homeSection, quizSection, resultSection, teacherSection].forEach(sec => sec.classList.add("hidden"));
    section.classList.remove("hidden");
}

function populateSubjectSelects() {
    subjectSelect.innerHTML = "";
    adminSubjectSelect.innerHTML = "";
    subjectManager.getAllSubjects().forEach(sub => {
        const opt1 = document.createElement("option");
        opt1.value = sub.key;
        opt1.textContent = sub.label;
        subjectSelect.appendChild(opt1);

        const opt2 = document.createElement("option");
        opt2.value = sub.key;
        opt2.textContent = sub.label;
        adminSubjectSelect.appendChild(opt2);
    });
}

function getSelectedTimeLimit() {
    const timeRadios = document.querySelectorAll('input[name="time"]');
    let selectedValue = "60";
    timeRadios.forEach(r => {
        if (r.checked) selectedValue = r.value;
    });

    if (selectedValue === "custom") {
        const custom = parseInt(customTimeInput.value, 10);
        if (isNaN(custom) || custom < 10) {
            alert("Please enter a valid custom time (minimum 10 seconds).");
            return null;
        }
        return custom;
    }
    return parseInt(selectedValue, 10);
}

function renderQuestion() {
    const q = currentQuiz.getCurrentQuestion();
    if (!q) return;
    questionText.textContent = q.text;
    optionsList.innerHTML = "";

    q.options.forEach((opt, index) => {
        const li = document.createElement("li");
        li.textContent = opt;
        li.classList.add("option-item");

        const savedAnswer = currentQuiz.userAnswers[q.id];
        if (savedAnswer === index) {
            li.classList.add("selected");
        }

        li.addEventListener("click", () => {
            const all = optionsList.querySelectorAll(".option-item");
            all.forEach(o => o.classList.remove("selected"));
            li.classList.add("selected");
            currentQuiz.saveAnswer(q.id, index);
        });

        optionsList.appendChild(li);
    });

    questionCounter.textContent = `Question ${currentQuiz.currentQuestionIndex + 1}/${currentQuiz.questions.length}`;
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const remaining = currentQuiz.getRemainingSeconds();
        timerDisplay.textContent = `Time left: ${remaining}s`;
        if (remaining <= 0) {
            clearInterval(timerInterval);
            alert("Time is over! Your quiz will be submitted automatically.");
            finishQuiz(true);
        }
    }, 1000);
}

function getStoredResults() {
    const raw = localStorage.getItem("quizResults");
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function saveResultToStorage(result) {
    const results = getStoredResults();
    results.push(result);
    localStorage.setItem("quizResults", JSON.stringify(results));
}

function renderResultsTable() {
    const results = getStoredResults();
    resultsTableBody.innerHTML = "";
    results.forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${r.studentName}</td>
            <td>${r.studentId}</td>
            <td>${r.subjectLabel}</td>
            <td>${r.score}/${r.totalQuestions}</td>
            <td>${r.percentage.toFixed(2)}%</td>
            <td>${r.grade}</td>
            <td>${r.attemptedCount}</td>
            <td>${r.timeUsedSeconds}s / ${r.timeLimitSeconds}s</td>
            <td>${r.takenAt}</td>
        `;
        resultsTableBody.appendChild(tr);
    });
}

function finishQuiz(timeOver = false) {
    if (timerInterval) clearInterval(timerInterval);
    currentQuiz.finish();

    const score = quizService.calculateScore(currentQuiz);
    const totalQuestions = currentQuiz.questions.length;
    const timeUsed = currentQuiz.getTimeUsedSeconds();
    const timeLimit = currentQuiz.timeLimitInSeconds;
    const attempted = currentQuiz.getAttemptedCount();

    const takenAt = new Date().toLocaleString();
    const resultObj = new Result(
        currentUser.name,
        currentUser.id,
        currentQuiz.subjectLabel,
        score,
        totalQuestions,
        timeUsed,
        timeLimit,
        attempted,
        takenAt
    );

    // Update UI for student
    resultUsername.textContent = `Name: ${resultObj.studentName} (ID: ${resultObj.studentId})`;
    resultSubject.textContent = resultObj.subjectLabel;
    resultScore.textContent = `${resultObj.score} / ${resultObj.totalQuestions}`;
    const percent = resultObj.getPercentage();
    resultPercentage.textContent = percent.toFixed(2);
    resultGrade.textContent = resultObj.getGrade();
    resultTimeUsed.textContent = `${resultObj.timeUsedSeconds} seconds (limit: ${resultObj.timeLimitSeconds}s)`;
    resultTimeStatus.textContent = resultObj.getTimeStatus();
    resultAttempted.textContent = `${resultObj.attemptedCount} / ${resultObj.totalQuestions}`;

    // Answer review
    answersReview.innerHTML = "";
    currentQuiz.questions.forEach((q, idx) => {
        const li = document.createElement("li");
        const chosen = currentQuiz.userAnswers[q.id];
        const correctIndex = q.correctOptionIndex;
        let text = `${idx + 1}. ${q.text} – `;
        if (chosen === undefined) {
            text += "You did not answer. ";
        } else if (q.isCorrect(chosen)) {
            text += `Your answer: ${q.options[chosen]} ✅`;
        } else {
            text += `Your answer: ${q.options[chosen]} ❌`;
        }
        text += ` | Correct answer: ${q.options[correctIndex]}`;
        li.textContent = text;
        if (chosen === undefined) {
            // no class
        } else if (q.isCorrect(chosen)) {
            li.classList.add("answer-correct");
        } else {
            li.classList.add("answer-wrong");
        }
        answersReview.appendChild(li);
    });

    // Save result for teacher (marks backend)
    const storedResult = {
        studentName: resultObj.studentName,
        studentId: resultObj.studentId,
        subjectLabel: resultObj.subjectLabel,
        score: resultObj.score,
        totalQuestions: resultObj.totalQuestions,
        percentage: percent,
        grade: resultObj.getGrade(),
        timeUsedSeconds: resultObj.timeUsedSeconds,
        timeLimitSeconds: resultObj.timeLimitSeconds,
        attemptedCount: resultObj.attemptedCount,
        takenAt: resultObj.takenAt
    };
    saveResultToStorage(storedResult);

    showSection(resultSection);
}

// =======================
// Event Listeners
// =======================

// Show/hide custom time input
document.querySelectorAll('input[name="time"]').forEach(radio => {
    radio.addEventListener("change", () => {
        if (radio.value === "custom" && radio.checked) {
            customTimeInput.classList.remove("hidden");
        } else if (radio.value !== "custom" && radio.checked) {
            customTimeInput.classList.add("hidden");
        }
    });
});

// Student login
studentLoginBtn.addEventListener("click", () => {
    const name = studentNameInput.value.trim();
    const id = studentIdInput.value.trim();
    if (!name || !id) {
        alert("Please enter both name and student ID.");
        return;
    }
    currentUser = {
        role: "student",
        name,
        id
    };
    headerUserInfo.textContent = `Logged in as Student: ${name} (${id})`;
    logoutBtn.classList.remove("hidden");
    showSection(homeSection);
});

// Teacher login
teacherLoginBtn.addEventListener("click", () => {
    const username = teacherUsernameInput.value.trim();
    const password = teacherPasswordInput.value.trim();
    if (username === "teacher" && password === "teacher123") {
        currentUser = {
            role: "teacher",
            name: "Teacher",
            id: "T-001"
        };
        headerUserInfo.textContent = "Logged in as Teacher";
        logoutBtn.classList.remove("hidden");
        renderResultsTable();
        populateSubjectSelects();
        showSection(teacherSection);
    } else {
        alert("Invalid teacher credentials.");
    }
});

// Logout
logoutBtn.addEventListener("click", () => {
    currentUser = { role: null, name: null, id: null };
    headerUserInfo.textContent = "Not logged in";
    logoutBtn.classList.add("hidden");
    showSection(authSection);
});

// Start form (student quiz)
startForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (currentUser.role !== "student") {
        alert("Please login as a student first.");
        showSection(authSection);
        return;
    }
    const subjectKey = subjectSelect.value;
    const qCountValue = questionCountSelect.value;
    let questionCount = qCountValue === "all" ? "all" : parseInt(qCountValue, 10);
    const timeLimit = getSelectedTimeLimit();
    if (!timeLimit) return;

    try {
        currentQuiz = quizService.loadQuiz(subjectKey, questionCount, timeLimit);
        quizSubjectTitle.textContent = `${subjectManager.getSubjectLabel(subjectKey)} Quiz`;
        quizUsernameDisplay.textContent = `Student: ${currentUser.name} (${currentUser.id}) • Time limit: ${timeLimit}s`;
        showSection(quizSection);
        renderQuestion();
        startTimer();
    } catch (err) {
        alert(err.message);
    }
});

prevBtn.addEventListener("click", () => {
    if (!currentQuiz) return;
    currentQuiz.goToPrevQuestion();
    renderQuestion();
});

nextBtn.addEventListener("click", () => {
    if (!currentQuiz) return;
    currentQuiz.goToNextQuestion();
    renderQuestion();
});

submitBtn.addEventListener("click", () => {
    if (!currentQuiz) return;
    if (!confirm("Are you sure you want to submit the quiz?")) return;
    finishQuiz(false);
});

retryBtn.addEventListener("click", () => {
    if (!currentQuiz) {
        showSection(homeSection);
        return;
    }
    const subjectKey = currentQuiz.subjectKey;
    const qCountValue = questionCountSelect.value;
    let questionCount = qCountValue === "all" ? "all" : parseInt(qCountValue, 10);
    const timeLimit = currentQuiz.timeLimitInSeconds;

    currentQuiz = quizService.loadQuiz(subjectKey, questionCount, timeLimit);
    quizSubjectTitle.textContent = `${subjectManager.getSubjectLabel(subjectKey)} Quiz`;
    quizUsernameDisplay.textContent = `Student: ${currentUser.name} (${currentUser.id}) • Time limit: ${timeLimit}s`;
    showSection(quizSection);
    renderQuestion();
    startTimer();
});

changeConfigBtn.addEventListener("click", () => {
    showSection(homeSection);
});

// Teacher - add subject
addSubjectBtn.addEventListener("click", () => {
    if (currentUser.role !== "teacher") {
        alert("Only teachers can add subjects.");
        return;
    }
    const key = newSubjectKeyInput.value.trim();
    const label = newSubjectLabelInput.value.trim();
    if (!key || !label) {
        alert("Please enter both subject key and label.");
        return;
    }
    try {
        quizService.addSubject(key, label);
        populateSubjectSelects();
        newSubjectKeyInput.value = "";
        newSubjectLabelInput.value = "";
        alert("Subject added successfully.");
    } catch (err) {
        alert(err.message);
    }
});

// Teacher - add question
addQuestionBtn.addEventListener("click", () => {
    if (currentUser.role !== "teacher") {
        alert("Only teachers can add questions.");
        return;
    }
    const subjectKey = adminSubjectSelect.value;
    const text = adminQuestionText.value.trim();
    const options = adminOptionInputs.map(input => input.value.trim());
    const correctIndex = parseInt(adminCorrectIndexInput.value, 10);

    if (!subjectKey || !text || options.some(o => !o)) {
        alert("Please fill in all question and options fields.");
        return;
    }
    if (isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) {
        alert("Correct option index must be between 0 and 3.");
        return;
    }

    quizService.addQuestion(subjectKey, text, options, correctIndex);
    adminQuestionText.value = "";
    adminOptionInputs.forEach(input => input.value = "");
    adminCorrectIndexInput.value = "0";
    alert("Question added successfully.");
});

// Initialize
populateSubjectSelects();
showSection(authSection);
