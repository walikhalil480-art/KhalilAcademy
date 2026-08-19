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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 bg-[#0A1322] min-h-screen text-[#F8FAFC]">
      
      {/* Header Banner */}
      <div className="border-b border-[#23426A] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-[#4FD1C5] text-xs font-extrabold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" />
            <span>Course Catalog</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC]">Explore Professional Courses</h1>
          <p className="text-xs sm:text-sm text-[#CBD5E1]">
            Build practical knowledge and develop the skills that matter for your career.
          </p>
        </div>

        <div className="text-xs text-[#94A3B8] font-medium">
          Showing <strong className="text-[#F8FAFC]">{pagination.total || courses.length}</strong> available courses
        </div>
      </div>

      {/* Category Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => updateParam('category', '')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
            !categoryFilter
              ? 'bg-[#4FD1C5] text-[#0A1322] border-[#4FD1C5] shadow-md shadow-[#4FD1C5]/20 font-extrabold'
              : 'bg-[#132742] text-[#CBD5E1] border-[#23426A] hover:text-[#4FD1C5] hover:border-[#4FD1C5]'
          }`}
        >
          All Topics
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => updateParam('category', cat.slug || cat.name)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
              categoryFilter === cat.slug || categoryFilter === cat.name
                ? 'bg-[#4FD1C5] text-[#0A1322] border-[#4FD1C5] shadow-md shadow-[#4FD1C5]/20 font-extrabold'
                : 'bg-[#132742] text-[#CBD5E1] border-[#23426A] hover:text-[#4FD1C5] hover:border-[#4FD1C5]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Filter & Controls Bar */}
      <div className="bg-[#132742] border border-[#23426A] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search keywords, topics..."
            value={searchQuery}
            onChange={(e) => updateParam('search', e.target.value)}
            className="w-full bg-[#0E1D33] border border-[#23426A] rounded-xl py-2.5 pl-9 pr-8 text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#4FD1C5] transition"
          />
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
          {searchQuery && (
            <button
              onClick={() => updateParam('search', '')}
              className="absolute right-2.5 top-2.5 text-[#94A3B8] hover:text-[#F8FAFC]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Level Dropdown */}
          <select
            value={levelFilter}
            onChange={(e) => updateParam('level', e.target.value)}
            className="bg-[#0E1D33] border border-[#23426A] text-[#F8FAFC] text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#4FD1C5] font-medium"
          >
            <option value="">All Difficulty Levels</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => updateParam('sortBy', e.target.value)}
            className="bg-[#0E1D33] border border-[#23426A] text-[#F8FAFC] text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#4FD1C5] font-medium"
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
            <div key={n} className="h-80 rounded-2xl bg-[#132742] animate-pulse border border-[#23426A]" />
          ))}
        </div>
      ) : courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#132742] rounded-2xl border border-[#23426A] space-y-4 p-8 shadow-xl">
          <SlidersHorizontal className="w-10 h-10 text-[#94A3B8] mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#F8FAFC]">No courses match your filter criteria</h3>
            <p className="text-xs text-[#CBD5E1]">Try adjusting your search keywords, difficulty level, or topic filters.</p>
          </div>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] text-xs font-bold rounded-xl transition shadow-md"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-6">
          <button
            disabled={page <= 1}
            onClick={() => updateParam('page', (page - 1).toString())}
            className="p-2.5 rounded-xl bg-[#132742] border border-[#23426A] text-[#CBD5E1] hover:text-[#4FD1C5] disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-[#CBD5E1] px-3">
            Page <strong className="text-[#F8FAFC]">{pagination.page}</strong> of {pagination.totalPages}
          </span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => updateParam('page', (page + 1).toString())}
            className="p-2.5 rounded-xl bg-[#132742] border border-[#23426A] text-[#CBD5E1] hover:text-[#4FD1C5] disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};
