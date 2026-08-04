// Storage driver dispatcher — see lib/applications.js for how the driver is chosen.
import * as fsDriver from "@/lib/store/reminders.fs";
import * as dbDriver from "@/lib/store/reminders.db";

function driver() {
  const explicit = process.env.STORAGE_DRIVER;
  if (explicit === "db") return dbDriver;
  if (explicit === "fs") return fsDriver;
  return process.env.DATABASE_URL ? dbDriver : fsDriver;
}

export { REMINDER_TYPES, REMINDER_STATUSES } from "@/lib/remindersShared";

export const listReminders = (...a) => driver().listReminders(...a);
export const createReminder = (...a) => driver().createReminder(...a);
export const updateReminder = (...a) => driver().updateReminder(...a);
export const deleteReminder = (...a) => driver().deleteReminder(...a);
