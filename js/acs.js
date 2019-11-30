/*
 *  ACS Table Visualizer
 *
 *    Donald Mellen
 *
 *  The path to the Configuration file:
 *      config/acsFiles.txt

 *  THE DIRECTORY IS NOT USED SINCE IT IS READ FROM THE configuration file
 *  The path to the CSV files is assumed to be:
 *      data/year/state/region/acs/acsData.csv
 *
 *  The path to the GeoJSON files is assumed to be:
 *      data/year/state/GeoJSONfile.json
 *  or for files which include state outlines
 *      data/year/GeoJSONfile.json
 *
 *  CSV File naming Convention: state.year.geog.acs.tableId.csv
 *                      for US: state.year.geog.acs.tableId.csv
 *
 *  JSON File naming Convention: state.year.geog.500k.json
 *                      OR?    : state.year.geog.json
 */

/*
 *  TODO
 *      - Buttons
 *      - Lists
 *      - Table
 */
/***************************************************************/

/*
 * Program Configuration
 */
var tableParamsFile = "data/tableParameters.json";
var configFile = "data/acsFiles.txt";

var minYear = 2010;
var maxYear = 2017;

/*
 *  Map for Leaflet
 */
var streetLayerUrl = "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?" + "access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw";

var streetLayer = L.tileLayer(streetLayerUrl, {
  attribution: 'Map data © <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
  id: 'mapbox.streets'
});

var map_1 = L.map("mapId_1").setView([33.638, -80.915], 7);

map_1.addLayer(streetLayer);
map_1.attributionControl.addAttribution('Data © <a href="http://census.gov/">US Census Bureau</a>');

var map_title;
var legend;

/*
 * GLOBAL VARIABLES
 */
// Arrays of available data
var availableAcsTables = []; // Array of available ACS Data files
var availableGeographies = []; // Array of available GeoJSON files
var tableParameters; // Array of Information about ACS Tables

// Arrays of unique values obtained from list of files
// Used to populate dropdown lists
var tableIdArry = [];
var stateArry = [];
var geogArry = [];
var yearArry = [];
var acsArry = [];

var activeLayer; // Current Active Layer (GeoJSON)
var activeAcsTable; // ACS table currently associated with the Active GeoJSON
var activeGeoid; // GEOID of selected geographic region

// Div for charts
var divId_1 = "chart1"; // Bar charts
var divId_2 = "chart2"; // Trends

/********************* CLASS DEFINITIONS **************************/
/*
 *  class AcsTableInfo - object for an ACS Table
 *    Constructor takes a path to a CSV file and parses it.
 *      Adds information about the table to Arrays which will
 *      be used to populate Dropdown Lists for filtering the list of tables
 *    The data is not loaded until the first request for the file
 */
class AcsTableInfo {
  constructor(file) {
	console.info("ACS file: "+file);

    this.fullpath = file;
    var s = file.split('/');
    var n = s[s.length - 1];
    this.fileName = n;
    var p = n.split('.');
    this.us_state = p[0];
    this.year = p[1];
    this.geog = p[2];
    this.acs = p[3];
    this.tableId = p[4];
    this.key = this.us_state + '.' + this.year + '.' + this.geog + '.' + this.acs + '.' + this.tableId;
    this.geogFileKey = this.us_state + '.' + this.year + '.' + this.geog;
    
//    console.info("Looking for "+this.tableId);
    this.tableParams = findFromArray(tableParameters, 'tableId', this.tableId);
    this.geogObj = null; // reference to Geography Object for GeoJSON
    this.acsData = null; // reference to data from ACS CSV file
    this.breaks = null;  // Jenks breaks for choropleth map

    this.variableNames = null;

    // Add data to arrays for populating dropdown filter lists
    addIfUnique(tableIdArry, this.tableId);
    addIfUnique(stateArry, (this.us_state.toUpperCase()));
    addIfUnique(geogArry, this.geog);
    addIfUnique(yearArry, this.year);
    addIfUnique(acsArry, this.acs);
  }

  toString() {
    return this.key;
  }
}

/*
 *  Checks if a value is already in an Array.
 *    If not, the value is added to the Array
 */
function addIfUnique(arry, val) {
  if (!arry.includes(val)) {
    arry.push(val);
  }
}

/* **************************************************************/

/*
 *  GeoJsonInfo class - object for a GeoJSON layer
 *    Constructor takes a path to a json file and parses it.
 *    The data is not loaded until the first request for the file
 */
class GeoJsonInfo {
  constructor(file) {
//    console.info("GeoJson file: "+file);
    this.fullpath = file;
    this.key = file;
    var s = file.split('/');
    var n = s[s.length - 1];
    this.fileName = n;
    var p = n.split('.');
    this.us_state = p[0];
    this.year = p[1];
    this.geog = p[2];
    this.acs = p[3]; // Not used (assume same for acs1 & acs5
    this.key = this.us_state + '.' + this.year + '.' + this.geog;
    this.layer = null;
  }

  toString() {
    return this.key;
  }
}

/******************** PROGRAM INITIALITION ************************/
/*
 *  Program Initialization.
 *  1. Read parameters file for ACS Tables
 *  2. Read file containing paths to data files
 *  3. Parses file paths and creates AcsTableInfo and GeoJsonInfo
 *     objects
 */

loadTableParameters(tableParamsFile);

function loadTableParameters(parameterFile) {
  console.info("Loading ACS Table Parameters from: " + parameterFile);
  console.info("Data file listed in: " + configFile);

  $.ajax({
    url: parameterFile,
    type: "GET",
    dataType: "json",
       beforeSend: function() { map_1.spin(true); },
       complete:   function() { map_1.spin(false); },
    success: function (txt) {
      // Keep just the array part of the data
      tableParameters = txt.acsTableParameters.slice(0);

    
    },
    error: function (xhr, textStatus, error) {

      console.trace(error)
    }
  });
}

