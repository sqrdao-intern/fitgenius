import React, { useState, useEffect } from 'react';
import { WorkoutCurriculum, ProgressEntry, WorkoutLog, Exercise, UserProfile } from '../types';
import { generateExerciseVisualization, getExerciseAlternatives } from '../services/geminiService';
import ProgressTracker from './ProgressTracker';
import { useLanguage } from '../contexts/LanguageContext';
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
  Video,
  ListTodo,
  CircleCheck,
  Circle,
  MessageSquare,
  Sparkles,
  GripVertical,
  Share2,
  Shuffle,
  Info
} from 'lucide-react';

interface PlanDisplayProps {
  plan: WorkoutCurriculum;
  onReset: () => void;
  onUpdatePlan: (plan: WorkoutCurriculum) => void;
  completedDays: string[];
  onToggleDayComplete: (dayId: string) => void;
  completedExercises: string[];
  onToggleExerciseComplete: (exerciseId: string) => string | null;
  progressHistory: ProgressEntry[];
  onAddProgress: (entry: ProgressEntry) => void;
  workoutLogs: WorkoutLog[];
  onLogWorkout: (log: WorkoutLog) => void;
  userProfile: UserProfile | null;
}

interface WorkoutSummaryData {
  dayName: string;
  focus: string;
  duration: string;
  exercisesCount: number;
  weightLogged?: number;
  notes?: string;
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

const PlanDisplay: React.FC<PlanDisplayProps> = ({ 
  plan, 
  onReset, 
  onUpdatePlan,
  completedDays, 
  onToggleDayComplete,
  completedExercises,
  onToggleExerciseComplete,
  progressHistory,
  onAddProgress,
  workoutLogs,
  onLogWorkout,
  userProfile
}) => {
  const { t, language } = useLanguage();
  const [activeWeek, setActiveWeek] = useState<number>(0);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({});
  
  // Log Modal State
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completingDayId, setCompletingDayId] = useState<string | null>(null);
  const [logWeight, setLogWeight] = useState<string>('');
  const [workoutNotes, setWorkoutNotes] = useState<string>('');
  
