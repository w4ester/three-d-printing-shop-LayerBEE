/**
 * LayerBEE - Module Page JavaScript
 * Handles: quiz functionality, ask tutor buttons, module completion
 */

// ============================================================
// QUIZ HANDLER
// ============================================================

const QuizHandler = {
    answers: {},
    totalQuestions: 0,
    correctAnswers: 0,

    init() {
        const quizContainer = document.getElementById('basics-quiz');
        if (!quizContainer) return;

        const questions = quizContainer.querySelectorAll('.quiz-question');
        this.totalQuestions = questions.length;

        // Add click handlers to all options
        questions.forEach(question => {
            const questionNum = question.getAttribute('data-question');
            const options = question.querySelectorAll('.quiz-option');

            options.forEach(option => {
                option.addEventListener('click', () => {
                    this.handleAnswer(questionNum, option, options);
                });
            });
        });
    },

    handleAnswer(questionNum, selectedOption, allOptions) {
        // If already answered, don't allow changes
        if (this.answers[questionNum] !== undefined) return;

        const isCorrect = selectedOption.getAttribute('data-correct') === 'true';
        this.answers[questionNum] = isCorrect;

        // Mark selected option
        selectedOption.classList.add('selected');

        // Show correct/incorrect
        if (isCorrect) {
            selectedOption.classList.add('correct');
            this.correctAnswers++;
        } else {
            selectedOption.classList.add('incorrect');
            // Show the correct answer
            allOptions.forEach(opt => {
                if (opt.getAttribute('data-correct') === 'true') {
                    opt.classList.add('correct');
                }
            });
        }

        // Disable all options for this question
        allOptions.forEach(opt => opt.disabled = true);

        // Check if quiz is complete
        if (Object.keys(this.answers).length === this.totalQuestions) {
            this.showResults();
        }
    },

    showResults() {
        const resultsDiv = document.getElementById('quiz-results');
        const scoreSpan = document.getElementById('quiz-score');
        const messageP = document.getElementById('quiz-message');

        if (!resultsDiv) return;

        scoreSpan.textContent = this.correctAnswers;

        // Set message based on score
        const percentage = (this.correctAnswers / this.totalQuestions) * 100;
        let message = '';

        if (percentage === 100) {
            message = '🎉 Perfect score! You really know your 3D printing basics!';
        } else if (percentage >= 75) {
            message = 'Great job! You\'ve got a solid understanding!';
        } else if (percentage >= 50) {
            message = '👍 Good effort! Review the sections above and try again.';
        } else {
            message = '📚 Keep learning! Read through the module again and give it another shot.';
        }

        messageP.textContent = message;
        resultsDiv.style.display = 'block';

        // Setup retake button
        const retakeBtn = document.getElementById('retake-quiz');
        if (retakeBtn) {
            retakeBtn.addEventListener('click', () => this.reset());
        }

        // Scroll to results
        resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    reset() {
        this.answers = {};
        this.correctAnswers = 0;

        // Reset all options
        const options = document.querySelectorAll('.quiz-option');
        options.forEach(opt => {
            opt.classList.remove('selected', 'correct', 'incorrect');
            opt.disabled = false;
        });

        // Hide results
        const resultsDiv = document.getElementById('quiz-results');
        if (resultsDiv) {
            resultsDiv.style.display = 'none';
        }

        // Scroll to quiz start
        const quizSection = document.getElementById('quiz');
        if (quizSection) {
            quizSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
};

// ============================================================
// ASK TUTOR BUTTONS
// ============================================================

const AskTutorButtons = {
    init() {
        const buttons = document.querySelectorAll('.ask-tutor-btn');

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const question = btn.getAttribute('data-question');
                if (question && window.TutorUI) {
                    window.TutorUI.open();
                    window.TutorUI.askQuestion(question);
                }
            });
        });
    }
};

// ============================================================
// MODULE COMPLETION
// ============================================================

const ModuleCompletion = {
    init() {
        // Get module ID from page
        const moduleId = this.getModuleId();
        if (!moduleId) return;

        // Check if scrolled to completion section
        const completeSection = document.getElementById('complete');
        if (!completeSection) return;

        // Use Intersection Observer to detect when user reaches completion
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.markComplete(moduleId);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        observer.observe(completeSection);
    },

    getModuleId() {
        const path = window.location.pathname;
        if (path.includes('basics')) return 'basics';
        if (path.includes('workflow')) return 'workflow';
        if (path.includes('troubleshoot')) return 'troubleshoot';
        if (path.includes('advanced')) return 'advanced';
        if (path.includes('business')) return 'business';
        return null;
    },

    markComplete(moduleId) {
        if (window.ProgressTracker) {
            window.ProgressTracker.markModuleComplete(moduleId);
            console.log(`[LayerBEE] Module "${moduleId}" marked as complete!`);
        }
    }
};

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    QuizHandler.init();
    AskTutorButtons.init();
    ModuleCompletion.init();

    console.log('[LayerBEE] Module page initialized!');
});
