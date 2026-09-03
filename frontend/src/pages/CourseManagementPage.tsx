import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Course, Module, Lesson, LessonResource, VideoSource, Level, Category } from '../types';
import {
  BookOpen,
  Plus,
  PlayCircle,
  Video,
  FileText,
  HelpCircle,
  Award,
  CheckCircle,
  CheckCircle2,
  Eye,
  ArrowLeft,
  Upload,
  Clock,
  Sparkles,
  Trash2,
  AlertTriangle,
  Edit,
  ArrowUp,
  ArrowDown,
  Download,
  Link as LinkIcon,
  X,
  Layers,
  Settings,
  ListPlus,
  Target,
  CheckSquare,
  BarChart3,
} from 'lucide-react';
import { resolveMediaUrl, DEFAULT_COURSE_THUMBNAIL } from '../utils/media';
import { formatLessonDuration } from '../utils/formatters';
import { CourseAnalyticsModal } from '../components/CourseAnalyticsModal';

export const CourseManagementPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgSrc, setImgSrc] = useState<string>(DEFAULT_COURSE_THUMBNAIL);
  const [activeTab, setActiveTab] = useState<'curriculum' | 'settings'>('curriculum');
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  // Course Details Form State
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [level, setLevel] = useState<Level>('BEGINNER');
  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState('0.00');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  // Dynamic Array Fields for Course
  const [objectives, setObjectives] = useState<string[]>([]);
  const [newObjective, setNewObjective] = useState('');
  const [requirements, setRequirements] = useState<string[]>([]);
  const [newRequirement, setNewRequirement] = useState('');
  const [audiences, setAudiences] = useState<string[]>([]);
  const [newAudience, setNewAudience] = useState('');
  const [savingCourseInfo, setSavingCourseInfo] = useState(false);
  const [courseInfoSavedSuccess, setCourseInfoSavedSuccess] = useState(false);

  // Course Completion & Certification Requirements State
  const [certificateEnabled, setCertificateEnabled] = useState(true);
  const [requireAllLessons, setRequireAllLessons] = useState(true);
  const [requireQuizzes, setRequireQuizzes] = useState(false);
  const [quizPassingScore, setQuizPassingScore] = useState(70);
  const [requireAssignments, setRequireAssignments] = useState(false);
  const [assignmentPassingScore, setAssignmentPassingScore] = useState(70);
  const [requireFinalAssessment, setRequireFinalAssessment] = useState(false);
  const [finalAssessmentPassingScore, setFinalAssessmentPassingScore] = useState(70);
  const [finalAssessmentQuizId, setFinalAssessmentQuizId] = useState('');
  const [minimumProgressPercentage, setMinimumProgressPercentage] = useState(100);

  // Delete Course State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(false);

  // Add / Edit Module Modal State
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');

  // Delete Module Modal State
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const [deletingModule, setDeletingModule] = useState(false);

  // Add / Edit Lesson Modal State
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [lessonNotes, setLessonNotes] = useState('');
  const [lessonTranscript, setLessonTranscript] = useState('');
  const [videoSource, setVideoSource] = useState<VideoSource>('YOUTUBE');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState(0);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [isRequiredLesson, setIsRequiredLesson] = useState(true);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [lessonTab, setLessonTab] = useState<'video' | 'overview' | 'notes' | 'transcript'>('video');

  // Delete Lesson Modal State
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [deletingLesson, setDeletingLesson] = useState(false);

  // Resource Management Modal State
  const [resourceLesson, setResourceLesson] = useState<Lesson | null>(null);
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceFileUrl, setResourceFileUrl] = useState('');
  const [resourceFileName, setResourceFileName] = useState('');
  const [addingResource, setAddingResource] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCourseDetails();
    fetchCategories();
  }, [courseId]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.categories || []);
    } catch (e) {}
  };

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const myCoursesRes = await api.get('/courses/instructor/my-courses');
      const myCourses: Course[] = myCoursesRes.data.courses || [];
      const found = myCourses.find((c) => c.id === courseId || c.slug === courseId);

      if (!found) {
        setError('You do not have permission to manage this course or course not found.');
        return;
      }

      const detailRes = await api.get(`/courses/${found.slug}`);
      const fetched: Course = detailRes.data.course;
      setCourse(fetched);
      setImgSrc(resolveMediaUrl(fetched.thumbnail));

      // Populate course info state
      setCourseTitle(fetched.title);
      setCourseDescription(fetched.description || '');
      setCategoryId(fetched.category?.id || (fetched as any).categoryId || '');
      setLevel(fetched.level || 'BEGINNER');
      setIsFree(fetched.isFree || false);
      setPrice(fetched.price ? fetched.price.toFixed(2) : '0.00');
      setThumbnailUrl(fetched.thumbnail || '');
      setObjectives(Array.isArray(fetched.learningObjectives) ? fetched.learningObjectives : []);
      setRequirements(Array.isArray(fetched.requirements) ? fetched.requirements : []);
      setAudiences(Array.isArray(fetched.targetAudience) ? fetched.targetAudience : []);

      // Populate completion & certification state
      setCertificateEnabled(fetched.certificateEnabled !== false);
      setRequireAllLessons(fetched.requireAllLessons !== false);
      setRequireQuizzes(fetched.requireQuizzes || false);
      setQuizPassingScore(fetched.quizPassingScore || 70);
      setRequireAssignments(fetched.requireAssignments || false);
      setAssignmentPassingScore(fetched.assignmentPassingScore || 70);
      setRequireFinalAssessment(fetched.requireFinalAssessment || false);
      setFinalAssessmentPassingScore(fetched.finalAssessmentPassingScore || 70);
      setFinalAssessmentQuizId(fetched.finalAssessmentQuizId || '');
      setMinimumProgressPercentage(fetched.minimumProgressPercentage || 100);
    } catch (err: any) {
      setError(err.response?.data?.message || 'You do not have permission to manage this course.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Course Information Handlers
  // -------------------------------------------------------------
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingThumbnail(true);
      const res = await api.post('/upload/thumbnail', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setThumbnailUrl(res.data.file.url);
      setImgSrc(resolveMediaUrl(res.data.file.url));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Thumbnail upload failed.');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleSaveCourseInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;
    try {
      setSavingCourseInfo(true);
      await api.patch(`/courses/${course.id}`, {
        title: courseTitle.trim(),
        description: courseDescription.trim(),
        categoryId: categoryId || undefined,
        level,
        isFree,
        price: isFree ? 0 : parseFloat(price),
        thumbnail: thumbnailUrl.trim() || undefined,
        learningObjectives: objectives,
        requirements: requirements,
        targetAudience: audiences,
        certificateEnabled,
        requireAllLessons,
        requireQuizzes,
        quizPassingScore: parseFloat(String(quizPassingScore)),
        requireAssignments,
        assignmentPassingScore: parseFloat(String(assignmentPassingScore)),
        requireFinalAssessment,
        finalAssessmentPassingScore: parseFloat(String(finalAssessmentPassingScore)),
        finalAssessmentQuizId: finalAssessmentQuizId || null,
        minimumProgressPercentage: parseFloat(String(minimumProgressPercentage)),
      });

      setCourseInfoSavedSuccess(true);
      setTimeout(() => setCourseInfoSavedSuccess(false), 3000);
      fetchCourseDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update course information.');
    } finally {
      setSavingCourseInfo(false);
    }
  };

  const addObjective = () => {
    if (!newObjective.trim()) return;
    setObjectives((prev) => [...prev, newObjective.trim()]);
    setNewObjective('');
  };

  const removeObjective = (index: number) => {
    setObjectives((prev) => prev.filter((_, i) => i !== index));
  };

  const addRequirement = () => {
    if (!newRequirement.trim()) return;
    setRequirements((prev) => [...prev, newRequirement.trim()]);
    setNewRequirement('');
  };

  const removeRequirement = (index: number) => {
    setRequirements((prev) => prev.filter((_, i) => i !== index));
  };

  const addAudience = () => {
    if (!newAudience.trim()) return;
    setAudiences((prev) => [...prev, newAudience.trim()]);
    setNewAudience('');
  };

  const removeAudience = (index: number) => {
    setAudiences((prev) => prev.filter((_, i) => i !== index));
  };

  // -------------------------------------------------------------
  // Module Handlers
  // -------------------------------------------------------------
  const openAddModuleModal = () => {
    setEditingModule(null);
    setModuleTitle('');
    setModuleDescription('');
    setShowModuleModal(true);
  };

  const openEditModuleModal = (mod: Module) => {
    setEditingModule(mod);
    setModuleTitle(mod.title);
    setModuleDescription(mod.description || '');
    setShowModuleModal(true);
  };

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course || !moduleTitle.trim()) return;
    try {
      setSaving(true);
      if (editingModule) {
        await api.patch(`/modules/${editingModule.id}`, {
          title: moduleTitle.trim(),
          description: moduleDescription.trim() || undefined,
        });
      } else {
        const order = (course.modules?.length || 0) + 1;
        await api.post('/modules', {
          courseId: course.id,
          title: moduleTitle.trim(),
          description: moduleDescription.trim() || undefined,
          order,
        });
      }
      setShowModuleModal(false);
      setEditingModule(null);
      setModuleTitle('');
      setModuleDescription('');
      fetchCourseDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save module.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModule = async () => {
    if (!moduleToDelete) return;
    try {
      setDeletingModule(true);
      await api.delete(`/modules/${moduleToDelete.id}`);
      setModuleToDelete(null);
      fetchCourseDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete module.');
    } finally {
      setDeletingModule(false);
    }
  };

  const handleMoveModule = async (index: number, direction: 'up' | 'down') => {
    if (!course || !course.modules) return;
    const modules = [...course.modules];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    const temp = modules[index];
    modules[index] = modules[targetIndex];
    modules[targetIndex] = temp;

    try {
      const moduleIds = modules.map((m) => m.id);
      await api.put('/modules/reorder', {
        courseId: course.id,
        moduleIds,
      });
      fetchCourseDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reorder modules.');
    }
  };

  // -------------------------------------------------------------
  // Lesson Handlers
  // -------------------------------------------------------------
  const openAddLessonModal = (moduleId: string) => {
    setActiveModuleId(moduleId);
    setEditingLesson(null);
    setLessonTitle('');
    setLessonDescription('');
    setLessonNotes('');
    setLessonTranscript('');
    setVideoSource('YOUTUBE');
    setYoutubeUrl('');
    setUploadedVideoUrl('');
    setUploadedFileName('');
    setUploadedFileSize(0);
    setIsPreview(false);
    setIsRequiredLesson(true);
    setDurationMinutes(0);
    setLessonTab('video');
  };

  const openEditLessonModal = (moduleId: string, lesson: Lesson) => {
    setActiveModuleId(moduleId);
    setEditingLesson(lesson);
    setLessonTitle(lesson.title);
    setLessonDescription(lesson.description || '');
    setLessonNotes(lesson.notes || lesson.textContent || '');
    setLessonTranscript(lesson.transcript || '');
    setVideoSource(lesson.videoSource || 'YOUTUBE');
    setYoutubeUrl(lesson.videoSource === 'YOUTUBE' ? (lesson.videoUrl || (lesson.youtubeVideoId ? `https://www.youtube.com/watch?v=${lesson.youtubeVideoId}` : '')) : '');
    setUploadedVideoUrl(lesson.videoSource === 'UPLOAD' ? (lesson.videoUrl || '') : '');
    setUploadedFileName(lesson.fileName || '');
    setUploadedFileSize(lesson.fileSize || 0);
    setIsPreview(lesson.isPreview || false);
    setIsRequiredLesson(lesson.isRequired !== false);
    setDurationMinutes(lesson.durationMinutes || 0);
    setLessonTab('video');
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    const ext = (file.name.split('.').pop() || '').toLowerCase();

    if (!allowedTypes.includes(file.type.toLowerCase()) && !['mp4', 'webm', 'ogg', 'mov'].includes(ext)) {
      alert(`Unsupported video file format '${file.name}'. Please upload a web-compatible MP4 or WebM video.`);
      e.target.value = '';
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      alert('Video file exceeds the maximum allowed upload size of 200 MB.');
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingVideo(true);
      const res = await api.post('/upload/video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadedVideoUrl(res.data.file.videoUrl);
      setUploadedFileName(res.data.file.fileName);
      setUploadedFileSize(res.data.file.fileSize);
      if (res.data.file.durationMinutes) {
        setDurationMinutes(res.data.file.durationMinutes);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Video upload failed.');
      e.target.value = '';
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModuleId || !lessonTitle.trim()) return;
    try {
      setSaving(true);
      let youtubeVideoId = null;
      if (videoSource === 'YOUTUBE' && youtubeUrl.trim()) {
        const match = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        youtubeVideoId = match ? match[1] : youtubeUrl.trim();
      }

      const durMin = parseInt(String(durationMinutes));
      const payload = {
        moduleId: activeModuleId,
        title: lessonTitle.trim(),
        description: lessonDescription.trim() || undefined,
        notes: lessonNotes.trim() || undefined,
        textContent: lessonNotes.trim() || undefined,
        transcript: lessonTranscript.trim() || undefined,
        contentType: 'VIDEO',
        videoSource,
        youtubeVideoId: videoSource === 'YOUTUBE' ? (youtubeVideoId || undefined) : undefined,
        videoUrl: videoSource === 'UPLOAD' ? (uploadedVideoUrl || undefined) : (youtubeUrl.trim() || undefined),
        fileName: videoSource === 'UPLOAD' ? (uploadedFileName || undefined) : undefined,
        fileSize: videoSource === 'UPLOAD' ? (uploadedFileSize || undefined) : undefined,
        durationMinutes: !isNaN(durMin) && durMin > 0 ? durMin : undefined,
        isPreview,
        isRequired: isRequiredLesson,
      };

      if (editingLesson) {
        await api.patch(`/lessons/${editingLesson.id}`, payload);
      } else {
        const currentMod = course?.modules?.find((m) => m.id === activeModuleId);
        const order = (currentMod?.lessons?.length || 0) + 1;
        await api.post('/lessons', { ...payload, order });
      }

      setActiveModuleId(null);
      setEditingLesson(null);
      fetchCourseDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save lesson.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLesson = async () => {
    if (!lessonToDelete) return;
    try {
      setDeletingLesson(true);
      await api.delete(`/lessons/${lessonToDelete.id}`);
      setLessonToDelete(null);
      fetchCourseDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete lesson.');
    } finally {
      setDeletingLesson(false);
    }
  };

  const handleMoveLesson = async (module: Module, index: number, direction: 'up' | 'down') => {
    const lessons = [...module.lessons];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const temp = lessons[index];
    lessons[index] = lessons[targetIndex];
    lessons[targetIndex] = temp;

    try {
      const lessonIds = lessons.map((l) => l.id);
      await api.put('/lessons/reorder', {
        moduleId: module.id,
        lessonIds,
      });
      fetchCourseDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reorder lessons.');
    }
  };

  // -------------------------------------------------------------
  // Lesson Resource Handlers
  // -------------------------------------------------------------
  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceLesson || !resourceTitle.trim() || !resourceFileUrl.trim()) return;

    try {
      setAddingResource(true);
      await api.post(`/lessons/${resourceLesson.id}/resources`, {
        title: resourceTitle.trim(),
        fileUrl: resourceFileUrl.trim(),
        fileName: resourceFileName.trim() || resourceTitle.trim(),
      });

      setResourceTitle('');
      setResourceFileUrl('');
      setResourceFileName('');

      // Refresh course details and active resource lesson
      await fetchCourseDetails();
      const updatedRes = await api.get(`/lessons/${resourceLesson.id}`);
      if (updatedRes.data.success) {
        setResourceLesson(updatedRes.data.lesson);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to attach resource.');
    } finally {
      setAddingResource(false);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm('Are you sure you want to remove this resource file?')) return;
    try {
      await api.delete(`/lessons/resources/${resourceId}`);
      await fetchCourseDetails();
      if (resourceLesson) {
        const updatedRes = await api.get(`/lessons/${resourceLesson.id}`);
        if (updatedRes.data.success) {
          setResourceLesson(updatedRes.data.lesson);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete resource.');
    }
  };

  // -------------------------------------------------------------
  // Publish / Draft Toggle
  // -------------------------------------------------------------
  const handleTogglePublishStatus = async () => {
    if (!course) return;
    try {
      const newStatus = course.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
      await api.patch(`/courses/${course.id}`, { status: newStatus });
      fetchCourseDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update course status.');
    }
  };

  const handleDeleteCourse = async () => {
    if (!course) return;
    try {
      setDeletingCourse(true);
      await api.delete(`/courses/${course.id}`);
      navigate('/instructor/dashboard');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete course.');
      setDeletingCourse(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F1F5F7] text-[#0B1F3A] dark:text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#087F78] border-t-transparent"></div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl text-center text-[#0B1F3A] dark:text-white space-y-4 shadow-xs font-sans">
        <h2 className="text-lg font-extrabold text-[#0B1F3A] dark:text-white">Course Management Error</h2>
        <p className="text-xs text-slate-500 dark:text-[#A9BACB]">{error || 'Course not found.'}</p>
        <Link
          to="/instructor/dashboard"
          className="inline-flex px-5 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold rounded-xl text-xs shadow-xs transition"
        >
          Return to Instructor Studio
        </Link>
      </div>
    );
  }

  const allLessons = course.modules?.flatMap((m) => m.lessons) || [];
  const totalDuration = allLessons.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);

  return (
    <div className="min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white p-4 sm:p-8 lg:p-10 font-sans pb-24 transition-colors">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header & Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#1E3A56] pb-6">
          <div>
            <Link
              to="/instructor/dashboard"
              className="inline-flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-[#087F78] dark:hover:text-[#14B8A6] font-bold mb-2 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Instructor Studio</span>
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] dark:text-white tracking-tight">
                {course.title}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                course.status === 'PUBLISHED'
                  ? 'bg-teal-50 dark:bg-[#087F78]/30 text-[#087F78] dark:text-[#14B8A6] border border-teal-200 dark:border-teal-700/50'
                  : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50'
              }`}>
                {course.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Curriculum design, module sequencing, and instructional assets manager.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAnalyticsModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-teal-50 dark:bg-[#087F78]/20 hover:bg-teal-100 dark:hover:bg-[#087F78]/30 border border-teal-200 dark:border-teal-700/50 text-[#087F78] dark:text-[#14B8A6] font-bold rounded-xl text-xs transition shadow-xs"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Submissions & Analytics</span>
            </button>

            <Link
              to={`/courses/${course.slug}`}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-white dark:bg-[#152F4A] hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[#0B1F3A] dark:text-white font-bold rounded-xl text-xs transition shadow-xs"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Student View</span>
            </Link>
            
            <button
              onClick={handleTogglePublishStatus}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-xs ${
                course.status === 'PUBLISHED'
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-[#087F78] hover:bg-[#076E6A] text-white'
              }`}
            >
              {course.status === 'PUBLISHED' ? 'Unpublish to Draft' : 'Publish Course'}
            </button>

            {/* Delete Course Button */}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-white dark:bg-[#152F4A] hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 hover:border-red-200 text-[#EF4444] font-bold rounded-xl text-xs transition shadow-xs"
              title="Delete Course"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="flex items-center space-x-4 border-b border-slate-200 dark:border-[#1E3A56] pb-3">
          <button
            onClick={() => setActiveTab('curriculum')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'curriculum'
                ? 'bg-[#087F78] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white hover:bg-white dark:bg-[#102A43] dark:hover:bg-[#152F4A]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Curriculum Builder ({course.modules?.length || 0} Modules · {allLessons.length} Lessons)</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'settings'
                ? 'bg-[#087F78] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white hover:bg-white dark:bg-[#102A43] dark:hover:bg-[#152F4A]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Course Information & Learning Outcomes</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: CURRICULUM BUILDER */}
        {/* ========================================================= */}
        {activeTab === 'curriculum' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Main Col: Curriculum Management */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-[#0B1F3A] dark:text-white">Course Curriculum</h3>
                  <p className="text-xs text-slate-500 dark:text-[#A9BACB]">Organize your course into structured modules and lessons.</p>
                </div>
                <button
                  onClick={openAddModuleModal}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold rounded-xl text-xs shadow-xs transition"
                >
                  <Plus className="h-4 w-4" /> <span>Add Module</span>
                </button>
              </div>

              <div className="space-y-4">
                {course.modules?.length === 0 ? (
                  <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-2xl p-8 text-center space-y-2 shadow-xs">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-bold text-[#0B1F3A] dark:text-white">No modules added yet</h4>
                    <p className="text-xs text-slate-500 dark:text-[#A9BACB]">Click "+ Add Module" above to start structuring your course lessons.</p>
                  </div>
                ) : (
                  course.modules?.map((mod, mIdx) => (
                    <div key={mod.id} className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-2xl overflow-hidden shadow-xs">
                      
                      {/* Module Header Bar */}
                      <div className="p-4 bg-slate-50 dark:bg-[#152F4A] border-b border-slate-200 dark:border-[#1E3A56] flex items-center justify-between flex-wrap gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-[#087F78] uppercase tracking-wider font-mono">Module {mIdx + 1}</span>
                          <h4 className="text-sm font-extrabold text-[#0B1F3A] dark:text-white truncate">{mod.title}</h4>
                          {mod.description && <p className="text-xs text-slate-500 dark:text-[#A9BACB] mt-0.5">{mod.description}</p>}
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Module Reorder Buttons */}
                          <div className="flex items-center space-x-1 border-r border-slate-200 dark:border-[#1E3A56] pr-2">
                            <button
                              onClick={() => handleMoveModule(mIdx, 'up')}
                              disabled={mIdx === 0}
                              className="p-1.5 text-slate-400 hover:text-[#087F78] disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D]"
                              title="Move Module Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveModule(mIdx, 'down')}
                              disabled={mIdx === (course.modules?.length || 1) - 1}
                              className="p-1.5 text-slate-400 hover:text-[#087F78] disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D]"
                              title="Move Module Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Edit Module */}
                          <button
                            onClick={() => openEditModuleModal(mod)}
                            className="p-1.5 text-slate-600 dark:text-[#A9BACB] hover:text-[#087F78] rounded-lg hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D] transition"
                            title="Edit Module Title"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Module */}
                          <button
                            onClick={() => setModuleToDelete(mod)}
                            className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition"
                            title="Delete Module"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Add Lesson to Module */}
                          <button
                            onClick={() => openAddLessonModal(mod.id)}
                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-[#087F78] border border-teal-200 font-bold rounded-lg text-xs transition"
                          >
                            <Plus className="h-3.5 w-3.5" /> <span>Add Lesson</span>
                          </button>
                        </div>
                      </div>

                      {/* Lessons List inside Module */}
                      <div className="divide-y divide-slate-100 dark:divide-[#1E3A56] p-2">
                        {mod.lessons?.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400">
                            No lessons in this module yet. Click "Add Lesson" to upload videos or create content.
                          </div>
                        ) : (
                          mod.lessons?.map((les, lIdx) => (
                            <div key={les.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-[#152F4A] dark:bg-[#152F4A] rounded-xl transition">
                              <div className="flex items-center space-x-3 min-w-0 pr-2">
                                <span className="text-xs font-bold text-slate-400 w-5 text-center font-mono">{lIdx + 1}.</span>
                                <div className="min-w-0">
                                  <h5 className="text-xs font-bold text-[#0B1F3A] dark:text-white truncate">{les.title}</h5>
                                  <div className="flex items-center space-x-2 text-[10px] text-slate-500 dark:text-[#A9BACB] mt-0.5 flex-wrap">
                                    <span className="font-bold text-[#087F78] uppercase font-mono">{les.videoSource}</span>
                                    <span>•</span>
                                    <span className="font-mono">{formatLessonDuration(les.durationMinutes, (les as any).durationSeconds)}</span>
                                    {les.isPreview && (
                                      <>
                                        <span>•</span>
                                        <span className="text-teal-600 font-bold">Free Preview</span>
                                      </>
                                    )}
                                    {les.resources && les.resources.length > 0 && (
                                      <>
                                        <span>•</span>
                                        <span className="text-[#087F78] font-medium">{les.resources.length} resource(s)</span>
                                      </>
                                    )}
                                    {(les.transcript || les.notes) && (
                                      <>
                                        <span>•</span>
                                        <span className="text-slate-400">Notes/Transcript attached</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Lesson Controls */}
                              <div className="flex items-center space-x-1.5 flex-shrink-0">
                                {/* Lesson Reordering */}
                                <button
                                  onClick={() => handleMoveLesson(mod, lIdx, 'up')}
                                  disabled={lIdx === 0}
                                  className="p-1 text-slate-400 hover:text-[#087F78] disabled:opacity-30 rounded hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D]"
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleMoveLesson(mod, lIdx, 'down')}
                                  disabled={lIdx === mod.lessons.length - 1}
                                  className="p-1 text-slate-400 hover:text-[#087F78] disabled:opacity-30 rounded hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D]"
                                  title="Move Down"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>

                                {/* Manage Lesson Resources */}
                                <button
                                  onClick={() => setResourceLesson(les)}
                                  className="p-1.5 text-slate-600 dark:text-[#A9BACB] hover:text-[#087F78] rounded-lg hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D] transition"
                                  title="Manage Downloadable Resources"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>

                                {/* Edit Lesson */}
                                <button
                                  onClick={() => openEditLessonModal(mod.id, les)}
                                  className="p-1.5 text-slate-600 dark:text-[#A9BACB] hover:text-[#087F78] rounded-lg hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D] transition"
                                  title="Edit Lesson Content"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete Lesson */}
                                <button
                                  onClick={() => setLessonToDelete(les)}
                                  className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition"
                                  title="Delete Lesson"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Play Preview */}
                                <Link
                                  to={`/courses/${course.slug}/learn?lessonId=${les.id}`}
                                  className="p-1.5 text-slate-400 hover:text-[#087F78] rounded-lg transition"
                                  title="Watch Lesson in Player"
                                >
                                  <PlayCircle className="w-4 h-4" />
                                </Link>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Col: Course Live Summary Card */}
            <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-3xl p-6 space-y-6 shadow-xs lg:sticky lg:top-24">
              <div className="aspect-video rounded-2xl overflow-hidden bg-slate-100 dark:bg-[#0B223D] border border-slate-200 dark:border-[#1E3A56] shadow-inner relative">
                <img
                  src={imgSrc}
                  alt={course.title}
                  onError={() => setImgSrc(DEFAULT_COURSE_THUMBNAIL)}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-3 border-t border-slate-100 dark:border-[#1E3A56] pt-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#A9BACB] font-medium">Pricing Mode</span>
                  <span className="font-bold text-[#087F78] font-mono">{course.isFree ? 'FREE' : `${course.price.toFixed(0)} KSH`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#A9BACB] font-medium">Total Modules</span>
                  <span className="font-bold text-[#0B1F3A] dark:text-white font-mono">{course.modules?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#A9BACB] font-medium">Total Lessons</span>
                  <span className="font-bold text-[#0B1F3A] dark:text-white font-mono">{allLessons.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#A9BACB] font-medium">Calculated Duration</span>
                  <span className="font-bold text-[#087F78] font-mono">
                    {Math.floor(totalDuration / 60)}h {totalDuration % 60}m ({totalDuration} mins)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-[#A9BACB] font-medium">Instructor</span>
                  <span className="font-bold text-[#0B1F3A] dark:text-white">{course.instructor?.name}</span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('settings')}
                className="w-full py-2.5 bg-slate-50 dark:bg-[#152F4A] hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D] border border-slate-200 dark:border-[#1E3A56] text-slate-700 dark:text-[#A9BACB] hover:text-[#0B1F3A] rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-xs"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Edit Course Metadata & Objectives</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: COURSE INFORMATION & LEARNING OUTCOMES SETTINGS */}
        {/* ========================================================= */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveCourseInfo} className="max-w-4xl mx-auto space-y-8">
            
            {/* 1. Basic Metadata Card */}
            <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#087F78]" />
                <span>Core Course Information</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase mb-1">Course Title *</label>
                  <input
                    type="text"
                    required
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-sm text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-[#A9BACB] focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase mb-1">Course Overview / Description *</label>
                  <textarea
                    rows={4}
                    required
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    placeholder="Comprehensive overview of what this course covers..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-[#A9BACB] focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase mb-1">Category</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase mb-1">Skill Level</label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value as Level)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase mb-1">Pricing (KSH)</label>
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center space-x-1.5 text-xs text-slate-700 dark:text-[#A9BACB]">
                        <input
                          type="checkbox"
                          checked={isFree}
                          onChange={(e) => setIsFree(e.target.checked)}
                          className="accent-[#087F78]"
                        />
                        <span>Free</span>
                      </label>
                      {!isFree && (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Thumbnail Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase mb-1">Course Thumbnail</label>
                  <div className="flex items-center space-x-4">
                    {thumbnailUrl && (
                      <img src={resolveMediaUrl(thumbnailUrl)} alt="Thumbnail" className="w-20 h-14 rounded-xl object-cover border border-slate-200 dark:border-[#1E3A56] shadow-xs" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="text-xs text-slate-600 dark:text-[#A9BACB] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#087F78] file:text-white hover:file:bg-[#076E6A] cursor-pointer"
                    />
                    {uploadingThumbnail && <span className="text-xs text-[#087F78] font-medium">Uploading image...</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. What You'll Learn (Learning Objectives) */}
            <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
              <div>
                <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-[#087F78]" />
                  <span>What You'll Learn (Learning Objectives)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#A9BACB] mt-1">
                  Add concrete, actionable skills students will master upon finishing this course.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addObjective(); } }}
                  placeholder="e.g. Architect highly available Kubernetes clusters on AWS"
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-[#A9BACB] focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                />
                <button
                  type="button"
                  onClick={addObjective}
                  className="px-4 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold rounded-xl text-xs shadow-xs transition"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {objectives.map((obj, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-slate-700 dark:text-[#A9BACB]">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-[#087F78] flex-shrink-0" />
                      <span>{obj}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeObjective(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Prerequisites & Requirements */}
            <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
              <div>
                <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                  <ListPlus className="w-5 h-5 text-[#087F78]" />
                  <span>Prerequisites & Requirements</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#A9BACB] mt-1">
                  Specify prior knowledge, software tools, or background required before taking this course.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newRequirement}
                  onChange={(e) => setNewRequirement(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRequirement(); } }}
                  placeholder="e.g. Basic familiarity with terminal command line operations"
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-[#A9BACB] focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                />
                <button
                  type="button"
                  onClick={addRequirement}
                  className="px-4 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold rounded-xl text-xs shadow-xs transition"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {requirements.map((req, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-slate-700 dark:text-[#A9BACB]">
                    <span>• {req}</span>
                    <button
                      type="button"
                      onClick={() => removeRequirement(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Target Audience */}
            <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
              <div>
                <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#087F78]" />
                  <span>Target Audience</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#A9BACB] mt-1">
                  Define who will benefit the most from enrolling in this course.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newAudience}
                  onChange={(e) => setNewAudience(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAudience(); } }}
                  placeholder="e.g. Cloud Engineers, DevOps Architects, and Aspiring SysAdmins"
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-[#A9BACB] focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                />
                <button
                  type="button"
                  onClick={addAudience}
                  className="px-4 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold rounded-xl text-xs shadow-xs transition"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {audiences.map((aud, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-slate-700 dark:text-[#A9BACB]">
                    <span>• {aud}</span>
                    <button
                      type="button"
                      onClick={() => removeAudience(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Course Completion & Certification Requirements */}
            <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div>
                <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <span>Course Completion & Certificate Validation Criteria</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#A9BACB] mt-1">
                  Configure server-enforced requirements that students must verifiably complete to earn their official course certificate.
                </p>
              </div>

              <div className="space-y-4 divide-y divide-slate-100 dark:divide-[#1E3A56]">
                {/* Certificate Issuance Enablement */}
                <div className="pt-2 flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-[#0B1F3A] dark:text-white block">Certificate Issuance</label>
                    <p className="text-[11px] text-slate-500 dark:text-[#A9BACB]">Enable digital verifiable certificate generation upon course completion.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={certificateEnabled}
                      onChange={(e) => setCertificateEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-[#102A43] after:border-gray-300 dark:border-[#1E3A56] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#087F78]"></div>
                  </label>
                </div>

                {/* Lesson Watch Progress Requirement */}
                <div className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-[#0B1F3A] dark:text-white block">Require Required Lessons</label>
                      <p className="text-[11px] text-slate-500 dark:text-[#A9BACB]">Students must complete all required lessons (minimum 60% watch time per video).</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requireAllLessons}
                        onChange={(e) => setRequireAllLessons(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-[#102A43] after:border-gray-300 dark:border-[#1E3A56] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#087F78]"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-[#A9BACB] uppercase mb-1">Minimum Course Progress %</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={minimumProgressPercentage}
                        onChange={(e) => setMinimumProgressPercentage(parseFloat(e.target.value) || 100)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                      />
                    </div>
                  </div>
                </div>

                {/* Quizzes Requirement */}
                <div className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-[#0B1F3A] dark:text-white block">Require Quizzes</label>
                      <p className="text-[11px] text-slate-500 dark:text-[#A9BACB]">Students must pass all required module quizzes to qualify for certification.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requireQuizzes}
                        onChange={(e) => setRequireQuizzes(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-[#102A43] after:border-gray-300 dark:border-[#1E3A56] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#087F78]"></div>
                    </label>
                  </div>

                  {requireQuizzes && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2 border-l-2 border-[#087F78]/40">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-[#A9BACB] uppercase mb-1">Default Quiz Passing Score %</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={quizPassingScore}
                          onChange={(e) => setQuizPassingScore(parseFloat(e.target.value) || 70)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Assignments Requirement */}
                <div className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-[#0B1F3A] dark:text-white block">Require Assignments</label>
                      <p className="text-[11px] text-slate-500 dark:text-[#A9BACB]">Students must submit required projects and receive instructor approval.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requireAssignments}
                        onChange={(e) => setRequireAssignments(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-[#102A43] after:border-gray-300 dark:border-[#1E3A56] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#087F78]"></div>
                    </label>
                  </div>

                  {requireAssignments && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2 border-l-2 border-[#087F78]/40">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-[#A9BACB] uppercase mb-1">Assignment Passing Score %</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={assignmentPassingScore}
                          onChange={(e) => setAssignmentPassingScore(parseFloat(e.target.value) || 70)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Final Assessment Requirement */}
                <div className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-[#0B1F3A] dark:text-white block">Require Comprehensive Final Exam</label>
                      <p className="text-[11px] text-slate-500 dark:text-[#A9BACB]">Require passing a designated capstone exam before unlocking certificate.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requireFinalAssessment}
                        onChange={(e) => setRequireFinalAssessment(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-[#102A43] after:border-gray-300 dark:border-[#1E3A56] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#087F78]"></div>
                    </label>
                  </div>

                  {requireFinalAssessment && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2 border-l-2 border-[#087F78]/40">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-[#A9BACB] uppercase mb-1">Final Exam Passing Score %</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={finalAssessmentPassingScore}
                          onChange={(e) => setFinalAssessmentPassingScore(parseFloat(e.target.value) || 70)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-[#A9BACB] uppercase mb-1">Final Exam Quiz</label>
                        <select
                          value={finalAssessmentQuizId}
                          onChange={(e) => setFinalAssessmentQuizId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                        >
                          <option value="">Select Designated Quiz</option>
                          {(course?.modules || [])
                            .flatMap((m) => m.quizzes || [])
                            .map((q) => (
                              <option key={q.id} value={q.id}>
                                {q.title} (Pass: {q.passingScore}%)
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-4">
              {courseInfoSavedSuccess && (
                <span className="text-xs font-bold text-[#087F78] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Course information updated successfully!
                </span>
              )}
              <div className="flex justify-end flex-1">
                <button
                  type="submit"
                  disabled={savingCourseInfo}
                  className="px-8 py-3 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold rounded-xl text-xs shadow-xs transition disabled:opacity-50"
                >
                  {savingCourseInfo ? 'Saving Changes...' : 'Save All Course Details'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* MODALS */}
        {/* ========================================================= */}

        {/* Delete Entire Course Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-[#EF4444] flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-white">Delete Entire Course?</h3>
                <p className="text-xs text-slate-600 dark:text-[#A9BACB] leading-relaxed">
                  Are you sure you want to delete <strong className="text-[#0B1F3A] dark:text-white">"{course.title}"</strong>? All modules, lessons, student progress records, and course resources will be permanently removed.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-[#1E3A56]">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deletingCourse}
                  className="px-4 py-2 bg-slate-100 dark:bg-[#0B223D] hover:bg-slate-200 dark:hover:bg-[#1E3A56] dark:bg-[#0B223D] border border-slate-200 dark:border-[#1E3A56] text-slate-700 dark:text-[#A9BACB] font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCourse}
                  disabled={deletingCourse}
                  className="px-5 py-2 bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition"
                >
                  {deletingCourse ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add / Edit Module Modal */}
        {showModuleModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-white">{editingModule ? 'Edit Module' : 'Add New Module'}</h3>
              <form onSubmit={handleSaveModule} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase mb-1">Module Title *</label>
                  <input
                    type="text"
                    required
                    value={moduleTitle}
                    onChange={(e) => setModuleTitle(e.target.value)}
                    placeholder="e.g. Module 1: Linux Architecture & System Internals"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-[#A9BACB] focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    value={moduleDescription}
                    onChange={(e) => setModuleDescription(e.target.value)}
                    placeholder="Module overview..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-[#A9BACB] focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100 dark:border-[#1E3A56]">
                  <button
                    type="button"
                    onClick={() => { setShowModuleModal(false); setEditingModule(null); }}
                    className="px-4 py-2 bg-slate-100 dark:bg-[#0B223D] hover:bg-slate-200 dark:hover:bg-[#1E3A56] dark:bg-[#0B223D] text-slate-700 dark:text-[#A9BACB] font-bold rounded-xl text-xs transition border border-slate-200 dark:border-[#1E3A56]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold rounded-xl text-xs shadow-xs transition"
                  >
                    {saving ? 'Saving...' : editingModule ? 'Save Module' : 'Add Module'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Module Modal */}
        {moduleToDelete && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-[#EF4444] flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-white">Delete Module?</h3>
              <p className="text-xs text-slate-600 dark:text-[#A9BACB] leading-relaxed">
                Are you sure you want to delete <strong className="text-[#0B1F3A] dark:text-white">"{moduleToDelete.title}"</strong> and all of its lessons?
              </p>
              <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100 dark:border-[#1E3A56]">
                <button
                  type="button"
                  onClick={() => setModuleToDelete(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-[#0B223D] hover:bg-slate-200 dark:hover:bg-[#1E3A56] dark:bg-[#0B223D] text-slate-700 dark:text-[#A9BACB] font-bold rounded-xl text-xs border border-slate-200 dark:border-[#1E3A56]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteModule}
                  disabled={deletingModule}
                  className="px-5 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  {deletingModule ? 'Deleting...' : 'Delete Module'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add / Edit Lesson Modal */}
        {activeModuleId && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl space-y-5 my-8">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E3A56] pb-3">
                <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-white">
                  {editingLesson ? 'Edit Lesson' : 'Add New Lesson'}
                </h3>
                <button onClick={() => { setActiveModuleId(null); setEditingLesson(null); }} className="text-slate-400 hover:text-slate-700 dark:text-[#A9BACB]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lesson Modal Tabs */}
              <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-[#1E3A56] pb-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setLessonTab('video')}
                  className={`px-3 py-1.5 rounded-lg transition ${lessonTab === 'video' ? 'bg-[#087F78] text-white' : 'text-slate-600 dark:text-[#A9BACB] hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D]'}`}
                >
                  Video & Details
                </button>
                <button
                  type="button"
                  onClick={() => setLessonTab('overview')}
                  className={`px-3 py-1.5 rounded-lg transition ${lessonTab === 'overview' ? 'bg-[#087F78] text-white' : 'text-slate-600 dark:text-[#A9BACB] hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D]'}`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setLessonTab('notes')}
                  className={`px-3 py-1.5 rounded-lg transition ${lessonTab === 'notes' ? 'bg-[#087F78] text-white' : 'text-slate-600 dark:text-[#A9BACB] hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D]'}`}
                >
                  Instructor Notes
                </button>
                <button
                  type="button"
                  onClick={() => setLessonTab('transcript')}
                  className={`px-3 py-1.5 rounded-lg transition ${lessonTab === 'transcript' ? 'bg-[#087F78] text-white' : 'text-slate-600 dark:text-[#A9BACB] hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D]'}`}
                >
                  Transcript
                </button>
              </div>

              <form onSubmit={handleSaveLesson} className="space-y-4">
                {/* Tab: Video & Details */}
                {lessonTab === 'video' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase mb-1">Lesson Title *</label>
                      <input
                        type="text"
                        required
                        value={lessonTitle}
                        onChange={(e) => setLessonTitle(e.target.value)}
                        placeholder="e.g. Lesson 1: Kernel Architecture & Process Execution"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-[#A9BACB] focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase mb-1">Duration (Minutes)</label>
                        <input
                          type="number"
                          min="1"
                          value={durationMinutes}
                          onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 1)}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                        />
                      </div>
                      <div className="flex items-center pt-2 sm:pt-6">
                        <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-[#A9BACB] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isPreview}
                            onChange={(e) => setIsPreview(e.target.checked)}
                            className="accent-[#087F78]"
                          />
                          <span>Allow Free Preview</span>
                        </label>
                      </div>
                      <div className="flex items-center pt-2 sm:pt-6">
                        <label className="flex items-center space-x-2 text-xs text-[#087F78] font-bold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isRequiredLesson}
                            onChange={(e) => setIsRequiredLesson(e.target.checked)}
                            className="accent-[#087F78]"
                          />
                          <span>Required for Certificate</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase mb-2">Video Source</label>
                      <div className="flex items-center space-x-4 mb-3">
                        <label className="flex items-center space-x-2 text-xs text-[#0B1F3A] dark:text-white cursor-pointer">
                          <input
                            type="radio"
                            checked={videoSource === 'YOUTUBE'}
                            onChange={() => setVideoSource('YOUTUBE')}
                            className="accent-[#087F78]"
                          />
                          <span>YouTube URL</span>
                        </label>
                        <label className="flex items-center space-x-2 text-xs text-[#0B1F3A] dark:text-white cursor-pointer">
                          <input
                            type="radio"
                            checked={videoSource === 'UPLOAD'}
                            onChange={() => setVideoSource('UPLOAD')}
                            className="accent-[#087F78]"
                          />
                          <span>Upload MP4 Video</span>
                        </label>
                      </div>

                      {videoSource === 'YOUTUBE' ? (
                        <input
                          type="text"
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-[#A9BACB] focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                        />
                      ) : (
                        <div>
                          <input
                            type="file"
                            accept="video/mp4,video/webm"
                            onChange={handleVideoFileUpload}
                            className="text-xs text-slate-600 dark:text-[#A9BACB] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#087F78] file:text-white hover:file:bg-[#076E6A] cursor-pointer"
                          />
                          {uploadingVideo && <p className="text-xs text-[#087F78] mt-1 font-medium">Uploading video file...</p>}
                          {uploadedFileName && (
                            <p className="text-xs text-[#087F78] mt-1 font-bold">✓ Uploaded: {uploadedFileName}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab: Overview */}
                {lessonTab === 'overview' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase mb-1">Lesson Overview</label>
                    <textarea
                      rows={5}
                      value={lessonDescription}
                      onChange={(e) => setLessonDescription(e.target.value)}
                      placeholder="Explain what concepts, techniques, and practical skills are covered in this lesson..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-[#A9BACB] focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                    />
                  </div>
                )}

                {/* Tab: Notes */}
                {lessonTab === 'notes' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase mb-1">Instructor Lesson Notes</label>
                    <textarea
                      rows={6}
                      value={lessonNotes}
                      onChange={(e) => setLessonNotes(e.target.value)}
                      placeholder="Add instructor reference notes, code blocks, or documentation links for this lesson..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-[#A9BACB] focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                    />
                  </div>
                )}

                {/* Tab: Transcript */}
                {lessonTab === 'transcript' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase mb-1">Video Transcript</label>
                    <textarea
                      rows={6}
                      value={lessonTranscript}
                      onChange={(e) => setLessonTranscript(e.target.value)}
                      placeholder="Paste the full spoken transcript of this video lesson..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-[#A9BACB] focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                    />
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-[#1E3A56]">
                  <button
                    type="button"
                    onClick={() => { setActiveModuleId(null); setEditingLesson(null); }}
                    className="px-4 py-2 bg-slate-100 dark:bg-[#0B223D] hover:bg-slate-200 dark:hover:bg-[#1E3A56] dark:bg-[#0B223D] text-slate-700 dark:text-[#A9BACB] font-bold rounded-xl text-xs transition border border-slate-200 dark:border-[#1E3A56]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploadingVideo}
                    className="px-5 py-2 bg-[#087F78] hover:bg-[#076E6A] disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition"
                  >
                    {saving ? 'Saving Lesson...' : editingLesson ? 'Save Lesson' : 'Add Lesson'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Lesson Modal */}
        {lessonToDelete && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-[#EF4444] flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-white">Delete Lesson?</h3>
              <p className="text-xs text-slate-600 dark:text-[#A9BACB] leading-relaxed">
                Are you sure you want to delete <strong className="text-[#0B1F3A] dark:text-white">"{lessonToDelete.title}"</strong>?
              </p>
              <div className="flex justify-end space-x-3 pt-2 border-t border-slate-100 dark:border-[#1E3A56]">
                <button
                  type="button"
                  onClick={() => setLessonToDelete(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-[#0B223D] hover:bg-slate-200 dark:hover:bg-[#1E3A56] dark:bg-[#0B223D] text-slate-700 dark:text-[#A9BACB] font-bold rounded-xl text-xs border border-slate-200 dark:border-[#1E3A56]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteLesson}
                  disabled={deletingLesson}
                  className="px-5 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  {deletingLesson ? 'Deleting...' : 'Delete Lesson'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manage Downloadable Lesson Resources Modal */}
        {resourceLesson && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E3A56] pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-white">Lesson Resources</h3>
                  <p className="text-xs text-slate-500 dark:text-[#A9BACB]">{resourceLesson.title}</p>
                </div>
                <button onClick={() => setResourceLesson(null)} className="text-slate-400 hover:text-slate-700 dark:text-[#A9BACB]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Add Resource Form */}
              <form onSubmit={handleAddResource} className="p-4 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-[#1E3A56] rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-[#0B1F3A] dark:text-white uppercase tracking-wider">Attach Downloadable Resource</h4>
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Resource Title (e.g. Architecture Diagram PDF, Starter Code ZIP)"
                    value={resourceTitle}
                    onChange={(e) => setResourceTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-[#A9BACB] focus:outline-none focus:border-[#087F78]"
                  />
                </div>
                <div>
                  <input
                    type="url"
                    required
                    placeholder="File URL (https://... or /uploads/...)"
                    value={resourceFileUrl}
                    onChange={(e) => setResourceFileUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-[#A9BACB] focus:outline-none focus:border-[#087F78]"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingResource}
                    className="px-4 py-2 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold rounded-xl text-xs shadow-xs transition"
                  >
                    {addingResource ? 'Attaching...' : 'Attach Resource'}
                  </button>
                </div>
              </form>

              {/* Existing Resources List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {resourceLesson.resources && resourceLesson.resources.length > 0 ? (
                  resourceLesson.resources.map((res: LessonResource) => (
                    <div key={res.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-slate-700 dark:text-[#A9BACB]">
                      <div className="flex items-center space-x-2 min-w-0 pr-2">
                        <FileText className="w-4 h-4 text-[#087F78] flex-shrink-0" />
                        <span className="truncate font-bold text-[#0B1F3A] dark:text-white">{res.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteResource(res.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete Resource"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic text-center p-4">No resources attached to this lesson yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Course Analytics & Student Submissions Modal */}
        {showAnalyticsModal && course && (
          <CourseAnalyticsModal
            courseId={course.id}
            courseTitle={course.title}
            onClose={() => setShowAnalyticsModal(false)}
          />
        )}
      </div>
    </div>
  );
};