  // Summary Screen State
  const [workoutSummary, setWorkoutSummary] = useState<WorkoutSummaryData | null>(null);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  // Swap Exercise State
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapCandidates, setSwapCandidates] = useState<Exercise[]>([]);
  const [targetSwapIndex, setTargetSwapIndex] = useState<{w: number, d: number, e: number} | null>(null);

  const [timer, setTimer] = useState<{
    isActive: boolean;
    remaining: number;
    total: number;
    label: string;
  } | null>(null);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{ weekIdx: number; dayIdx: number; exIdx: number } | null>(null);

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

  const toggleExerciseDetails = (uniqueKey: string, exerciseName: string) => {
    setExpandedExercises(prev => {
      const isExpanded = !prev[uniqueKey];
      if (isExpanded && !visuals[exerciseName] && !loadingVisuals[exerciseName]) {
        setTimeout(() => handleGenerateVisual(exerciseName), 0);
      }
      return { ...prev, [uniqueKey]: isExpanded };
    });
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
      
      const weightVal = includeWeight && logWeight ? parseFloat(logWeight) : undefined;
      
      if (weightVal) {
        onAddProgress({
          date: new Date().toISOString().split('T')[0],
          weight: weightVal
        });
      }
      
      // Set summary data before clearing modal
      setWorkoutSummary({
        dayName: dayData.dayName,
        focus: dayData.focus,
        duration: dayData.estimatedDuration,
        exercisesCount: dayData.exercises.length,
        weightLogged: weightVal,
        notes: workoutNotes
      });

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

  // DnD Handlers
  const handleDragStart = (e: React.DragEvent, weekIdx: number, dayIdx: number, exIdx: number) => {
    setDraggedItem({ weekIdx, dayIdx, exIdx });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetWeekIdx: number, targetDayIdx: number, targetExIdx: number) => {
    e.preventDefault();
    
    if (!draggedItem) return;
    
    if (draggedItem.weekIdx !== targetWeekIdx || draggedItem.dayIdx !== targetDayIdx) {
      setDraggedItem(null);
      return;
    }
    
    if (draggedItem.exIdx === targetExIdx) {
      setDraggedItem(null);
      return;
    }

    const newPlan = JSON.parse(JSON.stringify(plan));
    const dayExercises = newPlan.weeks[targetWeekIdx].schedule[targetDayIdx].exercises;
    
    const [movedItem] = dayExercises.splice(draggedItem.exIdx, 1);
    dayExercises.splice(targetExIdx, 0, movedItem);

    onUpdatePlan(newPlan);
    setDraggedItem(null);
  };

  // Swap Logic
  const initiateSwap = async (weekIdx: number, dayIdx: number, exIdx: number, exerciseName: string) => {
    setTargetSwapIndex({w: weekIdx, d: dayIdx, e: exIdx});
    setIsSwapping(true);
    setSwapCandidates([]); 
    
    // Fallback if profile is missing
    const equipment = userProfile?.equipment.map(e => e.toString()) || ['Bodyweight Only'];
    
    try {
        const alternatives = await getExerciseAlternatives(exerciseName, equipment, language);
        setSwapCandidates(alternatives);
    } catch (e) {
        console.error(e);
        setIsSwapping(false);
        setTargetSwapIndex(null);
        alert("Failed to find alternatives. Please try again.");
    }
  };

  const confirmSwap = (newExercise: Exercise) => {
     if (!targetSwapIndex) return;
     const {w, d, e} = targetSwapIndex;
     
     const newPlan = JSON.parse(JSON.stringify(plan));
     // Replace the exercise
     newPlan.weeks[w].schedule[d].exercises[e] = newExercise;
     
     onUpdatePlan(newPlan);
     
     // Optionally pre-fetch visual for new exercise
     handleGenerateVisual(newExercise.name); 
     
     // Close modal
     setIsSwapping(false);
     setTargetSwapIndex(null);
     setSwapCandidates([]);
  };

  const getDayDate = (weekIdx: number, dayIdx: number) => {
    if (!plan.startDate) return null;
    const date = new Date(plan.startDate);
    date.setDate(date.getDate() + (weekIdx * 7) + dayIdx);
    return date;
  };

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

  const handleShare = async () => {
    const shareText = `🚀 I'm training with FitGenius AI!\n\n📋 Program: ${plan.programName}\n🎯 Focus: ${currentWeekPlan.focus}\n📈 Progress: ${progressPercentage}% completed\n\nGenerated by AI.`;
    const shareData = {
        title: 'My FitGenius Workout Plan',
        text: shareText,
        url: window.location.href
    };

    try {
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
        } else {
            throw new Error('Web Share API not available');
        }
    } catch (err) {
        // Fallback to clipboard
        try {
            await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
            setShowCopiedToast(true);
            setTimeout(() => setShowCopiedToast(false), 2500);
        } catch (clipboardErr) {
            console.error('Failed to copy', clipboardErr);
            alert('Unable to share. Please screenshot or copy the URL manually.');
        }
    }
  };

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
             <div className="flex items-center gap-3 mt-4 md:mt-0">
               <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm transition-all"
               >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('plan.share')}</span>
               </button>
               <button 
                  onClick={onReset}
                  className="hidden md:flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-all border border-zinc-700 hover:border-zinc-600"
               >
                  <RefreshCw className="w-4 h-4" /> {t('plan.newPlan')}
               </button>
             </div>
          </div>
          
          <div className="mb-6 bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50 backdrop-blur-sm">
             <div className="flex justify-between items-end mb-2">
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                   <Trophy className="w-5 h-5" />
                   <span>{t('plan.currentProgress')}</span>
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
                {completedCount} {t('common.of')} {totalWorkouts} {t('plan.sessions')} {t('plan.completed')}
             </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-black/20 backdrop-blur-sm p-3 rounded-xl border border-white/5 flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">{t('plan.duration')}</p>
                <p className="font-semibold text-white">{plan.weeks.length} {t('plan.weeks')}</p>
              </div>
            </div>
            <div className="bg-black/20 backdrop-blur-sm p-3 rounded-xl border border-white/5 flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">{t('plan.weekFocus')}</p>
                <p className="font-semibold text-white text-sm leading-tight">{currentWeekPlan.focus}</p>
              </div>
            </div>
            <div className="bg-black/20 backdrop-blur-sm p-3 rounded-xl border border-white/5 flex items-center gap-3 col-span-2 md:col-span-1">
              <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
                <Dumbbell className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">{t('plan.totalWorkouts')}</p>
                <p className="font-semibold text-white">
                  {totalWorkouts} {t('plan.sessions')}
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
              
              const weekStartDate = getDayDate(idx, 0);
              const weekEndDate = getDayDate(idx, 6);
              const dateRange = weekStartDate && weekEndDate 
                 ? `${weekStartDate.toLocaleDateString(language === 'vi' ? 'vi-VN' : undefined, {month:'short', day:'numeric'})} - ${weekEndDate.toLocaleDateString(language === 'vi' ? 'vi-VN' : undefined, {month:'short', day:'numeric'})}`
                 : '';

              return (
              <button
                key={week.weekNumber}
                onClick={() => setActiveWeek(idx)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
                  activeWeek === idx 
                  ? 'bg-emerald-500 border-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                <div className="flex flex-col items-start">
                   <span className="leading-none">{t('plan.weeks')} {week.weekNumber}</span>
                   {dateRange && <span className={`text-[10px] font-normal leading-none mt-1 opacity-70`}>{dateRange}</span>}
                </div>
                {isWeekComplete && <CheckCircle2 className={`w-3 h-3 ${activeWeek === idx ? 'text-black' : 'text-emerald-500'}`} />}
              </button>
            )})}
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-500" /> {t('plan.weeklySchedule')}
            </h3>
            
            {currentWeekPlan.schedule.map((day, dayIdx) => {
              const dayKey = `w${activeWeek}-d${dayIdx}`;
              const isRestDay = day.exercises.length === 0 || day.focus.toLowerCase().includes('rest');
              const isExpanded = expandedDay === dayKey;
              const isCompleted = completedDays.includes(dayKey);
              
              const dayExerciseIds = day.exercises.map((_, exIdx) => `${dayKey}-ex${exIdx}`);
              const dayCompletedExCount = dayExerciseIds.filter(id => completedExercises.includes(id)).length;
              const dayProgress = day.exercises.length > 0 ? (dayCompletedExCount / day.exercises.length) * 100 : 0;
              
              const calendarDate = getDayDate(activeWeek, dayIdx);
              const isToday = calendarDate && new Date().toDateString() === calendarDate.toDateString();
              const isPast = calendarDate && calendarDate < new Date() && !isToday;

              return (
                <div 
                  key={dayKey}
                  className={`border rounded-xl overflow-hidden transition-all duration-300 ${
                    isRestDay 
                      ? 'bg-zinc-900/30 border-zinc-800/30 opacity-60' 
                      : isCompleted
                        ? 'bg-emerald-950/20 border-emerald-900/50' 
                        : isToday 
                           ? 'bg-zinc-900 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                           : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div 
                    onClick={() => !isRestDay && toggleDay(dayKey)}
                    className={`p-5 flex items-center justify-between cursor-pointer select-none ${isRestDay ? 'cursor-default' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold border relative transition-all ${
                        isRestDay 
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-500' 
                          : isCompleted 
                            ? 'bg-emerald-500 border-emerald-500 text-black' 
                            : isToday
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                      }`}>
                        {calendarDate && (
                           <>
                              <span className="text-[10px] uppercase tracking-wider opacity-80">
                                {language === 'vi' 
                                  ? ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][calendarDate.getDay()] 
                                  : day.dayName.substring(0, 3)
                                }
                              </span>
                              <span className="text-xl leading-none">{calendarDate.getDate()}</span>
                           </>
                        )}
                      </div>
                      
                      <div>
                        <h4 className={`font-semibold flex items-center gap-2 ${isRestDay ? 'text-zinc-500' : isCompleted ? 'text-emerald-400' : isToday ? 'text-white' : 'text-zinc-300'}`}>
                          {day.dayName}
                          {isCompleted && <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">{t('plan.completed')}</span>}
                          {isToday && !isCompleted && !isRestDay && <span className="text-xs px-2 py-0.5 rounded bg-emerald-500 text-black font-bold">{t('plan.today')}</span>}
                        </h4>
                        <p className="text-sm text-zinc-400">{day.focus}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                       {!isRestDay && (
                          <div className="flex items-center gap-3">
                             <div className="text-right hidden sm:block mr-2">
                                <span className="text-xs text-zinc-500 block">{t('plan.estTime')}</span>
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
                              {dayCompletedExCount} / {day.exercises.length} {t('plan.exercisesDone')}
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
                          
                          const isDragging = draggedItem?.weekIdx === activeWeek && draggedItem?.dayIdx === dayIdx && draggedItem?.exIdx === exIdx;

                          return (
                            <div 
                              key={exIdx} 
                              draggable={!isExerciseComplete}
                              onDragStart={(e) => handleDragStart(e, activeWeek, dayIdx, exIdx)}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, activeWeek, dayIdx, exIdx)}
                              className={`bg-zinc-950/50 rounded-lg border transition-all duration-300 overflow-hidden ${
                                isExerciseComplete 
                                  ? 'border-emerald-900/40 bg-emerald-950/5 opacity-75' 
                                  : 'border-zinc-800/50'
                              } ${isDragging ? 'opacity-30 border-dashed border-emerald-500 scale-[0.98]' : ''}`}
                            >
                              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex-1 flex items-start gap-3">
                                  {/* Drag Handle */}
                                  {!isExerciseComplete && (
                                    <div className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 mt-1.5">
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                  )}

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
                                            onClick={() => toggleExerciseDetails(uniqueKey, ex.name)}
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
                                          <Timer className="w-3 h-3" /> {t('plan.rest')}
                                        </button>
                                      )}

                                      <button 
                                        onClick={() => toggleExerciseDetails(uniqueKey, ex.name)}
                                        className={`text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
                                          isVisualExpanded 
                                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                                          : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
                                        }`}
                                      >
                                        {isVisualExpanded ? <Eye className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                                        {isVisualExpanded ? t('plan.hide') : t('plan.details')}
                                      </button>

                                      {!isExerciseComplete && (
                                         <button 
                                            onClick={() => initiateSwap(activeWeek, dayIdx, exIdx, ex.name)}
                                            className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-purple-400 hover:border-purple-500 transition-all"
                                            title="Swap Exercise"
                                         >
                                            <Shuffle className="w-3 h-3" /> {t('plan.swap')}
                                         </button>
                                      )}

                                      {(ex.videoUrl || ex.name) && !isExerciseComplete && (
                                        <a 
                                          href={ex.videoUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' exercise tutorial')}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-blue-400 hover:border-blue-500 transition-all"
                                        >
                                          <Video className="w-3 h-3" /> {t('plan.video')}
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className={`flex items-center gap-4 ml-10 sm:ml-0 text-sm p-2 rounded-lg border transition-all duration-300 ${
                                  isExerciseComplete 
                                    ? 'bg-emerald-950/20 border-emerald-900/20' 
                                    : 'bg-zinc-900/50 border-zinc-800/50'
                                }`}>
                                  <div className="text-center px-2 shrink-0">
                                    <span className="block text-zinc-500 text-[10px] uppercase tracking-wider">{t('plan.sets')}</span>
                                    <span className="text-white font-mono font-medium">{ex.sets}</span>
                                  </div>
                                  <div className="w-px h-8 bg-zinc-800"></div>
                                  <div className="text-center px-2 shrink-0">
                                    <span className="block text-zinc-500 text-[10px] uppercase tracking-wider">{t('plan.reps')}</span>
                                    <span className="text-white font-mono font-medium">{ex.reps}</span>
                                  </div>
                                </div>
                              </div>

                              {isVisualExpanded && (
                                <div className="border-t border-zinc-800/50 bg-black/20 p-4 animate-fadeIn">
                                  <div className="flex flex-col md:flex-row gap-6">
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t('plan.formInstructions')}</h5>
                                        {!visualUrl && !isLoadingVisual && (
                                           <button 
                                              onClick={() => handleGenerateVisual(ex.name)}
                                              className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                                           >
                                              <RefreshCw className="w-2.5 h-2.5" /> Regenerate
                                           </button>
                                        )}
                                      </div>
                                      <p className="text-sm text-zinc-300 leading-relaxed mb-4">
                                        {ex.instructions || "Maintain proper alignment and control throughout the movement."}
                                      </p>
                                      
                                      {ex.notes && (
                                        <div className="bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/50">
                                          <span className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">{t('plan.coachNotes')}</span>
                                          <p className="text-xs text-zinc-400">{ex.notes}</p>
                                        </div>
                                      )}
                                    </div>
                                    <div className="w-full md:w-48 aspect-square bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800 overflow-hidden relative group shrink-0">
                                      {isLoadingVisual ? (
                                        <div className="flex flex-col items-center gap-2">
                                          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                                          <span className="text-[10px] text-zinc-500">{t('plan.aiRendering')}</span>
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
                                          <p className="text-[10px] text-zinc-600 mb-3">{t('plan.noVisual')}</p>
                                          <button 
                                            onClick={() => handleGenerateVisual(ex.name)}
                                            className="text-[10px] w-full py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-1"
                                          >
                                            <RefreshCw className="w-3 h-3" /> Retry
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
            onLogWorkout={onLogWorkout}
          />
          
           <button 
                onClick={onReset}
                className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm transition-all border border-zinc-700 hover:border-zinc-600"
             >
                <RefreshCw className="w-4 h-4" /> {t('plan.resetPlan')}
             </button>
        </div>
      </div>

      {/* Completion Input Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-md w-full shadow-2xl scale-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" /> {t('plan.workoutComplete')}
              </h3>
              <button 
                onClick={() => setShowCompletionModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <p className="text-zinc-400 text-sm">{t('plan.logPrompt')}</p>
              
              <div className="bg-black/40 p-3 rounded-xl border border-zinc-800">
                 <label className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                    <Scale className="w-3 h-3" /> {t('plan.logWeight')}
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
                    <MessageSquare className="w-3 h-3" /> {t('plan.logNotes')}
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
              <button onClick={() => confirmCompletion(false)} className="px-4 py-3 rounded-xl border border-zinc-700 text-zinc-300 font-medium text-sm">{t('common.cancel')}</button>
              <button onClick={() => confirmCompletion(true)} className="px-4 py-3 rounded-xl bg-emerald-500 text-black font-bold text-sm flex items-center justify-center gap-2">{t('plan.logFinish')} <ArrowRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}

      {/* Swap Modal */}
      {isSwapping && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-950 rounded-t-2xl z-10">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                           <Shuffle className="w-5 h-5 text-purple-400" /> {t('plan.swapTitle')}
                        </h3>
                        <p className="text-zinc-400 text-xs mt-1">{t('plan.swapSubtitle')}</p>
                    </div>
                    <button 
                       onClick={() => setIsSwapping(false)}
                       className="p-2 hover:bg-zinc-900 rounded-full transition-colors text-zinc-500 hover:text-white"
                    >
                       <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {swapCandidates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-4" />
                            <p className="text-zinc-400 text-sm">{t('plan.findingAlt')}</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {swapCandidates.map((candidate, idx) => (
                                <div key={idx} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-purple-500/50 transition-all group">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-white text-lg">{candidate.name}</h4>
                                        <button 
                                            onClick={() => confirmSwap(candidate)}
                                            className="px-3 py-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-sm font-medium hover:bg-purple-500 hover:text-white transition-all"
                                        >
                                            {t('plan.select')}
                                        </button>
                                    </div>
                                    <p className="text-zinc-400 text-sm mb-3">{candidate.notes}</p>
                                    
                                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                        <div className="bg-black/30 p-2 rounded border border-zinc-800/50">
                                            <span className="text-zinc-500 block mb-0.5">{t('plan.sets')}/{t('plan.reps')}</span>
                                            <span className="text-zinc-200 font-mono">{candidate.sets} x {candidate.reps}</span>
                                        </div>
                                        <div className="bg-black/30 p-2 rounded border border-zinc-800/50">
                                            <span className="text-zinc-500 block mb-0.5">{t('plan.rest')}</span>
                                            <span className="text-zinc-200 font-mono">{candidate.rest}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2 bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/30">
                                        <Info className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                                        <p className="text-xs text-zinc-400">{candidate.instructions}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Workout Summary Overlay */}
      {workoutSummary && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 relative">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-emerald-500/20 to-transparent pointer-events-none" />
            
            <div className="p-8 relative z-10 text-center">
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                <Trophy className="w-10 h-10 text-black fill-black" />
              </div>
              
              <h2 className="text-3xl font-extrabold text-white mb-2">{t('plan.workoutCrushed')}</h2>
              <p className="text-zinc-400 mb-8">{t('plan.gettingStronger')}</p>
              
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 mb-6 text-left">
                 <h3 className="font-bold text-white text-lg mb-1">{workoutSummary.dayName}</h3>
                 <p className="text-zinc-500 text-sm mb-4 uppercase tracking-wider font-semibold">{workoutSummary.focus}</p>
                 
                 <div className="grid grid-cols-3 gap-2">
                    <div className="bg-black/40 rounded-lg p-3 border border-zinc-800/50">
                       <Clock className="w-4 h-4 text-emerald-500 mb-2" />
                       <div className="text-lg font-bold text-white leading-none">{workoutSummary.duration}</div>
                       <div className="text-[10px] text-zinc-500 mt-1">{t('plan.duration')}</div>
                    </div>
                    <div className="bg-black/40 rounded-lg p-3 border border-zinc-800/50">
                       <Dumbbell className="w-4 h-4 text-blue-500 mb-2" />
                       <div className="text-lg font-bold text-white leading-none">{workoutSummary.exercisesCount}</div>
                       <div className="text-[10px] text-zinc-500 mt-1">{t('plan.exercisesDone')}</div>
                    </div>
                    <div className="bg-black/40 rounded-lg p-3 border border-zinc-800/50">
                       <Scale className="w-4 h-4 text-orange-500 mb-2" />
                       <div className="text-lg font-bold text-white leading-none">
                         {workoutSummary.weightLogged ? workoutSummary.weightLogged : '--'}
                       </div>
                       <div className="text-[10px] text-zinc-500 mt-1">Kg</div>
                    </div>
                 </div>
              </div>

              {workoutSummary.notes && (
                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 mb-8 text-left">
                   <div className="flex items-center gap-2 text-zinc-500 mb-2 text-xs uppercase font-bold tracking-wider">
                      <MessageSquare className="w-3 h-3" /> {t('plan.coachNotes')} Log
                   </div>
                   <p className="text-zinc-300 text-sm italic">"{workoutSummary.notes}"</p>
                </div>
              )}

              <button 
                onClick={() => setWorkoutSummary(null)}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-lg rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
              >
                {t('plan.backDashboard')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Toast */}
      {showCopiedToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-white px-4 py-2 rounded-lg shadow-xl border border-zinc-700 flex items-center gap-2 z-[70] animate-in fade-in slide-in-from-bottom-4">
            <Check className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium">{t('plan.copied')}</span>
        </div>
      )}
    </div>
  );
};

export default PlanDisplay;
