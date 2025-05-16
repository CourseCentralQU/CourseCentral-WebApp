'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Course, GradeDistribution, CourseWithStats } from '@/types';
import { getCourses } from '@/lib/db';
import { motion, AnimatePresence } from 'framer-motion';

// Course level options
const COURSE_LEVELS = [
  { id: '100', label: '100 Level' },
  { id: '200', label: '200 Level' },
  { id: '300', label: '300 Level' },
  { id: '400', label: '400 Level' },
];

// Sort options
type SortField = 'course_code' | 'course_name' | 'gpa' | 'enrollment';
type SortDirection = 'asc' | 'desc';

// Function to get the letter grade band color
const getGradeBandColor = (gpa: number): string => {
  if (gpa >= 3.7) return 'bg-green-100';
  if (gpa >= 3.0) return 'bg-green-50';
  if (gpa >= 2.3) return 'bg-yellow-50';
  if (gpa >= 1.7) return 'bg-orange-50';
  return 'bg-red-50';
};

// Helper function to get letter grade from GPA
const getLetterGrade = (gpa: number): string => {
  if (gpa >= 4.3) return 'A+';
  if (gpa >= 4.0) return 'A';
  if (gpa >= 3.7) return 'A-';
  if (gpa >= 3.3) return 'B+';
  if (gpa >= 3.0) return 'B';
  if (gpa >= 2.7) return 'B-';
  if (gpa >= 2.3) return 'C+';
  if (gpa >= 2.0) return 'C';
  if (gpa >= 1.7) return 'C-';
  if (gpa >= 1.3) return 'D+';
  if (gpa >= 1.0) return 'D';
  if (gpa >= 0.7) return 'D-';
  return 'F';
};