/*
 * Search through the specified array to find the element
 * with the specified key
 */
function findFromArray(array, key, value) {
  return array.find(function (element) {
    return element[key] == value;
  })
}

$.ajax({
  type: "text",
  url: configFile,
  type: "GET",
  beforeSend: function () { map_1.spin(true); },
  complete:   function () { map_1.spin(false); },
  success:    function (response) { loadAcsFiles(response); }
});

/*
 *  Actual program initialization based on contents (list of files)
 *  Contained in its input string.
 *
 *  Each line of the input is assumed to contain the path to either
 *  a CSV file or a JSON (GeoJSON format) file.
 *   CSV Files - contain ACS table information from
 *       the US Census Bureau
 *   JSON Files - contain GeoJSON records corresponding to 
 *       Geographies referenced int the CSV Files
 *
 *  The key connecting a CSV file and a corresponding GeoJSON
 *  file is the GEOID
 */
function loadAcsFiles(cF) {
  var cFiles = cF.split('\n');
  console.info(cFiles);
  for (var i = 0; i < cFiles.length; i++) {
    let s = cFiles[i].split('.');
    let suffix=s[s.length-1];
    if (suffix == "csv") {
      addAcsTableEntry(cFiles[i]);
    } else if ((suffix == "json") || (suffix == "geojson")) {
      addGeoJsonEntry(cFiles[i]);
    } else if (suffix.trim() == "") {
      console.info("Empty Line");
    } else {
      console.info("UNRECOGNIZED FILE TYPE: " + suffix);
    }
  }

  // For each ACS table for which a geography is available,
  //  add it to the HTML table
  console.info("INITIALIZING TABLE");
//  console.info(availableAcsTables.toString());
  availableAcsTables.forEach(addToTable);

  // Add values to the filter dropdowns
  populateAcsFilters();
}

/*
 * Creates a new AcsTableInfo object based on the
 * supplied string and adds it to the Array of 
 * available ACS Tables
 */
function addAcsTableEntry(fileName) {
//  console.info("ACS_FILE: " + fileName);
  var tbl = new AcsTableInfo(fileName);
//  console.info("ACS_FILE_KEY: " + tbl.toString());
  availableAcsTables.push(tbl);
}

/*
 * Creates a new GeoJsonInfo object based on the
 * supplied string and adds it to the Array of 
 * available Geography Files
 */
function addGeoJsonEntry(fileName) {
//  console.info("GEOG_FILE: " + fileName);
  var geo = new GeoJsonInfo(fileName);
//  console.info("GEOG_FILE_KEY: " + geo.toString());
  availableGeographies.push(geo);
}

/*
 *  Add a row to the HTML table of available ACS Tables
 */
function addToTable(acsRecord, index, array) {
  for (var i = 0; i < availableGeographies.length; i++) {
    if (acsRecord.geogFileKey == availableGeographies[i].key) {
      var tr; // = "<td>" + value.tableId + "</td>"
      tr = "<td>" + acsRecord.us_state.toUpperCase() + "</td>" +
        "<td>" + acsRecord.geog + "</td>" +
        "<td>" + acsRecord.acs + "</td>" +
        "<td>" + acsRecord.year + "</td>" +
        "<td>" + acsRecord.tableId + "</td>";
      acsRecord.geogFileKey = availableGeographies[i];

      var tableRef = document.getElementById('acsFilesTbl').getElementsByTagName('tbody')[0];

      // Insert a row in the table at the last row
      var newRow = tableRef.insertRow();
      newRow.id = acsRecord.key;
      newRow.className = "availAcsTable";
      if (acsRecord.tableParams.tableTitle == null) {
        console.info("No Information available for: " + acsRecord.fileName);
        newRow.title = "MISSING CHART INFORMATION";
      } else {
        newRow.title = acsRecord.tableParams.tableTitle;
      }

      newRow.innerHTML = tr;
      break;
    }
  }
}

/*
 *  Add Values to the Dropdown lists
 */
function populateAcsFilters() {
  // populateDropdown sorts by increasing order
  populateDropdown("selectState", stateArry);
  populateDropdown("selectGeography", geogArry);
  populateDropdown("selectACS", acsArry);

//  populateDropdown("selectTableId", tableIdArry);
  // Add tooltip when populating Table Id dropdown
  tableIdArry.sort();
  var select = document.getElementById("selectTableId");
  for (var i = 0; i < tableIdArry.length; i++) {
    select.options[select.options.length] = new Option(tableIdArry[i], tableIdArry[i], false, false);
    let tableParams = findFromArray(tableParameters, 'tableId', tableIdArry[i]);
    select.options[i+1].title = tableParams.tableTitle;
  }
  
  /* Years are sorted by decreasing order */
  yearArry.sort(function (a, b) {
    return b - a
  });
  select = document.getElementById("selectYear");
  for (var i = 0; i < yearArry.length; i++) {
    select.options[select.options.length] = new Option(yearArry[i], yearArry[i], false, false);
  }
}

/*
 *  Populate the specified element with values from the array
 */
function populateDropdown(elementId, arry) {
  arry.sort();
  var select = document.getElementById(elementId);
  for (var i = 0; i < arry.length; i++) {
    select.options[select.options.length] = new Option(arry[i], arry[i], false, false);
  }

}

/************** USER SELECTED GEOGRAPHIC REGION *******************/

/*
 *  The user has selected a row in the 'Select ACS' Table
 *  Find it, then activate it.
 *  
 */
function displayGeogLayer() {
  var target = event.target;
  while (target && target.nodeName != 'TR') {
    target = target.parentElement;
  }
  if (!target) {
    console.info("TR not found");
    return;
  }

  var selected = target.parentElement.querySelectorAll(".selectedRow");
  for (var i = 0; i < selected.length; i++) {
    selected[i].classList.remove("selectedRow");
  }

  target.classList.add("selectedRow");

  var acsDataKey = target.id;

  activateAcsTable(acsDataKey, true);
}

