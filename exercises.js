// One-time seed for the taxonomy jsonbin, used only if that bin is still empty.
// After the first run, the real taxonomy lives in jsonbin and is edited in-app.
const DEFAULT_EXERCISES = {
  Chest: ["Bench Press", "Incline Bench Press", "Dumbbell Fly", "Push-Up", "Cable Crossover", "Dips"],
  Back: ["Deadlift", "Pull-Up", "Lat Pulldown", "Barbell Row", "Seated Cable Row", "T-Bar Row"],
  Shoulders: ["Overhead Press", "Lateral Raise", "Front Raise", "Rear Delt Fly", "Arnold Press"],
  Legs: ["Squat", "Leg Press", "Lunges", "Leg Curl", "Leg Extension", "Calf Raise", "Romanian Deadlift"],
  Arms: ["Barbell Curl", "Dumbbell Curl", "Hammer Curl", "Tricep Pushdown", "Skull Crusher", "Close-Grip Bench Press"],
  Core: ["Plank", "Crunch", "Hanging Leg Raise", "Russian Twist", "Cable Crunch"],
};
