// Storage driver dispatcher — see lib/applications.js for how the driver is chosen.
import * as fsDriver from "@/lib/store/contacts.fs";
import * as dbDriver from "@/lib/store/contacts.db";

function driver() {
  const explicit = process.env.STORAGE_DRIVER;
  if (explicit === "db") return dbDriver;
  if (explicit === "fs") return fsDriver;
  return process.env.DATABASE_URL ? dbDriver : fsDriver;
}

export { CONTACT_RELATIONSHIPS } from "@/lib/contactsShared";

export const listContacts = (...a) => driver().listContacts(...a);
export const createContact = (...a) => driver().createContact(...a);
export const updateContact = (...a) => driver().updateContact(...a);
export const deleteContact = (...a) => driver().deleteContact(...a);
