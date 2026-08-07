import { db } from '../services/db.js';

export const courseModel = {
  getAllCourses() {
    const rawDb = db.getRawLocalDb();
    return rawDb.courses || [];
  },

  getSubjectsByCourseId(courseId) {
    const rawDb = db.getRawLocalDb();
    return (rawDb.subjects || []).filter(s => !courseId || s.course_id === courseId);
  },

  getTopicsBySubjectId(subjectId) {
    const rawDb = db.getRawLocalDb();
    return (rawDb.topics || []).filter(t => !subjectId || t.subject_id === subjectId);
  },

  addCourse(courseData) {
    const rawDb = db.getRawLocalDb();
    if (!rawDb.courses) rawDb.courses = [];
    rawDb.courses.push(courseData);
    db.saveRawLocalDb(rawDb);
    return courseData;
  },

  addSubject(subjectData) {
    const rawDb = db.getRawLocalDb();
    if (!rawDb.subjects) rawDb.subjects = [];
    rawDb.subjects.push(subjectData);
    db.saveRawLocalDb(rawDb);
    return subjectData;
  }
};

export default courseModel;
