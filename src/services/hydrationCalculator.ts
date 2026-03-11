// This is a simplified simulation of an AI model
// In a real application, this would call a backend API

interface UserData {
  age: number;
  weight: number;
  gender: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'high' | 'extreme';
  city: string;
}

interface Recommendation {
  liters: number;
  temperature: number;
  insight: string;
}

// Simplified calculation based on common hydration formulas
export const calculateHydration = async (userData: UserData): Promise<Recommendation> => {
  // Base water intake (liters) = body weight (kg) * 0.033
  let baseWater = userData.weight * 0.033;
  
  // Adjust for activity level
  const activityMultipliers = {
    sedentary: 1.0,
    light: 1.1,
    moderate: 1.2,
    high: 1.4,
    extreme: 1.6
  };
  
  baseWater *= activityMultipliers[userData.activityLevel];
  
  // Adjust for age
  if (userData.age > 60) {
    baseWater *= 0.95; // Slightly less needed
  } else if (userData.age < 18) {
    baseWater *= 1.1; // Slightly more needed
  }
  
  // Simulate fetching temperature (in a real app, this would call a weather API)
  const temperature = await fetchTemperature(userData.city);
  
  // Adjust for temperature
  if (temperature > 30) {
    baseWater += (temperature - 30) * 0.05; // Add 50ml for each degree above 30
  } else if (temperature < 10) {
    baseWater *= 0.95; // Slightly less needed in cold weather
  }
  
  // Gender adjustment
  if (userData.gender === 'female') {
    baseWater *= 0.95; // Slightly less needed
  }
  
  // Ensure minimum and maximum values
  baseWater = Math.max(1.5, Math.min(5.0, baseWater));
  
  // Generate insight based on conditions
  let insight = "";
  if (temperature > 30) {
    insight = "It's hot today! Drink water every 1-2 hours to stay hydrated.";
  } else if (temperature < 10) {
    insight = "Cold weather can be dehydrating. Make sure to drink water regularly.";
  } else if (userData.activityLevel === 'high' || userData.activityLevel === 'extreme') {
    insight = "With your activity level, drink water every 1-2 hours during exercise.";
  } else {
    insight = "Drink water consistently throughout the day for optimal hydration.";
  }
  
  return {
    liters: parseFloat(baseWater.toFixed(1)),
    temperature,
    insight
  };
};

// Simulate fetching temperature from a weather API
const fetchTemperature = async (_city: string): Promise<number> => {
  // In a real application, this would call an actual weather API
  // For demonstration, we'll return a random temperature between 15-35°C
  return Math.floor(Math.random() * 21) + 15;
};