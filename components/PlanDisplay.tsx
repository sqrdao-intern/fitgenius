import React, { useState, useEffect } from 'react';
import { WorkoutCurriculum, ProgressEntry, WorkoutLog } from '../types';
import { generateExerciseVisualization } from '../services/geminiService';
import ProgressTracker from './ProgressTracker';
import { 
  Calendar, 
  Clock, 
  Dumbbell, 
  CheckCircle2, 
  Flame, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  Eye,
  Loader2,
  Image as ImageIcon,
  Check,
  Trophy,
  X,
  Scale,
  ArrowRight,
  Timer,
  Play,
  Pause,
  SkipForward,
  Video,
  ExternalLink,
  ListTodo,
  CircleCheck,
  Circle,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';

interface PlanDisplayProps {
  plan: WorkoutCurriculum;
  onReset: () => void;
  completedDays: string[];
  onToggleDayComplete: (dayId: string) => void;
  completedExercises: string[];
  onToggleExerciseComplete: (exerciseId: string) => string | null;
  progressHistory: ProgressEntry[];
  onAddProgress: (entry: ProgressEntry) => void;
  workoutLogs: WorkoutLog[];
  onLogWorkout: (log: WorkoutLog) => void;
}

const VISUALS_STORAGE_KEY = 'fitgenius_visuals';

const parseRestTime = (restStr: string): number => {
  if (!restStr) return 60;
  const lowerStr = restStr.toLowerCase();
  const minMatch = lowerStr.match(/(\d+)\s*(?:min|m\b)/);
  if (minMatch) return parseInt(minMatch[1]) * 60;
  const match = lowerStr.match(/(\d+)/);
  if (match) return parseInt(match[1]);
  return 60;
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const PlanDisplay: React.FC<PlanDisplayProps> = ({ 
  plan, 
  onReset, 
  completedDays, 
  onToggleDayComplete,
  completedExercises,
  onToggleExerciseComplete,
  progressHistory,
  onAddProgress,
  workoutLogs,
  onLogWorkout
}) => {
  const [activeWeek, setActiveWeek] = useState<number>(0);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({});
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completingDayId, setCompletingDayId] = useState<string | null>(null);
  const [logWeight, setLogWeight] = useState<string>('');
  const [workoutNotes, setWorkoutNotes] = useState<string>('');
  const [timer, setTimer] = useState<{
    isActive: boolean;
    remaining: number;
    total: number;
    label: string;
  } | null>(null);

  const [visuals, setVisuals] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(VISUALS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  });

  const [loadingVisuals, setLoadingVisuals] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      localStorage.setItem(VISUALS_STORAGE_KEY, JSON.stringify(visuals));
    } catch (e) {
      console.warn("Local storage quota exceeded");
    }
  }, [visuals]);

  useEffect(() => {
    let interval: number;
    if (timer && timer.isActive && timer.remaining > 0) {
      interval = window.setInterval(() => {
        setTimer(prev => {
          if (!prev) return null;
          if (prev.remaining <= 1) return { ...prev, isActive: false, remaining: 0 };
          return { ...prev, remaining: prev.remaining - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const toggleDay = (dayKey: string) => {
    setExpandedDay(expandedDay === dayKey ? null : dayKey);
  };

  const toggleExerciseDetails = (uniqueKey: string) => {
    setExpandedExercises(prev => ({ ...prev, [uniqueKey]: !prev[uniqueKey] }));
  };

  const handleGenerateVisual = async (exerciseName: string) => {
    if (loadingVisuals[exerciseName]) return;
    
    setLoadingVisuals(prev => ({ ...prev, [exerciseName]: true }));
    try {
      const imageUrl = await generateExerciseVisualization(exerciseName);
      if (imageUrl) {
        setVisuals(prev => ({ ...prev, [exerciseName]: imageUrl }));
      }
    } catch (err) {
      console.error("Error generating visual:", err);
    } finally {
      setLoadingVisuals(prev => ({ ...prev, [exerciseName]: false }));
    }
  };

  const openCompletionModal = (dayId: string) => {
    setCompletingDayId(dayId);
    const lastWeight = progressHistory.length > 0 ? progressHistory[progressHistory.length - 1].weight : '';
    setLogWeight(lastWeight ? String(lastWeight) : '');
    setWorkoutNotes('');
    setShowCompletionModal(true);
  };

  const handleDayCompleteToggle = (dayId: string, isCurrentlyCompleted: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrentlyCompleted) {
      onToggleDayComplete(dayId);
    } else {
      openCompletionModal(dayId);
    }
  };

  const handleExerciseToggle = (exerciseId: string) => {
    const dayTriggeredCompletion = onToggleExerciseComplete(exerciseId);
    if (dayTriggeredCompletion) {
      openCompletionModal(dayTriggeredCompletion);
    }
  };

  const confirmCompletion = (includeWeight: boolean) => {
    if (completingDayId) {
      const [wStr, dStr] = completingDayId.split('-');
      const wIdx = parseInt(wStr.replace('w',''));
      const dIdx = parseInt(dStr.replace('d',''));
      const dayData = plan.weeks[wIdx].schedule[dIdx];

      onLogWorkout({
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString(),
        dayId: completingDayId,
        dayName: dayData.dayName,
        focus: dayData.focus,
        duration: dayData.estimatedDuration,
        notes: workoutNotes
      });

      onToggleDayComplete(completingDayId);
      
      if (includeWeight && logWeight) {
        onAddProgress({
          date: new Date().toISOString().split('T')[0],
          weight: parseFloat(logWeight)
        });
      }
      
      setShowCompletionModal(false);
      setCompletingDayId(null);
    }
  };

  const startRestTimer = (restString: string, exerciseName: string) => {
    const seconds = parseRestTime(restString);
    setTimer({
      isActive: true,
      remaining: seconds,
      total: seconds,
      label: exerciseName
    });
  };

  const stopTimer = () => setTimer(null);

  const chartData = plan.weeks.map((week, index) => ({
    name: `Week ${week.weekNumber}`,
    intensity: 60 + (index * 10) + Math.random() * 5,
  }));

  const currentWeekPlan = plan.weeks[activeWeek];
  const totalWorkouts = plan.weeks.reduce((acc, week) => 
    acc + week.schedule.filter(d => d.exercises.length > 0 && !d.focus.toLowerCase().includes('rest')).length, 0
  );
  
  let validWorkoutIds: string[] = [];
  plan.weeks.forEach((week, wIdx) => {
    week.schedule.forEach((day, dIdx) => {
       if (day.exercises.length > 0 && !day.focus.toLowerCase().includes('rest')) {
         validWorkoutIds.push(`w${wIdx}-d${dIdx}`);
       }
    });
  });
  
  const completedCount = validWorkoutIds.filter(id => completedDays.includes(id)).length;
  const progressPercentage = Math.round((completedCount / totalWorkouts) * 100);

  return (
    <div className="w-full animate-fadeIn space-y-8 pb-20">
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-900/40 to-zinc-900 border border-emerald-500/20 rounded-3xl p-8 relative overflow-hidden group">
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
             <div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">{plan.programName}</h2>
                <p className="text-zinc-400 max-w-2xl text-sm md:text-base">{plan.description}</p>
             </div>
             <button 
                onClick={onReset}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-all border border-zinc-700 hover:border-zinc-600"
             >
                <RefreshCw className="w-4 h-4" /> New Plan
             </button>
          </div>
          
          <div className="mb-6 bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50 backdrop-blur-sm">
             <div className="flex justify-between items-end mb-2">
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                   <Trophy className="w-5 h-5" />
                   <span>Current Progress</span>
                </div>
                <span className="text-2xl font-bold text-white">{progressPercentage}%</span>
             </div>
             <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                   className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000 ease-out"
                   style={{ width: `${progressPercentage}%` }}
                />
             </div>
             <div className="text-right mt-1 text-xs text-zinc-500">
                {completedCount} of {totalWorkouts} sessions completed
             </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-black/20 backdrop-blur-sm p-3 rounded-xl border border-white/5 flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Duration</p>
                <p className="font-semibold text-white">{plan.weeks.length} Weeks</p>
              </div>
            </div>
            <div className="bg-black/20 backdrop-blur-sm p-3 rounded-xl border border-white/5 flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Week Focus</p>
                <p className="font-semibold text-white text-sm leading-tight">{currentWeekPlan.focus}</p>
              </div>
            </div>
            <div className="bg-black/20 backdrop-blur-sm p-3 rounded-xl border border-white/5 flex items-center gap-3 col-span-2 md:col-span-1">
              <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
                <Dumbbell className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Total Workouts</p>
                <p className="font-semibold text-white">
                  {totalWorkouts} Sessions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {plan.weeks.map((week, idx) => {
              const weekWorkoutIds = week.schedule
                  .map((d, dIdx) => ({ id: `w${idx}-d${dIdx}`, isWork: d.exercises.length > 0 && !d.focus.toLowerCase().includes('rest') }))
                  .filter(x => x.isWork)
                  .map(x => x.id);
              
              const isWeekComplete = weekWorkoutIds.length > 0 && weekWorkoutIds.every(id => completedDays.includes(id));
              
              return (
              <button
                key={week.weekNumber}
                onClick={() => setActiveWeek(idx)}
                className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                  activeWeek === idx 
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                Week {week.weekNumber}
                {isWeekComplete && <CheckCircle2 className={`w-3 h-3 ${activeWeek === idx ? 'text-black' : 'text-emerald-500'}`} />}
              </button>
            )})}
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-500" /> Weekly Schedule
            </h3>
            
            {currentWeekPlan.schedule.map((day, dayIdx) => {
              const dayKey = `w${activeWeek}-d${dayIdx}`;
              const isRestDay = day.exercises.length === 0 || day.focus.toLowerCase().includes('rest');
              const isExpanded = expandedDay === dayKey;
              const isCompleted = completedDays.includes(dayKey);
              
              const dayExerciseIds = day.exercises.map((_, exIdx) => `${dayKey}-ex${exIdx}`);
              const dayCompletedExCount = dayExerciseIds.filter(id => completedExercises.includes(id)).length;
              const dayProgress = day.exercises.length > 0 ? (dayCompletedExCount / day.exercises.length) * 100 : 0;

              return (
                <div 
                  key={dayKey}
                  className={`border rounded-xl overflow-hidden transition-all duration-300 ${
                    isRestDay 
                      ? 'bg-zinc-900/30 border-zinc-800/30 opacity-60' 
                      : isCompleted
                        ? 'bg-emerald-950/20 border-emerald-900/50' 
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div 
                    onClick={() => !isRestDay && toggleDay(dayKey)}
                    className={`p-5 flex items-center justify-between cursor-pointer select-none ${isRestDay ? 'cursor-default' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg relative transition-all ${
                        isRestDay 
                          ? 'bg-zinc-800 text-zinc-500' 
                          : isCompleted 
                            ? 'bg-emerald-500 text-black' 
                            : 'bg-emerald-500/10 text-emerald-500'
                      }`}>
                        {isCompleted ? <Check className="w-6 h-6" /> : day.dayName.substring(0, 3)}
                      </div>
                      
                      <div>
                        <h4 className={`font-semibold flex items-center gap-2 ${isRestDay ? 'text-zinc-500' : isCompleted ? 'text-emerald-400' : 'text-white'}`}>
                          {day.dayName}
                          {isCompleted && <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">Complete</span>}
                        </h4>
                        <p className="text-sm text-zinc-400">{day.focus}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                       {!isRestDay && (
                          <div className="flex items-center gap-3">
                             <div className="text-right hidden sm:block mr-2">
                                <span className="text-xs text-zinc-500 block">Est. Time</span>
                                <span className="text-sm text-zinc-300 font-medium">{day.estimatedDuration}</span>
                             </div>
                             
                             <button
                                onClick={(e) => handleDayCompleteToggle(dayKey, isCompleted, e)}
                                className={`p-2 rounded-full border transition-all ${
                                  isCompleted 
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 hover:bg-red-500/20 hover:border-red-500 hover:text-red-400' 
                                    : 'border-zinc-700 text-zinc-500 hover:border-emerald-500 hover:text-emerald-500'
                                }`}
                                title={isCompleted ? "Mark as incomplete" : "Mark as complete"}
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </button>
                             
                             <div className="h-8 w-px bg-zinc-800 mx-1 hidden sm:block"></div>
                             
                             {isExpanded ? <ChevronUp className="text-zinc-500" /> : <ChevronDown className="text-zinc-500" />}
                          </div>
                       )}
                    </div>
                  </div>

                  <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <div className="p-5 pt-0 border-t border-zinc-800/50">
                      
                      {!isRestDay && !isCompleted && (
                        <div className="mt-4 bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/50 flex items-center justify-between">
                           <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                              <ListTodo className="w-4 h-4 text-emerald-500" /> 
                              {dayCompletedExCount} / {day.exercises.length} Exercises Done
                           </div>
                           <div className="flex-1 max-w-[120px] h-1.5 bg-zinc-800 rounded-full mx-4 overflow-hidden">
                              <div 
                                 className="h-full bg-emerald-500 transition-all duration-500" 
                                 style={{ width: `${dayProgress}%` }}
                              />
                           </div>
                        </div>
                      )}

                      <div className="mt-4 space-y-4">
                        {day.exercises.map((ex, exIdx) => {
                          const uniqueKey = `${activeWeek}-${dayIdx}-${exIdx}`;
                          const exerciseId = `${dayKey}-ex${exIdx}`;
                          const isExerciseComplete = completedExercises.includes(exerciseId);
                          const isVisualExpanded = expandedExercises[uniqueKey];
                          const visualUrl = visuals[ex.name];
                          const isLoadingVisual = loadingVisuals[ex.name];

                          return (
                            <div 
                              key={exIdx} 
                              className={`bg-zinc-950/50 rounded-lg border transition-all duration-300 overflow-hidden ${
                                isExerciseComplete 
                                  ? 'border-emerald-900/40 bg-emerald-950/5 opacity-75' 
                                  : 'border-zinc-800/50'
                              }`}
                            >
                              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-1">
                                      <button
                                        onClick={() => handleExerciseToggle(exerciseId)}
                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all border shrink-0 ${
                                          isExerciseComplete
                                            ? 'bg-emerald-500 border-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                            : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-emerald-500 hover:text-emerald-500'
                                        }`}
                                      >
                                        {isExerciseComplete ? <Check className="w-4 h-4" /> : (exIdx + 1)}
                                      </button>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <button
                                          onClick={() => toggleExerciseDetails(uniqueKey)}
                                          className={`font-medium text-lg text-left transition-colors hover:text-emerald-400 outline-none ${
                                            isExerciseComplete ? 'text-zinc-500 line-through' : 'text-white'
                                          }`}
                                        >
                                          {ex.name}
                                        </button>
                                        {isExerciseComplete && (
                                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                            <CircleCheck className="w-2.5 h-2.5" /> Done
                                          </span>
                                        )}
                                      </div>
                                  </div>
                                  {ex.notes && <p className={`text-xs ml-10 mb-2 transition-colors ${
                                    isExerciseComplete ? 'text-zinc-600' : 'text-zinc-500'
                                  }`}>{ex.notes}</p>}
                                  
                                  <div className="flex flex-wrap gap-2 ml-10">
                                    <button 
                                      onClick={() => handleExerciseToggle(exerciseId)}
                                      className={`text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
                                        isExerciseComplete 
                                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500'
                                      }`}
                                    >
                                      {isExerciseComplete ? <Circle className="w-3 h-3" /> : <CircleCheck className="w-3 h-3" />}
                                      {isExerciseComplete ? 'Incomplete' : 'Done'}
                                    </button>

                                    {!isExerciseComplete && (
                                      <button 
                                        onClick={() => startRestTimer(ex.rest, ex.name)}
                                        className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500 transition-all"
                                      >
                                        <Timer className="w-3 h-3" /> Rest
                                      </button>
                                    )}

                                    <button 
                                      onClick={() => toggleExerciseDetails(uniqueKey)}
                                      className={`text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
                                        isVisualExpanded 
                                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
                                      }`}
                                    >
                                      {isVisualExpanded ? <Eye className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                                      {isVisualExpanded ? 'Hide' : 'Details'}
                                    </button>

                                    {(ex.videoUrl || ex.name) && !isExerciseComplete && (
                                      <a 
                                        href={ex.videoUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' exercise tutorial')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-blue-400 hover:border-blue-500 transition-all"
                                      >
                                        <Video className="w-3 h-3" /> Video
                                      </a>
                                    )}
                                  </div>
                                </div>
                                
                                <div className={`flex items-center gap-4 ml-10 sm:ml-0 text-sm p-2 rounded-lg border transition-all duration-300 ${
                                  isExerciseComplete 
                                    ? 'bg-emerald-950/20 border-emerald-900/20' 
                                    : 'bg-zinc-900/50 border-zinc-800/50'
                                }`}>
                                  <div className="text-center px-2 shrink-0">
                                    <span className="block text-zinc-500 text-[10px] uppercase tracking-wider">Sets</span>
                                    <span className="text-white font-mono font-medium">{ex.sets}</span>
                                  </div>
                                  <div className="w-px h-8 bg-zinc-800"></div>
                                  <div className="text-center px-2 shrink-0">
                                    <span className="block text-zinc-500 text-[10px] uppercase tracking-wider">Reps</span>
                                    <span className="text-white font-mono font-medium">{ex.reps}</span>
                                  </div>
                                </div>
                              </div>

                              {isVisualExpanded && (
                                <div className="border-t border-zinc-800/50 bg-black/20 p-4 animate-fadeIn">
                                  <div className="flex flex-col md:flex-row gap-6">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Form Instructions</h5>
                                        {!visualUrl && !isLoadingVisual && (
                                           <button 
                                              onClick={() => handleGenerateVisual(ex.name)}
                                              className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                                           >
                                              <Sparkles className="w-2.5 h-2.5" /> Generate AI Visual
                                           </button>
                                        )}
                                      </div>
                                      <p className="text-sm text-zinc-300 leading-relaxed mb-4">
                                        {ex.instructions || "Maintain proper alignment and control throughout the movement."}
                                      </p>
                                      
                                      {ex.notes && (
                                        <div className="bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/50">
                                          <span className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Coach's Notes</span>
                                          <p className="text-xs text-zinc-400">{ex.notes}</p>
                                        </div>
                                      )}
                                    </div>
                                    <div className="w-full md:w-48 aspect-square bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800 overflow-hidden relative group shrink-0">
                                      {isLoadingVisual ? (
                                        <div className="flex flex-col items-center gap-2">
                                          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                                          <span className="text-[10px] text-zinc-500">AI Rendering...</span>
                                        </div>
                                      ) : visualUrl ? (
                                        <div className="relative w-full h-full">
                                          <img 
                                            src={visualUrl} 
                                            alt={ex.name} 
                                            className="w-full h-full object-cover opacity-90 transition-opacity hover:opacity-100" 
                                          />
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                            <span className="text-[10px] text-white/80">AI Visual Guide</span>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-center p-4">
                                          <ImageIcon className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
                                          <p className="text-[10px] text-zinc-600 mb-3">No visual guide available</p>
                                          <button 
                                            onClick={() => handleGenerateVisual(ex.name)}
                                            className="text-[10px] w-full py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-1"
                                          >
                                            <Sparkles className="w-3 h-3" /> Generate Guide
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <ProgressTracker 
            entries={progressHistory} 
            onAddEntry={onAddProgress} 
            completedWorkoutCount={completedCount}
            workoutLogs={workoutLogs}
          />
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Intensity Projection</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorIntensity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="intensity" 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorIntensity)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
           <button 
                onClick={onReset}
                className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm transition-all border border-zinc-700 hover:border-zinc-600"
             >
                <RefreshCw className="w-4 h-4" /> Reset Plan
             </button>
        </div>
      </div>

      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-md w-full shadow-2xl scale-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" /> Workout Complete!
              </h3>
              <button 
                onClick={() => setShowCompletionModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <p className="text-zinc-400 text-sm">Great job crushing your session. Log any notes or biometrics below.</p>
              
              <div className="bg-black/40 p-3 rounded-xl border border-zinc-800">
                 <label className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                    <Scale className="w-3 h-3" /> Body Weight (kg)
                 </label>
                 <input 
                    type="number" 
                    step="0.1" 
                    placeholder="75.0"
                    value={logWeight}
                    onChange={(e) => setLogWeight(e.target.value)}
                    className="w-full bg-transparent text-lg font-bold text-white outline-none"
                    autoFocus
                 />
              </div>

              <div className="bg-black/40 p-3 rounded-xl border border-zinc-800">
                 <label className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Workout Notes
                 </label>
                 <textarea 
                    placeholder="How did it feel? Any personal records?"
                    value={workoutNotes}
                    onChange={(e) => setWorkoutNotes(e.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none resize-none h-20"
                 />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => confirmCompletion(false)} className="px-4 py-3 rounded-xl border border-zinc-700 text-zinc-300 font-medium text-sm">Cancel</button>
              <button onClick={() => confirmCompletion(true)} className="px-4 py-3 rounded-xl bg-emerald-500 text-black font-bold text-sm flex items-center justify-center gap-2">Log & Finish <ArrowRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanDisplay;