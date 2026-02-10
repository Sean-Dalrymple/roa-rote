  let allAssignments = [];
  let allUnits = [];
  let allTerritories = [];
  let unitMap = new Map();
  let territoryMap = new Map();
  let playerMap = new Map();
  let missingUnitMap = new Map();
  let players = [];
  let playerAlts = [];
  let warDef = [];
  let warCalendar = [];
  let rotePlan = [];

async function initializeApp() {
    await loadData();
    await loadSelectedPage();
}

//      <a href="javascript:loadCountersPage();">Territory War Counters</a>
function reloadMenu() {
  const menuDiv = document.getElementById("id_menuDropdown");
  menuDiv.innerHTML = "";
  setTimeout(() => {
    document.getElementById("id_menuDropdown").innerHTML = `<a href="javascript:loadAssignmentPage();">Platoon Assignments</a>
      <a href="javascript:loadRoTEPage();">RoTE Daily Plan</a>
      <a href="javascript:loadTWCalendarPage();">Territory War Calendar</a>
      <a href="javascript:loadTWPage();">Territory War Def</a>
      <a href="javascript:loadAboutPage();">About</a>
      <a href="javascript:loadSettingsPage();">Settings</a>
      <a href="javascript:loadMissingPlatoonsPage();">Missing Platoons</a>`;
  }, 100);
}

async function loadSelectedPage() {
  if( !localStorage.getItem("selectedPlayer") ) {
    loadSettingsPage();
  } else {
    switch(localStorage.getItem('startPage') || 'loadAssignmentPage') {
      case "loadAssignmentPage":
        loadAssignmentPage();
        break;
      case "loadPlanPage":
        loadRoTEPage();
        break;
      case "loadTWPage":
        loadTWPage();
        break;
      case "loadCountersPage":
        loadCountersPage();
        break;
    }
  }
}

