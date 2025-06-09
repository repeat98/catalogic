/************************************************************************************/
/**                           Your Original Script + Spectral Columns              **/
/************************************************************************************/

const { app, BrowserWindow, ipcMain, dialog, session } = require("electron");
const { spawn } = require("child_process");
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const port = 3000;

const expressApp = express();

// Initialize the Express app with middleware
expressApp.use(express.json({ limit: "1024mb" })); // Increase payload limit
expressApp.use(cors());

// Get the path to the user's data directory
const appPath = app.getAppPath();
const parentPath = path.dirname(appPath);

// Paths for development
const dbPath = path.resolve(appPath, "db/tracks.db");
const scriptPath = path.join(appPath, "scripts", "analyze.py");
const pythonPath = path.join(appPath, "scripts", "venv", "bin", "python");
const extractArtworksPath = path.join(
  appPath,
  "scripts",
  "extract_artworks.py"
);

// Paths for packaging (commented out for development)
// const dbPath = path.resolve(parentPath, "app.asar.unpacked/db/tracks.db");
// const scriptPath = path.join(
//   parentPath,
//   "app.asar.unpacked",
//   "scripts",
//   "analyze.py"
// );
// const pythonPath = path.join(
//   parentPath,
//   "app.asar.unpacked",
//   "scripts",
//   "venv",
//   "bin",
//   "python"
// );
// const extractArtworksPath = path.join(
//   parentPath,
//   "app.asar.unpacked",
//   "scripts",
//   "extract_artworks.py"
// );

const analyzeBinaryPath = path.join(appPath, "scripts", "analyze"); // Ensure correct path

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Database connection error:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
    // Initialize the database schema
    initDatabase();
  }
});

// Define the waveforms directory
const waveformsDir = path.join(__dirname, "waveforms");

// Ensure the waveforms directory exists
if (!fs.existsSync(waveformsDir)) {
  fs.mkdirSync(waveformsDir, { recursive: true });
  console.log(`Created waveforms directory at ${waveformsDir}`);
} else {
  console.log(`Waveforms directory already exists at ${waveformsDir}`);
}

let mainWindow;

// Create the main application window
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 22, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // Use the preload script
      contextIsolation: true, // Ensure context isolation is enabled
      nodeIntegration: false, // Ensure nodeIntegration is disabled
    },
  });

  mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
};

