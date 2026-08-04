// Storage driver dispatcher — see lib/applications.js for how the driver is chosen.
import * as fsDriver from "@/lib/store/achievements.fs";
import * as dbDriver from "@/lib/store/achievements.db";

function driver() {
  const explicit = process.env.STORAGE_DRIVER;
  if (explicit === "db") return dbDriver;
  if (explicit === "fs") return fsDriver;
  return process.env.DATABASE_URL ? dbDriver : fsDriver;
}


export const listAchievements = (...a) => driver().listAchievements(...a);
export const createAchievement = (...a) => driver().createAchievement(...a);
export const updateAchievement = (...a) => driver().updateAchievement(...a);
export const deleteAchievement = (...a) => driver().deleteAchievement(...a);