async function loadData() {

    let assignmentVersion = 0;
    if( navigator.onLine ) {
      try {
        const versionResponse = await fetch("data/data_version.json", { cache: "no-store" });
        if (!versionResponse.ok) throw new Error(`HTTP ${versionResponse.status}`);
        const versionJson = await versionResponse.json();
        assignmentVersion = versionJson.version;

      } catch (err) {
        console.error("Failed to load data_version.json:", err);
      }
    }

    const savedVersion = localStorage.getItem("dataVersion");
    

    if ( assignmentVersion != 0 && (!savedVersion || savedVersion != assignmentVersion)) {
console.log("refreshing data");
      const responses = await Promise.all([
        fetch("data/p1_assignments.json", { cache: "no-store" }),
        fetch("data/p2_assignments.json", { cache: "no-store" }),
        fetch("data/p3_assignments.json", { cache: "no-store" }),
        fetch("data/p4_assignments.json", { cache: "no-store" }),
        fetch("data/p5_assignments.json", { cache: "no-store" }),
        fetch("data/p6_assignments.json", { cache: "no-store" }),
        fetch("data/units.json", { cache: "no-store" }),
        fetch("data/territories.json", { cache: "no-store" }),
        fetch("data/players.json", { cache: "no-store" }),
        fetch("data/war_def.json", { cache: "no-store" }),
        fetch("data/rote_plan.json", { cache: "no-store" }),
        fetch("data/war_calendar.json", { cache: "no-store" }),
      ]);

      const jsons = await Promise.all(responses.map((r) => r.json()));

      for (let i = 0; i < 6; i++) {
        jsons[i].platoonAssignments.sort(assignmentOrder);
      }

      allAssignments = jsons.slice(0, 6).map((r) => r.platoonAssignments);
      allUnits = jsons[6].sort((a, b) => a.unitBaseId.localeCompare(b.unitBaseId));
      allTerritories = jsons[7].sort((a, b) => a.zoneId.localeCompare(b.zoneId));
      players = jsons[8];
      warDef = jsons[9];
      rotePlan = jsons[10];
      warCalendar = jsons[11];

      localStorage.setItem("dataVersion", assignmentVersion);
      localStorage.setItem("allAssignments", JSON.stringify(allAssignments));
      localStorage.setItem("allUnits", JSON.stringify(allUnits));
      localStorage.setItem("allTerritories", JSON.stringify(allTerritories));
      localStorage.setItem("players", JSON.stringify(players));
      localStorage.setItem("warDef", JSON.stringify(warDef));
      localStorage.setItem("rotePlan", JSON.stringify(rotePlan));
      localStorage.setItem("warCalendar", JSON.stringify(warCalendar));


      unitMap = new Map(allUnits.map(u => [u.unitBaseId, u]));
      territoryMap = new Map(allTerritories.map(t => [t.zoneId, t]));
    } else {
console.log("reading local data");
      allAssignments = JSON.parse(localStorage.getItem("allAssignments"));
      allUnits = JSON.parse(localStorage.getItem("allUnits"));
      allTerritories = JSON.parse(localStorage.getItem("allTerritories"));
      players = JSON.parse(localStorage.getItem("players"));
      warDef = JSON.parse(localStorage.getItem("warDef"));
      rotePlan = JSON.parse(localStorage.getItem("rotePlan"));
      warCalendar = JSON.parse(localStorage.getItem("warCalendar"));

      unitMap = new Map(allUnits.map(u => [u.unitBaseId, u]));
      territoryMap = new Map(allTerritories.map(t => [t.zoneId, t]));
      playerMap = new Map(players.map(t => [t.allyCode, t]));
    }

    playerAlts = JSON.parse(localStorage.getItem("altAccounts") || "[]");
    //populatePlayerSelect(players);
}

  function assignmentOrder(a, b) {
    const zoneOrder = [-1, 3, 1, 2];

    if (a.allyCode === b.allyCode) {
      if (a.zoneId === b.zoneId) {
        return a.platoonDefinitionId.localeCompare(b.platoonDefinitionId);
      } else {
        const zoneDiff =
          zoneOrder[parseInt(a.zoneId.substring(28, 29))] -
          zoneOrder[parseInt(b.zoneId.substring(28, 29))];
        if (zoneDiff === 0) {
          return a.zoneId.includes("bonus") ? -1 : 1;
        }
        return zoneDiff;
      }
    } else {
      return a.allyCode < b.allyCode ? -1 : 1;
    }
  }

  function findAllyCodeRange(assignmentArray, allyCode) {
    const result = [-1, -1];
    let left = 0;
    let right = assignmentArray.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midCode = assignmentArray[mid].allyCode;

      if (midCode === allyCode) {
        result[0] = mid;
        right = mid - 1;
      } else if (midCode < allyCode) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    if (result[0] === -1) return result;

    left = result[0];
    right = assignmentArray.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midCode = assignmentArray[mid].allyCode;

      if (midCode === allyCode) {
        result[1] = mid;
        left = mid + 1;
      } else if (midCode < allyCode) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return result;
  }

  async function loadAssignments(mainAccount) {

    const now = new Date();
    const utcDay = now.getUTCDay();
    const utcHour = now.getUTCHours();
    const adjustedDay = (utcDay + 6) % 7;
    let index = utcHour < 17 ? (adjustedDay + 6) % 7 : adjustedDay;
    index = index % 6;

    document.getElementById("phaseSelect").value = index;
    filterAssignments(mainAccount);
  }

  function populatePlayerSelect(players) {
    const playerSelect = document.getElementById("playerSelect");
    playerSelect.innerHTML = `<option value=""></option>`;

    players.forEach((player) => {
      const option = document.createElement("option");
      option.value = player.allyCode;
      option.text = player.name;
      playerSelect.appendChild(option);
    });

    const savedPlayer = localStorage.getItem("selectedPlayer");
    if (savedPlayer) {
      playerSelect.value = savedPlayer;
    }
  }


function createZoneRow(zone, colspan) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = colspan;
  cell.textContent = `${zone.zoneColour} - ${zone.zoneName}`;
  cell.className = zone.zoneColour;
  row.appendChild(cell);
  return row;
}

function createPlatoonRow(platoonLabel, rowClass) {
  const row = document.createElement("tr");

  const opCell = document.createElement("td");
  opCell.textContent = platoonLabel;
  opCell.className = `operation-cell ${rowClass}`;

  const unitCell = document.createElement("td");
  unitCell.className = rowClass;

  row.appendChild(opCell);
  row.appendChild(unitCell);

  return { row, unitCell };
}

function filterAssignments(allyCode) {
  const phaseIndex = document.getElementById("phaseSelect").value;
  //const allyCode = localStorage.getItem("selectedPlayer");

  const tbody = document.querySelector(`#assignmentsTable${allyCode} tbody`);
  const [start, end] = findAllyCodeRange(allAssignments[phaseIndex], allyCode);

  const fragment = document.createDocumentFragment();
  const zoneClass = ["Odd", "Even"];
  let lastZoneId = "", lastPlatoonId = "", sectionAlt = 0;
  let unitCell = null;

  if (start !== -1) {
    for (let i = start; i <= end; i++) {
      const assignment = allAssignments[phaseIndex][i];
      const { zoneId, platoonDefinitionId, unitBaseId } = assignment;

      if (zoneId !== lastZoneId) {
        lastZoneId = zoneId;
        lastPlatoonId = "";
        const zone = territoryMap.get(zoneId);
        const zoneRow = createZoneRow(zone, 2);
        fragment.appendChild(zoneRow);
        sectionAlt = 0;
      }

      if (platoonDefinitionId !== lastPlatoonId) {
        lastPlatoonId = platoonDefinitionId;
        sectionAlt = (sectionAlt + 1) % 2;
        const { row, unitCell: newUnitCell } = createPlatoonRow(platoonDefinitionId.slice(-1), zoneClass[sectionAlt]);
        unitCell = newUnitCell;
        fragment.appendChild(row);
      }

      const unit = unitMap.get(unitBaseId);
      const div = document.createElement("div");
      div.innerHTML = `
        <span class="unit-wrapper">
          <img class="unit-icon" src="https://d1bmdfhj2yn3u7.cloudfront.net/images/collectibles/${unitBaseId}/open.png"/>
          ${unit.unitName}
        </span>
      `;
      unitCell.appendChild(div);
    }
  } else {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 2;
    cell.textContent = "No assignments this phase";
    cell.className = "Odd";
    row.appendChild(cell);
    fragment.appendChild(row);
  }

  // Flush the DOM
  tbody.innerHTML = "";
  tbody.appendChild(fragment);
}

function createStarsRow(stars, instructions) {
  const row = document.createElement("tr");
  row.appendChild(document.createElement("td"));
  const cell = document.createElement("td").appendChild(document.createElement("label"));
  cell.textContent = `${stars} stars ${instructions == "" ? "" : `- ${instructions}`}`;
  row.appendChild(cell);
  return row;
}

function getPlatoonAssignmentCount(phase, zoneId, platoon) {
  const assignments = allAssignments[phase-1];
  let count = 0;
  for (let i = 0; i < assignments.length; i++) {
    if (assignments[i].zoneId === zoneId && assignments[i].platoonDefinitionId === `tb3-platoon-${platoon}` && assignments[i].allyCode != "-1") {
      count++;
    }
  }
  return count;
}

function getPlatoonAssignmentStatus(phase, zoneId, platoon) {
  let count = getPlatoonAssignmentCount(phase, zoneId, platoon);
  if(count < 15 && phase > 0) {
    count += getPlatoonAssignmentCount(phase-1, zoneId, platoon);
  }
  
  const span = document.createElement("span")
  switch(count) {
    case 0:
      span.textContent = "⛔";
      break;
    case 15:
      span.textContent =  "✓";
      span.style.color = "limegreen";
      break;
    default:
      span.textContent =  "⚠";
      span.style.color = "orange";
      break;
  }
  return span
}

function createPlatoonsRow(phase, zoneId) {
  const row = document.createElement("tr");
  row.appendChild(document.createElement("td"));
  const cell = document.createElement("td");
  const platoonGrid = document.createElement("div");
  platoonGrid.style.display = "grid";
  platoonGrid.style.gridTemplateColumns = "repeat(2, 5.5em)";
  platoonGrid.style.gap = "0px";
  platoonGrid.style.borderTop = "1px solid #00d8ff";
  platoonGrid.style.borderLeft = "1px solid #00d8ff";
  platoonGrid.style.width = "fit-content";
  
  for(let i=1; i<4; i++) {
    const gridItem = document.createElement("label");
    gridItem.textContent = `${i} - `;
    gridItem.style.padding = "10px 10px 10px 1em";
    gridItem.style.borderRight = "1px solid #00d8ff";
    gridItem.style.borderBottom = "1px solid #00d8ff";
    gridItem.appendChild(getPlatoonAssignmentStatus(phase, zoneId, i));
    platoonGrid.appendChild(gridItem);
    const gridItem2 = document.createElement("label");
    gridItem2.textContent = `${i+3} - `;
    gridItem2.style.padding = "10px 10px 10px 1em";
    gridItem2.style.borderRight = "1px solid #00d8ff";
    gridItem2.style.borderBottom = "1px solid #00d8ff";
    gridItem2.appendChild(getPlatoonAssignmentStatus(phase, zoneId, i+3));
    platoonGrid.appendChild(gridItem2);
  }

  cell.appendChild(platoonGrid);
  row.appendChild(cell);
  row.style.marginBottom = "10px";
  return row;
}

