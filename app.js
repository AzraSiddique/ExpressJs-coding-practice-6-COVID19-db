const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json());

let db = null;

const dbPath = path.join(__dirname, "covid19India.db");

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log(`The server is running on http://localhost/3000`);
    });
  } catch (e) {
    console.log(`DB Error is ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertToResponse = (object) => {
  return {
    stateId: object.state_id,
    stateName: object.state_name,
    population: object.population,
    districtId: object.district_id,
    districtName: object.district_name,
    cases: object.cases,
    cured: object.cured,
    active: object.active,
    deaths: object.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const getStateQuery = `
    SELECT *
    FROM state
    ORDER BY state_id`;

  const dbResponse = await db.all(getStateQuery);
  response.send(dbResponse.map((item) => convertToResponse(item)));
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT *
    FROM state
    WHERE state_id=${stateId};`;
  const dbResponse = await db.get(getStateQuery);
  response.send(convertToResponse(dbResponse));
});

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;

  const createDistrictQuery = `
  INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
  VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths})`;

  const dbResponse = await db.run(createDistrictQuery);
  const districtId = dbResponse.lastId;
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
  SELECT *
  FROM district
  WHERE district_id=${districtId};`;
  const dbResponse = await db.get(getDistrictQuery);
  response.send(convertToResponse(dbResponse));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const removeDistrictQuery = `
  DELETE FROM district
  WHERE district_id=${districtId};
  `;
  const dbResponse = await db.run(removeDistrictQuery);
  response.send("District Removed");
});

app.get("/districts/", async (request, response) => {
  const getDistrictQuery = `
  SELECT *
  FROM district
  ORDER BY district_id;`;
  const dbResponse = await db.all(getDistrictQuery);
  response.send(dbResponse.map((district) => convertToResponse(district)));
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;

  const updateDistrictQuery = `
    UPDATE district
    SET 
    district_name='${districtName}',
    state_id=${stateId},
    cases=${cases},
    cured=${cured},
    active=${active},
    deaths=${deaths}
    WHERE district_id=${districtId};
    `;
  const dbResponse = await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getSumQuery = `
    SELECT SUM(cases) AS totalCases,
    SUM(cured) AS totalCured,
    SUM(active) AS totalActive,
    SUM(deaths) AS totalDeaths
    FROM district
    WHERE state_id=${stateId};`;

  const dbResponse = await db.get(getSumQuery);
  response.send(dbResponse);
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateNameQuery = `
  SELECT state_name AS stateName
  FROM state 
  WHERE state_id=(SELECT state_id 
    FROM district 
    WHERE district_id=${districtId});`;

  const dbResponse = await db.get(stateNameQuery);
  response.send(dbResponse);
});

module.exports = app;
