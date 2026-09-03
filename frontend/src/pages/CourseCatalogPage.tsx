import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Course, Category } from '../types';
import { CourseCard } from '../components/CourseCard';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, X, BookOpen, Compass } from 'lucide-react';

export const CourseCatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const searchQuery = searchParams.get('search') || '';
  const categoryFilter = searchParams.get('category') || '';
  const levelFilter = searchParams.get('level') || '';
  const sortBy = searchParams.get('sortBy') || 'newest';
  const page = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        if (res.data.success) setCategories(res.data.categories || []);
      } catch (err) {}
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (categoryFilter) params.set('category', categoryFilter);
        if (levelFilter) params.set('level', levelFilter);
        if (sortBy) params.set('sortBy', sortBy);
        params.set('page', page.toString());
        params.set('limit', '9');

        const res = await api.get(`/courses?${params.toString()}`);
        if (res.data.success) {
          setCourses(res.data.courses || []);
          setPagination(res.data.pagination || { page: 1, totalPages: 1, total: 0 });
        }
      } catch (err) {
        console.error('Failed to load courses:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [searchQuery, categoryFilter, levelFilter, sortBy, page]);

  const updateParam = (key: string, val: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (val) {
      newParams.set(key, val);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-[#F1F5F7] dark:bg-[#07182D] min-h-screen text-[#0B1F3A] dark:text-white transition-colors">
      
      {/* Header Banner */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] dark:text-white tracking-tight">Course Catalog</h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
          Explore our comprehensive professional development tracks and academic programs.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl p-4 shadow-xs space-y-4">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search for courses, skills, or instructors..."
            value={searchQuery}
            onChange={(e) => updateParam('search', e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-8 text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78] focus:ring-1 focus:ring-[#087F78]/30 transition"
          />
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
          {searchQuery && (
            <button
              onClick={() => updateParam('search', '')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-[#0B1F3A] dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Chips Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => updateParam('category', '')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition border ${
              !categoryFilter
                ? 'bg-[#087F78] text-white border-[#087F78] shadow-xs'
                : 'bg-white dark:bg-[#152F4A] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => updateParam('category', cat.slug || cat.name)}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition border ${
                categoryFilter === cat.slug || categoryFilter === cat.name
                  ? 'bg-[#087F78] text-white border-[#087F78] shadow-xs'
                  : 'bg-white dark:bg-[#152F4A] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Row: Level & Sorting */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Showing <strong className="text-[#0B1F3A] dark:text-white">{pagination.total || courses.length}</strong> courses
        </div>

        <div className="flex items-center gap-2">
          {/* Level Dropdown */}
          <select
            value={levelFilter}
            onChange={(e) => updateParam('level', e.target.value)}
            className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-slate-700 text-[#0B1F3A] dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#087F78] font-medium shadow-xs"
          >
            <option value="">All Levels</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => updateParam('sortBy', e.target.value)}
            className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-slate-700 text-[#0B1F3A] dark:text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#087F78] font-medium shadow-xs"
          >
            <option value="newest">Sort by: Newest</option>
            <option value="popularity">Sort by: Most Popular</option>
            <option value="priceAsc">Sort by: Price (Low to High)</option>
            <option value="priceDesc">Sort by: Price (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Course Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-80 rounded-2xl bg-white dark:bg-[#102A43] animate-pulse border border-slate-200 dark:border-[#1E3A56]" />
          ))}
        </div>
      ) : courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-[#102A43] rounded-2xl border border-slate-200 dark:border-[#1E3A56] space-y-4 p-8 shadow-xs">
          <SlidersHorizontal className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white">No courses match your filter criteria</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Try adjusting your search keywords or topic filters.</p>
          </div>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-[#087F78] hover:bg-[#076E6A] text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            disabled={page <= 1}
            onClick={() => updateParam('page', (page - 1).toString())}
            className="p-2 rounded-lg bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] text-slate-600 dark:text-slate-300 hover:text-[#087F78] disabled:opacity-30 disabled:cursor-not-allowed transition shadow-xs text-xs"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: Math.min(pagination.totalPages, 5) }).map((_, idx) => {
            const pageNum = idx + 1;
            const isCurrent = page === pageNum;
            return (
              <button
                key={pageNum}
                onClick={() => updateParam('page', pageNum.toString())}
                className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition flex items-center justify-center border ${
                  isCurrent
                    ? 'bg-[#087F78] text-white border-[#087F78] shadow-xs'
                    : 'bg-white dark:bg-[#102A43] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#1E3A56] hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          {pagination.totalPages > 5 && (
            <span className="text-slate-400 dark:text-slate-500 font-mono text-xs px-1">..</span>
          )}

          <button
            disabled={page >= pagination.totalPages}
            onClick={() => updateParam('page', (page + 1).toString())}
            className="p-2 rounded-lg bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] text-slate-600 dark:text-slate-300 hover:text-[#087F78] disabled:opacity-30 disabled:cursor-not-allowed transition shadow-xs text-xs"
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};