export default function QueensCourses() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [minGPA, setMinGPA] = useState(0);
  const [maxGPA, setMaxGPA] = useState(4.3);
  const [minEnrollment, setMinEnrollment] = useState(0);
  const [maxEnrollment, setMaxEnrollment] = useState(400);
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>('course_code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [coursesWithStats, setCoursesWithStats] = useState<CourseWithStats[]>([]);
  
  // Fetch courses data from Supabase
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        
        // Fetch all courses
        const coursesData = await getCourses();
        
        // Use the data from Supabase, which should already include distributions and stats
        const processedCourses = coursesData.map(course => {
          // Make sure we capture average_enrollment for display in the table
          console.log(`Course ${course.course_code} enrollment:`, course.average_enrollment);
          
          return {
            ...course,
            distributions: [],  // This would be populated if needed
            termData: [],      // This would be populated if needed
            averageGPA: course.average_gpa || 0,
            totalEnrollment: course.average_enrollment || 0,
            // Ensure the enrollment data is available through both properties
            average_enrollment: course.average_enrollment || 0
          } as CourseWithStats;
        });
        
        setCoursesWithStats(processedCourses);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching courses data:', err);
        setError('Failed to load courses data');
        setLoading(false);
      }
    };
    
    fetchCourses();
  }, []);
  
  // Check if on mobile device on mount and window resize
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check initially
    checkIfMobile();
    
    // Add event listener
    window.addEventListener('resize', checkIfMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  // Extract course level from course code
  const getCourseLevel = (code: string): string => {
    const match = code.match(/\d+/);
    if (match) {
      const num = parseInt(match[0]);
      return Math.floor(num / 100) * 100 + '';
    }
    return '100'; // Default
  };
  
  // Get unique departments for filter dropdown
  const departments = Array.from(
    new Set(coursesWithStats.map(course => course.department))
  ).sort();
  
  // Filter courses based on all criteria
  const filteredCourses = coursesWithStats.filter(course => {
    // Filter by search term
    const matchesSearch = searchTerm === '' || 
      course.course_code.toLowerCase().includes(searchTerm.toLowerCase()) || 
      course.course_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by department
    const matchesDepartment = filterDepartment === '' || course.department === filterDepartment;
    
    // Filter by course level
    const courseLevel = getCourseLevel(course.course_code);
    const matchesLevel = selectedLevels.length === 0 || selectedLevels.includes(courseLevel);
    
    // Filter by GPA range
    const matchesGPA = !course.averageGPA || 
      (course.averageGPA >= minGPA && course.averageGPA <= maxGPA);
    
    // Filter by enrollment range
    const matchesEnrollment = !course.totalEnrollment || 
      (course.totalEnrollment >= minEnrollment && course.totalEnrollment <= maxEnrollment);
    
    return matchesSearch && matchesDepartment && matchesLevel && matchesGPA && matchesEnrollment;
  }).sort((a, b) => {
    // Sort logic based on the selected field and direction
    if (sortField === 'course_code') {
      return sortDirection === 'asc' 
        ? a.course_code.localeCompare(b.course_code) 
        : b.course_code.localeCompare(a.course_code);
    } 
    else if (sortField === 'course_name') {
      return sortDirection === 'asc' 
        ? a.course_name.localeCompare(b.course_name) 
        : b.course_name.localeCompare(a.course_name);
    } 
    else if (sortField === 'gpa') {
      const aGPA = a.averageGPA || 0;
      const bGPA = b.averageGPA || 0;
      return sortDirection === 'asc' ? aGPA - bGPA : bGPA - aGPA;
    } 
    else if (sortField === 'enrollment') {
      const aEnrollment = a.totalEnrollment || 0;
      const bEnrollment = b.totalEnrollment || 0;
      return sortDirection === 'asc' ? aEnrollment - bEnrollment : bEnrollment - aEnrollment;
    }
    return 0;
  });

  // Handle level checkbox change
  const handleLevelChange = (levelId: string) => {
    setSelectedLevels(prev => 
      prev.includes(levelId)
        ? prev.filter(id => id !== levelId)
        : [...prev, levelId]
    );
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setFilterDepartment('');
    setSelectedLevels([]);
    setMinGPA(0);
    setMaxGPA(4.3);
    setMinEnrollment(0);
    setMaxEnrollment(400);
  };
  
  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking on the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa]">
      <Navigation />
      <main className="flex-grow container mx-auto py-6 px-4 md:py-10">
        {/* Modern Header with Gradient and Animation */}
        <div className="mb-10 text-center">
          <motion.h1 
            className="text-4xl md:text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-[#00305f] to-[#2271b3] bg-clip-text text-transparent"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Queen's University Courses
          </motion.h1>
          <motion.p 
            className="text-gray-600 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Explore course grades, enrollment data, and distributions to make informed decisions about your academic journey
          </motion.p>
        </div>
        
        {/* Search Bar with Shadow and Animation */}
        <motion.div 
          className="w-full max-w-2xl mx-auto mb-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="relative">
            <input
              type="text"
              placeholder="Search by course code or name..."
              className="w-full px-5 py-4 pl-12 rounded-xl border-0 bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-[#d62839] text-[#2d3748] text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-4 top-4 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Mobile Filter Toggle Button */}
            {isMobile && (
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="absolute right-4 top-4 text-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
            )}
          </div>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Filter Sidebar - Conditionally shown on mobile */}
          <AnimatePresence>
            {(!isMobile || showFilters) && (
              <motion.div 
                className={`${isMobile ? 'fixed inset-0 z-50 bg-white p-4 overflow-auto' : 'md:col-span-1'}`}
                initial={{ opacity: 0, x: isMobile ? 0 : -20, y: isMobile ? 20 : 0 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: isMobile ? 0 : -20, y: isMobile ? 20 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {isMobile && (
                  <div className="flex justify-between items-center mb-4 pb-4 border-b">
                    <h2 className="text-xl font-semibold text-[#00305f]">Filters</h2>
                    <button onClick={() => setShowFilters(false)} className="text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="p-5 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-[#00305f]">Filter Courses</h2>
                    <p className="text-gray-500 text-sm mt-1">{filteredCourses.length} Results</p>
                  </div>
                  
                  {/* Course Level Filter */}
                  <div className="p-5 border-b border-gray-100">
                    <h3 className="font-medium mb-3 text-gray-700">Course Level</h3>
                    <div className="space-y-2">
                      {COURSE_LEVELS.map(level => (
                        <div key={level.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`level-${level.id}`}
                            checked={selectedLevels.includes(level.id)}
                            onChange={() => handleLevelChange(level.id)}
                            className="h-4 w-4 text-[#d62839] focus:ring-[#d62839] rounded"
                          />
                          <label htmlFor={`level-${level.id}`} className="ml-2 text-[#2d3748]">
                            {level.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Department Filter */}
                  <div className="p-5 border-b border-gray-100">
                    <h3 className="font-medium mb-3 text-gray-700">Department</h3>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#d62839] text-[#2d3748] bg-white"
                      value={filterDepartment}
                      onChange={(e) => setFilterDepartment(e.target.value)}
                    >
                      <option value="">All Departments</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Average GPA Range */}
                  <div className="p-5 border-b border-gray-100">
                    <div className="flex justify-between mb-2">
                      <h3 className="font-medium text-gray-700">Average GPA</h3>
                      <span className="text-sm text-gray-500">{maxGPA.toFixed(1)}</span>
                    </div>
                    <div className="px-1">
                      <div className="h-2 bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded-full"></div>
                      <input
                        type="range"
                        min="0"
                        max="4.3"
                        step="0.1"
                        value={maxGPA}
                        onChange={(e) => setMaxGPA(parseFloat(e.target.value))}
                        className="w-full h-2 mt-1 appearance-none bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>
                  
                  {/* Enrollment Range */}
                  <div className="p-5 border-b border-gray-100">
                    <div className="flex justify-between mb-2">
                      <h3 className="font-medium text-gray-700">Max Enrollment</h3>
                      <span className="text-sm text-gray-500">{maxEnrollment}</span>
                    </div>
                    <div className="px-1">
                      <div className="h-2 bg-gradient-to-r from-blue-300 to-blue-500 rounded-full"></div>
                      <input
                        type="range"
                        min="0"
                        max="400"
                        step="10"
                        value={maxEnrollment}
                        onChange={(e) => setMaxEnrollment(parseInt(e.target.value))}
                        className="w-full h-2 mt-1 appearance-none bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>
                  
                  {/* Reset Filters Button */}
                  <div className="p-5">
                    <button
                      onClick={resetFilters}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-[#00305f] to-[#004f9f] text-white rounded-lg hover:from-[#002547] hover:to-[#003c7a] transition shadow-sm font-medium"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Course Table Section */}
          <motion.div 
            className="md:col-span-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="bg-white rounded-xl overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-[#2d3748] uppercase tracking-wider group cursor-pointer" onClick={() => handleSort('course_code')}>
                        <div className="flex items-center">
                          <span>Course</span>
                          <div className="ml-1 flex flex-col">
                            <svg 
                              className={`h-2 w-2 ${sortField === 'course_code' && sortDirection === 'asc' ? 'text-[#d62839]' : 'text-gray-400'}`} 
                              viewBox="0 0 20 20" fill="currentColor"
                            >
                              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                            <svg 
                              className={`h-2 w-2 ${sortField === 'course_code' && sortDirection === 'desc' ? 'text-[#d62839]' : 'text-gray-400'}`} 
                              viewBox="0 0 20 20" fill="currentColor"
                            >
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-[#2d3748] uppercase tracking-wider group cursor-pointer" onClick={() => handleSort('course_name')}>
                        <div className="flex items-center">
                          <span>Course Name</span>
                          <div className="ml-1 flex flex-col">
                            <svg 
                              className={`h-2 w-2 ${sortField === 'course_name' && sortDirection === 'asc' ? 'text-[#d62839]' : 'text-gray-400'}`} 
                              viewBox="0 0 20 20" fill="currentColor"
                            >
                              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                            <svg 
                              className={`h-2 w-2 ${sortField === 'course_name' && sortDirection === 'desc' ? 'text-[#d62839]' : 'text-gray-400'}`} 
                              viewBox="0 0 20 20" fill="currentColor"
                            >
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-[#2d3748] uppercase tracking-wider group cursor-pointer" onClick={() => handleSort('gpa')}>
                        <div className="flex items-center">
                          <span>Avg GPA</span>
                          <div className="ml-1 flex flex-col">
                            <svg 
                              className={`h-2 w-2 ${sortField === 'gpa' && sortDirection === 'asc' ? 'text-[#d62839]' : 'text-gray-400'}`} 
                              viewBox="0 0 20 20" fill="currentColor"
                            >
                              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                            <svg 
                              className={`h-2 w-2 ${sortField === 'gpa' && sortDirection === 'desc' ? 'text-[#d62839]' : 'text-gray-400'}`} 
                              viewBox="0 0 20 20" fill="currentColor"
                            >
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-[#2d3748] uppercase tracking-wider group cursor-pointer" onClick={() => handleSort('enrollment')}>
                        <div className="flex items-center">
                          <span>Avg Enrollment</span>
                          <div className="ml-1 flex flex-col">
                            <svg 
                              className={`h-2 w-2 ${sortField === 'enrollment' && sortDirection === 'asc' ? 'text-[#d62839]' : 'text-gray-400'}`} 
                              viewBox="0 0 20 20" fill="currentColor"
                            >
                              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                            <svg 
                              className={`h-2 w-2 ${sortField === 'enrollment' && sortDirection === 'desc' ? 'text-[#d62839]' : 'text-gray-400'}`} 
                              viewBox="0 0 20 20" fill="currentColor"
                            >
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-[#2d3748] uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCourses.map((course, index) => {
                      // Use the average_enrollment field directly if it exists
                      const avgEnrollment = course.average_enrollment || course.totalEnrollment || 0;
                      
                      // GPA color classes
                      const getGpaColorClass = (gpa: number) => {
                        if (gpa >= 3.7) return 'text-emerald-600';
                        if (gpa >= 3.0) return 'text-green-600';
                        if (gpa >= 2.3) return 'text-yellow-600';
                        if (gpa >= 1.7) return 'text-orange-600';
                        return 'text-red-600';
                      };
                      
                      const gpaColorClass = course.averageGPA ? getGpaColorClass(course.averageGPA) : '';
                      
                      return (
                        <motion.tr 
                          key={course.course_code}
                          className="hover:bg-gray-50 cursor-pointer"
                          whileHover={{ 
                            backgroundColor: "rgba(248, 249, 250, 0.8)",
                            transition: { duration: 0.1 }
                          }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 * (index % 10) }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-[#00305f]">{course.course_code}</div>
                            <div className="text-xs text-[#4a5568] mt-1">{course.department}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-[#2d3748]">{course.course_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-lg font-semibold ${gpaColorClass}`}>
                              {course.averageGPA?.toFixed(2) || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="font-medium text-[#2d3748]">
                                {avgEnrollment > 0 ? Math.round(avgEnrollment) : 'N/A'}
                              </div>
                              {avgEnrollment > 0 && (
                                <div className="ml-2 h-2 bg-blue-100 rounded-full w-16">
                                  <div 
                                    className="h-full bg-blue-500 rounded-full" 
                                    style={{ width: `${Math.min(100, avgEnrollment / 3)}%` }}
                                  ></div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <Link 
                              href={`/schools/queens/${course.course_code.replace(' ', '-')}`}
                              className="inline-flex items-center px-4 py-2 bg-[#00305f] text-white text-sm rounded-md hover:bg-[#004c8c] transition shadow-sm"
                            >
                              View
                            </Link>
                          </td>
                        </motion.tr>
                      );
                    })}
                    
                    {filteredCourses.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-[#2d3748] mb-1">No courses match your filter criteria.</p>
                            <p className="text-gray-400 text-sm">Try adjusting your filters or search term.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Table Footer with Pagination */}
              <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="text-sm text-[#2d3748]">
                  Showing <span className="font-medium">{filteredCourses.length}</span> of <span className="font-medium">{coursesWithStats.length}</span> courses
                </div>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 rounded-md bg-gray-100 text-[#2d3748] hover:bg-gray-200 flex items-center text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Prev
                  </button>
                  <button className="px-3 py-1 rounded-md bg-gray-100 text-[#2d3748] hover:bg-gray-200 flex items-center text-sm">
                    Next
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Add a Data Source Note */}
          <div className="md:col-span-4 mt-6">
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-md">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-[#2d3748]">About This Data</h3>
                  <div className="mt-1 text-sm text-[#4a5568]">
                    <p>This data represents grade distributions across various terms at Queen's University. The GPA scale ranges from 0.0 (F) to 4.3 (A+).</p>
                    <p className="mt-1">Grade data is compiled from official university records and anonymized for privacy.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Updated Footer */}
      <Footer />
      
      {/* Modern Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#d62839]/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#00305f]/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-[#5596c7]/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
} 