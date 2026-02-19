import React, { useState, useEffect } from 'react';
import { UserProfile, Gender, Goal, ExperienceLevel, Equipment } from '../types';
import { ChevronRight, ChevronLeft, Activity, Target, Dumbbell, Calendar } from 'lucide-react';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
  isLoading: boolean;
  initialProfile?: UserProfile;
}

const steps = [
  { id: 1, title: 'Biometrics', icon: Activity },
  { id: 2, title: 'Goals & Level', icon: Target },
  { id: 3, title: 'Equipment', icon: Dumbbell },
  { id: 4, title: 'Schedule', icon: Calendar },
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, isLoading, initialProfile }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState<UserProfile>({
    age: 25,
    height: 170,
    weight: 70,
    gender: Gender.Male,
    goal: Goal.GeneralFitness,
    level: ExperienceLevel.Intermediate,
    equipment: [Equipment.None],
    daysPerWeek: 3,
    durationPerSession: 45,
    injuries: ''
  });

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
    }
  }, [initialProfile]);

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete(profile);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const updateProfile = (key: keyof UserProfile, value: any) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const toggleEquipment = (item: Equipment) => {
    setProfile(prev => {
      const current = prev.equipment;
      if (item === Equipment.None) {
        return { ...prev, equipment: [Equipment.None] };
      }
      
      const isSelected = current.includes(item);
      let nextEquipment: Equipment[];
      
      if (isSelected) {
        nextEquipment = current.filter(i => i !== item);
        if (nextEquipment.length === 0) nextEquipment = [Equipment.None];
      } else {
        nextEquipment = [...current.filter(i => i !== Equipment.None), item];
      }
      
      return { ...prev, equipment: nextEquipment };
    });
  };

  return (
    <div className="max-w-2xl mx-auto w-full bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-950 p-6 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">
            {initialProfile ? 'Update Your Plan' : 'Create Your Plan'}
          </h2>
          <span className="text-zinc-400 text-sm">Step {currentStep} of {steps.length}</span>
        </div>
        <div className="flex gap-2">
          {steps.map(step => (
            <div 
              key={step.id} 
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${step.id <= currentStep ? 'bg-emerald-500' : 'bg-zinc-800'}`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-8 min-h-[450px]">
        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" /> About You
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Age</label>
                <input 
                  type="number" 
                  value={profile.age} 
                  onChange={(e) => updateProfile('age', parseInt(e.target.value) || '')}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Gender</label>
                <select 
                  value={profile.gender}
                  onChange={(e) => updateProfile('gender', e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                >
                  {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Height (cm)</label>
                <input 
                  type="number" 
                  value={profile.height} 
                  onChange={(e) => updateProfile('height', parseInt(e.target.value) || '')}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Weight (kg)</label>
                <input 
                  type="number" 
                  value={profile.weight} 
                  onChange={(e) => updateProfile('weight', parseInt(e.target.value) || '')}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
            <div>
               <label className="block text-sm font-medium text-zinc-400 mb-1">Injuries / Limitations (Optional)</label>
               <input 
                  type="text" 
                  placeholder="e.g. Bad knees, lower back pain"
                  value={profile.injuries || ''} 
                  onChange={(e) => updateProfile('injuries', e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" /> Goals & Experience
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-3">Primary Goal</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.values(Goal).map(goal => (
                  <button
                    key={goal}
                    onClick={() => updateProfile('goal', goal)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      profile.goal === goal 
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-3">Experience Level</label>
              <div className="flex gap-3">
                {Object.values(ExperienceLevel).map(level => (
                  <button
                    key={level}
                    onClick={() => updateProfile('level', level)}
                    className={`flex-1 p-3 rounded-lg border text-center text-sm font-medium transition-all ${
                      profile.level === level 
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-750'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2">
              <Dumbbell className="w-5 h-5" /> Available Equipment
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.values(Equipment).map(eq => (
                <div 
                  key={eq}
                  onClick={() => toggleEquipment(eq)}
                  className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                    profile.equipment.includes(eq)
                    ? 'bg-emerald-500/10 border-emerald-500' 
                    : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-750'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 shrink-0 ${
                     profile.equipment.includes(eq) ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-500'
                  }`}>
                    {profile.equipment.includes(eq) && <div className="w-1.5 h-1.5 bg-black rounded-sm" />}
                  </div>
                  <span className={`text-sm ${profile.equipment.includes(eq) ? 'text-white font-medium' : 'text-zinc-400'}`}>
                    {eq}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Commitment
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Days Per Week: <span className="text-white text-lg ml-2">{profile.daysPerWeek}</span></label>
              <input 
                type="range" 
                min="1" 
                max="7" 
                value={profile.daysPerWeek}
                onChange={(e) => updateProfile('daysPerWeek', parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-zinc-500 mt-2">
                <span>1 Day</span>
                <span>7 Days</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Duration (Minutes): <span className="text-white text-lg ml-2">{profile.durationPerSession}</span></label>
              <input 
                type="range" 
                min="15" 
                max="120" 
                step="15"
                value={profile.durationPerSession}
                onChange={(e) => updateProfile('durationPerSession', parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-zinc-500 mt-2">
                <span>15 min</span>
                <span>120 min</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-zinc-800 flex justify-between bg-zinc-950">
        <button 
          onClick={handleBack}
          disabled={currentStep === 1 || isLoading}
          className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
            currentStep === 1 
            ? 'opacity-0 pointer-events-none' 
            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        
        <button 
          onClick={handleNext}
          disabled={isLoading}
          className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.4)]"
        >
          {isLoading ? (
            'Generating...'
          ) : (
            <>
              {currentStep === steps.length ? 'Generate Plan' : 'Next Step'} 
              {!isLoading && currentStep !== steps.length && <ChevronRight className="w-4 h-4" />}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;