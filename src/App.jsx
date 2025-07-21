import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Edit, Trash2, ChevronDown, ChevronUp, Search, X, Sparkles, Loader2, BrainCircuit, Sun, Moon, CalendarClock } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- Gemini API Configuration ---
// IMPORTANT: Replace "YOUR_API_KEY_HERE" with your actual Gemini API key.
// For security, it is strongly recommended to use environment variables
// instead of hardcoding the key in your application.
const API_KEY = "AIzaSyBnU8B5MtetwM5KaompOXs0QPv9G11K83U";

// Initialize the Generative AI client
const genAI = API_KEY && API_KEY !== "YOUR_API_KEY_HERE" ? new GoogleGenerativeAI(API_KEY) : null;

const callGeminiAPI = async (prompt) => {
    if (!genAI) {
        const message = "Gemini API key not found or is invalid. Please add your key to the API_KEY constant in App.jsx.";
        console.error(message);
        alert(message); // Using alert for direct user feedback as requested.
        return `Error: ${message}`;
    }
    
    try {
        // For text-only input, use a current and valid model like "gemini-1.5-flash"
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        alert("An error occurred while contacting the AI. Please check the console for details.");
        return "An error occurred while contacting the AI. Please check the console for details.";
    }
};


// --- THEME TOGGLE ---
const ThemeToggle = ({ theme, onToggle }) => (
    <button
      onClick={onToggle}
      className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
);