/*
 *  activateAcsTable( key, needJSON )
 * 
 *  Find the availableAcsTables Array (findAcsTable)
 *  If the associated CSV file has not been loaded, load it.
 */
function activateAcsTable(key, needJSON) {
  var acsRecord = findAcsTable(key);
  var promiseList = [];
  var csvLoaded = getCSV(acsRecord);
  promiseList.push(csvLoaded);
  if (needJSON) {
    var jsonLoaded = getJSON(acsRecord);
    promiseList.push(jsonLoaded);
  }

  Promise.all(promiseList)
    .then(values => {
      let acs2 = values[0];

      if (needJSON) {
        console.log("GeogFile: " + acsRecord.geogObj.key);
        console.log("ALL RECEIVED3: " + acsRecord.fullpath);
        console.info("MIN: "+data_min+"  MAX: "+data_max
        		+ " \nColors: "+acsRecord.breaks);
        updateMap(acsRecord);
      }
      addTitle(acsRecord);
      addLegend(acsRecord);
      
      populateTrendList(acsRecord);
    })

    .catch(error => {
      console.info("PROMISE ERROR: " + error);
      console.trace();
    });
}

/*
 *  Function which reads a CSV file for a ACS file Table
 *  Reference to the Array is store in the AcsTableInfo Object
 */
function getCSV(acsRecord) {
  console.info("Retrieving CSV: " + acsRecord.fullpath);
  return new Promise((resolve, reject) => {
    if (acsRecord == null) {
      reject(new Error("null/undefined getCSV argument"));
    } else if (acsRecord.acsData != null) {
      // CSV file already loaded
      resolve(acsRecord); //resolve( [acsRecord, null] );
    }
    $.ajax({
      url: acsRecord.fullpath,
      type: "GET",
         beforeSend: function() { map_1.spin(true); },
         complete:   function() { map_1.spin(false); },
      success: function (data) {
        processCSV([acsRecord, data]);
        resolve(acsRecord); // resolve([acsRecord, data]);
      },
      error: function (error) {
        resolve(acsRecord);
      }
    });
  });
}

function processCSV(responseArray) {
  var acsRecord = responseArray[0];
  var dat = responseArray[1];
  if (dat == null) {
    console.info("CSV already loaded?", acsRecord.fullpath);
    return;
  }
  var csvData = $.csv.toArrays(dat);
  var variableNames = [];
  for (let i = 0; i < csvData[0].length; i++) {
    variableNames.push(csvData[0][i]);
  }
  acsRecord.variableNames = variableNames;
  csvData.shift(); // remove column titles
  acsRecord.acsData = csvData;
  set_choropleth_colors(acsRecord);
}

/*
 *  Function which actually reads a JSON (GeoJSON) file
 *  and converts it to a L.geoJson layer.
 *  Reference to the Layer is store in the GeoJsonInfo Object
 */
function getJSON(acsRecord) {
  return new Promise((resolve, reject) => {
    if (acsRecord == null) {
      reject(new Error("null/undefined getJSON argument"));
    } else if (acsRecord.geogObj == null) {
      acsRecord.geogObj = findGeography(acsRecord.geogFileKey);
      if (acsRecord.geogObj != null && acsRecord.geogObj.layer != null) {
        // GeoJSON already loaded for different CSV file
        resolve(acsRecord);
      } else {
        $.ajax({
          url: acsRecord.geogObj.fullpath,
          type: "GET",
          dataType: "json",
          success: function (data) {
            processJSON([acsRecord, data]);
            resolve(acsRecord); // resolve([acsRecord, data]);
          },
          error: function (error) {
            console.info("getJSON() - ERROR");
            reject(error);
          }
        });
      }
    } else {
      resolve(acsRecord); // resolve([acsRecord, null]);
    }
  });
}

/*
 *  Search through the array of geography data to find one with specified key
 *    If found, return reference to the Geography object
 *    Used to check if it has already been down loaded
 */
function findGeography(geogKey) {
  for (var i = 0; i < availableGeographies.length; i++) {
    if (geogKey == availableGeographies[i].key) {
      return availableGeographies[i];
    }
  }

  return null;
}

function processJSON(responseArray) {
  let acsRecord = responseArray[0];
  let geogData = responseArray[1];

  activeAcsTable = acsRecord;
  
  if (responseArray[1] == null) {
    console.info("GeoJSON already loaded?", acsRecord.geogObj.fullpath);
    return;
  }

  acsRecord.geogObj.layer = L.geoJson(geogData, {
    onEachFeature: onEachFeature,
    style: styleGeog
  });
}

/*
 *  
 */
function onEachFeature(feature, layer) {
  if (layer.feature.properties.GEOID == null) {
    lastIdx = layer.feature.properties.GEO_ID.lastIndexOf("US");
    layer.feature.properties.GEOID = layer.feature.properties.GEO_ID.slice(lastIdx + 2);
  }
  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: updateChart
  });
  layer.bindTooltip(layer.feature.properties.NAME);
  
  layer.bindPopup( popupText(layer.feature.properties.GEOID) );
  //layer.bindPopup('<pre>'+JSON.stringify(feature.properties,null,' ').replace(/[\{\}"]/g,'')+'</pre>');
}

/*
 * Text for popup added "onEachFeature"
 */