function loadAssignmentPage() {
  var mainAccount = localStorage.getItem("selectedPlayer");
  var altList = JSON.parse(localStorage.getItem("altAccounts") || "[]");
  var playerName = (players.find(a => a.allyCode === mainAccount) || {name: ""}).name;
  var phaseSelectCode = `filterAssignments('${mainAccount}');`;
  altList.forEach((altCode) => {phaseSelectCode += `filterAssignments('${altCode}');`});
  var pageHTML = `<h1 style="display:none;">RoA ROTE Platoon Assignments</h1>
  <div class="spacing-div">
    <label for="phaseSelect">Select Phase:</label>
    <select id="phaseSelect" onchange="${phaseSelectCode}">
      <option value="0">Phase 1</option>
      <option value="1">Phase 2</option>
      <option value="2">Phase 3</option>
      <option value="3">Phase 4</option>
      <option value="4">Phase 5</option>
      <option value="5">Phase 6</option>
    </select>
  </div>
  <p><label>Assignments for ${playerName}</label></p>
  <table id="assignmentsTable${mainAccount}">
    <colgroup>
      <col style="width: 2em;" />
      <col />
    </colgroup>
    <thead>
      <tr style="display: none;">
        <th style="width: 2em;">Platoon</th>
        <th>Unit</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>`;

  altList.forEach((altCode) => {
    pageHTML += `<p><label>Assignments for ${(players.find(a => a.allyCode === altCode) || {name: ""}).name}</label></p>
  <table id="assignmentsTable${altCode}">
    <colgroup>
      <col style="width: 2em;" />
      <col />
    </colgroup>
    <thead>
      <tr style="display: none;">
        <th style="width: 2em;">Platoon</th>
        <th>Unit</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>`;
  });
  document.getElementById("id_main_container").innerHTML = pageHTML
  document.getElementById('id_page_name').innerHTML='<label>Platoon Assignments</label>';
  loadAssignments(mainAccount);
  altList.forEach((altCode) => filterAssignments(altCode));
  reloadMenu();
}

/*
<p><label>Day 1 - All platoons, all territories to 3 stars.  Please attack to make up for points.</label></p>
<p><label>Day 2 - All platoons, all territories to 3 stars.  Attacks are required to make up for points.</label></p>
<p><label>Day 3 - DS, LS - finish all platoons, 3 stars.  Neutral - finish all platoons, no stars, hit Reva and Krayt.</label></p>
<p><label>Day 4 - Neutral - 3 stars, hit Reva and Krayt. LS - start platoons 1, 2, 4. finish none, points but no stars.  DB - no stars</label></p>
<p><label>Day 5 - LS - finish platoons, 3 stars. DS - 3 stars. Neutral - start platoons 1, 2, 3, 5, finish none. points but no stars.  Mandalore - start all platoons, no stars.</label></p>
<p><label>Day 6 - Neutral - finish platoons, three stars.  Mandalore - finish platoons, 1 star.</label></p>
*/
function showPhaseTargets(phase) {
  if(phase == 0) {
    document.getElementById("bodyPhase1").style.display = "table-row-group";
    document.getElementById("bodyPhase2").style.display = "table-row-group";
    document.getElementById("bodyPhase3").style.display = "table-row-group";
    document.getElementById("bodyPhase4").style.display = "table-row-group";
    document.getElementById("bodyPhase5").style.display = "table-row-group";
    document.getElementById("bodyPhase6").style.display = "table-row-group";
  } else {
    document.querySelectorAll("#rotePlanTable1 tbody").forEach(tbody => {
      tbody.style.display = "none";
    });
    document.getElementById(`bodyPhase${phase}`).style.display = "table-row-group";
  }
}

async function checkForPlanData() {
  if(rotePlan === null || rotePlan.length == 0) {
    localStorage.setItem("dataVersion", "0");
    await loadData();
  }
}

