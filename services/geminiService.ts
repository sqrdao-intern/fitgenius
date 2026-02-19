import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, WorkoutCurriculum, Exercise } from "../types";

// Helper function to validate environment variable
const getApiKey = (): string => {
  const key = process.env.API_KEY;
  if (!key) {
    console.error("API_KEY is missing from environment variables.");
    throw new Error("API Key not found. Please check your configuration.");
  }
  return key;
};

export const generateWorkoutPlan = async (profile: UserProfile, language: 'en' | 'vi' = 'en'): Promise<WorkoutCurriculum> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  const languageName = language === 'vi' ? 'Vietnamese' : 'English';

  const prompt = `
    Act as a world-class certified personal trainer and strength coach.
    Create a 4-week home workout curriculum for a user with the following profile:
    
    - Age: ${profile.age}
    - Gender: ${profile.gender}
    - Height: ${profile.height} cm
    - Weight: ${profile.weight} kg
    - Primary Goal: ${profile.goal}
    - Experience Level: ${profile.level}
    - Available Equipment: ${profile.equipment.join(', ')}
    - Commitment: ${profile.daysPerWeek} days per week
    - Time per session: ${profile.durationPerSession} minutes
    - Physical Limitations/Injuries: ${profile.injuries || "None"}

    IMPORTANT: Generate the response content strictly in ${languageName} language.
    This includes the program name, description, week focus, day names (e.g. "Thứ Hai" for Vietnamese), exercise instructions, and nutrition tips.
    
    The plan should be progressive, meaning it gets slightly harder or changes focus over the 4 weeks.
    
    CRITICAL SCHEDULING RULE:
    Each week MUST have exactly 7 days, starting with Monday and ending with Sunday.
    You must assign workouts to specific days based on the user's commitment level (e.g. if 3 days/week, pick Mon/Wed/Fri or similar).
    Mark non-workout days as "Rest" or "Active Recovery".
    
    Include 3-5 concise nutrition tips specific to their goal.
    For each exercise, provide a concise "instructions" field (max 30 words) describing the main form cue and execution.
    Optionally provide a "videoUrl" if you can suggest a specific tutorial link (like a YouTube search link for that exercise).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            programName: { type: Type.STRING },
            description: { type: Type.STRING },
            nutritionTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            weeks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  weekNumber: { type: Type.INTEGER },
                  focus: { type: Type.STRING, description: "Main goal of this week (e.g. Hypertrophy, Stability)" },
                  schedule: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        dayName: { type: Type.STRING, description: "Must be Monday, Tuesday... or equivalent in requested language" },
                        focus: { type: Type.STRING, description: "e.g. Legs & Core or Rest" },
                        estimatedDuration: { type: Type.STRING },
                        exercises: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              name: { type: Type.STRING },
                              sets: { type: Type.STRING },
                              reps: { type: Type.STRING },
                              rest: { type: Type.STRING },
                              notes: { type: Type.STRING },
                              instructions: { type: Type.STRING, description: "Execution cue (max 30 words)" },
                              videoUrl: { type: Type.STRING, description: "Optional URL for video demonstration" }
                            },
                            required: ["name", "sets", "reps", "rest", "instructions"]
                          }
                        }
                      },
                      required: ["dayName", "focus", "exercises"]
                    }
                  }
                },
                required: ["weekNumber", "focus", "schedule"]
              }
            }
          },
          required: ["programName", "weeks", "nutritionTips", "description"]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text) as WorkoutCurriculum;
      return data;
    } else {
      throw new Error("No content generated.");
    }
  } catch (error) {
    console.error("Error generating workout plan:", error);
    throw error;
  }
};

export const getExerciseAlternatives = async (originalExerciseName: string, equipment: string[], language: 'en' | 'vi' = 'en'): Promise<Exercise[]> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const languageName = language === 'vi' ? 'Vietnamese' : 'English';

  const prompt = `
    The user wants to swap out the exercise "${originalExerciseName}".
    Suggest 3 alternative exercises that target the same primary muscle groups and movement patterns.
    The user has access to the following equipment: ${equipment.length > 0 ? equipment.join(', ') : 'Bodyweight Only'}.
    
    IMPORTANT: Provide the response in ${languageName} language.

    Provide specific sets, reps, and rest periods appropriate for general fitness/hypertrophy.
    Keep instructions concise (max 30 words).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              sets: { type: Type.STRING },
              reps: { type: Type.STRING },
              rest: { type: Type.STRING },
              notes: { type: Type.STRING, description: "Why is this a good alternative?" },
              instructions: { type: Type.STRING },
              videoUrl: { type: Type.STRING }
            },
            required: ["name", "sets", "reps", "rest", "instructions"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as Exercise[];
    }
    return [];
  } catch (error) {
    console.error("Error generating alternatives:", error);
    return [];
  }
};

export const generateExerciseVisualization = async (exerciseName: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{
          text: `Create a high-quality, minimalist vector art illustration of the exercise "${exerciseName}". 
          The style must be:
          - White lines on a solid black background (#000000).
          - Flat design, no shading, no gradients.
          - Instructional: clearly show the body mechanics and form.
          - Aspect ratio 1:1.
          - Do not include any text inside the image.`
        }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      }
    });

    // Extract image part
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
           return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (e) {
    console.error("Failed to generate exercise image", e);
    return null;
  }
};

export const analyzeWorkoutImage = async (base64Image: string, language: 'en' | 'vi' = 'en'): Promise<{
  activityType: string;
  duration: string;
  calories: number;
  summary: string;
}> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const languageName = language === 'vi' ? 'Vietnamese' : 'English';

  // Note: Using gemini-2.5-flash-image which supports multimodal input but does not support responseSchema
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: `Analyze this image of a workout summary (e.g. from Strava, Garmin, Apple Health). 
            Extract the following details and return them in a strict JSON format (do not include markdown code blocks).
            
            IMPORTANT: Return the "summary" and "activityType" values in ${languageName}.

            {
              "activityType": "The type of activity (e.g. Running, Pickleball, Yoga)",
              "duration": "Duration in a readable format (e.g. 45 mins, 1h 20m)",
              "calories": 0 (Integer estimate of calories burned, or 0 if not found),
              "summary": "A short 1-sentence summary of the performance (e.g. 'Great pace on your 5k run' or 'Solid 1 hour pickleball session')"
            }`
          }
        ]
      }
    });

    const text = response.text || "";
    // Clean markdown code blocks if present
    const cleanJson = text.replace(/```json|```/g, '').trim();
    
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Failed to analyze workout image", e);
    throw new Error("Could not analyze image. Please fill details manually.");
  }
};