function popupText( geoid ) {
	let tableParams = activeAcsTable.tableParams;
	let data = activeAcsTable.acsData;
//	console.info("acs: "+activeAcsTable.fullpath+" geog: "+activeAcsTable.geogFileKey);
//	console.info("PARAMS: "+activeAcsTable.tableParams.tableTitle+" "+activeAcsTable.tableParams);
	let row = findRow(data, geoid);
	if (row == -1) {
		return tableParams.tableTitle + "<br><strong>No Data Available</strong>";
	}
	let text = data[row][0];
	let subTitle = tableParams.tableTitle;
	text += " ("+activeAcsTable.year+")<br>"+subTitle;
	for (let i = 0; i < tableParams.groups.length; i++) {
		text += "<br>"+tableParams.groups[i]+": "+data[row][parseInt(tableParams.offset)+i];
	}
	return text;
}

/*
 *  Highlight styling of a Geography polygon
 *  (mouse moved into the polygon)
 */
function highlightFeature(e) {
  var layer = e.target;
  layer.setStyle({
    weight: 5,
    color: '#666',
    dashArray: '',
    fillOpacity: 1.0 // was 0.5
  });

  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    layer.bringToFront();
  }
}

/*
 *  Reset the highlighting
 *  (mouse move out of polygon)
 */
function resetHighlight(e) {
  activeLayer.resetStyle(e.target);
  //info.update();
}

/*
 * Styling of a Geography polygon
 */
function styleGeog(feature) {
  var keys = [];
  for(var k in feature.properties) {
	  keys.push(k);
  };
  if (feature.properties.GEOID == null) {
	  lastIdx = feature.properties.GEO_ID.lastIndexOf("US");
	  feature.properties.GEOID = feature.properties.GEO_ID.slice(lastIdx + 2);
  }
  return {
    weight: 2,
    dashArray: '3',
    opacity: 1,
    color: 'red', // getChoroColor( activeAcsTable, feature.properties.GEOID ),
    fillColor: getChoroColor( activeAcsTable, feature.properties.GEOID ),
    fillOpacity: (getChoroColor === "#ffffff" ? 0.3 : 1.0) // was 0.6
  };
}

/*
 * Return a color for drawing a region
 *  currently bases the color on the length of the Geoid
 */
function getColor(gid) {
  if (gid != null && gid.length > 5) {
    // ACS Tract
    return '#ffa500'; // Orange
  }
  //return '#3388ff'; // Blue
  return '#00ff00';
}

function addTitle (acsRecord) {
	  if (map_title) { map_title.remove(); }
	  
	  map_title = L.control({position: 'topright'});
	  map_title.onAdd=function(map) {
		  var div = L.DomUtil.create('div', 'mapTitle');
		  div.innerHTML = acsRecord.tableParams.tableTitle + " ("+acsRecord.year+")";
		  return div;
	  }
	  map_title.addTo(map_1);
}



/*
 *  Draw chart for data with the specified GEOID
 */
function updateChart(layer) {
  zoomToFeature(layer);
  activeGeoid = layer.target.feature.properties.GEOID;
  drawBarChart(activeAcsTable, activeGeoid, "chart1");
}

/* 
 *   Populate the dropdown list of categories for drawing the trend
 */
function populateTrendList(acsRecord) {
  // First remove any existing items:
  var select = document.getElementById("selectVariable");

  let i;
  for (i = select.options.length - 1; i >= 0; i--) {
    select.remove(i);
  }

  var select = document.getElementById("selectVariable");
  for (i = 0; i < acsRecord.tableParams.groups.length; i++) {
    select.options[select.options.length] =
      new Option(acsRecord.tableParams.groups[i], i, false, false);
  }
}

function zoomToFeature(e) {
  map_1.fitBounds(e.target.getBounds());
}

/*
 *  Enables the ability to draw a trend chart,
 *  then draws the Bar charts
 */
function drawBarChart(acsInfo, geoid, divId) {
  // Allow drawing of trend chart
  document.getElementById("drawTrendChart").disabled = false;

  //    plotAcs(geoid, acsInfo.tableParams, acsInfo.acsData, divId);
  plotAcs(acsInfo, geoid, divId_1);
}

// Filtering parameters obtained from the dropdown lists
var filter_year;
var filter_state;
var filter_geog;
var filter_acs;
var filter_tableId;

/*
 *  Filter the data displayed in the Table based on the filtering criteria
 */
function filterAcsTable() {
  getParams();
  var table = document.getElementById('acsFilesTbl');
  var rows = table.rows;
  var rowcount = rows.length;
  for (var r = 0; r < rowcount; r++) {
    var key = rows[r].id;
    var cf = getAcsTableInfo(key);
    if (cf == null) {
      console.info("Can't find ACS Data for '" + key + "' row "+r);
      continue;
    }
//    console.info("DATA: yr: "+cf.year+" st: "+cf.us_state+" g: "+cf.geog+" a:"+cf.acs+" tid: "+cf.tableId)
//    console.info("FILTER: yr: "+filter_year+" st: "+filter_state+" g: "+filter_geog+" a:"+filter_acs+" tid: "+filter_tableId)
    if ((filter_year == "ALL" || filter_year == cf.year) &&
      (filter_state.toUpperCase() == "ALL" || filter_state == cf.us_state) &&
      (filter_geog == "ALL" || filter_geog == cf.geog) &&
      (filter_acs == "ALL" || filter_acs == cf.acs) &&
      (filter_tableId == "ALL" || filter_tableId == cf.tableId)) {
      rows[r].style.display = 'table-row'; // Show the Row
      console.info("Matched: "+key);
    } else {
      rows[r].style.display = 'none'; // Hide the Row
    }
  }
}

/*
 *  Read the currently selected values on the dropdown
 *  lists used for filtering the table
 */
function getParams() {
  var a;
  a = document.getElementById("selectYear");
  filter_year = a.options[a.selectedIndex].value;
  a = document.getElementById("selectState");
  filter_state = a.options[a.selectedIndex].value.toLowerCase();
  a = document.getElementById("selectGeography");
  filter_geog = a.options[a.selectedIndex].value;
  a = document.getElementById("selectACS");
  filter_acs = a.options[a.selectedIndex].value;
  a = document.getElementById("selectTableId");
  filter_tableId = a.options[a.selectedIndex].value;
}