function asyncLoadRotEPage() {
  
  var pageHTML = `
<a class="menu-button" style="text-decoration: none; margin-bottom: 10px; display:inline-block;" href="https://genskaar.github.io/tb_empire/index.html" target="_blank" class="no-style">🌐 TB Interactive Battle Map</a>
  <div class="spacing-div">
    <label for="phaseSelect">Select Phase:</label>
    <select id="phaseSelect" onchange="showPhaseTargets(this.value)">
      <option value="0">All</option>
      <option value="1">Phase 1</option>
      <option value="2">Phase 2</option>
      <option value="3">Phase 3</option>
      <option value="4">Phase 4</option>
      <option value="5">Phase 5</option>
      <option value="6">Phase 6</option>
    </select>
  </div>
<div>
<table id="rotePlanTable1">
    <colgroup>
      <col style="width: 2em;" />
      <col />
    </colgroup>
    <thead>
      <tr style="display: none;">
        <th style="width: 2em;">Platoon</th>
        <th>Unit</th>
      </tr>
    </thead>
    <tbody id="bodyPhase1"><tr><th scope="rowgroup" headers="phase" colspan="2">Phase 1${rotePlan[0].instructions == "" ? "" : ` - ${rotePlan[0].instructions}`}</th></tr></tbody>
    <tbody id="bodyPhase2"><tr><th scope="rowgroup" headers="phase" colspan="2">Phase 2${rotePlan[1].instructions == "" ? "" : ` - ${rotePlan[1].instructions}`}</th></tr></tbody>
    <tbody id="bodyPhase3"><tr><th scope="rowgroup" headers="phase" colspan="2">Phase 3${rotePlan[2].instructions == "" ? "" : ` - ${rotePlan[2].instructions}`}</th></tr></tbody>
    <tbody id="bodyPhase4"><tr><th scope="rowgroup" headers="phase" colspan="2">Phase 4${rotePlan[3].instructions == "" ? "" : ` - ${rotePlan[3].instructions}`}</th></tr></tbody>
    <tbody id="bodyPhase5"><tr><th scope="rowgroup" headers="phase" colspan="2">Phase 5${rotePlan[4].instructions == "" ? "" : ` - ${rotePlan[4].instructions}`}</th></tr></tbody>
    <tbody id="bodyPhase6"><tr><th scope="rowgroup" headers="phase" colspan="2">Phase 6${rotePlan[5].instructions == "" ? "" : ` - ${rotePlan[5].instructions}`}</th></tr></tbody>
  </table>
  </div>`;
  document.getElementById("id_main_container").innerHTML = pageHTML
  document.getElementById('id_page_name').innerHTML='<label>RoTE Plan</label>';
rotePlan.forEach( (phase) => {
  const tbody = document.querySelector(`#bodyPhase${phase.phase}`);
  phase.plan.forEach( (territory) => {
        const zone = territoryMap.get(territory.zoneId);
        const zoneRow = createZoneRow(zone, 2);
        tbody.appendChild(zoneRow);
        tbody.appendChild(createStarsRow(territory.stars, territory.instructions));
        tbody.appendChild(createPlatoonsRow(phase.phase, territory.zoneId));
  });
});
  reloadMenu();

}

function loadRoTEPage() {
  checkForPlanData().then( () => {asyncLoadRotEPage();} );
}

function loadTWCalendarPage() {
  document.getElementById('id_page_name').innerHTML='<label>TW Calendar</label>';
  var mainAccount = localStorage.getItem("selectedPlayer");
  if(!mainAccount) {
    document.getElementById("id_main_container").innerHTML = `<p>Please select an account in Settings.</p>`;
    return;
  }
  var warGroup = (players.find(a => a.allyCode === mainAccount) || {name: ""}).warGroup;

  document.getElementById("id_main_container").innerHTML = `<p>You are in Group <strong>${warGroup}</strong></p>`;
  
  warCalendar.filter( war => {
      const warDate = new Date(war.date);
      const today = new Date();
      today.setDate(today.getDate() - 1);
      return warDate >= today;
    }
  ).forEach( war => {
    const warDate = new Date(war.date);
    const warInfo = document.createElement("p");
    const warLabel = document.createElement("label");
    warLabel.textContent = `${warDate.toLocaleDateString()} (${(war.skip == warGroup) ? "Skip" : "Join"})`;
    warInfo.appendChild(warLabel);
    document.getElementById("id_main_container").appendChild(warInfo);
  });
}

function buildWarDefTable() {
  var tableRows = "";
  const tbody = document.querySelector("#id_warDefTable tbody");
  warDef.forEach( (zone) => {
    const row = document.createElement("tr");
    row.id = `id_Zone${zone.Zone}`;

    const zoneCell = document.createElement("td");
    zoneCell.innerHTML = `<a href="javascript:navigator.clipboard.writeText('${zone.Label}');"><label>${zone.Zone}</label></a>`;

    const unitCell = document.createElement("td");
    unitCell.innerHTML = `<label>${zone.Label}</label>`;

    row.appendChild(zoneCell);
    row.appendChild(unitCell);

    tbody.appendChild(row);
  });

}


function buildTeamSuggestionTable(zone) {
  var tableRows = "";
  const tbody = document.querySelector("#id_teamSuggestions tbody");
  tbody.innerHTML = "";

  warDef.filter( defRec => {return defRec.Zone === zone;} )[0].Teams.forEach((team) => {
    const row = document.createElement("tr");
    const teamCell = document.createElement("td");
    const teamSpan = document.createElement("span");
    team.forEach((toon) => {
      const toonImg = document.createElement("img");
      toonImg.src = `https://d1bmdfhj2yn3u7.cloudfront.net/images/collectibles/${toon}/open.png`;
      toonImg.classList.add( "unit-icon");
      teamSpan.appendChild(toonImg);
    });
    teamCell.appendChild(teamSpan);
    row.appendChild(teamCell);
    tbody.appendChild(row);
  });
}

