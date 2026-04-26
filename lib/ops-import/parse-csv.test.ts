import assert from "node:assert/strict";
import test from "node:test";

import { parseWineCsv } from "@/lib/ops-import/parse-csv";

test("parseWineCsv maps aliases and keeps rows editable", () => {
  const rows = parseWineCsv(
    [
      "wine_name,winery,region,country,vintage,tasting_notes,price_band",
      "Estate Reserve,Silver Hills,Napa Valley,USA,2020,\"Blackberry, cedar\",$40-$60",
    ].join("\n"),
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "Estate Reserve");
  assert.equal(rows[0].producer, "Silver Hills");
  assert.equal(rows[0].region, "Napa Valley");
  assert.equal(rows[0].status, "valid");
});

test("parseWineCsv marks missing wine name as invalid row", () => {
  const rows = parseWineCsv(
    ["name,producer,region", ",Silver Hills,Napa Valley"].join("\n"),
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "invalid");
  assert.ok(rows[0].errors.length > 0);
});
