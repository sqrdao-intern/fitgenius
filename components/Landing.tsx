
import React from 'react';
import { ArrowRight, Brain, Activity, Zap, ShieldCheck, PlayCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LandingProps {
  onStart: () => void;
}

const Landing: React.FC<LandingProps> = ({ onStart }) => {
  const { t } = useLanguage();
  
  return (
    <div className="flex flex-col items-center justify-center py-8 md:py-20 animate-fadeIn w-full">
      <div className="text-center max-w-4xl mx-auto mb-16 px-4">
         <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/50 border border-zinc-700 text-zinc-300 text-xs font-medium mb-8 backdrop-blur-sm">
            <Brain className="w-3 h-3 text-emerald-500" />
            <span>{t('common.poweredBy')}</span>
         </div>
         
         <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-500">
               {t('landing.tagline')}
            </span>
         </h1>
         
         <p className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('landing.subtitle')}
         </p>
         
         <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
                onClick={onStart}
                className="group w-full sm:w-auto px-8 py-4 bg-white hover:bg-zinc-100 text-black rounded-full font-bold text-lg transition-all flex items-center justify-center gap-2 hover:scale-105"
            >
                {t('landing.buildPlan')}
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
            <button 
               onClick={onStart}
               className="group w-full sm:w-auto px-8 py-4 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white rounded-full font-semibold text-lg transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
            >
               <PlayCircle className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
               {t('landing.getStarted')}
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl px-4">
         {[
            {
               icon: <Activity className="w-6 h-6" />,
               color: "text-emerald-500",
               bg: "bg-emerald-500/10",
               title: t('landing.features.biometric'),
               desc: t('landing.features.biometricDesc')
            },
            {
               icon: <Zap className="w-6 h-6" />,
               color: "text-blue-500",
               bg: "bg-blue-500/10",
               title: t('landing.features.adaptive'),
               desc: t('landing.features.adaptiveDesc')
            },
            {
               icon: <ShieldCheck className="w-6 h-6" />,
               color: "text-purple-500",
               bg: "bg-purple-500/10",
               title: t('landing.features.safety'),
               desc: t('landing.features.safetyDesc')
            }
         ].map((feature, idx) => (
            <div key={idx} className="bg-zinc-900/30 border border-zinc-800/50 p-8 rounded-3xl hover:bg-zinc-900/50 hover:border-zinc-700/50 transition-all duration-300">
                <div className={`w-12 h-12 ${feature.bg} rounded-2xl flex items-center justify-center ${feature.color} mb-6`}>
                   {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-zinc-400 leading-relaxed">
                   {feature.desc}
                </p>
            </div>
         ))}
      </div>
    </div>
  );
};

export default Landing;