function buildWarDefEditTable() {
  var tableRows = "";
  const tbody = document.querySelector("#id_warDefTable tbody");
  warDef.forEach( (zone) => {
    const row = document.createElement("tr");
    row.id = `id_Zone${zone.Zone}`;

    const zoneCell = document.createElement("td");
    zoneCell.innerHTML = `<label>${zone.Zone}</label>`;

    const unitCell = document.createElement("td");
    unitCell.innerHTML = `<input value="${zone.Label}" style="width: 100%;"></input>`;

    row.appendChild(zoneCell);
    row.appendChild(unitCell);

    tbody.appendChild(row);
  });

}

function buildTeamSuggestionEditTable(zone) {
  var tableRows = "";
  const tbody = document.querySelector("#id_teamSuggestions tbody");
  tbody.innerHTML = "";

  warDef.filter( defRec => {return defRec.Zone === zone;} )[0].Teams.forEach((team) => {
    const row = document.createElement("tr");
    const teamCell = document.createElement("td");
    const teamSpan = document.createElement("span");
    team.forEach((toon) => {
      const toonImg = document.createElement("img");
      toonImg.src = `https://d1bmdfhj2yn3u7.cloudfront.net/images/collectibles/${toon}/open.png`;
      toonImg.classList.add( "unit-icon");
      teamSpan.appendChild(toonImg);
    });
    teamCell.appendChild(teamSpan);
    row.appendChild(teamCell);
    tbody.appendChild(row);
  });
}


function loadTWPage() {
document.getElementById("id_main_container").innerHTML = `<p>Click on the territory to see the requested team builds.</p>
<p>If you do not have a team for one of the territories, please set your best appropriate substitute.</p>
<p>If you have datacrons for a team, please set your best build for the DC.</p>
<div style="display: flex; width: 100%;">
<div style="position: relative; margin: 0 auto;">
<img src="img/TWMapZones.png" style="max-width: 100%" alt="Interactive Map">

<svg viewBox="0 0 473 381" width="473px" xmlns="http://www.w3.org/2000/svg" style="position: absolute; top: 0; left: 0; max-width: 100%;">
  <style>
    .zone {
      fill: #00d8ff;
      fill-opacity: 0;
      stroke: #00d8ff;
      stroke-width: 2;
      stroke-opacity: 0;
      cursor: pointer;
      transition: fill-opacity 0.2s ease;
    }
    .zone:hover {
      fill-opacity: 0.5;
    }
    .selected {
      fill-opacity: 0.65;
    }
    text {
      fill: white;
      font-size: 12px;
      pointer-events: none;
    }
  </style>

  <!-- Zones 1–8 -->
  <polygon class="zone" data-zone="1" points="373,28,394,40,408,52,421,62,433,79,441,94,447,110,452,126,453,140,453,150,419,150,402,141,373,141,354,150,354,144,337,126,346,80,369,56" />
  <polygon class="zone" data-zone="2" points="352,156,371,149,402,149,418,157,453,157,447,197,431,233,406,267,378,295,350,318,327,331,297,346,306,299,336,261" />
  <polygon class="zone" data-zone="3" points="288,10,314,13,340,15,366,25,362,56,336,81,328,127,344,142,311,141,287,151,248,150" />
  <polygon class="zone" data-zone="4" points="346,147,326,262,297,300,287,351,250,364,217,370,182,372,228,210,240,210,247,180,275,156,289,156,308,147" />
  <polygon class="zone" data-zone="5" points="166,107,189,94,219,94,226,102,254,102,239,156,270,156,241,177,234,204,183,204,175,192,149,191,127,202" />
  <polygon class="zone" data-zone="6" points="126,208,145,197,173,198,182,210,222,210,173,372,148,370,122,366,102,360,88,353,112,288,105,258" />
  <polygon class="zone" data-zone="7" points="50,125,105,103,131,101,145,109,159,109,120,204,60,204,50,188,16,189,32,152" />
  <polygon class="zone" data-zone="8" points="15,193,47,194,56,210,117,209,97,262,104,290,79,350,50,329,28,304,16,279,9,241" />

  <!-- Ships -->
  <polygon class="zone" data-zone="Ship 1" points="185,29,208,20,233,13,257,9,283,10,256,97,227,97,219,89,194,89,169,102,194,37" />
  <polygon class="zone" data-zone="Ship 2" points="179,31,189,39,162,104,147,104,135,97,109,97,54,119,79,91,98,76,131,52" />
</svg>
</div>
</div>
<table id="id_teamSuggestions">
  <colgroup>
    <col />
  </colgroup>
  <thead>
    <tr style="display: none;">
      <th>Team</th>
    </tr>
  </thead>
  <tbody>
  </tbody>
</table>
<table id="id_warDefTable">
      <colgroup>
        <col style="width: 5.5em;" />
        <col />
      </colgroup>
      <thead>
        <tr style="display: none;">
          <th>Zone</th>
          <th>Instructions</th>
        </tr>
      </thead>
      <tbody></tbody>
</table>
`;
document.getElementById('id_page_name').innerHTML='<label>TW Plan</label>';
document.querySelectorAll('.zone').forEach(zone => {
  zone.addEventListener('click', () => {
    document.querySelectorAll('.selected').forEach( selectedZone => {
      if( zone.dataset.zone !== selectedZone.dataset.zone ) {
        selectedZone.classList.remove("selected");
      }
    });
    zone.classList.toggle("selected");
    buildTeamSuggestionTable( zone.dataset.zone );

    //alert(`You clicked: ${zone.dataset.zone}`);
  });
});
buildWarDefTable();
reloadMenu();
}

