
import React, { useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Scale, Plus, X, Save, TrendingUp, History, Dumbbell, Clock, MessageSquare, Image as ImageIcon, Upload, Loader2, Activity, Flame } from 'lucide-react';
import { ProgressEntry, WorkoutLog } from '../types';
import { analyzeWorkoutImage } from '../services/geminiService';

interface ProgressTrackerProps {
  entries: ProgressEntry[];
  onAddEntry: (entry: ProgressEntry) => void;
  completedWorkoutCount: number;
  workoutLogs: WorkoutLog[];
  onLogWorkout?: (log: WorkoutLog) => void;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ entries, onAddEntry, completedWorkoutCount, workoutLogs, onLogWorkout }) => {
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'history'>('stats');
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Activity Log State
  const [activityType, setActivityType] = useState('');
  const [activityDuration, setActivityDuration] = useState('');
  const [activityCalories, setActivityCalories] = useState('');
  const [activityNotes, setActivityNotes] = useState('');
  const [activityImage, setActivityImage] = useState<string | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);

  const handleWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (weight && date) {
      onAddEntry({
        date,
        weight: parseFloat(weight)
      });
      setWeight('');
      setShowAddWeight(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
       setAnalyzingImage(true);
       const reader = new FileReader();
       reader.onloadend = async () => {
         const base64String = reader.result as string;
         // Remove data URL prefix for API
         const base64Data = base64String.split(',')[1];
         setActivityImage(base64String);

         try {
            const analysis = await analyzeWorkoutImage(base64Data);
            setActivityType(analysis.activityType);
            setActivityDuration(analysis.duration);
            setActivityCalories(analysis.calories ? String(analysis.calories) : '');
            setActivityNotes(analysis.summary);
         } catch (err) {
            console.error(err);
            alert("Could not analyze image. Please fill details manually.");
         } finally {
            setAnalyzingImage(false);
         }
       };
       reader.readAsDataURL(file);
    }
  };

  const handleActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLogWorkout && activityType && activityDuration) {
       onLogWorkout({
          id: Math.random().toString(36).substr(2, 9),
          date: date,
          dayName: activityType,
          focus: "Custom Activity",
          duration: activityDuration,
          notes: activityNotes,
          imageUrl: activityImage || undefined,
          calories: activityCalories ? parseInt(activityCalories) : undefined
       });
       
       // Reset form
       setActivityType('');
       setActivityDuration('');
       setActivityCalories('');
       setActivityNotes('');
       setActivityImage(null);
       setShowAddActivity(false);
    }
  };

  const latestWeight = entries.length > 0 ? entries[entries.length - 1].weight : null;
  const startWeight = entries.length > 0 ? entries[0].weight : null;
  const weightChange = latestWeight && startWeight ? (latestWeight - startWeight).toFixed(1) : 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden flex flex-col min-h-[500px]">
       {/* Header */}
       <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
             <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                <TrendingUp className="w-5 h-5" />
             </div>
             <div>
                <h3 className="text-lg font-bold text-white leading-tight">Progress Tracker</h3>
                <p className="text-xs text-zinc-500">Track your fitness journey</p>
             </div>
          </div>
          <div className="flex gap-2">
             <button 
                onClick={() => { setShowAddWeight(true); setShowAddActivity(false); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all text-xs font-medium"
             >
                <Scale className="w-3.5 h-3.5" /> Log Weight
             </button>
             <button 
                onClick={() => { setShowAddActivity(true); setShowAddWeight(false); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-emerald-500/10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-medium"
             >
                <Activity className="w-3.5 h-3.5" /> Log Activity
             </button>
          </div>
       </div>

       {/* Tabs */}
       <div className="flex p-1 bg-black/40 rounded-xl mb-6 border border-zinc-800">
          <button 
             onClick={() => setActiveTab('stats')}
             className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'stats' ? 'bg-zinc-800 text-emerald-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
             <TrendingUp className="w-4 h-4" /> Stats
          </button>
          <button 
             onClick={() => setActiveTab('history')}
             className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-zinc-800 text-emerald-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
             <History className="w-4 h-4" /> History
          </button>
       </div>

       {/* Add Weight Form */}
       {showAddWeight && (
          <form onSubmit={handleWeightSubmit} className="mb-6 bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50 animate-fadeIn shrink-0 relative">
             <button type="button" onClick={() => setShowAddWeight(false)} className="absolute top-2 right-2 text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
             <h4 className="text-sm font-bold text-white mb-3">Log Body Weight</h4>
             <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                   <label className="block text-xs text-zinc-400 mb-1">Date</label>
                   <input 
                      type="date" 
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:border-emerald-500 outline-none"
                   />
                </div>
                <div>
                   <label className="block text-xs text-zinc-400 mb-1">Weight (kg)</label>
                   <input 
                      type="number" 
                      step="0.1"
                      required
                      placeholder="0.0"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:border-emerald-500 outline-none"
                   />
                </div>
             </div>
             <button 
                type="submit" 
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
             >
                <Save className="w-4 h-4" /> Save Entry
             </button>
          </form>
       )}

       {/* Add Activity Form */}
       {showAddActivity && (
          <form onSubmit={handleActivitySubmit} className="mb-6 bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50 animate-fadeIn shrink-0 relative">
             <button type="button" onClick={() => setShowAddActivity(false)} className="absolute top-2 right-2 text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
             <h4 className="text-sm font-bold text-white mb-3">Log External Activity</h4>
             
             {/* Image Upload Area */}
             <div className="mb-4">
               <label className="block w-full border-2 border-dashed border-zinc-700 rounded-xl p-4 text-center cursor-pointer hover:border-emerald-500/50 hover:bg-zinc-800/50 transition-all group">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  {analyzingImage ? (
                     <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                        <span className="text-xs text-zinc-400">Analyzing workout stats...</span>
                     </div>
                  ) : activityImage ? (
                     <div className="relative w-full h-32 rounded-lg overflow-hidden">
                        <img src={activityImage} alt="Preview" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all" />
                        <div className="absolute inset-0 flex items-center justify-center">
                           <span className="bg-black/60 px-2 py-1 rounded text-xs text-white">Change Image</span>
                        </div>
                     </div>
                  ) : (
                     <div className="flex flex-col items-center gap-2">
                        <div className="p-2 bg-zinc-800 rounded-full text-zinc-400 group-hover:text-emerald-400 transition-colors">
                           <Upload className="w-5 h-5" />
                        </div>
                        <span className="text-xs text-zinc-400 group-hover:text-zinc-300">Upload screenshot (Garmin, Strava, etc.)</span>
                     </div>
                  )}
               </label>
             </div>

             <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className="block text-xs text-zinc-400 mb-1">Activity Type</label>
                     <input 
                        type="text" 
                        required
                        placeholder="e.g. Running, Yoga"
                        value={activityType}
                        onChange={(e) => setActivityType(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:border-emerald-500 outline-none"
                     />
                   </div>
                   <div>
                     <label className="block text-xs text-zinc-400 mb-1">Duration</label>
                     <input 
                        type="text" 
                        required
                        placeholder="e.g. 45 mins"
                        value={activityDuration}
                        onChange={(e) => setActivityDuration(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:border-emerald-500 outline-none"
                     />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className="block text-xs text-zinc-400 mb-1">Calories (optional)</label>
                     <input 
                        type="number" 
                        placeholder="e.g. 350"
                        value={activityCalories}
                        onChange={(e) => setActivityCalories(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:border-emerald-500 outline-none"
                     />
                   </div>
                   <div>
                     <label className="block text-xs text-zinc-400 mb-1">Date</label>
                     <input 
                        type="date" 
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:border-emerald-500 outline-none"
                     />
                   </div>
                </div>
                <div>
                   <label className="block text-xs text-zinc-400 mb-1">Notes / Summary</label>
                   <textarea 
                      placeholder="How did it feel?"
                      value={activityNotes}
                      onChange={(e) => setActivityNotes(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:border-emerald-500 outline-none resize-none h-16"
                   />
                </div>
             </div>

             <button 
                type="submit" 
                className="w-full mt-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
             >
                <Save className="w-4 h-4" /> Save Activity
             </button>
          </form>
       )}

       {/* Main Content Areas */}
       <div className="flex-1 overflow-hidden">
         {activeTab === 'stats' ? (
           <div className="space-y-6 h-full flex flex-col">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 shrink-0">
                 <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <p className="text-xs text-zinc-500 mb-1">Total Workouts</p>
                    <p className="text-xl font-bold text-white">{completedWorkoutCount + workoutLogs.filter(l => l.focus === "Custom Activity").length}</p>
                 </div>
                 <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <p className="text-xs text-zinc-500 mb-1">Weight Change</p>
                    <p className={`text-xl font-bold ${Number(weightChange) <= 0 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                       {Number(weightChange) > 0 ? '+' : ''}{weightChange} kg
                    </p>
                 </div>
              </div>

              {/* Chart */}
              <div className="flex-1 min-h-[200px]">
                 {entries.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={entries}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis 
                             dataKey="date" 
                             stroke="#52525b" 
                             tick={{fontSize: 10}} 
                             tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                          />
                          <YAxis 
                             stroke="#52525b" 
                             tick={{fontSize: 10}} 
                             domain={['dataMin - 1', 'dataMax + 1']}
                          />
                          <Tooltip 
                             contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                             labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                             itemStyle={{ color: '#10b981' }}
                          />
                          <Line 
                             type="monotone" 
                             dataKey="weight" 
                             stroke="#10b981" 
                             strokeWidth={2} 
                             dot={{ r: 3, fill: '#10b981' }} 
                             activeDot={{ r: 5, fill: '#34d399' }}
                          />
                       </LineChart>
                    </ResponsiveContainer>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-xl bg-black/20">
                       <Scale className="w-6 h-6 mb-2 opacity-50" />
                       <p>Log at least 2 entries to see chart</p>
                    </div>
                 )}
              </div>
           </div>
         ) : (
           <div className="h-full overflow-y-auto pr-2 no-scrollbar space-y-4">
              {workoutLogs.length > 0 ? (
                 workoutLogs.map((log) => (
                    <div key={log.id} className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 animate-fadeIn">
                       <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                             <div className={`p-1.5 rounded ${log.focus === "Custom Activity" ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                {log.focus === "Custom Activity" ? <Activity className="w-3.5 h-3.5" /> : <Dumbbell className="w-3.5 h-3.5" />}
                             </div>
                             <div>
                                <h4 className="text-sm font-bold text-white leading-tight">{log.dayName}</h4>
                                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{log.focus}</p>
                             </div>
                          </div>
                          <span className="text-[10px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full">
                             {new Date(log.date).toLocaleDateString()}
                          </span>
                       </div>
                       
                       <div className="flex items-center gap-4 text-xs text-zinc-400 mb-2">
                          <div className="flex items-center gap-1">
                             <Clock className="w-3 h-3 text-zinc-600" />
                             {log.duration}
                          </div>
                          {log.calories && (
                             <div className="flex items-center gap-1">
                                <Flame className="w-3 h-3 text-orange-500" />
                                {log.calories} kcal
                             </div>
                          )}
                       </div>

                       {log.imageUrl && (
                          <div className="mt-2 mb-2 rounded-lg overflow-hidden h-24 w-full relative">
                             <img src={log.imageUrl} alt="Workout" className="w-full h-full object-cover opacity-80" />
                             <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-1">
                                <span className="text-[10px] text-zinc-300 ml-1"><ImageIcon className="w-3 h-3 inline mr-1" /> Image Log</span>
                             </div>
                          </div>
                       )}

                       {log.notes && (
                          <div className="flex gap-2 items-start bg-black/40 p-2 rounded-lg border border-zinc-800/50 mt-2">
                             <MessageSquare className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                             <p className="text-xs text-zinc-400 italic">"{log.notes}"</p>
                          </div>
                       )}
                    </div>
                 ))
              ) : (
                 <div className="h-32 flex flex-col items-center justify-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-xl bg-black/20">
                    <History className="w-6 h-6 mb-2 opacity-50" />
                    <p>No workouts logged yet</p>
                 </div>
              )}
           </div>
         )}
       </div>
    </div>
  );
};

export default ProgressTracker;