/*
 *  Search the Array of availableAcsTables for
 *  one with the specified key.
 *  If found, return reference to the object
 *  otherwise, return null
 *  Used to filter the Table of Available ACS Tables
 */
function getAcsTableInfo(key) {
  for (var i = 0; i < availableAcsTables.length; i++) {
    if (key == availableAcsTables[i].key) {
      return availableAcsTables[i];
    }
  }
  return null;
}

/*
 * Removes the current layer
 * Then adds the layer associated with the selected table row.
 */
function updateMap(acsRecord) {
  if (activeLayer != null) {
    activeLayer.remove();
  }

  activeAcsTable = acsRecord; // Set the active ACS table
  activeLayer = activeAcsTable.geogObj.layer; // save layer for removal
  resetAllStyles(activeLayer);
  activeLayer.addTo(map_1);
  map_1.fitBounds(activeLayer.getBounds());
}

/*
 * Create Bar charts for all categories of the selected polygon
 */
function plotAcs(acsInfo, geoid, divId) {
  var row = findRow(acsInfo.acsData, geoid);

  if (row == null || row == -1) {
    console.error("GEOID :" + geoid + " NOT found");
    return;
  }

  // Add 1 to offset to skip "Total"
  var offset = parseInt(acsInfo.tableParams.offset);
  var groupSize = acsInfo.tableParams.groups.length; // 12;
  var nGroup = acsInfo.tableParams.categories.length; // 5;

  var traces = [];
  var catLabels = acsInfo.tableParams.categories;
  var groups = acsInfo.tableParams.groups;

  // If there is more than 1 group, skip the first one since
  // it represents the overall totals and charting them would
  // mess up the scaling charts
  let firstGroup = nGroup > 1 ? 1 : 0;
  for (var group = firstGroup; group < nGroup; group++) {
    var xData = [];
    var yData = [];
    let startIdx = groupSize == 1 ? 0 : 1;
    for (let i = startIdx; i < groupSize; i++) {
      let idx = offset + groupSize * group + i;
      xData.push(groups[i]);
      yData.push(parseFloat(acsInfo.acsData[row][idx]));
    }

    var traceData = {
      x: xData,
      y: yData,
      name: catLabels[group],
      type: "bar"
    };
    traces.push(traceData);
  }
  var myTitle = acsInfo.tableParams.tableTitle +
    " - " + acsInfo.acsData[row][0] +
    " (" + activeAcsTable.year + ")"; // " - Place of Birth by Age";
  var layout = {
    barmode: "group",
    title: {
      text: myTitle
    },
    font: {
      size: 10
    },
    xaxis: {
      title: {
        text: "Age"
      }
    },
    yaxis: {
      title: {
        text: "Frequency"
      }
    },
    height: 250,
//    width: 500,
  };
  Plotly.newPlot(divId, traces, layout, {
    displayModeBar: false
  });
}

/*************************************************************/

/*
 * Draw line charts for changes from minYear to maxYear
 *
 *   1. Check if chart parameters for specific ACS table is available
 *   2. Get array of available ACS table
 *   3. Retrieve ACS tables if not already done
 *        Each retrieval returns a Promisse
 *   4. When all ACS tables retrieved
 *      a. Create arrays need to draw the charts
 *      b. Draw the charts
 */

function drawTimeSeries() {

  var acsRecord = activeAcsTable;

  if (acsRecord.tableParams == null) {
    console.error("No Chart Info for table: " + acsRecord.tableId);
    return;
  }

  // Retrieve array of ACS Tables for creating chart
  let data = getAcsTableList(acsRecord);
  if (data == null) {
    return null;
  }

  /*
   * Get the available ACS tables, retrieve from server if needed
   *  Second parameter of false since don't need JSON Data
   *  activateAcsTable returns a Promise
   */
  var acsTables = [];
  for (let i = 0; i < data.length; i++) {
    acsTables.push(getCSV(data[i]));
  }

  // When all the ACS tables has been received, draw the charts
  Promise.all(acsTables)
    .then(values => {
      // All promises received
      drawLineChart(values, acsRecord);
    })
    .catch(error => {
      console.log("PROMISE ERROR: " + error);
    });
}

/*
 *   Find all acsTables which match the specified table for any year.
 *   Used to create a list of ACS tables for drawing the trend line
 */
function getAcsTableList(acsTbl) {
  let keyA = acsTbl.us_state + ".";
  let keyB = "." + acsTbl.geog +
    "." + acsTbl.acs +
    "." + acsTbl.tableId;

  let csvList = []; // Array to hold list of data available

  for (let year = minYear; year <= maxYear; year++) {
    let key = keyA + year + keyB;
    let cf = findAcsTable(key);
    if (cf == null) {
      console.info("findAcsTable(" + key + ") returned: " + cf);
      continue;
    }
    csvList.push(cf);
  }

  if (csvList.length == 0) {
    console.info("No matches to: " + keyA + "YEAR" + keyB);
    return null;
  }

  return csvList;
}

/*
 *  Search through the array of ACS tables
 *    If found, return reference to the ACS table object
 *    Used to check if it has already been down loaded.
 *    
 *    Uses a linear search. If a large number of ACS table
 *    are used, should sort the array and use a binary search
 */
function findAcsTable(acsKey) {
  for (var i = 0; i < availableAcsTables.length; i++) {
    if (acsKey == availableAcsTables[i].key) {
      return availableAcsTables[i];
    }
  }

  return null;
}

/*
 *  Create the trend chart
 *  data is an array of chart information
 * 
 */
