import crypto from 'crypto';
import { db } from '../services/db.js';
import { generateQuiz as geminiGenerateQuiz } from '../services/gemini.js';
import { EventSystem } from '../services/events.js';
import { checkAndAwardBadges } from '../controllers/gamificationController.js';

export const generateQuiz = async (req, res) => {
  const { userId = '11111111-1111-1111-1111-111111111111', topic, text, difficulty = 'Medium', questionCount = 10 } = req.body;

  try {
    let contextText = "";
    let mainTopic = topic || "Study Topic";
    if (text) {
      contextText = `Source Text:\n${text}`;
      const firstLine = text.split('\n')[0] || '';
      if (!topic && firstLine.includes(':')) {
        mainTopic = firstLine.split(':')[1].trim();
      } else if (!topic) {
        mainTopic = firstLine.slice(0, 35).trim() || "Document Content";
      }
    } else if (topic) {
      contextText = `Topic: ${topic}`;
      mainTopic = topic;
    } else {
      return res.status(400).json({ error: 'Either topic or text is required' });
    }

    let parsedCount = parseInt(questionCount, 10);
    if (isNaN(parsedCount) || parsedCount < 1 || parsedCount > 20) {
        parsedCount = 10;
    }

    const quizData = await geminiGenerateQuiz(contextText, difficulty, mainTopic, parsedCount);

    // Ensure strict topic naming alignment for Topics to Review display
    if (quizData.questions && Array.isArray(quizData.questions)) {
      quizData.questions.forEach((q, i) => {
        if (q.specific_subtopic && q.specific_subtopic !== mainTopic && q.specific_subtopic.length < 60) {
          q.topic = q.specific_subtopic;
        } else if (!q.topic || q.topic === 'General' || q.topic === 'Advanced Technical Concepts' || q.topic === 'JavaScript' || q.topic === 'React' || q.topic === mainTopic) {
          const qWords = (q.question || '').replace(/What is|Why is|Why does|How does|Which of the following|When does|In the context of|According to/gi, '').trim().split(' ').slice(0, 4).join(' ').replace(/[^a-zA-Z0-9 ]/g, '').trim();
          q.topic = qWords ? `${mainTopic}: ${qWords}` : `${mainTopic}: Concept ${i + 1}`;
        }
      });
    }

    // Store generated quiz in database
    const quizId = "quiz-" + crypto.randomUUID();
    const newQuiz = {
      id: quizId,
      user_id: userId,
      title: mainTopic,
      topic: mainTopic,
      difficulty,
      total_questions: quizData.questions ? quizData.questions.length : 10,
      created_at: new Date().toISOString()
    };
    await db.insert('quizzes', newQuiz);

    await EventSystem.emit('QUIZ_STARTED', {
      userId,
      title: `Generated AI Quiz on: ${mainTopic} (${difficulty})`,
      xpAward: 5
    });

    res.json({ ...quizData, quizId, topic: mainTopic });

  } catch (error) {
    console.error("Quiz Generation Error:", error);
    res.status(500).json({ error: 'Failed to generate quiz', details: error.toString() });
  }
};

export const submitQuiz = async (req, res) => {
  try {
    const { quizId, userId = '11111111-1111-1111-1111-111111111111', score, totalQuestions, timeTakenSeconds = 120 } = req.body;
    
    const accuracy = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    const correctAnswers = Number(score);
    const wrongAnswers = Number(totalQuestions) - correctAnswers;

    const resultRecord = {
      id: "res-" + crypto.randomUUID(),
      quiz_id: quizId || "quiz-generic",
      user_id: userId,
      score: correctAnswers,
      accuracy,
      time_taken_seconds: timeTakenSeconds,
      correct_answers: correctAnswers,
      wrong_answers: wrongAnswers,
      submitted_at: new Date().toISOString()
    };
    await db.insert('quiz_results', resultRecord);

    let xpReward = correctAnswers * 15;
    if (accuracy === 100) xpReward += 50; // Perfect score bonus

    await EventSystem.emit('QUIZ_SUBMITTED', {
      userId,
      title: `Completed Quiz with ${accuracy}% accuracy (${correctAnswers}/${totalQuestions})`,
      details: resultRecord,
      xpAward: xpReward
    });

    await checkAndAwardBadges(userId);

    res.json({ success: true, xpEarned: xpReward, accuracy });
  } catch (err) {
    console.error("Quiz Submit Error:", err);
    res.status(500).json({ error: 'Failed to submit quiz scores.' });
  }
};

export default {
  generateQuiz,
  submitQuiz
};
