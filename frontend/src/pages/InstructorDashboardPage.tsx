import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Course, Category, Level, VideoSource } from '../types';
import {
  Plus,
  BookOpen,
  Users,
  DollarSign,
  TrendingUp,
  Trash2,
  Settings,
  Eye,
  Video,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  BarChart3,
} from 'lucide-react';
import { resolveMediaUrl, DEFAULT_COURSE_THUMBNAIL } from '../utils/media';
import { CourseAnalyticsModal } from '../components/CourseAnalyticsModal';

export const InstructorDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Course Delete State
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedAnalyticsCourse, setSelectedAnalyticsCourse] = useState<Course | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [level, setLevel] = useState<Level>('BEGINNER');
  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState('15.00');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  // Module & Lesson Wizard State
  const [moduleTitle, setModuleTitle] = useState('Module 1: Core Fundamentals');
  const [lessonTitle, setLessonTitle] = useState('Lesson 1: Introduction');
  const [lessonDescription, setLessonDescription] = useState('Lesson overview and key concepts.');
  const [videoSource, setVideoSource] = useState<VideoSource>('YOUTUBE');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState(0);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInstructorData();
  }, []);

  const fetchInstructorData = async () => {
    try {
      setLoading(true);
      const [coursesRes, catRes] = await Promise.all([
        api.get('/courses/instructor/my-courses'),
        api.get('/categories'),
      ]);
      setCourses(coursesRes.data.courses || []);
      setCategories(catRes.data.categories || []);
      if (catRes.data.categories?.length > 0) {
        setCategoryId(catRes.data.categories[0].id);
      }
    } catch (err) {
      console.error('Failed to load instructor data:', err);
    } finally {
      setLoading(false);
    }
  };

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
    } catch (err: any) {
      alert(err.response?.data?.message || 'Thumbnail upload failed.');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
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
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);

      let youtubeVideoId = null;
      if (videoSource === 'YOUTUBE' && youtubeUrl.trim()) {
        const match = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        youtubeVideoId = match ? match[1] : youtubeUrl.trim();
      }

      const coursePayload = {
        title: title.trim(),
        description: description.trim(),
        categoryId,
        level,
        isFree,
        price: isFree ? 0 : parseFloat(price),
        thumbnail: thumbnailUrl.trim() || undefined,
        learningObjectives: [],
        requirements: [],
        targetAudience: [],
        modules: moduleTitle.trim() ? [
          {
            title: moduleTitle.trim(),
            order: 1,
            lessons: lessonTitle.trim() ? [
              {
                title: lessonTitle.trim(),
                description: lessonDescription.trim() || undefined,
                contentType: 'VIDEO',
                videoSource,
                youtubeVideoId: videoSource === 'YOUTUBE' ? (youtubeVideoId || undefined) : undefined,
                videoUrl: videoSource === 'UPLOAD' ? (uploadedVideoUrl || undefined) : (youtubeUrl.trim() || undefined),
                fileName: videoSource === 'UPLOAD' ? (uploadedFileName || undefined) : undefined,
                fileSize: videoSource === 'UPLOAD' ? (uploadedFileSize || undefined) : undefined,
                durationMinutes: durationMinutes > 0 ? durationMinutes : undefined,
                isPreview,
                order: 1,
              },
            ] : [],
          },
        ] : [],
      };

      const res = await api.post('/courses', coursePayload);
      const createdCourse = res.data.course;
      setShowWizard(false);

      // Reset form
      setTitle('');
      setDescription('');
      setPrice('15.00');
      setIsFree(false);
      setThumbnailUrl('');
      setYoutubeUrl('');
      setUploadedVideoUrl('');
      setUploadedFileName('');
      setUploadedFileSize(0);

      if (createdCourse && createdCourse.id) {
        navigate(`/instructor/courses/${createdCourse.id}/manage`);
      } else {
        fetchInstructorData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create course.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    try {
      setDeleting(true);
      await api.delete(`/courses/${courseToDelete.id}`);
      setCourses((prev) => prev.filter((c) => c.id !== courseToDelete.id));
      setCourseToDelete(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete course.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalEnrollments = courses.reduce((acc, c) => acc + (c._count?.enrollments || 0), 0);
  const totalPublished = courses.filter((c) => c.status === 'PUBLISHED').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F1F5F7] text-[#0B1F3A] dark:text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#087F78] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white p-4 sm:p-8 lg:p-10 font-sans pb-24 transition-colors">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header & Quick Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#1E3A56] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-[#087F78]/30 border border-teal-200 dark:border-teal-700/50 text-[#087F78] dark:text-[#14B8A6] text-[11px] font-bold uppercase tracking-wider mb-2 font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Instructor Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] dark:text-white tracking-tight">
              Course Management Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Create, edit, manage your curriculum, upload videos, and track enrolled students.
            </p>
          </div>

          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center justify-center space-x-2 px-5 py-3 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold rounded-xl shadow-xs transition text-xs flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Course</span>
          </button>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Courses</span>
              <BookOpen className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" />
            </div>
            <div className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white font-mono">{courses.length}</div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">{totalPublished} currently published</span>
          </div>

          <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Students</span>
              <Users className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" />
            </div>
            <div className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white font-mono">{totalEnrollments}</div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">Across all created courses</span>
          </div>

          <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Estimated Revenue</span>
              <DollarSign className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" />
            </div>
            <div className="text-2xl font-extrabold text-[#087F78] dark:text-[#14B8A6] font-mono">
              {courses.reduce((sum, c) => sum + (c.isFree ? 0 : (c.price * (c._count?.enrollments || 0))), 0).toFixed(0)} KSH
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">Platform earnings</span>
          </div>

          <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Average Rating</span>
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white font-mono">5.0 ★</div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">Student feedback score</span>
          </div>
        </div>

        {/* Courses Table & Controls */}
        <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl shadow-xs overflow-hidden space-y-0">
          {/* Table Header & Search */}
          <div className="p-5 border-b border-slate-100 dark:border-[#1E3A56] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-[#0B223D]">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-extrabold text-[#0B1F3A] dark:text-white">My Authored Courses</h2>
              <span className="px-2 py-0.5 rounded-full bg-white dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 font-mono">
                {courses.length}
              </span>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#087F78]"
              />
            </div>
          </div>

          {/* Courses List */}
          <div className="divide-y divide-slate-100 dark:divide-[#1E3A56]">
            {filteredCourses.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-white">No courses found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {searchQuery ? 'No course matching your search query.' : 'Click "Create New Course" above to start authoring your first course.'}
                </p>
              </div>
            ) : (
              filteredCourses.map((c) => (
                <div key={c.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 dark:bg-[#152F4A] dark:hover:bg-slate-850 transition group">
                  {/* Left: Thumbnail & Course Info */}
                  <div className="flex items-center space-x-4 min-w-0 flex-1">
                    <div className="w-24 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0 relative">
                      <img
                        src={resolveMediaUrl(c.thumbnail)}
                        alt={c.title}
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_COURSE_THUMBNAIL;
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono ${
                          c.status === 'PUBLISHED'
                            ? 'bg-teal-50 dark:bg-[#087F78]/30 text-[#087F78] dark:text-[#14B8A6] border border-teal-200 dark:border-teal-700/50'
                            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50'
                        }`}>
                          {c.status}
                        </span>
                        <span className="text-[11px] font-bold text-[#087F78] dark:text-[#14B8A6]">
                          {c.category?.name || 'DevOps & Cloud'}
                        </span>
                        <span className="text-[11px] text-slate-300 dark:text-slate-600">•</span>
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          {c.level}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-extrabold text-[#0B1F3A] dark:text-white truncate">
                        {c.title}
                      </h3>

                      <div className="flex items-center space-x-4 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        <span>{c._count?.enrollments || 0} students enrolled</span>
                        <span>•</span>
                        <span className="font-bold text-[#0B1F3A] dark:text-white">
                          {c.isFree || c.price === 0 ? 'Free' : `${c.price.toFixed(0)} KSH`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions Button Group */}
                  <div className="flex items-center space-x-2.5 flex-shrink-0 pt-2 md:pt-0">
                    <button
                      onClick={() => setSelectedAnalyticsCourse(c)}
                      className="px-3.5 py-2 bg-teal-50 dark:bg-[#087F78]/20 hover:bg-teal-100 dark:hover:bg-[#087F78]/30 border border-teal-200 dark:border-teal-700/50 text-[#087F78] dark:text-[#14B8A6] font-bold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-xs"
                      title="View Student Submissions, Grading & Proctor Analytics"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Submissions & Grading</span>
                    </button>

                    <Link
                      to={`/courses/${c.slug}`}
                      className="px-3.5 py-2 bg-slate-50 dark:bg-[#152F4A] hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#087F78] font-bold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-xs"
                      title="Preview Course"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </Link>

                    <Link
                      to={`/instructor/courses/${c.id}/manage`}
                      className="px-4 py-2 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center space-x-1.5"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Manage Curriculum</span>
                    </Link>

                    {/* Delete Course Button */}
                    <button
                      onClick={() => setCourseToDelete(c)}
                      className="p-2 bg-slate-50 dark:bg-[#152F4A] hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 hover:border-red-200 text-slate-500 dark:text-slate-400 hover:text-[#EF4444] rounded-xl transition shadow-xs"
                      title="Delete Course"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {courseToDelete && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-[#EF4444] flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-white">Delete Course?</h3>
                <p className="text-xs text-slate-600 dark:text-[#A9BACB] leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-[#0B1F3A] dark:text-white">"{courseToDelete.title}"</strong>? All associated modules, lessons, and records will be removed. This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-[#1E3A56]">
                <button
                  type="button"
                  onClick={() => setCourseToDelete(null)}
                  disabled={deleting}
                  className="px-4 py-2 bg-slate-100 dark:bg-[#0B223D] hover:bg-slate-200 dark:hover:bg-[#1E3A56] dark:bg-[#0B223D] border border-slate-200 dark:border-[#1E3A56] text-slate-700 dark:text-[#A9BACB] font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCourse}
                  disabled={deleting}
                  className="px-5 py-2 bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition"
                >
                  {deleting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Course Modal Wizard */}
        {showWizard && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl p-6 sm:p-8 max-w-2xl w-full my-8 shadow-2xl space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E3A56] pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-[#0B1F3A] dark:text-white">Create New Course</h2>
                  <p className="text-xs text-slate-500 dark:text-[#A9BACB] mt-0.5">Define core course information and add your first module.</p>
                </div>
                <button
                  onClick={() => setShowWizard(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-700 dark:text-[#A9BACB]"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCourse} className="space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase tracking-wider mb-1.5">
                      Course Title
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Modern Linux Administration & Shell Scripting"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-[#A9BACB] focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase tracking-wider mb-1.5">
                      Description
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Comprehensive overview of skills students will gain..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-[#A9BACB] focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase tracking-wider mb-1.5">
                        Category
                      </label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase tracking-wider mb-1.5">
                        Difficulty Level
                      </label>
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
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase tracking-wider mb-1.5">
                        Pricing Option
                      </label>
                      <div className="flex items-center space-x-4 mt-2">
                        <label className="flex items-center space-x-2 text-xs text-[#0B1F3A] dark:text-white cursor-pointer">
                          <input
                            type="radio"
                            checked={!isFree}
                            onChange={() => setIsFree(false)}
                            className="accent-[#087F78]"
                          />
                          <span>Paid ($)</span>
                        </label>
                        <label className="flex items-center space-x-2 text-xs text-[#0B1F3A] dark:text-white cursor-pointer">
                          <input
                            type="radio"
                            checked={isFree}
                            onChange={() => setIsFree(true)}
                            className="accent-[#087F78]"
                          />
                          <span>Free Access</span>
                        </label>
                      </div>
                    </div>

                    {!isFree && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase tracking-wider mb-1.5">
                          Tuition Price (KSH)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Upload with Live Image Preview */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase tracking-wider">
                      Course Thumbnail Image
                    </label>
                    <div className="flex items-center space-x-4">
                      {thumbnailUrl && (
                        <div className="w-20 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#0B223D] border border-slate-200 dark:border-[#1E3A56] flex-shrink-0">
                          <img
                            src={resolveMediaUrl(thumbnailUrl)}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleThumbnailUpload}
                          className="text-xs text-slate-600 dark:text-[#A9BACB] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#087F78] file:text-white hover:file:bg-[#076E6A] cursor-pointer"
                        />
                        {uploadingThumbnail && <p className="text-xs text-[#087F78] mt-1 font-medium">Uploading image...</p>}
                        {thumbnailUrl && <p className="text-xs text-[#087F78] mt-1 font-bold">✓ Image uploaded successfully</p>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lesson 1 Wizard Section */}
                <div className="border-t border-slate-100 dark:border-[#1E3A56] pt-5 space-y-4">
                  <h4 className="text-xs font-bold text-[#087F78] uppercase tracking-wider font-mono">
                    Initial Lesson 1 Configuration
                  </h4>

                  <div className="flex items-center space-x-6">
                    <label className="flex items-center space-x-2 text-xs text-[#0B1F3A] dark:text-white cursor-pointer">
                      <input
                        type="radio"
                        checked={videoSource === 'YOUTUBE'}
                        onChange={() => setVideoSource('YOUTUBE')}
                        className="accent-[#087F78]"
                      />
                      <span>YouTube Video</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-[#0B1F3A] dark:text-white cursor-pointer">
                      <input
                        type="radio"
                        checked={videoSource === 'UPLOAD'}
                        onChange={() => setVideoSource('UPLOAD')}
                        className="accent-[#087F78]"
                      />
                      <span>Upload Video File (MP4/WebM)</span>
                    </label>
                  </div>

                  {videoSource === 'YOUTUBE' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase mb-1">
                        YouTube URL (Optional)
                      </label>
                      <input
                        type="text"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-[#A9BACB] focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase mb-1">
                        Upload Video (MP4 / WebM)
                      </label>
                      <input
                        type="file"
                        accept="video/mp4,video/webm"
                        onChange={handleVideoFileUpload}
                        className="text-xs text-slate-600 dark:text-[#A9BACB] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#087F78] file:text-white hover:file:bg-[#076E6A] cursor-pointer"
                      />
                      {uploadingVideo && <p className="text-xs text-[#087F78] mt-1">Uploading video file...</p>}
                      {uploadedFileName && (
                        <p className="text-xs text-[#087F78] mt-1 font-bold">
                          ✓ Uploaded: {uploadedFileName} ({Math.round(uploadedFileSize / (1024 * 1024))} MB)
                        </p>
                      )}
                    </div>
                  )}

                  <label className="flex items-center space-x-2 text-xs text-slate-600 dark:text-[#A9BACB] cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={isPreview}
                      onChange={(e) => setIsPreview(e.target.checked)}
                      className="accent-[#087F78]"
                    />
                    <span>Free Preview (Students can watch without enrollment)</span>
                  </label>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end space-x-3 border-t border-slate-100 dark:border-[#1E3A56] pt-4">
                  <button
                    type="button"
                    onClick={() => setShowWizard(false)}
                    className="px-5 py-2.5 bg-slate-100 dark:bg-[#0B223D] hover:bg-slate-200 dark:hover:bg-[#1E3A56] dark:bg-[#0B223D] text-slate-700 dark:text-[#A9BACB] font-bold rounded-xl text-xs transition border border-slate-200 dark:border-[#1E3A56]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || uploadingThumbnail || uploadingVideo}
                    className="px-6 py-2.5 bg-[#087F78] hover:bg-[#076E6A] disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition"
                  >
                    {submitting ? 'Creating Course...' : 'Create & Open Studio'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Course Analytics & Student Submissions Modal */}
        {selectedAnalyticsCourse && (
          <CourseAnalyticsModal
            courseId={selectedAnalyticsCourse.id}
            courseTitle={selectedAnalyticsCourse.title}
            onClose={() => setSelectedAnalyticsCourse(null)}
          />
        )}
      </div>
    </div>
  );
};
