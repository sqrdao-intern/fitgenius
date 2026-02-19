
import React, { useState, useEffect } from 'react';
import { UserProfile, WorkoutCurriculum, ProgressEntry, WorkoutLog } from './types';
import { generateWorkoutPlan } from './services/geminiService';
import Onboarding from './components/Onboarding';
import PlanDisplay from './components/PlanDisplay';
import Landing from './components/Landing';
import { Sparkles } from 'lucide-react';

const STORAGE_KEYS = {
  PROFILE: 'fitgenius_profile',
  PLAN: 'fitgenius_plan',
  COMPLETED: 'fitgenius_completed',
  COMPLETED_EXERCISES: 'fitgenius_completed_exercises',
  PROGRESS: 'fitgenius_progress',
  WORKOUT_LOGS: 'fitgenius_workout_logs'
};

const LogoIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
    <path d="M9 9l6 6" />
    <path d="M15 9l-1 1" />
    <path d="M9 15l1-1" />
    <path d="M6.5 9a2.5 2.5 0 1 1 3.5-3.5" />
    <path d="M14 16.5a2.5 2.5 0 1 1 3.5-3.5" />
  </svg>
);

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const [plan, setPlan] = useState<WorkoutCurriculum | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PLAN);
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const [completedDays, setCompletedDays] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMPLETED);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [completedExercises, setCompletedExercises] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMPLETED_EXERCISES);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [progressHistory, setProgressHistory] = useState<ProgressEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WORKOUT_LOGS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (profile) localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    else localStorage.removeItem(STORAGE_KEYS.PROFILE);
  }, [profile]);

  useEffect(() => {
    if (plan) localStorage.setItem(STORAGE_KEYS.PLAN, JSON.stringify(plan));
    else localStorage.removeItem(STORAGE_KEYS.PLAN);
  }, [plan]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COMPLETED, JSON.stringify(completedDays));
  }, [completedDays]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COMPLETED_EXERCISES, JSON.stringify(completedExercises));
  }, [completedExercises]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progressHistory));
  }, [progressHistory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify(workoutLogs));
  }, [workoutLogs]);

  const handleGenerate = async (userProfile: UserProfile) => {
    setProfile(userProfile);
    setLoading(true);
    setError(null);
    try {
      const generatedPlan = await generateWorkoutPlan(userProfile);
      
      // Calculate Monday of the NEXT week (fresh start)
      const now = new Date();
      const day = now.getDay();
      // Calculate diff to Monday of current week
      const diffToCurrentMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      
      // Set to Monday of next week (Current Monday + 7 days)
      const nextMonday = new Date(now);
      nextMonday.setDate(diffToCurrentMonday + 7);
      nextMonday.setHours(0, 0, 0, 0);

      const planWithDate: WorkoutCurriculum = {
        ...generatedPlan,
        startDate: nextMonday.toISOString()
      };

      setPlan(planWithDate);
      setCompletedDays([]);
      setCompletedExercises([]);
      setWorkoutLogs([]);
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate plan. Please try again. Ensure you have a valid API Key.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Are you sure? This will delete your current plan and progress.")) {
      setPlan(null);
      setCompletedDays([]);
      setCompletedExercises([]);
      setWorkoutLogs([]);
      setError(null);
      setShowOnboarding(false);
    }
  };

  const handleUpdatePlan = (newPlan: WorkoutCurriculum) => {
    setPlan(newPlan);
  };

  const handleToggleDayComplete = (dayId: string) => {
    const isNowComplete = !completedDays.includes(dayId);
    
    setCompletedDays(prev => 
      isNowComplete 
        ? [...prev, dayId] 
        : prev.filter(id => id !== dayId)
    );

    if (plan) {
      const [wStr, dStr] = dayId.split('-');
      const wIdx = parseInt(wStr.replace('w',''));
      const dIdx = parseInt(dStr.replace('d',''));
      
      const dayPlan = plan.weeks[wIdx]?.schedule[dIdx];
      if (dayPlan) {
        const exerciseIds = dayPlan.exercises.map((_, exIdx) => `${dayId}-ex${exIdx}`);
        setCompletedExercises(prev => {
          if (isNowComplete) {
            return Array.from(new Set([...prev, ...exerciseIds]));
          } else {
            return prev.filter(id => !exerciseIds.includes(id));
          }
        });
      }
    }
  };

  const handleToggleExerciseComplete = (exerciseId: string) => {
    const isNowComplete = !completedExercises.includes(exerciseId);
    
    setCompletedExercises(prev => 
      isNowComplete 
        ? [...prev, exerciseId] 
        : prev.filter(id => id !== exerciseId)
    );

    if (plan && isNowComplete) {
      const parts = exerciseId.split('-ex');
      const dayId = parts[0];
      const [wStr, dStr] = dayId.split('-');
      const wIdx = parseInt(wStr.replace('w',''));
      const dIdx = parseInt(dStr.replace('d',''));
      
      const dayPlan = plan.weeks[wIdx]?.schedule[dIdx];
      if (dayPlan) {
        const allDayExerciseIds = dayPlan.exercises.map((_, exIdx) => `${dayId}-ex${exIdx}`);
        const willBeFullyComplete = allDayExerciseIds.every(id => 
          id === exerciseId || completedExercises.includes(id)
        );

        if (willBeFullyComplete && !completedDays.includes(dayId)) {
          return dayId;
        }
      }
    }
    return null;
  };

  const handleAddProgress = (entry: ProgressEntry) => {
    setProgressHistory(prev => {
      const newHistory = [...prev, entry];
      return newHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });
  };

  const handleLogWorkout = (log: WorkoutLog) => {
    setWorkoutLogs(prev => [log, ...prev]);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald-500/30 flex flex-col">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <nav className="relative z-50 border-b border-white/5 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-tr from-emerald-500 to-blue-500 p-2 rounded-lg text-white">
                <LogoIcon className="w-6 h-6" />
              </div>
              <span className="font-bold text-xl tracking-tight">FitGenius<span className="text-emerald-500">.ai</span></span>
            </div>
            <div className="flex items-center gap-4 text-sm font-medium">
               <span className="hidden sm:inline text-zinc-500">Curriculum v1.3</span>
               <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block"></div>
               <span className="text-zinc-400">Personalized Home Fitness</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow w-full flex flex-col">
        {plan ? (
          <PlanDisplay 
            plan={plan} 
            onReset={handleReset} 
            onUpdatePlan={handleUpdatePlan}
            completedDays={completedDays}
            onToggleDayComplete={handleToggleDayComplete}
            completedExercises={completedExercises}
            onToggleExerciseComplete={handleToggleExerciseComplete}
            progressHistory={progressHistory}
            onAddProgress={handleAddProgress}
            workoutLogs={workoutLogs}
            onLogWorkout={handleLogWorkout}
            userProfile={profile}
          />
        ) : showOnboarding ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            {error && (
               <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg text-sm max-w-lg w-full text-center animate-fadeIn">
                 {error}
               </div>
            )}

            <Onboarding 
              onComplete={handleGenerate} 
              isLoading={loading} 
              initialProfile={profile || undefined}
            />
            
            {loading && (
              <div className="mt-8 flex flex-col items-center animate-pulse">
                <Sparkles className="w-6 h-6 text-emerald-400 mb-2 animate-spin-slow" />
                <p className="text-zinc-500 text-sm">Analyzing metrics & designing curriculum...</p>
              </div>
            )}
          </div>
        ) : (
          <Landing onStart={() => setShowOnboarding(true)} />
        )}
      </main>

      <footer className="relative z-10 border-t border-white/5 bg-black/50 backdrop-blur-md py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/10 p-1.5 rounded-lg text-emerald-500">
               <LogoIcon className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-zinc-300">FitGenius.ai</span>
          </div>
          <div className="text-center md:text-right">
            <p className="text-xs text-zinc-500">
              © {new Date().getFullYear()} FitGenius AI. All rights reserved. 
              <span className="hidden sm:inline mx-1">•</span> 
              Powered by Google Gemini.
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Created by <a href="https://github.com/sqrdao-intern" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-emerald-500 transition-colors">sqrdao-intern</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