app.whenReady().then(() => {
  // Configure session headers with a more secure CSP
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self';" +
          "script-src 'self' 'unsafe-inline';" + // Removed unsafe-eval
          "style-src 'self' 'unsafe-inline';" +
          "img-src 'self' data: http://localhost:3000 blob: file:;" +
          "media-src 'self' http://localhost:3000 blob: file: data:;" +
          "worker-src 'self' blob:;" +
          "child-src 'self' blob:;" +
          "connect-src 'self' http://localhost:3000 data: blob:;"
        ]
      }
    });
  });

  createWindow();
  initRoutes();

  // IPC Handlers
  ipcMain.handle("open-file-dialog", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile", "openDirectory", "multiSelections"], // Allow selecting files, directories, and multiple files
      filters: [
        {
          name: "Audio Files",
          extensions: [
            "wav",
            "mp3",
            "flac",
            "m4a",
            "aiff",
            "aif",
            "ogg",
            "opus",
            "wma",
            "aac",
          ],
        },
      ],
    });
    return result.filePaths; // Return an array of file paths
  });

  ipcMain.handle("get-file-path", async (event, fileName) => {
    // Optionally, perform operations or validations here
    return path.resolve(fileName); // Resolve the path if needed
  });

  // Handle IPC communication for extracting artworks
  ipcMain.handle("extract-artworks", async (event, filePath) => {
    return new Promise((resolve, reject) => {
      const extractArtworks = spawn(pythonPath, [
        extractArtworksPath,
        filePath,
      ]);

      let output = "";
      let error = "";

      extractArtworks.stdout.on("data", (data) => {
        output += data.toString();
      });

      extractArtworks.stderr.on("data", (data) => {
        error += data.toString();
      });

      extractArtworks.on("close", (code) => {
        if (code === 0) {
          resolve(output); // Or parse as needed
        } else {
          reject(`Python script exited with code ${code}: ${error}`);
        }
      });
    });
  });

  // Handle IPC communication for running the analyze script
  ipcMain.handle("run-python-script", async (event, filePath) => {
    return new Promise((resolve, reject) => {
      // Spawn the binary process with the filePath as an argument
      const analyzeProcess = spawn(analyzeBinaryPath, [
        filePath,
        "--threads",
        "4",
        "--plot", // Include the --plot flag if needed
      ]);

      let output = "";
      let errorOutput = "";
      const outputBuffer = [];
      const intervalMs = 1000; // Adjust the interval as needed

      // Set up an interval to send updates to the renderer
      const intervalId = setInterval(() => {
        if (outputBuffer.length > 0) {
          console.log("Sending output to renderer:", outputBuffer.join("")); // Debugging
          event.sender.send("python-output", outputBuffer.join(""));
          outputBuffer.length = 0; // Clear buffer after sending
        }
      }, intervalMs);

      // Handle stdout stream
      analyzeProcess.stdout.on("data", (data) => {
        output += data.toString();
        outputBuffer.push(data.toString()); // Add data to the buffer
      });

      // Handle stderr stream
      analyzeProcess.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      // Handle process close event
      analyzeProcess.on("close", (code) => {
        clearInterval(intervalId); // Clear the interval when process closes
        if (code === 0) {
          console.log("Final output sent to renderer:", output); // Debugging
          event.sender.send("python-output", output);
          resolve(output.trim());
        } else {
          console.error("Final error sent to renderer:", errorOutput); // Debugging
          event.sender.send("python-error", errorOutput);
          reject(
            new Error(`Process exited with code ${code}: ${errorOutput.trim()}`)
          );
        }
      });

      // Handle process error event
      analyzeProcess.on("error", (err) => {
        clearInterval(intervalId); // Clear the interval on error
        console.error("Error in analyze process:", err.message); // Debugging
        event.sender.send(
          "python-error",
          `Failed to start analyze process: ${err.message}`
        );
        reject(new Error(`Failed to start analyze process: ${err.message}`));
      });
    });
  });
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Initialize the database schema
function initDatabase() {
  // Create crates table if it doesn't exist
  const createCratesTableQuery = `
    CREATE TABLE IF NOT EXISTS crates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tracks TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  db.run(createCratesTableQuery, (err) => {
    if (err) {
      console.error("Error creating crates table:", err.message);
    } else {
      console.log("Crates table created or already exists.");
    }
  });

  // Create tags table if it doesn't exist
  const createTagsTableQuery = `
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tracks TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  db.run(createTagsTableQuery, (err) => {
    if (err) {
      console.error("Error creating tags table:", err.message);
    } else {
      console.log("Tags table created or already exists.");
    }
  });

  // Check if new columns exist in 'classified_tracks' table
  const checkColumnsQuery = "PRAGMA table_info(classified_tracks);";
  db.all(checkColumnsQuery, [], (err, columns) => {
    if (err) {
      console.error("Error retrieving table info:", err.message);
      return;
    }
    const columnNames = columns.map((column) => column.name);
    const newColumns = [
      // Spectral features
      { name: "atonal", type: "REAL" },
      { name: "tonal", type: "REAL" },
      { name: "dark", type: "REAL" },
      { name: "bright", type: "REAL" },
      { name: "percussive", type: "REAL" },
      { name: "smooth", type: "REAL" },
      { name: "lufs", type: "TEXT" },
      // Mood features
      { name: "happiness", type: "REAL" },
      { name: "party", type: "REAL" },
      { name: "aggressive", type: "REAL" },
      { name: "danceability", type: "REAL" },
      { name: "relaxed", type: "REAL" },
      { name: "sad", type: "REAL" },
      { name: "engagement", type: "REAL" },
      { name: "approachability", type: "REAL" }
    ];

    const addColumnPromises = newColumns.map((column) => {
      return new Promise((resolve, reject) => {
        if (!columnNames.includes(column.name)) {
          const addColumnQuery = `ALTER TABLE classified_tracks ADD COLUMN ${column.name} ${column.type} DEFAULT NULL;`;
          db.run(addColumnQuery, [], (err) => {
            if (err) {
              console.error(`Error adding ${column.name} column:`, err.message);
              reject(err);
            } else {
              console.log(`Added ${column.name} column to classified_tracks table.`);
              resolve();
            }
          });
        } else {
          console.log(`${column.name} column already exists in classified_tracks table.`);
          resolve();
        }
      });
    });

    Promise.all(addColumnPromises)
      .then(() => {
        console.log("Database schema updated successfully.");
      })
      .catch((err) => {
        console.error("Error adding new columns:", err.message);
      });
  });
}