// --- Main App Component ---
const App = () => {
  // --- STATE MANAGEMENT ---
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [jobs, setJobs] = useState(() => {
    try {
      const savedJobs = localStorage.getItem('jobApplications');
      return savedJobs ? JSON.parse(savedJobs) : [];
    } catch (error) { return []; }
  });

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isPrepModalOpen, setIsPrepModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  const [editingJob, setEditingJob] = useState(null);
  const [selectedJobForPrep, setSelectedJobForPrep] = useState(null);
  const [jobToDelete, setJobToDelete] = useState(null);

  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // --- EFFECTS ---
  useEffect(() => {
    localStorage.setItem('jobApplications', JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));

  // --- CRUD OPERATIONS ---
  const handleAddJob = (job) => {
    const newJob = { ...job, id: crypto.randomUUID(), date: new Date().toISOString() };
    setJobs(prevJobs => [newJob, ...prevJobs]);
  };

  const handleUpdateJob = (updatedJob) => {
    if (updatedJob.status !== 'Interviewing') {
      updatedJob.interviewDate = null;
    }
    setJobs(prevJobs =>
      prevJobs.map(job => (job.id === updatedJob.id ? updatedJob : job))
    );
  };

  const confirmDeleteJob = (id) => { setJobToDelete(id); setIsConfirmModalOpen(true); };
  const executeDelete = () => {
    if (jobToDelete) {
        setJobs(prevJobs => prevJobs.filter(job => job.id !== jobToDelete));
        setJobToDelete(null); setIsConfirmModalOpen(false);
    }
  };

  // --- MODAL HANDLING ---
  const openFormModal = (job = null) => { setEditingJob(job); setIsFormModalOpen(true); };
  const closeFormModal = () => { setIsFormModalOpen(false); setEditingJob(null); };
  const openPrepModal = (job) => { setSelectedJobForPrep(job); setIsPrepModalOpen(true); };
  const closePrepModal = () => { setIsPrepModalOpen(false); setSelectedJobForPrep(null); };
  const closeConfirmModal = () => { setIsConfirmModalOpen(false); setJobToDelete(null); }

  // --- FILTERING & SORTING ---
  const filteredAndSortedJobs = useMemo(() => {
    let result = [...jobs];
    if (filterStatus !== 'All') result = result.filter(job => job.status === filterStatus);
    if (searchTerm) result = result.filter(job => job.company.toLowerCase().includes(searchTerm.toLowerCase()) || job.role.toLowerCase().includes(searchTerm.toLowerCase()));
    
    result.sort((a, b) => {
        const { key, direction } = sortConfig;
        let valA = a[key];
        let valB = b[key];

        if (key === 'interviewDate') {
            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;
        }

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
      
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
    return result;
  }, [jobs, filterStatus, searchTerm, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  // --- RENDER ---
  return (
    <div className="bg-slate-50 flex justify-center dark:bg-slate-900 min-h-screen min-w-screen font-sans text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <div className="container m-auto p-4 sm:p-6 lg:p-8">
        <Header onAddJob={() => openFormModal()} theme={theme} onToggleTheme={toggleTheme} />
        <FilterControls filterStatus={filterStatus} setFilterStatus={setFilterStatus} searchTerm={searchTerm} setSearchTerm={setSearchTerm} jobCount={filteredAndSortedJobs.length} />
        <JobList jobs={filteredAndSortedJobs} onEdit={openFormModal} onDelete={confirmDeleteJob} onSort={handleSort} sortConfig={sortConfig} onPrep={openPrepModal} />
        {isFormModalOpen && <JobForm onClose={closeFormModal} onAddJob={handleAddJob} onUpdateJob={handleUpdateJob} editingJob={editingJob} />}
        {isPrepModalOpen && <InterviewPrepModal job={selectedJobForPrep} onClose={closePrepModal} />}
        {isConfirmModalOpen && <ConfirmModal onClose={closeConfirmModal} onConfirm={executeDelete} title="Confirm Deletion" message="Are you sure you want to delete this job application? This action cannot be undone." />}
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS with Dark Mode styles ---

const Header = ({ onAddJob, theme, onToggleTheme }) => (
  <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
    <div>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">AI Job Application Tracker</h1>
      <p className="text-slate-500 dark:text-slate-400 mt-1">Supercharge your job hunt with AI-powered tools.</p>
    </div>
    <div className="flex items-center gap-4 mt-4 sm:mt-0">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <button onClick={onAddJob} className="flex items-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-indigo-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            <Plus size={18} /> Add New Application
        </button>
    </div>
  </header>
);

const FilterControls = ({ filterStatus, setFilterStatus, searchTerm, setSearchTerm, jobCount }) => {
  const statuses = ['All', 'Applied', 'Interviewing', 'Offer', 'Rejected'];
  return (
    <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Search by company or role..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" />
          {searchTerm && <X onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer" size={20} />}
        </div>
        <div className="flex items-center justify-center md:justify-end space-x-2 overflow-x-auto pb-2">
          {statuses.map(status => (
            <button key={status} onClick={() => setFilterStatus(status)} className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors duration-200 whitespace-nowrap ${filterStatus === status ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
              {status}
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 text-center md:text-right">Showing {jobCount} application{jobCount !== 1 && 's'}.</p>
    </div>
  );
};

const JobList = ({ jobs, onEdit, onDelete, onSort, sortConfig, onPrep }) => {
  const SortableHeader = ({ children, columnKey }) => {
    const isSorted = sortConfig.key === columnKey;
    return (
      <th onClick={() => onSort(columnKey)} className="p-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
        <div className="flex items-center gap-1">{children} {isSorted ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronDown size={14} className="text-slate-400 dark:text-slate-500" />}</div>
      </th>
    );
  };

  if (jobs.length === 0) {
    return (
      <div className="text-center py-16 px-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">No Applications Found</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Click "Add New Application" to get started!</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <SortableHeader columnKey="company">Company</SortableHeader>
              <SortableHeader columnKey="role">Role</SortableHeader>
              <SortableHeader columnKey="date">Date Applied</SortableHeader>
              <SortableHeader columnKey="interviewDate">Interview Date</SortableHeader>
              <th className="p-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
              <th className="p-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {jobs.map(job => <JobItem key={job.id} job={job} onEdit={onEdit} onDelete={onDelete} onPrep={onPrep} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const JobItem = ({ job, onEdit, onDelete, onPrep }) => {
  const getStatusClass = (status) => {
    switch (status) {
      case 'Interviewing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
      case 'Offer': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
      case 'Rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
      case 'Applied': default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
    }
  };

  const formattedInterviewDate = job.interviewDate 
    ? new Date(job.interviewDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : 'Not Set';

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
      <td className="p-4 whitespace-nowrap">
        <div className="font-semibold text-slate-900 dark:text-slate-100">{job.company}</div>
        <div className="text-sm text-slate-500 dark:text-slate-400">{job.notes ? job.notes.substring(0, 50) + '...' : 'No summary'}</div>
      </td>
      <td className="p-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">{job.role}</td>
      <td className="p-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">{new Date(job.date).toLocaleDateString()}</td>
      <td className="p-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
        {job.status === 'Interviewing' ? (
          <div className='flex items-center gap-2'>
            <CalendarClock size={16} className='text-blue-500' />
            <span>{formattedInterviewDate}</span>
          </div>
        ) : (
          <span className='text-slate-400 dark:text-slate-500'>--</span>
        )}
      </td>
      <td className="p-4 whitespace-nowrap"><span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStatusClass(job.status)}`}>{job.status}</span></td>
      <td className="p-4 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => onPrep(job)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all" title="Prep for Interview"><BrainCircuit size={18} /></button>
          <button onClick={() => onEdit(job)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all" title="Edit"><Edit size={18} /></button>
          <button onClick={() => onDelete(job.id)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all" title="Delete"><Trash2 size={18} /></button>
        </div>
      </td>
    </tr>
  );
};

const JobForm = ({ onClose, onAddJob, onUpdateJob, editingJob }) => {
  const [formData, setFormData] = useState({ 
    company: editingJob?.company || '', 
    role: editingJob?.role || '', 
    status: editingJob?.status || 'Applied', 
    description: editingJob?.description || '', 
    notes: editingJob?.notes || '',
    interviewDate: editingJob?.interviewDate || null
  });
  const [isSummarizing, setIsSummarizing] = useState(false);

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSummarize = async () => {
      if (!formData.description) { alert("Please paste a job description to summarize."); return; }
      if (!genAI) {
          alert("AI features are disabled. Please configure your API key.");
          return;
      }
      setIsSummarizing(true);
      try {
          const prompt = `Summarize the following job description in 2-3 bullet points, focusing on the most critical required skills and responsibilities:\n\n${formData.description}`;
          const summary = await callGeminiAPI(prompt);
          setFormData(prev => ({ ...prev, notes: summary }));
      } catch (error) { 
          console.error(error);
          alert("Failed to generate summary. Please check the console for details."); 
      } 
      finally { setIsSummarizing(false); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.company || !formData.role) { alert('Company and Role are required.'); return; }
    if (editingJob) onUpdateJob({ ...editingJob, ...formData }); else onAddJob(formData);
    onClose();
  };
  
  const getFormattedInterviewDate = () => {
    if (!formData.interviewDate) return '';
    const d = new Date(formData.interviewDate);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-6 sm:p-8 w-full max-w-lg relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={24} /></button>
        <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-slate-100">{editingJob ? 'Edit Job Application' : 'Add New Job Application'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company</label>
              <input type="text" id="company" name="company" value={formData.company} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" required />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role / Position</label>
              <input type="text" id="role" name="role" value={formData.role} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" required />
            </div>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
            <select id="status" name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"><option>Applied</option><option>Interviewing</option><option>Offer</option><option>Rejected</option></select>
          </div>

          {formData.status === 'Interviewing' && (
             <div>
                <label htmlFor="interviewDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Interview Date & Time</label>
                <input type="datetime-local" id="interviewDate" name="interviewDate" value={getFormattedInterviewDate()} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" />
            </div>
          )}

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Job Description (Optional)</label>
            <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows="4" placeholder="Paste the job description here..." className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"></textarea>
          </div>
          <div><button type="button" onClick={handleSummarize} disabled={isSummarizing || !formData.description || !genAI} className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition disabled:bg-purple-400 disabled:cursor-not-allowed"><Sparkles size={18} />{isSummarizing ? 'Summarizing...' : 'Summarize with AI'}</button></div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">AI Summary / Notes</label>
            <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows="3" placeholder="AI summary will appear here..." className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"></textarea>
          </div>
          
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">{editingJob ? 'Save Changes' : 'Add Application'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const InterviewPrepModal = ({ job, onClose }) => {
    const [prepContent, setPrepContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const generatePrepContent = useCallback(async () => {
        if (!genAI) {
            setError("AI features are disabled. Please configure your API key.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true); setError(null);
        try {
            const prompt = `I am preparing for an interview for the role of "${job.role}" at "${job.company}". Please generate the following for me:\n1. A list of 5-7 potential technical and behavioral interview questions tailored to this role and company.\n2. Three concise, actionable tips for success in the interview.\n\nFormat the output clearly with markdown headings.`;
            const content = await callGeminiAPI(prompt);
            setPrepContent(content);
        } catch (err) { 
            console.error(err);
            setError('Failed to generate interview prep content. Please try again later.'); 
        } 
        finally { setIsLoading(false); }
    }, [job]);

    useEffect(() => { generatePrepContent(); }, [generatePrepContent]);

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-6 sm:p-8 w-full max-w-2xl relative max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 z-10"><X size={24} /></button>
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <BrainCircuit className="text-purple-600 dark:text-purple-400" size={32}/>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">AI Interview Prep</h2>
                        <p className="text-slate-600 dark:text-slate-400">{job.role} at {job.company}</p>
                    </div>
                </div>
                <div className="overflow-y-auto flex-grow pr-2 prose prose-slate dark:prose-invert max-w-none">
                    {isLoading && <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400"><Loader2 className="animate-spin mb-4" size={48} /><p className="text-lg">Generating your personalized interview prep...</p></div>}
                    {error && <div className="text-center text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/50 p-4 rounded-lg">{error}</div>}
                    {!isLoading && !error && <div dangerouslySetInnerHTML={{ __html: prepContent.replace(/###\s*(.*)/g, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }} />}
                </div>
                 <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition">Close</button>
                </div>
            </div>
        </div>
    );
};

const ConfirmModal = ({ onClose, onConfirm, title, message }) => (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4" onClick={onClose}>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-6 sm:p-8 w-full max-w-sm relative" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">{title}</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">{message}</p>
            <div className="flex justify-end gap-4">
                <button onClick={onClose} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition">Cancel</button>
                <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition">Confirm</button>
            </div>
        </div>
    </div>
);

export default App;