function drawLineChart(data, acsRecord) {
  data.sort(function (a, b) {
    return (a.year - b.year);
  });

  var offset = parseInt(acsRecord.tableParams.offset);
  var groupSize = acsRecord.tableParams.groups.length; // 12;
  var nGroup = acsRecord.tableParams.categories.length; // 5;

  var traces = [];
  var years = [];

  for (var grp = 1; grp < nGroup; grp++) {
    traces.push([]); // Create array of arrays
  }
  var row = 0;

  let a = getTrendCategory();
  offset += a;
  for (var yr = 0; yr < data.length; yr++) {
    cd = data[yr];

    years.push(data[yr].year);

    if (cd.acsData == null) {
      console.info("Missing acsData")
    }
    var key = cd.us_state + "." + cd.year + "." + cd.geog +
      "." + cd.acs + "." + cd.tableId;
    if (data[yr].acsData == null) {
      console.error("MISSING ACS DATA FOR: " + cd.year);
      continue;
    }
    row = findRow(cd.acsData, activeGeoid);
    if (row == null) {
      console.info("MISSING DATA FOR YEAR " + cd.year + " GEOID: " + activeGeoid)
      continue;
    }
    for (grp = 1; grp < nGroup; grp++) {
      var idx = offset + groupSize * grp;
      traces[grp - 1].push(cd.acsData[row][idx]);
    }
  }

  var series = [];

  for (i = 0; i < traces.length; i++) {
    var trace = {
      x: years,
      y: traces[i],
      type: 'scatter',
      name: acsRecord.tableParams.categories[i + 1]
    };
    series.push(trace);
  }

  var myTitle = acsRecord.tableParams.tableTitle +
    " (" + acsRecord.tableParams.groups[offset - parseInt(acsRecord.tableParams.offset)] + ") - " +
    data[data.length - 1].acsData[row][0] +
    " (" + data[0].year + "-" + data[data.length - 1].year + ")";
  var layout = {
    title: {
      text: myTitle
    },
    font: {
      size: 10
    },
    xaxis: {
      title: 'Year'
    },
    yaxis: {
      title: acsRecord.tableParams.groups[0]
    },
    height: 250,
//    width: 500
  };

  Plotly.newPlot(divId_2, series, layout);
}

/*
 * Find the currently  selected value in the "trend"
 * dropdown list. Will be used to determine what is
 * displayed in the trend chart
 */
function getTrendCategory() {
  let a = document.getElementById("selectVariable");
  return parseInt(a.options[a.selectedIndex].value);

}

/*
 * Find a row in the ACS Table with the give key (GEOID)
 */
function findRow(acsTable, key) {
  if (acsTable == null) {
    console.info("Must load CSV data before selecting region");
    return null;
  }

  for (var row = 0; row < acsTable.length; row++) {
    if (key != acsTable[row][1]) {
      continue;
    }
    return row;
  }

  console.info("KEY ("+key+") NOT FOUND");
//  console.trace();
  return -1;
}

/*
 * Change color when user hovers over a polygon
 */
$("tr").hover(function () {
  $(this).addClass("blue");
}, function () {
  $(this).removeClass("blue");
});

/*
 *  Clear the filters by resetting all selected values to "ALL"
 *  Then filter the data
 */
function clearFilters() {
  document.getElementById("selectState").value = "ALL";
  document.getElementById("selectYear").value = "ALL";
  document.getElementById("selectGeography").value = "ALL";
  document.getElementById("selectACS").value = "ALL";
  document.getElementById("selectTableId").value = "ALL";

  filterAcsTable();
}

/* **************************************************************/

/********************   Choropleth Map   ************************/

/*
 *  Procedure

 *  1. Whenever an ACS table is loaded, determine the breaks associated
 *     with the table.
 *  2. How many "groups" of data are there
 *     a. 1 group => use values in first 'data' column (offset)
 *     b. >1 group => use percent (total of first group) / (overall total)
 *  3. Determine Jenks break points
 *  4. The getColor uses the breaks. 
 */

// Global variable for Choropleth map
var data_min = Infinity;
var data_max = -Infinity;
var choro_interval = null;
var num_choropleth_colors = 5;

//Colors from: http://colorbrewer2.org/
//var RdYlGn = [
//  ["#fc8d59","#91cf60"],
//  ["#fc8d59","#ffffbf","#91cf60"],
//  ["#d7191c","#fdae61","#a6d96a","#1a9641"],
//  ["#d7191c","#fdae61","#ffffbf","#a6d96a","#1a9641"],
//  ["#d73027","#fc8d59","#fee08b","#d9ef8b","#91cf60","#1a9850"],
//  ["#d73027","#fc8d59","#fee08b","#ffffbf","#d9ef8b","#91cf60","#1a9850"],
//  ["#d73027","#f46d43","#fdae61","#fee08b","#d9ef8b","#a6d96a","#66bd63","#1a9850"],
//  ["#d73027","#f46d43","#fdae61","#fee08b","#ffffbf","#d9ef8b","#a6d96a","#66bd63","#1a9850"],
//  ["#a50026","#d73027","#f46d43","#fdae61","#fee08b","#d9ef8b","#a6d96a","#66bd63","#1a9850","#006837"],
//  ["#a50026","#d73027","#f46d43","#fdae61","#fee08b","#ffffbf","#d9ef8b","#a6d96a","#66bd63","#1a9850","#006837"]
//];

var YlGn = [
  ["#ffffe5","#004529"],
  ["#f7fcb9","#addd8e","#31a354"],
  ["#ffffcc","#c2e699","#78c679","#238443"],
  ["#ffffcc","#c2e699","#78c679","#31a354","#006837"],
  ["#ffffcc","#d9f0a3","#addd8e","#78c679","#31a354","#006837"],
  ["#ffffcc","#d9f0a3","#addd8e","#78c679","#41ab5d","#238443","#005a32"],
  ["#ffffe5","#f7fcb9","#d9f0a3","#addd8e","#78c679","#41ab5d","#238443","#005a32"],
  ["#ffffe5","#f7fcb9","#d9f0a3","#addd8e","#78c679","#41ab5d","#238443","#006837","#004529"]
];

