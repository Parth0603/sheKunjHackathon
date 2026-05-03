import { connectDB } from "../src/lib/mongodb";
import UserPerformance from "../src/models/UserPerformance";

async function run() {
  await connectDB();
  const result = await UserPerformance.updateMany(
    { type: { $exists: false } },
    { $set: { type: "quiz" } }
  );
  console.log(`Matched: ${result.matchedCount}, Updated: ${result.modifiedCount}`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
