
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, WorkoutCurriculum } from "../types";

// Helper function to validate environment variable
const getApiKey = (): string => {
  const key = process.env.API_KEY;
  if (!key) {
    console.error("API_KEY is missing from environment variables.");
    throw new Error("API Key not found. Please check your configuration.");
  }
  return key;
};

export const generateWorkoutPlan = async (profile: UserProfile): Promise<WorkoutCurriculum> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

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
                        dayName: { type: Type.STRING, description: "Must be Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, or Sunday" },
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

export const generateExerciseVisualization = async (exerciseName: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{
          text: `Generate a minimalist, high-contrast white-line vector art illustration on a solid black background showing the exercise: "${exerciseName}". The style should be simple, clean, and instructional.`
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