var mapColors = YlGn;
var choro_colors = mapColors[num_choropleth_colors];

/*
 * Returns a value to use for determining which color
 * to select. The returned value is compared with the
 * breakpoints
 */
function get_choropleth_value( acsRecord, row ) {
	if ( row == null || row == -1 ) {
		console.info("Non-existent Row");
		return null;
	}
	// Make sure there is an associated tableParameters record
	if (acsRecord.tableParams == null) {
		console.info("No associated table Parameters record, get_choropleth_value");
		return null;
	}
	if (acsRecord.acsData == null) {
		console.info("No associated ACS record, set Choropleth Colors");
		return null;
	}
	
	let data = acsRecord.acsData;
	let offset = parseInt(acsRecord.tableParams.offset);

	let choroIdx = acsRecord.tableParams.choroIdx;
	
	if (!choroIdx) {
		// Using just the "total"
		return parseFloat(data[row][offset]);
	} else if ( choroIdx.length == 1 ) {
		// Using just the specified value
		return parseFloat(data[row][offset+parseInt(choroIdx[0])]);
	}
	
	// Calculate a percentage
	let sum = 0;
	for (let i = 1; i < choroIdx.length; i++) {
		sum += parseFloat(data[row][offset+parseInt(choroIdx[i])]);
	}
	return (100*sum/parseFloat(data[row][offset+parseInt(choroIdx[0])]));	
}

/*
 * Determines what color set to use and the breakpoints
 * based on the "Total" column in the data.
 * Uses Jenks breaks
 */
function set_choropleth_colors( acsRecord ) {
	// Make sure there is an associated tableParameters record
	if (acsRecord == null) {
		console.info("No acsRecord for obtaining color");
		return;
	}
	if (acsRecord.tableParams == null) {
		console.info("No associated table Parameters record");
		return;
	}
	if (acsRecord.acsData == null) {
		console.info("No associated ACS record");
		return;
	}

	let offset = parseInt(acsRecord.tableParams.offset);

	data_min = Infinity;
	data_max = -Infinity;
	
	let data = [];
	for (let row = 0; row < acsRecord.acsData.length; row++) {
		let value = get_choropleth_value( acsRecord, row );
		if (value == -1) {
			continue;
		}
		if (typeof value === 'string') { value = parseFloat(value); }
		data.push(value);
		if ( value < data_min ) { data_min = value; }
		if ( value > data_max ) { data_max = value; }
	}

	let n_breaks = (acsRecord.tableParams.groups.length < num_choropleth_colors)
	    ? (acsRecord.tableParams.groups.length) : num_choropleth_colors;
	n_breaks = num_choropleth_colors+1;
	try {
//	console.info("Data for Jenks: "+data);
	acsRecord.breaks = jenks(data, n_breaks);
	} catch (err) {

		var range = data_max - data_min;
		var interval = range/n_breaks;
		acsRecord.breaks = [];
		for (let i = 0; i < n_breaks+1; i++) {
			acsRecord.breaks.push(data_min+i*interval);
		}
	} 
	console.info("Jenks Breaks: " + acsRecord.breaks + " #: "+acsRecord.breaks.length);
}

/*
 *  Returns a color for a specified GEOID (row) in the 
 *  ACS record
 */
function getChoroColor( acsRecord, geoid ) {

	if (geoid == null) {
		console.info("getChoroColor missing geoid: ");
		console.trace();
		return '#3388ff'; // Blue
	}
	if ((acsRecord == null) || (acsRecord.acsData == null) || (acsRecord.breaks == null)) {
		console.trace();

		if (acsRecord == null) {
			console.info("NULL: acsRecord: "+acsRecord);
		} else if (acsRecord.acsData == null) {
			console.info("NULL: acsRecord.acsData: "+acsRecord.acsData+" for "+acsRecord.fullpath);
		} else if (acsRecord.breaks == null) {
			console.info("NULL: acsRecord.break: "+acsRecord.breaks);
		}
		
		if (geoid != null && geoid.length > 5) {
			// ACS Tract
			return '#ffa500'; // Orange
		}
		//return '#3388ff'; // Blue
		return '#00ff00';
	}
	
	let row = findRow(acsRecord.acsData, geoid)

	if (row == -1) {
		return "#ffffff";
	}
	let value = get_choropleth_value( acsRecord, row );
	
	if (value == -1) {
		return "#ffffff";
	}
	
	let choro_colors = mapColors[acsRecord.breaks.length-3];
	for (let i = 1; i < acsRecord.breaks.length; i++) {
		if (value < acsRecord.breaks[i]) {
			return choro_colors[i-1];
		}
	}
	
	return choro_colors[choro_colors.length-1];
}

/*
 * Adds a legend to the map.
 */
function addLegend (acsRecord) {
   if (legend) { legend.remove(); }
	  
   legend = L.control({position: 'bottomright'});
   legend.onAdd=function(map) {
   var div = L.DomUtil.create('div', 'info legend'),
   grades = [],
   labels = [];

   legendTitle = getLegendTitle(acsRecord);
   div.innerHTML = '<p class="legendTitle">'+legendTitle+'</p>';
    // loop through our density intervals and generate a label with a colored square for each interval
   let breaks = acsRecord.breaks;
   let i = 0;
   for (i = 0; i < breaks.length-1; i++) {
      let lowerLimit = breaks[i] ? (breaks[i]).toFixed(1).toString() : null;
      let upperLimit = "breaks[i+1]: "+(i<length-1) ? (breaks[i+1]).toFixed(1).toString() : null;
      div.innerHTML += '<i style="background:' + choro_colors[i] + '"></i> '
            + lowerLimit 
            + (upperLimit ? '&ndash;' + upperLimit + '<br>' : '+');
      }
      return div;
   }
   legend.addTo(map_1);
}