function loadCountersPage() {
  document.getElementById("id_main_container").innerHTML = `<p>Step 1: Make a list</p>
  <p>Step 2: ?</p>
  <p>Step 3: Profit</p>
  <p style="margin-top: 35px">Some potentially useful links:</p>
  <p><a href="https://www.twcounters.com/" target="_blank" class="no-style">SWGOH Territory Wars</a></p>
  <p><a href="https://swgoh.gg/gac/ship-counters/" target="_blank" class="no-style">SWGOH Ship Counters</a></p>`;
  document.getElementById('id_page_name').innerHTML='<label>TW Counters</label>';
  reloadMenu();
}

function loadAboutPage() {
document.getElementById("id_main_container").innerHTML = `<h1>RoA ROTE Platoon Assignments</h1>
<p style="color: white;">Version 1.0.10</p>
<p style="color: white;">Copyright 2025, I guess?</p><p>Copy it all you want.</p>
<p>"Mi código es tu código" as they really don't say anywhere.</p>
<p style="color: white;">data version: ${localStorage.getItem("dataVersion")}</p>`;
document.getElementById('id_page_name').innerHTML='<label>About</label>';
reloadMenu();
}

function addPlayerAltRow(playerId, playerName) {
  if( document.getElementById(`id_alt${playerId}`) != null) {
    return false;
  }
  const row = document.createElement("tr");
  row.id = `id_alt${playerId}`;

  const opCell = document.createElement("td");
  opCell.innerHTML = `<label>${playerName}</label>`;

  const unitCell = document.createElement("td");
  unitCell.innerHTML = `<button class="menu-button" onclick="removeAlt(${playerId});">&#x274C;</button>`;

  row.appendChild(opCell);
  row.appendChild(unitCell);

  const tbody = document.querySelector("#id_altTable tbody");
  tbody.appendChild(row);

  return true;
}

function addPlayerAlt() {
  let altPlayerSelect = document.getElementById("altPlayerSelect");
  var playerId = altPlayerSelect.value;
  var playerName = altPlayerSelect.options[altPlayerSelect.selectedIndex].text
  if( addPlayerAltRow(playerId, playerName)) {
    playerAlts.push(playerId);
    saveAlt();
  }
}

function removeAlt(playerId) {
  if( !playerAlts.includes(playerId.toString())) {
    return;
  }

  const index = playerAlts.indexOf(playerId.toString());
  playerAlts.splice(index, 1);
  saveAlt();
  document.getElementById(`id_alt${playerId}`).remove();
}

function saveAlt() {
  localStorage.setItem("altAccounts", JSON.stringify(playerAlts));
}

function loadAltAccounts() {
  playerAlts.forEach((altId) => {
    if( players.find(obj => obj.allyCode === altId) == null ) {
      addPlayerAltRow(altId, "* Account removed *");
    } else {
      addPlayerAltRow(altId, players.find(obj => obj.allyCode === altId).name);
    }
  });
}