// Initialize Express routes
function initRoutes() {
  // Route to get all classified tracks
  expressApp.get("/tracks", (req, res) => {
    const checkTableQuery = `
      SELECT name FROM sqlite_master WHERE type='table' AND name='classified_tracks';
    `;

    db.get(checkTableQuery, (err, row) => {
      if (err) {
        console.error("SQL Error:", err.message);
        res.status(500).json({ error: "Failed to check if table exists" });
        return;
      }

      if (!row) {
        // Table does not exist
        res.status(404).json({ error: "Table classified_tracks does not exist" });
        return;
      }

      // Table exists, proceed with retrieving tracks
      const query = `
        SELECT id, path, artist, title, album, year, bpm, time, key, date,
               style_features, instrument_features, mood_features,
               artwork_path, artwork_thumbnail_path,
               atonal, tonal, dark, bright,
               percussive, smooth, lufs
        FROM classified_tracks
        ORDER BY id ASC
      `;

      db.all(query, [], (err, rows) => {
        if (err) {
          console.error("SQL Error:", err.message);
          res.status(500).json({ error: "Failed to retrieve tracks" });
          return;
        }
        // Parse the feature JSON strings or Buffers into objects for each track
        const parseJsonField = (field, trackId, fieldName) => {
          if (!field) return null;
          try {
            let str;
            if (Buffer.isBuffer(field)) {
              str = field.toString('utf-8').trim();
            } else if (typeof field === 'string') {
              str = field.trim();
            } else {
              return null;
            }

            str = str.replace(/^[^\[{]*/, ''); // Remove anything before the first [ or {
            const arrayStart = str.indexOf('[');
            const arrayEnd = str.lastIndexOf(']');
            if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
              const jsonArrayStr = str.substring(arrayStart, arrayEnd + 1);
              return JSON.parse(jsonArrayStr);
            }
            // Fallback: try to parse as is
            return JSON.parse(str);
          } catch (e) {
            console.error(`Failed to parse ${fieldName} for track ID ${trackId}:`, e);
            return null;
          }
        };
        const tracksWithParsedFeatures = rows.map(track => {
          const style = parseJsonField(track.style_features, track.id, 'style_features');
          const instrument = parseJsonField(track.instrument_features, track.id, 'instrument_features');
          const mood = parseJsonField(track.mood_features, track.id, 'mood_features');
          // Flatten all features
          if (style && typeof style === 'object') {
            Object.entries(style).forEach(([k, v]) => { track[k] = v; });
          }
          if (instrument && typeof instrument === 'object') {
            Object.entries(instrument).forEach(([k, v]) => { track[k] = v; });
          }
          if (mood && typeof mood === 'object') {
            Object.entries(mood).forEach(([k, v]) => { track[k] = v; });
          }
          return {
            ...track,
            style_features: style,
            instrument_features: instrument,
            mood_features: mood
          };
        });
        res.json(tracksWithParsedFeatures);
      });
    });
  });

  expressApp.post("/recommend", (req, res) => {
    const queryVector = req.body.vector; // Expect a JSON array representing your query embedding.
    if (!queryVector || !Array.isArray(queryVector)) {
      return res.status(400).json({ error: "Invalid query vector" });
    }

    // Path to your Python recommendation script
    const scriptPath = path.join(
      __dirname,
      "scripts",
      "query_recommendations.py"
    );

    // Pass the query vector as a JSON string argument
    const pythonProcess = spawn("python3", [
      scriptPath,
      JSON.stringify({ vector: queryVector }),
    ]);

    let output = "";
    let errorOutput = "";

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          res.json(result);
        } catch (err) {
          res.status(500).json({ error: "Failed to parse recommendations" });
        }
      } else {
        res.status(500).json({ error: errorOutput || "Python process error" });
      }
    });
  });

  // Route to get a track by ID
  expressApp.get("/tracks/:id", (req, res) => {
    const trackId = req.params.id;

    const query = `
      SELECT id, path, artist, title, album, year, BPM, TIME, KEY, DATE,
             artwork_path, artwork_thumbnail_path,
             style_features, instrument_features, mood_features,
             atonal, tonal, dark, bright,
             percussive, smooth, lufs
      FROM classified_tracks
      WHERE id = ?
    `;

    db.get(query, [trackId], (err, row) => {
      if (err) {
        console.error("SQL Error:", err.message);
        res.status(500).json({ error: "Failed to retrieve track" });
        return;
      }

      if (!row) {
        res.status(404).json({ error: "Track not found" });
        return;
      }

      // Parse JSON fields
      try {
        row.style_features = row.style_features ? JSON.parse(row.style_features) : null;
        row.instrument_features = row.instrument_features ? JSON.parse(row.instrument_features) : null;
        row.mood_features = row.mood_features ? JSON.parse(row.mood_features) : null;
      } catch (e) {
        console.error(`Error parsing features for track ID ${row.id}:`, e);
        row.style_features = null;
        row.instrument_features = null;
        row.mood_features = null;
      }

      res.json(row);
    });
  });

  // Crate management routes
  
  // Get all crates
  expressApp.get("/crates", (req, res) => {
    const query = `
      SELECT id, name, tracks, created_at, updated_at
      FROM crates
      ORDER BY created_at DESC
    `;

    db.all(query, [], (err, rows) => {
      if (err) {
        console.error("SQL Error:", err.message);
        res.status(500).json({ error: "Failed to retrieve crates" });
        return;
      }

      // Parse tracks JSON and format for client
      const crates = {};
      rows.forEach(row => {
        try {
          crates[row.id] = {
            id: row.id,
            name: row.name,
            tracks: row.tracks ? JSON.parse(row.tracks) : [],
            created_at: row.created_at,
            updated_at: row.updated_at
          };
        } catch (e) {
          console.error(`Error parsing tracks for crate ID ${row.id}:`, e);
          crates[row.id] = {
            id: row.id,
            name: row.name,
            tracks: [],
            created_at: row.created_at,
            updated_at: row.updated_at
          };
        }
      });

      res.json(crates);
    });
  });

  // Create a new crate
  expressApp.post("/crates", (req, res) => {
    const { name, tracks = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Crate name is required" });
    }

    const query = `
      INSERT INTO crates (name, tracks, created_at, updated_at)
      VALUES (?, ?, datetime('now'), datetime('now'))
    `;

    db.run(query, [name.trim(), JSON.stringify(tracks)], function(err) {
      if (err) {
        console.error("SQL Error:", err.message);
        res.status(500).json({ error: "Failed to create crate" });
        return;
      }

      res.json({
        id: this.lastID,
        name: name.trim(),
        tracks,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });
  });

  // Update a crate
  expressApp.put("/crates/:id", (req, res) => {
    const crateId = req.params.id;
    const { name, tracks } = req.body;

    let updates = [];
    let values = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name.trim());
    }

    if (tracks !== undefined) {
      updates.push("tracks = ?");
      values.push(JSON.stringify(tracks));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No updates provided" });
    }

    updates.push("updated_at = datetime('now')");
    values.push(crateId);

    const query = `
      UPDATE crates 
      SET ${updates.join(", ")}
      WHERE id = ?
    `;

    db.run(query, values, function(err) {
      if (err) {
        console.error("SQL Error:", err.message);
        res.status(500).json({ error: "Failed to update crate" });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({ error: "Crate not found" });
        return;
      }

      res.json({ success: true });
    });
  });

  // Delete a crate
  expressApp.delete("/crates/:id", (req, res) => {
    const crateId = req.params.id;

    const query = "DELETE FROM crates WHERE id = ?";

    db.run(query, [crateId], function(err) {
      if (err) {
        console.error("SQL Error:", err.message);
        res.status(500).json({ error: "Failed to delete crate" });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({ error: "Crate not found" });
        return;
      }

      res.json({ success: true });
    });
  });

  // Route to add a new classified track
  expressApp.post("/tracks", (req, res) => {
    const {
      path,
      artist,
      title,
      album,
      year,
      BPM,
      TIME,
      KEY,
      DATE,
      style_features,
      instrument_features,
      mood_features,
      artwork_path,
      artwork_thumbnail_path,
      atonal,
      tonal,
      dark,
      bright,
      percussive,
      smooth,
      lufs
    } = req.body;

    const sql = `
      INSERT INTO classified_tracks (
        path, artist, title, album, year, BPM, TIME, KEY, DATE,
        style_features, instrument_features, mood_features,
        artwork_path, artwork_thumbnail_path,
        atonal, tonal, dark, bright,
        percussive, smooth, lufs
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(
      sql,
      [
        path,
        artist,
        title,
        album,
        year,
        BPM,
        TIME,
        KEY,
        DATE,
        style_features,
        instrument_features,
        mood_features,
        artwork_path,
        artwork_thumbnail_path,
        atonal,
        tonal,
        dark,
        bright,
        percussive,
        smooth,
        lufs
      ],
      function (err) {
        if (err) {
          console.error("SQL Error:", err.message);
          res.status(500).json({ error: "Failed to insert track" });
          return;
        }
        res.status(201).json({ id: this.lastID });
      }
    );
  });

  // Route to delete a track by ID
  expressApp.delete("/tracks/:id", (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM classified_tracks WHERE id = ?", [id], function (err) {
      if (err) {
        console.error("SQL Error:", err.message);
        res.status(500).json({ error: "Failed to delete track" });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: "Track not found" });
        return;
      }
      res.json({ message: "Track deleted successfully" });
    });
  });

  // Route to update tags for a specific track
  expressApp.put("/tracks/:id/tags", (req, res) => {
    const trackId = req.params.id;
    const { tags } = req.body; // Expecting an array of tags

    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({ error: "Tags must be an array" });
    }

    if (tags.length > 10) {
      return res
        .status(400)
        .json({ error: "A maximum of 10 tags are allowed" });
    }

    // Prepare tag1 to tag10 fields
    const tagFields = Array(10).fill(null);
    tags.forEach((tag, index) => {
      tagFields[index] = tag;
    });

    // Construct the SQL query dynamically based on the number of tags
    let sql = `
      UPDATE classified_tracks
      SET tag1 = ?, tag2 = ?, tag3 = ?, tag4 = ?, tag5 = ?, tag6 = ?, tag7 = ?, tag8 = ?, tag9 = ?, tag10 = ?
      WHERE id = ?
    `;
    db.run(
      sql,
      [
        ...tagFields,
        trackId,
      ],
      function (err) {
        if (err) {
          console.error("SQL Error:", err.message);
          res.status(500).json({ error: "Failed to update tags" });
          return;
        }
        res.json({ message: "Tags updated successfully" });
      }
    );
  });

  // Route to serve audio files
  expressApp.get("/audio/:id", (req, res) => {
    const trackId = req.params.id;
    
    // Query the database to get the track's path
    const query = "SELECT path FROM classified_tracks WHERE id = ?";
    
    db.get(query, [trackId], (err, row) => {
      if (err) {
        console.error("SQL Error:", err.message);
        res.status(500).json({ error: "Failed to retrieve track path" });
        return;
      }

      if (!row || !row.path) {
        res.status(404).json({ error: "Track not found or no path available" });
        return;
      }

      // Check if the file exists
      if (!fs.existsSync(row.path)) {
        res.status(404).json({ error: "Audio file not found" });
        return;
      }

      // Get file stats
      const stat = fs.statSync(row.path);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        // Handle range requests for streaming
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(row.path, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'audio/mpeg',
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        // Handle full file requests
        const head = {
          'Content-Length': fileSize,
          'Content-Type': 'audio/mpeg',
        };
        res.writeHead(200, head);
        fs.createReadStream(row.path).pipe(res);
      }
    });
  });

  // Route to get cached waveform
  expressApp.get("/waveforms/:id", (req, res) => {
    const trackId = req.params.id;
    const waveformPath = path.join(waveformsDir, `${trackId}.json`);
    
    try {
      if (fs.existsSync(waveformPath)) {
        const waveformData = fs.readFileSync(waveformPath, 'utf8');
        const parsedData = JSON.parse(waveformData);
        
        // Validate the cached data
        if (parsedData && Array.isArray(parsedData.peaks) && parsedData.peaks.length > 0) {
          console.log('Serving cached waveform for track', trackId, 'Size:', parsedData.peaks.length);
          res.json(parsedData);
        } else {
          console.error('Invalid waveform data format for track', trackId, 'Data:', parsedData);
          res.status(404).json({ error: "Invalid waveform data format" });
        }
      } else {
        console.log('No cached waveform found for track', trackId);
        res.status(404).json({ error: "Waveform not found" });
      }
    } catch (error) {
      console.error("Error reading waveform cache for track", trackId, ":", error);
      res.status(500).json({ error: "Failed to read waveform cache" });
    }
  });

  // Route to save waveform to cache
  expressApp.post("/waveforms/:id", (req, res) => {
    const trackId = req.params.id;
    const waveformData = req.body;
    const waveformPath = path.join(waveformsDir, `${trackId}.json`);
    
    try {
      // Validate the waveform data before saving
      if (!waveformData || !Array.isArray(waveformData.peaks) || waveformData.peaks.length === 0) {
        console.error('Invalid waveform data format for track', trackId, 'Data:', waveformData);
        return res.status(400).json({ error: "Invalid waveform data format" });
      }

      // Ensure the waveforms directory exists
      if (!fs.existsSync(waveformsDir)) {
        fs.mkdirSync(waveformsDir, { recursive: true });
        console.log('Created waveforms directory:', waveformsDir);
      }

      // Write the waveform data to file
      fs.writeFileSync(waveformPath, JSON.stringify(waveformData, null, 2));
      console.log('Waveform cached successfully for track', trackId, 'at path:', waveformPath);
      
      // Verify the file was written correctly
      if (fs.existsSync(waveformPath)) {
        const fileStats = fs.statSync(waveformPath);
        console.log('Waveform file size:', fileStats.size, 'bytes');
        res.json({ success: true, fileSize: fileStats.size });
      } else {
        throw new Error('File was not written successfully');
      }
    } catch (error) {
      console.error("Error saving waveform cache for track", trackId, ":", error);
      res.status(500).json({ error: "Failed to save waveform cache" });
    }
  });

  // Tag management routes
  
  // Get all tags
  expressApp.get("/tags", (req, res) => {
    const query = `
      SELECT id, name, tracks, created_at, updated_at
      FROM tags
      ORDER BY created_at DESC
    `;

    db.all(query, [], (err, rows) => {
      if (err) {
        console.error("SQL Error:", err.message);
        res.status(500).json({ error: "Failed to retrieve tags" });
        return;
      }

      // Parse tracks JSON and format for client
      const tags = {};
      rows.forEach(row => {
        try {
          tags[row.id] = {
            id: row.id,
            name: row.name,
            tracks: row.tracks ? JSON.parse(row.tracks) : [],
            created_at: row.created_at,
            updated_at: row.updated_at
          };
        } catch (e) {
          console.error(`Error parsing tracks for tag ID ${row.id}:`, e);
          tags[row.id] = {
            id: row.id,
            name: row.name,
            tracks: [],
            created_at: row.created_at,
            updated_at: row.updated_at
          };
        }
      });

      res.json(tags);
    });
  });

  // Create a new tag
  expressApp.post("/tags", (req, res) => {
    const { name, tracks = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Tag name is required" });
    }

    const query = `
      INSERT INTO tags (name, tracks, created_at, updated_at)
      VALUES (?, ?, datetime('now'), datetime('now'))
    `;

    db.run(query, [name.trim(), JSON.stringify(tracks)], function(err) {
      if (err) {
        console.error("SQL Error:", err.message);
        res.status(500).json({ error: "Failed to create tag" });
        return;
      }

      res.json({
        id: this.lastID,
        name: name.trim(),
        tracks,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });
  });

  // Update a tag
  expressApp.put("/tags/:id", (req, res) => {
    const tagId = req.params.id;
    const { name, tracks } = req.body;

    let updates = [];
    let values = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name.trim());
    }

    if (tracks !== undefined) {
      updates.push("tracks = ?");
      values.push(JSON.stringify(tracks));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No updates provided" });
    }

    updates.push("updated_at = datetime('now')");
    values.push(tagId);

    const query = `
      UPDATE tags 
      SET ${updates.join(", ")}
      WHERE id = ?
    `;

    db.run(query, values, function(err) {
      if (err) {
        console.error("SQL Error:", err.message);
        res.status(500).json({ error: "Failed to update tag" });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({ error: "Tag not found" });
        return;
      }

      res.json({ success: true });
    });
  });

  // Delete a tag
  expressApp.delete("/tags/:id", (req, res) => {
    const tagId = req.params.id;

    const query = "DELETE FROM tags WHERE id = ?";

    db.run(query, [tagId], function(err) {
      if (err) {
        console.error("SQL Error:", err.message);
        res.status(500).json({ error: "Failed to delete tag" });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({ error: "Tag not found" });
        return;
      }

      res.json({ success: true });
    });
  });
}

// Start the Express server
expressApp.listen(port, () => {
  console.log(`Express server running at http://localhost:${port}`);
});