/*
 * Creates the title for the legend
 */
function getLegendTitle(acsRecord) {
	let tableInfo = acsRecord.tableParams;
	if ( !tableInfo ) {
		return "Missing table info";
	}
	if ( !tableInfo.legendTitle ) {
		return "Missing LegendTitle";
	}

	return( tableInfo.legendTitle);
}

/*
 * Reset the style for all layers
 */
function resetAllStyles(layers) {
	layers.eachLayer(function (layer) {
		layers.resetStyle(layer);
        layer.bindPopup( popupText(layer.feature.properties.GEOID) );
//	    layer.bindPopup('<pre>'+JSON.stringify(layer.features.properties,null,' ').replace(/[\{\}"]/g,'')+'</pre>');

	});
}

// The following is from: https://gist.github.com/tmcw/4977508
//  Downloaded 11/24/2019
//
// # [Jenks natural breaks optimization](http://en.wikipedia.org/wiki/Jenks_natural_breaks_optimization)
//
// Implementations: [1](http://danieljlewis.org/files/2010/06/Jenks.pdf) (python),
// [2](https://github.com/vvoovv/djeo-jenks/blob/master/main.js) (buggy),
// [3](https://github.com/simogeo/geostats/blob/master/lib/geostats.js#L407) (works)
function jenks(data, n_classes) {

    // Compute the matrices required for Jenks breaks. These matrices
    // can be used for any classing of data with `classes <= n_classes`
    function getMatrices(data, n_classes) {

        // in the original implementation, these matrices are referred to
        // as `LC` and `OP`
        //
        // * lower_class_limits (LC): optimal lower class limits
        // * variance_combinations (OP): optimal variance combinations for all classes
        var lower_class_limits = [],
            variance_combinations = [],
            // loop counters
            i, j,
            // the variance, as computed at each step in the calculation
            variance = 0;

        // Initialize and fill each matrix with zeroes
        for (i = 0; i < data.length + 1; i++) {
            var tmp1 = [], tmp2 = [];
            for (j = 0; j < n_classes + 1; j++) {
                tmp1.push(0);
                tmp2.push(0);
            }
            lower_class_limits.push(tmp1);
            variance_combinations.push(tmp2);
        }

        for (i = 1; i < n_classes + 1; i++) {
            lower_class_limits[1][i] = 1;
            variance_combinations[1][i] = 0;
            // in the original implementation, 9999999 is used but
            // since Javascript has `Infinity`, we use that.
            for (j = 2; j < data.length + 1; j++) {
                variance_combinations[j][i] = Infinity;
            }
        }

        for (var l = 2; l < data.length + 1; l++) {

            // `SZ` originally. this is the sum of the values seen thus
            // far when calculating variance.
            var sum = 0,
                // `ZSQ` originally. the sum of squares of values seen
                // thus far
                sum_squares = 0,
                // `WT` originally. This is the number of
                w = 0,
                // `IV` originally
                i4 = 0;

            // in several instances, you could say `Math.pow(x, 2)`
            // instead of `x * x`, but this is slower in some browsers
            // introduces an unnecessary concept.
            for (var m = 1; m < l + 1; m++) {

                // `III` originally
                var lower_class_limit = l - m + 1,
                    val = data[lower_class_limit - 1];

                // here we're estimating variance for each potential classing
                // of the data, for each potential number of classes. `w`
                // is the number of data points considered so far.
                w++;

                // increase the current sum and sum-of-squares
                sum += val;
                sum_squares += val * val;

                // the variance at this point in the sequence is the difference
                // between the sum of squares and the total x 2, over the number
                // of samples.
                variance = sum_squares - (sum * sum) / w;

                i4 = lower_class_limit - 1;

                if (i4 !== 0) {
                    for (j = 2; j < n_classes + 1; j++) {
                        // if adding this element to an existing class
                        // will increase its variance beyond the limit, break
                        // the class at this point, setting the lower_class_limit
                        // at this point.
                        if (variance_combinations[l][j] >=
                            (variance + variance_combinations[i4][j - 1])) {
                            lower_class_limits[l][j] = lower_class_limit;
                            variance_combinations[l][j] = variance +
                                variance_combinations[i4][j - 1];
                        }
                    }
                }
            }

            lower_class_limits[l][1] = 1;
            variance_combinations[l][1] = variance;
        }

        // return the two matrices. for just providing breaks, only
        // `lower_class_limits` is needed, but variances can be useful to
        // evaluage goodness of fit.
        return {
            lower_class_limits: lower_class_limits,
            variance_combinations: variance_combinations
        };
    }



    // the second part of the jenks recipe: take the calculated matrices
    // and derive an array of n breaks.
    function breaks(data, lower_class_limits, n_classes) {

        var k = data.length - 1,
            kclass = [],
            countNum = n_classes;

        // the calculation of classes will never include the upper and
        // lower bounds, so we need to explicitly set them
        kclass[n_classes] = data[data.length - 1];
        kclass[0] = data[0];

        // the lower_class_limits matrix is used as indexes into itself
        // here: the `k` variable is reused in each iteration.
        while (countNum > 1) {
            kclass[countNum - 1] = data[lower_class_limits[k][countNum] - 2];
            k = lower_class_limits[k][countNum] - 1;
            countNum--;
        }

        return kclass;
    }

    if (n_classes > data.length) return null;

    // sort data in numerical order, since this is expected
    // by the matrices function
    data = data.slice().sort(function (a, b) { return a - b; });

    // get our basic matrices
    var matrices = getMatrices(data, n_classes),
        // we only need lower class limits here
        lower_class_limits = matrices.lower_class_limits;

    // extract n_classes out of the computed matrices
    return breaks(data, lower_class_limits, n_classes);

}