function loadSettingsPage() {
  document.getElementById("id_main_container").innerHTML = `
  <div class="spacing-div">
    <label for="playerSelect">Main Account:</label>
    <select id="playerSelect" onchange="localStorage.setItem('selectedPlayer', this.value);" style="margin: 0 0 0 auto;"></select>
  </div>
  <div class="spacing-div">
    <label for="altPlayerSelect">Alt Accounts:</label>
    <span style="display:inline-flex">
      <select id="altPlayerSelect" style="margin: 0 0 0 auto;"></select>
      <button class="menu-button" onclick="addPlayerAlt();"><label>+</label></button>
    </span>
    <table id="id_altTable">
      <colgroup>
        <col />
        <col style="width: 2em;" />
      </colgroup>
      <thead>
        <tr style="display: none;">
          <th>Player</th>
          <th style="width: 2em;">Remove</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>
  <div class="spacing-div">
    <label for="playerSelect">Starting Page:</label>
    <select id="startingPage" onchange="localStorage.setItem('startPage', this.value)" style="margin: 0 0 0 auto;">
      <option value="loadAssignmentPage">Platoon Assignments</option>
      <option value="loadPlanPage">RoTE Daily Plan</option>
      <option value="loadTWPage">Territory War Def</option>
    </select>
  </div>`;
  //    <option value="loadCountersPage">Territory War Counters</option>
  document.getElementById('id_page_name').innerHTML='<label>Settings</label>';
  populatePlayerSelect(players);
  document.getElementById('altPlayerSelect').innerHTML=`${document.getElementById('playerSelect').innerHTML}`;
  loadAltAccounts();
  document.getElementById('startingPage').value = (localStorage.getItem('startPage') || 'loadAssignmentPage');
  reloadMenu();
}


function buildCharacterList(selectedPhase) {
  missingUnitMap.clear();

  // "allyCode":"863122853","unitBaseId":"EMPERORPALPATINE","zoneId":"tb3_mixed_phase01_conflict02_recon01"
  var nameList = [];
  var listSelections = "";

  allAssignments[selectedPhase].forEach((assignment) => {
    var unitName = unitMap.get(assignment.unitBaseId).unitName;
    var playerName = playerMap.get(assignment.allyCode);
    if( playerMap.has(assignment.allyCode) ) {
      if( missingUnitMap.has(unitName)) {
        missingUnitMap.get(unitName).push({"name": playerName, "zone": assignment.zoneId, "op": assignment.platoonDefinitionId});
      } else {
        missingUnitMap.set(unitName, [{"name": playerName, "zone": assignment.zoneId, "op": assignment.platoonDefinitionId}]);
        nameList.push(unitName);
      }
    }
  });
  nameList = nameList.sort((a,b) => {
    return (a < b) ? -1 : 1;
  });
  nameList.forEach((toon) => {
    listSelections += `<option>${toon}</option>`;
  });
  document.getElementById("missingCharacter").innerHTML = listSelections;
  buildPlayerList(document.getElementById("missingCharacter").value);
}

function buildPlayerList(selectedCharacter) {
  if(selectedCharacter == null || !missingUnitMap.has(selectedCharacter)) {
    return;
  }
  var playerHTML = "";
  missingUnitMap.get(selectedCharacter).forEach((player) => {
    playerHTML += `<tr><td><label>${player.name.name}</label></td><td><label>${territoryMap.get(player.zone).zoneColour} ${player.op.slice(-1)}</label></td></tr>`;
  });

  const tbody = document.querySelector(`#id_playersAssigned tbody`);
  tbody.innerHTML = playerHTML;

}

function loadMissingPlatoonsPage() {
  document.getElementById('id_page_name').innerHTML='<label>Missing Platoons</label>';
  //document.getElementById("id_main_container").innerHTML = `<iframe src="missing_platoons.html" style="width:100%; height:80vh; border:none;"></iframe>`;
  document.getElementById("id_main_container").innerHTML = `<div class="spacing-div">
    <label for="phaseSelect">Select Phase:</label>
    <select id="phaseSelect" onchange="buildCharacterList(this.value);">
      <option value="0">Phase 1</option>
      <option value="1">Phase 2</option>
      <option value="2">Phase 3</option>
      <option value="3">Phase 4</option>
      <option value="4">Phase 5</option>
      <option value="5">Phase 6</option>
    </select>
  </div>

  <div class="spacing-div">
    <label for="phaseSelect">Missing Toon:</label>
    <select id="missingCharacter" onchange="buildPlayerList(this.value);">
    </select>
  </div>


<table id="id_playersAssigned">
  <colgroup>
    <col />
    <col style="width: 5em;"/>
  </colgroup>
  <thead>
    <tr style="display: none;">
      <th>Player</th>
      <th>Operation</th>
    </tr>
  </thead>
  <tbody>
  </tbody>
</table>`;

    const now = new Date();
    const utcDay = now.getUTCDay();
    const utcHour = now.getUTCHours();
    const adjustedDay = (utcDay + 6) % 7;
    let index = utcHour < 17 ? (adjustedDay + 6) % 7 : adjustedDay;
    index = index % 6;

    buildCharacterList(index);
    document.getElementById("phaseSelect").value = index;

  reloadMenu();
}