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
import { Scale, Plus, X, Save, TrendingUp, History, Dumbbell, Clock, MessageSquare } from 'lucide-react';
import { ProgressEntry, WorkoutLog } from '../types';

interface ProgressTrackerProps {
  entries: ProgressEntry[];
  onAddEntry: (entry: ProgressEntry) => void;
  completedWorkoutCount: number;
  workoutLogs: WorkoutLog[];
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ entries, onAddEntry, completedWorkoutCount, workoutLogs }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'history'>('stats');
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (weight && date) {
      onAddEntry({
        date,
        weight: parseFloat(weight)
      });
      setWeight('');
      setShowAdd(false);
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
          <button 
             onClick={() => setShowAdd(!showAdd)}
             className={`p-2 rounded-lg border transition-all ${
                showAdd 
                   ? 'bg-zinc-800 border-zinc-700 text-zinc-400' 
                   : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20'
             }`}
          >
             {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
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

       {/* Add Entry Form */}
       {showAdd && (
          <form onSubmit={handleSubmit} className="mb-6 bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50 animate-fadeIn shrink-0">
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

       {/* Main Content Areas */}
       <div className="flex-1 overflow-hidden">
         {activeTab === 'stats' ? (
           <div className="space-y-6 h-full flex flex-col">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 shrink-0">
                 <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <p className="text-xs text-zinc-500 mb-1">Total Workouts</p>
                    <p className="text-xl font-bold text-white">{completedWorkoutCount}</p>
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
                             <div className="p-1.5 bg-emerald-500/10 rounded text-emerald-500">
                                <Dumbbell className="w-3.5 h-3.5" />
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
                       
                       <div className="flex items-center gap-3 text-xs text-zinc-400 mb-2">
                          <div className="flex items-center gap-1">
                             <Clock className="w-3 h-3 text-zinc-600" />
                             {log.duration}
                          </div>
                       </div>

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