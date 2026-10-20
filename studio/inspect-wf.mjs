import fs from "node:fs";
const api = JSON.parse(fs.readFileSync("../presets/orbit/workflow_api.json", "utf8"));
const k = Object.keys(api);
console.log("colon keys:", k.filter((x) => x.includes(":")).slice(0, 10));
console.log("total:", k.length);
console.log("398:376:", JSON.stringify(api["398:376"])?.slice(0, 200));
console.log("meta keys:", k.slice(0, 6));
