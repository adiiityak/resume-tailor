// Registers the "@/" alias resolver, then nothing else. Used via --import.
import { register } from "module";
import { pathToFileURL } from "url";

register("./alias-loader.mjs", pathToFileURL(`${process.cwd()}/scripts/`));
