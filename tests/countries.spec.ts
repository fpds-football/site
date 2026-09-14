import { createRequire } from "node:module";
import { expect, test } from "@playwright/test";
import { COUNTRIES } from "../src/content/countries";

const require = createRequire(import.meta.url);

test("the country pickers offer exactly the country codes in the FPDS schema", () => {
  const schema = require("@fpds-football/fpds/schema/v0.1/player.json");
  const permitted = [...schema.$defs.countryCode.enum].sort();
  const offered = COUNTRIES.map((country) => country.code).sort();
  expect(offered).toEqual(permitted);
});

test("the football nations of the United Kingdom have their own names", () => {
  const names = Object.fromEntries(COUNTRIES.map((country) => [country.code, country.name]));
  expect(names).toMatchObject({ ENG: "England", SCO: "Scotland", WAL: "Wales", NIR: "Northern Ireland", XKX: "Kosovo" });
});
